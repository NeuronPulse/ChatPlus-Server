const Room = require('./models/Room');
const RoomMember = require('./models/RoomMember');
const User = require('./models/User');
const logger = require('./logger');

const ConfigManager = require('../config');
const config = new ConfigManager();

class GroupChatManager {
  /**
   * 创建群组
   * @param {string} creatorId - 创建者ID
   * @param {string} name - 群组名称
   * @param {string} description - 群组描述
   * @param {string[]} memberIds - 成员ID数组
   * @param {string} avatar - 群组头像
   * @returns {Promise<Room>}
   */
  static async createGroup(creatorId, name, description = '', memberIds = [], avatar = null) {
    try {
      // 事务处理
      const result = await Room.sequelize.transaction(async (t) => {
        // 创建群组
        const group = await Room.create({
          name,
          description,
          type: 'group',
          avatar,
          creatorId
        }, { transaction: t });

        // 添加创建者为成员
        await RoomMember.create({
          roomId: group.id,
          userId: creatorId,
          role: 'owner'
        }, { transaction: t });

        // 添加其他成员
        if (memberIds.length > 0) {
          const memberPromises = memberIds
            .filter(id => id !== creatorId) // 排除创建者
            .map(userId => {
              return RoomMember.create({
                roomId: group.id,
                userId,
                role: 'member'
              }, { transaction: t });
            });

          await Promise.all(memberPromises);
        }

        // 创建系统消息通知所有成员
      await this.messageManager.createSystemMessage({
        roomId: group.id,
        content: config.get('success.groupCreated', { groupId: group.id, creatorId }),
        type: 'groupCreated'
      });

      logger.info(`Group ${group.id} created by user ${creatorId}`);
      return { success: true, groupId: group.id };
      });

      return result;
    } catch (error) {
      logger.error(`Failed to create group: ${error.message}`);
      throw error;
    }
  }

  /**
   * 添加成员到群组
   * @param {string} roomId - 群组ID
   * @param {string} adminId - 管理员ID
   * @param {string[]} userIds - 要添加的用户ID数组
   * @returns {Promise<void>}
   */
  static async addMembers(roomId, adminId, userIds) {
    try {
      // 检查管理员权限
      const adminMember = await RoomMember.findOne({
        where: {
          roomId,
          userId: adminId,
          role: ['owner', 'admin']
        }
      });

      if (!adminMember) {
        throw new Error(config.get('errors.noPermissionAddMembers'));
      }

      // 事务处理
      await Room.sequelize.transaction(async (t) => {
        const promises = userIds.map(userId => {
          return RoomMember.findOrCreate({
            where: {
              roomId,
              userId
            },
            defaults: {
              role: 'member'
            },
            transaction: t
          });
        });

        await Promise.all(promises);
      });

      // 创建系统消息通知所有成员
      await this.messageManager.createSystemMessage({
        roomId,
        content: config.get('success.membersAdded', { count: userIds.length, groupId: roomId }),
        type: 'membersAdded'
      });

      logger.info(`Added ${userIds.length} members to group ${roomId}`);
      return { success: true, count: userIds.length };
    } catch (error) {
      logger.error(`Failed to add members: ${error.message}`);
      throw error;
    }
  }

  /**
   * 移除群组中的成员
   * @param {string} roomId - 群组ID
   * @param {string} adminId - 管理员ID
   * @param {string} userId - 要移除的用户ID
   * @returns {Promise<void>}
   */
  static async removeMember(roomId, adminId, userId) {
    try {
      // 检查管理员权限
      const adminMember = await RoomMember.findOne({
        where: {
          roomId,
          userId: adminId,
          role: ['owner', 'admin']
        }
      });

      if (!adminMember) {
        throw new Error(config.get('errors.noPermission'));
      }

      // 不能移除所有者
      if (adminMember.role === 'admin') {
        const owner = await RoomMember.findOne({
          where: {
            roomId,
            role: 'owner'
          }
        });

        if (userId === owner.userId) {
          throw new Error(config.get('errors.cannotRemoveOwner'));
        }
      }

      // 移除成员
      await RoomMember.destroy({
        where: {
          roomId,
          userId
        }
      });

      // 创建系统消息通知所有成员
      await this.messageManager.createSystemMessage({
        roomId,
        content: config.get('success.memberRemoved', { userId, groupId: roomId }),
        type: 'memberRemoved'
      });

      logger.info(`Removed user ${userId} from group ${roomId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to remove member: ${error.message}`);
      throw error;
    }
  }

  /**
   * 更新成员角色
   * @param {string} roomId - 群组ID
   * @param {string} ownerId - 所有者ID
   * @param {string} userId - 要更新的用户ID
   * @param {string} role - 新角色(admin, member)
   * @returns {Promise<void>}
   */
  static async updateMemberRole(roomId, ownerId, userId, role) {
    try {
      // 检查是否为所有者
      const owner = await RoomMember.findOne({
        where: {
          roomId,
          userId: ownerId,
          role: 'owner'
        }
      });

      if (!owner) {
        throw new Error(config.get('errors.onlyOwnerChangeRole'));
      }

      // 更新角色
      await RoomMember.update(
        { role },
        {
          where: {
            roomId,
            userId
          }
        }
      );

      // 创建系统消息通知所有成员
      await this.messageManager.createSystemMessage({
        roomId,
        content: config.get('success.memberRoleUpdated', { userId, groupId: roomId, role }),
        type: 'memberRoleUpdated'
      });

      logger.info(`Updated user ${userId} role to ${role} in group ${roomId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to update member role: ${error.message}`);
      throw error;
    }
  }

  /**
   * 设置群公告
   * @param {string} roomId - 群组ID
   * @param {string} adminId - 管理员ID
   * @param {string} announcement - 公告内容
   * @returns {Promise<void>}
   */
  static async setAnnouncement(roomId, adminId, announcement) {
    try {
      // 检查管理员权限
      const adminMember = await RoomMember.findOne({
        where: {
          roomId,
          userId: adminId,
          role: ['owner', 'admin']
        }
      });

      if (!adminMember) {
        throw new Error(config.get('errors.noPermissionSetAnnouncement'));
      }

      // 更新公告
      await Room.update(
        {
          announcement,
          announcementUpdatedAt: new Date()
        },
        {
          where: {
            id: roomId
          }
        }
      );

      // 创建系统消息通知所有成员
      await this.messageManager.createSystemMessage({
        roomId,
        content: config.get('success.announcementUpdated', { groupId: roomId }),
        type: 'announcementUpdated'
      });

      logger.info(`Updated announcement for group ${roomId}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to set announcement: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取群公告
   * @param {string} roomId - 群组ID
   * @returns {Promise<{announcement: string, updatedAt: Date|null}>}
   */
  static async getAnnouncement(roomId) {
    try {
      const room = await Room.findByPk(roomId, {
        attributes: ['announcement', 'announcementUpdatedAt']
      });

      if (!room) {
        throw new Error(config.get('errors.groupNotFound'));
      }

      return {
        announcement: room.announcement,
        updatedAt: room.announcementUpdatedAt
      };
    } catch (error) {
      logger.error(`Failed to get announcement: ${error.message}`);
      throw error;
    }
  }
}

module.exports = GroupChatManager;