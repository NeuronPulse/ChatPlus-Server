const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 自动加载所有路由模块
const loadRoutes = () => {
  const routesDir = __dirname;
  const files = fs.readdirSync(routesDir);

  files.forEach(file => {
    if (file === 'index.js' || !file.endsWith('.js')) return;

    const routeName = file.replace('.js', '');
    const routeModule = require(path.join(routesDir, file));

    // 注册路由，使用文件名作为路由前缀
    router.use(`/${routeName}`, routeModule);
    console.log(`Route loaded: /${routeName}`);
  });
};

// 加载路由
loadRoutes();

// 导出路由
module.exports = router;