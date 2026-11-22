import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUnitSerialDto {
  @ApiProperty({ description: 'New verified serial number' })
  @IsNotEmpty()
  @IsString()
  serialNumber!: string;

  @ApiProperty({ description: 'Mandatory reason for updating serial number' })
  @IsNotEmpty()
  @IsString()
  reason!: string;
}

