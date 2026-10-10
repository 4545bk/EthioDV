/**
 * Global Error Handler Middleware
 */
export function errorHandler(err, req, res, next) {
  console.error(`❌ [API Error] ${req.method} ${req.url}:`, err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details,
      },
    });
  }

  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: `An entry with this ${field} already exists.`,
      },
    });
  }

  // Fallback internal server error
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred. Please try again.',
    },
  });
}
