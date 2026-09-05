import { IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiProperty({ example: '+919876543210', description: 'Phone number' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: '123 Main Street', description: 'Address' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address: string;

  @ApiProperty({ example: 'Mumbai', description: 'City', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ example: 'Maharashtra', description: 'State', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: '400001', description: 'Pincode', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  pincode?: string;
}