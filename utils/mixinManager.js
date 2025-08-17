const logger = require('../logger');
const ConfigManager = require('../config');
const config = new ConfigManager();

/**
 * Mixin管理器
 * 负责mixin的注册、应用和管理
 */
class MixinManager {
  constructor() {
    this.mixins = new Map(); // 存储已注册的mixin
    this.appliedMixins = new Map(); // 存储已应用的mixin
    this.hooks = new Map(); // 存储钩子
  }

  /**
   * 注册mixin
   * @param {string} name - mixin名称
   * @param {Object} mixin - mixin对象
   * @param {Object} options - 选项
   */
  registerMixin(name, mixin, options = {}) {
    if (this.mixins.has(name)) {
      logger.warn(config.get('strings.info.mixinAlreadyRegistered').replace('{mixinName}', name));
      return false;
    }

    this.mixins.set(name, {
      name,
      mixin,
      options,
      registeredAt: new Date()
    });

    logger.info(config.get('strings.success.mixinRegistered').replace('{mixinName}', name));
    return true;
  }

  /**
   * 注销mixin
   * @param {string} name - mixin名称
   */
  unregisterMixin(name) {
    if (!this.mixins.has(name)) {
      logger.warn(config.get('strings.errors.mixinNotFound').replace('{mixinName}', name));
      return false;
    }

    // 如果mixin已应用，先移除
    if (this.appliedMixins.has(name)) {
      this.removeMixin(name);
    }

    this.mixins.delete(name);
    logger.info(config.get('strings.success.mixinUnregistered').replace('{mixinName}', name));
    return true;
  }

  /**
   * 应用mixin到目标对象
   * @param {string} mixinName - mixin名称
   * @param {Object} target - 目标对象
   * @param {string} targetProperty - 目标属性（可选）
   */
  applyMixin(mixinName, target, targetProperty = null) {
    const mixinInfo = this.mixins.get(mixinName);
    if (!mixinInfo) {
      logger.error(config.get('strings.errors.mixinNotFound').replace('{mixinName}', mixinName));
      return false;
    }

    try {
      const { mixin, options } = mixinInfo;
      
      // 记录原始状态用于回滚
      const originalState = {
        target,
        targetProperty,
        originalMethods: new Map(),
        appliedAt: new Date()
      };

      // 应用mixin
      if (targetProperty) {
        // 应用到特定属性
        if (!target[targetProperty]) {
          target[targetProperty] = {};
        }
        
        const targetObj = target[targetProperty];
        for (const [key, value] of Object.entries(mixin)) {
          // 保存原始方法
          if (targetObj[key]) {
            originalState.originalMethods.set(key, targetObj[key]);
          }
          
          // 应用mixin方法
          if (typeof value === 'function') {
            // 如果是函数，绑定上下文
            targetObj[key] = value.bind(targetObj);
          } else {
            // 如果是属性，直接赋值
            targetObj[key] = value;
          }
        }
      } else {
        // 应用到整个对象
        for (const [key, value] of Object.entries(mixin)) {
          // 保存原始方法
          if (target[key]) {
            originalState.originalMethods.set(key, target[key]);
          }
          
          // 应用mixin方法
          if (typeof value === 'function') {
            // 如果是函数，绑定上下文
            target[key] = value.bind(target);
          } else {
            // 如果是属性，直接赋值
            target[key] = value;
          }
        }
      }

      // 记录已应用的mixin
      this.appliedMixins.set(mixinName, originalState);
      
      logger.info(config.get('strings.success.mixinApplied').replace('{mixinName}', mixinName));
      return true;
    } catch (error) {
      logger.error(config.get('strings.errors.applyMixinFailed').replace('{mixinName}', mixinName), error);
      return false;
    }
  }

