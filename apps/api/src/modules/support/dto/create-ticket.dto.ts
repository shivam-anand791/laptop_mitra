import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Ticket subject line', example: 'Damaged screen on delivery' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({
    description: 'Support category',
    example: 'ORDER_DELIVERY',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  category!: string;

  @ApiPropertyOptional({ description: 'Specific sub-issue type', example: 'DAMAGED_ON_ARRIVAL' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  issueType?: string;

  @ApiPropertyOptional({ description: 'Ticket classification type', enum: ['QUERY', 'COMPLAINT', 'CALLBACK', 'RETURN', 'WARRANTY'], default: 'QUERY' })
  @IsOptional()
  @IsIn(['QUERY', 'COMPLAINT', 'CALLBACK', 'RETURN', 'WARRANTY'])
  type?: 'QUERY' | 'COMPLAINT' | 'CALLBACK' | 'RETURN' | 'WARRANTY';

  @ApiPropertyOptional({ description: 'Urgency priority', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' })
  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @ApiPropertyOptional({ description: 'Associated Order ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Associated Order Item ID' })
  @IsOptional()
  @IsString()
  orderItemId?: string;

  @ApiProperty({ description: 'Initial message body describing the issue' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ description: 'Customer phone for callback requests' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  callbackPhone?: string;

  @ApiPropertyOptional({ description: 'Customer preferred callback time slot', example: 'Morning (10 AM - 1 PM)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  callbackSlot?: string;

  @ApiPropertyOptional({ description: 'Uploaded attachment IDs or storage keys' })
  @IsOptional()
  @IsArray()
  attachments?: string[];

  @ApiPropertyOptional({ description: 'Platform source', default: 'web' })
  @IsOptional()
  @IsIn(['web', 'mobile'])
  source?: 'web' | 'mobile';
}
