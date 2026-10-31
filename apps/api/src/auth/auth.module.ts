import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RandomService } from '../shared/random.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { EmailVerificationService } from './email-verification.service';

@Module({
  imports: [FirebaseModule],
  controllers: [AuthController],
  providers: [AuthService, RandomService, EmailVerificationService],
  exports: [AuthService],
})
export class AuthModule {}
