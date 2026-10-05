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

  constructor(private readonly configService: ConfigService) {
    let auth: Auth;
    try {
      const { credential, projectId, clientEmail } = this.getCredential();
      const existingApps = getApps();
      const app: App = existingApps.length > 0
        ? existingApps[0]
        : initializeApp({ credential, projectId });
      auth = getAuth(app);

      if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
        this.logger.log(`Using Firebase Auth Emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
      }
      this.logger.log(`Firebase Admin initialized successfully for project: ${projectId} (client_email: ${clientEmail})`);
    } catch (error: any) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const sanitized = rawMessage.replace(/-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g, '[REDACTED_KEY]');
      this.logger.error(`Firebase Admin initialization failed: ${sanitized}`);
      if (
        rawMessage.startsWith('Firebase Admin credentials are missing') ||
        rawMessage.startsWith('Firebase service account') ||
        rawMessage.startsWith('Firebase project mismatch') ||
        rawMessage.startsWith('Malformed JSON') ||
        rawMessage.startsWith('FIREBASE_PRIVATE_KEY')
      ) {
        throw new Error(sanitized);
      }
      throw new Error('Firebase Admin initialization failed. Verify the configured credentials and project.');
    }
    this.auth = auth;

    const configuredCheckRevoked = this.configService.get<string>('FIREBASE_CHECK_REVOKED')?.toLowerCase();
    this.checkRevoked = configuredCheckRevoked === 'true'
      ? true
      : configuredCheckRevoked === 'false'
        ? false
        : this.configService.get<string>('NODE_ENV') === 'production';
  }

  createCustomToken(uid: string, developerClaims?: object): Promise<string> {
    if (!this.auth || typeof this.auth.createCustomToken !== 'function') {
      throw new Error('Firebase Auth is not initialized');
    }
    return this.auth.createCustomToken(uid, developerClaims);
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.auth || typeof this.auth.verifyIdToken !== 'function') {
      throw new Error('Firebase Auth is not initialized');
    }
    return this.auth.verifyIdToken(idToken, this.checkRevoked);
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
    const rawPath =
      this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH') ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

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
      if (!resolvedPath) {
        throw new Error(
          `Firebase service account file not found. Checked locations: ${candidatePaths.map((p) => `"${p}"`).join(', ')}`,
        );
      }

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

      const envProjectId =
        this.configService.get<string>('FIREBASE_PROJECT_ID') || process.env.FIREBASE_PROJECT_ID;
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
    }

    const projectId =
      this.configService.get<string>('FIREBASE_PROJECT_ID') || process.env.FIREBASE_PROJECT_ID;
    const clientEmail =
      this.configService.get<string>('FIREBASE_CLIENT_EMAIL') || process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey =
      this.configService.get<string>('FIREBASE_PRIVATE_KEY') || process.env.FIREBASE_PRIVATE_KEY;

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