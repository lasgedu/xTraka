const errorHandler = (err, req, res, next) => {
  console.error('Error Handler Caught:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code
  })
  
  const status = err.status || 500
  const message = err.message || 'Server error'
  res.status(status).json({ 
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
  })
}

module.exports = { errorHandler }
