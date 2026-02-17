const express = require('express')
const { getTasks, getTaskById, getNextPrompt } = require('../controllers/taskController')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

router.get('/', getTasks)
router.get('/next/:language', authenticate, getNextPrompt)
router.get('/:id', getTaskById)

module.exports = router
