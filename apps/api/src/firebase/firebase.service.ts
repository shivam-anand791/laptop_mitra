import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly auth: Auth;
  private readonly checkRevoked: boolean;
  private readonly projectId: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    let auth: Auth;
    let resolvedProjectId: string;

    try {
      // 1. Emulator check: Refuse emulator in production; only enable when NODE_ENV=test or ALLOW_FIREBASE_EMULATOR=true
      const emulatorHost = this.configService.get<string>('FIREBASE_AUTH_EMULATOR_HOST');
      const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
      const allowEmulator = this.configService.get<string>('ALLOW_FIREBASE_EMULATOR') === 'true' || nodeEnv === 'test';

      if (emulatorHost) {
        if (this.isProduction) {
          throw new Error('FIREBASE_AUTH_EMULATOR_HOST is strictly forbidden in production');
        }
        if (allowEmulator) {
          process.env.FIREBASE_AUTH_EMULATOR_HOST = emulatorHost;
          this.logger.log(`Using Firebase Auth Emulator at ${emulatorHost}`);
        } else {
          this.logger.warn(
            `FIREBASE_AUTH_EMULATOR_HOST is set but emulator mode is only enabled when NODE_ENV=test or ALLOW_FIREBASE_EMULATOR=true. Ignoring.`,
          );
        }
      }

      // 2. Resolve credentials & Project ID
      const { credential, projectId } = this.getCredential();
      resolvedProjectId = projectId;

      // 3. Verify Project ID alignment
      const expectedProjectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      if (expectedProjectId && expectedProjectId.trim() !== projectId.trim()) {
        throw new Error(
          `Firebase project mismatch: configured credentials use project "${projectId}", but FIREBASE_PROJECT_ID is "${expectedProjectId}"`,
        );
      }

      const devProjectId = this.configService.get<string>('FIREBASE_DEV_PROJECT_ID');
      if (!this.isProduction && devProjectId && projectId === 'laptop-mitra') {
        this.logger.warn(
          `[DEV PROJECT NOTICE] Profile configured for dev project "${devProjectId}", but credentials currently target production project "${projectId}".`,
        );
      }

      const existingApps = getApps();
      const existingApp = existingApps.find((candidate) => candidate.name === '[DEFAULT]');
      if (existingApp && existingApp.options.projectId !== projectId) {
        throw new Error('Firebase project mismatch between the initialized app and configured credentials');
      }

      const app: App = existingApp ?? initializeApp({ credential, projectId });
      auth = getAuth(app);

      this.logger.log(`Firebase Admin initialized successfully for project "${projectId}"`);
    } catch (error: any) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const sanitized = rawMessage.replace(/-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g, '[REDACTED_KEY]');
      this.logger.error(`Firebase Admin initialization failed: ${sanitized}`);
      if (
        rawMessage.startsWith('Firebase Admin credentials are missing') ||
        rawMessage.startsWith('Firebase service account') ||
        rawMessage.startsWith('Firebase project mismatch') ||
        rawMessage.startsWith('FIREBASE_AUTH_EMULATOR_HOST') ||
        rawMessage.startsWith('Malformed JSON') ||
        rawMessage.startsWith('FIREBASE_PRIVATE_KEY')
      ) {
        throw new Error(sanitized);
      }
      throw new Error('Firebase Admin initialization failed. Verify the configured credentials and project.');
    }

    this.auth = auth;
    this.projectId = resolvedProjectId;

    const configuredCheckRevoked = this.configService.get<string>('FIREBASE_CHECK_REVOKED')?.toLowerCase();
    this.checkRevoked = configuredCheckRevoked === 'true';
  }

  getProjectId(): string {
    return this.projectId;
  }

  createCustomToken(uid: string, developerClaims?: object): Promise<string> {
    if (!this.auth || typeof this.auth.createCustomToken !== 'function') {
      throw new Error('Firebase Auth is not initialized');
    }
    return this.auth.createCustomToken(uid, developerClaims);
  }

  async verifyIdToken(idToken: string, checkRevoked = this.checkRevoked): Promise<DecodedIdToken> {
    if (!this.auth || typeof this.auth.verifyIdToken !== 'function') {
      const err: any = new Error('Firebase Auth is not initialized');
      err.code = 'FIREBASE_UNCONFIGURED';
      throw err;
    }

    let decoded: DecodedIdToken;
    try {
      decoded = await this.auth.verifyIdToken(idToken, checkRevoked);
    } catch (verifyErr: any) {
      const msg = String(verifyErr?.message || verifyErr);
      if (
        verifyErr?.code === 'auth/argument-error' ||
        verifyErr?.code === 'auth/invalid-id-token' ||
        msg.includes('incorrect "aud"') ||
        msg.includes('incorrect "iss"') ||
        msg.includes('audience')
      ) {
        const wrongProjErr: any = new Error(`Token audience or issuer does not match project "${this.projectId}"`);
        wrongProjErr.code = 'TOKEN_WRONG_PROJECT';
        throw wrongProjErr;
      }
      throw verifyErr;
    }

    // Strict project ID audience check: if token has aud claim, it must match this project
    if (decoded?.aud && decoded.aud !== this.projectId) {
      const err: any = new Error(`Token audience "${decoded.aud}" does not match project "${this.projectId}"`);
      err.code = 'TOKEN_WRONG_PROJECT';
      throw err;
    }

    const expectedIssuer = `https://securetoken.google.com/${this.projectId}`;
    if (decoded?.iss && decoded.iss !== expectedIssuer) {
      const err: any = new Error(`Token issuer "${decoded.iss}" does not match expected "${expectedIssuer}"`);
      err.code = 'TOKEN_WRONG_PROJECT';
      throw err;
    }

    // Refuse emulator tokens in production
    if (this.isProduction && ((decoded as any)?.firebase?.sign_in_provider === 'emulator' || (decoded as any)?.emulator)) {
      const err: any = new Error('Emulator-issued tokens are strictly refused in production');
      err.code = 'TOKEN_INVALID';
      throw err;
    }

    return decoded;
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    if (this.auth && typeof this.auth.revokeRefreshTokens === 'function') {
      await this.auth.revokeRefreshTokens(uid);
    }
  }

  async deleteUser(uid: string): Promise<void> {
    if (this.auth && typeof this.auth.deleteUser === 'function') {
      await this.auth.deleteUser(uid);
    }
  }

  private getCredential(): { credential: any; projectId: string; clientEmail: string } {
    const rawPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

    if (rawPath && typeof rawPath === 'string' && rawPath.trim().length > 0) {
      const trimmedPath = rawPath.trim();
      const packageRoot = resolve(__dirname, '..', '..');
      const candidatePaths: string[] = [];

      if (isAbsolute(trimmedPath)) {
        candidatePaths.push(trimmedPath);
      } else {
        candidatePaths.push(resolve(packageRoot, trimmedPath));
        candidatePaths.push(resolve(process.cwd(), trimmedPath));
        candidatePaths.push(resolve(process.cwd(), 'apps', 'api', trimmedPath));
      }

      const resolvedPath = candidatePaths.find((p) => existsSync(p));
      if (resolvedPath) {
        let fileContent: string;
        try {
          fileContent = readFileSync(resolvedPath, 'utf8');
        } catch (err: any) {
          throw new Error(`Failed to read Firebase service account file at "${resolvedPath}": ${err.message}`);
        }

        let parsed: any;
        try {
          parsed = JSON.parse(fileContent);
        } catch {
          throw new Error(`Malformed JSON in Firebase service account file at "${resolvedPath}"`);
        }

        if (!parsed || typeof parsed !== 'object') {
          throw new Error(`Firebase service account file at "${resolvedPath}" is not a valid JSON object`);
        }

        if (parsed.type !== 'service_account') {
          throw new Error(
            `Firebase service account at "${resolvedPath}" has invalid type "${parsed.type}" (expected "service_account")`,
          );
        }

        if (!parsed.project_id || typeof parsed.project_id !== 'string') {
          throw new Error(`Firebase service account at "${resolvedPath}" is missing "project_id" field`);
        }

        if (!parsed.client_email || typeof parsed.client_email !== 'string') {
          throw new Error(`Firebase service account at "${resolvedPath}" is missing "client_email" field`);
        }

        if (!parsed.private_key || typeof parsed.private_key !== 'string') {
          throw new Error(`Firebase service account at "${resolvedPath}" is missing "private_key" field`);
        }

        const envProjectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
        if (envProjectId && envProjectId.trim() !== parsed.project_id.trim()) {
          throw new Error(
            `Firebase project mismatch: service account has project_id "${parsed.project_id}", but FIREBASE_PROJECT_ID is "${envProjectId}"`,
          );
        }

        const formattedKey = parsed.private_key.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');

        return {
          credential: cert({
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: formattedKey,
          }),
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
        };
      } else {
        const hasEnvCreds =
          !!this.configService.get<string>('FIREBASE_PRIVATE_KEY') &&
          !!this.configService.get<string>('FIREBASE_PROJECT_ID');

        if (!hasEnvCreds) {
          throw new Error(
            `Firebase service account file not found. Checked locations: ${candidatePaths.map((p) => `"${p}"`).join(', ')}`,
          );
        }

        this.logger.warn(
          `Firebase service account file not found at configured path "${trimmedPath}". Gracefully falling back to environment variables.`,
        );
      }
    }

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (projectId && clientEmail && privateKey) {
      privateKey = privateKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
      return {
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
        clientEmail,
      };
    }

    const missingVars: string[] = [];
    if (!projectId) missingVars.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missingVars.push('FIREBASE_PRIVATE_KEY');

    throw new Error(
      `Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_PATH or provide: ${missingVars.join(', ')}.`,
    );
  }
}
