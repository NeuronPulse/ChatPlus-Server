const crypto = require('crypto');
const fs = require('fs');
const PathUtils = require('./pathUtils');
const nodeCrypto = require('crypto');
const logger = require('../logger');
const performanceMonitor = require('./performanceMonitor');
const ConfigManager = require('../config');
const configManager = new ConfigManager();

// 加密配置
const ENCRYPTION_KEY = configManager.get('ENCRYPTION_KEY');
if (!ENCRYPTION_KEY) {
  logger.error(configManager.get('strings.errors.noEncryptionKey'));
  throw new Error(configManager.get('strings.errors.encryptionKeyNotConfigured'));
}
const IV_LENGTH = 16; // 对于AES，IV长度固定为16字节

// LRU缓存实现
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.order = [];
  }

  get(key) {
    if (!this.cache.has(key)) return null;

    // 移动到最近使用
    const index = this.order.indexOf(key);
    if (index !== -1) {
      this.order.splice(index, 1);
    }
    this.order.push(key);

    return this.cache.get(key);
  }

  set(key, value) {
    // 如果缓存已满，删除最久未使用的项
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.order.shift();
      this.cache.delete(oldestKey);
    }

    // 添加新项
    this.cache.set(key, value);
    this.order.push(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  size() {
    return this.cache.size;
  }

  // 统计信息
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// 初始化全局缓存
if (!global.cryptoCache) {
  global.cryptoCache = {
    cipherInstances: new LRUCache(100),
    decipherInstances: new LRUCache(100),
    stats: {
      cipherHits: 0,
      cipherMisses: 0,
      decipherHits: 0,
      decipherMisses: 0
    }
  };
}

/**
 * 加密文本数据
 * @param {string} text - 要加密的文本
 * @returns {string} 加密后的文本
 */
function encryptText(text) {
  performanceMonitor.start('encryptText');
  try {
    const iv = nodeCrypto.randomBytes(IV_LENGTH);
    // 优化缓存键生成
    const cacheKey = `crypto:${ENCRYPTION_KEY.substring(0, 16)}:${iv.toString('hex')}`;

    // 尝试从缓存获取cipher实例
    let cipher;
    if (global.cryptoCache.cipherInstances.has(cacheKey)) {
      cipher = global.cryptoCache.cipherInstances.get(cacheKey);
      global.cryptoCache.stats.cipherHits++;
    } else {
      cipher = nodeCrypto.createCipheriv(config.get('strings.errors.encryptionAlgorithm'), Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      // 缓存cipher实例
      global.cryptoCache.cipherInstances.set(cacheKey, cipher);
      global.cryptoCache.stats.cipherMisses++;
    }

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const result = iv.toString('hex') + ':' + encrypted.toString('hex');
    performanceMonitor.end('encryptText', {
      textLength: text.length,
      fromCache: !!cipher,
      cacheStats: global.cryptoCache.cipherInstances.getStats()
    });
    return result;
  } catch (error) {
    performanceMonitor.end('encryptText', { error: error.message });
    logger.error(config.get('strings.errors.encryptTextFailed'), error);
    throw error;
  }
}

/**
 * 解密文本数据
 * @param {string} encryptedText - 加密的文本
 * @returns {string} 解密后的文本
 */
function decryptText(encryptedText) {
  performanceMonitor.start('decryptText');
  try {
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedData = Buffer.from(textParts.join(':'), 'hex');
    // 优化缓存键生成
    const cacheKey = `crypto:${ENCRYPTION_KEY.substring(0, 16)}:${iv.toString('hex')}`;

    // 尝试从缓存获取decipher实例
    let decipher;
    if (global.cryptoCache.decipherInstances.has(cacheKey)) {
      decipher = global.cryptoCache.decipherInstances.get(cacheKey);
      global.cryptoCache.stats.decipherHits++;
    } else {
      decipher = nodeCrypto.createDecipheriv(config.get('strings.errors.encryptionAlgorithm'), Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      // 缓存decipher实例
      global.cryptoCache.decipherInstances.set(cacheKey, decipher);
      global.cryptoCache.stats.decipherMisses++;
    }

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const result = decrypted.toString();
    performanceMonitor.end('decryptText', {
      encryptedLength: encryptedText.length,
      fromCache: !!decipher,
      cacheStats: global.cryptoCache.decipherInstances.getStats()
    });
    return result;
  } catch (error) {
    performanceMonitor.end('decryptText', { error: error.message });
    logger.error(config.get('strings.errors.decryptTextFailed'), error);
    throw error;
  }
}

/**
 * 加密文件
 * @param {string} filePath - 要加密的文件路径
 * @param {string} outputPath - 加密后的输出文件路径
 * @returns {Promise<string>} 加密后的文件路径
 */
async function encryptFile(filePath, outputPath) {
  performanceMonitor.start('encryptFile');
  try {
    const iv = nodeCrypto.randomBytes(IV_LENGTH);
    const cipher = nodeCrypto.createCipheriv(config.get('strings.errors.encryptionAlgorithm'), Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    const input = fs.createReadStream(filePath);

    // 确保输出目录存在
    const outputDir = PathUtils.dirname(outputPath);
    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    const output = fs.createWriteStream(outputPath);

    // 将IV写入文件开头
    output.write(iv);
    input.pipe(cipher).pipe(output);

    return new Promise((resolve, reject) => {
      output.on('finish', () => {
        const stats = fs.statSync(filePath);
        performanceMonitor.end('encryptFile', {
          filePath,
          fileSize: stats.size
        });
        resolve(outputPath);
      });
      output.on('error', (error) => {
        performanceMonitor.end('encryptFile', { error: error.message });
        reject(error);
      });
    });
  } catch (error) {
    performanceMonitor.end('encryptFile', { error: error.message });
    logger.error(config.get('strings.errors.encryptFileFailed'), error);
    throw error;
  }
}

/**
 * 解密文件
 * @param {string} filePath - 要解密的文件路径
 * @param {string} outputPath - 解密后的输出文件路径
 * @returns {Promise<string>} 解密后的文件路径
 */
async function decryptFile(filePath, outputPath) {
  performanceMonitor.start('decryptFile');
  try {
    // 读取文件开头的IV
    const iv = Buffer.alloc(IV_LENGTH);
    const fileHandle = await fs.promises.open(filePath, 'r');
    await fileHandle.read(iv, 0, IV_LENGTH, 0);
    await fileHandle.close();

    const decipher = nodeCrypto.createDecipheriv(config.get('strings.errors.encryptionAlgorithm'), Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    const input = fs.createReadStream(filePath, { start: IV_LENGTH });
    const output = fs.createWriteStream(outputPath);

    input.pipe(decipher).pipe(output);

    return new Promise((resolve, reject) => {
      output.on('finish', () => {
        const stats = fs.statSync(filePath);
        performanceMonitor.end('decryptFile', {
          filePath,
          fileSize: stats.size
        });
        resolve(outputPath);
      });
      output.on('error', (error) => {
        performanceMonitor.end('decryptFile', { error: error.message });
        reject(error);
      });
    });
  } catch (error) {
    performanceMonitor.end('decryptFile', { error: error.message });
    logger.error(config.get('strings.errors.decryptFileFailed'), error);
    throw error;
  }
}

// 导出缓存统计函数
function getCryptoCacheStats() {
  return global.cryptoCache.stats;
}

module.exports = {
  encryptText,
  decryptText,
  encryptFile,
  decryptFile,
  getCryptoCacheStats
};