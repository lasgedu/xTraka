/**
 * Script to recalculate trust scores based on average submission accuracy
 * Run this to update all users' trust scores to reflect actual accuracy
 * 
 * Usage: node scripts/recalculateTrustScores.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })
const mongoose = require('mongoose')
const User = require('../models/User')
const Submission = require('../models/Submission')
const { calculateTrustScore, getBadgeForTrust } = require('../utils/helpers')

async function recalculateTrustScores() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    const users = await User.find()
    console.log(`Found ${users.length} users to process`)

    for (const user of users) {
      const oldTrustScore = user.trustScore

      // Calculate new trust score based on average accuracy
      const newTrustScore = await calculateTrustScore(user.walletHashIndex)
      
      user.trustScore = newTrustScore
      user.currentBadge = getBadgeForTrust(user.approvedSubmissions)
      await user.save()

      console.log(`Updated user: ${user.walletHashIndex.substring(0, 10)}...`)
      console.log(`  Old trust score: ${oldTrustScore}%`)
      console.log(`  New trust score: ${newTrustScore}%`)
      console.log(`  Badge: ${user.currentBadge}`)
    }

    console.log('\n✅ All trust scores have been recalculated!')
  } catch (error) {
    console.error('Error recalculating trust scores:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected from MongoDB')
  }
}

recalculateTrustScores()
