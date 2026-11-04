import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookServiceDto {
  @ApiProperty({ description: 'Preferred pickup date (YYYY-MM-DD or ISO string)', example: '2026-11-10' })
  @IsNotEmpty()
  @IsString()
  preferredDate: string;

  @ApiProperty({ description: 'Preferred time window slot', example: 'MORNING_10_TO_1' })
  @IsNotEmpty()
  @IsString()
  preferredSlot: string;

  @ApiProperty({
    description: 'Doorstep pickup address object',
    example: {
      fullName: 'Aarav Sharma',
      phone: '9876543210',
      address: 'Flat 402, Sunshine Heights, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      landmark: 'Near Metro Station',
    },
  })
  @IsNotEmpty()
  @IsObject()
  pickupAddress: Record<string, any>;

  @ApiProperty({ description: 'Pickup destination 6-digit postal pincode', example: '560038' })
  @IsNotEmpty()
  @IsString()
  pickupPincode: string;

  @ApiPropertyOptional({ description: 'Customer observations or specific issues noticed' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({ description: 'Data backup disclaimer acknowledgement', default: true })
  @IsOptional()
  @IsBoolean()
  backupAcknowledged?: boolean;
}

