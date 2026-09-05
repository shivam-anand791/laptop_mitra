import { Controller, Post, Get, Put, Param, Body, UseGuards, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../decorators/get-user.decorator';

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
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  async getOrder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200 })
  async updateStatus(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.orderService.updateStatus(id, status);
  }
}
