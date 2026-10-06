import { Body, Controller, Get, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { NotificationPreferences } from '../../types';


@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('CUSTOMER', 'ADMIN')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register an Expo device token for the current user' })
  @ApiResponse({ status: 201, description: 'Device token registered successfully' })
  async registerToken(
    @Request() req: any,
    @Body() body: { token: string; platform?: string },
  ) {
    return this.notificationService.registerDeviceToken(req.user.id, body.token, body.platform);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  async getPreferences(@Request() req: any) {
    return this.notificationService.getPreferences(req.user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update current user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @Request() req: any,
    @Body() body: Partial<NotificationPreferences>,
  ) {
    return this.notificationService.updatePreferences(req.user.id, body);
  }
}
