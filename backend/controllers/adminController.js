const AdminReviewQueue = require('../models/AdminReviewQueue')
const Submission = require('../models/Submission')
const Task = require('../models/Task')
const User = require('../models/User')
const { calculateTrustScore, getBadgeForTrust } = require('../utils/helpers')
const { logEvent } = require('../utils/auditLogger')
const { Readable } = require('stream')
const { getGridFSBucket } = require('../config/database')

const getReviewQueue = async (req, res, next) => {
  try {
    const queue = await AdminReviewQueue.find({ status: 'pending' })
      .sort({ priority: -1, createdAt: -1 })
      .populate('submissionId')

    return res.json(queue)
  } catch (error) {
    return next(error)
  }
}

const approveSubmission = async (req, res, next) => {
  try {
    const submissionId = req.params.id
    const submission = await Submission.findById(submissionId)
    if (!submission) return res.status(404).json({ message: 'Submission not found' })

    const task = await Task.findById(submission.taskId)
    const user = await User.findOne({ walletHashIndex: submission.userHash })
    if (!task || !user) return res.status(404).json({ message: 'Related data missing' })

    if (submission.status === 'approved') {
      return res.json({ message: 'Submission already approved' })
    }

    const previousStatus = submission.status

    if (previousStatus === 'pending') {
      user.pendingSubmissions = Math.max(0, user.pendingSubmissions - 1)
      user.pendingRewards = Math.max(0, user.pendingRewards - task.rewardAmount)
    }

    // If changing from rejected to approved, decrement rejected count
    if (previousStatus === 'rejected') {
      user.rejectedSubmissions = Math.max(0, user.rejectedSubmissions - 1)
    }

    submission.status = 'approved'
    submission.manualReview.reviewDecision = 'approved'
    submission.manualReview.reviewedAt = new Date()
    submission.reviewedAt = new Date()
    await submission.save()

    user.approvedSubmissions += 1
    user.approvedRewards += task.rewardAmount
    user.trustScore = await calculateTrustScore(user.walletHashIndex)
    user.currentBadge = getBadgeForTrust(user.approvedSubmissions)
    await user.save()

    await AdminReviewQueue.updateOne(
      { submissionId: submission._id },
      { status: 'reviewed', reviewedAt: new Date() }
    )

    await logEvent({
      eventType: 'submission_approved',
      userHash: req.user?.walletHashIndex || '',
      details: { submissionId, targetUser: submission.userHash },
      ipAddress: req.ip,
    })

    return res.json({ message: 'Submission approved' })
  } catch (error) {
    return next(error)
  }
}

const rejectSubmission = async (req, res, next) => {
  try {
    const submissionId = req.params.id
    const { reason } = req.body

    const submission = await Submission.findById(submissionId)
    if (!submission) return res.status(404).json({ message: 'Submission not found' })

    const task = await Task.findById(submission.taskId)
    const user = await User.findOne({ walletHashIndex: submission.userHash })
    if (!task || !user) return res.status(404).json({ message: 'Related data missing' })

    if (submission.status === 'rejected') {
      return res.json({ message: 'Submission already rejected' })
    }

    const previousStatus = submission.status

    if (previousStatus === 'pending') {
      user.pendingSubmissions = Math.max(0, user.pendingSubmissions - 1)
      user.pendingRewards = Math.max(0, user.pendingRewards - task.rewardAmount)
    }

    // If changing from approved to rejected, decrement approved count and rewards
    if (previousStatus === 'approved') {
      user.approvedSubmissions = Math.max(0, user.approvedSubmissions - 1)
      user.approvedRewards = Math.max(0, user.approvedRewards - task.rewardAmount)
    }

    submission.status = 'rejected'
    submission.rejectionReason = reason || 'Rejected by admin'
    submission.manualReview.reviewDecision = 'rejected'
    submission.manualReview.reviewedAt = new Date()
    submission.reviewedAt = new Date()
    await submission.save()

    user.rejectedSubmissions += 1
    user.trustScore = await calculateTrustScore(user.walletHashIndex)
    user.currentBadge = getBadgeForTrust(user.approvedSubmissions)
    await user.save()

    await AdminReviewQueue.updateOne(
      { submissionId: submission._id },
      { status: 'reviewed', reviewedAt: new Date() }
    )

    await logEvent({
      eventType: 'submission_rejected',
      userHash: req.user?.walletHashIndex || '',
      details: { submissionId, targetUser: submission.userHash, reason },
      ipAddress: req.ip,
    })

    return res.json({ message: 'Submission rejected' })
  } catch (error) {
    return next(error)
  }
}

