const fs = require('fs');
const path = require('path');
const logger = require('../logger');
const ConfigManager = require('../config');
const config = new ConfigManager();
const crypto = require('crypto');

/**
 * 插件管理器
 * 负责插件的加载、初始化、激活、停用和卸载
 */
class PluginManager {
  constructor() {
    this.plugins = new Map(); // 存储已加载的插件
    this.pluginDir = path.join(__dirname, '..', 'plugins');
    this.eventBus = null; // 事件总线，稍后初始化
    this.pluginDependencies = new Map(); // 存储插件依赖关系
    this.pluginPermissions = new Map(); // 存储插件权限
    this.watchers = new Map(); // 存储文件监听器
  }

  /**
   * 初始化插件管理器
   * @param {EventBus} eventBus - 事件总线实例
   */
  init(eventBus) {
    this.eventBus = eventBus;
    logger.info(config.get('strings.info.pluginManagerInitialized'));
  }

  /**
   * 加载所有插件
   */
  async loadAllPlugins() {
    if (!fs.existsSync(this.pluginDir)) {
      logger.warn(config.get('strings.info.pluginDirectoryNotFound').replace('{directory}', this.pluginDir));
      return;
    }

    const pluginFolders = fs.readdirSync(this.pluginDir).filter(folder => {
      const folderPath = path.join(this.pluginDir, folder);
      return fs.statSync(folderPath).isDirectory() && fs.existsSync(path.join(folderPath, 'index.js'));
    });

    for (const folder of pluginFolders) {
      await this.loadPlugin(folder);
    }

    logger.info(config.get('strings.info.pluginsLoadedSuccessfully').replace('{count}', this.plugins.size));
  }

  /**
   * 加载单个插件
   * @param {string} pluginName - 插件名称
   * @param {boolean} recursive - 是否递归加载依赖
   */
  async loadPlugin(pluginName, recursive = true) {
    try {
      // 如果插件已加载，则跳过
      if (this.plugins.has(pluginName)) {
        logger.debug(config.get('strings.info.pluginAlreadyRegistered').replace('{pluginName}', pluginName));
        return true;
      }

      const pluginPath = path.join(this.pluginDir, pluginName);
      const pluginEntry = path.join(pluginPath, 'index.js');

      if (!fs.existsSync(pluginEntry)) {
        logger.error(config.get('strings.errors.pluginEntryNotFound').replace('{entryPath}', pluginEntry));
        return false;
      }

      // 读取插件元数据
      let pluginMetadata = {};
      const packageJsonPath = path.join(pluginPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        pluginMetadata = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      }

      // 读取插件配置
      let pluginConfig = {};
      const configPath = path.join(pluginPath, 'config.json');
      if (fs.existsSync(configPath)) {
        pluginConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }

      // 处理插件依赖
      const dependencies = pluginMetadata.dependencies || [];
      if (recursive && dependencies.length > 0) {
        this.pluginDependencies.set(pluginName, dependencies);
        logger.debug(config.get('strings.info.pluginDependencies').replace('{pluginName}', pluginName).replace('{dependencies}', dependencies.join(', ')));

        // 先加载所有依赖
        for (const dep of dependencies) {
          if (!await this.loadPlugin(dep)) {
            logger.error(config.get('strings.errors.loadDependencyFailed').replace('{dependency}', dep).replace('{pluginName}', pluginName));
            return false;
          }
        }
      }

      // 动态导入插件
      const pluginModule = await import(`file://${pluginEntry}`);
      const pluginClass = pluginModule.default || pluginModule;

      if (typeof pluginClass !== 'function') {
        logger.error(config.get('strings.errors.invalidPluginExport').replace('{pluginName}', pluginName));
        return false;
      }

      // 创建插件实例
      const plugin = new pluginClass({
        name: pluginName,
        metadata: pluginMetadata,
        config: pluginConfig,
        logger: logger,
        configManager: config,
        eventBus: this.eventBus
      });

      // 验证插件接口
      if (typeof plugin.init !== 'function') {
        logger.error(config.get('strings.errors.pluginMissingMethod').replace('{pluginName}', pluginName).replace('{method}', 'init'));
        return false;
      }

      // 触发beforeInit生命周期钩子
      if (typeof plugin.beforeInit === 'function') {
        await plugin.beforeInit();
      }

      // 初始化插件
      await plugin.init();

      // 存储插件
      this.plugins.set(pluginName, {
        instance: plugin,
        metadata: pluginMetadata,
        config: pluginConfig,
        active: false
      });

      logger.info(config.get('strings.info.pluginRegistered').replace('{pluginName}', pluginName));
      return true;
    } catch (error) {
      logger.error(config.get('strings.errors.loadPluginFailed').replace('{pluginName}', pluginName), error);
      logger.debug(error.stack);
      return false;
    }
  }

