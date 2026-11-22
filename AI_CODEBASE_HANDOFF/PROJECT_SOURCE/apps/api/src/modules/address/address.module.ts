import { Module } from '@nestjs/common';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { ShippingModule } from '../shipping/shipping.module';
import { RolesGuard } from '../../guards/roles.guard';

@Module({
  imports: [ShippingModule],
  controllers: [AddressController],
  providers: [AddressService, RolesGuard],
  exports: [AddressService],
})
export class AddressModule {}
