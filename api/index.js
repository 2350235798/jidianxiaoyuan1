const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/server/app.module.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

let cachedServer;

async function bootstrapServer() {
  if (cachedServer) return cachedServer;

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const clientDistPath = path.resolve(__dirname, '../dist/client');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get('/app/*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});
  }

  await app.init();
  cachedServer = app.getHttpAdapter().getInstance();
  return cachedServer;
}

module.exports = async (req, res) => {
  // 去掉 /api 前缀，让 NestJS 路由匹配
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }
  const server = await bootstrapServer();
  server(req, res);
};
