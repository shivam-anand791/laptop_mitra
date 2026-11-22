import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerRefundDto {
  @ApiPropertyOptional({ description: 'Specific cancelled order item ID for a partial item refund' })
  @IsOptional()
  @IsString()
  orderItemId?: string;

  @ApiPropertyOptional({ description: 'Explicit refund amount in paise (optional partial override)' })
  @IsOptional()
  @IsInt()
  @Min(100)
  amountPaise?: number;

  @ApiPropertyOptional({ description: 'Admin refund reason / audit note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

