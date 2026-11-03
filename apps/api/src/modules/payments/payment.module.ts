import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { NotificationModule } from '../notifications/notification.module';
import { RolesGuard } from '../../guards/roles.guard';
import { TaxModule } from '../tax/tax.module';

@Module({
  imports: [NotificationModule, TaxModule],
  controllers: [PaymentController],
  providers: [PaymentService, RolesGuard],
  exports: [PaymentService],
})
export class PaymentsModule {}
