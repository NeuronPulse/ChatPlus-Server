const logger = require('../logger');

/**
 * 错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误信息
  logger.error(`Error: ${err.message}\nStack: ${err.stack}`);

  // 确定错误状态码
  const statusCode = err.statusCode || 500;

  // 响应错误信息
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;