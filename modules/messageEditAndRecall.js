const Message = require('./models/Message');
const RoomMember = require('./models/RoomMember');
const logger = require('./logger');
const ConfigManager = require('../config');
const config = new ConfigManager();

class MessageEditAndRecallManager {
  /**
   * 撤回消息
   * @param {string} messageId - 消息ID
   * @param {string} userId - 操作用户ID
   * @returns {Promise<boolean>}
   */
  static async recallMessage(messageId, userId) {
    try {
      // 查找消息
      const message = await Message.findByPk(messageId);

      if (!message) {
        throw new Error(config.get('errors.messageNotFound'));
      }

      // 检查是否为消息发送者
      if (message.senderId !== userId) {
        // 检查是否为群组管理员
        const roomMember = await RoomMember.findOne({
          where: {
            roomId: message.roomId,
            userId
          }
        });

        if (!roomMember || !['owner', 'admin'].includes(roomMember.role)) {
          throw new Error(config.get('errors.noPermissionRecallMessage'));
        }
      }

      // 标记消息为已撤回
      await message.update({
        isRecalled: true,
        recalledAt: new Date()
      });

      logger.info(`Message ${messageId} recalled by user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to recall message: ${error.message}`);
      throw error;
    }
  }

  /**
   * 编辑消息
   * @param {string} messageId - 消息ID
   * @param {string} userId - 操作用户ID
   * @param {string} newContent - 新内容
   * @returns {Promise<boolean>}
   */
  static async editMessage(messageId, userId, newContent) {
    try {
      // 查找消息
      const message = await Message.findByPk(messageId);

      if (!message) {
        throw new Error(config.get('errors.messageNotFound'));
      }

      // 检查是否为消息发送者
      if (message.senderId !== userId) {
        throw new Error(config.get('errors.noPermissionEditMessage'));
      }

      // 检查消息是否已被撤回
      if (message.isRecalled) {
        throw new Error(config.get('errors.cannotEditRecalledMessage'));
      }

      // 如果是首次编辑，保存原始内容
      if (!message.originalContent) {
        await message.update({
          originalContent: message.content,
          content: newContent,
          editedAt: new Date()
        });
      } else {
        await message.update({
          content: newContent,
          editedAt: new Date()
        });
      }

      logger.info(`Message ${messageId} edited by user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to edit message: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取消息编辑历史
   * @param {string} messageId - 消息ID
   * @param {string} userId - 请求用户ID
   * @returns {Promise<{originalContent: string, editedAt: Date|null}>}
   */
  static async getMessageEditHistory(messageId, userId) {
    try {
      // 查找消息
      const message = await Message.findByPk(messageId, {
        attributes: ['originalContent', 'editedAt', 'roomId', 'senderId']
      });

      if (!message) {
        throw new Error(config.get('errors.messageNotFound'));
      }

      // 检查用户是否有权限查看
      if (message.senderId !== userId) {
        // 检查是否为聊天室成员
        const isMember = await RoomMember.findOne({
          where: {
            roomId: message.roomId,
            userId
          }
        });

        if (!isMember) {
          throw new Error(config.get('errors.noPermissionViewMessage'));
        }
      }

      return {
        originalContent: message.originalContent,
        editedAt: message.editedAt
      };
    } catch (error) {
      logger.error(`Failed to get message edit history: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MessageEditAndRecallManager;