const User = require('./models/User');
const logger = require('./logger');
const MessageReadStatus = require('./models/MessageReadStatus');

class MessageReadStatusManager {
  /**
   * 创建消息状态记录
   * @param {string} messageId - 消息ID
   * @param {string[]} userIds - 用户ID数组
   * @param {string} status - 状态(sent, delivered, read)
   * @returns {Promise<void>}
   */
  static async createMessageStatuses(messageId, userIds, status = 'sent') {
    try {
      const promises = userIds.map(userId => {
        return MessageReadStatus.create({
          messageId,
          userId,
          status,
          readAt: status === 'read' ? new Date() : null
        });
      });

      await Promise.all(promises);
      logger.info(`Created ${userIds.length} message status records for message ${messageId}`);
    } catch (error) {
      logger.error(`Failed to create message statuses: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新消息状态
   * @param {string} messageId - 消息ID
   * @param {string} userId - 用户ID
   * @param {string} status - 状态(sent, delivered, read)
   * @returns {Promise<void>}
   */
  static async updateMessageStatus(messageId, userId, status) {
    try {
      const updateData = {
        status
      };

      if (status === 'read') {
        updateData.readAt = new Date();
      }

      await MessageReadStatus.update(updateData, {
        where: {
          messageId,
          userId
        }
      });

      logger.info(`Updated message ${messageId} status to ${status} for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to update message status: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取消息的已读状态
   * @param {string} messageId - 消息ID
   * @returns {Promise<{total: number, read: number, delivered: number, sent: number}>}
   */
  static async getMessageReadStats(messageId) {
    try {
      const statuses = await MessageReadStatus.findAll({
        where: {
          messageId
        },
        attributes: ['status']
      });

      const stats = {
        total: statuses.length,
        read: 0,
        delivered: 0,
        sent: 0
      };

      statuses.forEach(status => {
        stats[status.status]++;
      });

      return stats;
    } catch (error) {
      logger.error(`Failed to get message read stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户未读消息数量
   * @param {string} userId - 用户ID
   * @returns {Promise<number>}
   */
  static async getUnreadMessageCount(userId) {
    try {
      const count = await MessageReadStatus.count({
        where: {
          userId,
          status: 'sent'
        }
      });

      return count;
    } catch (error) {
      logger.error(`Failed to get unread message count: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MessageReadStatusManager;