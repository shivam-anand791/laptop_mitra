import { Controller, Get, Post, Put, Delete, Body, UseGuards, Param, Query, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { GetUser } from '../../decorators/get-user.decorator';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
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

  @Get('users/:id/support-history')
  @ApiOperation({ summary: 'Get read-only support history for a customer' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Customer ticket and return history' })
  async getUserSupportHistory(@Param('id') id: string) {
    return this.adminService.getUserSupportHistory(id);
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

  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user system role (ADMIN only, audited, no self-demotion)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'User role updated' })
  @ApiResponse({ status: 400, description: 'Invalid role or self-demotion attempted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserRole(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(id, dto.role, admin?.id);
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
    const courierData =
      dto.courierName || dto.trackingNumber
        ? { courierName: dto.courierName, trackingNumber: dto.trackingNumber }
        : undefined;
    if (courierData) {
      return this.adminService.updateOrderStatus(id, dto.status, admin?.id, courierData);
    }
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

  @Get('inquiries')
  @ApiOperation({ summary: 'Get corporate procurement inquiries' })
  @ApiResponse({ status: 200, description: 'List of corporate inquiries' })
  async getCorporateInquiries(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.adminService.getCorporateInquiries({
      status,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Put('inquiries/:id/status')
  @ApiOperation({ summary: 'Update status of a corporate inquiry' })
  @ApiResponse({ status: 200, description: 'Inquiry status updated' })
  async updateCorporateInquiryStatus(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body('status') status: 'PENDING' | 'CONTACTED' | 'QUOTED' | 'CLOSED',
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.adminService.updateCorporateInquiryStatus(id, status, admin?.id, adminNotes);
  }

  // ---------------------------------------------------------------------------
  // Affiliate & Withdrawal Management (Section 5.1)
  // ---------------------------------------------------------------------------

  @Get('affiliates')
  @ApiOperation({ summary: 'List all affiliates and their balance overview (masked)' })
  @ApiResponse({ status: 200, description: 'Affiliates list' })
  async getAffiliates(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAffiliates({
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      search,
    });
  }

  @Get('affiliates/:id')
  @ApiOperation({ summary: 'Get affiliate details, masked payout settings, and withdrawal ledger' })
  @ApiResponse({ status: 200, description: 'Affiliate detail (masked)' })
  async getAffiliateDetail(@Param('id') id: string) {
    return this.adminService.getAffiliateDetail(id);
  }

  @Get('withdrawals/:id/payment-details')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Decrypt payment snapshot for withdrawal processing (audit-logged)' })
  @ApiResponse({ status: 200, description: 'Decrypted payment details' })
  async getWithdrawalPaymentDetails(
    @GetUser() admin: any,
    @Param('id') id: string,
  ) {
    return this.adminService.getWithdrawalPaymentDetails(id, admin?.id);
  }

  @Get('withdrawals/:id/payment-details/qr')
  @ApiOperation({ summary: 'Stream payout QR image for authorized admin (audit-logged)' })
  async getWithdrawalQr(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { filePath, mimeType } = await this.adminService.getWithdrawalQrFile(id, admin?.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Put('withdrawals/:id/status')
  @ApiOperation({ summary: 'Approve or reject affiliate withdrawal request' })
  @ApiResponse({ status: 200, description: 'Withdrawal status updated' })
  async updateWithdrawalStatus(
    @GetUser() admin: any,
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED',
    @Body('adminNotes') adminNotes?: string,
  ) {
    return this.adminService.updateWithdrawalStatus(id, status, admin?.id, adminNotes);
  }
}