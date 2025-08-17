# ChatPlus 插件系统设计

## 1. 设计目标
- 提供可扩展的插件机制，允许动态加载和卸载功能
- 保持与现有代码结构的兼容性
- 支持插件间通信和依赖管理
- 提供清晰的插件开发接口和文档
- 硡保插件安全和权限管理
- 实现插件热重载，提高开发效率
- 支持运行时代码修改和钩子机制

## 2. 核心组件

### 2.1 插件管理器 (PluginManager)
- 负责插件的加载、初始化、卸载和状态管理
- 提供插件注册和查询接口（`getPlugins`, `getPlugin`）
- 管理插件依赖关系，确保依赖先于插件加载
- 实现插件热重载机制，监听文件变化并自动更新插件
- 管理插件权限，控制插件对系统资源的访问
- 提供权限授予和撤销的API（`grantPermissions`, `revokePermissions`）
- 支持插件激活和停用状态管理
- 维护插件元数据和配置信息
- 提供插件生命周期管理
- 集成Mixin管理器，支持运行时代码注入

### 2.2 事件总线 (EventBus)
- 基于Node.js的`EventEmitter`实现发布-订阅模式
- 允许插件监听和触发系统事件及自定义事件
- 支持事件过滤和优先级设置
- 提供异步事件处理机制，支持Promise返回值
- 支持事件命名空间，避免命名冲突
- 提供事件监听管理API（`on`, `once`, `off`, `emit`）
- 实现系统事件和插件事件的分离

### 2.3 插件接口 (Plugin Interface)
- 定义插件的生命周期方法（`beforeInit`, `init`, `beforeActivate`, `activate`, `beforeDeactivate`, `deactivate`, `beforeUnload`, `unload`）
- 提供访问系统资源的统一接口（`logger`, `configManager`, `eventBus`）
- 标准化插件配置和元数据
- 支持依赖声明和权限请求
- 提供插件间通信机制

### 2.4 Mixin管理器 (MixinManager)
- 提供运行时代码注入功能
- 支持动态修改对象行为
- 允许添加、修改或删除对象的方法和属性
- 提供钩子系统，支持在特定时机执行代码
- 支持同步和异步钩子
- 提供钩子优先级管理

## 3. Mixin系统

### 3.1 概念
Mixin是一种设计模式，允许将功能注入到现有对象中，而无需继承。Mixin可以：
- 添加新方法和属性
- 修改现有方法
- 提供可重用的功能模块

### 3.2 核心API

#### 3.2.1 Mixin管理
- `registerMixin(name, mixin, options)`: 注册一个mixin
- `unregisterMixin(name)`: 注销一个mixin
- `applyMixin(mixinName, target, targetProperty)`: 将mixin应用到目标对象
- `removeMixin(mixinName)`: 移除已应用的mixin

#### 3.2.2 钩子管理
- `registerHook(hookName, handler, options)`: 注册一个钩子
- `triggerHook(hookName, ...args)`: 触发钩子
- `removeHook(hookName, handler)`: 移除钩子

### 3.3 使用示例

#### 3.3.1 基本Mixin使用
```javascript
// 1. 定义mixin
const loggingMixin = {
  log(message) {
    console.log(`[${this.constructor.name}] ${message}`);
  },
  
  // 覆盖现有方法
  toString() {
    return `[Enhanced ${this.constructor.name}]`;
  }
};

// 2. 注册mixin
pluginManager.registerMixin('logging', loggingMixin);

// 3. 创建目标对象
class UserService {
  constructor() {
    this.name = 'UserService';
  }
}

const service = new UserService();

// 4. 应用mixin
pluginManager.applyMixin('logging', service);

// 5. 使用增强后的功能
service.log('Hello World'); // 输出: [UserService] Hello World

// 6. 移除mixin
pluginManager.removeMixin('logging');
```

#### 3.3.2 钩子使用
```javascript
// 1. 注册钩子
pluginManager.registerHook('data.process.before', (data) => {
  console.log('处理前:', data);
});

pluginManager.registerHook('data.process.after', async (result) => {
  await saveResult(result);
}, { async: true, priority: 10 });

// 2. 触发钩子
const data = { id: 1, value: 'test' };
pluginManager.triggerHook('data.process.before', data);

const result = processData(data);
await pluginManager.triggerHook('data.process.after', result);
```

### 3.4 插件集成
Mixin功能已集成到插件管理器中，插件可以直接使用：

```javascript
class MyPlugin {
  constructor(options) {
    this.pluginManager = require('../../utils/pluginManager');
  }
  
  async activate() {
    // 在插件激活时注册mixin
    this.pluginManager.registerMixin('my-plugin-mixin', {
      pluginMethod() {
        return 'Provided by MyPlugin';
      }
    });
  }
  
  async deactivate() {
    // 在插件停用时注销mixin
    this.pluginManager.unregisterMixin('my-plugin-mixin');
  }
}
```

