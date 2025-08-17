const fs = require('fs');
const path = require('path');
const logger = require('../logger');
const ConfigManager = require('../config');
const config = new ConfigManager();

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.startTimes = {};
    this.enabled = config.get('performanceMonitoring.enabled', false);
    this.logFile = config.get('performanceMonitoring.logFile', path.join(__dirname, '..', 'logs', 'performance.log'));
    this.logInterval = config.get('performanceMonitoring.logInterval', 60000); // 默认1分钟

    // 确保日志目录存在
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 启动定期日志记录
    if (this.enabled) {
      this.startPeriodicLogging();
    }
  }

  /**
   * 开始计时
   * @param {string} operation - 操作名称
   */
  start(operation) {
    if (!this.enabled) return;
    this.startTimes[operation] = Date.now();
  }

  /**
   * 结束计时并记录结果
   * @param {string} operation - 操作名称
   * @param {object} metadata - 附加元数据
   */
  end(operation, metadata = {}) {
    if (!this.enabled || !this.startTimes[operation]) return;

    const duration = Date.now() - this.startTimes[operation];
    delete this.startTimes[operation];

    // 记录指标
    if (!this.metrics[operation]) {
      this.metrics[operation] = {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0
      };
    }

    const metric = this.metrics[operation];
    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.avgDuration = Math.round(metric.totalDuration / metric.count);

    // 记录到文件
    this.logToFile(operation, duration, metadata);
  }

  /**
   * 记录性能数据到文件
   * @param {string} operation - 操作名称
   * @param {number} duration - 持续时间(毫秒)
   * @param {object} metadata - 附加元数据
   */
  logToFile(operation, duration, metadata = {}) {
    if (!this.enabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      ...metadata
    };

    fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n', (err) => {
      if (err) {
        logger.error(`Failed to write performance log: ${err.message}`);
      }
    });
  }

  /**
   * 启动定期日志记录
   */
  startPeriodicLogging() {
    this.logTimer = setInterval(() => {
      this.logMetrics();
    }, this.logInterval);
  }

  /**
   * 记录指标摘要
   */
  logMetrics() {
    if (!this.enabled || Object.keys(this.metrics).length === 0) return;

    logger.info('Performance Metrics Summary:');
    Object.entries(this.metrics).forEach(([operation, metric]) => {
      logger.info(`${operation} - Count: ${metric.count}, Avg: ${metric.avgDuration}ms, Min: ${metric.minDuration}ms, Max: ${metric.maxDuration}ms`);
    });
  }

  /**
   * 停止性能监控
   */
  stop() {
    if (this.logTimer) {
      clearInterval(this.logTimer);
      this.logTimer = null;
    }
    // 记录最终指标
    this.logMetrics();
  }

  /**
   * 获取指标数据
   * @returns {object}
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * 重置指标数据
   */
  resetMetrics() {
    this.metrics = {};
    this.startTimes = {};
  }

  /**
   * 获取性能统计报告
   * @returns {object} 性能统计报告
   */
  getReport() {
    return this.metrics;
  }

  /**
   * 重置性能统计
   */
  reset() {
    this.resetMetrics();
  }
}

module.exports = PerformanceMonitor;