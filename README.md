# ChatPlus 聊天应用

ChatPlus是一个功能完备的聊天应用，提供安全的通信体验和丰富的功能。支持端到端加密、好友管理、群组聊天、消息撤回与编辑、多设备同步以及插件扩展等特性。本 README 包含服务端环境配置、目录结构说明、API 文档链接以及插件系统指南。

## 核心功能

- **安全通信**：支持消息和文件加密，保护用户隐私
- **用户管理**：注册、登录、个人资料管理
- **好友关系**：添加好友、接受/拒绝好友请求、好友列表
- **聊天室**：创建、加入、退出聊天室
- **消息功能**：发送文本、图片、文件和语音消息，支持消息撤回与编辑
- **群组管理**：添加/移除群成员、设置群公告
- **多设备同步**：支持多设备登录和消息同步
- **文件传输**：安全地上传和下载文件，支持文件加密
- **用户状态**：设置和查看用户在线状态和自定义状态消息
- **插件系统**：支持插件扩展，可自定义功能和集成第三方服务

## 环境配置

### .env 文件配置

在项目根目录下创建或修改 `.env` 文件，配置以下环境变量：

```env
# 服务器配置
PORT=3000                  # 服务器端口

# 数据库配置
# SQLite 不需要额外配置，使用默认即可

# 安全配置
ENCRYPTION_KEY=your_encryption_key_here  # 用于消息和文件加密的AES-256-CBC密钥，必须是64字符的十六进制字符串
# 注意：此密钥不再有默认值，请务必在.env文件中设置
JWT_SECRET=your-secret-key-here          # 替换为安全的随机字符串，用于JWT认证，建议使用64字符的十六进制字符串
JWT_EXPIRES_IN=24h                       # JWT 令牌过期时间

# 文件配置
UPLOAD_DIR=./uploads       # 文件上传目录
```

### 生成安全密钥

可以使用以下命令生成安全的随机密钥：

```bash
# 生成JWT_SECRET和ENCRYPTION_KEY
node -e "const crypto = require('crypto'); console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex')); console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));"
```

### 数据库初始化

项目使用Sequelize ORM进行数据库操作。首次运行前需要初始化数据库：

```bash
# 运行数据库迁移
npm run db:migrate
```

### 安全注意事项

1. **ENCRYPTION_KEY** 是用于AES-256-CBC加密的密钥，必须是32字符长。请使用安全的随机字符串，不要硬编码在代码中。
2. **JWT_SECRET** 用于用户认证，请使用强密码。可以使用以下命令生成：
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. 生产环境中，请确保 `.env` 文件不会被提交到版本控制系统中。
4. 定期轮换加密密钥以增强安全性。
5. 建议使用HTTPS协议部署应用，以保护传输中的数据。

> **注意**：JWT_SECRET 是用于签署 JWT 令牌的重要密钥，应该替换为一个安全的随机字符串。可以使用以下命令生成：
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

## 项目目录结构与功能

```
├── .gitignore
├── .sequelizerc
├── .env              # 环境变量配置文件
├── LICENSE
├── PLUGIN_SYSTEM_DESIGN.md
├── README.md
├── api-documentation.md  # API 文档
├── check-syntax.js   # 语法检查工具
├── config/           # 配置文件
│   ├── config.json   # 配置文件
│   ├── index.js      # 配置管理器
│   └── strings.json  # 字符串常量
├── console.js
├── db-migrate.js     # 数据库迁移工具
├── db.js             # 数据库连接配置
├── index.js          # 服务器入口文件
├── logger.js         # 日志配置
├── logs/             # 日志文件目录
├── middleware/       # 中间件
│   ├── auth.js       # 认证中间件
│   └── errorHandler.js # 错误处理中间件
├── migrations/       # 数据库迁移文件
├── models/           # 数据模型
│   ├── Device.js     # 设备模型
│   ├── File.js       # 文件模型
│   ├── FriendRequest.js  # 好友请求模型
│   ├── Message.js    # 消息模型
│   ├── MessageReadStatus.js # 消息已读状态模型
│   ├── Room.js       # 房间模型
│   ├── RoomMember.js # 房间成员模型
│   ├── User.js       # 用户模型
│   └── UserPublicKey.js  # 用户公钥模型
├── modules/          # 功能模块
│   ├── deviceSync.js     # 多设备同步模块
│   ├── groupChat.js      # 群组管理模块
│   ├── messageEditAndRecall.js # 消息撤回与编辑模块
│   ├── messageReadStatus.js # 消息已读状态模块
│   ├── offlineMessage.js # 离线消息处理模块
│   └── userStatus.js     # 用户状态管理模块
├── package.json      # 项目依赖
├── plugins/          # 插件目录
│   ├── example-permission/  # 权限示例插件
│   │   ├── config.json
│   │   ├── index.js
│   │   └── package.json
│   └── hello-world/  # 示例插件
│       ├── config.json
│       ├── index.js
│       └── package.json
├── routes/           # 路由
│   ├── health.js     # 健康检查路由
│   ├── index.js      # 路由入口
│   └── plugins.js    # 插件路由
└── utils/            # 工具函数
    ├── apiDocGenerator.js # API文档生成器
    ├── crypto.js     # 加密工具
    ├── eventBus.js   # 事件总线
    ├── performanceMonitor.js # 性能监控
    └── pluginManager.js # 插件管理器
```

