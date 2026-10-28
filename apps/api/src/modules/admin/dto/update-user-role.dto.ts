import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { USER_ROLES, UserRole } from '../../../common/constants';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: USER_ROLES, description: 'New user system role' })
  @IsNotEmpty()
  @IsString()
  @IsIn(USER_ROLES, {
    message: `role must be one of: ${USER_ROLES.join(', ')}`,
  })
  role!: UserRole;
}
