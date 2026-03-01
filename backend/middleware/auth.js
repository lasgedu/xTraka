const jwt = require('jsonwebtoken')
const multer = require('multer')
const User = require('../models/User')

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Missing or invalid token' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

const requireAdmin = async (req, res, next) => {
  try {
    // Check if token has adminId (from Admin model)
    if (req.user?.adminId) {
      return next()
    }

    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' })
    }

    return next()
  } catch (error) {
    console.error('Admin Auth Error:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}

const requireReviewer = async (req, res, next) => {
  try {
    // 1. Super Admin (Admin Model)
    if (req.user?.adminId) return next()

    // 2. User-based Admin or SubAdmin
    const userId = req.user?.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // Check if user is SuperAdmin OR SubAdmin
    if (user.isAdmin || user.isSubAdmin) {
      return next()
    }

    return res.status(403).json({ message: 'Reviewer access required' })
  } catch (error) {
    console.error('Reviewer Auth Error:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

module.exports = { authenticate, requireAdmin, requireReviewer, upload }

