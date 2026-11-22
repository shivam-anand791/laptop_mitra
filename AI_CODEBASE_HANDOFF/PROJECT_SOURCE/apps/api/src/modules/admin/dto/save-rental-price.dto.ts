import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { RENTAL_PRICE_TENURES } from '../rental-pricing';

export class CreateRentalPriceDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  variantId?: string | null;

  @Type(() => Number)
  @IsIn(RENTAL_PRICE_TENURES)
  tenureMonths!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  monthlyPrice!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  securityDeposit!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryCharge!: number;

  @IsString()
  @Matches(/\S/)
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class UpdateRentalPriceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  monthlyPrice!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  securityDeposit!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  deliveryCharge!: number;

  @IsString()
  @Matches(/\S/)
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
