import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCorporateInquiryDto {
  @ApiProperty({ description: 'Company or enterprise organization name', example: 'Acme Technologies Pvt Ltd' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  companyName!: string;

  @ApiProperty({ description: 'Contact person full name', example: 'Rajesh Sharma' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  contactPerson!: string;

  @ApiProperty({ description: 'Business email address', example: 'rajesh@acme.com' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ description: 'Contact phone / mobile number', example: '+919876543210' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  phone!: string;

  @ApiPropertyOptional({ description: 'Laptop model or SKU of interest', example: 'Lenovo ThinkPad T480' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  laptopModel?: string;

  @ApiPropertyOptional({ description: 'Associated Product ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  productId?: string;

  @ApiPropertyOptional({ description: 'Procurement mode: outright sell or corporate lease', enum: ['sell', 'lease'], default: 'sell' })
  @IsOptional()
  @IsIn(['sell', 'lease'])
  mode?: 'sell' | 'lease';

  @ApiPropertyOptional({ description: 'Estimated fleet requirement size (min 1)', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiProperty({ description: 'Deployment city / delivery location', example: 'Bengaluru' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ description: 'Expected lease tenure if leasing', example: '12 Months' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  expectedTenure?: string;

  @ApiPropertyOptional({ description: 'Additional customization or software image notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Inquiry origin platform', enum: ['web', 'mobile'], default: 'web' })
  @IsOptional()
  @IsIn(['web', 'mobile'])
  source?: 'web' | 'mobile';

  @ApiPropertyOptional({ description: 'Anti-spam honeypot field (must be left empty)' })
  @IsOptional()
  @IsString()
  website?: string;
}

