import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ServiceService } from './service.service';
import { GetUser } from '../../decorators/get-user.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { BookServiceDto } from './dto/book-service.dto';
import { RescheduleServiceDto } from './dto/reschedule-service.dto';
import { CancelServiceDto } from './dto/cancel-service.dto';

@ApiTags('service')
@Controller()
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get('service/settings')
  @ApiOperation({ summary: 'Public service settings, slot windows, and terms' })
  @ApiResponse({ status: 200, description: 'Service configuration settings' })
  async getSettings() {
    return this.serviceService.getSettings();
  }

  @Get('account/laptops')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'List customer laptops with warranty coverage and free service benefits' })
  @ApiResponse({ status: 200, description: 'Customer laptops array' })
  async getUserLaptops(@GetUser() user: any) {
    return this.serviceService.getUserLaptops(user.id);
  }

  @Get('account/laptops/:unitId')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Customer laptop 360 view with warranty and service history' })
  @ApiParam({ name: 'unitId', type: String })
  @ApiResponse({ status: 200, description: 'Single laptop detail object' })
  async getLaptopDetails(@GetUser() user: any, @Param('unitId') unitId: string) {
    return this.serviceService.getLaptopDetails(user.id, unitId, user.role);
  }

  @Post('account/laptops/:unitId/service-bookings')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Book free general doorstep service for an eligible laptop' })
  @ApiParam({ name: 'unitId', type: String })
  @ApiResponse({ status: 201, description: 'Service job created' })
  async bookService(
    @GetUser() user: any,
    @Param('unitId') unitId: string,
    @Body() dto: BookServiceDto,
  ) {
    return this.serviceService.bookService(user.id, user.role, unitId, dto);
  }

  @Get('account/service-jobs')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'List customer booked service jobs' })
  @ApiResponse({ status: 200, description: 'Array of customer service jobs' })
  async getUserServiceJobs(@GetUser() user: any) {
    return this.serviceService.getUserServiceJobs(user.id);
  }

  @Get('account/service-jobs/:id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN', 'TECHNICIAN')
  @ApiOperation({ summary: 'Get single service job details with events timeline' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Service job detail' })
  async getServiceJobById(@GetUser() user: any, @Param('id') id: string) {
    return this.serviceService.getServiceJobById(user.id, user.role, id);
  }

  @Post('account/service-jobs/:id/reschedule')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Reschedule service pickup date and slot' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Rescheduled service job' })
  async rescheduleService(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: RescheduleServiceDto,
  ) {
    return this.serviceService.rescheduleService(user.id, user.role, id, dto);
  }

  @Post('account/service-jobs/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Cancel service booking and restore free service entitlement' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Cancelled service job' })
  async cancelService(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: CancelServiceDto,
  ) {
    return this.serviceService.cancelService(user.id, user.role, id, dto);
  }
}

