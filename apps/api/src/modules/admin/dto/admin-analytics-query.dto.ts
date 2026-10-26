import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminAnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '7d' })
  @IsOptional()
  @IsIn(['7d', '30d', '90d'], { message: 'range must be one of: 7d, 30d, 90d' })
  range?: '7d' | '30d' | '90d' = '7d';
}
