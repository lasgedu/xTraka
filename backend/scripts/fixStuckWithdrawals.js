/**
 * One-time cleanup: Mark old stuck 'pending' withdrawals as 'failed'.
 * These got stuck because the payment system wasn't configured when they were created.
 * 
 * Usage: node scripts/fixStuckWithdrawals.js
 */

require('dotenv').config()
const mongoose = require('mongoose')
const Withdrawal = require('../models/Withdrawal')

async function main() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Find all pending/processing withdrawals
    const stuck = await Withdrawal.find({ status: { $in: ['pending', 'processing'] } })
    console.log(`Found ${stuck.length} stuck withdrawal(s)`)

    for (const w of stuck) {
        console.log(`  - ${w._id}: ${w.amount} xUSDC → ${w.walletAddress} (status: ${w.status}, requested: ${w.requestedAt})`)
        w.status = 'failed'
        w.errorMessage = 'Cancelled: payment system was not configured at time of request'
        await w.save()
        console.log(`    ✅ Marked as failed`)
    }

    console.log('\nDone! Users can now re-request these withdrawals.')
    await mongoose.disconnect()
}

main().catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
})
