// 测试sequelize导出和导入
const { sequelize } = require('./index');

console.log('sequelize实例:', sequelize);

if (sequelize) {
  console.log('测试成功: sequelize实例已正确导入');
} else {
  console.log('测试失败: sequelize实例为undefined');
}