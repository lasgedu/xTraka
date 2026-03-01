const AdminReviewQueue = require('../models/AdminReviewQueue')
const Submission = require('../models/Submission')
const Task = require('../models/Task')
const User = require('../models/User')
const Withdrawal = require('../models/Withdrawal')
const { calculateTrustScore, getBadgeForTrust } = require('../utils/helpers')
const { logEvent } = require('../utils/auditLogger')
const { Readable } = require('stream')
const { getGridFSBucket } = require('../config/database')
const { savePrivateKey, getPaymentStatus, getWalletBalances } = require('../utils/paymentService')

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

              resolve()
            })
        })

        sourceAudioPath = filename
      } catch (uploadError) {
        console.error('Audio upload failed:', uploadError)
        throw new Error(`Failed to upload audio: ${uploadError.message}`)
      }
    }



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

const toggleSubAdmin = async (req, res, next) => {
  try {
    const userId = req.params.id
    const user = await User.findById(userId)

    if (!user) return res.status(404).json({ message: 'User not found' })

    // Prevent removing own admin status if you were to call this on yourself (though this is for subadmin)
    if (user._id.toString() === req.user?.userId) {
      // Optional safeguard
    }

    // If promoting to Sub-Admin (or updating existing), update languages


    if (req.body.languages) {
      if (Array.isArray(req.body.languages)) {
        user.adminLanguages = req.body.languages
      } else if (typeof req.body.languages === 'string') {
        user.adminLanguages = req.body.languages.split(',').map(l => l.trim()).filter(Boolean)
      }
    }

    // Toggle logic: If isSubAdmin is explicitly provided, use it. Otherwise toggle.
    if (typeof req.body.isSubAdmin !== 'undefined') {
      user.isSubAdmin = req.body.isSubAdmin === true || req.body.isSubAdmin === 'true'
    } else {
      user.isSubAdmin = !user.isSubAdmin
    }

    // If demoting (isSubAdmin becomes false), maybe clear languages? 
    // User might want to keep them in case of re-promotion, so let's keep them.

    await user.save()

    await logEvent({
      eventType: 'user_role_changed',
      userHash: req.user?.walletHashIndex || 'admin',
      details: { targetUserId: userId, isSubAdmin: user.isSubAdmin, languages: user.adminLanguages },
      ipAddress: req.ip,
    })

    return res.json({
      message: `User ${user.isSubAdmin ? 'promoted to' : 'demoted from'} Sub-Admin`,
      isSubAdmin: user.isSubAdmin,
      adminLanguages: user.adminLanguages
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
    let { status, userHash } = req.query
    const query = {}

    // Check if requester is a SubAdmin (and NOT a SuperAdmin)
    // accessing via wallet login (req.user.userId exists, req.user.adminId missing)
    // We need to fetch the user to confirm exact role if not in token, 
    // but middleware requireReviewer already let us in.

    const isSuperAdmin = !!req.user?.adminId || (req.user?.userId && (await User.findById(req.user.userId))?.isAdmin)

    // If NOT super admin, we must be a SubAdmin (or it's unauthorized, but middleware handles that)
    if (!isSuperAdmin) {
      status = 'pending'

      // Get the user to check their allowed languages
      const user = await User.findById(req.user.userId)
      if (user && user.isSubAdmin) {
        // If no languages assigned, they see NOTHING (implicit deny)
        if (!user.adminLanguages || user.adminLanguages.length === 0) {
          return res.json({
            submissions: [],
            pagination: { total: 0, page, pages: 0 }
          })
        }

        // Find tasks that match these languages
        const tasksInLanguages = await Task.find({ language: { $in: user.adminLanguages } }).distinct('_id')

        // Add to query
        query.taskId = { $in: tasksInLanguages }
      }
    }

    if (status) query.status = status
    if (userHash) query.userHash = userHash

    const total = await Submission.countDocuments(query)

    const submissions = await Submission.find(query)
      .populate('taskId', 'title language')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

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

// ─── Payment Config Endpoints ───────────────────────────────────────

const savePaymentConfig = async (req, res, next) => {
  try {
    const { privateKey } = req.body
    if (!privateKey) {
      return res.status(400).json({ message: 'privateKey is required' })
    }

    const walletAddress = await savePrivateKey(privateKey)

    await logEvent({
      eventType: 'payment_config_updated',
      userHash: req.user?.walletHashIndex || 'admin',
      details: { walletAddress },
      ipAddress: req.ip,
    })

    return res.json({
      message: 'Payment configuration saved successfully',
      walletAddress,
    })
  } catch (error) {
    if (error.message === 'Invalid private key format') {
      return res.status(400).json({ message: error.message })
    }
    return next(error)
  }
}

const getPaymentConfig = async (req, res, next) => {
  try {
    const status = await getPaymentStatus()
    return res.json(status)
  } catch (error) {
    return next(error)
  }
}

const getAdminBalance = async (req, res, next) => {
  try {
    const balances = await getWalletBalances()
    return res.json(balances)
  } catch (error) {
    return next(error)
  }
}

const getPendingWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find({ status: { $in: ['pending', 'failed'] } })
      .sort({ requestedAt: -1 })
      .limit(100)

    return res.json({ withdrawals })
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
  toggleSubAdmin,
  savePaymentConfig,
  getPaymentConfig,
  getAdminBalance,
  getPendingWithdrawals,
}
