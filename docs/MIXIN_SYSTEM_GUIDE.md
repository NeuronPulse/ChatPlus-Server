# Mixin注入功能使用指南

## 概述

Mixin注入功能允许在运行时动态修改对象的行为，为现有对象添加新方法、属性或修改现有方法。该功能通过Mixin管理器实现，支持灵活的代码扩展和运行时修改。

## 核心概念

### Mixin
Mixin是一种设计模式，允许将功能注入到现有对象中，而无需继承。Mixin可以：
- 添加新方法和属性
- 修改现有方法
- 提供可重用的功能模块

### 钩子(Hooks)
钩子是可以在特定时机触发的函数，用于扩展系统行为。支持：
- 同步和异步钩子
- 按优先级执行
- 动态注册和移除

## API参考

### Mixin管理

#### registerMixin(name, mixin, options)
注册一个mixin

参数:
- `name` (string): mixin名称
- `mixin` (Object): mixin对象，包含要注入的方法和属性
- `options` (Object): 选项对象

示例:
```javascript
const exampleMixin = {
  greet() {
    return `Hello from ${this.name}`;
  },
  version: '1.0.0'
};

pluginManager.registerMixin('example', exampleMixin);
```

#### unregisterMixin(name)
注销一个mixin

参数:
- `name` (string): mixin名称

#### applyMixin(mixinName, target, targetProperty)
将mixin应用到目标对象

参数:
- `mixinName` (string): mixin名称
- `target` (Object): 目标对象
- `targetProperty` (string, optional): 目标属性名，如果指定则应用到该属性

示例:
```javascript
const userService = {
  name: 'UserService',
  getUser(id) {
    return { id, name: `User${id}` };
  }
};

// 应用到整个对象
pluginManager.applyMixin('example', userService);

// 应用到特定属性
pluginManager.applyMixin('example', userService, 'utils');
```

#### removeMixin(mixinName)
移除已应用的mixin

参数:
- `mixinName` (string): mixin名称

#### isMixinRegistered(mixinName)
检查mixin是否已注册

参数:
- `mixinName` (string): mixin名称

返回:
- `boolean`: 是否已注册

#### isMixinApplied(mixinName)
检查mixin是否已应用

参数:
- `mixinName` (string): mixin名称

返回:
- `boolean`: 是否已应用

#### getRegisteredMixins()
获取所有已注册的mixin名称

返回:
- `Array<string>`: mixin名称数组

#### getAppliedMixins()
获取所有已应用的mixin名称

返回:
- `Array<string>`: mixin名称数组

### 钩子管理

#### registerHook(hookName, handler, options)
注册一个钩子

参数:
- `hookName` (string): 钩子名称
- `handler` (Function): 处理函数
- `options` (Object): 选项对象
  - `priority` (number): 优先级，数字越小优先级越高
  - `async` (boolean): 是否为异步钩子

示例:
```javascript
// 注册同步钩子
pluginManager.registerHook('user.login.before', (username) => {
  console.log(`用户即将登录: ${username}`);
});

// 注册异步钩子
pluginManager.registerHook('user.login.after', async (user) => {
  await saveLoginRecord(user);
}, { async: true });
```

#### triggerHook(hookName, ...args)
触发钩子

参数:
- `hookName` (string): 钩子名称
- `...args` (any): 传递给钩子处理函数的参数

示例:
```javascript
// 触发钩子
await pluginManager.triggerHook('user.login.after', user);
```

#### removeHook(hookName, handler)
移除钩子

参数:
- `hookName` (string): 钩子名称
- `handler` (Function, optional): 特定的处理函数，如果不指定则移除所有同名钩子

#### getHookNames()
获取所有钩子名称

返回:
- `Array<string>`: 钩子名称数组

## 使用示例

### 基本Mixin使用

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

### 钩子使用

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

## 插件集成

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

## 最佳实践

1. **命名规范**: 为mixin和钩子使用清晰、描述性的名称
2. **避免冲突**: 注意mixin可能覆盖现有方法的风险
3. **及时清理**: 在不需要时注销mixin和钩子
4. **错误处理**: 在钩子处理函数中正确处理错误
5. **性能考虑**: 避免在高频调用的路径中使用复杂的mixin操作