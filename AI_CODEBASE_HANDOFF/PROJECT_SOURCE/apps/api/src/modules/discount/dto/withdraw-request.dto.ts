import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const MINIMUM_WITHDRAWAL_AMOUNT = 500;
export const MAX_PENDING_WITHDRAWAL_REQUESTS = 1;

export class WithdrawRequestDto {
  @ApiProperty({ description: 'Withdrawal amount in INR (minimum ₹500)', example: 1000 })
  @IsInt()
  @Min(MINIMUM_WITHDRAWAL_AMOUNT, {
    message: `Minimum withdrawal amount is ₹${MINIMUM_WITHDRAWAL_AMOUNT}`,
  })
  amount!: number;
}
