import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoteHelpArticleDto {
  @ApiProperty({ description: 'True for helpful (Yes), false for not helpful (No)' })
  @IsNotEmpty()
  @IsBoolean()
  helpful!: boolean;
}
