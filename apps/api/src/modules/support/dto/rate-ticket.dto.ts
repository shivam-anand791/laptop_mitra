import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RateTicketDto {
  @ApiProperty({ description: 'Customer Satisfaction Score (1 to 5)', example: 5, minimum: 1, maximum: 5 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @ApiPropertyOptional({ description: 'Optional feedback comment', example: 'Issue was resolved very quickly, thank you!' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
