import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notifications/notification.module';
import { PaymentEncryptionModule } from '../../common/encryption/payment-encryption.module';
import { PaymentsModule } from '../payments/payment.module';

@Module({
  imports: [PrismaModule, NotificationModule, PaymentEncryptionModule, PaymentsModule],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}

