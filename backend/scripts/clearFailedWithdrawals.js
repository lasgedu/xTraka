/**
 * Clear all failed withdrawals from the database.
 * Usage: node scripts/clearFailedWithdrawals.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const Withdrawal = require('../models/Withdrawal')

async function main() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    const result = await Withdrawal.deleteMany({ status: 'failed' })
    console.log(`Deleted ${result.deletedCount} failed withdrawal(s)`)

    // Also show remaining withdrawals
    const remaining = await Withdrawal.find({})
    console.log(`Remaining withdrawals: ${remaining.length}`)
    remaining.forEach(w => {
        console.log(`  - ${w._id}: ${w.amount} (status: ${w.status})`)
    })

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('Error:', err.message)
    process.exit(1)
})