## 4. 插件结构
```
plugins/
  ├── plugin1/
  │   ├── index.js         # 插件入口
  │   ├── package.json     # 插件元数据
  │   ├── config.json      # 插件配置
  │   └── ...              # 插件资源
  ├── plugin2/
  └── ...
```

## 4. 生命周期
1. **加载 (Load)**: 读取插件元数据和配置，验证插件结构，解析依赖关系
2. **初始化 (Init)**: 执行插件初始化代码，注册事件和功能，建立与系统的连接
3. **激活 (Activate)**: 插件开始工作，响应事件，检查权限，执行主要功能
4. **停用 (Deactivate)**: 插件停止工作，清理资源，移除事件监听
5. **卸载 (Unload)**: 完全移除插件，释放内存和资源

### 4.1 生命周期方法
- `beforeInit()`: 在插件初始化前调用，用于预处理
- `init()`: 插件初始化方法，必需实现
- `beforeActivate()`: 在插件激活前调用
- `activate()`: 插件激活方法
- `beforeDeactivate()`: 在插件停用前调用
- `deactivate()`: 插件停用方法
- `beforeUnload()`: 在插件卸载前调用
- `unload()`: 插件卸载方法

### 4.2 热重载生命周期
1. **文件变更检测**: 监听插件文件系统变化
2. **自动停用**: 检测到变化后自动停用插件
3. **重新加载**: 重新读取插件文件和配置
4. **重新激活**: 加载完成后自动激活插件

### 4.3 系统事件
- `plugin.loaded`: 插件加载完成后触发
- `plugin.activated`: 插件激活后触发
- `plugin.deactivated`: 插件停用时触发
- `plugin.unloaded`: 插件卸载后触发
- `plugin.error`: 插件发生错误时触发

## 5. 实现思路
- 使用动态导入(`import()`)加载插件
- 基于`EventEmitter`实现事件总线
- 提供装饰器函数增强现有功能
- 实现插件热重载机制，使用`fs.watch`监听文件变化
- 实现细粒度的权限系统控制插件访问范围

## 6. 安全机制
### 6.1 权限管理
- 基于角色的访问控制系统(RBAC)，定义不同插件角色和权限
- 细粒度权限划分，包括系统资源访问、API调用、数据读写等权限
- 插件必需声明所需权限，用户可以选择性授予
- 提供权限检查API（`checkPermission`, `hasPermission`）
- 实现权限继承和委托机制

#### 6.1.1 权限声明格式
插件需在`plugin.json`中声明权限，示例：
```json
{
  "name": "example-plugin",
  "version": "1.0.0",
  "permissions": [
    {"name": "user:read", "description": "读取用户基本信息"},
    {"name": "message:write", "description": "发送消息"}
  ],
  "optionalPermissions": [
    {"name": "user:profile:read", "description": "读取用户详细资料"}
  ]
}
```

#### 6.1.2 权限检查流程
1. 插件调用需要权限的API
2. 系统拦截请求并检查权限
3. 如已授权，继续执行；如未授权，返回权限错误
4. 对于可选权限，提供运行时请求机制

#### 6.1.3 权限类型
- `core:read`: 读取核心系统信息
- `core:write`: 修改核心系统配置
- `user:read`: 读取用户基本数据
- `user:write`: 修改用户数据
- `user:profile:read`: 读取用户详细资料
- `message:read`: 读取消息数据
- `message:write`: 发送或修改消息
- `plugin:manage`: 管理其他插件
- `database:access`: 直接访问数据库

### 6.2 安全隔离
- 插件代码沙箱隔离，限制插件对核心系统的直接访问
- 使用代理模式包装敏感API，添加访问控制和日志记录
- 实现插件内存和资源限制，防止资源滥用

### 6.3 安全检查
- 插件签名验证，确保插件来源可靠
- 静态代码分析，检测潜在安全风险
- 运行时监控，检测异常行为
- 定期安全审计和漏洞扫描

### 6.4 数据安全
- 插件数据加密存储
- 敏感数据访问控制
- 数据传输加密
- 用户隐私保护机制

## 7. 与现有系统集成
### 7.1 路由扩展
- 插件可以注册新的API路由和中间件
- 支持Express风格的路由定义
- 示例:
```javascript
// 插件中注册路由
export default class ExamplePlugin {
  init(app) {
    // 注册新路由
    app.router.get('/api/plugin/example', this.handleExampleRequest.bind(this));
    // 注册中间件
    app.router.use('/api/plugin/example/*', this.authMiddleware.bind(this));
  }
  handleExampleRequest(req, res) {
    res.json({ success: true, data: 'Example response' });
  }
  authMiddleware(req, res, next) {
    // 认证逻辑
    next();
  }
}
```

