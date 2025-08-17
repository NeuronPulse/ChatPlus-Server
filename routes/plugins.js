const express = require('express');
const router = express.Router();
const pluginManager = require('../utils/pluginManager');
const { ensureAdmin } = require('../middleware/auth');
const config = require('../config');

/**
 * @route GET /plugins
 * @desc 获取所有已安装的插件列表
 * @access 公开
 */
router.get('/', async (req, res) => {
  try {
    const plugins = pluginManager.getPlugins();
    res.json({
      success: true,
      data: plugins
    });
  } catch (error) {
return res.status(500).json({
        success: false,
        message: config.get('strings.errors.getPluginsFailed'),
        error: error.message
      });
  }
});

/**
 * @route GET /plugins/:name
 * @desc 获取指定插件的详细信息
 * @access 公开
 */
router.get('/:name', async (req, res) => {
  try {
    const pluginName = req.params.name;
    const plugin = pluginManager.getPlugin(pluginName);

    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: config.get('strings.errors.pluginNotFound')
      });
    }

    res.json({
      success: true,
      data: plugin
    });
  } catch (error) {
return res.status(500).json({
        success: false,
        message: config.get('strings.errors.getPluginDetailsFailed'),
        error: error.message
      });
  }
});

// 导出路由
module.exports = router;