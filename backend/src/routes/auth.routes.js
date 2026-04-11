const express = require('express')
const authController = require('../controllers/auth.controller')
const { authenticate } = require('../middlewares/auth')

const router = express.Router()

router.post('/login', authController.login)
router.get('/me', authenticate, authController.me)

module.exports = router
