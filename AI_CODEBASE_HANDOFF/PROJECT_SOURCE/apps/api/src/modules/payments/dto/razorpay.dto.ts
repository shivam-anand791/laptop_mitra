import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRazorpayOrderDto {
  @ApiProperty({ description: 'Internal LaptopMitra Order ID' })
  @IsString()
  @IsNotEmpty({ message: 'orderId is required' })
  orderId!: string;
}

export class VerifyRazorpayPaymentDto {
  @ApiProperty({ description: 'Internal LaptopMitra Order ID' })
  @IsString()
  @IsNotEmpty({ message: 'orderId is required' })
  orderId!: string;

  @ApiProperty({ description: 'Razorpay Order ID' })
  @IsString()
  @IsNotEmpty({ message: 'razorpayOrderId is required' })
  razorpayOrderId!: string;

  @ApiProperty({ description: 'Razorpay Payment ID' })
  @IsString()
  @IsNotEmpty({ message: 'razorpayPaymentId is required' })
  razorpayPaymentId!: string;

  @ApiProperty({ description: 'HMAC-SHA256 Razorpay Signature' })
  @IsString()
  @IsNotEmpty({ message: 'razorpaySignature is required' })
  razorpaySignature!: string;
}

export class VerifyRentalSubscriptionDto {
  @ApiProperty({ description: 'Internal LaptopMitra Order ID' })
  @IsString()
  @IsNotEmpty({ message: 'orderId is required' })
  orderId!: string;

  @ApiProperty({ description: 'Razorpay Subscription ID' })
  @IsString()
  @IsNotEmpty({ message: 'razorpaySubscriptionId is required' })
  razorpaySubscriptionId!: string;

  @ApiProperty({ description: 'Razorpay Payment ID for initial mandate authorization' })
  @IsString()
  @IsNotEmpty({ message: 'razorpayPaymentId is required' })
  razorpayPaymentId!: string;

  @ApiProperty({ description: 'HMAC-SHA256 Razorpay Subscription Signature' })
  @IsString()
  @IsNotEmpty({ message: 'razorpaySignature is required' })
  razorpaySignature!: string;
}

