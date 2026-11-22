import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  FREE_SHIPPING = 'free_shipping',
  FREE_WARRANTY = 'free_warranty',
}

export enum CouponStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  EXHAUSTED = 'EXHAUSTED',
  ARCHIVED = 'ARCHIVED',
}

export enum CouponVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  TARGETED = 'TARGETED',
}

export class CartItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  price!: number; // Unit price in Rupees

  @IsOptional()
  @IsString()
  purchaseMode?: 'sell' | 'lease';

  @IsOptional()
  @IsBoolean()
  hasWarranty?: boolean;

  @IsOptional()
  @IsNumber()
  warrantyPrice?: number;
}

export class AvailableCouponsDto {
  @IsArray()
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

export class PreviewCouponDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsArray()
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  pincode?: string;
}

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  internalNote?: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountCap?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsesPerUser?: number;

  @IsOptional()
  @IsString()
  appliesTo?: string; // 'all' | 'category' | 'product' | 'brand'

  @IsOptional()
  @IsString()
  appliesToIds?: string;

  @IsOptional()
  @IsString()
  excludedProductIds?: string;

  @IsOptional()
  @IsString()
  excludedCategoryIds?: string;

  @IsOptional()
  @IsBoolean()
  allowRentLease?: boolean;

  @IsOptional()
  @IsBoolean()
  excludeWarranty?: boolean;

  @IsOptional()
  @IsString()
  allowedPaymentMethods?: string;

  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean;

  @IsOptional()
  @IsString()
  targetedUserIds?: string;

  @IsOptional()
  @IsString()
  targetPincodes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number;

  @IsOptional()
  @IsBoolean()
  canCombineWithReferral?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsEnum(CouponVisibility)
  visibility?: CouponVisibility;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsBoolean()
  highlight?: boolean;
}

export class UpdateCouponDto extends CreateCouponDto {}

export class BulkGenerateCouponsDto {
  @IsString()
  @IsNotEmpty()
  prefix!: string;

  @IsNumber()
  @Min(1)
  @Max(500)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsNumber()
  maxDiscountCap?: number;

  @IsOptional()
  @IsNumber()
  minOrderValue?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  internalNote?: string;
}

