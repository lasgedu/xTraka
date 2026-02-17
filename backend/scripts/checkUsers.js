const mongoose = require('mongoose')
require('dotenv').config()
const User = require('../models/User')

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Connected to DB')

        const count = await User.countDocuments()
        console.log(`Total users: ${count}`)

        const users = await User.find().limit(5)
        console.log('First 5 users:', users)

    } catch (error) {
        console.error(error)
    } finally {
        await mongoose.disconnect()
    }
}

checkUsers()
