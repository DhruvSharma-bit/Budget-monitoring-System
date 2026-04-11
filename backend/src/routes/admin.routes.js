const express = require('express')
const adminController = require('../controllers/admin.controller')
const { authenticate, requireAdmin } = require('../middlewares/auth')

const router = express.Router()

router.get('/audit-logs', authenticate, requireAdmin, adminController.listAuditLogs)

module.exports = router
