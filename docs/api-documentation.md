# ChatPlus 聊天服务端 API 文档

## 基础信息
- 服务器地址: `http://localhost:3000`
- 认证方式: JWT (JSON Web Token)
- 所有请求需要设置请求头: `Authorization: Bearer <token>` (登录和注册接口除外)
- 响应格式: JSON
- 错误处理: 所有错误响应包含 `success: false` 和 `message` 字段

## API 端点

### 健康检查

#### 获取服务器状态
```
GET /health
```
- 描述: 检查服务器是否正常运行
- 认证: 不需要
- 响应:
  ```json
  {
    "status": "ok",
    "message": "Server is running"
  }
  ```

### 插件管理

#### 获取所有插件
```
GET /plugins
```
- 描述: 获取所有已安装的插件列表
- 认证: 不需要
- 响应:
  ```json
  {
    "success": true,
    "data": [
      {
        "name": "插件名称",
        "version": "插件版本",
        "description": "插件描述",
        "active": true
      }
    ]
  }
  ```

#### 获取插件详情
```
GET /plugins/:name
```
- 描述: 获取指定插件的详细信息
- 认证: 不需要
- 参数:
  - `name`: 插件名称
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "name": "插件名称",
      "version": "插件版本",
      "description": "插件描述",
      "active": true,
      "metadata": {}
    }
  }
  ```

### 用户管理

#### 注册用户
```
POST /auth/register
```
- 描述: 注册新用户
- 认证: 不需要
- 请求体:
  ```json
  {
    "username": "用户名",
    "password": "密码",
    "email": "邮箱"
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "用户ID",
      "username": "用户名",
      "email": "邮箱",
      "token": "JWT令牌"
    }
  }
  ```

#### 用户登录
```
POST /auth/login
```
- 描述: 用户登录
- 认证: 不需要
- 请求体:
  ```json
  {
    "username": "用户名",
    "password": "密码"
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "用户ID",
      "username": "用户名",
      "email": "邮箱",
      "token": "JWT令牌"
    }
  }
  ```

#### 获取当前用户信息
```
GET /auth/me
```
- 描述: 获取当前登录用户的信息
- 认证: 需要
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "用户ID",
      "username": "用户名",
      "email": "邮箱",
      "nickname": "昵称",
      "avatar": "头像URL",
      "status": "用户状态",
      "statusMessage": "自定义状态消息"
    }
  }
  ```

#### 更新用户信息
```
PUT /users/:id
```
- 描述: 更新用户信息
- 认证: 需要
- 参数:
  - `id`: 用户ID
- 请求体:
  ```json
  {
    "nickname": "昵称",
    "avatar": "头像URL",
    "statusMessage": "自定义状态消息"
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "用户ID",
      "username": "用户名",
      "email": "邮箱",
      "nickname": "昵称",
      "avatar": "头像URL",
      "statusMessage": "自定义状态消息"
    }
  }
  ```

### 好友管理

#### 发送好友请求
```
POST /friends/request
```
- 描述: 发送好友请求
- 认证: 需要
- 请求体:
  ```json
  {
    "recipientId": "接收者ID",
    "message": "请求消息"
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "请求ID",
      "senderId": "发送者ID",
      "recipientId": "接收者ID",
      "message": "请求消息",
      "status": "pending",
      "createdAt": "创建时间"
    }
  }
  ```

#### 获取好友请求
```
GET /friends/requests?type=sent|received
```
- 描述: 获取好友请求列表
- 认证: 需要
- 参数:
  - `type`: 可选，请求类型(sent/received)，默认为received
- 响应:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "请求ID",
        "senderId": "发送者ID",
        "recipientId": "接收者ID",
        "message": "请求消息",
        "status": "pending|accepted|rejected",
        "createdAt": "创建时间",
        "sender": {
          "id": "发送者ID",
          "username": "发送者用户名",
          "nickname": "发送者昵称",
          "avatar": "发送者头像"
        },
        "recipient": {
          "id": "接收者ID",
          "username": "接收者用户名",
          "nickname": "接收者昵称",
          "avatar": "接收者头像"
        }
      }
    ]
  }
  ```

#### 处理好友请求
```
PUT /friends/request/:id
```
- 描述: 接受或拒绝好友请求
- 认证: 需要
- 参数:
  - `id`: 请求ID
- 请求体:
  ```json
  {
    "status": "accepted|rejected"
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "请求ID",
      "status": "accepted|rejected"
    }
  }
  ```

#### 获取好友列表
```
GET /friends
```
- 描述: 获取好友列表
- 认证: 需要
- 响应:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "好友ID",
        "username": "好友用户名",
        "nickname": "好友昵称",
        "avatar": "好友头像",
        "status": "在线状态",
        "lastActive": "最后活动时间",
        "roomId": "聊天房间ID"
      }
    ]
  }
  ```

