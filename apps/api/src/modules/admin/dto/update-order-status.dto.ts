import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ORDER_STATUSES, OrderStatus } from '../../../common/constants';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUSES, description: 'New order status' })
  @IsNotEmpty()
  @IsString()
  @IsIn(ORDER_STATUSES, {
    message: `status must be one of: ${ORDER_STATUSES.join(', ')}`,
  })
  status!: OrderStatus;

  @ApiPropertyOptional({ description: 'Courier / Carrier Name (required when transitioning to SHIPPING)' })
  @IsOptional()
  @IsString()
  courierName?: string;

  @ApiPropertyOptional({ description: 'Tracking Number / AWB (required when transitioning to SHIPPING)' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

