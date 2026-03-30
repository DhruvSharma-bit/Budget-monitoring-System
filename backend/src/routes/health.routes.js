const express = require('express')
const db = require('../config/db')

const router = express.Router()

router.get('/', async (req, res) => {
  await db.query('SELECT 1')
  res.json({
    success: true,
    message: 'API and database are connected',
  })
})

module.exports = router
