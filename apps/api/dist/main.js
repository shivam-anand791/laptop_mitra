"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const helmet_1 = require("helmet");
const app_module_1 = require("./app.module");
const cors_1 = require("./common/cors");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const logger = new common_1.Logger('Bootstrap');
    const isProduction = configService.get('NODE_ENV') === 'production';
    const rawCorsOrigins = configService.get('CORS_ORIGINS');
    const configuredOrigins = (0, cors_1.parseCorsOrigins)(rawCorsOrigins);
    if (isProduction && configuredOrigins.length === 0) {
        throw new Error('Missing required configuration: CORS_ORIGINS must be set in production');
    }
    const effectiveOrigins = configuredOrigins.length > 0
        ? configuredOrigins
        : ['http://localhost:3000', 'http://127.0.0.1:3000'];
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false,
    }));
    app.enableCors({
        origin: (0, cors_1.createCorsOriginCallback)({
            configuredOrigins: effectiveOrigins,
            isProduction,
        }),
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('LaptopMitra API')
        .setDescription('API for LaptopMitra e-commerce platform')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    const httpAdapter = app.getHttpAdapter();
    if (typeof httpAdapter.getInstance === 'function') {
        const expressApp = httpAdapter.getInstance();
        if (typeof expressApp?.set === 'function') {
            expressApp.set('trust proxy', 1);
        }
    }
    const port = configService.get('PORT', 3001);
    await app.listen(port, '0.0.0.0');
    logger.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map