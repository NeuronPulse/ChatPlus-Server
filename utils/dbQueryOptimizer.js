const { sequelize } = require('../db');
const { performance } = require('perf_hooks');
const PerformanceMonitor = require('./performanceMonitor');

/**
 * 数据库查询优化器
 */
class DbQueryOptimizer {
  constructor() {
    this.performanceMonitor = new PerformanceMonitor('dbQuery');
    this.queryCache = new Map();
    this.maxCacheSize = 100; // 最大缓存查询数量
  }

  /**
   * 优化查询执行
   * @param {Function} queryFn - 查询函数
   * @param {string} queryName - 查询名称（用于缓存和监控）
   * @param {object} options - 选项
   * @param {boolean} options.useCache - 是否使用缓存
   * @param {number} options.cacheTTL - 缓存过期时间（毫秒）
   * @returns {Promise<any>}
   */
  async executeQuery(queryFn, queryName, options = {}) {
    const { useCache = false, cacheTTL = 30000 } = options;
    const cacheKey = `${queryName}_${this._generateCacheKey(options)}`;

    // 检查缓存
    if (useCache && this.queryCache.has(cacheKey)) {
      const cachedResult = this.queryCache.get(cacheKey);
      if (Date.now() - cachedResult.timestamp < cacheTTL) {
        this.performanceMonitor.recordMetric('cacheHit', 1);
        return cachedResult.data;
      } else {
        this.queryCache.delete(cacheKey);
      }
    }

    // 执行查询并计时
    const startTime = performance.now();
    try {
      const result = await queryFn();
      const endTime = performance.now();

      // 记录性能
      this.performanceMonitor.recordMetric('queryTime', endTime - startTime);
      this.performanceMonitor.recordMetric('queryCount', 1);

      // 缓存结果
      if (useCache) {
        this._addCacheEntry(cacheKey, result);
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      this.performanceMonitor.recordMetric('queryError', 1);
      this.performanceMonitor.recordMetric('queryTime', endTime - startTime);
      throw error;
    }
  }

  /**
   * 批量执行查询，优化数据库连接使用
   * @param {Array<{fn: Function, name: string}>} queries - 查询数组
   * @returns {Promise<Array<any>>}
   */
  async executeBatchedQueries(queries) {
    const startTime = performance.now();
    try {
      // 使用Promise.all并行执行查询
      const results = await Promise.all(
        queries.map(query => query.fn())
      );

      const endTime = performance.now();
      this.performanceMonitor.recordMetric('batchQueryTime', endTime - startTime);
      this.performanceMonitor.recordMetric('batchQueryCount', 1);
      this.performanceMonitor.recordMetric('queriesPerBatch', queries.length);

      return results;
    } catch (error) {
      const endTime = performance.now();
      this.performanceMonitor.recordMetric('batchQueryError', 1);
      this.performanceMonitor.recordMetric('batchQueryTime', endTime - startTime);
      throw error;
    }
  }

  /**
   * 生成缓存键
   * @param {object} params - 参数对象
   * @returns {string}
   */
  _generateCacheKey(params) {
    if (!params) return 'default';
    return Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
  }

  /**
   * 添加缓存条目
   * @param {string} key - 缓存键
   * @param {any} data - 缓存数据
   */
  _addCacheEntry(key, data) {
    // 如果缓存已满，删除最早添加的条目
    if (this.queryCache.size >= this.maxCacheSize) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 清除缓存
   * @param {string} [queryName] - 可选的查询名称，清除特定查询的缓存
   */
  clearCache(queryName) {
    if (queryName) {
      for (const key of this.queryCache.keys()) {
        if (key.startsWith(queryName)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  /**
   * 获取查询性能统计
   * @returns {object}
   */
  getPerformanceStats() {
    return this.performanceMonitor.getMetrics();
  }
}

module.exports = new DbQueryOptimizer();