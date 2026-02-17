const User = require('../models/User')
const { getBadgeForTrust } = require('../utils/helpers')

const getAchievements = async (req, res, next) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const badge = getBadgeForTrust(user.approvedSubmissions)

    return res.json({
      trustScore: user.trustScore,
      approvedRewards: user.approvedRewards,
      pendingRewards: user.pendingRewards,
      withdrawnRewards: user.withdrawnRewards,
      totalSubmissions: user.totalSubmissions,
      approvedSubmissions: user.approvedSubmissions,
      pendingSubmissions: user.pendingSubmissions,
      rejectedSubmissions: user.rejectedSubmissions,
      currentBadge: badge,
    })
  } catch (error) {
    return next(error)
  }
}

module.exports = { getAchievements }
