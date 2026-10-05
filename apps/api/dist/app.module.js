"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const node_path_1 = require("node:path");
const app_controller_1 = require("./app.controller");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const product_module_1 = require("./modules/product/product.module");
const cart_module_1 = require("./modules/cart/cart.module");
const wishlist_module_1 = require("./modules/wishlist/wishlist.module");
const order_module_1 = require("./modules/order/order.module");
const payment_module_1 = require("./modules/payments/payment.module");
const admin_module_1 = require("./modules/admin/admin.module");
const discount_module_1 = require("./modules/discount/discount.module");
const address_module_1 = require("./modules/address/address.module");
const notification_module_1 = require("./modules/notifications/notification.module");
const categories_module_1 = require("./modules/categories/categories.module");
const support_module_1 = require("./modules/support/support.module");
const firebase_module_1 = require("./firebase/firebase.module");
const firebase_auth_guard_1 = require("./auth/guards/firebase-auth.guard");
const apiPackageRoot = (0, node_path_1.resolve)(__dirname, '..');
const repoRoot = (0, node_path_1.resolve)(__dirname, '..', '..', '..');
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: [
                    (0, node_path_1.resolve)(apiPackageRoot, '.env'),
                    (0, node_path_1.resolve)(repoRoot, '.env'),
                    '.env',
                ],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            product_module_1.ProductModule,
            cart_module_1.CartModule,
            wishlist_module_1.WishlistModule,
            order_module_1.OrderModule,
            payment_module_1.PaymentsModule,
            admin_module_1.AdminModule,
            discount_module_1.DiscountModule,
            address_module_1.AddressModule,
            notification_module_1.NotificationModule,
            categories_module_1.CategoriesModule,
            support_module_1.SupportModule,
            firebase_module_1.FirebaseModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: firebase_auth_guard_1.FirebaseAuthGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map