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
  Param,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GetUser } from '../../decorators/get-user.decorator';
import { Public } from '../../decorators/public.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import {
  CreateRazorpayOrderDto,
  VerifyRazorpayPaymentDto,
  VerifyRentalSubscriptionDto,
} from './dto/razorpay.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  private assertAuthenticatedCustomer(user: any) {
    if (!user || user.role === 'GUEST' || user.isGuest) {
      throw new ForbiddenException('Please sign in with a customer account before making a payment.');
    }
  }

  @Post('razorpay/order')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create Razorpay order for checkout (server-validated amount and ownership)' })
  @ApiResponse({ status: 200, description: 'Razorpay order created' })
  async createRazorpayOrder(
    @GetUser() user: any,
    @Body() body: CreateRazorpayOrderDto,
  ) {
    this.assertAuthenticatedCustomer(user);
    if (!body?.orderId) {
      throw new BadRequestException('orderId is required');
    }
    return this.paymentService.createOrderForUser(body.orderId, user.id, user.role);
  }

  @Get('tax-policy')
  @Public()
  @ApiOperation({ summary: 'Get the current public GST calculation policy' })
  @ApiResponse({ status: 200, description: 'GST policy used for backend checkout calculations' })
  async getTaxPolicy() {
    return this.paymentService.getTaxPolicy();
  }

  @Post('razorpay/subscription')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Razorpay subscription for an owned rental order' })
  async createRentalSubscription(@GetUser() user: any, @Body() body: CreateRazorpayOrderDto) {
    this.assertAuthenticatedCustomer(user);
    if (!body?.orderId) throw new BadRequestException('orderId is required');
    return this.paymentService.createRentalSubscriptionForUser(body.orderId, user.id, user.role);
  }

  @Post('razorpay/subscription/verify')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay rental mandate and first payment' })
  async verifyRentalSubscription(
    @GetUser() user: any,
    @Body() body: VerifyRentalSubscriptionDto,
  ) {
    this.assertAuthenticatedCustomer(user);
    if (
      !body?.orderId
      || !body?.razorpaySubscriptionId
      || !body?.razorpayPaymentId
      || !body?.razorpaySignature
    ) {
      throw new BadRequestException('Missing rental payment verification fields');
    }
    return this.paymentService.verifyRentalSubscription(
      body.orderId,
      body.razorpaySubscriptionId,
      body.razorpayPaymentId,
      body.razorpaySignature,
      user.id,
      user.role,
    );
  }

  @Post('rental/:subscriptionId/termination-request')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN', 'GUEST')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request admin review for ending a rental subscription' })
  async requestRentalTermination(@GetUser() user: any, @Param('subscriptionId') subscriptionId: string) {
    return this.paymentService.requestRentalTermination(subscriptionId, user.id, user.role);
  }

  @Post('admin/rentals/:subscriptionId/approve-termination')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an approved rental termination with Razorpay' })
  async approveRentalTermination(@Param('subscriptionId') subscriptionId: string) {
    return this.paymentService.approveRentalTermination(subscriptionId);
  }

  @Get('admin/rentals/termination-requests')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List rental terminations awaiting admin review' })
  async getRentalTerminationRequests() {
    return this.paymentService.getRentalTerminationRequests();
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
    @Body() body: VerifyRazorpayPaymentDto,
  ) {
    this.assertAuthenticatedCustomer(user);
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
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  async handleRazorpayWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentService.handlePaymentWebhook(req?.rawBody, signature);
  }
}
