const serverlessExpress = require('@vendia/serverless-express');
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
    expressApp.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  await app.init();
  
  cachedServer = serverlessExpress({
    app: app.getHttpAdapter().getInstance(),
  });
  
  return cachedServer;
}

exports.handler = async (event, context) => {
  const server = await bootstrapServer();
  return server(event, context);
};
