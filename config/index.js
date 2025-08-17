const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * 配置管理器
 */
class ConfigManager {
  constructor() {
    this.config = {};
    this.loadConfig();
  }

  /**
   * 加载配置文件
   */
  loadConfig() {
    // 加载config.json
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    // 加载strings.json
    const stringsPath = path.join(__dirname, 'strings.json');
    if (fs.existsSync(stringsPath)) {
      this.config.strings = JSON.parse(fs.readFileSync(stringsPath, 'utf8'));
    }

    // 合并环境变量
    this.config = {
      ...this.config,
      ...process.env
    };
  }

  /**
   * 获取配置项
   * @param {string} key - 配置项键名
   * @param {*} defaultValue - 默认值
   * @returns {*}
   */
  get(key, defaultValue = null) {
    return key.split('.').reduce((obj, k) => obj && obj[k], this.config) || defaultValue;
  }

  /**
   * 设置配置项
   * @param {string} key - 配置项键名
   * @param {*} value - 配置项值
   */
  set(key, value) {
    const keys = key.split('.');
    let obj = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
  }
}

module.exports = ConfigManager;