import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notifications/notification.module';
import { MailModule } from '../mail/mail.module';
import { ServiceService } from './service.service';
import { ServiceController } from './service.controller';
import { AdminServiceController } from './admin-service.controller';

@Module({
  imports: [PrismaModule, NotificationModule, MailModule],
  controllers: [ServiceController, AdminServiceController],
  providers: [ServiceService],
  exports: [ServiceService],
})
export class ServiceModule {}

