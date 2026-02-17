require('dotenv').config()
const mongoose = require('mongoose')
const Admin = require('../models/Admin')

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Connected to MongoDB')

        const username = process.argv[2] || 'admin'
        const password = process.argv[3] || 'admin123'

        const existing = await Admin.findOne({ username })
        if (existing) {
            console.log(`Admin ${username} already exists. Updating password...`)
            existing.password = password
            await existing.save()
            console.log('Password updated.')
        } else {
            await Admin.create({ username, password })
            console.log(`Admin ${username} created.`)
        }

        process.exit(0)
    } catch (error) {
        console.error('Error creating admin:', error)
        process.exit(1)
    }
}

createAdmin()
