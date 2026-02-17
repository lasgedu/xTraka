require('dotenv').config()
const mongoose = require('mongoose')
const Task = require('../models/Task')

const debug = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...')
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xtraka')

        console.log('📊 Task Stats:')

        const allTasks = await Task.countDocuments({})
        console.log(`Total Tasks: ${allTasks}`)

        const languages = await Task.distinct('language')
        console.log('Languages found:', languages)

        const categories = await Task.distinct('category')
        console.log('Categories found:', categories)

        console.log('\n🔍 Check Specifics:')
        const igboLower = await Task.countDocuments({ language: 'igbo', isActive: true })
        const igboCap = await Task.countDocuments({ language: 'Igbo', isActive: true })
        console.log(`Igbo (lower): ${igboLower}`)
        console.log(`Igbo (Cap): ${igboCap}`)

        const activeEmptyCat = await Task.countDocuments({ category: '', isActive: true })
        console.log(`Active + Empty Category: ${activeEmptyCat}`)

        const activeNullCat = await Task.countDocuments({ category: null, isActive: true })
        console.log(`Active + Null Category: ${activeNullCat}`)

        // Sample task
        const sample = await Task.findOne()
        console.log('\n📄 Sample Task:', sample)

        process.exit(0)
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

debug()
