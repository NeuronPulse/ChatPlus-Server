const readline = require('readline');
const pluginManager = require('./utils/pluginManager');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./db');
const User = require('./models/User');
const Room = require('./models/Room');
const Device = require('./models/Device');
const crypto = require('./utils/crypto');
const { performanceMonitor } = require('./utils/performanceMonitor');
const ConfigManager = require('./config');
let serverInstance = null; // 存储服务器实例

/**
 * 服务端控制台
 * 拥有最高权限，用于管理插件和系统
 */
class ServerConsole {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });
    this.config = new ConfigManager();
    this.commands = {
      'help': this.showHelp.bind(this),
      'exit': this.exitConsole.bind(this),
      'plugins': this.listPlugins.bind(this),
      'plugin info': this.showPluginInfo.bind(this),
      'plugin activate': this.activatePlugin.bind(this),
      'plugin deactivate': this.deactivatePlugin.bind(this),
      'plugin reload': this.reloadPlugin.bind(this),
      'permissions grant': this.grantPermission.bind(this),
      'permissions revoke': this.revokePermission.bind(this),
      'system status': this.showSystemStatus.bind(this),
      'server start': this.startServer.bind(this),
      'server stop': this.stopServer.bind(this),
      'server restart': this.restartServer.bind(this),
      'db query': this.dbQuery.bind(this),
      'user list': this.listUsers.bind(this),
      'user get': this.getUser.bind(this),
      'user update': this.updateUser.bind(this),
      'user delete': this.deleteUser.bind(this),
      'room list': this.listRooms.bind(this),
      'room get': this.getRoom.bind(this),
      'room update': this.updateRoom.bind(this),
      'room delete': this.deleteRoom.bind(this),
      'device list': this.listDevices.bind(this),
      'device get': this.getDevice.bind(this),
      'device update': this.updateDevice.bind(this),
      'device delete': this.deleteDevice.bind(this),
      'crypto optimize': this.optimizeCrypto.bind(this)
    };
  }

  /**
   * 启动控制台
   * @param {PluginManager} pm - 插件管理器实例
   */
  start(pm) {
    this.pluginManager = pm;
    logger.info(this.config.get('strings.console.started'));
    this.rl.prompt();

    this.rl.on('line', (line) => {
      this.handleCommand(line.trim());
      this.rl.prompt();
    }).on('close', () => {
      logger.info(this.config.get('strings.console.consoleClosed'));
    process.exit(0);
    });
  }

  /**
   * 处理命令
   * @param {string} command - 命令字符串
   */
  handleCommand(command) {
    if (!command) return;

    // 寻找匹配的命令
    for (const [cmd, handler] of Object.entries(this.commands)) {
      if (command.startsWith(cmd)) {
        const args = command.slice(cmd.length).trim().split(' ').filter(arg => arg);
        handler(args);
        return;
      }
    }

    logger.warn(this.config.get('strings.errors.unknownCommand') + ' ' + command);
    this.showHelp();
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log('\n' + this.config.get('strings.console.availableCommands'));
    console.log(this.config.get('strings.console.commandHelp') + '\n');
  }

  /**
   * 退出控制台
   */
  exitConsole() {
    this.rl.close();
  }

  /**
   * 列出所有插件
   */
  listPlugins() {
    const plugins = this.pluginManager.getPlugins();
    console.log('\nInstalled plugins:');
    if (plugins.length === 0) {
      console.log(this.config.get('strings.listItems.noPlugins'));
      return;
    }

    plugins.forEach(plugin => {
      const pluginItem = this.config.get('strings.listItems.pluginItem')
        .replace('{name}', plugin.name)
        .replace('{status}', plugin.active ? this.config.get('strings.listItems.activeStatus') : this.config.get('strings.listItems.inactiveStatus'));
      console.log(pluginItem);
    });
    console.log('');
  }

  /**
   * 显示插件详细信息
   * @param {Array} args - 参数数组
   */
  showPluginInfo(args) {
    if (args.length < 1) {
      logger.warn(this.config.get('strings.warnings.pleaseSpecifyPluginName'));
      return;
    }

    const pluginName = args[0];
    const plugin = this.pluginManager.getPlugin(pluginName);

    if (!plugin) {
      logger.warn(this.config.get('strings.errors.pluginNotFound') + ' ' + pluginName);
      return;
    }

    console.log(`\n${this.config.get('strings.console.pluginInfo')} ${plugin.name}`);
    console.log(`${this.config.get('strings.console.pluginActive')} ${plugin.active}`);
    console.log(`${this.config.get('strings.console.pluginVersion')} ${plugin.metadata.version || 'N/A'}`);
    console.log(`${this.config.get('strings.console.pluginDescription')} ${plugin.metadata.description || 'N/A'}`);
    console.log(`${this.config.get('strings.console.pluginPermissions')} ${Array.isArray(plugin.permissions) && plugin.permissions.length ? plugin.permissions.join(', ') : 'None'}`);
    console.log(`${this.config.get('strings.console.pluginDependencies')} ${Array.isArray(plugin.dependencies) && plugin.dependencies.length ? plugin.dependencies.join(', ') : 'None'}`);
    console.log('');
  }

  /**
   * 激活插件
   * @param {Array} args - 参数数组
   */
  async activatePlugin(args) {
    if (args.length < 1) {
      logger.warn('Please specify plugin name');
      return;
    }

    const pluginName = args[0];
    const result = await this.pluginManager.activatePlugin(pluginName);
    if (result) {
      logger.info(this.config.get('strings.success.pluginActivated') + ' ' + pluginName);
    } else {
      logger.error(this.config.get('strings.errors.failedToActivatePlugin') + ' ' + pluginName);
    }
  }

  /**
   * 停用插件
   * @param {Array} args - 参数数组
   */
  async deactivatePlugin(args) {
    if (args.length < 1) {
      logger.warn('Please specify plugin name');
      return;
    }

    const pluginName = args[0];
    // 需要在PluginManager中实现deactivatePlugin方法
    try {
      const result = await this.pluginManager.deactivatePlugin(pluginName);
      if (result) {
        logger.info(this.config.get('strings.success.pluginDeactivated') + ' ' + pluginName);
      } else {
        logger.error(this.config.get('strings.errors.failedToDeactivatePlugin') + ' ' + pluginName);
      }
    } catch (error) {
      logger.error(this.config.get('strings.errors.errorDeactivatingPlugin') + ' ' + error.message);
    }
  }

  /**
   * 重新加载插件
   * @param {Array} args - 参数数组
   */
  async reloadPlugin(args) {
    if (args.length < 1) {
      logger.warn('Please specify plugin name');
      return;
    }

    const pluginName = args[0];
    try {
      // 先停用插件
      await this.pluginManager.deactivatePlugin(pluginName);
      // 然后重新加载
      await this.pluginManager.loadPlugin(pluginName);
      // 最后激活
      await this.pluginManager.activatePlugin(pluginName);
      logger.info(this.config.get('strings.success.pluginReloaded') + ' ' + pluginName);
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToReloadPlugin') + ' ' + error.message);
    }
  }

  /**
   * 授予插件权限
   * @param {Array} args - 参数数组
   */
  grantPermission(args) {
    if (args.length < 2) {
      logger.warn(this.config.get('strings.warnings.usagePermissionsGrant'));
      return;
    }

    const pluginName = args[0];
    const permissions = args.slice(1);

    const result = this.pluginManager.grantPermissions(pluginName, permissions);
    if (result) {
      logger.info(this.config.get('strings.success.permissionsGranted') + ' ' + pluginName + this.config.get('strings.listItems.separator') + permissions.join(', '));
    } else {
      logger.error(this.config.get('strings.errors.failedToGrantPermissions') + ' ' + pluginName);
    }
  }

  /**
   * 撤销插件权限
   * @param {Array} args - 参数数组
   */
  revokePermission(args) {
    if (args.length < 2) {
      logger.warn(this.config.get('strings.warnings.usagePermissionsRevoke'));
      return;
    }

    const pluginName = args[0];
    const permissions = args.slice(1);

    const result = this.pluginManager.revokePermissions(pluginName, permissions);
    if (result) {
      logger.info(this.config.get('strings.success.permissionsRevoked') + ' ' + pluginName + this.config.get('strings.listItems.separator') + permissions.join(', '));
    } else {
      logger.error(this.config.get('strings.errors.failedToRevokePermissions') + ' ' + pluginName);
    }
  }

  /**
   * 显示系统状态
   */
  showSystemStatus() {
    const plugins = this.pluginManager.getPlugins();
    const activePlugins = plugins.filter(plugin => plugin.active).length;

    console.log('\n' + this.config.get('strings.console.systemStatus'));
    console.log(this.config.get('strings.console.pluginsStatus') + this.config.get('strings.listItems.separator') + activePlugins + '/' + plugins.length + ' ' + this.config.get('strings.listItems.activeStatus'));
    console.log(this.config.get('strings.console.nodeVersion') + this.config.get('strings.listItems.separator') + process.version);
    console.log(this.config.get('strings.console.memoryUsage') + this.config.get('strings.listItems.separator') + Math.round(process.memoryUsage().rss / 1024 / 1024) + this.config.get('strings.console.memoryUnit'));
    console.log('');
  }

  /**
   * 设置服务器实例
   * @param {Object} instance - 服务器实例
   */
  setServerInstance(instance) {
    serverInstance = instance;
  }

  /**
   * 启动服务端
   */
  async startServer() {
    if (serverInstance) {
      logger.warn(this.config.get('strings.warnings.serverAlreadyRunning'));
      return;
    }

    try {
      const serverModule = require('./index');
      serverInstance = await serverModule.start();
      logger.info(this.config.get('strings.success.serverStarted'));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToStartServer') + ' ' + error.message);
    }
  }

  /**
   * 停止服务端
   */
  async stopServer() {
    if (!serverInstance) {
      logger.warn(this.config.get('strings.warnings.serverNotRunning'));
      return;
    }

    try {
      await serverInstance.close();
      serverInstance = null;
      logger.info(this.config.get('strings.success.serverStopped'));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToStopServer') + ' ' + error.message);
    }
  }

  /**
   * 重启服务端
   */
  async restartServer() {
    try {
      await this.stopServer();
      await this.startServer();
      logger.info(this.config.get('strings.success.serverRestarted'));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToRestartServer') + ' ' + error.message);
    }
  }

  /**
   * 执行数据库查询
   * @param {Array} args - 参数数组
   */
  async dbQuery(args) {
    if (args.length < 1) {
      logger.warn(this.config.get('strings.warnings.usageDbQuery'));
      return;
    }

    const sql = args.join(' ');
    try {
      const results = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
      console.log('\n' + this.config.get('strings.console.queryResults'));
      console.log(JSON.stringify(results, null, 2));
      console.log('');
    } catch (error) {
      logger.error(this.config.get('strings.errors.databaseQueryFailed') + ' ' + error.message);
    }
  }

  /**
   * 列出所有用户
   */
  async listUsers() {
    try {
      const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'nickname', 'online', 'lastActive']
      });
      console.log('\n' + this.config.get('strings.console.usersList'));
      users.forEach(user => {
        const userItem = this.config.get('strings.listItems.userItem')
          .replace('{username}', user.username)
          .replace('{email}', user.email)
          .replace('{status}', user.online ? this.config.get('strings.listItems.onlineStatus') : this.config.get('strings.listItems.offlineStatus'));
        console.log(userItem);
      });
      console.log('');
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToListUsers') + ' ' + error.message);
    }
  }

  /**
   * 获取用户详细信息
   * @param {Array} args - 参数数组
   */
  async getUser(args) {
    if (args.length < 1) {
      logger.warn(this.config.get('strings.warnings.usageUserGet'));
      return;
    }

    const userId = args[0];
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(this.config.get('strings.warnings.userNotFound') + ' ' + userId);
        return;
      }

      console.log('\n' + this.config.get('strings.console.userDetails'));
      console.log(JSON.stringify(user.toJSON(), null, 2));
      console.log('');
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToGetUser') + ' ' + error.message);
    }
  }

  /**
   * 更新用户信息
   * @param {Array} args - 参数数组
   */
  async updateUser(args) {
    if (args.length < 3) {
      logger.warn(this.config.get('strings.warnings.usageUserUpdate'));
      return;
    }

    const userId = args[0];
    const field = args[1];
    const value = args.slice(2).join(' ');

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(`User not found: ${userId}`);
        return;
      }

      user[field] = value;
      await user.save();
      logger.info(this.config.get('strings.success.userUpdated').replace('{userId}', userId));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToUpdateUser') + ' ' + error.message);
    }
  }

  /**
   * 删除用户
   * @param {Array} args - 参数数组
   */
  async deleteUser(args) {
    if (args.length < 1) {
      logger.warn(this.config.get('strings.warnings.usageUserDelete'));
      return;
    }

    const userId = args[0];
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(`User not found: ${userId}`);
        return;
      }

      await user.destroy();
      logger.info(this.config.get('strings.success.userDeleted').replace('{userId}', userId));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToDeleteUser') + ' ' + error.message);
    }
  }

  /**
   * 列出所有聊天室
   */
  async listRooms() {
    try {
      const rooms = await Room.findAll({
        attributes: ['id', 'name', 'type', 'description']
      });
      console.log('\n' + this.config.get('strings.console.roomsList'));
      rooms.forEach(room => {
        const roomItem = this.config.get('strings.listItems.roomItem')
          .replace('{name}', room.name)
          .replace('{type}', room.type);
        console.log(roomItem);
      });
      console.log('');
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToListRooms') + ' ' + error.message);
    }
  }

  /**
   * 获取聊天室详细信息
   * @param {Array} args - 参数数组
   */
  async getRoom(args) {
    if (args.length < 1) {
      logger.warn(this.config.get('strings.warnings.usageRoomGet'));
      return;
    }

    const roomId = args[0];
    try {
      const room = await Room.findByPk(roomId);
      if (!room) {
        logger.warn(this.config.get('strings.warnings.roomNotFound') + ' ' + roomId);
        return;
      }

      console.log('\n' + this.config.get('strings.console.roomDetails'));
      console.log(JSON.stringify(room.toJSON(), null, 2));
      console.log('');
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToGetRoom') + ' ' + error.message);
    }
  }

  /**
   * 更新聊天室信息
   * @param {Array} args - 参数数组
   */
  async updateRoom(args) {
    if (args.length < 3) {
      logger.warn(this.config.get('strings.warnings.usageRoomUpdate'));
      return;
    }

    const roomId = args[0];
    const field = args[1];
    const value = args.slice(2).join(' ');

    try {
      const room = await Room.findByPk(roomId);
      if (!room) {
        logger.warn(`Room not found: ${roomId}`);
        return;
      }

      room[field] = value;
      await room.save();
      logger.info(this.config.get('strings.success.roomUpdated').replace('{roomId}', roomId));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToUpdateRoom') + ' ' + error.message);
    }
  }

  /**
   * 删除聊天室
   * @param {Array} args - 参数数组
   */
  async deleteRoom(args) {
    if (args.length < 1) {
      logger.warn(this.config.get('strings.warnings.usageRoomDelete'));
      return;
    }

    const roomId = args[0];
    try {
      const room = await Room.findByPk(roomId);
      if (!room) {
        logger.warn(`Room not found: ${roomId}`);
        return;
      }

      await room.destroy();
      logger.info(this.config.get('strings.success.roomDeleted').replace('{roomId}', roomId));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToDeleteRoom') + ' ' + error.message);
    }
  }

  /**
   * 列出所有设备
   */
  async listDevices() {
    try {
      const devices = await Device.findAll({
        attributes: ['id', 'deviceId', 'deviceName', 'deviceType', 'userId', 'isActive']
      });
      console.log('\n' + this.config.get('strings.console.devicesList'));
      devices.forEach(device => {
        const deviceItem = this.config.get('strings.listItems.deviceItem')
          .replace('{deviceName}', device.deviceName)
          .replace('{deviceType}', device.deviceType)
          .replace('{userId}', device.userId)
          .replace('{status}', device.isActive ? this.config.get('strings.listItems.activeStatus') : this.config.get('strings.listItems.inactiveStatus'));
        console.log(deviceItem);
      });
      console.log('');
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToListDevices') + ' ' + error.message);
    }
  }

  /**
   * 获取设备详细信息
   * @param {Array} args - 参数数组
   */
  async getDevice(args) {
    if (args.length < 1) {
      logger.warn(this.config.get('strings.warnings.usageDeviceGet'));
      return;
    }

    const deviceId = args[0];
    try {
      const device = await Device.findByPk(deviceId);
      if (!device) {
        logger.warn(this.config.get('strings.warnings.deviceNotFound') + ' ' + deviceId);
        return;
      }

      console.log('\n' + this.config.get('strings.console.deviceDetails'));
      console.log(JSON.stringify(device.toJSON(), null, 2));
      console.log('');
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToGetDevice') + ' ' + error.message);
    }
  }

  /**
   * 更新设备信息
   * @param {Array} args - 参数数组
   */
  async updateDevice(args) {
    if (args.length < 3) {
      logger.warn(this.config.get('strings.warnings.usageDeviceUpdate'));
      return;
    }

    const deviceId = args[0];
    const field = args[1];
    const value = args.slice(2).join(' ');

    try {
      const device = await Device.findByPk(deviceId);
      if (!device) {
        logger.warn(`Device not found: ${deviceId}`);
        return;
      }

      device[field] = value;
      await device.save();
      logger.info(this.config.get('strings.success.deviceUpdated').replace('{deviceId}', deviceId));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToUpdateDevice') + ' ' + error.message);
    }
  }

  /**
   * 删除设备
   * @param {Array} args - 参数数组
   */
  async deleteDevice(args) {
    if (args.length < 1) {
      logger.warn(this.config.get('strings.warnings.usageDeviceDelete'));
      return;
    }

    const deviceId = args[0];
    try {
      const device = await Device.findByPk(deviceId);
      if (!device) {
        logger.warn(`Device not found: ${deviceId}`);
        return;
      }

      await device.destroy();
      logger.info(this.config.get('strings.success.deviceDeleted').replace('{deviceId}', deviceId));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToDeleteDevice') + ' ' + error.message);
    }
  }

  /**
   * 优化端到端加密性能
   */
  optimizeCrypto() {
    try {
      // 优化1: 缓存加密解密实例
      if (!global.cryptoCache) {
        global.cryptoCache = {
          cipherInstances: new Map(),
          decipherInstances: new Map()
        };
      }

      // 优化2: 增加性能监控
      performanceMonitor.enable('crypto');

      logger.info(this.config.get('strings.success.cryptoOptimized'));
      logger.info(this.config.get('strings.success.cryptoCacheAdded'));
      logger.info(this.config.get('strings.success.performanceMonitoringEnabled'));
    } catch (error) {
      logger.error(this.config.get('strings.errors.failedToOptimizeCrypto') + ' ' + error.message);
    }
  }
}

module.exports = new ServerConsole();