  /**
   * 移除已应用的mixin
   * @param {string} mixinName - mixin名称
   */
  removeMixin(mixinName) {
    const originalState = this.appliedMixins.get(mixinName);
    if (!originalState) {
      logger.warn(config.get('strings.errors.mixinNotApplied').replace('{mixinName}', mixinName));
      return false;
    }

    try {
      const { target, targetProperty, originalMethods } = originalState;
      
      // 恢复原始状态
      if (targetProperty) {
        const targetObj = target[targetProperty];
        for (const [key, originalMethod] of originalMethods.entries()) {
          if (originalMethod === undefined) {
            // 如果原来没有这个方法，删除它
            delete targetObj[key];
          } else {
            // 恢复原始方法
            targetObj[key] = originalMethod;
          }
        }
      } else {
        for (const [key, originalMethod] of originalMethods.entries()) {
          if (originalMethod === undefined) {
            // 如果原来没有这个方法，删除它
            delete target[key];
          } else {
            // 恢复原始方法
            target[key] = originalMethod;
          }
        }
      }

      // 从已应用列表中移除
      this.appliedMixins.delete(mixinName);
      
      logger.info(config.get('strings.success.mixinRemoved').replace('{mixinName}', mixinName));
      return true;
    } catch (error) {
      logger.error(config.get('strings.errors.removeMixinFailed').replace('{mixinName}', mixinName), error);
      return false;
    }
  }

  /**
   * 检查mixin是否已注册
   * @param {string} mixinName - mixin名称
   * @returns {boolean} 是否已注册
   */
  isRegistered(mixinName) {
    return this.mixins.has(mixinName);
  }

  /**
   * 检查mixin是否已应用
   * @param {string} mixinName - mixin名称
   * @returns {boolean} 是否已应用
   */
  isApplied(mixinName) {
    return this.appliedMixins.has(mixinName);
  }

  /**
   * 获取所有已注册的mixin
   * @returns {Array} mixin列表
   */
  getRegisteredMixins() {
    return Array.from(this.mixins.keys());
  }

  /**
   * 获取所有已应用的mixin
   * @returns {Array} 已应用的mixin列表
   */
  getAppliedMixins() {
    return Array.from(this.appliedMixins.keys());
  }

  /**
   * 注册钩子
   * @param {string} hookName - 钩子名称
   * @param {Function} handler - 处理函数
   * @param {Object} options - 选项
   */
  registerHook(hookName, handler, options = {}) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const hooks = this.hooks.get(hookName);
    hooks.push({
      handler,
      options,
      registeredAt: new Date()
    });

    // 按优先级排序
    hooks.sort((a, b) => (a.options.priority || 0) - (b.options.priority || 0));

    logger.info(config.get('strings.success.hookRegistered').replace('{hookName}', hookName));
  }

  /**
   * 触发钩子
   * @param {string} hookName - 钩子名称
   * @param {...*} args - 参数
   */
  async triggerHook(hookName, ...args) {
    const hooks = this.hooks.get(hookName);
    if (!hooks || hooks.length === 0) {
      return;
    }

    logger.debug(config.get('strings.info.hookTriggered').replace('{hookName}', hookName));

    // 按顺序执行所有钩子
    for (const hook of hooks) {
      try {
        if (hook.options.async) {
          await hook.handler(...args);
        } else {
          hook.handler(...args);
        }
      } catch (error) {
        logger.error(config.get('strings.errors.hookExecutionFailed').replace('{hookName}', hookName), error);
      }
    }
  }

  /**
   * 移除钩子
   * @param {string} hookName - 钩子名称
   * @param {Function} handler - 处理函数（可选，如果为空则移除所有同名钩子）
   */
  removeHook(hookName, handler = null) {
    if (!this.hooks.has(hookName)) {
      return;
    }

    if (handler) {
      const hooks = this.hooks.get(hookName);
      const index = hooks.findIndex(h => h.handler === handler);
      if (index !== -1) {
        hooks.splice(index, 1);
      }
    } else {
      this.hooks.delete(hookName);
    }

    logger.info(config.get('strings.success.hookRemoved').replace('{hookName}', hookName));
  }

  /**
   * 获取所有钩子名称
   * @returns {Array} 钩子名称列表
   */
  getHookNames() {
    return Array.from(this.hooks.keys());
  }
}

module.exports = new MixinManager();