import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentEncryptionModule } from '../../common/encryption/payment-encryption.module';
import { QrStorageModule } from '../../common/storage/qr-storage.module';
import { NotificationModule } from '../notifications/notification.module';
import { RolesGuard } from '../../guards/roles.guard';

@Module({
  imports: [PrismaModule, PaymentEncryptionModule, QrStorageModule, NotificationModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
