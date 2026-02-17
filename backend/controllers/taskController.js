const Task = require('../models/Task')
const Submission = require('../models/Submission')
const User = require('../models/User')
const SystemSetting = require('../models/SystemSetting')

const getTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ isActive: true }).sort({ language: 1, order: 1 })
    return res.json(tasks)
  } catch (error) {
    return next(error)
  }
}

const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
    if (!task) return res.status(404).json({ message: 'Task not found' })
    return res.json(task)
  } catch (error) {
    return next(error)
  }
}

const getNextPrompt = async (req, res, next) => {
  try {
    const { language } = req.params
    const category = req.query.category || 'prompt' // Default to 'prompt' if not specified
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // Get daily limit
    const limitSetting = await SystemSetting.findOne({ key: 'max_daily_submissions_per_user' })
    const dailyLimit = limitSetting ? Number(limitSetting.value) : 10

    // Count today's submissions for this specific Language + Category
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    // 1. Find all active tasks for this language & category
    let categoryQuery = category
    if (category === 'prompt') {
      categoryQuery = { $in: ['prompt', 'general', '', null] }
    } else if (category === 'all') {
      categoryQuery = { $exists: true }
    }

    const tasksForCategory = await Task.find({
      language,
      category: categoryQuery,
      isActive: true,
    }).select('_id')

    const categoryTaskIds = tasksForCategory.map((t) => t._id)

    // 2. Count submissions for these tasks today
    const todayCount = await Submission.countDocuments({
      userHash: user.walletHashIndex,
      taskId: { $in: categoryTaskIds },
      submittedAt: { $gte: startOfDay },
    })

    // Count today's submissions for this language
    const allTasksForLanguage = await Task.find({ language, isActive: true }).select('_id')
    const languageTaskIds = allTasksForLanguage.map((t) => t._id)

    const todayLanguageCount = await Submission.countDocuments({
      userHash: user.walletHashIndex,
      taskId: { $in: languageTaskIds },
      submittedAt: { $gte: startOfDay },
    })

    // Get IDs of tasks this user has already submitted (all time for this language+category)
    const submittedTaskIds = await Submission.distinct('taskId', {
      userHash: user.walletHashIndex,
      taskId: { $in: categoryTaskIds },
    })

    // Find the next unsubmitted task for this category
    const nextTask = await Task.findOne({
      language,
      category: categoryQuery,
      isActive: true,
      _id: { $nin: submittedTaskIds },
    }).sort({ order: 1 })

    return res.json({
      task: nextTask || null,
      progress: {
        completedToday: todayCount,
        // legacy field kept for compatibility, same as completedToday for now
        completedTodayLanguage: todayCount,
        dailyLimit,
        remaining: Math.max(0, dailyLimit - todayCount),
        totalForLanguage: tasksForCategory.length,
        completedForLanguage: submittedTaskIds.length,
        remainingForLanguage: tasksForCategory.length - submittedTaskIds.length,
        limitReached: todayCount >= dailyLimit,
      },
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = { getTasks, getTaskById, getNextPrompt }
