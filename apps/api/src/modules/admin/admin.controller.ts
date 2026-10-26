import { Controller, Get, Post, Put, Delete, Body, UseGuards, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { GetUser } from '../../decorators/get-user.decorator';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@UseGuards(RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics (alias)' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get aggregated business analytics and sales metrics' })
  @ApiResponse({ status: 200, description: 'Aggregated analytics metrics' })
  async getAnalytics(@Query() query: AdminAnalyticsQueryDto) {
    return this.adminService.getAnalytics(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination, search, and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async getAllUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getAllUsers(query);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Put('users/:id/status')
  @ApiOperation({ summary: 'Update user account status (ACTIVE, SUSPENDED, DELETED)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status or modification forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(id, dto.status, admin?.id);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products with pagination, search, and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of products' })
  async getAllProducts(@Query() query: AdminProductQueryDto) {
    return this.adminService.getAllProducts(query);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('products')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(@Body() data: any) {
    return this.adminService.createProduct(data);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Put('products/:id')
  @ApiOperation({ summary: 'Update product properties' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async updateProduct(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateProduct(id, data);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete or discontinue a product' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Product deleted or discontinued' })
  async deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders with pagination, search, and filters' })
  @ApiResponse({ status: 200, description: 'Paginated lean list of orders' })
  async getAllOrders(@Query() query: AdminOrderQueryDto) {
    return this.adminService.getAllOrders(query);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get full order details by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Full order details' })
  async getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Put('orders/:id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status or unsupported transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatus(id, dto.status, admin?.id);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get administrative platform settings' })
  @ApiResponse({ status: 200, description: 'Current system settings' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Put('settings')
  @ApiOperation({ summary: 'Update administrative platform settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(
    @GetUser() admin: any,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.adminService.updateSettings(dto, admin?.id);
  }
}