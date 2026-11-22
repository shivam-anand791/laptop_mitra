import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MAX_CART_ITEM_QUANTITY = 50;
export const SUPPORTED_LEASE_TENURES = [1, 3, 6, 12, 24] as const;

export class AddCartItemDto {
  @ApiProperty({ description: 'Product ID to add' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  productId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: MAX_CART_ITEM_QUANTITY })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CART_ITEM_QUANTITY)
  quantity?: number;

  @ApiPropertyOptional({ enum: ['sell', 'lease'], default: 'sell' })
  @IsOptional()
  @IsIn(['sell', 'lease'])
  purchaseMode?: 'sell' | 'lease';

  @ApiPropertyOptional({ default: 'default' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+$/, { message: 'configuration contains unsupported characters' })
  configuration?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasWarranty?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  variantId?: string;

  @ApiPropertyOptional({ enum: SUPPORTED_LEASE_TENURES })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([...SUPPORTED_LEASE_TENURES])
  tenureMonths?: number;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({ minimum: 0, maximum: MAX_CART_ITEM_QUANTITY })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_CART_ITEM_QUANTITY)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasWarranty?: boolean;
}

