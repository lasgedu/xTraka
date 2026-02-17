const mongoose = require('mongoose')

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
    updatedBy: { type: String, default: 'system' },
    updatedAt: { type: Date },
  },
  { timestamps: true }
)

module.exports = mongoose.model('SystemSetting', systemSettingSchema)