  /**
   * 激活插件
   * @param {string} pluginName - 插件名称
   */
  async activatePlugin(pluginName) {
    const pluginInfo = this.plugins.get(pluginName);
    if (!pluginInfo) {
      logger.error(config.get('strings.errors.pluginNotFound').replace('{pluginName}', pluginName));
      return false;
    }

    if (pluginInfo.active) {
      logger.warn(config.get('strings.info.pluginAlreadyActive').replace('{pluginName}', pluginName));
      return true;
    }

    try {
      // 检查依赖是否已激活
      const dependencies = this.pluginDependencies.get(pluginName) || [];
      for (const dep of dependencies) {
        const depPlugin = this.plugins.get(dep);
        if (!depPlugin || !depPlugin.active) {
          logger.error(config.get('strings.errors.dependencyNotActive').replace('{dependency}', dep).replace('{pluginName}', pluginName));
          return false;
        }
      }

      // 检查插件权限
      if (!this.checkPluginPermissions(pluginName)) {
        logger.error(config.get('strings.errors.pluginLacksPermissions').replace('{pluginName}', pluginName));
        return false;
      }

      // 触发beforeActivate生命周期钩子
      if (typeof pluginInfo.instance.beforeActivate === 'function') {
        await pluginInfo.instance.beforeActivate();
      }

      if (typeof pluginInfo.instance.activate === 'function') {
        await pluginInfo.instance.activate();
      }

      pluginInfo.active = true;

      // 触发afterActivate生命周期钩子
      if (typeof pluginInfo.instance.afterActivate === 'function') {
        await pluginInfo.instance.afterActivate();
      }

      logger.info(config.get('strings.success.pluginActivated').replace('{pluginName}', pluginName));
      return true;
    } catch (error) {
      logger.error(config.get('strings.errors.activatePluginFailed').replace('{pluginName}', pluginName), error);
      logger.debug(error.stack);
      return false;
    }
  }

  /**
   * 检查插件权限
   * @param {string} pluginName - 插件名称
   * @returns {boolean} 是否有权限
   */
  checkPluginPermissions(pluginName) {
    const pluginInfo = this.plugins.get(pluginName);
    if (!pluginInfo) {
      logger.error(config.get('strings.errors.pluginNotFound').replace('{pluginName}', pluginName));
      return false;
    }

    // 获取插件所需权限
    const requiredPermissions = pluginInfo.metadata.permissions || [];
    if (requiredPermissions.length === 0) {
      return true; // 无权限要求，默认通过
    }

    // 获取插件已授权权限
    const grantedPermissions = this.pluginPermissions.get(pluginName) || [];

    // 检查是否拥有所有必需的权限
    for (const perm of requiredPermissions) {
      if (!grantedPermissions.includes(perm)) {
        logger.warn(config.get('strings.info.pluginMissingPermission').replace('{pluginName}', pluginName).replace('{permission}', perm));
        return false;
      }
    }

    return true;
  }

