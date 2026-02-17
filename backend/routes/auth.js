const express = require('express')
const { getMessage, verify, getMe } = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

router.post('/get-message', getMessage)
router.post('/verify', verify)
router.get('/me', authenticate, getMe)

module.exports = router

