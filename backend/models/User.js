const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    walletHash: { type: String, required: true, unique: true },
    walletHashIndex: { type: String, required: true, unique: true },
    totalSubmissions: { type: Number, default: 0 },
    approvedSubmissions: { type: Number, default: 0 },
    pendingSubmissions: { type: Number, default: 0 },
    rejectedSubmissions: { type: Number, default: 0 },
    trustScore: { type: Number, default: 0 },
    pendingRewards: { type: Number, default: 0 },
    approvedRewards: { type: Number, default: 0 },
    withdrawnRewards: { type: Number, default: 0 },
    currentBadge: { type: String, default: 'Beginner' },
    isActive: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    isSubAdmin: { type: Boolean, default: false },
    adminLanguages: [{ type: String }], // Languages the sub-admin can review
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '' },
    lastLoginAt: { type: Date },
    lastSubmissionAt: { type: Date },
  },
  { timestamps: true }
)

userSchema.index({ trustScore: -1 })
userSchema.index({ approvedRewards: -1 })

module.exports = mongoose.model('User', userSchema)
