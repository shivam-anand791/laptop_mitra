import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRefundDetailsDto {
  @ApiPropertyOptional({ description: 'Bank Account Number' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Confirm Bank Account Number (must match account number)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  confirmAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank IFSC Code (11 alphanumeric characters)', example: 'HDFC0001234' })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  ifscCode?: string;

  @ApiPropertyOptional({ description: 'Account Holder Full Name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountHolderName?: string;

  @ApiPropertyOptional({ description: 'UPI VPA Address', example: 'name@okhdfcbank' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  upiId?: string;
}
