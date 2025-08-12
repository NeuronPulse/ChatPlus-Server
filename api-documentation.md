# ChatPlus 聊天服务端 API 文档

## 基础信息
- 服务器地址: `http://localhost:3000`
- 认证方式: JWT (JSON Web Token)
- 所有请求需要设置请求头: `Authorization: Bearer <token>` (登录和注册接口除外)

## 1. 密钥管理 API

### 1.1 获取公钥
- **URL**: `/api/keys/public`
- **方法**: `GET`
- **描述**: 获取服务器公钥，用于端到端加密
- **请求参数**: 无
- **响应**: 
  ```json
  {
    "success": true,
    "publicKey": "-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----"
  }
  ```

### 1.2 上传用户公钥
- **URL**: `/api/keys/upload`
- **方法**: `POST`
- **描述**: 上传用户公钥，用于端到端加密通信
- **请求体**: 
  ```json
  {
    "publicKey": "-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----"
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "message": "公钥上传成功"
  }
  ```

## 2. 用户认证 API

### 2.1 用户注册
- **URL**: `/api/auth/register`
- **方法**: `POST`
- **描述**: 注册新用户
- **请求体**: 
  ```json
  {
    "username": "example",
    "password": "password123",
    "email": "example@example.com",
    "nickname": "示例用户"
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "message": "注册成功",
    "userId": "user123"
  }
  ```

### 2.2 用户登录
- **URL**: `/api/auth/login`
- **方法**: `POST`
- **描述**: 用户登录
- **请求体**: 
  ```json
  {
    "username": "example",
    "password": "password123"
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "token": "jwt-token-here",
    "userInfo": {
      "userId": "user123",
      "username": "example",
      "nickname": "示例用户",
      "avatar": "avatar-url"
    }
  }
  ```

## 3. 用户关系 API

### 3.1 发送好友请求
- **URL**: `/api/friends/request`
- **方法**: `POST`
- **描述**: 发送好友请求
- **请求体**: 
  ```json
  {
    "targetUserId": "user456",
    "message": "我想添加你为好友"
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "message": "好友请求已发送"
  }
  ```

### 3.2 接受好友请求
- **URL**: `/api/friends/accept`
- **方法**: `POST`
- **描述**: 接受好友请求
- **请求体**: 
  ```json
  {
    "requestId": "req789"
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "message": "好友请求已接受"
  }
  ```

### 3.3 拒绝好友请求
- **URL**: `/api/friends/reject`
- **方法**: `POST`
- **描述**: 拒绝好友请求
- **请求体**: 
  ```json
  {
    "requestId": "req789",
    "rejectionMessage": "抱歉，我不认识你"
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "message": "好友请求已拒绝"
  }
  ```

### 3.3 获取好友列表
- **URL**: `/api/friends/list`
- **方法**: `GET`
- **描述**: 获取好友列表
- **请求参数**: 无
- **响应**: 
  ```json
  {
    "success": true,
    "friends": [
      {
        "userId": "user456",
        "username": "friend1",
        "nickname": "好友1",
        "avatar": "avatar-url",
        "online": true
      }
    ]
  }
  ```

## 4. 聊天室 API

### 4.1 创建聊天室
- **URL**: `/api/rooms/create`
- **方法**: `POST`
- **描述**: 创建聊天室
- **请求体**: 
  ```json
  {
    "name": "我的聊天室",
    "description": "这是一个测试聊天室",
    "type": "group", // group 或 private
    "members": ["user456", "user789"] // 仅 group 类型需要
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "roomId": "room123"
  }
  ```

### 4.2 删除聊天室
- **URL**: `/api/rooms/delete/:roomId`
- **方法**: `DELETE`
- **描述**: 删除聊天室
- **请求参数**: 
  - `roomId`: 聊天室 ID
- **响应**: 
  ```json
  {
    "success": true,
    "message": "聊天室已删除"
  }
  ```

### 4.3 获取聊天室列表
- **URL**: `/api/rooms/list`
- **方法**: `GET`
- **描述**: 获取聊天室列表
- **请求参数**: 无
- **响应**: 
  ```json
  {
    "success": true,
    "rooms": [
      {
        "roomId": "room123",
        "name": "我的聊天室",
        "type": "group",
        "avatar": "room-avatar-url",
        "unreadCount": 5
      }
    ]
  }
  ```

## 5. 消息 API

