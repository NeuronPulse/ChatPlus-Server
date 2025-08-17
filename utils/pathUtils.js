const path = require('path');
const os = require('os');

/**
 * 跨平台路径处理工具
 */
class PathUtils {
  /**
   * 规范化路径，处理不同操作系统的路径分隔符
   * @param {string} pathStr - 路径字符串
   * @returns {string} 规范化后的路径
   */
  static normalize(pathStr) {
    return path.normalize(pathStr);
  }

  /**
   * 连接路径片段
   * @param {...string} paths - 路径片段
   * @returns {string} 连接后的路径
   */
  static join(...paths) {
    return path.join(...paths);
  }

  /**
   * 获取路径的目录部分
   * @param {string} pathStr - 路径字符串
   * @returns {string} 目录路径
   */
  static dirname(pathStr) {
    return path.dirname(pathStr);
  }

  /**
   * 获取路径的文件名部分
   * @param {string} pathStr - 路径字符串
   * @param {string} [ext] - 可选的文件扩展名
   * @returns {string} 文件名
   */
  static basename(pathStr, ext) {
    return path.basename(pathStr, ext);
  }

  /**
   * 获取路径的扩展名
   * @param {string} pathStr - 路径字符串
   * @returns {string} 文件扩展名
   */
  static extname(pathStr) {
    return path.extname(pathStr);
  }

  /**
   * 检查路径是否为绝对路径
   * @param {string} pathStr - 路径字符串
   * @returns {boolean} 是否为绝对路径
   */
  static isAbsolute(pathStr) {
    return path.isAbsolute(pathStr);
  }

  /**
   * 获取相对路径
   * @param {string} from - 起始路径
   * @param {string} to - 目标路径
   * @returns {string} 相对路径
   */
  static relative(from, to) {
    return path.relative(from, to);
  }

  /**
   * 获取系统临时目录
   * @returns {string} 临时目录路径
   */
  static getTempDir() {
    return os.tmpdir();
  }

  /**
   * 获取用户主目录
   * @returns {string} 用户主目录路径
   */
  static getUserHomeDir() {
    return os.homedir();
  }

  /**
   * 确保目录存在，如果不存在则创建
   * @param {string} dirPath - 目录路径
   * @returns {Promise<void>}
   */
  static async ensureDir(dirPath) {
    const fs = require('fs').promises;
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

module.exports = PathUtils;