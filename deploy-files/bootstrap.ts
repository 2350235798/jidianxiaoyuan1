import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded, static as serveStatic } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { viewMiddleware } from './modules/view/view.middleware';

export async function createNestApp() {
  const app = await NestFactory.create(AppModule);

  const bodyLimit = process.env.BODY_SIZE_LIMIT || '10mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ limit: bodyLimit, extended: true }));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      forbidUnknownValues: true,
    }),
  );

  const clientBasePath = process.env.CLIENT_BASE_PATH || '';
  const normalizedBase = clientBasePath.replace(/\/+$/, '');
  const globalPrefix = normalizedBase ? `${normalizedBase}/api` : 'api';
  app.setGlobalPrefix(globalPrefix);

  const clientDir = join(process.cwd(), 'dist/client');
  if (normalizedBase) {
    app.use(normalizedBase, serveStatic(clientDir, { index: false }));
  } else {
    app.use(serveStatic(clientDir, { index: false }));
  }
  app.use(viewMiddleware);

  return app;
}

async function bootstrap() {
  const app = await createNestApp();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Server running on http://localhost:${port}`);
}

bootstrap();
