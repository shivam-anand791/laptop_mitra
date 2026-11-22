import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BuybackConditionChecklistDto {
  @ApiProperty({ description: 'Laptop boots to operating system' })
  @IsBoolean()
  bootsToOs: boolean;

  @ApiProperty({ description: 'Motherboard is fully functional without liquid damage' })
  @IsBoolean()
  motherboardWorking: boolean;

  @ApiProperty({ description: 'Display intact with no cracks, bleeding, or permanent lines' })
  @IsBoolean()
  displayIntact: boolean;

  @ApiProperty({ description: 'Original functional OEM charger included' })
  @IsBoolean()
  originalCharger: boolean;

  @ApiProperty({ description: 'Battery health percentage (must be >= 70% for standard quote)', minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  batteryHealthPercent: number;
}

export class BuybackPayoutDetailsDto {
  @ApiProperty({ enum: ['BANK_TRANSFER', 'UPI'], description: 'Payment method for buyback payout' })
  @IsEnum(['BANK_TRANSFER', 'UPI'])
  method: 'BANK_TRANSFER' | 'UPI';

  @ApiPropertyOptional({ description: 'Bank Account Number' })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank IFSC Code' })
  @IsString()
  @IsOptional()
  ifscCode?: string;

  @ApiPropertyOptional({ description: 'Account Holder Name' })
  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @ApiPropertyOptional({ description: 'UPI Virtual Payment Address (VPA)' })
  @IsString()
  @IsOptional()
  upiId?: string;
}

export class CreateBuybackRequestDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Order Item ID' })
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @ApiPropertyOptional({ description: 'Unit number if quantity > 1', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  unitNumber?: number;

  @ApiProperty({ type: BuybackConditionChecklistDto, description: 'Customer self-reported condition checklist' })
  @IsObject()
  conditionChecklist: BuybackConditionChecklistDto;

  @ApiPropertyOptional({ type: BuybackPayoutDetailsDto, description: 'Optional payout details' })
  @IsOptional()
  payoutDetails?: BuybackPayoutDetailsDto;

  @ApiPropertyOptional({ description: 'Array of uploaded condition photo storage keys' })
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional({ description: 'Pickup address details' })
  @IsOptional()
  pickupAddress?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export class SubmitBuybackInspectionDto {
  @ApiProperty({ description: 'Laptop boots to operating system' })
  @IsBoolean()
  bootsToOs: boolean;

  @ApiProperty({ description: 'Motherboard functional' })
  @IsBoolean()
  motherboardWorking: boolean;

  @ApiProperty({ description: 'Display intact' })
  @IsBoolean()
  displayIntact: boolean;

  @ApiProperty({ description: 'Original charger included' })
  @IsBoolean()
  originalCharger: boolean;

  @ApiProperty({ description: 'Tested battery health percentage' })
  @IsInt()
  @Min(0)
  @Max(100)
  batteryHealthPercent: number;

  @ApiPropertyOptional({ description: 'Inspection notes / defects found' })
  @IsString()
  @IsOptional()
  inspectionNotes?: string;

  @ApiPropertyOptional({ description: 'Revised quoted amount if minor issues found', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  revisedQuotedAmount?: number;
}

export class DispatchBuybackReturnDto {
  @ApiProperty({ description: 'Courier company name' })
  @IsString()
  @IsNotEmpty()
  courierName: string;

  @ApiProperty({ description: 'Tracking AWB number' })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;
}

export class ProcessBuybackPayoutDto {
  @ApiProperty({ description: 'Bank / UPI transaction reference (UTR)' })
  @IsString()
  @IsNotEmpty()
  payoutUtr: string;

  @ApiPropertyOptional({ description: 'Final payout amount transferred' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  finalAmount?: number;
}

export class UpdateBuybackSettingsDto {
  @ApiPropertyOptional({ description: 'Quote validity in days', default: 15 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quoteValidityDays?: number;

  @ApiPropertyOptional({ description: 'Pickup & doorstep convenience charge in INR', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  convenienceCharge?: number;

  @ApiPropertyOptional({ description: 'Minimum battery health percentage required', default: 70 })
  @IsInt()
  @Min(0)
  @Max(100)
  batteryMinPercent?: number;
}

export class BuybackTierInputDto {
  @ApiProperty({ description: 'From age in calendar months' })
  @IsInt()
  @Min(0)
  fromMonths: number;

  @ApiProperty({ description: 'To age in calendar months' })
  @IsInt()
  @Min(1)
  toMonths: number;

  @ApiProperty({ description: 'Buyback percentage of invoice price', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