#### 删除好友
```
DELETE /friends/:id
```
- 描述: 删除好友
- 认证: 需要
- 参数:
  - `id`: 好友ID
- 响应:
  ```json
  {
    "success": true,
    "message": "好友已删除"
  }
  ```

### 设备管理

#### 注册设备
```
POST /devices/register
```
- 描述: 注册用户设备
- 认证: 需要
- 请求体:
  ```json
  {
    "deviceId": "设备唯一标识",
    "deviceName": "设备名称",
    "deviceType": "设备类型(web, mobile, desktop)",
    "fcmToken": "FCM令牌(可选)"
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "设备ID",
      "deviceId": "设备唯一标识",
      "deviceName": "设备名称",
      "deviceType": "设备类型",
      "lastActive": "最后活动时间",
      "isActive": true
    }
  }
  ```

#### 获取设备列表
```
GET /devices
```
- 描述: 获取用户设备列表
- 认证: 需要
- 响应:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "设备ID",
        "deviceId": "设备唯一标识",
        "deviceName": "设备名称",
        "deviceType": "设备类型",
        "lastActive": "最后活动时间",
        "isActive": true
      }
    ]
  }
  ```

#### 删除设备
```
DELETE /devices/:id
```
- 描述: 删除用户设备
- 认证: 需要
- 参数:
  - `id`: 设备ID
- 响应:
  ```json
  {
    "success": true,
    "message": "设备已删除"
  }
  ```

### 群组管理

#### 创建群组
```
POST /rooms
```
- 描述: 创建群组
- 认证: 需要
- 请求体:
  ```json
  {
    "name": "群组名称",
    "description": "群组描述",
    "avatar": "群组头像URL",
    "memberIds": ["成员ID1", "成员ID2", ...]
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "群组ID",
      "name": "群组名称",
      "description": "群组描述",
      "avatar": "群组头像URL",
      "creatorId": "创建者ID",
      "createdAt": "创建时间",
      "members": [
        {
          "id": "成员ID",
          "username": "成员用户名",
          "nickname": "成员昵称",
          "avatar": "成员头像",
          "role": "owner|admin|member"
        }
      ]
    }
  }
  ```

#### 获取群组列表
```
GET /rooms
```
- 描述: 获取群组列表
- 认证: 需要
- 响应:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "群组ID",
        "name": "群组名称",
        "description": "群组描述",
        "avatar": "群组头像URL",
        "creatorId": "创建者ID",
        "createdAt": "创建时间",
        "unreadCount": 0,
        "lastMessage": {
          "id": "消息ID",
          "content": "消息内容",
          "type": "消息类型",
          "senderId": "发送者ID",
          "createdAt": "创建时间"
        }
      }
    ]
  }
  ```

