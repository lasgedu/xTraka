const mongoose = require('mongoose')

const submissionSchema = new mongoose.Schema(
  {
    userHash: { type: String, required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    textContent: { type: String, default: '' },
    audioPath: { type: String, default: '' },
    audioFileId: { type: mongoose.Schema.Types.ObjectId },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    aiVerification: {
      languageDetected: { type: String, default: '' },
      languageConfidence: { type: Number, default: 0 },
      expectedLanguage: { type: String, default: '' },
      languageMatch: { type: Boolean, default: false },
      textLength: { type: Number, default: 0 },
      textComplete: { type: Boolean, default: false },
      profanityDetected: { type: Boolean, default: false },
      profanityWords: { type: [String], default: [] },
      audioQuality: { type: String, default: '' },
      audioDuration: { type: Number, default: 0 },
      audioBitrate: { type: Number, default: 0 },
      audioSampleRate: { type: Number, default: 0 },
      audioCorrupted: { type: Boolean, default: false },
      audioTranscription: { type: String, default: '' },
      transcriptionMatch: { type: Boolean, default: false },
      overallConfidence: { type: Number, default: 0 },
      verifiedAt: { type: Date },
      modelVersion: { type: String, default: 'v1' },
    },
    manualReview: {
      reviewedBy: { type: String, default: '' },
      reviewedAt: { type: Date },
      reviewDecision: { type: String, default: '' },
      reviewNotes: { type: String, default: '' },
      overrideReason: { type: String, default: '' },
    },
    rejectionReason: { type: String, default: '' },
    feedback: { type: String, default: '' },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    submissionNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
)

submissionSchema.index({ userHash: 1, status: 1 })
submissionSchema.index({ taskId: 1 })
submissionSchema.index({ status: 1, submittedAt: -1 })
submissionSchema.index({ 'aiVerification.overallConfidence': -1 })

module.exports = mongoose.model('Submission', submissionSchema)

