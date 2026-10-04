import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RandomService } from '../shared/random.service';
import { FirebaseService } from '../firebase/firebase.service';
import { SyncUserDto } from './dto/sync-user.dto';

export interface VerifiedFirebaseIdentity {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  firebase?: { sign_in_provider?: string };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly randomService: RandomService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async login(body: { email?: string; password?: string }) {
    // Direct passwordless token minting is strictly prohibited (F1)
    throw new BadRequestException(
      'Direct passwordless authentication is disabled. Authenticate with Firebase and call /auth/sync.',
    );
  }

  async register(body: { name?: string; email?: string; password?: string; referralCode?: string; phone?: string }) {
    // Direct unverified registration is strictly prohibited (F1)
    throw new BadRequestException(
      'Direct registration without Firebase identity is disabled. Create user with Firebase and call /auth/sync.',
    );
  }

  async guestLogin() {
    // Direct guest token minting is strictly prohibited (F1)
    throw new BadRequestException(
      'Direct guest token creation is disabled. Sign in anonymously with Firebase and call /auth/sync.',
    );
  }

  async refreshToken(refreshToken?: string) {
    throw new BadRequestException(
      'Token refresh is handled directly via the Firebase Auth client SDK.',
    );
  }

  async syncUser(identity: VerifiedFirebaseIdentity, profile: SyncUserDto = {}) {
    if (!identity || !identity.uid) {
      throw new UnauthorizedException('Invalid Firebase identity: UID missing');
    }

    const signInProvider = identity.firebase?.sign_in_provider ?? (identity.email ? 'password' : 'anonymous');
    const isGuest = signInProvider === 'anonymous' || !identity.email;
    const cleanEmail = identity.email ? identity.email.trim().toLowerCase() : null;

    try {
      // 1. Look up by firebaseUid first
      let existingUser = await this.prisma.user.findUnique({
        where: { firebaseUid: identity.uid },
      });

      // 2. Email-based linking only if email_verified is TRUE and existing row has NO firebaseUid yet (seeded admin)
      if (!existingUser && cleanEmail && identity.email_verified === true) {
        const userByEmail = await this.prisma.user.findFirst({
          where: { email: cleanEmail },
        });

        if (userByEmail && !userByEmail.firebaseUid) {
          existingUser = await this.prisma.user.update({
            where: { id: userByEmail.id },
            data: {
              firebaseUid: identity.uid,
              emailVerified: userByEmail.emailVerified || new Date(),
              authProvider: signInProvider,
            },
          });
        }
      }

      const name = profile.name === undefined ? undefined : profile.name.trim() || null;
      const phone = profile.phone === undefined ? undefined : profile.phone.trim() || null;

      if (existingUser) {
        if (existingUser.status !== 'ACTIVE') {
          throw new UnauthorizedException('Account is inactive or suspended');
        }

        const verifiedAt = identity.email_verified
          ? existingUser.emailVerified ?? new Date()
          : null;

        return await this.prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: cleanEmail,
            emailVerified: verifiedAt,
            authProvider: signInProvider,
            isGuest: existingUser.isGuest && !isGuest ? false : existingUser.isGuest,
            ...(name !== undefined ? { name } : {}),
            ...(phone !== undefined ? { phone } : {}),
            ...(existingUser.isGuest && !isGuest ? { role: 'CUSTOMER' } : {}),
          },
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            authProvider: true,
            isGuest: true,
            role: true,
            status: true,
            imageUrl: true,
            phone: true,
            createdAt: true,
            referralCode: true,
            referralEarnings: true,
            referralTier: true,
            firebaseUid: true,
          },
        });
      }

      // 3. First-time registration with verified Firebase token
      try {
        return await this.prisma.user.create({
          data: {
            firebaseUid: identity.uid,
            name: name ?? identity.name?.trim() ?? (cleanEmail ? cleanEmail.split('@')[0].toUpperCase() : 'Guest Customer'),
            email: cleanEmail,
            emailVerified: identity.email_verified ? new Date() : null,
            authProvider: signInProvider,
            isGuest,
            role: isGuest ? 'GUEST' : 'CUSTOMER',
            phone: phone ?? null,
            status: 'ACTIVE',
            referralCode: this.randomService.generateReferralCode(),
          },
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            authProvider: true,
            isGuest: true,
            role: true,
            status: true,
            imageUrl: true,
            phone: true,
            createdAt: true,
            referralCode: true,
            referralEarnings: true,
            referralTier: true,
            firebaseUid: true,
          },
        });
      } catch (createErr: any) {
        // Handle concurrent first-login race conditions
        const recheck = await this.prisma.user.findUnique({
          where: { firebaseUid: identity.uid },
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
            authProvider: true,
            isGuest: true,
            role: true,
            status: true,
            imageUrl: true,
            phone: true,
            createdAt: true,
            referralCode: true,
            referralEarnings: true,
            referralTier: true,
            firebaseUid: true,
          },
        });
        if (recheck) {
          return recheck;
        }
        throw createErr;
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`Database error during user sync: ${err?.message || err}`);
      throw new ServiceUnavailableException('Authentication service temporarily unavailable');
    }
  }

  async getUserProfile(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          imageUrl: true,
          emailVerified: true,
          authProvider: true,
          isGuest: true,
          createdAt: true,
          referralCode: true,
          referralEarnings: true,
          referralTier: true,
          firebaseUid: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(`Database error getting user profile: ${err?.message || err}`);
      throw new ServiceUnavailableException('Service temporarily unavailable');
    }
  }

  async updateUserProfile(
    userId: string,
    data: { name?: string; phone?: string },
  ) {
    const updates: { name?: string; phone?: string | null } = {};

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('Name cannot be empty');
      }
      updates.name = trimmedName;
    }

    if (data.phone !== undefined) {
      updates.phone = data.phone?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return this.getUserProfile(userId);
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: updates,
      });
      return this.getUserProfile(userId);
    } catch (err: any) {
      this.logger.error(`Database error updating user profile: ${err?.message || err}`);
      throw new ServiceUnavailableException('Service temporarily unavailable');
    }
  }

  async signoutEverywhere(userId: string, firebaseUid?: string) {
    if (firebaseUid) {
      try {
        await this.firebaseService.revokeRefreshTokens(firebaseUid);
      } catch (err: any) {
        this.logger.warn(`Failed to revoke Firebase refresh tokens: ${err?.message || err}`);
      }
    }
    return { success: true, message: 'Signed out of all devices successfully' };
  }

  async deleteAccount(userId: string, firebaseUid?: string) {
    try {
      await this.prisma.address.deleteMany({ where: { userId } });
      await this.prisma.deviceToken.deleteMany({ where: { userId } });
      await this.prisma.cart.deleteMany({ where: { userId } });
      await this.prisma.wishlist.deleteMany({ where: { userId } });

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted Customer',
          email: `deleted_${userId.slice(0, 8)}@laptopmitra.local`,
          phone: null,
          status: 'DELETED',
          isGuest: false,
        },
      });
    } catch (err: any) {
      this.logger.error(`Database error deleting user account: ${err?.message || err}`);
      throw new ServiceUnavailableException('Service temporarily unavailable');
    }

    if (firebaseUid) {
      try {
        await this.firebaseService.deleteUser(firebaseUid);
      } catch (err: any) {
        this.logger.warn(`Failed to delete Firebase user: ${err?.message || err}`);
      }
    }

    return { success: true, message: 'Account deleted and personal information anonymized' };
  }

  async linkGuestAccount(userId: string, data: { email: string; password?: string; name?: string }) {
    throw new BadRequestException(
      'Account linking must be performed via Firebase Auth client SDK and verified via /auth/sync.',
    );
  }
}
