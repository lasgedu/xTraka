const Withdrawal = require('../models/Withdrawal')
const User = require('../models/User')
const { logEvent } = require('../utils/auditLogger')
const { processWithdrawal } = require('../utils/paymentService')

const requestWithdrawal = async (req, res, next) => {
    try {
        const userId = req.user?.userId
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })

        const { walletAddress, amount } = req.body
        if (!walletAddress) return res.status(400).json({ message: 'walletAddress is required' })
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount is required' })

        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: 'User not found' })

        // Sum all pending/processing withdrawals (not yet completed)
        const pendingWithdrawals = await Withdrawal.aggregate([
            { $match: { userHash: user.walletHashIndex, status: { $in: ['pending', 'processing'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        const pendingTotal = pendingWithdrawals[0]?.total || 0
        const availableBalance = Math.max(0, user.approvedRewards - user.withdrawnRewards - pendingTotal)

        if (amount > availableBalance) {
            return res.status(400).json({ message: `Insufficient balance. Available: ${availableBalance.toFixed(2)} xUSDC` })
        }

        const withdrawal = await Withdrawal.create({
            userHash: user.walletHashIndex,
            walletAddress,
            amount,
            status: 'pending',
            network: 'arbitrum-sepolia',
            requestedAt: new Date(),
        })

        await logEvent({
            eventType: 'withdrawal_requested',
            userHash: user.walletHashIndex,
            details: { amount, walletAddress, withdrawalId: withdrawal._id },
            ipAddress: req.ip,
        })

        // Process the on-chain payment asynchronously
        // We respond immediately with 'pending' and let it process in the background
        processWithdrawal(withdrawal, user)
            .then((result) => {
                if (result.success) {
                    console.log(`✅ Withdrawal ${withdrawal._id} completed: ${result.transactionHash}`)
                } else {
                    console.error(`❌ Withdrawal ${withdrawal._id} failed: ${result.error}`)
                    // Ensure withdrawal is marked as failed
                    Withdrawal.findByIdAndUpdate(withdrawal._id, {
                        status: 'failed',
                        errorMessage: result.error
                    }).catch(e => console.error('Failed to update withdrawal status:', e.message))
                }
            })
            .catch((err) => {
                console.error(`❌ Withdrawal ${withdrawal._id} error:`, err.message)
                // Mark as failed so it doesn't block future withdrawals
                Withdrawal.findByIdAndUpdate(withdrawal._id, {
                    status: 'failed',
                    errorMessage: err.message
                }).catch(e => console.error('Failed to update withdrawal status:', e.message))
            })

        return res.status(201).json({
            withdrawalId: withdrawal._id,
            amount,
            status: 'pending',
            message: 'Withdrawal requested. On-chain transfer is being processed.',
        })
    } catch (error) {
        return next(error)
    }
}

const getMyWithdrawals = async (req, res, next) => {
    try {
        const userId = req.user?.userId
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })

        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: 'User not found' })

        const withdrawals = await Withdrawal.find({ userHash: user.walletHashIndex })
            .sort({ requestedAt: -1 })
            .limit(50)

        // Sum pending/processing withdrawals
        const pendingAgg = await Withdrawal.aggregate([
            { $match: { userHash: user.walletHashIndex, status: { $in: ['pending', 'processing'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        const pendingTotal = pendingAgg[0]?.total || 0

        return res.json({
            withdrawals,
            pendingWithdrawalTotal: pendingTotal,
            availableBalance: Math.max(0, user.approvedRewards - user.withdrawnRewards - pendingTotal),
        })
    } catch (error) {
        return next(error)
    }
}

module.exports = { requestWithdrawal, getMyWithdrawals }
