import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminTicketQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  slaBreached?: boolean | string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class UpdateAdminTicketDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class AddInternalNoteDto {
  @IsString()
  note: string;
}

export class MergeTicketsDto {
  @IsString()
  targetTicketId: string;
}

export class AdminReturnQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class ProcessAdminReturnDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  pickupCourier?: string;

  @IsOptional()
  @IsString()
  pickupTrackingNumber?: string;

  @IsOptional()
  @IsString()
  inspectionNotes?: string;

  @IsOptional()
  @IsBoolean()
  inspectionPassed?: boolean;
}

export class ProcessAdminRefundDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  refundAmount?: number;

  @IsOptional()
  @IsString()
  manualRefundReference?: string;
}

export class SavedReplyDto {
  @IsString()
  shortcut: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  category?: string;
}

export class CreateHelpCategoryDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class UpdateHelpCategoryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateHelpArticleDto {
  @IsString()
  categoryId: string;

  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class UpdateHelpArticleDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class UpdateSupportSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  firstResponseSlaMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  autoCloseDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reopenWindowDays?: number;

  @IsOptional()
  @IsString()
  supportHoursText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  returnWindowDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  supportReturnApprovalLimit?: number;
}