const createTask = async (req, res, next) => {
  try {
    console.log('=== CREATE TASK REQUEST ===')
    console.log('Body:', req.body)
    console.log('File:', req.file ? { name: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'No file')
    console.log('User:', req.user)

    const {
      language,
      title,
      description,
      type,
      sourceText,
      category,
      rewardAmount,
      difficulty,
      minTextLength,
      maxTextLength,
      audioRequired,
      minAudioDuration,
      maxAudioDuration,
      maxSubmissions,
      expectedAnswer,
    } = req.body

    // Validate required fields
    if (!title || !language) {
      console.error('Validation failed: Missing title or language')
      return res.status(400).json({ message: 'title and language are required' })
    }

    let sourceAudioPath = ''
    if (req.file) {
      try {
        console.log('Processing audio file upload...')
        const bucket = getGridFSBucket()
        if (!bucket) {
          throw new Error('GridFS bucket not initialized')
        }
        
        const filename = `${Date.now()}-${req.file.originalname}`
        const uploadStream = bucket.openUploadStream(filename)
        const bufferStream = Readable.from(req.file.buffer)

        await new Promise((resolve, reject) => {
          bufferStream.pipe(uploadStream)
            .on('error', (err) => {
              console.error('GridFS upload error:', err)
              reject(err)
            })
            .on('finish', () => {
              console.log('Audio file uploaded successfully:', filename)
              resolve()
            })
        })

        sourceAudioPath = filename
      } catch (uploadError) {
        console.error('Audio upload failed:', uploadError)
        throw new Error(`Failed to upload audio: ${uploadError.message}`)
      }
    }

    console.log('Creating task with data:', {
      language,
      title,
      type: type || 'text+audio',
      rewardAmount: rewardAmount || 0.2,
      sourceAudioPath
    })

    const task = await Task.create({
      language: language || 'igbo',
      title,
      description: description || '',
      type: type || 'text+audio',
      sourceText: sourceText || '',
      sourceAudioPath,
      expectedAnswer: expectedAnswer || '',
      category: category || 'general',
      rewardAmount: parseFloat(rewardAmount) || 0.2,
      difficulty: difficulty || 'easy',
      minTextLength: parseInt(minTextLength) || 20,
      maxTextLength: parseInt(maxTextLength) || 500,
      audioRequired: audioRequired !== 'false' && audioRequired !== false,
      minAudioDuration: parseInt(minAudioDuration) || 2,
      maxAudioDuration: parseInt(maxAudioDuration) || 30,
      isActive: true,
      maxSubmissions: parseInt(maxSubmissions) || 0,
      currentSubmissions: 0,
      createdBy: req.user?.userId || 'admin',
    })

    console.log('Task created successfully:', task._id)

    await logEvent({
      eventType: 'task_created',
      userHash: req.user?.walletHashIndex || '',
      details: { taskId: task._id, title },
      ipAddress: req.ip,
    })

    return res.status(201).json(task)
  } catch (error) {
    console.error('=== CREATE TASK ERROR ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return next(error)
  }
}

const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const users = await User.find()
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await User.countDocuments()

    return res.json({
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return next(error)
  }
}

const getAllSubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const { status, userHash } = req.query

    const query = {}
    if (status) query.status = status
    if (userHash) query.userHash = userHash

    const submissions = await Submission.find(query)
      .populate('taskId', 'title language')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Submission.countDocuments(query)

    return res.json({
      submissions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return next(error)
  }
}

const getAllTasks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit
    const { category, language, isActive } = req.query

    const query = {}
    if (category) query.category = category
    if (language) query.language = language
    if (isActive !== undefined) query.isActive = isActive === 'true'

    const tasks = await Task.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Task.countDocuments(query)

    // Get submission counts for each task
    const tasksWithStats = await Promise.all(
      tasks.map(async (task) => {
        const submissionStats = await Submission.aggregate([
          { $match: { taskId: task._id } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ])

        const stats = {
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        }

        submissionStats.forEach((stat) => {
          stats[stat._id] = stat.count
          stats.total += stat.count
        })

        return {
          ...task.toObject(),
          submissionStats: stats,
        }
      })
    )

    return res.json({
      tasks: tasksWithStats,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return next(error)
  }
}

const toggleTaskStatus = async (req, res, next) => {
  try {
    const taskId = req.params.id
    const task = await Task.findById(taskId)

    if (!task) return res.status(404).json({ message: 'Task not found' })

    task.isActive = !task.isActive
    await task.save()

    await logEvent({
      eventType: 'task_status_changed',
      userHash: req.user?.walletHashIndex || '',
      details: { taskId, isActive: task.isActive },
      ipAddress: req.ip,
    })

    return res.json({ message: `Task ${task.isActive ? 'activated' : 'deactivated'}`, task })
  } catch (error) {
    return next(error)
  }
}

const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.id
    const task = await Task.findById(taskId)

    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Check if task has submissions
    const submissionCount = await Submission.countDocuments({ taskId })

    if (submissionCount > 0) {
      return res.status(400).json({
        message: `Cannot delete task with ${submissionCount} submissions. Deactivate it instead.`
      })
    }

    await Task.findByIdAndDelete(taskId)

    await logEvent({
      eventType: 'task_deleted',
      userHash: req.user?.walletHashIndex || '',
      details: { taskId, title: task.title },
      ipAddress: req.ip,
    })

    return res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    return next(error)
  }
}

module.exports = {
  getReviewQueue,
  approveSubmission,
  rejectSubmission,
  createTask,
  getAllUsers,
  getAllSubmissions,
  getAllTasks,
  toggleTaskStatus,
  deleteTask,
}
