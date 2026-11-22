import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../decorators/public.decorator';
import { PincodeService, PincodeVerificationResult } from './pincode.service';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly pincodeService: PincodeService) {}

  @Public()
  @Get('pincode/:pincode')
  @ApiOperation({ summary: 'Verify Indian delivery pincode, serviceability, and Delhi NCR COD eligibility' })
  @ApiParam({ name: 'pincode', type: String, example: '110019' })
  @ApiResponse({ status: 200, description: 'Pincode verification details' })
  async verifyPincode(@Param('pincode') pincode: string): Promise<PincodeVerificationResult> {
    return this.pincodeService.verifyPincode(pincode);
  }
}

