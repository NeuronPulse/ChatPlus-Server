const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const PathUtils = require('./utils/pathUtils');
const multer = require('multer');
const NodeRSA = require('node-rsa');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { execSync } = require('child_process');
const logger = require('./logger');

// 引入配置管理器
const ConfigManager = require('./config');
const configManager = new ConfigManager();
// 引入字符串常量
const strings = configManager.get('strings', {});
// 引入加密工具
const cryptoUtils = require('./utils/crypto');
// 引入性能监控工具
const PerformanceMonitor = require('./utils/performanceMonitor');
const performanceMonitor = new PerformanceMonitor();
// 引入数据库查询优化器
const dbQueryOptimizer = require('./utils/dbQueryOptimizer');

// 引入数据库
const { sequelize } = require('./db');
// 引入模型
require('./models/User');
require('./models/Room');
require('./models/Device');
require('./models/File');
require('./models/FriendRequest');
require('./models/Message');
require('./models/MessageReadStatus');
require('./models/RoomMember');
require('./models/UserPublicKey');

// 引入插件系统
const eventBus = require('./utils/eventBus');
const pluginManager = require('./utils/pluginManager');
// 引入控制台
const serverConsole = require('./console');

// 加载环境变量
dotenv.config();

// 创建 Express 应用
const app = express();

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 创建上传文件存储
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = PathUtils.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
      // 确保上传目录存在
      await fs.promises.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// 导入路由管理器
const routes = require('./routes');

// 使用路由
app.use('/', routes);

// 导入错误处理工具
const errorHandler = require('./utils/errorHandler');

// 应用错误处理中间件
app.use(errorHandler.handleRequestError);

// 启动服务器
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);

  // 同步数据库
  sequelize.sync({ alter: true })
    .then(() => {
      logger.info('Database synchronized successfully');

      // 初始化插件系统
      pluginManager.init(eventBus);
      return pluginManager.loadAllPlugins();
    })
    .then(() => {
      // 授予示例插件所需权限
      pluginManager.grantPermissions('example-permission', ['user:read', 'message:read']);
      return pluginManager.activateAllPlugins();
    })
    .then(() => {
      // 启动控制台
      serverConsole.start(pluginManager);
      // 将服务器实例传递给控制台
      serverConsole.setServerInstance(server);

      // 触发应用初始化事件，通知插件系统
      eventBus.emitEvent('app.initialized', app);

      // 初始化API文档生成器
      const apiDocGenerator = require('./utils/apiDocGenerator');
      apiDocGenerator.init();
    })
    .catch(error => logger.error(`Failed to initialize plugins: ${error.message}`));
});

// 导出服务器实例，以便在测试中关闭
module.exports = { app, server };

console.log('服务器启动成功');
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';



console.log(`${RED}
 ██████╗██╗  ██╗ █████╗ ████████╗██████╗ ██╗     ██╗   ██╗███████╗
██╔════╝██║  ██║██╔══██╗╚══██╔══╝██╔══██╗██║     ██║   ██║██╔════╝
██║     ███████║███████║   ██║   ██████╔╝██║     ██║   ██║███████╗
██║     ██╔══██║██╔══██║   ██║   ██╔═══╝ ██║     ██║   ██║╚════██║
╚██████╗██║  ██║██║  ██║   ██║   ██║     ███████╗╚██████╔╝███████║
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚══════╝ ╚═════╝ ╚══════╝
                                                                  ${RESET}`);
console.log(`${BLUE}ChatPlus 服务端已经运行${RESET}`);


