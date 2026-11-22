import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(FirebaseAuthGuard.name);

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
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization Bearer token',
        code: 'TOKEN_INVALID',
      });
    }

    let identity;
    try {
      const checkRevoked = this.reflector.getAllAndOverride<boolean>(
        CHECK_FIREBASE_REVOCATION_KEY,
        [handler, controller],
      );
      identity = await this.firebaseService.verifyIdToken(match[1], checkRevoked);
      if (!identity?.uid) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Token identity does not contain a valid user ID',
          code: 'TOKEN_INVALID',
        });
      }
    } catch (error: any) {
      const code = typeof error?.code === 'string' ? error.code : '';
      const message = typeof error?.message === 'string' ? error.message : '';

      // Project audience/issuer mismatch
      if (
        code === 'TOKEN_WRONG_PROJECT' ||
        message.includes('incorrect "aud"') ||
        message.includes('incorrect "iss"') ||
        message.includes('audience')
      ) {
        this.logger.warn(`Firebase token rejected due to project mismatch: ${message}`);
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Unauthorized: Token was issued for a different project',
          code: 'TOKEN_WRONG_PROJECT',
        });
      }

      // Expired token
      if (code === 'auth/id-token-expired') {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Unauthorized: Authentication token has expired. Please refresh your session.',
          code: 'TOKEN_EXPIRED',
        });
      }

      // Other invalid credential codes
      const invalidCredentialCodes = new Set([
        'auth/argument-error',
        'auth/id-token-revoked',
        'auth/invalid-id-token',
        'auth/user-disabled',
        'auth/user-not-found',
      ]);
      if (invalidCredentialCodes.has(code) || error instanceof UnauthorizedException) {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Unauthorized: Invalid authentication credentials',
          code: 'TOKEN_INVALID',
        });
      }

      // Firebase Admin unconfigured
      if (code === 'FIREBASE_UNCONFIGURED' || message.includes('Firebase Auth is not initialized')) {
        this.logger.error(`Firebase service unconfigured: ${message}`);
        throw new ServiceUnavailableException({
          statusCode: 503,
          error: 'Service Unavailable',
          message: 'Authentication service temporarily unavailable',
          code: 'FIREBASE_UNCONFIGURED',
        });
      }

      this.logger.error(`Firebase token verification failure: ${message}`);
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Authentication service temporarily unavailable',
        code: 'FIREBASE_UNAVAILABLE',
      });
    }

    request.firebaseIdentity = identity;
    const allowUnlinkedUser = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNLINKED_FIREBASE_USER_KEY,
      [handler, controller],
    );

    let user = null;
    try {
      user = await this.prisma.user.findUnique({
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
    } catch (dbErr: any) {
      if (allowUnlinkedUser) {
        return true;
      }
      this.logger.error(`Database connection failure in FirebaseAuthGuard: ${dbErr?.message || dbErr}`);
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'The server database is temporarily unavailable. Please try again shortly.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    if (!user) {
      if (allowUnlinkedUser) {
        return true;
      }
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Account profile not found. User sync required.',
        code: 'TOKEN_INVALID',
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'This account is currently suspended or inactive.',
        code: 'TOKEN_INVALID',
      });
    }

    request.user = user;
    return true;
  }
}
