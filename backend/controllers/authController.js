const { ethers } = require('ethers')
const User = require('../models/User')
const {
  generateNonce,
  getWalletHashIndex,
  hashWallet,
  signToken,
  normalizeWallet,
  getBadgeForTrust,
} = require('../utils/helpers')
const { logEvent } = require('../utils/auditLogger')

const nonceStore = new Map()

const getMessage = async (req, res) => {
  const { walletAddress } = req.body
  if (!walletAddress) {
    return res.status(400).json({ message: 'walletAddress is required' })
  }

  const normalized = normalizeWallet(walletAddress)
  const nonce = generateNonce()
  const message = `XTRAKA Login\nNonce: ${nonce}`
  nonceStore.set(normalized, { nonce, message, createdAt: Date.now() })

  return res.json({ message })
}

const verify = async (req, res) => {
  const { walletAddress, signature } = req.body
  if (!walletAddress || !signature) {
    return res.status(400).json({ message: 'walletAddress and signature are required' })
  }

  const normalized = normalizeWallet(walletAddress)
  const record = nonceStore.get(normalized)
  if (!record) {
    return res.status(400).json({ message: 'No login message found. Call /auth/get-message first.' })
  }

  const recovered = ethers.verifyMessage(record.message, signature)
  if (normalizeWallet(recovered) !== normalized) {
    return res.status(401).json({ message: 'Signature verification failed' })
  }

  const walletHashIndex = getWalletHashIndex(normalized)
  let user = await User.findOne({ walletHashIndex })

  if (!user) {
    const walletHash = await hashWallet(normalized)
    user = await User.create({
      walletHash,
      walletHashIndex,
      trustScore: 0,
      currentBadge: getBadgeForTrust(0),
      lastLoginAt: new Date(),
    })
  } else {
    user.lastLoginAt = new Date()
    await user.save()
  }

  const token = signToken({
    userId: user._id.toString(),
    walletHashIndex,
  })

  await logEvent({
    eventType: 'user_login',
    userHash: walletHashIndex,
    details: { isNewUser: !user.lastLoginAt },
    ipAddress: req.ip,
  })

  return res.json({
    token,
    user: {
      id: user._id,
      trustScore: user.trustScore,
      approvedRewards: user.approvedRewards,
      pendingRewards: user.pendingRewards,
      currentBadge: user.currentBadge,
    },
  })
}

const getMe = async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    return res.json({
      id: user._id,
      trustScore: user.trustScore,
      approvedRewards: user.approvedRewards,
      pendingRewards: user.pendingRewards,
      withdrawnRewards: user.withdrawnRewards,
      totalSubmissions: user.totalSubmissions,
      approvedSubmissions: user.approvedSubmissions,
      pendingSubmissions: user.pendingSubmissions,
      rejectedSubmissions: user.rejectedSubmissions,
      currentBadge: user.currentBadge,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Server error' })
  }
}

module.exports = { getMessage, verify, getMe }

