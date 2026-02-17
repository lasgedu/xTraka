const mongoose = require('mongoose')
require('dotenv').config()
const Admin = require('../models/Admin')

const checkAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Connected to DB')

        const count = await Admin.countDocuments()
        console.log(`Total admins: ${count}`)

        if (count === 0) {
            console.log('Creating default admin...')
            const defaultAdmin = await Admin.create({
                username: 'admin',
                password: 'password123'
            })
            console.log('Created default admin: admin / password123')
        } else {
            const admins = await Admin.find().select('username')
            console.log('Admins:', admins)
        }

    } catch (error) {
        console.error(error)
    } finally {
        await mongoose.disconnect()
    }
}

checkAdmins()
