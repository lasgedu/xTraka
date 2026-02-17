const express = require('express')
const { getAchievements } = require('../controllers/achievementController')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

router.get('/', authenticate, getAchievements)

module.exports = router
