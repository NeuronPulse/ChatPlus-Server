const EventEmitter = require('events');
const logger = require('../logger');

/**
 * 事件总线
 * 实现发布-订阅模式，用于插件间通信和系统事件处理
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // 增加监听器限制
    logger.info('EventBus initialized');
  }

  /**
   * 触发事件
   * @param {string} eventName - 事件名称
   * @param {...*} args - 传递给监听器的参数
   * @returns {boolean} 事件是否有监听器
   */
  emitEvent(eventName, ...args) {
    logger.debug(`Event emitted: ${eventName}`);
    return super.emit(eventName, ...args);
  }

  /**
   * 注册事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 监听器函数
   * @param {Object} options - 选项
   * @param {number} options.priority - 优先级，数字越小优先级越高
   * @returns {EventBus} 当前实例，支持链式调用
   */
  onEvent(eventName, listener, { priority = 0 } = {}) {
    // 如果是优先级事件，需要特殊处理
    if (priority !== 0) {
      // 确保事件映射存在
      if (!this.priorityEvents) {
        this.priorityEvents = new Map();
      }

      if (!this.priorityEvents.has(eventName)) {
        this.priorityEvents.set(eventName, []);
      }

      // 添加到优先级队列
      const listeners = this.priorityEvents.get(eventName);
      listeners.push({ listener, priority });

      // 按优先级排序
      listeners.sort((a, b) => a.priority - b.priority);

      // 重新注册所有监听器
      this.off(eventName);
      for (const item of listeners) {
        super.on(eventName, item.listener);
      }
    } else {
      super.on(eventName, listener);
    }

    logger.debug(`Listener registered for event: ${eventName}`);
    return this;
  }

  /**
   * 注册一次性事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 监听器函数
   * @returns {EventBus} 当前实例，支持链式调用
   */
  onceEvent(eventName, listener) {
    super.once(eventName, listener);
    logger.debug(`One-time listener registered for event: ${eventName}`);
    return this;
  }

  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} listener - 监听器函数
   * @returns {EventBus} 当前实例，支持链式调用
   */
  offEvent(eventName, listener) {
    super.off(eventName, listener);
    logger.debug(`Listener removed for event: ${eventName}`);

    // 如果有优先级事件，也需要移除
    if (this.priorityEvents && this.priorityEvents.has(eventName)) {
      const listeners = this.priorityEvents.get(eventName);
      const index = listeners.findIndex(item => item.listener === listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    return this;
  }

  /**
   * 移除特定事件的所有监听器
   * @param {string} eventName - 事件名称
   * @returns {EventBus} 当前实例，支持链式调用
   */
  removeAllListenersEvent(eventName) {
    super.removeAllListeners(eventName);
    logger.debug(`All listeners removed for event: ${eventName}`);

    // 也移除优先级事件
    if (this.priorityEvents && this.priorityEvents.has(eventName)) {
      this.priorityEvents.delete(eventName);
    }

    return this;
  }

  /**
   * 获取特定事件的监听器数量
   * @param {string} eventName - 事件名称
   * @returns {number} 监听器数量
   */
  getListenerCount(eventName) {
    return super.listenerCount(eventName);
  }
}

module.exports = new EventBus();