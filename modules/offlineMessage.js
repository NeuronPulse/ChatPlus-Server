const Message = require('./models/Message');
const MessageReadStatus = require('./models/MessageReadStatus');
const User = require('./models/User');
const RoomMember = require('./models/RoomMember');
const logger = require('./logger');
const messageReadStatusManager = require('./messageReadStatus');

class OfflineMessageManager {
  /**
   * 存储离线消息
   * @param {string} senderId - 发送者ID
   * @param {string} roomId - 房间ID
   * @param {string} content - 消息内容
   * @param {string} type - 消息类型
   * @param {boolean} encrypted - 是否加密
   * @param {string[]} mentionedUsers - 提及的用户
   * @returns {Promise<{message: Object, offlineUsers: string[]}>}
   */
  static async storeOfflineMessage(senderId, roomId, content, type = 'text', encrypted = false, mentionedUsers = []) {
    try {
      // 创建消息
      const message = await Message.create({
        senderId,
        roomId,
        content,
        type,
        encrypted,
        mentionedUsers
      });

      // 获取房间内所有成员
      const roomMembers = await RoomMember.findAll({
        where: {
          roomId
        },
        attributes: ['userId']
      });

      const memberIds = roomMembers.map(member => member.userId);
      // 排除发送者
      const recipientIds = memberIds.filter(id => id !== senderId);

      // 获取在线用户
      const onlineUsers = await User.findAll({
        where: {
          id: recipientIds,
          online: true
        },
        attributes: ['id']
      });

      const onlineUserIds = onlineUsers.map(user => user.id);
      const offlineUserIds = recipientIds.filter(id => !onlineUserIds.includes(id));

      // 为在线用户设置消息状态为delivered
      if (onlineUserIds.length > 0) {
        await messageReadStatusManager.createMessageStatuses(
          message.id,
          onlineUserIds,
          'delivered'
        );
      }

      // 为离线用户设置消息状态为sent
      if (offlineUserIds.length > 0) {
        await messageReadStatusManager.createMessageStatuses(
          message.id,
          offlineUserIds,
          'sent'
        );
        logger.info(`Stored offline message ${message.id} for ${offlineUserIds.length} users`);
      }

      return {
        message,
        offlineUsers: offlineUserIds
      };
    } catch (error) {
      logger.error(`Failed to store offline message: ${error.message}`);
      throw error;
    }
  }

  /**
   * 推送离线消息给上线用户
   * @param {string} userId - 用户ID
   * @returns {Promise<Message[]>}
   */
  static async pushOfflineMessages(userId) {
    try {
      // 获取用户未读消息
      const unreadStatuses = await MessageReadStatus.findAll({
        where: {
          userId,
          status: 'sent'
        },
        include: [{
          model: Message,
          as: 'message'
        }],
        order: [[{ model: Message, as: 'message' }, 'createdAt', 'ASC']]
      });

      const unreadMessages = unreadStatuses.map(status => status.message);

      // 更新消息状态为delivered
      const messageIds = unreadStatuses.map(status => status.messageId);
      for (const messageId of messageIds) {
        await messageReadStatusManager.updateMessageStatus(
          messageId,
          userId,
          'delivered'
        );
      }

      logger.info(`Pushed ${unreadMessages.length} offline messages to user ${userId}`);
      return unreadMessages;
    } catch (error) {
      logger.error(`Failed to push offline messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户各房间的未读消息计数
   * @param {string} userId - 用户ID
   * @returns {Promise<object>} 键为房间ID，值为未读消息数的对象
   */
  static async getUnreadCountByRoom(userId) {
    try {
      const unreadStatuses = await MessageReadStatus.findAll({
        where: {
          userId,
          status: 'sent'
        },
        include: [{
          model: Message,
          as: 'message',
          attributes: ['roomId']
        }]
      });

      const countByRoom = {};
      unreadStatuses.forEach(status => {
        const roomId = status.message.roomId;
        if (!countByRoom[roomId]) {
          countByRoom[roomId] = 0;
        }
        countByRoom[roomId]++;
      });

      return countByRoom;
    } catch (error) {
      logger.error(`Failed to get unread count by room: ${error.message}`);
      throw error;
    }
  }
}

module.exports = OfflineMessageManager;