### 5.1 发送消息
- **URL**: `/api/messages/send`
- **方法**: `POST`
- **描述**: 发送消息
- **请求体**: 
  ```json
  {
    "roomId": "room123",
    "content": "Hello World",
    "type": "text", // text, image, file, voice
    "encrypted": true, // 是否加密
    "mentionedUsers": ["user456"] // @的用户
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "messageId": "msg789"
  }
  ```

### 5.2 获取消息历史
- **URL**: `/api/messages/history/:roomId`
- **方法**: `GET`
- **描述**: 获取消息历史
- **请求参数**: 
  - `roomId`: 聊天室 ID
  - `limit`: 消息数量限制 (默认 20)
  - `offset`: 偏移量 (默认 0)
- **响应**: 
  ```json
  {
    "success": true,
    "messages": [
      {
        "messageId": "msg789",
        "senderId": "user123",
        "senderName": "示例用户",
        "content": "Hello World",
        "type": "text",
        "timestamp": 1623456789000,
        "mentionedUsers": ["user456"]
      },
      {
        "messageId": "msg456",
        "senderId": "user123",
        "senderName": "示例用户",
        "content": "file123", // 语音消息的content为文件ID
        "type": "voice",
        "timestamp": 1623456790000,
        "mentionedUsers": [],
        "fileInfo": {
          "fileId": "file123",
          "filename": "voice_message.mp3",
          "fileUrl": "http://localhost:3000/uploads/voice_message.mp3",
          "filesize": 102400,
          "mimetype": "audio/mpeg"
        }
      }
    ]
  }
  ```

## 6. 文件传输 API

### 6.1 上传文件
- **URL**: `/api/files/upload`
- **方法**: `POST`
- **描述**: 上传文件
- **请求体**: `multipart/form-data`
  - `file`: 要上传的文件
  - `roomId`: 聊天室 ID (可选)
  - `fileType`: 文件类型 (可选，可取值 'avatar' 表示头像，'voice' 表示语音消息)
- **响应**: 
  ```json
  {
    "success": true,
    "fileUrl": "http://localhost:3000/uploads/file123.jpg",
    "fileId": "file123"
  }
  ```

> 注意: 当 `fileType` 设为 'avatar' 时，服务器会自动更新用户的头像信息

### 6.2 下载文件
- **URL**: `/api/files/download/:fileId`
- **方法**: `GET`
- **描述**: 下载文件
- **请求参数**: 
  - `fileId`: 文件 ID
- **响应**: 文件流

## 8. 语音消息发送逻辑

### 8.1 语音消息发送流程
1. 客户端录制音频文件
2. 客户端调用文件上传API (`/api/files/upload`)，并设置`fileType='voice'`参数
3. 服务端返回文件ID和文件URL
4. 客户端调用消息发送API (`/api/messages/send`)，设置`type=voice`，并将`fileId`作为`content`参数的值
5. 服务端存储消息，并关联到对应的语音文件

### 8.2 语音消息接收流程
1. 客户端调用消息历史API (`/api/messages/history/:roomId`)
2. 服务端返回消息列表，对于语音消息，会包含`fileInfo`字段
3. 客户端通过`fileInfo.fileUrl`下载语音文件并播放

### 8.3 数据格式要求
- 音频格式: 建议使用MP3或WAV格式
- 音频质量: 建议比特率不超过128kbps，采样率44.1kHz
- 文件大小: 建议单个语音消息文件不超过10MB

## 7. 服务器管理 API

### 7.1 获取服务器当前目录剩余空间
- **URL**: `/api/server/disk-space`
- **方法**: `GET`
- **描述**: 获取服务器当前目录所在磁盘的剩余空间信息（以字节为单位，跨平台通用实现）
- **请求参数**: 无
- **响应**: 
  ```json
  {
    "success": true,
    "drive": "D:", // Windows系统返回驱动器号，Unix-like系统返回目录路径
    "totalSpaceBytes": 107374182400,
    "usedSpaceBytes": 53687091200,
    "freeSpaceBytes": 53687091200,
    "usagePercentage": "50.00"
  }
  ```

### 7.2 数据库查询
- **URL**: `/api/server/db-query`
- **方法**: `POST`
- **描述**: 执行原始SQL查询（谨慎使用，建议仅用于调试）
- **请求体**: 
  ```json
  {
    "query": "SELECT * FROM Users WHERE id = :id",
    "params": ["user123"]
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "results": [
      {
        "id": "user123",
        "username": "example",
        "email": "example@example.com",
        "nickname": "示例用户",
        "createdAt": "2023-06-12T10:00:00.000Z",
        "updatedAt": "2023-06-12T10:00:00.000Z"
      }
    ]
  }
  ```

## 错误码说明

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |