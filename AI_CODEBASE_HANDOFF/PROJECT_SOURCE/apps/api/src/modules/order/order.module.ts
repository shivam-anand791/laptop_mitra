import { Module, forwardRef } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { LeaseService } from './lease.service';
import { LeaseController } from './lease.controller';
import { AdminLeaseController } from './admin-lease.controller';
import { CartModule } from '../cart/cart.module';
import { ProductModule } from '../product/product.module';
import { NotificationModule } from '../notifications/notification.module';
import { RolesGuard } from '../../guards/roles.guard';
import { DiscountModule } from '../discount/discount.module';
import { PaymentsModule } from '../payments/payment.module';
import { AdminModule } from '../admin/admin.module';
import { ShippingModule } from '../shipping/shipping.module';
import { TaxModule } from '../tax/tax.module';

@Module({
  imports: [
    CartModule,
    ProductModule,
    NotificationModule,
    DiscountModule,
    PaymentsModule,
    AdminModule,
    ShippingModule,
    TaxModule,
  ],
  controllers: [OrderController, LeaseController, AdminLeaseController],
  providers: [OrderService, LeaseService, RolesGuard],
  exports: [OrderService, LeaseService],
})
export class OrderModule {}
