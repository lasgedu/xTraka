/**
 * Script to recalculate user submission counts from actual submission data
 * Run this to fix any incorrect counts in the database
 * 
 * Usage: node scripts/fixUserCounts.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const mongoose = require('mongoose')
const User = require('../models/User')
const Submission = require('../models/Submission')
const Task = require('../models/Task')
const { calculateTrustScore, getBadgeForTrust } = require('../utils/helpers')

async function fixUserCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    const users = await User.find()
    console.log(`Found ${users.length} users to process`)

    for (const user of users) {
      // Count actual submissions by status
      const [approved, rejected, pending, total] = await Promise.all([
        Submission.countDocuments({ userHash: user.walletHashIndex, status: 'approved' }),
        Submission.countDocuments({ userHash: user.walletHashIndex, status: 'rejected' }),
        Submission.countDocuments({ userHash: user.walletHashIndex, status: 'pending' }),
        Submission.countDocuments({ userHash: user.walletHashIndex }),
      ])

      // Calculate rewards
      const approvedSubmissions = await Submission.find({
        userHash: user.walletHashIndex,
        status: 'approved',
      }).populate('taskId', 'rewardAmount')

      const approvedRewards = approvedSubmissions.reduce((sum, sub) => {
        return sum + (sub.taskId?.rewardAmount || 0)
      }, 0)

      const pendingSubmissions = await Submission.find({
        userHash: user.walletHashIndex,
        status: 'pending',
      }).populate('taskId', 'rewardAmount')

      const pendingRewards = pendingSubmissions.reduce((sum, sub) => {
        return sum + (sub.taskId?.rewardAmount || 0)
      }, 0)

      // Update user with correct counts
      const oldCounts = {
        total: user.totalSubmissions,
        approved: user.approvedSubmissions,
        rejected: user.rejectedSubmissions,
        pending: user.pendingSubmissions,
        approvedRewards: user.approvedRewards,
        pendingRewards: user.pendingRewards,
      }

      user.totalSubmissions = total
      user.approvedSubmissions = approved
      user.rejectedSubmissions = rejected
      user.pendingSubmissions = pending
      user.approvedRewards = approvedRewards
      user.pendingRewards = pendingRewards
      user.trustScore = await calculateTrustScore(user.walletHashIndex)
      user.currentBadge = getBadgeForTrust(approved)

      await user.save()

      console.log(`\nFixed user: ${user.walletHashIndex.substring(0, 10)}...`)
      console.log(`  Old: total=${oldCounts.total}, approved=${oldCounts.approved}, rejected=${oldCounts.rejected}, pending=${oldCounts.pending}`)
      console.log(`  New: total=${total}, approved=${approved}, rejected=${rejected}, pending=${pending}`)
      console.log(`  Rewards: approved=${approvedRewards.toFixed(2)}, pending=${pendingRewards.toFixed(2)}`)
    }

    console.log('\n✅ All user counts have been fixed!')
  } catch (error) {
    console.error('Error fixing user counts:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

fixUserCounts()
