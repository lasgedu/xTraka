const express = require('express')
const {
  getReviewQueue,
  approveSubmission,
  rejectSubmission,
  createTask,
  getAllUsers,
  getAllSubmissions,
  getAllTasks,
  toggleTaskStatus,
  deleteTask,
} = require('../controllers/adminController')
const { login } = require('../controllers/adminAuthController')

const { authenticate, requireAdmin } = require('../middleware/auth')

const router = express.Router()

const upload = require('../middleware/upload')

router.post('/login', login)
router.get('/review-queue', authenticate, requireAdmin, getReviewQueue)
router.post('/approve/:id', authenticate, requireAdmin, approveSubmission)
router.post('/reject/:id', authenticate, requireAdmin, rejectSubmission)
router.post('/tasks', authenticate, requireAdmin, upload.single('audio'), createTask)
router.get('/tasks', authenticate, requireAdmin, getAllTasks)
router.patch('/tasks/:id/toggle', authenticate, requireAdmin, toggleTaskStatus)
router.delete('/tasks/:id', authenticate, requireAdmin, deleteTask)
router.get('/users', authenticate, requireAdmin, getAllUsers)
router.get('/submissions', authenticate, requireAdmin, getAllSubmissions)

module.exports = router


