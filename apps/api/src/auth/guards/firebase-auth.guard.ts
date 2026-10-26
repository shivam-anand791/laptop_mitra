import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ALLOW_UNLINKED_FIREBASE_USER_KEY } from '../../decorators/allow-firebase-sync.decorator';
import { PUBLIC_ROUTE_KEY } from '../../decorators/public.decorator';
import { FirebaseService } from '../../firebase/firebase.service';
import { CHECK_FIREBASE_REVOCATION_KEY } from '../../decorators/check-firebase-revocation.decorator';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebaseService: FirebaseService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const controller = context.getClass();
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [handler, controller]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization;
    const match = typeof authorization === 'string'
      ? /^Bearer\s+(.+)$/i.exec(authorization.trim())
      : null;
    if (!match) {
      throw new UnauthorizedException('Unauthorized');
    }

    let identity;
    try {
      const checkRevoked = this.reflector.getAllAndOverride<boolean>(
        CHECK_FIREBASE_REVOCATION_KEY,
        [handler, controller],
      );
      identity = await this.firebaseService.verifyIdToken(match[1], checkRevoked);
      if (!identity.uid) {
        throw new UnauthorizedException('Unauthorized');
      }
    } catch (error: any) {
      const code = typeof error?.code === 'string' ? error.code : '';
      const invalidCredentialCodes = new Set([
        'auth/argument-error',
        'auth/id-token-expired',
        'auth/id-token-revoked',
        'auth/invalid-id-token',
        'auth/user-disabled',
        'auth/user-not-found',
      ]);
      if (invalidCredentialCodes.has(code) || error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Unauthorized');
      }
      throw new ServiceUnavailableException('Authentication service temporarily unavailable');
    }

    request.firebaseIdentity = identity;
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: identity.uid },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        referralCode: true,
      },
    });

    if (!user) {
      const allowUnlinkedUser = this.reflector.getAllAndOverride<boolean>(
        ALLOW_UNLINKED_FIREBASE_USER_KEY,
        [handler, controller],
      );
      if (allowUnlinkedUser) {
        return true;
      }
      throw new UnauthorizedException('Unauthorized');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Unauthorized');
    }

    request.user = user;
    return true;
  }
}
