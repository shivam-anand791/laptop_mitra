import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnItemInputDto {
  @ApiProperty({ description: 'OrderItem ID to return' })
  @IsNotEmpty()
  @IsString()
  orderItemId!: string;

  @ApiProperty({ description: 'Quantity to return (default 1)', example: 1, default: 1 })
  @IsOptional()
  quantity: number = 1;

  @ApiPropertyOptional({ description: 'Specific reason for this item' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RefundDetailsInputDto {
  @ApiPropertyOptional({ description: 'Bank Account Number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Confirm Bank Account Number (must match)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  confirmAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank IFSC Code (11 alphanumeric characters)', example: 'HDFC0001234' })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  ifscCode?: string;

  @ApiPropertyOptional({ description: 'Account Holder Name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountHolderName?: string;

  @ApiPropertyOptional({ description: 'UPI VPA Address', example: 'user@okaxis' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  upiId?: string;
}

export class CreateReturnRequestDto {
  @ApiProperty({ description: 'Order ID to return from' })
  @IsNotEmpty()
  @IsString()
  orderId!: string;

  @ApiPropertyOptional({ description: 'Linked support ticket ID if initiated from ticket' })
  @IsOptional()
  @IsString()
  ticketId?: string;

  @ApiPropertyOptional({ description: 'Resolution preference', enum: ['REFUND', 'REPLACEMENT'], default: 'REFUND' })
  @IsOptional()
  @IsIn(['REFUND', 'REPLACEMENT'])
  type?: 'REFUND' | 'REPLACEMENT';

  @ApiProperty({ description: 'Primary return reason', example: 'Hardware defect / Screen flicker' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiProperty({ description: 'List of order items being returned', type: [ReturnItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemInputDto)
  items!: ReturnItemInputDto[];

  @ApiPropertyOptional({ description: 'Evidence photo/video storage keys' })
  @IsOptional()
  @IsArray()
  attachments?: string[];

  @ApiPropertyOptional({ description: 'Preferred refund method', enum: ['SOURCE', 'BANK', 'UPI'], default: 'SOURCE' })
  @IsOptional()
  @IsIn(['SOURCE', 'BANK', 'UPI'])
  refundMethod?: 'SOURCE' | 'BANK' | 'UPI';

  @ApiPropertyOptional({ description: 'Bank/UPI details for Cash-on-Delivery refunds', type: RefundDetailsInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RefundDetailsInputDto)
  refundDetails?: RefundDetailsInputDto;
}
