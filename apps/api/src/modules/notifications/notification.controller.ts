import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register an Expo device token for the current user' })
  @ApiResponse({ status: 201, description: 'Device token registered successfully' })
  async registerToken(
    @Request() req: any,
    @Body() body: { token: string; platform?: string },
  ) {
    return this.notificationService.registerDeviceToken(req.user.id, body.token, body.platform);
  }
}
