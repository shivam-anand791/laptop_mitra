import { Module } from '@nestjs/common';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { RolesGuard } from '../../guards/roles.guard';

@Module({
  controllers: [AddressController],
  providers: [AddressService, RolesGuard],
  exports: [AddressService],
})
export class AddressModule {}
