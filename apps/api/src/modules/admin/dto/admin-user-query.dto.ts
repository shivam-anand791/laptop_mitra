import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminPaginationDto } from './admin-pagination.dto';
import { USER_STATUSES, UserStatus, USER_ROLES, UserRole } from '../../../common/constants';

export class AdminUserQueryDto extends AdminPaginationDto {
  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsOptional()
  @IsIn(USER_STATUSES, {
    message: `status must be one of: ${USER_STATUSES.join(', ')}`,
  })
  status?: UserStatus;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn(USER_ROLES, {
    message: `role must be one of: ${USER_ROLES.join(', ')}`,
  })
  role?: UserRole;
}
