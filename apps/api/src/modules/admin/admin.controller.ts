import { Controller, Get, Put, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@UseGuards(RolesGuard)
@Roles('ADMIN')
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Update user status (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User status updated' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all products' })
  async getAllProducts() {
    return this.adminService.getAllProducts();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders (admin only)' })
  @ApiResponse({ status: 200, description: 'List of all orders' })
  async getAllOrders() {
    return this.adminService.getAllOrders();
  }

  @Put('orders/:id/status')
  @ApiOperation({ summary: 'Update order status (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateOrderStatus(id, status);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }
}