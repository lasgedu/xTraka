require('dotenv').config()
const mongoose = require('mongoose')
const Task = require('../models/Task')

const seed = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...')
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xtraka')

        const tasks = [
            {
                language: 'igbo',
                title: 'Emotion Q/A Igbo',
                description: 'Listen and identify the emotion.',
                type: 'audio',
                category: 'emotion-qa',
                rewardAmount: 0.2,
                isActive: true,
                sourceText: 'Placeholder for audio emotion recognition',
                order: 1
            },
            {
                language: 'igbo',
                title: 'Emotion Q/A Igbo (2)',
                description: 'Listen and identify the emotion.',
                type: 'audio',
                category: 'emotion-qa',
                rewardAmount: 0.2,
                isActive: true,
                sourceText: 'Placeholder for audio emotion recognition',
                order: 2
            },
            {
                language: 'pidgin',
                title: 'Emotion Q/A Pidgin',
                description: 'Listen and identify the emotion.',
                type: 'audio',
                category: 'emotion-qa',
                rewardAmount: 0.2,
                isActive: true,
                sourceText: 'Placeholder for audio emotion recognition',
                order: 1
            }
        ]

        console.log('🌱 Seeding Emotion QA tasks...')
        await Task.insertMany(tasks)
        console.log('✅ Added 3 Emotion QA tasks.')

        process.exit(0)
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

seed()
