import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentEncryptionService } from './payment-encryption.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PaymentEncryptionService],
  exports: [PaymentEncryptionService],
})
export class PaymentEncryptionModule {}
