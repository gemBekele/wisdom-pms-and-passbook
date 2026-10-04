export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // body-parser errors (malformed JSON, payload too large)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Payload too large' });
  }
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ success: false, message: err.message || 'Bad request' });
  }

  // Prisma not found error
  if (err.code === 'P2025') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Prisma unique constraint error
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    const message = `Duplicate value for ${field}`;
    error = { message, statusCode: 400 };
  }

  // Prisma foreign key constraint error
  if (err.code === 'P2003') {
    const message = 'Related record not found';
    error = { message, statusCode: 400 };
  }

  // Prisma validation error
  if (err.code === 'P2000') {
    const message = 'Value too long for column';
    error = { message, statusCode: 400 };
  }

  // Prisma invalid value error
  if (err.code === 'P2006') {
    const message = 'Invalid value provided';
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
