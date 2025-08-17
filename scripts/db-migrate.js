const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// 确保.env文件存在
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  logger.error('未找到.env文件，请先创建并配置环境变量');
  process.exit(1);
}

// 加载环境变量
require('dotenv').config();

// 数据库迁移脚本
function runMigrations() {
  try {
    logger.info('开始运行数据库迁移...');
    execSync('npx sequelize-cli db:migrate', { stdio: 'inherit', cwd: __dirname });
    logger.info('数据库迁移成功');
  } catch (error) {
    logger.error('数据库迁移失败:', error);
    process.exit(1);
  }
}

// 撤销最后一次迁移
function undoLastMigration() {
  try {
    logger.info('撤销最后一次数据库迁移...');
    execSync('npx sequelize-cli db:migrate:undo', { stdio: 'inherit', cwd: __dirname });
    logger.info('撤销迁移成功');
  } catch (error) {
    logger.error('撤销迁移失败:', error);
    process.exit(1);
  }
}

// 撤销所有迁移
function undoAllMigrations() {
  try {
    logger.info('撤销所有数据库迁移...');
    execSync('npx sequelize-cli db:migrate:undo:all', { stdio: 'inherit', cwd: __dirname });
    logger.info('撤销所有迁移成功');
  } catch (error) {
    logger.error('撤销所有迁移失败:', error);
    process.exit(1);
  }
}

// 初始化数据库（运行所有迁移）
function initializeDatabase() {
  try {
    logger.info('开始初始化数据库...');
    // 先撤销所有迁移（如果有）
    try {
      execSync('npx sequelize-cli db:migrate:undo:all', { stdio: 'ignore', cwd: __dirname });
      logger.info('已撤销所有现有迁移');
    } catch (error) {
      // 忽略撤销失败的错误，可能是因为没有迁移可撤销
      logger.info('没有现有迁移可撤销');
    }

    // 运行所有迁移
    execSync('npx sequelize-cli db:migrate', { stdio: 'inherit', cwd: __dirname });
    logger.info('数据库初始化成功');
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 根据命令行参数执行不同操作
const args = process.argv.slice(2);
if (args.length === 0) {
  logger.info('使用方法: node db-migrate.js [command]');
  logger.info('命令列表:');
  logger.info('  migrate         - 运行所有未运行的迁移');
  logger.info('  undo            - 撤销最后一次迁移');
  logger.info('  undo:all        - 撤销所有迁移');
  logger.info('  init            - 初始化数据库（撤销所有迁移后再运行所有迁移）');
  process.exit(0);
}

const command = args[0];
switch (command) {
  case 'migrate':
    runMigrations();
    break;
  case 'undo':
    undoLastMigration();
    break;
  case 'undo:all':
    undoAllMigrations();
    break;
  case 'init':
    initializeDatabase();
    break;
  default:
    logger.error(`未知命令: ${command}`);
    logger.info('使用方法: node db-migrate.js [command]');
    process.exit(1);
}