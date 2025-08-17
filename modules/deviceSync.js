const { Op } = require('sequelize');
const Device = require('./models/Device');
const User = require('./models/User');
const Message = require('./models/Message');
const MessageReadStatus = require('./models/MessageReadStatus');
const RoomMember = require('./models/RoomMember');
const logger = require('./logger');
const ConfigManager = require('../config');
const config = new ConfigManager();

class DeviceSyncManager {
  /**
   * 注册设备
   * @param {string} userId - 用户ID
   * @param {string} deviceId - 设备唯一标识
   * @param {string} deviceName - 设备名称
   * @param {string} deviceType - 设备类型(web, mobile, desktop)
   * @param {string} fcmToken - FCM令牌(可选)
   * @returns {Promise<Device>}
   */
  static async registerDevice(userId, deviceId, deviceName, deviceType = 'web', fcmToken = null) {
    try {
      // 查找或创建设备
      const [device, created] = await Device.findOrCreate({
        where: {
          userId,
          deviceId
        },
        defaults: {
          deviceName,
          deviceType,
          fcmToken,
          lastActive: new Date(),
          isActive: true
        }
      });

      // 如果设备已存在，更新信息
      if (!created) {
        await device.update({
          deviceName,
          deviceType,
          fcmToken,
          lastActive: new Date(),
          isActive: true
        });
      }

      logger.info(`Device ${deviceId} registered for user ${userId}`);
      return device;
    } catch (error) {
      logger.error(`Failed to register device: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新设备状态
   * @param {string} deviceId - 设备ID
   * @param {boolean} isActive - 是否激活
   * @returns {Promise<void>}
   */
  static async updateDeviceStatus(deviceId, isActive) {
    try {
      await Device.update(
        {
          isActive,
          lastActive: isActive ? new Date() : null
        },
        {
          where: {
            deviceId
          }
        }
      );

      logger.info(`Device ${deviceId} status updated to ${isActive ? 'active' : 'inactive'}`);
    } catch (error) {
      logger.error(`Failed to update device status: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取用户所有设备
   * @param {string} userId - 用户ID
   * @returns {Promise<Device[]>}
   */
  static async getUserDevices(userId) {
    try {
      const devices = await Device.findAll({
        where: {
          userId
        },
        order: [['lastActive', 'DESC']]
      });

      return devices;
    } catch (error) {
      logger.error(`Failed to get user devices: ${error.message}`);
      throw error;
    }
  }

  /**
   * 同步消息到所有设备
   * @param {string} userId - 用户ID
   * @param {string} messageId - 消息ID
   * @returns {Promise<void>}
   */
  static async syncMessageToDevices(userId, messageId) {
    try {
      // 获取用户活跃设备
      const activeDevices = await Device.findAll({
        where: {
          userId,
          isActive: true
        }
      });

      // 这里应该实现消息推送逻辑，例如通过WebSocket或FCM
      // 为简化示例，我们只记录日志
      logger.info(`Sync message ${messageId} to ${activeDevices.length} devices for user ${userId}`);

      // 在实际应用中，这里会调用推送服务
      // for (const device of activeDevices) {
      //   if (device.fcmToken) {
      //     await pushToDevice(device.fcmToken, { type: 'new_message', messageId });
      //   }
      // }
    } catch (error) {
      logger.error(`Failed to sync message to devices: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取自特定时间以来的消息
   * @param {string} userId - 用户ID
   * @param {string} roomId - 房间ID
   * @param {Date} since - 起始时间
   * @returns {Promise<Message[]>}
   */
  static async getMessagesSince(userId, roomId, since) {
    try {
      // 检查用户是否是房间成员
      const isMember = await RoomMember.findOne({
        where: {
          roomId,
          userId
        }
      });

      if (!isMember) {
        throw new Error(config.get('errors.noPermissionViewMessages'));
      }

      // 获取指定时间后的消息
      const messages = await Message.findAll({
        where: {
          roomId,
          createdAt: {
            [Op.gt]: since
          }
        },
        include: [{ model: User, attributes: ['id', 'username', 'nickname'] }],
        order: [['createdAt', 'ASC']]
      });

      return messages;
    } catch (error) {
      logger.error(`Failed to get messages since ${since}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 登出所有其他设备
   * @param {string} userId - 用户ID
   * @param {string} currentDeviceId - 当前设备ID
   * @returns {Promise<void>}
   */
  static async logoutOtherDevices(userId, currentDeviceId) {
    try {
      await Device.update(
        {
          isActive: false
        },
        {
          where: {
            userId,
            deviceId: {
              [Op.ne]: currentDeviceId
            }
          }
        }
      );

      logger.info(`User ${userId} logged out from all devices except ${currentDeviceId}`);
    } catch (error) {
      logger.error(`Failed to logout other devices: ${error.message}`);
      throw error;
    }
  }
}

module.exports = DeviceSyncManager;