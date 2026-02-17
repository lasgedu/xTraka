const express = require('express')
const { requestWithdrawal, getMyWithdrawals } = require('../controllers/withdrawalController')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

router.post('/request', authenticate, requestWithdrawal)
router.get('/my-withdrawals', authenticate, getMyWithdrawals)

module.exports = router
