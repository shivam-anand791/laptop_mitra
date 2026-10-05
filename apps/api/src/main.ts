import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { parseCorsOrigins, createCorsOriginCallback } from './common/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const rawCorsOrigins = configService.get<string>('CORS_ORIGINS');
  const configuredOrigins = parseCorsOrigins(rawCorsOrigins);

  // In production, fail closed immediately if CORS_ORIGINS is missing or empty
  if (isProduction && configuredOrigins.length === 0) {
    throw new Error('Missing required configuration: CORS_ORIGINS must be set in production');
  }

  // Fallback defaults for local development if not explicitly configured
  const effectiveOrigins = configuredOrigins.length > 0
    ? configuredOrigins
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  // Enable hardened CORS allowlist
  app.enableCors({
    origin: createCorsOriginCallback({
      configuredOrigins: effectiveOrigins,
      isProduction,
    }),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('LaptopMitra API')
    .setDescription('API for LaptopMitra e-commerce platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
