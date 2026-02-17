const express = require('express')
const { submitWork, getMySubmissions } = require('../controllers/submissionController')
const { authenticate, upload } = require('../middleware/auth')

const router = express.Router()

router.post('/submit', authenticate, upload.single('audio'), submitWork)
router.get('/my-submissions', authenticate, getMySubmissions)

module.exports = router
