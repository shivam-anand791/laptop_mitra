import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RandomService } from '../shared/random.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';
import { OtpService } from './otp.service';

@Module({
  imports: [FirebaseModule],
  controllers: [AuthController],
  providers: [AuthService, RandomService, EmailVerificationService, PasswordResetService, OtpService],
  exports: [AuthService, PasswordResetService, OtpService],
})
export class AuthModule {}
