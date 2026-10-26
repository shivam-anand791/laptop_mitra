import { IsOptional, IsString, IsEmail, IsInt, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'LaptopMitra' })
  @IsOptional()
  @IsString()
  storeName?: string;

  @ApiPropertyOptional({ example: 'support@laptopmitra.com' })
  @IsOptional()
  @IsEmail({}, { message: 'supportEmail must be a valid email address' })
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+91-1800-123-4567' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: '123 Tech Park, Bangalore, Karnataka 560001' })
  @IsOptional()
  @IsString()
  storeAddress?: string;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'lowStockThreshold must be an integer' })
  @Min(1, { message: 'lowStockThreshold must be at least 1' })
  lowStockThreshold?: number;

  @ApiPropertyOptional({ example: 999, default: 999 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'freeShippingThreshold must be a valid number' })
  @Min(0, { message: 'freeShippingThreshold cannot be negative' })
  freeShippingThreshold?: number;

  @ApiPropertyOptional({ example: '3-5', default: '3-5' })
  @IsOptional()
  @IsString()
  standardDeliveryDays?: string;

  @ApiPropertyOptional({ example: '1-2', default: '1-2' })
  @IsOptional()
  @IsString()
  expressDeliveryDays?: string;
}
