const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const mongoose = require('mongoose')
const Task = require('../models/Task')

async function testTaskCreation() {
  try {
    console.log('Connecting to MongoDB...')
    console.log('URI:', process.env.MONGODB_URI ? 'Set' : 'NOT SET')
    
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected successfully!')

    console.log('\nTesting task creation...')
    const testTask = {
      language: 'igbo',
      title: 'Test Task',
      description: 'Test description',
      type: 'text+audio',
      sourceText: 'Test source text',
      category: 'general',
      rewardAmount: 0.2,
      difficulty: 'easy',
      minTextLength: 20,
      maxTextLength: 500,
      audioRequired: true,
      minAudioDuration: 2,
      maxAudioDuration: 30,
      isActive: true,
      maxSubmissions: 0,
      currentSubmissions: 0,
      createdBy: 'test-script',
    }

    console.log('Creating task with:', testTask)
    const task = await Task.create(testTask)
    console.log('Task created successfully!')
    console.log('Task ID:', task._id)
    console.log('Task:', task)

    // Clean up
    await Task.findByIdAndDelete(task._id)
    console.log('\nTest task deleted. Test completed successfully!')

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('Test failed!')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    process.exit(1)
  }
}

testTaskCreation()
