import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ServiceService } from './service.service';
import { GetUser } from '../../decorators/get-user.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UpdateServiceJobDto } from './dto/update-service-job.dto';

@ApiTags('admin-service')
@Controller('admin/service')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class AdminServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get('jobs')
  @Roles('ADMIN', 'TECHNICIAN')
  @ApiOperation({ summary: 'List all service jobs (Admin & Technician)' })
  @ApiResponse({ status: 200, description: 'Paginated list of service jobs' })
  async getServiceJobs(
    @GetUser() user: any,
    @Query('status') status?: string,
    @Query('technicianId') technicianId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // If technician, filter to their assigned jobs unless explicitly querying
    const effectiveTechnicianId =
      user.role === 'TECHNICIAN' ? user.id : technicianId;

    return this.serviceService.getAdminServiceJobs({
      status,
      technicianId: effectiveTechnicianId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('jobs/:id')
  @Roles('ADMIN', 'TECHNICIAN')
  @ApiOperation({ summary: 'Get full service job record' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Service job record' })
  async getServiceJob(@GetUser() user: any, @Param('id') id: string) {
    return this.serviceService.getServiceJobById(user.id, user.role, id);
  }

  @Put('jobs/:id')
  @Roles('ADMIN', 'TECHNICIAN')
  @ApiOperation({ summary: 'Update service job status, checklist, or assignment' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Updated service job' })
  async updateServiceJob(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateServiceJobDto,
  ) {
    return this.serviceService.updateServiceJobStatus(user.id, user.role, id, dto);
  }

  @Get('technicians')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List active technicians for assignment' })
  @ApiResponse({ status: 200, description: 'Technicians list' })
  async getTechnicians() {
    return this.serviceService.getTechnicians();
  }

  @Get('settings')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get service settings (Admin)' })
  @ApiResponse({ status: 200, description: 'Service settings' })
  async getSettings() {
    return this.serviceService.getSettings();
  }

  @Put('settings')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update service settings (Admin)' })
  @ApiResponse({ status: 200, description: 'Updated service settings' })
  async updateSettings(@Body() body: any) {
    return this.serviceService.updateSettings(body);
  }

  @Post('reminders/trigger')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Trigger service expiry reminder scan (Admin / Cron)' })
  @ApiResponse({ status: 200, description: 'Scan result and dispatched reminder count' })
  async triggerReminders() {
    return this.serviceService.processServiceReminders();
  }
}

