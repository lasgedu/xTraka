const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { BADGES, DEFAULTS } = require('./constants')

const normalizeWallet = (wallet) => (wallet || '').trim().toLowerCase()

const getWalletHashIndex = (wallet) => {
  const normalized = normalizeWallet(wallet)
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

const hashWallet = async (wallet) => {
  const normalized = normalizeWallet(wallet)
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(normalized, salt)
}

const generateNonce = () => crypto.randomBytes(16).toString('hex')

const signToken = (payload) => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is not set in .env')
  }
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULTS.JWT_EXPIRES_IN,
  })
}

const calculateTrustScore = async (userHash) => {
  const Submission = require('../models/Submission')
  
  // Get all approved submissions with their accuracy scores
  const approvedSubmissions = await Submission.find({
    userHash,
    status: 'approved',
    'aiVerification.overallConfidence': { $exists: true, $ne: null }
  }).select('aiVerification.overallConfidence')

  if (approvedSubmissions.length === 0) return 0

  // Calculate average accuracy
  const totalAccuracy = approvedSubmissions.reduce((sum, sub) => {
    return sum + (sub.aiVerification?.overallConfidence || 0)
  }, 0)

  return Math.round(totalAccuracy / approvedSubmissions.length)
}

// Legacy sync version for backward compatibility (returns 0, should use async version)
const calculateTrustScoreSync = (approved, total) => {
  if (!total) return 0
  return Math.round((approved / total) * 100)
}

const getBadgeForTrust = (approvedSubmissions) => {
  const sorted = [...BADGES].sort((a, b) => b.minApproved - a.minApproved)
  const match = sorted.find((badge) => approvedSubmissions >= badge.minApproved)
  return match ? match.name : DEFAULTS.BADGE
}

module.exports = {
  normalizeWallet,
  getWalletHashIndex,
  hashWallet,
  generateNonce,
  signToken,
  calculateTrustScore,
  calculateTrustScoreSync,
  getBadgeForTrust,
}
