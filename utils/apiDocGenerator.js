const fs = require('fs');
const path = require('path');
const logger = require('../logger');
const ConfigManager = require('../config');
const config = new ConfigManager();
const jsdoc2md = require('jsdoc-to-markdown');

/**
 * API文档生成器
 * 负责从代码注释生成API文档
 */
class ApiDocGenerator {
  constructor() {
    this.outputPath = path.join(__dirname, '..', 'api-documentation.md');
    this.sourceFiles = [
      path.join(__dirname, '..', 'routes', '**', '*.js'),
      path.join(__dirname, '..', 'controllers', '**', '*.js'),
      path.join(__dirname, '..', 'modules', '**', '*.js')
    ];
  }

  /**
   * 生成API文档
   * @param {boolean} force - 是否强制生成，即使文件已存在
   * @returns {Promise<void>}
   */
  async generate(force = false) {
    try {
      // 检查是否需要生成
      if (fs.existsSync(this.outputPath) && !force) {
        const stats = fs.statSync(this.outputPath);
        const now = new Date();
        // 如果文件是在24小时内生成的，则不重新生成
        if (now - stats.mtime < 24 * 60 * 60 * 1000) {
          logger.debug('API documentation is up to date, skipping generation');
          return;
        }
      }

      logger.info('Generating API documentation...');

      // 生成文档内容
      const docContent = await this.generateContent();

      // 写入文件
      fs.writeFileSync(this.outputPath, docContent, 'utf8');

      logger.info(`API documentation generated successfully: ${this.outputPath}`);
    } catch (error) {
      logger.error(`Failed to generate API documentation: ${error.message}`);
      logger.debug(error.stack);
    }
  }

  /**
   * 生成文档内容
   * @returns {Promise<string>}
   */
  async generateContent() {
    try {
      // 基础信息
      const baseInfo = `# ChatPlus 聊天服务端 API 文档

## 基础信息
- 服务器地址: \`http://localhost:${config.get('PORT', 3000)}\`
- 认证方式: JWT (JSON Web Token)
- 所有请求需要设置请求头: \`Authorization: Bearer <token>\` (登录和注册接口除外)

`;

      // 使用jsdoc-to-markdown生成API文档
      const apiDocs = await jsdoc2md.render({ files: this.sourceFiles });

      // 合并内容
      return baseInfo + apiDocs;
    } catch (error) {
      logger.error(`Failed to generate API documentation content: ${error.message}`);
      throw error;
    }
  }

  /**
   * 初始化API文档生成器
   * @returns {Promise<void>}
   */
  async init() {
    // 检查是否安装了jsdoc-to-markdown
    try {
      require('jsdoc-to-markdown');
    } catch (error) {
      logger.warn('jsdoc-to-markdown is not installed. Please run: npm install jsdoc-to-markdown --save-dev');
      return;
    }

    // 生成初始文档
    await this.generate(true);

    // 设置定时任务，每天凌晨2点生成文档
    const schedule = require('node-schedule');
    schedule.scheduleJob('0 2 * * *', () => {
      this.generate();
    });

    logger.info('API documentation generator initialized');
  }
}

module.exports = new ApiDocGenerator();