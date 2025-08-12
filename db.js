const { Sequelize } = require('sequelize');
const path = require('path');

// 初始化数据库
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'chatplus.db'),
  logging: false
});

module.exports = { sequelize };