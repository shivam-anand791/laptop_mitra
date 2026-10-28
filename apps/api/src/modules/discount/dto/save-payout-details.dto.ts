import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SavePayoutDetailsDto {
  @ApiPropertyOptional({ description: 'Bank Name', example: 'State Bank of India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Account Holder Full Name', example: 'Rohan Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountHolderName?: string;

  @ApiPropertyOptional({ description: 'Bank Account Number (9-18 digits)', example: '123456789012' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{9,18}$/, { message: 'Account number must be between 9 and 18 digits' })
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank IFSC Code (11 alphanumeric characters)', example: 'SBIN0001234' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'IFSC code must be valid (e.g. SBIN0001234)' })
  ifscCode?: string;

  @ApiPropertyOptional({ description: 'UPI Virtual Payment Address / ID', example: 'rohan@oksbi' })
  @IsOptional()
  @IsString()
  @Matches(/^[\w.-]+@[\w.-]+$/, { message: 'UPI ID must be a valid format (e.g. user@oksbi)' })
  @MaxLength(100)
  upiId?: string;
}
