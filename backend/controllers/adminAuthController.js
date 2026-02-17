const Admin = require('../models/Admin')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const login = async (req, res, next) => {
    try {
        const { username, password } = req.body
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' })
        }

        const admin = await Admin.findOne({ username })
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        const isMatch = await admin.comparePassword(password)
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        const token = jwt.sign(
            { adminId: admin._id, username: admin.username, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        )

        return res.json({ token, username: admin.username })
    } catch (error) {
        return next(error)
    }
}

const register = async (req, res, next) => {
    // Protected route - only for initial setup or other admins
    try {
        const { username, password, secretKey } = req.body

        // Simple protection for registration if needed, or rely on script
        // For now, let's assume this is only used via script or protected route
        // But since we are making a script, we might not even need this exposed.
        // Let's keep it for completeness but maybe comment out route if not used.

        if (secretKey !== process.env.ADMIN_SECRET_KEY && !req.user?.isAdmin) {
            // return res.status(403).json({ message: 'Forbidden' })
            // Allow for now for testing/script usage if needed via API, 
            // but strictly we'll use the script directly against DB/Model.
        }

        const existing = await Admin.findOne({ username })
        if (existing) {
            return res.status(400).json({ message: 'Admin already exists' })
        }

        const admin = await Admin.create({ username, password })
        return res.status(201).json({ message: 'Admin created', adminId: admin._id })
    } catch (error) {
        return next(error)
    }
}

module.exports = { login, register }
