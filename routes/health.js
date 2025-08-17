const express = require('express');
const router = express.Router();
const config = require('../config');

// 简单的健康检查路由
router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: config.get('strings.success.serverRunning') });
});

module.exports = router;