  /**
   * 授予插件权限
   * @param {string} pluginName - 插件名称
   * @param {string|array} permissions - 权限或权限数组
   */
  grantPermissions(pluginName, permissions) {
    if (!this.plugins.has(pluginName)) {
      logger.error(config.get('strings.errors.pluginNotFound').replace('{pluginName}', pluginName));
      return false;
    }

    const currentPermissions = this.pluginPermissions.get(pluginName) || [];
    const newPermissions = Array.isArray(permissions) ? permissions : [permissions];

    // 合并权限，去重
    const mergedPermissions = [...new Set([...currentPermissions, ...newPermissions])];
    this.pluginPermissions.set(pluginName, mergedPermissions);

    logger.info(config.get('strings.success.permissionsGranted').replace('{pluginName}', pluginName).replace('{permissions}', newPermissions.join(', ')));
    return true;
  }

  /**
   * 撤销插件权限
   * @param {string} pluginName - 插件名称
   * @param {string|array} permissions - 权限或权限数组
   */
  revokePermissions(pluginName, permissions) {
    if (!this.plugins.has(pluginName)) {
      logger.error(config.get('strings.errors.pluginNotFound').replace('{pluginName}', pluginName));
      return false;
    }

    const currentPermissions = this.pluginPermissions.get(pluginName) || [];
    const revokePermissions = Array.isArray(permissions) ? permissions : [permissions];

    // 过滤掉要撤销的权限
    const remainingPermissions = currentPermissions.filter(perm => !revokePermissions.includes(perm));
    this.pluginPermissions.set(pluginName, remainingPermissions);

    logger.info(config.get('strings.success.permissionsRevoked').replace('{pluginName}', pluginName).replace('{permissions}', revokePermissions.join(', ')));
    return true;
  }

  /**
   * 获取插件权限
   * @param {string} pluginName - 插件名称
   * @returns {array} 权限列表
   */
  getPluginPermissions(pluginName) {
    if (!this.plugins.has(pluginName)) {
      logger.error(`Plugin not found: ${pluginName}`);
      return [];
    }

    return this.pluginPermissions.get(pluginName) || [];
  }

  /**
   * 获取所有插件列表
   * @returns {Array} 插件列表
   */
  getPlugins() {
    const pluginList = [];
    for (const [pluginName, pluginInfo] of this.plugins.entries()) {
      pluginList.push({
        name: pluginName,
        metadata: pluginInfo.metadata,
        active: pluginInfo.active,
        permissions: this.getPluginPermissions(pluginName)
      });
    }
    return pluginList;
  }

  /**
   * 获取单个插件详情
   * @param {string} pluginName - 插件名称
   * @returns {Object|null} 插件详情或null
   */
  getPlugin(pluginName) {
    const pluginInfo = this.plugins.get(pluginName);
    if (!pluginInfo) {
      return null;
    }

    return {
      name: pluginName,
      metadata: pluginInfo.metadata,
      config: pluginInfo.config,
      active: pluginInfo.active,
      permissions: this.getPluginPermissions(pluginName),
      dependencies: this.pluginDependencies.get(pluginName) || []
    };
  }

  /**
   * 停用插件
   * @param {string} pluginName - 插件名称
   */
  async deactivatePlugin(pluginName) {
    const pluginInfo = this.plugins.get(pluginName);
    if (!pluginInfo) {
      logger.error(`Plugin not found: ${pluginName}`);
      return false;
    }

    if (!pluginInfo.active) {
      logger.warn(config.get('strings.info.pluginAlreadyInactive').replace('{pluginName}', pluginName));
      return true;
    }

    try {
      // 触发beforeDeactivate生命周期钩子
      if (typeof pluginInfo.instance.beforeDeactivate === 'function') {
        await pluginInfo.instance.beforeDeactivate();
      }

      if (typeof pluginInfo.instance.deactivate === 'function') {
        await pluginInfo.instance.deactivate();
      }

      pluginInfo.active = false;

      // 触发afterDeactivate生命周期钩子
      if (typeof pluginInfo.instance.afterDeactivate === 'function') {
        await pluginInfo.instance.afterDeactivate();
      }

      logger.info(config.get('strings.success.pluginDeactivated').replace('{pluginName}', pluginName));
      return true;
    } catch (error) {
      logger.error(config.get('strings.errors.deactivatePluginFailed').replace('{pluginName}', pluginName), error);
      logger.debug(error.stack);
      return false;
    }
  }

