import { Controller, Post, Get, Put, Patch, Param, Body, UseGuards, Query, Headers, ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { GetUser } from '../../decorators/get-user.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UpdateOrderStatusDto } from '../admin/dto/update-order-status.dto';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth()
@UseGuards(RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles('CUSTOMER', 'ADMIN')
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
      email?: string;
      paymentMethod?: string;
      idempotencyKey?: string;
      addressId?: string;
      cartItems?: Array<{
        productId: string;
        variantId?: string | null;
        quantity: number;
        purchaseMode?: 'sell' | 'lease';
        configuration?: string;
        hasWarranty?: boolean;
      }>;
    },
    @Headers('idempotency-key') idempotencyKeyHeader?: string,
  ) {
    if (!user || user.role === 'GUEST' || user.isGuest) {
      throw new ForbiddenException('Please sign in with a customer account before placing an order.');
    }
    const idempotencyKey = idempotencyKeyHeader || body.idempotencyKey;
    return this.orderService.createOrder(
      user.id,
      body.referralCode,
      body.discountCode,
      body.shippingAddress,
      body.phone,
      body.notes,
      body.email,
      user,
      body.paymentMethod,
      idempotencyKey,
      body.addressId,
      body.cartItems,
    );
  }

  @Get()
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
  @ApiOperation({ summary: 'Get orders for authenticated user' })
  @ApiResponse({ status: 200 })
  async getOrders(@GetUser() user: any, @Query('status') status?: string) {
    return this.orderService.findByUser(user.id, status);
  }

  @Get('counts')
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
  @ApiOperation({ summary: 'Get order counts grouped by status tabs for authenticated user' })
  @ApiResponse({ status: 200 })
  async getOrderCounts(@GetUser() user: any) {
    return this.orderService.getOrderCountsByUser(user.id);
  }

  @Get(':id')
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
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
    @Body() dto: UpdateOrderStatusDto | any,
  ) {
    const status = typeof dto === 'string' ? dto : dto?.status;
    const courierData = typeof dto === 'object' && (dto.courierName || dto.trackingNumber)
      ? { courierName: dto.courierName, trackingNumber: dto.trackingNumber }
      : undefined;
    return courierData !== undefined
      ? this.orderService.updateStatus(id, status, user?.id, user?.role, courierData)
      : this.orderService.updateStatus(id, status, user?.id, user?.role);
  }

  @Patch(':id/cancel')
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
  @ApiOperation({ summary: 'Cancel order (ownership checked, only PENDING/CONFIRMED)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  async cancelOrder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.cancelOrder(id, user.id, user.role);
  }

  @Post(':id/items/:itemId/cancel')
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
  @ApiOperation({ summary: 'Cancel a single item in an order before dispatch' })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'itemId', type: String })
  @ApiResponse({ status: 200, description: 'Order item cancelled successfully' })
  async cancelOrderItem(
    @GetUser() user: any,
    @Param('id') orderId: string,
    @Param('itemId') itemId: string,
    @Body('reason') reason?: string,
  ) {
    return this.orderService.cancelOrderItem(
      orderId,
      itemId,
      user.id,
      user.role,
      reason || 'Customer requested item cancellation',
    );
  }

  @Post(':id/return')
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
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
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
  @ApiOperation({ summary: 'Reorder items from a past order into current cart' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Items added to cart' })
  async reorder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.reorder(id, user.id);
  }

  @Get(':id/invoice')
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
  @ApiOperation({ summary: 'Get order tax invoice details' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Tax invoice' })
  async getInvoice(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.getInvoice(id, user.id);
  }

  @Get(':id/track')
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
  @ApiOperation({ summary: 'Track order shipment live status' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Shipment tracking' })
  async getTracking(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.getTracking(id, user.id);
  }
}
