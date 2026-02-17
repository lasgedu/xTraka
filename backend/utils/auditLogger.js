const AuditLog = require('../models/AuditLog')

const logEvent = async ({ eventType, userHash, details, ipAddress }) => {
    try {
        await AuditLog.create({
            eventType,
            userHash: userHash || '',
            details: details || {},
            ipAddress: ipAddress || '',
            timestamp: new Date(),
        })
    } catch (error) {
        console.error('Audit log failed:', error.message)
    }
}

module.exports = { logEvent }
