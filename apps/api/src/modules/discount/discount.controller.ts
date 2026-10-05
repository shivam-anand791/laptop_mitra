import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DiscountService, DiscountValidationResponse } from './discount.service';
import { Public } from '../../decorators/public.decorator';
import { GetUser } from '../../decorators/get-user.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('discount')
@Controller('discount')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('validate')
  @ApiOperation({ summary: 'Validate a discount code for a cart total' })
  @ApiResponse({ status: 200, description: 'Discount validation result' })
  async validateDiscount(
    @Body() body: { code?: string; cartTotal?: number },
  ): Promise<DiscountValidationResponse> {
    return this.discountService.validateDiscount(body.code, body.cartTotal);
  }

  @Get('referral/stats')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER', 'ADMIN')
  @ApiOperation({ summary: 'Get referral statistics and earnings' })
  @ApiResponse({ status: 200, description: 'Referral stats' })
  async getReferralStats(@GetUser() user: any) {
    return this.discountService.getReferralStats(user.id);
  }
}
