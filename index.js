const express = require('express');
const logger = require('./logger');
// 测试logger是否正常工作
// logger.info('Logger test message');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const NodeRSA = require('node-rsa');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { execSync } = require('child_process');

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
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// 从db.js导入sequelize实例
const { sequelize } = require('./db');

// 生成 RSA 密钥对用于端到端加密
const key = new NodeRSA({
  b: 2048
});

const publicKey = key.exportKey('public');
const privateKey = key.exportKey('private');

// 导入模型
const User = require('./models/User');
const FriendRequest = require('./models/FriendRequest');
const Room = require('./models/Room');
const RoomMember = require('./models/RoomMember');
const Message = require('./models/Message');
const File = require('./models/File');
const UserPublicKey = require('./models/UserPublicKey');

// 同步数据库
(async () => {
  try {
    await sequelize.sync({
      alter: true
    });
    logger.info('Database synchronization successful');
  } catch (error) {
    logger.error('Database synchronization failed:', error);
  }
})();

// 密钥管理 API
app.get('/api/keys/public', (req, res) => {
  res.json({
    success: true,
    publicKey
  });
});

app.post('/api/keys/upload', authenticateToken, async (req, res) => {
  try {
    const { publicKey } = req.body;
    const userId = req.user.id;

    // 检查是否已存在公钥
    let userPublicKey = await UserPublicKey.findOne({
      where: {
        userId
      }
    });

    if (userPublicKey) {
      // 更新公钥
      userPublicKey.publicKey = publicKey;
      await userPublicKey.save();
    } else {
      // 创建新公钥记录
      await UserPublicKey.create({
        userId,
        publicKey
      });
    }

    res.json({
      success: true,
      message: strings.success.publicKeyUploaded
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

// 用户认证 API
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, nickname } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      where: {
        [Sequelize.Op.or]: [{
          username
        }, {
          email
        }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: strings.errors.userExists
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const user = await User.create({
      username,
      password: hashedPassword,
      email,
      nickname
    });

    res.json({
      success: true,
      message: strings.success.registered,
      userId: user.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await User.findOne({
      where: {
        username
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: strings.errors.invalidCredentials
      });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成 JWT 令牌
    const token = jwt.sign({
      id: user.id,
      username: user.username
    }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '24h'
    });

    res.json({
      success: true,
      token,
      userInfo: {
        userId: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

// 用户关系 API
app.post('/api/friends/request', authenticateToken, async (req, res) => {
  try {
    const { targetUserId, message } = req.body;
    const userId = req.user.id;

    // 检查目标用户是否存在
    const targetUser = await User.findByPk(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: strings.errors.targetUserNotFound
      });
    }

    // 检查是否已经发送过请求
    const existingRequest = await FriendRequest.findOne({
      where: {
        senderId: userId,
        receiverId: targetUserId,
        status: 'pending'
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: strings.errors.friendRequestExists
      });
    }

    // 创建好友请求
    await FriendRequest.create({
      senderId: userId,
      receiverId: targetUserId,
      message
    });

    res.json({
      success: true,
      message: strings.success.friendRequestSent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

app.post('/api/friends/accept', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user.id;

    // 查找好友请求
    const request = await FriendRequest.findByPk(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: strings.errors.friendRequestNotFound
      });
    }

    // 检查是否是接收方
    if (request.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: strings.errors.noPermission
      });
    }

    // 更新请求状态
    request.status = 'accepted';
    await request.save();

    res.json({
      success: true,
      message: strings.success.friendRequestAccepted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

app.post('/api/friends/reject', authenticateToken, async (req, res) => {
  try {
    const { requestId, rejectionMessage } = req.body;
    const userId = req.user.id;

    // 查找好友请求
    const request = await FriendRequest.findByPk(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: '好友请求不存在'
      });
    }

    // 检查是否是接收方
    if (request.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权处理此请求'
      });
    }

    // 更新请求状态和拒绝留言
    request.status = 'rejected';
    request.rejectionMessage = rejectionMessage;
    await request.save();

    res.json({
      success: true,
      message: strings.success.friendRequestRejected
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

app.get('/api/friends/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查找所有接受的好友请求
    const acceptedRequests = await FriendRequest.findAll({
      where: {
        [Sequelize.Op.or]: [{
          senderId: userId,
          status: 'accepted'
        }, {
          receiverId: userId,
          status: 'accepted'
        }]
      },
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'username', 'nickname', 'avatar']
      }, {
        model: User,
        as: 'receiver',
        attributes: ['id', 'username', 'nickname', 'avatar']
      }]
    });

    // 构建好友列表
    const friends = acceptedRequests.map(request => {
      if (request.senderId === userId) {
        return {
          userId: request.receiver.id,
          username: request.receiver.username,
          nickname: request.receiver.nickname,
          avatar: request.receiver.avatar,
          online: false // 简化处理，实际应用中需要维护在线状态
        };
      } else {
        return {
          userId: request.sender.id,
          username: request.sender.username,
          nickname: request.sender.nickname,
          avatar: request.sender.avatar,
          online: false
        };
      }
    });

    res.json({
      success: true,
      friends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

// 聊天室 API
app.post('/api/rooms/create', authenticateToken, async (req, res) => {
  try {
    const { name, description, type, members } = req.body;
    const userId = req.user.id;

    // 创建聊天室
    const room = await Room.create({
      name,
      description,
      type,
      creatorId: userId
    });

    // 添加创建者为成员
    await RoomMember.create({
      roomId: room.id,
      userId
    });

    // 如果是群组聊天，添加其他成员
    if (type === 'group' && members && members.length > 0) {
      for (const memberId of members) {
        await RoomMember.create({
          roomId: room.id,
          userId: memberId
        });
      }
    }

    res.json({
      success: true,
      roomId: room.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

app.delete('/api/rooms/delete/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // 查找聊天室
    const room = await Room.findByPk(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: strings.errors.roomNotFound
      });
    }

    // 检查是否是创建者
    if (room.creatorId !== userId) {
      return res.status(403).json({
        success: false,
        message: strings.errors.noPermissionDeleteRoom
      });
    }

    // 删除聊天室
    await room.destroy();

    // 删除相关成员记录
    await RoomMember.destroy({
      where: {
        roomId
      }
    });

    res.json({
      success: true,
      message: strings.success.roomDeleted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

app.get('/api/rooms/list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查找用户参与的所有聊天室
    const roomMemberships = await RoomMember.findAll({
      where: {
        userId
      },
      include: [{
        model: Room,
        attributes: ['id', 'name', 'type', 'avatar']
      }]
    });

    // 构建聊天室列表
    const rooms = roomMemberships.map(membership => ({
      roomId: membership.room.id,
      name: membership.room.name,
      type: membership.room.type,
      avatar: membership.room.avatar,
      unreadCount: 0 // 简化处理，实际应用中需要计算未读消息数
    }));

    res.json({
      success: true,
      rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.serverError,
      error: error.message
    });
  }
});

// 消息 API
app.post('/api/messages/send', authenticateToken, async (req, res) => {
  try {
    const { roomId, content, type, encrypted, mentionedUsers, fileId } = req.body;
    const userId = req.user.id;

    // 检查聊天室是否存在
    const room = await Room.findByPk(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: '聊天室不存在'
      });
    }

    // 检查用户是否是聊天室成员
    const isMember = await RoomMember.findOne({
      where: {
        roomId,
        userId
      }
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: strings.errors.noPermissionSendMessage
      });
    }

    // 对于语音消息，content存储文件ID
    let messageContent = content;
    if (type === 'voice' && fileId) {
      messageContent = fileId;
    }

    // 创建消息
    const message = await Message.create({
      roomId,
      senderId: userId,
      content: messageContent,
      type,
      encrypted,
      mentionedUsers: mentionedUsers ? JSON.stringify(mentionedUsers) : null
    });

    res.json({
      success: true,
      messageId: message.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

app.get('/api/messages/history/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    // 检查聊天室是否存在
    const room = await Room.findByPk(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: '聊天室不存在'
      });
    }

    // 检查用户是否是聊天室成员
    const isMember = await RoomMember.findOne({
      where: {
        roomId,
        userId
      }
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: strings.errors.noPermissionViewMessages
      });
    }

    // 获取消息历史，对于语音消息，包含文件信息
    const messages = await Message.findAll({
      where: {
        roomId
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'nickname']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 处理语音消息，获取文件信息
    const messageIds = messages.map(msg => msg.id);
    const voiceMessages = messages.filter(msg => msg.type === 'voice');
    const fileIds = voiceMessages.map(msg => msg.content);

    let files = [];
    if (fileIds.length > 0) {
      files = await File.findAll({
        where: {
          id: fileIds
        }
      });
    }

    const fileMap = new Map();
    files.forEach(file => {
      fileMap.set(file.id, file);
    });

    // 格式化消息
    const formattedMessages = messages.map(message => {
      const baseMessage = {
        messageId: message.id,
        senderId: message.sender.id,
        senderName: message.sender.nickname || message.sender.username,
        content: message.content,
        type: message.type,
        timestamp: message.createdAt.getTime(),
        mentionedUsers: message.mentionedUsers ? JSON.parse(message.mentionedUsers) : []
      };

      // 如果是语音消息，添加文件信息
      if (message.type === 'voice') {
        const file = fileMap.get(message.content);
        if (file) {
          return {
            ...baseMessage,
            fileInfo: {
              fileId: file.id,
              filename: file.filename,
              fileUrl: `http://${req.headers.host}/uploads/${file.filename}`,
              filesize: file.filesize,
              mimetype: file.mimetype
            }
          };
        }
      }

      return baseMessage;
    }).reverse();

    res.json({
      success: true,
      messages: formattedMessages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 引入字符串常量
const strings = require('./strings.json');

// 文件传输 API
app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { roomId, fileType } = req.body;
    const userId = req.user.id;
    const file = req.file;
    const isVoiceMessage = fileType === 'voice';

    if (!file) {
      return res.status(400).json({
        success: false,
        message: strings.errors.noFileSelected
      });
    }

    // 保存文件信息到数据库
    const fileRecord = await File.create({
      filename: file.originalname,
      filepath: file.path,
      filesize: file.size,
      mimetype: file.mimetype,
      uploaderId: userId,
      roomId,
      isVoiceMessage
    });

    const fileUrl = `http://${req.headers.host}/uploads/${file.filename}`;

    // 如果是头像，更新用户信息
    if (fileType === 'avatar') {
      const user = await User.findByPk(userId);
      if (user) {
        user.avatar = fileUrl;
        await user.save();
      }
    }

    res.json({
      success: true,
      fileUrl,
      fileId: fileRecord.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

app.get('/api/files/download/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // 查找文件
    const file = await File.findByPk(fileId, {
      include: [{
        model: RoomMember,
        where: {
          userId
        }
      }]
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: strings.errors.fileNotFound
      });
    }

    // 发送文件
    res.download(file.filepath, file.filename);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// JWT 认证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({
        success: false,
        message: strings.errors.unauthorized
      });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: strings.errors.invalidToken
      });
    }

    req.user = user;
    next();
  });
}

// 获取服务器当前目录剩余空间 API
app.get('/api/server/disk-space', authenticateToken, (req, res) => {
  try {
    // 获取当前工作目录
    const currentDir = __dirname;
    const os = require('os');
    const fs = require('fs');
    
    // 根据操作系统选择不同的方法获取磁盘空间
    if (os.platform() === 'win32') {
      // Windows系统
      const drive = currentDir.substring(0, 2); // 例如 "D:"
      fs.statfs(drive, (err, stats) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: strings.errors.diskSpaceError,
            error: err.message
          });
        }
        
        // 计算空间信息
        const totalSpace = stats.bsize * stats.blocks;
        const freeSpace = stats.bsize * stats.bfree;
        const usedSpace = totalSpace - freeSpace;
        const usagePercentage = ((totalSpace - freeSpace) / totalSpace * 100).toFixed(2);
        
        res.json({
          success: true,
          drive,
          totalSpaceBytes: totalSpace,
          usedSpaceBytes: usedSpace,
          freeSpaceBytes: freeSpace,
          usagePercentage
        });
      });
    } else {
      // Unix-like系统 (Linux, macOS等)
      fs.statvfs(currentDir, (err, stats) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: strings.errors.diskSpaceError,
            error: err.message
          });
        }
        
        // 计算空间信息
        const totalSpace = stats.f_bsize * stats.f_blocks;
        const freeSpace = stats.f_bsize * stats.f_bfree;
        const usedSpace = totalSpace - freeSpace;
        const usagePercentage = ((totalSpace - freeSpace) / totalSpace * 100).toFixed(2);
        
        res.json({
          success: true,
          drive: currentDir,
          totalSpaceBytes: totalSpace,
          usedSpaceBytes: usedSpace,
          freeSpaceBytes: freeSpace,
          usagePercentage
        });
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.diskSpaceError,
      error: error.message
    });
  }
});

// 数据库查询 API
app.post('/api/server/db-query', authenticateToken, async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    // 执行原始SQL查询
    const [results, metadata] = await sequelize.query(query, {
      replacements: params,
      type: Sequelize.QueryTypes.SELECT
    });
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: strings.errors.dbQueryError,
      error: error.message
    });
  }
});

// 导出sequelize实例供其他模块使用
module.exports = { sequelize };

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});