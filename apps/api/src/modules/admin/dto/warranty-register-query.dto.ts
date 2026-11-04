import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminPaginationDto } from './admin-pagination.dto';

export class WarrantyRegisterQueryDto extends AdminPaginationDto {
  @ApiPropertyOptional({ description: 'Filter by warranty status (ACTIVE, EXPIRED, VOIDED)' })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'EXPIRED', 'VOIDED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by coverage source (BASE, EXTENDED)' })
  @IsOptional()
  @IsString()
  @IsIn(['BASE', 'EXTENDED'])
  source?: string;

  @ApiPropertyOptional({ description: 'Filter by brand (e.g. Apple, Lenovo, Dell, ASUS)' })
  @IsOptional()
  @IsString()
  brand?: string;
}

