const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['text', 'audio', 'text+audio'], default: 'text+audio' },
    sourceText: { type: String, default: '' },
    sourceAudioPath: { type: String, default: '' },
    expectedAnswer: { type: String, default: '' },
    category: { type: String, default: '' },
    rewardAmount: { type: Number, required: true },
    difficulty: { type: String, default: 'easy' },
    minTextLength: { type: Number, default: 20 },
    maxTextLength: { type: Number, default: 500 },
    audioRequired: { type: Boolean, default: true },
    minAudioDuration: { type: Number, default: 2 },
    maxAudioDuration: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
    maxSubmissions: { type: Number, default: 0 },
    currentSubmissions: { type: Number, default: 0 },
    createdBy: { type: String, default: 'system' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

taskSchema.index({ language: 1, isActive: 1 })
taskSchema.index({ difficulty: 1 })

module.exports = mongoose.model('Task', taskSchema)
