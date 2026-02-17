const Withdrawal = require('../models/Withdrawal')
const User = require('../models/User')
const { logEvent } = require('../utils/auditLogger')

const requestWithdrawal = async (req, res, next) => {
    try {
        const userId = req.user?.userId
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })

        const { walletAddress, amount } = req.body
        if (!walletAddress) return res.status(400).json({ message: 'walletAddress is required' })
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount is required' })

        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ message: 'User not found' })

        if (amount > user.approvedRewards - user.withdrawnRewards) {
            return res.status(400).json({ message: 'Insufficient approved rewards' })
        }

        const withdrawal = await Withdrawal.create({
            userHash: user.walletHashIndex,
            walletAddress,
            amount,
            status: 'pending',
            network: 'base-sepolia',
            requestedAt: new Date(),
        })

        await logEvent({
            eventType: 'withdrawal_requested',
            userHash: user.walletHashIndex,
            details: { amount, walletAddress, withdrawalId: withdrawal._id },
            ipAddress: req.ip,
        })

        return res.status(201).json({
            withdrawalId: withdrawal._id,
            amount,
            status: 'pending',
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

        return res.json({
            withdrawals,
            availableBalance: Math.max(0, user.approvedRewards - user.withdrawnRewards),
        })
    } catch (error) {
        return next(error)
    }
}

module.exports = { requestWithdrawal, getMyWithdrawals }
