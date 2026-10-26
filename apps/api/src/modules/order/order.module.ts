import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { CartModule } from '../cart/cart.module';
import { ProductModule } from '../product/product.module';
import { NotificationModule } from '../notifications/notification.module';
import { RolesGuard } from '../../guards/roles.guard';
import { DiscountModule } from '../discount/discount.module';
import { PaymentsModule } from '../payments/payment.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [CartModule, ProductModule, NotificationModule, DiscountModule, PaymentsModule, AdminModule],
  controllers: [OrderController],
  providers: [OrderService, RolesGuard],
  exports: [OrderService],
})
export class OrderModule {}
