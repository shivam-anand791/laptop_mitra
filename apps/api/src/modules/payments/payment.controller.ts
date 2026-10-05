import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetUser } from '../../decorators/get-user.decorator';
import { Public } from '../../decorators/public.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('razorpay/order')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Razorpay order for checkout (server-validated amount and ownership)' })
  @ApiResponse({ status: 200, description: 'Razorpay order created' })
  async createRazorpayOrder(
    @GetUser() user: any,
    @Body('orderId') orderId: string,
    @Body('amount') _clientAmount?: number,
  ) {
    if (!orderId) {
      throw new BadRequestException('orderId is required');
    }
    return this.paymentService.createOrderForUser(orderId, user.id, user.role);
  }

  @Post('razorpay/verify')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature server-side' })
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyPayment(
    @GetUser() user: any,
    @Body()
    body: {
      orderId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    if (!body?.orderId || !body?.razorpayOrderId || !body?.razorpayPaymentId || !body?.razorpaySignature) {
      throw new BadRequestException('Missing payment verification fields');
    }
    return this.paymentService.verifyPayment(
      body.orderId,
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
      user.id,
      user.role,
    );
  }

  @Get('history')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment transaction history for current user' })
  @ApiResponse({ status: 200, description: 'Payment records' })
  async getPaymentHistory(@GetUser() user: any) {
    return this.paymentService.getPaymentHistory(user.id);
  }

  @Post('razorpay/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  async handleRazorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentService.handlePaymentWebhook(req?.rawBody, signature);
  }
}
