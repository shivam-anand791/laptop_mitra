import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ORDER_STATUSES, OrderStatus } from '../../../common/constants';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUSES, description: 'New order status' })
  @IsNotEmpty()
  @IsString()
  @IsIn(ORDER_STATUSES, {
    message: `status must be one of: ${ORDER_STATUSES.join(', ')}`,
  })
  status!: OrderStatus;
}
