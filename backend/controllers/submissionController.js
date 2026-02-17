const { Readable } = require('stream')
const Submission = require('../models/Submission')
const Task = require('../models/Task')
const User = require('../models/User')
const AdminReviewQueue = require('../models/AdminReviewQueue')
const SystemSetting = require('../models/SystemSetting')
const { getGridFSBucket } = require('../config/database')
const { runQuickChecks, runWhisperValidation } = require('../utils/aiVerification')
const { calculateTrustScore, getBadgeForTrust } = require('../utils/helpers')
const { logEvent } = require('../utils/auditLogger')

const uploadToGridFS = (file) => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket()
    if (!bucket) return reject(new Error('GridFS bucket not initialized'))

    const filename = file.originalname || `audio-${Date.now()}`
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.mimetype,
    })

    Readable.from(file.buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve({ fileId: uploadStream.id, filename }))
  })
}

const getDailyCategorySubmissionCount = async (userHash, language, category) => {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  // 1. Find all active tasks for this language & category
  // Treat empty/general category as 'prompt'
  const targetCategory = category || 'prompt'

  let categoryQuery
  if (targetCategory === 'prompt') {
    categoryQuery = { $in: ['prompt', 'general', '', null] }
  } else {
    categoryQuery = targetCategory
  }

  const tasksForCategory = await Task.find({
    language,
    category: categoryQuery,
    isActive: true,
  }).select('_id')

  const categoryTaskIds = tasksForCategory.map((t) => t._id)

  // 2. Count submissions
  return Submission.countDocuments({
    userHash,
    taskId: { $in: categoryTaskIds },
    submittedAt: { $gte: startOfDay },
  })
}

const submitWork = async (req, res, next) => {
  try {
    const { taskId, textContent } = req.body
    const userId = req.user?.userId

    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    if (!taskId) return res.status(400).json({ message: 'taskId is required' })

    const task = await Task.findById(taskId)
    if (!task) return res.status(404).json({ message: 'Task not found' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // Check daily submission limit for this specific category
    const limitSetting = await SystemSetting.findOne({ key: 'max_daily_submissions_per_user' })
    const dailyLimit = limitSetting ? Number(limitSetting.value) : 50

    // Use task's category (default to 'prompt')
    const taskCategory = task.category || 'prompt'
    const todayCount = await getDailyCategorySubmissionCount(
      user.walletHashIndex,
      task.language,
      taskCategory
    )

    if (todayCount >= dailyLimit) {
      return res.status(429).json({
        message: `Daily limit reached for ${task.language} ${taskCategory} tasks (${dailyLimit}). Try again tomorrow.`,
      })
    }

    // Check minimum trust score
    const trustSetting = await SystemSetting.findOne({ key: 'min_trust_score_to_submit' })
    const minTrust = trustSetting ? Number(trustSetting.value) : 0

    if (user.trustScore < minTrust) {
      return res.status(403).json({
        message: `Trust score too low. Minimum required: ${minTrust}`,
      })
    }

    if (task.audioRequired && !req.file) {
      // Check if it's a text-only task (like Emotion QA)
      if (task.type === 'text' || task.category === 'emotion_qa') {
        // Allow missing file for text-based tasks
      } else {
        return res.status(400).json({ message: 'Audio file is required' })
      }
    }

    // Upload audio to GridFS
    let audioFileId = null
    let audioPath = ''
    if (req.file) {
      const uploadResult = await uploadToGridFS(req.file)
      audioFileId = uploadResult.fileId
      audioPath = uploadResult.filename
    }

    // Quick checks only (audio quality)
    const { audioMeta } = await runQuickChecks({ audioBuffer: req.file?.buffer })

    // Save as pending — Whisper will validate async
    const submission = await Submission.create({
      userHash: user.walletHashIndex,
      taskId: task._id,
      textContent: textContent || '',
      audioPath,
      audioFileId,
      status: 'pending',
      aiVerification: {
        audioQuality: audioMeta.audioQuality,
        audioDuration: audioMeta.audioDuration,
        audioBitrate: audioMeta.audioBitrate,
        audioSampleRate: audioMeta.audioSampleRate,
        audioCorrupted: audioMeta.audioCorrupted,
        expectedLanguage: task.language.toLowerCase(),
      },
      submittedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    })

    // Update user counters (pending)
    user.totalSubmissions += 1
    user.pendingSubmissions += 1
    user.pendingRewards += task.rewardAmount
    user.trustScore = await calculateTrustScore(user.walletHashIndex)
    user.currentBadge = getBadgeForTrust(user.approvedSubmissions)
    user.lastSubmissionAt = new Date()
    await user.save()

    await logEvent({
      eventType: 'submission_created',
      userHash: user.walletHashIndex,
      details: { submissionId: submission._id, taskId, status: 'pending' },
      ipAddress: req.ip,
    })

    // Fire-and-forget Whisper validation ONLY if audio exists
    if (req.file) {
      const submissionForWhisper = {
        _id: submission._id,
        taskId: submission.taskId,
        userHash: submission.userHash,
        _audioBuffer: req.file?.buffer,
      }

      runWhisperValidation(submissionForWhisper, task.sourceText).catch((err) =>
        console.error('Whisper background validation error:', err.message)
      )
    } else {
      // For text-only tasks, we might auto-approve or leave pending based on other criteria
      // Currently leaving as pending or could implement text-based verification here
    }

    return res.status(201).json({
      submissionId: submission._id,
      status: 'pending',
      message: 'Submission received! AI validation in progress.',
    })
  } catch (error) {
    return next(error)
  }
}

const getMySubmissions = async (req, res, next) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const submissions = await Submission.find({ userHash: user.walletHashIndex })
      .populate('taskId', 'language title sourceText rewardAmount')
      .sort({ createdAt: -1 })
      .limit(50)

    return res.json(submissions)
  } catch (error) {
    return next(error)
  }
}

module.exports = { submitWork, getMySubmissions }
