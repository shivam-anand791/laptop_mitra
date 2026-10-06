import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { NotificationModule } from '../notifications/notification.module';
import { RolesGuard } from '../../guards/roles.guard';

@Module({
  imports: [NotificationModule],
  controllers: [PaymentController],
  providers: [PaymentService, RolesGuard],
  exports: [PaymentService],
})
export class PaymentsModule {}
