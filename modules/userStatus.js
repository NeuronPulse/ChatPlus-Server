const User = require('./models/User');
const logger = require('./logger');
const ConfigManager = require('../config');
const config = new ConfigManager();

class UserStatusManager {
  /**
   * 更新用户在线状态
   * @param {string} userId - 用户ID
   * @param {boolean} online - 是否在线
   * @returns {Promise<void>}
   */
  static async updateUserStatus(userId, online) {
    try {
      await User.update(
        {
          online,
          lastActive: new Date()
        },
        {
          where: { id: userId }
        }
      );
      logger.info(`User ${userId} status updated to ${online ? 'online' : 'offline'}`);
    } catch (error) {
      logger.error(`Failed to update user status: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户状态
   * @param {string} userId - 用户ID
   * @returns {Promise<{online: boolean, lastActive: Date|null}>}
   */
  static async getUserStatus(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: ['online', 'lastActive']
      });

      if (!user) {
        throw new Error(config.get('errors.userNotFoundGetStatus'));
      }

      return {
        online: user.online,
        lastActive: user.lastActive
      };
    } catch (error) {
      logger.error(`Failed to get user status: ${error.message}`);
      throw error;
    }
  }

  /**
   * 设置用户自定义状态消息
   * @param {string} userId - 用户ID
   * @param {string} statusMessage - 自定义状态消息
   * @returns {Promise<void>}
   */
  static async setCustomStatus(userId, statusMessage) {
    try {
      // 首先检查用户是否存在
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error(config.get('errors.userNotFoundSetStatus'));
      }

      // 这里我们假设将来会添加一个statusMessage字段
      // 目前我们可以将其存储在nickname字段中作为临时解决方案
      await User.update(
        {
          nickname: statusMessage
        },
        {
          where: { id: userId }
        }
      );

      logger.info(`User ${userId} custom status updated`);
    } catch (error) {
      logger.error(`Failed to set custom status: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UserStatusManager;