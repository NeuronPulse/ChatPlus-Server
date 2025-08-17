const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const path = require('path');
const ConfigManager = require('./config');
const config = new ConfigManager();

// 确保日志目录存在
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// 从配置中获取日志级别
const logLevel = config.get('logLevel', 'info');

// 创建logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console(),
    // 每天保存日志到文件
    new DailyRotateFile({
      filename: path.join(logDir, 'chatplus-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

module.exports = logger;