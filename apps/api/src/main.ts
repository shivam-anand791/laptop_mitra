import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { parseCorsOrigins, createCorsOriginCallback } from './common/cors';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
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

  // Register Helmet security headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // swagger UI and dev API compatibility
    }),
  );

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

  // Swagger documentation - mounted only when NODE_ENV !== 'production' or ENABLE_SWAGGER === 'true'
  const enableSwagger = configService.get<string>('ENABLE_SWAGGER') === 'true';
  if (!isProduction || enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('LaptopMitra API')
      .setDescription('API for LaptopMitra e-commerce platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Configure trust proxy on Express adapter for accurate client IP resolution behind reverse proxies
  app.set('trust proxy', 1);

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
