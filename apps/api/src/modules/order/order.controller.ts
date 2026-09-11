import { Controller, Post, Get, Put, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../decorators/get-user.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create order (checkout) with discount/referral' })
  @ApiResponse({ status: 201 })
  async createOrder(
    @GetUser() user: any,
    @Body() body: {
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

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get orders for authenticated user' })
  @ApiResponse({ status: 200 })
  async getOrders(@GetUser() user: any, @Query('status') status?: string) {
    return this.orderService.findByUser(user.id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID (ownership checked)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Forbidden: You can only view your own orders' })
  async getOrder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.findOne(id, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id/status')
  @ApiOperation({ summary: 'Update order status (admin only)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required' })
  async updateStatus(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.orderService.updateStatus(id, status, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order (ownership checked, only PENDING/CONFIRMED)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request: Order cannot be cancelled in current status' })
  @ApiResponse({ status: 403, description: 'Forbidden: You can only cancel your own orders' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.cancelOrder(id, user.id, user.role);
  }
}