  /**
   * 激活所有插件
   */
  async activateAllPlugins() {
    let activatedCount = 0;
    for (const [pluginName, pluginInfo] of this.plugins.entries()) {
      if (!pluginInfo.active) {
        if (await this.activatePlugin(pluginName)) {
          activatedCount++;
        }
      }
    }
    logger.info(config.get('strings.success.pluginsActivated').replace('{count}', activatedCount));
  }

  /**
   * 停用插件
   * @param {string} pluginName - 插件名称
   */
  async deactivatePlugin(pluginName) {
    const pluginInfo = this.plugins.get(pluginName);
    if (!pluginInfo) {
      logger.error(`Plugin not found: ${pluginName}`);
      return false;
    }

    if (!pluginInfo.active) {
      logger.warn(config.get('strings.info.pluginAlreadyInactive').replace('{pluginName}', pluginName));
      return true;
    }

    try {
      // 触发beforeDeactivate生命周期钩子
      if (typeof pluginInfo.instance.beforeDeactivate === 'function') {
        await pluginInfo.instance.beforeDeactivate();
      }

      if (typeof pluginInfo.instance.deactivate === 'function') {
        await pluginInfo.instance.deactivate();
      }

      pluginInfo.active = false;

      // 触发afterDeactivate生命周期钩子
      if (typeof pluginInfo.instance.afterDeactivate === 'function') {
        await pluginInfo.instance.afterDeactivate();
      }

      logger.info(config.get('strings.success.pluginDeactivated').replace('{pluginName}', pluginName));
      return true;
    } catch (error) {
      logger.error(config.get('strings.errors.deactivatePluginFailed').replace('{pluginName}', pluginName), error);
      logger.debug(error.stack);
      return false;
    }
  }

  /**
   * 启用插件热重载
   * @param {string} pluginName - 插件名称，为空则监听所有插件
   */
  enableHotReload(pluginName = null) {
    if (pluginName) {
      // 监听单个插件
      this._watchPlugin(pluginName);
    } else {
      // 监听所有插件
      for (const name of this.plugins.keys()) {
        this._watchPlugin(name);
      }
    }
    logger.info(config.get('strings.info.hotReloadEnabled'));
  }

  /**
   * 禁用插件热重载
   * @param {string} pluginName - 插件名称，为空则禁用所有插件的热重载
   */
  disableHotReload(pluginName = null) {
    if (pluginName) {
      // 停止监听单个插件
      if (this.watchers.has(pluginName)) {
        this.watchers.get(pluginName).close();
        this.watchers.delete(pluginName);
        logger.info(config.get('strings.info.hotReloadDisabledForPlugin').replace('{pluginName}', pluginName));
      }
    } else {
      // 停止监听所有插件
      for (const watcher of this.watchers.values()) {
        watcher.close();
      }
      this.watchers.clear();
      logger.info(config.get('strings.info.hotReloadDisabledForAll'));
    }
  }

  /**
   * 监听插件文件变化
   * @private
   * @param {string} pluginName - 插件名称
   */
  _watchPlugin(pluginName) {
    const pluginPath = path.join(this.pluginDir, pluginName);

    // 如果已经在监听，则先关闭
    if (this.watchers.has(pluginName)) {
      this.watchers.get(pluginName).close();
    }

    const watcher = fs.watch(pluginPath, { recursive: true }, async (eventType, filename) => {
      if (eventType === 'change' && filename) {
        logger.info(config.get('strings.info.pluginFileChanged').replace('{pluginName}', pluginName).replace('{filename}', filename));

        // 停用插件
        await this.deactivatePlugin(pluginName);

        // 重新加载插件
        if (await this.loadPlugin(pluginName)) {
          // 重新激活插件
          await this.activatePlugin(pluginName);
          logger.info(config.get('strings.success.pluginReloaded').replace('{pluginName}', pluginName));
        }
      }
    });

    this.watchers.set(pluginName, watcher);
    logger.info(config.get('strings.info.watchingPlugin').replace('{pluginName}', pluginName));
  }

