import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import express from 'express';
import path from 'path';
import fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
