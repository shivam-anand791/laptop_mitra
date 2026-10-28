import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { DiscountService, DiscountValidationResponse } from './discount.service';
import { Public } from '../../decorators/public.decorator';
import { GetUser } from '../../decorators/get-user.decorator';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { SavePayoutDetailsDto } from './dto/save-payout-details.dto';
import { WithdrawRequestDto } from './dto/withdraw-request.dto';

@ApiTags('discount')
@Controller(['discount', 'discounts'])
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

  @Get('payout-details')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Get saved affiliate payout details (masked)' })
  @ApiResponse({ status: 200, description: 'Masked payout details' })
  async getPayoutDetails(@GetUser() user: any) {
    return this.discountService.getPayoutDetails(user.id);
  }

  @Post('payout-details')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Save or update affiliate payout details' })
  @ApiResponse({ status: 200, description: 'Payout details saved (masked)' })
  async savePayoutDetails(
    @GetUser() user: any,
    @Body() dto: SavePayoutDetailsDto,
  ) {
    return this.discountService.savePayoutDetails(user.id, dto);
  }

  @Post('payout-details/qr')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload payout QR code image' })
  @ApiResponse({ status: 201, description: 'QR code uploaded successfully' })
  async uploadQrCode(
    @GetUser() user: any,
    @UploadedFile() file: any,
  ) {
    if (!file || !file.buffer) {
      throw new Error('Image file is required');
    }
    return this.discountService.uploadQrCode(user.id, file.buffer);
  }

  @Post('withdraw')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Submit an affiliate commission withdrawal request' })
  @ApiResponse({ status: 201, description: 'Withdrawal request submitted' })
  async requestWithdrawal(
    @GetUser() user: any,
    @Body() dto: WithdrawRequestDto,
  ) {
    return this.discountService.requestWithdrawal(user.id, dto.amount);
  }
}