### 7.2 模块扩展
- 插件可以扩展现有模块功能
- 支持使用装饰器模式增强现有方法
- 示例:
```javascript
// 插件中扩展消息模块
export default class MessageEnhancerPlugin {
  init(app) {
    // 扩展消息发送功能
    const originalSendMessage = app.modules.message.sendMessage;
    app.modules.message.sendMessage = async (message) => {
      // 增强逻辑
      console.log('Enhanced message sending:', message);
      // 调用原始方法
      return await originalSendMessage(message);
    };
  }
}
```

### 7.3 配置与日志
- 插件可访问配置管理器和日志系统
- 支持读取和修改插件专属配置
- 示例:
```javascript
export default class ConfigurablePlugin {
  init(app) {
    // 读取配置
    const pluginConfig = app.configManager.get('plugins.configurablePlugin');
    // 写入配置
    app.configManager.set('plugins.configurablePlugin', { enabled: true });
    // 记录日志
    app.logger.info('Configurable plugin initialized');
  }
}
```

### 7.4 数据库集成
- 支持数据库模型扩展
- 可添加自定义数据迁移
- 示例:
```javascript
export default class DatabasePlugin {
  async init(app) {
    // 定义新模型
    const CustomModel = app.sequelize.define('CustomModel', {
      name: app.sequelize.Sequelize.STRING,
      value: app.sequelize.Sequelize.TEXT
    });
    // 同步模型到数据库
    await CustomModel.sync();
    // 添加到应用实例
    app.models.CustomModel = CustomModel;
  }
}
```

### 7.5 权限系统集成
- 集成权限系统，控制插件访问权限
- 支持权限检查和动态授权
- 示例:
```javascript
export default class PermissionPlugin {
  async someRestrictedAction(app, userId) {
    // 检查权限
    if (!await app.permissionManager.checkPermission('some:action', userId)) {
      throw new Error('Permission denied');
    }
    // 执行受限操作
    return { success: true };
  }
}
```

### 7.6 热重载支持
- 支持热重载，无需重启服务器更新插件
- 自动检测文件变化并应用更新
- 维护插件状态一致性

## 8. 示例插件
以下是几个示例插件，展示如何实现不同的功能：

### 8.1 新增聊天功能插件
```javascript
// plugins/chatEnhancer/index.js
import { v4 as uuidv4 } from 'uuid';

export default class ChatEnhancerPlugin {
  constructor() {
    this.name = 'chatEnhancer';
    this.description = 'Enhances chat functionality with new features';
    this.version = '1.0.0';
    this.permissions = [
      { name: 'message:read', description: 'Read messages' },
      { name: 'message:write', description: 'Send messages' }
    ];
  }

  init(app) {
    this.app = app;
    // 注册事件监听
    app.eventBus.on('message.created', this.handleNewMessage.bind(this));
    // 注册新路由
    app.router.post('/api/plugin/chat-enhancer/quote', this.handleQuoteMessage.bind(this));
  }

  async handleNewMessage(message) {
    // 处理新消息，添加额外功能
    if (message.content.includes('@everyone')) {
      await this.notifyAllUsers(message);
    }
  }

  async handleQuoteMessage(req, res) {
    try {
      const { messageId, content } = req.body;
      // 获取被引用的消息
      const quotedMessage = await this.app.models.Message.findByPk(messageId);
      if (!quotedMessage) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }

      // 创建新消息
      const newMessage = await this.app.models.Message.create({
        id: uuidv4(),
        content: `> ${quotedMessage.content}\n\n${content}`,
        senderId: req.user.id,
        roomId: quotedMessage.roomId,
        quotedMessageId: messageId,
        createdAt: new Date()
      });

      // 触发消息创建事件
      this.app.eventBus.emit('message.created', newMessage);

      res.json({ success: true, data: newMessage });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async notifyAllUsers(message) {
    // 实现@everyone功能
    const roomMembers = await this.app.models.RoomMember.findAll({
      where: { roomId: message.roomId }
    });

    for (const member of roomMembers) {
      if (member.userId !== message.senderId) {
        await this.app.models.Notification.create({
          userId: member.userId,
          type: 'mention',
          content: `You were mentioned in room ${message.roomId}`,
          relatedMessageId: message.id
        });
      }
    }
  }

  async deactivate() {
    // 清理事件监听
    this.app.eventBus.off('message.created', this.handleNewMessage.bind(this));
  }
}
```

