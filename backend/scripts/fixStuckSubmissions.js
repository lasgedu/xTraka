/**
 * Fix stuck "pending" submissions that have no AI verification result.
 * These got stuck because the Whisper/AssemblyAI call failed silently.
 * 
 * Usage: node scripts/fixStuckSubmissions.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const Submission = require('../models/Submission')

async function main() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Find all pending submissions that have no AI verification timestamp
    // (meaning the AI validation never completed)
    const stuck = await Submission.find({
        status: 'pending',
        'aiVerification.verifiedAt': { $exists: false }
    })

    console.log(`Found ${stuck.length} stuck submission(s) with no AI verification`)

    for (const sub of stuck) {
        console.log(`  - ${sub._id}: task=${sub.taskId} user=${sub.userHash} (submitted: ${sub.submittedAt})`)
        // Mark with feedback so admin can review them
        sub.aiVerification = {
            ...sub.aiVerification,
            verifiedAt: new Date(),
            overallConfidence: 0,
            feedback: 'AI validation timed out or failed. Needs manual review.',
        }
        await sub.save()
        console.log(`    ✅ Updated with feedback`)
    }

    console.log(`\nDone! ${stuck.length} submission(s) are now visible for admin review.`)
    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
})
