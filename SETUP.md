# ChatPlus 服务器配置指南

## 快速开始

### 1. 环境配置

项目需要一个 `.env` 文件来存储敏感配置。我们已经为你创建了一个模板，包含以下必要配置：

```env
# 加密密钥 - 必须是64个十六进制字符（32字节）的AES-256密钥
ENCRYPTION_KEY=fb35933438ec691f0618799cce536e0848544f8211e157543e60e2279ce7677a

# 服务器配置
PORT=3000
NODE_ENV=development

# JWT密钥
JWT_SECRET=your-jwt-secret-key-change-this-in-production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=chatplus
DB_USER=root
DB_PASSWORD=

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 日志配置
LOG_LEVEL=info
LOG_DIR=./logs
```

### 2. 生成新的加密密钥

如果需要生成新的加密密钥，可以使用以下命令：

```bash
node -e "const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('hex'));"
```

### 3. 启动服务器

#### 方法1：使用批处理文件（Windows）
双击 `start-server.bat` 文件即可启动服务器。

#### 方法2：使用命令行
```bash
node index.js
```

### 4. 验证服务器状态

服务器启动后，你应该能看到以下日志：
```
[时间] info: 插件管理器已初始化
[时间] info: 成功加载 X 个插件
[时间] info: 已激活 X 个插件
[时间] info: Server console started. Type 'help' for available commands.
[时间] info: API documentation generated successfully
```

### 5. 常见问题解决

#### 问题："加密密钥未配置"
- 确保 `.env` 文件存在于项目根目录
- 检查 `ENCRYPTION_KEY` 是否存在且为64位十六进制字符串
- 重启服务器

#### 问题：插件加载错误
- 检查插件目录权限
- 确保插件文件完整
- 查看日志获取详细信息

## 开发环境建议

1. **安装开发依赖**:
```bash
npm install --save-dev nodemon
```

2. **使用开发模式启动**:
```bash
npx nodemon index.js
```

3. **查看API文档**:
启动后查看 `api-documentation.md` 文件获取API使用说明。

## 安全提醒

- 在生产环境中，请确保修改默认的JWT密钥
- 定期更换加密密钥
- 不要将 `.env` 文件提交到版本控制
- 使用强密码保护数据库

## 技术支持

如有问题，请查看日志文件 `logs/chatplus-*.log` 获取详细信息。