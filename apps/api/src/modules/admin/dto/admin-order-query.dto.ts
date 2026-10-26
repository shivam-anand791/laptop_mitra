import { IsOptional, IsIn, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminPaginationDto } from './admin-pagination.dto';
import { ORDER_STATUSES, OrderStatus } from '../../../common/constants';

export class AdminOrderQueryDto extends AdminPaginationDto {
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @IsIn(ORDER_STATUSES, {
    message: `status must be one of: ${ORDER_STATUSES.join(', ')}`,
  })
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO string)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO string)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
