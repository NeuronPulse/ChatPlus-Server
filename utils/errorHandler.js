const config = require('../config');
const logger = require('../logger');
const PerformanceMonitor = require('./performanceMonitor');

/**
 * 错误处理工具
 */
class ErrorHandler {
  constructor() {
    this.performanceMonitor = new PerformanceMonitor('errorHandling');
    // 错误类型映射
    this.errorTypes = {
      VALIDATION_ERROR: { statusCode: 400, defaultMessage: 'Validation error' },
      AUTHENTICATION_ERROR: { statusCode: 401, defaultMessage: 'Authentication required' },
      AUTHORIZATION_ERROR: { statusCode: 403, defaultMessage: 'Access denied' },
      NOT_FOUND_ERROR: { statusCode: 404, defaultMessage: 'Resource not found' },
      CONFLICT_ERROR: { statusCode: 409, defaultMessage: 'Conflict detected' },
      SERVER_ERROR: { statusCode: 500, defaultMessage: 'Internal server error' },
      DATABASE_ERROR: { statusCode: 500, defaultMessage: 'Database error' },
      ENCRYPTION_ERROR: { statusCode: 500, defaultMessage: 'Encryption error' }
    };
  }

  /**
   * 创建标准化错误对象
   * @param {string} errorType - 错误类型
   * @param {string} message - 错误消息
   * @param {object} details - 错误详情
   * @returns {Error} 标准化错误对象
   */
  createError(errorType, message = null, details = {}) {
    const errorInfo = this.errorTypes[errorType] || this.errorTypes.SERVER_ERROR;
    const errorMessage = message || errorInfo.defaultMessage || 'Unknown error';
    const error = new Error(errorMessage);

    error.type = errorType;
    error.statusCode = errorInfo.statusCode;
    error.details = details;
    error.timestamp = new Date();

    return error;
  }

  /**
   * 处理Express请求错误
   * @param {Error} err - 错误对象
   * @param {object} req - Express请求对象
   * @param {object} res - Express响应对象
   * @param {function} next - Express下一步函数
   */
  handleRequestError(err, req, res, next) {
    const startTime = Date.now();

    // 如果是标准化错误对象
    if (err.type && err.statusCode) {
      const statusCode = err.statusCode;
      const errorResponse = {
        error: {
          type: err.type,
          message: err.message,
          details: err.details || {},
          timestamp: err.timestamp
        }
      };

      res.status(statusCode).json(errorResponse);
      logger.error(`${err.type}: ${err.message}`, { details: err.details });
    } else {
      // 非标准化错误
      const errorResponse = {
        error: {
          type: 'SERVER_ERROR',
          message: config.get('strings.errors.serverError'),
          details: process.env.NODE_ENV === 'development' ? { originalError: err.message, stack: err.stack } : {},
          timestamp: new Date()
        }
      };

      res.status(500).json(errorResponse);
      logger.error('Unhandled error:', err);
    }

    const endTime = Date.now();
    this.performanceMonitor.recordMetric('errorHandlingTime', endTime - startTime);
    this.performanceMonitor.recordMetric('errorCount', 1);
    this.performanceMonitor.recordMetric(`errorType.${err.type || 'UNKNOWN'}`, 1);
  }

  /**
   * 处理数据库错误
   * @param {Error} err - 数据库错误
   * @returns {Error} 标准化错误对象
   */
  handleDatabaseError(err) {
    // 记录数据库错误性能
    this.performanceMonitor.recordMetric('databaseErrorCount', 1);

    // 根据不同的数据库错误类型返回不同的错误信息
    let errorType = 'DATABASE_ERROR';
    let message = config.get('strings.errors.databaseError');
    let details = { originalError: err.message };

    // Sequelize错误处理
    if (err.name === 'SequelizeValidationError') {
      errorType = 'VALIDATION_ERROR';
      message = config.get('strings.errors.validationError');
      details.errors = err.errors.map(e => ({ field: e.path, message: e.message }));
    } else if (err.name === 'SequelizeUniqueConstraintError') {
      errorType = 'CONFLICT_ERROR';
      message = config.get('strings.errors.uniqueConstraintError');
      details.fields = err.fields;
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
      errorType = 'CONFLICT_ERROR';
      message = config.get('strings.errors.foreignKeyConstraintError');
      details.table = err.table;
      details.constraint = err.constraint;
    }

    return this.createError(errorType, message, details);
  }

  /**
   * 处理加密错误
   * @param {Error} err - 加密错误
   * @returns {Error} 标准化错误对象
   */
  handleEncryptionError(err) {
    this.performanceMonitor.recordMetric('encryptionErrorCount', 1);
    return this.createError('ENCRYPTION_ERROR', config.get('strings.errors.encryptionError'), { originalError: err.message });
  }

  /**
   * 获取错误处理性能统计
   * @returns {object}
   */
  getPerformanceStats() {
    return this.performanceMonitor.getMetrics();
  }
}

module.exports = new ErrorHandler();