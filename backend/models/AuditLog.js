const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true },
    userHash: { type: String, default: '' },
    details: { type: Object, default: {} },
    ipAddress: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

module.exports = mongoose.model('AuditLog', auditLogSchema)
