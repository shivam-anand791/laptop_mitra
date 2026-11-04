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

  @ApiPropertyOptional({ description: 'Serial number assignments per unit' })
  @IsOptional()
  serialAssignments?: Array<{ orderItemId: string; unitIndex: number; serialNumber: string }>;

  @ApiPropertyOptional({ description: 'Administrative override reason if dispatched without serial numbers' })
  @IsOptional()
  @IsString()
  overrideReason?: string;
}