### 8.2 第三方服务集成插件
```javascript
// plugins/weatherIntegration/index.js
import axios from 'axios';

export default class WeatherIntegrationPlugin {
  constructor() {
    this.name = 'weatherIntegration';
    this.description = 'Integrates weather information into chat';
    this.version = '1.0.0';
    this.permissions = [
      { name: 'message:write', description: 'Send weather messages' }
    ];
    this.optionalPermissions = [
      { name: 'user:profile:read', description: 'Read user location' }
    ];
    // 第三方API配置
    this.weatherApiKey = null;
  }

  async init(app) {
    this.app = app;
    // 从配置中获取API密钥
    this.weatherApiKey = app.configManager.get('plugins.weatherIntegration.apiKey');
    // 注册命令处理器
    app.eventBus.on('command.executed', this.handleCommand.bind(this));
    // 注册配置路由
    app.router.post('/api/plugin/weather/settings', this.updateSettings.bind(this));
  }

  async handleCommand(command) {
    if (command.name === 'weather') {
      await this.getWeatherInfo(command);
    }
  }

  async getWeatherInfo(command) {
    try {
      let location = command.args.location;
      // 如果没有提供位置，尝试从用户资料获取
      if (!location && await this.app.permissionManager.checkPermission('user:profile:read', command.userId)) {
        const userProfile = await this.app.models.UserProfile.findOne({
          where: { userId: command.userId }
        });
        if (userProfile && userProfile.location) {
          location = userProfile.location;
        }
      }

      if (!location) {
        return this.sendResponse(command, 'Please provide a location or allow access to your profile.');
      }

      // 调用第三方天气API
      const response = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${this.weatherApiKey}&q=${location}`
      );

      const weatherData = response.data;
      const weatherInfo = `Weather in ${weatherData.location.name}, ${weatherData.location.country}: ` +
        `${weatherData.current.temp_c}°C, ${weatherData.current.condition.text}, ` +
        `Humidity: ${weatherData.current.humidity}%`;

      this.sendResponse(command, weatherInfo);
    } catch (error) {
      this.sendResponse(command, `Error fetching weather data: ${error.message}`);
    }
  }

  async sendResponse(command, message) {
    // 发送响应消息
    await this.app.models.Message.create({
      id: this.app.utils.generateId(),
      content: message,
      senderId: 'system',
      roomId: command.roomId,
      createdAt: new Date()
    });
  }

  async updateSettings(req, res) {
    try {
      const { apiKey } = req.body;
      // 更新配置
      this.app.configManager.set('plugins.weatherIntegration.apiKey', apiKey);
      this.weatherApiKey = apiKey;
      res.json({ success: true, message: 'Settings updated' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
```

### 8.3 热重载兼容插件开发
```javascript
// plugins/liveReloadDemo/index.js

export default class LiveReloadDemoPlugin {
  constructor() {
    this.name = 'liveReloadDemo';
    this.description = 'Demonstrates hot reloading capabilities';
    this.version = '1.0.0';
    this.state = { counter: 0 };
  }

  init(app) {
    this.app = app;
    // 注册路由
    app.router.get('/api/plugin/live-reload-demo', this.getState.bind(this));
    app.router.post('/api/plugin/live-reload-demo/increment', this.incrementCounter.bind(this));
    // 记录初始化
    app.logger.info('LiveReloadDemoPlugin initialized');
  }

  getState(req, res) {
    res.json({
      success: true,
      data: {
        counter: this.state.counter,
        lastReload: this.lastReload || new Date().toISOString()
      }
    });
  }

  incrementCounter(req, res) {
    this.state.counter++;
    res.json({
      success: true,
      data: { counter: this.state.counter }
    });
  }

  async beforeReload() {
    // 保存状态前重载
    this.app.logger.info(`Saving state before reload: ${this.state.counter}`);
    // 可以将状态保存到数据库或文件
  }

  async afterReload() {
    // 重载后恢复状态
    this.lastReload = new Date().toISOString();
    this.app.logger.info(`Reloaded at ${this.lastReload}, counter: ${this.state.counter}`);
  }

  deactivate() {
    // 清理资源
    this.app.logger.info('LiveReloadDemoPlugin deactivated');
  }
}
```

### 8.4 插件配置示例
每个插件都应该有一个`plugin.json`文件，用于声明插件元数据和权限：
```json
{
  "name": "weatherIntegration",
  "version": "1.0.0",
  "description": "Integrates weather information into chat",
  "main": "index.js",
  "author": "ChatPlus Team",
  "permissions": [
    {"name": "message:write", "description": "Send weather messages"}
  ],
  "optionalPermissions": [
    {"name": "user:profile:read", "description": "Read user location"}
  ],
  "dependencies": {
    "axios": "^0.24.0"
  },
  "config": {
    "apiKey": ""
  }
}
```