### 主要文件功能说明

- `index.js`: 服务器入口文件，负责启动 Express 服务、路由注册、中间件配置和插件系统初始化
- `db.js`: 数据库连接配置，初始化 Sequelize 实例并导出
- `logger.js`: 日志配置，使用 Winston 实现日志记录功能
- `utils/pluginManager.js`: 插件管理器，负责插件的加载、初始化、激活、停用和卸载
- `utils/eventBus.js`: 事件总线，实现插件间通信和系统事件处理
- `config/index.js`: 配置管理器，负责配置加载和管理

## 插件系统

ChatPlus 插件系统允许开发者扩展应用功能，集成第三方服务，实现高度定制化。插件系统基于事件驱动架构，提供简单易用的 API 和完整的生命周期管理。

详细的插件系统设计和开发指南，请参考 [插件系统设计文档](docs/PLUGIN_SYSTEM_DESIGN.md)。

Mixin注入功能的使用指南，请参考 [Mixin系统使用指南](docs/MIXIN_SYSTEM_GUIDE.md)。

### 核心特点

- **模块化**: 将功能封装为独立插件，便于开发和维护
- **可扩展**: 轻松添加新功能，无需修改核心代码
- **灵活性**: 插件可动态加载、激活和卸载
- **松耦合**: 通过事件总线实现插件间通信
- **运行时修改**: 支持Mixin注入，在运行时动态修改对象行为
- **钩子系统**: 提供钩子机制，可在特定时机执行自定义代码

### 示例插件

项目提供了 `hello-world` 和 `example-permission` 两个示例插件，位于 `plugins/` 目录下，展示了插件的基本结构和用法。

## 部署指南

1. 克隆仓库: `git clone https://github.com/yourusername/chatplus.git`
2. 安装依赖: `cd chatplus && npm install`
3. 配置环境变量: 复制 `.env.example` 为 `.env` 并修改配置
4. 初始化数据库: `npm run migrate`
5. 启动服务器: `npm start` 或 `npm run dev` (开发模式)

## 贡献指南

1. Fork 仓库
2. 创建特性分支: `git checkout -b feature/your-feature`
3. 提交修改: `git commit -am 'Add some feature'`
4. 推送分支: `git push origin feature/your-feature`
5. 创建拉取请求


## API 文档

API 文档详细描述了所有可用的 API 端点、请求参数和响应格式，包括认证、用户管理、消息处理、文件传输、群组管理和多设备同步等功能。

完整的 API 文档，请参考 [API 文档](docs/api-documentation.md)。

### 核心功能 API

- **认证 API**: 注册、登录、获取用户信息
- **用户 API**: 获取/更新用户信息、状态管理
- **好友 API**: 好友请求、好友列表管理
- **消息 API**: 发送/接收消息、消息撤回与编辑、已读状态
- **文件 API**: 文件上传/下载、文件信息获取
- **群组 API**: 群组创建、成员管理、信息更新
- **多设备同步 API**: 设备注册、消息同步

## 启动服务器

### 开发环境

1. 安装依赖：

```bash
npm install
```

2. 配置环境变量：

创建 `.env` 文件并配置必要的环境变量：

```bash
# 编辑 .env 文件，设置 ENCRYPTION_KEY、JWT_SECRET 等
```

3. 初始化数据库：

```bash
npm run migrate
```

4. 启动开发服务器：

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动，支持热重载。

### 生产环境

1. 安装依赖（生产模式）：

```bash
npm install --production
```

2. 配置环境变量：

创建 `.env` 文件并配置必要的环境变量，确保设置适当的安全级别。

3. 构建项目：

```bash
npm run build
```

4. 启动生产服务器：

```bash
npm start
```

### 使用 Docker 部署

1. 构建 Docker 镜像：

```bash
docker build -t chatplus-server .
```

2. 运行 Docker 容器：

```bash
docker run -d -p 3000:3000 --env-file .env chatplus-server
```

## 测试

运行单元测试：

```bash
npm test
```

运行集成测试：

```bash
npm run test-integration
```

## 安全最佳实践

1. 使用 HTTPS 保护传输中的数据
2. 定期轮换加密密钥和 JWT 密钥
3. 实施适当的访问控制和输入验证
4. 保持依赖包更新，以防止已知漏洞
5. 监控日志中的异常活动
6. 对敏感数据进行加密存储
7. 实施速率限制以防止暴力攻击

## 贡献指南

1.  Fork 仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情见 [LICENSE](LICENSE) 文件
