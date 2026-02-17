require('dotenv').config()
const mongoose = require('mongoose')
const Submission = require('../models/Submission')
const User = require('../models/User')
const Task = require('../models/Task')

const reset = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...')
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xtraka')
        console.log('✅ Connected.')

        console.log('🗑️  Clearing all submissions...')
        await Submission.deleteMany({})
        console.log('✅ Submissions cleared.')

        console.log('🔄 Resetting user stats...')
        await User.updateMany({}, {
            $set: {
                totalSubmissions: 0,
                approvedSubmissions: 0,
                pendingSubmissions: 0,
                rejectedSubmissions: 0,
                trustScore: 0,
                approvedRewards: 0,
                pendingRewards: 0,
                withdrawnRewards: 0,
                currentBadge: 'Beginner',
                lastSubmissionAt: null,
            }
        })
        console.log('✅ User stats reset.')

        // Optional: Reset task submission counts if tracked
        console.log('🔄 Resetting task counters...')
        await Task.updateMany({}, {
            $set: {
                currentSubmissions: 0
            }
        })
        console.log('✅ Task counters reset.')

        console.log('✨ Database reset complete! You can start from the beginning.')
        process.exit(0)
    } catch (error) {
        console.error('❌ Reset failed:', error)
        process.exit(1)
    }
}

reset()
