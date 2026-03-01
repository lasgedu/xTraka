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
  toggleSubAdmin,
  savePaymentConfig,
  getPaymentConfig,
  getAdminBalance,
  getPendingWithdrawals,
} = require('../controllers/adminController')
const { login } = require('../controllers/adminAuthController')

const { authenticate, requireAdmin, requireReviewer } = require('../middleware/auth')

const router = express.Router()

const upload = require('../middleware/upload')

router.post('/login', login)
router.get('/review-queue', authenticate, requireReviewer, getReviewQueue)
router.post('/approve/:id', authenticate, requireReviewer, approveSubmission)
router.post('/reject/:id', authenticate, requireReviewer, rejectSubmission)
router.post('/tasks', authenticate, requireAdmin, upload.single('audio'), createTask)
router.get('/tasks', authenticate, requireAdmin, getAllTasks)
router.patch('/tasks/:id/toggle', authenticate, requireAdmin, toggleTaskStatus)
router.delete('/tasks/:id', authenticate, requireAdmin, deleteTask)
router.get('/users', authenticate, requireAdmin, getAllUsers)
router.patch('/users/:id/toggle-subadmin', authenticate, requireAdmin, toggleSubAdmin)
router.get('/submissions', authenticate, requireReviewer, getAllSubmissions)

// Payment config routes
router.post('/payment-config', authenticate, requireAdmin, savePaymentConfig)
router.get('/payment-config', authenticate, requireAdmin, getPaymentConfig)
router.get('/wallet-balance', authenticate, requireAdmin, getAdminBalance)
router.get('/pending-withdrawals', authenticate, requireAdmin, getPendingWithdrawals)

module.exports = router


