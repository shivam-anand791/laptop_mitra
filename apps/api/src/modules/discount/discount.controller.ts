import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DiscountService, DiscountValidationResponse } from './discount.service';

@ApiTags('discount')
@Controller('discount')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a discount code for a cart total' })
  @ApiResponse({ status: 200, description: 'Discount validation result' })
  async validateDiscount(
    @Body() body: { code?: string; cartTotal?: number },
  ): Promise<DiscountValidationResponse> {
    return this.discountService.validateDiscount(body.code, body.cartTotal);
  }
}
