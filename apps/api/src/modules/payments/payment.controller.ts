import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../decorators/get-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('razorpay/order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Razorpay order for checkout' })
  @ApiResponse({ status: 200, description: 'Razorpay order created' })
  async createRazorpayOrder(
    @GetUser() user: any,
    @Body('amount') amount: number,
    @Body('orderId') orderId: string,
  ) {
    const receipt = orderId;
    return this.paymentService.createOrder(amount, 'INR', receipt);
  }

  @Post('razorpay/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  async handleRazorpayWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    if (!signature) {
      return { valid: false, event: 'missing_signature' };
    }
    const result = await this.paymentService.handlePaymentWebhook(payload, signature);
    return result;
  }
}
