const { Sequelize } = require('sequelize');
const ConfigManager = require('./config');
const configManager = new ConfigManager();

// 获取当前环境（默认为development）
const env = process.env.NODE_ENV || 'development';
// 获取对应环境的数据库配置
const dbConfig = configManager.get(env);

// 初始化数据库
const sequelize = new Sequelize(dbConfig);

// 导出sequelize实例和Sequelize类
module.exports = { sequelize, Sequelize, DataTypes: Sequelize.DataTypes };