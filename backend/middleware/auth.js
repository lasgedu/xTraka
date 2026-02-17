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
    // Check if token has adminId (from Admin model) or isAdmin (from User model)
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})

module.exports = { authenticate, requireAdmin, upload }

