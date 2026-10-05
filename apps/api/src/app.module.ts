import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductModule } from './modules/product/product.module';
import { CartModule } from './modules/cart/cart.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentsModule } from './modules/payments/payment.module';
import { AdminModule } from './modules/admin/admin.module';
import { DiscountModule } from './modules/discount/discount.module';
import { AddressModule } from './modules/address/address.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SupportModule } from './modules/support/support.module';
import { FirebaseModule } from './firebase/firebase.module';
import { FirebaseAuthGuard } from './auth/guards/firebase-auth.guard';

const apiPackageRoot = resolve(__dirname, '..');
const repoRoot = resolve(__dirname, '..', '..', '..');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(apiPackageRoot, '.env'),
        resolve(repoRoot, '.env'),
        '.env',
      ],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductModule,
    CartModule,
    WishlistModule,
    OrderModule,
    PaymentsModule,
    AdminModule,
    DiscountModule,
    AddressModule,
    NotificationModule,
    CategoriesModule,
    SupportModule,
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
  ],
})
export class AppModule {}
