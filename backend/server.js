const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })
const express = require('express')
const cors = require('cors')
const { connectDB } = require('./config/database')
const { errorHandler } = require('./middleware/errorHandler')
const authRoutes = require('./routes/auth')
const taskRoutes = require('./routes/tasks')
const submissionRoutes = require('./routes/submissions')
const achievementRoutes = require('./routes/achievements')
const adminRoutes = require('./routes/admin')
const withdrawalRoutes = require('./routes/withdrawals')

const app = express()
const port = process.env.PORT || 4000

// Configure CORS to allow requests from your frontend domains
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://xtraka.com',
    'https://www.xtraka.com',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/auth', authRoutes)
app.use('/tasks', taskRoutes)
app.use('/submissions', submissionRoutes)
app.use('/achievements', achievementRoutes)
app.use('/admin', adminRoutes)
app.use('/withdrawals', withdrawalRoutes)

// Serve uploads from GridFS
const { getGridFSBucket } = require('./config/database')

app.get('/uploads/:filename', async (req, res) => {
  try {
    const bucket = getGridFSBucket()
    if (!bucket) {
      console.error('GridFS bucket not initialized')
      return res.status(500).json({ message: 'GridFS not initialized' })
    }

    const filename = req.params.filename
    const files = await bucket.find({ filename }).toArray()

    if (!files || files.length === 0) {
      console.error('File not found in GridFS:', filename)
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]
    const fileSize = file.length
    const range = req.headers.range

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1

      const downloadStream = bucket.openDownloadStreamByName(filename, {
        start,
        end: end + 1 // MongoDB end is exclusive
      })

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg', // ideally dynamic based on file contentType or fallback
      })

      downloadStream.pipe(res)
    } else {
      res.header('Content-Length', fileSize)
      res.header('Content-Type', 'audio/mpeg')

      const downloadStream = bucket.openDownloadStreamByName(filename)
      downloadStream.pipe(res)
    }

    // Handle stream errors
    // downloadStream error handling is a bit tricky with pipe after headers sent, 
    // but basic logging is good.
  } catch (err) {
    console.error('Error fetching file:', err)
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error: ' + err.message })
    }
  }
})

// Serve the built React frontend
app.use(express.static(path.join(__dirname, '../xtraka-interface-master/dist')))

// SPA catch-all: any non-API route serves index.html for client-side routing
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../xtraka-interface-master/dist', 'index.html'))
})

app.use(errorHandler)

const startServer = async () => {
  try {
    await connectDB()
    const { startValidationQueue } = require('./utils/validationQueue')
    startValidationQueue()
    app.listen(port, () => {
      console.log(`Server running on port ${port}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  }
}

startServer()
