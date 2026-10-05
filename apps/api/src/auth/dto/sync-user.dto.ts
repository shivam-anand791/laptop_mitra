import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SyncUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s().-]{7,20}$/)
  phone?: string;
}