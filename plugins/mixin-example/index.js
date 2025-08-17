/**
 * Mixin示例插件
 */
class MixinExamplePlugin {
  constructor(options) {
    this.name = options.name;
    this.logger = options.logger;
    this.eventBus = options.eventBus;
    this.pluginManager = require('../../utils/pluginManager');
  }

  /**
   * 插件初始化
   */
  async init() {
    this.logger.info(`Plugin ${this.name} initialized`);
  }

  /**
   * 插件激活
   */
  async activate() {
    this.logger.info(`Plugin ${this.name} activated`);
    
    // 注册mixin用于服务器启动输出
    this.registerStartupMixin();
    
    // 注册一个示例mixin
    this.registerExampleMixin();
    
    // 注册钩子示例
    this.registerExampleHooks();
  }

  /**
   * 注册用于服务器启动输出的mixin
   */
  registerStartupMixin() {
    // 创建一个专门用于服务器启动时输出的mixin
    const startupMixin = {
      // 在服务器启动时执行的方法
      onServerStartup() {
        console.log('Mixin测试成功');
      }
    };
    
    // 注册mixin
    this.pluginManager.registerMixin('startup-mixin', startupMixin);
    
    // 使用事件系统监听服务器启动，在适当时机应用mixin
    this.eventBus.onEvent('app.initialized', (app) => {
      this.logger.info('服务器已启动，准备应用启动mixin');
      
      // 应用mixin到主程序
      if (this.pluginManager.isMixinRegistered('startup-mixin')) {
        // 创建一个虚拟对象来承载mixin
        const startupHandler = {};
        this.pluginManager.applyMixin('startup-mixin', startupHandler);
        
        // 执行mixin中的启动方法
        if (startupHandler.onServerStartup) {
          startupHandler.onServerStartup();
        }
      }
    });
    
    this.logger.info('Startup mixin registered');
  }

  /**
   * 注册示例mixin
   */
  registerExampleMixin() {
    // 创建一个示例mixin
    const exampleMixin = {
      // 添加一个新方法
      getEnhancedInfo() {
        return `Enhanced info from ${this.constructor.name || 'object'}`;
      },
      
      // 覆盖现有方法（如果存在）
      toString() {
        return `[Enhanced Object: ${this.constructor.name || 'Unknown'}]`;
      },
      
      // 添加一个属性
      enhanced: true
    };
    
    // 注册mixin
    this.pluginManager.registerMixin('example-mixin', exampleMixin);
    
    this.logger.info('Example mixin registered');
  }

  /**
   * 注册示例钩子
   */
  registerExampleHooks() {
    // 注册一个前置钩子
    this.pluginManager.registerHook('user.login.before', (username) => {
      this.logger.info(`Before user login: ${username}`);
    }, { priority: 10 });
    
    // 注册一个后置钩子
    this.pluginManager.registerHook('user.login.after', async (user) => {
      this.logger.info(`After user login: ${user.username}`);
      
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 应用mixin到用户对象
      if (this.pluginManager.isMixinRegistered('example-mixin')) {
        this.pluginManager.applyMixin('example-mixin', user);
        this.logger.info('Applied example mixin to user object');
      }
    }, { priority: 10, async: true });
    
    this.logger.info('Example hooks registered');
  }

  /**
   * 插件停用
   */
  async deactivate() {
    this.logger.info(`Plugin ${this.name} deactivated`);
    
    // 移除mixin
    if (this.pluginManager.isMixinRegistered('example-mixin')) {
      this.pluginManager.unregisterMixin('example-mixin');
    }
    
    // 移除钩子
    this.pluginManager.removeHook('user.login.before');
    this.pluginManager.removeHook('user.login.after');
  }
}

module.exports = MixinExamplePlugin;