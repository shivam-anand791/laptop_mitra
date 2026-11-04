import { Controller, Get, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

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

    try {
      if (this.prisma) {
        await this.prisma.$queryRaw`SELECT 1`;
      }
      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
        service: 'laptopmitra-api',
        version: '1.0.0',
        capabilities,
      };
    } catch (error: any) {
      throw new ServiceUnavailableException({
        status: 'unready',
        database: 'disconnected',
        message: error?.message || 'Database unreachable',
      });
    }
  }
}
