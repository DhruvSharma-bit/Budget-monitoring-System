const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const { clientUrl } = require('./config/env')
const apiRoutes = require('./routes')
const notFound = require('./middlewares/notFound')
const errorHandler = require('./middlewares/errorHandler')

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
})

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'College Budget Monitoring API is running',
  })
})

app.use('/api', apiLimiter, apiRoutes)
app.use(notFound)
app.use(errorHandler)

module.exports = app
