const { ZodError } = require('zod')

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error)
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }

  const statusCode = error.statusCode || error.status || 500
  return res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal server error',
  })
}

module.exports = errorHandler
