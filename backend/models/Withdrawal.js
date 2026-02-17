const mongoose = require('mongoose')

const withdrawalSchema = new mongoose.Schema(
  {
    userHash: { type: String, required: true },
    walletAddress: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    transactionHash: { type: String, default: '' },
    network: { type: String, default: '' },
    requestedAt: { type: Date },
    completedAt: { type: Date },
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true }
)

withdrawalSchema.index({ userHash: 1, status: 1 })
withdrawalSchema.index({ status: 1, requestedAt: -1 })

module.exports = mongoose.model('Withdrawal', withdrawalSchema)