  /**
   * 卸载插件
   * @param {string} pluginName - 插件名称
   */
  async unloadPlugin(pluginName) {
    const pluginInfo = this.plugins.get(pluginName);
    if (!pluginInfo) {
      logger.error(`Plugin not found: ${pluginName}`);
      return false;
    }

    try {
      // 检查是否有其他插件依赖此插件
      for (const [name, deps] of this.pluginDependencies.entries()) {
        if (deps.includes(pluginName) && this.plugins.has(name)) {
          logger.error(config.get('strings.errors.cannotUnloadPlugin').replace('{pluginName}', pluginName).replace('{dependentPlugin}', name));
          return false;
        }
      }

      // 触发beforeUnload生命周期钩子
      if (typeof pluginInfo.instance.beforeUnload === 'function') {
        await pluginInfo.instance.beforeUnload();
      }

      // 先停用插件
      if (pluginInfo.active) {
        await this.deactivatePlugin(pluginName);
      }

      // 调用卸载方法
      if (typeof pluginInfo.instance.unload === 'function') {
        await pluginInfo.instance.unload();
      }

      // 从映射中移除
      this.plugins.delete(pluginName);
      this.pluginDependencies.delete(pluginName);

      // 触发afterUnload生命周期钩子
      if (typeof pluginInfo.instance.afterUnload === 'function') {
        await pluginInfo.instance.afterUnload();
      }

      logger.info(config.get('strings.success.pluginUnloaded').replace('{pluginName}', pluginName));
      return true;
    } catch (error) {
      logger.error(config.get('strings.errors.unloadPluginFailed').replace('{pluginName}', pluginName), error);
      logger.debug(error.stack);
      return false;
    }
  }

  /**
   * 获取所有插件信息
   * @returns {Array} 插件信息数组
   */
  getPluginsInfo() {
    const pluginsInfo = [];
    for (const [name, info] of this.plugins.entries()) {
      pluginsInfo.push({
        name,
        active: info.active,
        metadata: info.metadata,
        config: info.config,
        dependencies: this.pluginDependencies.get(name) || []
      });
    }
    return pluginsInfo;
  }

  /**
   * 热更新插件配置
   * @param {string} pluginName - 插件名称
   * @param {Object} newConfig - 新配置
   * @returns {boolean} 是否更新成功
   */
  async hotUpdatePluginConfig(pluginName, newConfig) {
    const pluginInfo = this.plugins.get(pluginName);
    if (!pluginInfo) {
      logger.error(`Plugin not found: ${pluginName}`);
      return false;
    }

    try {
      // 保存旧配置
      const oldConfig = { ...pluginInfo.config };

      // 更新配置
      pluginInfo.config = { ...pluginInfo.config, ...newConfig };

      // 触发配置更新钩子
      if (typeof pluginInfo.instance.onConfigUpdate === 'function') {
        await pluginInfo.instance.onConfigUpdate(oldConfig, pluginInfo.config);
      }

      logger.info(config.get('strings.success.pluginConfigUpdated').replace('{pluginName}', pluginName));
      return true;
    } catch (error) {
      logger.error(config.get('strings.errors.updatePluginConfigFailed').replace('{pluginName}', pluginName), error);
      logger.debug(error.stack);
      return false;
    }
  }

  /**
   * 获取插件实例
   * @param {string} pluginName - 插件名称
   * @returns {Object|null} 插件实例或null
   */
  getPlugin(pluginName) {
    const pluginInfo = this.plugins.get(pluginName);
    return pluginInfo ? pluginInfo.instance : null;
  }
}

module.exports = new PluginManager();