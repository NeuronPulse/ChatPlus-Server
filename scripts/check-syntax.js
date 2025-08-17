// 简单的语法检查脚本
try {
  // 直接require index.js来检测语法错误
  // 使用一个临时变量来存储导入的模块
  const appModule = require('./index');
  console.log('语法检查通过!');
  // 检查是否有服务器实例并关闭它
  if (appModule && appModule.server) {
    appModule.server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  } else {
    // 如果没有服务器实例，直接退出
    process.exit(0);
  }
} catch (error) {
  console.error('语法错误:', error.message);
  console.error('错误位置:', error.stack);
  process.exit(1);
}