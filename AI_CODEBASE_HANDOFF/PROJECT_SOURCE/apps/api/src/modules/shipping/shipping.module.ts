import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { PincodeService } from './pincode.service';

@Module({
  controllers: [ShippingController],
  providers: [PincodeService],
  exports: [PincodeService],
})
export class ShippingModule {}

