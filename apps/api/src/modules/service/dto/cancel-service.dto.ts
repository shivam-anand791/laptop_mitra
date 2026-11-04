import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelServiceDto {
  @ApiProperty({ description: 'Mandatory reason for cancelling service booking', example: 'Travelling out of town this week' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