#### 获取群组详情
```
GET /rooms/:id
```
- 描述: 获取群组详情
- 认证: 需要
- 参数:
  - `id`: 群组ID
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "群组ID",
      "name": "群组名称",
      "description": "群组描述",
      "avatar": "群组头像URL",
      "creatorId": "创建者ID",
      "createdAt": "创建时间",
      "members": [
        {
          "id": "成员ID",
          "username": "成员用户名",
          "nickname": "成员昵称",
          "avatar": "成员头像",
          "role": "owner|admin|member"
        }
      ]
    }
  }
  ```

#### 添加群成员
```
POST /rooms/:id/members
```
- 描述: 添加群成员
- 认证: 需要（管理员或群主）
- 参数:
  - `id`: 群组ID
- 请求体:
  ```json
  {
    "memberIds": ["成员ID1", "成员ID2", ...]
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "roomId": "群组ID",
      "addedMembers": ["成员ID1", "成员ID2", ...]
    }
  }
  ```

#### 移除群成员
```
DELETE /rooms/:id/members/:userId
```
- 描述: 移除群成员
- 认证: 需要（管理员或群主）
- 参数:
  - `id`: 群组ID
  - `userId`: 成员ID
- 响应:
  ```json
  {
    "success": true,
    "message": "成员已移除"
  }
  ```

### 消息管理

#### 获取房间消息
```
GET /messages/room/:roomId?since=timestamp&limit=100
```
- 描述: 获取指定房间的消息
- 认证: 需要
- 参数:
  - `roomId`: 房间ID
  - `since`: 可选，时间戳，用于获取该时间之后的消息
  - `limit`: 可选，消息数量限制，默认100
- 响应:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "消息ID",
        "content": "消息内容",
        "type": "消息类型",
        "senderId": "发送者ID",
        "roomId": "房间ID",
        "createdAt": "创建时间",
        "updatedAt": "更新时间",
        "isRecalled": false,
        "sender": {
          "id": "发送者ID",
          "username": "发送者用户名",
          "nickname": "发送者昵称",
          "avatar": "发送者头像"
        }
      }
    ]
  }
  ```

#### 发送消息
```
POST /messages/send
```
- 描述: 发送消息到指定房间
- 认证: 需要
- 请求体:
  ```json
  {
    "roomId": "房间ID",
    "content": "消息内容",
    "type": "消息类型(text, image, file, voice)"
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "消息ID",
      "content": "消息内容",
      "type": "消息类型",
      "senderId": "发送者ID",
      "roomId": "房间ID",
      "createdAt": "创建时间",
      "updatedAt": "更新时间",
      "isRecalled": false
    }
  }
  ```

#### 编辑消息
```
PUT /messages/:id
```
- 描述: 编辑消息
- 认证: 需要（消息发送者）
- 参数:
  - `id`: 消息ID
- 请求体:
  ```json
  {
    "content": "新的消息内容"
  }
  ```
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "消息ID",
      "content": "新的消息内容",
      "updatedAt": "更新时间"
    }
  }
  ```

#### 撤回消息
```
DELETE /messages/:id
```
- 描述: 撤回消息
- 认证: 需要（消息发送者）
- 参数:
  - `id`: 消息ID
- 响应:
  ```json
  {
    "success": true,
    "message": "消息已撤回"
  }
  ```

#### 标记消息为已读
```
PUT /messages/:id/read
```
- 描述: 标记消息为已读
- 认证: 需要
- 参数:
  - `id`: 消息ID
- 响应:
  ```json
  {
    "success": true,
    "message": "消息已标记为已读"
  }
  ```

### 文件管理

#### 上传文件
```
POST /files/upload
```
- 描述: 上传文件
- 认证: 需要
- 请求体: Form Data
  - `file`: 要上传的文件
  - `roomId`: 房间ID
  - `type`: 文件类型(image, file, voice)
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "文件ID",
      "name": "文件名",
      "size": 文件大小,
      "type": "文件类型",
      "url": "文件下载URL",
      "thumbnailUrl": "缩略图URL(图片类型才有)",
      "roomId": "房间ID",
      "uploaderId": "上传者ID",
      "uploadedAt": "上传时间"
    }
  }
  ```

#### 下载文件
```
GET /files/:id
```
- 描述: 下载文件
- 认证: 需要
- 参数:
  - `id`: 文件ID
- 响应: 文件流

#### 获取文件信息
```
GET /files/info/:id
```
- 描述: 获取文件信息
- 认证: 需要
- 参数:
  - `id`: 文件ID
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "id": "文件ID",
      "name": "文件名",
      "size": 文件大小,
      "type": "文件类型",
      "url": "文件下载URL",
      "thumbnailUrl": "缩略图URL(图片类型才有)",
      "roomId": "房间ID",
      "uploaderId": "上传者ID",
      "uploadedAt": "上传时间"
    }
  }
  ```

## 错误代码

- `400`: 请求参数错误
- `401`: 未授权
- `403`: 权限不足
- `404`: 资源不存在
- `409`: 冲突
- `429`: 请求频率过高
- `500`: 服务器内部错误
- `503`: 服务不可用