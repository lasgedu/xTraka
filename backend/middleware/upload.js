const multer = require('multer')


const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
        cb(null, true)
    } else {
        cb(new Error('Only audio files are allowed!'), false)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
})

module.exports = upload
