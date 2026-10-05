import { Controller, Post, Get, Put, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { GetUser } from '../../decorators/get-user.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('CUSTOMER', 'ADMIN')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create order (checkout) with discount/referral' })
  @ApiResponse({ status: 201 })
  async createOrder(
    @GetUser() user: any,
    @Body()
    body: {
      referralCode?: string;
      discountCode?: string;
      shippingAddress?: any;
      phone?: string;
      notes?: string;
    },
  ) {
    return this.orderService.createOrder(
      user.id,
      body.referralCode,
      body.discountCode,
      body.shippingAddress,
      body.phone,
      body.notes,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get orders for authenticated user' })
  @ApiResponse({ status: 200 })
  async getOrders(@GetUser() user: any, @Query('status') status?: string) {
    return this.orderService.findByUser(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID (ownership checked)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Forbidden: You can only view your own orders' })
  async getOrder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.findOne(id, user.id, user.role);
  }

  @Put(':id/status')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  async updateStatus(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.orderService.updateStatus(id, status, user.id, user.role);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order (ownership checked, only PENDING/CONFIRMED)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.cancelOrder(id, user.id, user.role);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Request return / replacement for a delivered order' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Return requested' })
  async requestReturn(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.orderService.requestReturn(id, user.id, reason || 'Quality / performance issue');
  }

  @Post(':id/reorder')
  @ApiOperation({ summary: 'Reorder items from a past order into current cart' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Items added to cart' })
  async reorder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.reorder(id, user.id);
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Get order tax invoice details' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Tax invoice' })
  async getInvoice(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.getInvoice(id, user.id);
  }

  @Get(':id/track')
  @ApiOperation({ summary: 'Track order shipment live status' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Shipment tracking' })
  async getTracking(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.getTracking(id, user.id);
  }
}
