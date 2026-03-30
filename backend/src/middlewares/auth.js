const jwt = require('jsonwebtoken')
const { jwtSecret } = require('../config/env')
const { createHttpError } = require('../utils/httpError')

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createHttpError(401, 'Authentication token is required'))
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, jwtSecret)
    req.user = payload
    return next()
  } catch (error) {
    return next(createHttpError(401, 'Invalid or expired authentication token'))
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(createHttpError(403, 'Admin access is required for this action'))
  }
  return next()
}

module.exports = {
  authenticate,
  requireAdmin,
}
