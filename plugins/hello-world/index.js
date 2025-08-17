/**
 * Hello World 插件
 * 这是一个示例插件，展示如何使用ChatPlus插件系统
 */
class HelloWorldPlugin {
  constructor(options) {
    this.name = options.name;
    this.metadata = options.metadata;
    this.config = options.config;
    this.logger = options.logger;
    this.configManager = options.configManager;
    this.eventBus = options.eventBus;
    this.app = null; // 将在init中设置
  }

  /**
   * 插件初始化
   */
  async init() {
    try {
      // 监听应用初始化事件
      this.eventBus.onEvent('app.initialized', (app) => {
        this.app = app;
        this.registerRoutes();
      });

      this.logger.info(`${this.metadata.chatplus.name} plugin initialized`);
    } catch (error) {
      this.logger.error(`Failed to initialize ${this.name} plugin: ${error.message}`);
    }
  }

  /**
   * 插件激活
   */
  async activate() {
    try {
      if (this.config.showOnStart) {
        this.logger.info(`${this.metadata.chatplus.name}: ${this.configManager.get('strings.errors.helloWorldPluginMessage')}`);
      }

      // 注册一个定时事件示例
      this.intervalId = setInterval(() => {
        this.eventBus.emitEvent('hello-world.tick', new Date());
      }, 5000);

      // 监听自定义事件
      this.eventBus.onEvent('hello-world.tick', (timestamp) => {
        this.logger.debug(`${this.name} tick at ${timestamp.toISOString()}`);
      });

      this.logger.info(`${this.metadata.chatplus.name} plugin activated`);
    } catch (error) {
      this.logger.error(`Failed to activate ${this.name} plugin: ${error.message}`);
    }
  }

  /**
   * 插件停用
   */
  async deactivate() {
    try {
      // 清除定时器
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      // 移除事件监听器
      this.eventBus.removeAllListenersEvent('hello-world.tick');

      this.logger.info(`${this.metadata.chatplus.name} plugin deactivated`);
    } catch (error) {
      this.logger.error(`Failed to deactivate ${this.name} plugin: ${error.message}`);
    }
  }

  /**
   * 插件卸载
   */
  async unload() {
    try {
      // 确保先停用
      await this.deactivate();

      // 移除路由
      if (this.app && this.router) {
        // 注意：Express不提供直接移除路由的方法，这里只是示意
        this.logger.info(`Routes for ${this.name} plugin removed`);
      }

      this.logger.info(`${this.metadata.chatplus.name} plugin unloaded`);
    } catch (error) {
      this.logger.error(`Failed to unload ${this.name} plugin: ${error.message}`);
    }
  }

  /**
   * 注册插件路由
   */
  registerRoutes() {
    if (!this.app) {
      this.logger.error('Cannot register routes: app is not initialized');
      return;
    }

    // 注册一个简单的路由
    this.app.get('/api/plugins/hello-world', (req, res) => {
      res.json({
        message: this.configManager.get('strings.errors.helloWorldPluginMessage'),
        pluginName: this.name,
        version: this.metadata.version
      });
    });

    this.logger.info(`Routes registered for ${this.name} plugin`);
  }
}

module.exports = HelloWorldPlugin;