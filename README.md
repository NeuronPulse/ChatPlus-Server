# ChatPlus 聊天应用

ChatPlus是一个功能完备的聊天应用，提供端到端加密通信、好友管理、群组聊天等功能。本 README 包含服务端环境配置、目录结构说明以及 API 文档链接。

## 环境配置

### .env 文件配置

在 server 目录下创建或修改 `.env` 文件，配置以下环境变量：

```env
# 服务器配置
PORT=3000

# 数据库配置
# SQLite 不需要额外配置，使用默认即可

# JWT 配置
JWT_SECRET=your-secret-key-here  # 替换为安全的随机字符串
JWT_EXPIRES_IN=24h  # JWT 令牌过期时间

# 文件上传配置
UPLOAD_DIR=./uploads  # 文件上传目录
```

> **注意**：JWT_SECRET 是用于签署 JWT 令牌的重要密钥，应该替换为一个安全的随机字符串。可以使用以下命令生成：
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

## 服务器目录结构与功能

```
server/
├── .env              # 环境变量配置文件
├── api-documentation.md  # API 文档
├── chatplus.db       # SQLite 数据库文件
├── db.js             # 数据库连接配置
├── index.js          # 服务器入口文件
├── logger.js         # 日志配置
├── logs/             # 日志文件目录
├── models/           # 数据模型
│   ├── File.js       # 文件模型
│   ├── FriendRequest.js  # 好友请求模型
│   ├── Message.js    # 消息模型
│   ├── Room.js       # 房间模型
│   ├── RoomMember.js # 房间成员模型
│   ├── User.js       # 用户模型
│   └── UserPublicKey.js  # 用户公钥模型
├── package.json      # 项目依赖
├── strings.json      # 字符串常量
├── test-logger.js    # 日志测试文件
└── test-sequelize.js # 数据库测试文件
```

### 主要文件功能说明

- `index.js`: 服务器入口文件，负责启动 Express 服务、路由注册和中间件配置
- `db.js`: 数据库连接配置，初始化 Sequelize 实例并导出
- `logger.js`: 日志配置，使用 Winston 实现日志记录功能
- `models/`: 数据模型目录，定义了应用中使用的所有数据库模型
- `test-sequelize.js`: 数据库连接测试文件
- `test-logger.js`: 日志功能测试文件

## API 文档

详细的 API 文档请查看：[API 文档](server/api-documentation.md)

## 启动服务器

1. 安装依赖
```bash
cd server
npm install
```

2. 启动服务器
```bash
npm start
```

3. 开发模式启动（使用 nodemon 自动重启）
```bash
npm run dev
```

服务器启动后，默认监听端口 3000，访问地址：http://localhost:3000
