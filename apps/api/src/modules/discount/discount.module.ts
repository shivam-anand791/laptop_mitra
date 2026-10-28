import { Module } from '@nestjs/common';
import { DiscountController } from './discount.controller';
import { DiscountService } from './discount.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentEncryptionModule } from '../../common/encryption/payment-encryption.module';
import { QrStorageModule } from '../../common/storage/qr-storage.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [PrismaModule, PaymentEncryptionModule, QrStorageModule, NotificationModule],
  controllers: [DiscountController],
  providers: [DiscountService],
  exports: [DiscountService],
})
export class DiscountModule {}

