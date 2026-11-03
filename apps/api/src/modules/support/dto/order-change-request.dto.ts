import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ChangeRequestTypeEnum {
  ADDRESS_CHANGE = 'ADDRESS_CHANGE',
  PHONE_CHANGE = 'PHONE_CHANGE',
  LEASE_EXTENSION = 'LEASE_EXTENSION',
  LEASE_TERMINATION = 'LEASE_TERMINATION',
  LEASE_BUYOUT = 'LEASE_BUYOUT',
}

export class CreateOrderChangeRequestDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ description: 'Order Item ID for item-specific lease requests' })
  @IsString()
  @IsOptional()
  orderItemId?: string;

  @ApiProperty({ enum: ChangeRequestTypeEnum, description: 'Type of change requested' })
  @IsEnum(ChangeRequestTypeEnum)
  type: ChangeRequestTypeEnum;

  @ApiProperty({ description: 'Sanitized payload containing requested changes' })
  @IsObject()
  requestedData: Record<string, any>;
}

export class ReviewChangeRequestDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], description: 'Review verdict' })
  @IsEnum(['APPROVED', 'REJECTED'])
  action: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Admin review notes' })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

