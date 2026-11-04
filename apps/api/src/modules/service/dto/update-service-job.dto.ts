import { IsOptional, IsString, IsBoolean, IsInt, Min, Max, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateServiceJobDto {
  @ApiPropertyOptional({
    description: 'Updated lifecycle status',
    enum: [
      'REQUESTED',
      'SCHEDULED',
      'RESCHEDULED',
      'PICKED_UP',
      'IN_SERVICE',
      'QUALITY_CHECK',
      'READY_FOR_DROP',
      'COMPLETED',
      'CANCELLED',
      'REJECTED',
      'NO_SHOW',
    ],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Assigned technician user ID' })
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiPropertyOptional({ description: 'Scheduled drop-off / return delivery timestamp' })
  @IsOptional()
  @IsString()
  scheduledDropAt?: string;

  @ApiPropertyOptional({ description: 'Checklist item 1: High-pressure fan bay and heatsink dust cleaning' })
  @IsOptional()
  @IsBoolean()
  checklistCleaning?: boolean;

  @ApiPropertyOptional({ description: 'Checklist item 2: Premium thermal paste replacement on CPU/GPU' })
  @IsOptional()
  @IsBoolean()
  checklistThermalPaste?: boolean;

  @ApiPropertyOptional({ description: 'Checklist item 3: Diagnostics and hardware stress test run' })
  @IsOptional()
  @IsBoolean()
  checklistSoftware?: boolean;

  @ApiPropertyOptional({ description: 'Checklist item 4: Battery health and cycle check' })
  @IsOptional()
  @IsBoolean()
  checklistBattery?: boolean;

  @ApiPropertyOptional({ description: 'Measured battery health percentage (0-100)', example: 88 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryHealthPercent?: number;

  @ApiPropertyOptional({ description: 'Details of any parts replaced or serviced' })
  @IsOptional()
  @IsString()
  partsReplaced?: string;

  @ApiPropertyOptional({ description: 'Technician or internal diagnostic notes' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Reason for cancellation or rejection if applicable' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

