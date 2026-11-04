import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleServiceDto {
  @ApiProperty({ description: 'New preferred pickup date (YYYY-MM-DD or ISO string)', example: '2026-11-15' })
  @IsNotEmpty()
  @IsString()
  preferredDate: string;

  @ApiProperty({ description: 'New preferred time slot', example: 'AFTERNOON_2_TO_5' })
  @IsNotEmpty()
  @IsString()
  preferredSlot: string;

  @ApiPropertyOptional({ description: 'Customer reason for rescheduling pickup' })
  @IsOptional()
  @IsString()
  reason?: string;
}

