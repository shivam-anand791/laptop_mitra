import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { USER_STATUSES, UserStatus } from '../../../common/constants';

export class UpdateUserStatusDto {
  @ApiProperty({ enum: USER_STATUSES, description: 'New user account status' })
  @IsNotEmpty()
  @IsString()
  @IsIn(USER_STATUSES, {
    message: `status must be one of: ${USER_STATUSES.join(', ')}`,
  })
  status!: UserStatus;
}
