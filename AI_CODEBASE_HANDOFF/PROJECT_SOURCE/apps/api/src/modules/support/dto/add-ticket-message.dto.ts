import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddTicketMessageDto {
  @ApiProperty({ description: 'Reply message text' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ description: 'Optional list of uploaded attachment storage keys / IDs' })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}
