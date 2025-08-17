/**
 * Mixin功能演示脚本
 * 此脚本演示了如何使用mixin注入功能
 */

const pluginManager = require('./utils/pluginManager');
const logger = require('./logger');

// 创建一个示例对象
class UserService {
  constructor() {
    this.name = 'UserService';
  }
  
  getUser(id) {
    return { id, name: `User ${id}` };
  }
  
  toString() {
    return `[${this.name}]`;
  }
}

async function demo() {
  logger.info('=== Mixin功能演示开始 ===');
  
  // 创建服务实例
  const userService = new UserService();
  logger.info(`原始对象: ${userService.toString()}`);
  logger.info(`用户信息: ${JSON.stringify(userService.getUser(1))}`);
  
  // 定义一个mixin
  const loggingMixin = {
    // 添加日志功能
    log(message) {
      console.log(`[${this.name}] ${message}`);
    },
    
    // 增强原有方法
    getUser(id) {
      const user = UserService.prototype.getUser.call(this, id);
      this.log(`获取用户: ${JSON.stringify(user)}`);
      return user;
    },
    
    // 添加新属性
    lastAccessed: new Date()
  };
  
  // 注册mixin
  pluginManager.registerMixin('logging-mixin', loggingMixin);
  logger.info('已注册logging-mixin');
  
  // 应用mixin
  pluginManager.applyMixin('logging-mixin', userService);
  logger.info('已应用logging-mixin到userService');
  
  // 测试增强后的功能
  logger.info(`增强后对象: ${userService.toString()}`);
  logger.info(`增强后用户信息: ${JSON.stringify(userService.getUser(2))}`);
  
  if (typeof userService.log === 'function') {
    userService.log('这是通过mixin添加的方法');
  }
  
  logger.info(`最后访问时间: ${userService.lastAccessed}`);
  
  // 注册钩子示例
  pluginManager.registerHook('demo.event', (data) => {
    logger.info(`同步钩子触发: ${JSON.stringify(data)}`);
  });
  
  pluginManager.registerHook('demo.event', async (data) => {
    // 模拟异步处理
    await new Promise(resolve => setTimeout(resolve, 500));
    logger.info(`异步钩子触发: ${JSON.stringify(data)}`);
  }, { async: true });
  
  // 触发钩子
  logger.info('触发demo.event钩子');
  await pluginManager.triggerHook('demo.event', { message: 'Hello from hook!' });
  
  // 移除mixin
  pluginManager.removeMixin('logging-mixin');
  logger.info('已移除logging-mixin');
  
  // 测试移除后的功能
  logger.info(`移除mixin后对象: ${userService.toString()}`);
  try {
    userService.log('这行代码应该会出错');
  } catch (error) {
    logger.info('确认mixin已成功移除');
  }
  
  logger.info('=== Mixin功能演示结束 ===');
}

// 如果直接运行此脚本，则执行演示
if (require.main === module) {
  demo().catch(error => {
    logger.error('演示过程中发生错误', error);
  });
}

module.exports = { demo };