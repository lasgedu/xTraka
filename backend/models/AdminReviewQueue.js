const mongoose = require('mongoose')

const adminReviewQueueSchema = new mongoose.Schema(
  {
    submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
    priority: { type: String, enum: ['high', 'normal', 'low'], default: 'normal' },
    reason: { type: String, default: '' },
    assignedTo: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    status: { type: String, enum: ['pending', 'reviewed'], default: 'pending' },
  },
  { timestamps: true }
)

adminReviewQueueSchema.index({ status: 1, priority: -1 })

module.exports = mongoose.model('AdminReviewQueue', adminReviewQueueSchema)
