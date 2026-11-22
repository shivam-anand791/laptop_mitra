import { Controller, Get, HttpCode, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';
import { MailService } from './modules/mail/mail.service';
import { PaymentService } from './modules/payments/payment.service';
import { SchemaCompatibilityService } from './prisma/schema-compatibility.service';
import { getFallbackMetrics } from './common/fallback';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly mailService?: MailService,
    @Optional() private readonly schemaCompatibility?: SchemaCompatibilityService,
    @Optional() private readonly paymentService?: PaymentService,
  ) {}

  @Public()
  @SkipThrottle()
  @Get('favicon.ico')
  @HttpCode(204)
  @ApiExcludeEndpoint()
  getFavicon() {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is reachable and healthy' })
  getHealth() {
    const isEmailVerificationEnabled =
      this.configService?.get<string>('ENABLE_EMAIL_VERIFICATION') === 'true' ||
      process.env.ENABLE_EMAIL_VERIFICATION === 'true';

    const capabilities: string[] = [];
    if (isEmailVerificationEnabled) {
      capabilities.push('email-verification');
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'laptopmitra-api',
      version: '1.0.0',
      capabilities,
    };
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness check verifying database connectivity and service readiness' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service or database unavailable' })
  async getReadiness() {
    const isEmailVerificationEnabled =
      this.configService?.get<string>('ENABLE_EMAIL_VERIFICATION') === 'true' ||
      process.env.ENABLE_EMAIL_VERIFICATION === 'true';

    const capabilities: string[] = [];
    if (isEmailVerificationEnabled) {
      capabilities.push('email-verification');
    }

    const mailStatus = this.mailService ? this.mailService.getHealthStatus() : 'not configured';
    const razorpayCheck = this.paymentService ? this.paymentService.getGatewayHealthStatus() : undefined;
    const razorpayStatus = razorpayCheck ? razorpayCheck.status : 'not configured';

    try {
      if (this.prisma) {
        await this.prisma.$queryRaw`SELECT 1`;
      }

      const schemaStatus = this.schemaCompatibility
        ? await this.schemaCompatibility.refresh()
        : { status: 'up-to-date' as const, pendingMigrations: [], missingFeatures: [] };

      if (schemaStatus.status === 'MIGRATIONS_PENDING') {
        const pendingNames =
          schemaStatus.pendingMigrations.length > 0
            ? schemaStatus.pendingMigrations
            : schemaStatus.missingFeatures.map((feature) => `schema_drift:${feature}`);

        throw new ServiceUnavailableException({
          status: 'unready',
          database: 'connected',
          code: 'MIGRATIONS_PENDING',
          pendingMigrations: pendingNames,
          mail: mailStatus,
          razorpay: razorpayStatus,
          ...(razorpayCheck ? { razorpayCheck } : {}),
          fallbackMetrics: getFallbackMetrics(),
          timestamp: new Date().toISOString(),
          service: 'laptopmitra-api',
          version: '1.0.0',
          capabilities,
        });
      }

      return {
        status: 'ready',
        database: 'connected',
        schema: schemaStatus.status,
        pendingMigrations: schemaStatus.pendingMigrations,
        mail: mailStatus,
        mailMetrics: this.mailService?.getDailyMetrics ? this.mailService.getDailyMetrics() : undefined,
        razorpay: razorpayStatus,
        ...(razorpayCheck ? { razorpayCheck } : {}),
        fallbackMetrics: getFallbackMetrics(),
        timestamp: new Date().toISOString(),
        service: 'laptopmitra-api',
        version: '1.0.0',
        capabilities,
      };
    } catch (error: any) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException({
        status: 'unready',
        database: 'disconnected',
        mail: mailStatus,
        message: error?.message || 'Database unreachable',
      });
    }
  }
}
