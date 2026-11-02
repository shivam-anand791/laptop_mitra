import { Controller, Get, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(@Optional() private readonly configService?: ConfigService) {}

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
}
