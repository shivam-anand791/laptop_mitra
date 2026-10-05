import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'node:fs';
import { FirebaseService } from '../../src/firebase/firebase.service';

jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('firebase-admin/app', () => ({
  cert: jest.fn((value) => ({ value })),
  getApps: jest.fn(),
  initializeApp: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

describe('FirebaseService', () => {
  const existingApp = { name: '[DEFAULT]' };
  const verifyIdToken = jest.fn();
  const configValues: Record<string, string | undefined> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(configValues).forEach((key) => delete configValues[key]);
    (getApps as jest.Mock).mockReturnValue([]);
    (initializeApp as jest.Mock).mockReturnValue(existingApp);
    (getAuth as jest.Mock).mockReturnValue({ verifyIdToken });
    verifyIdToken.mockResolvedValue({ uid: 'firebase-user' });
  });

  const createConfig = () =>
    ({
      get: (key: string) => configValues[key],
    }) as unknown as ConfigService;

  it('fails startup when no Firebase credentials are configured', () => {
    expect(() => new FirebaseService(createConfig())).toThrow(
      /Firebase Admin credentials are missing/,
    );
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('initializes successfully with a valid service account file path', () => {
    configValues.FIREBASE_SERVICE_ACCOUNT_PATH = './secrets/firebase-service-account.json';

    const service = new FirebaseService(createConfig());

    expect(cert).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'laptop-mitra',
        clientEmail: expect.stringContaining('@'),
        privateKey: expect.stringContaining('PRIVATE KEY'),
      }),
    );
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(getAuth).toHaveBeenCalledWith(existingApp);
    expect(service).toBeInstanceOf(FirebaseService);
  });

  it('throws an actionable error when the configured service account file is missing', () => {
    configValues.FIREBASE_SERVICE_ACCOUNT_PATH = './non-existent/service-account.json';

    expect(() => new FirebaseService(createConfig())).toThrow(
      /Firebase service account file not found/,
    );
  });

  it('throws an actionable error when the service account JSON is malformed', () => {
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('{ invalid_json: ');

    configValues.FIREBASE_SERVICE_ACCOUNT_PATH = './secrets/malformed.json';

    expect(() => new FirebaseService(createConfig())).toThrow(
      /Malformed JSON in Firebase service account file/,
    );

    existsSpy.mockRestore();
    readSpy.mockRestore();
  });

  it('throws an actionable error when project ID does not match service account', () => {
    configValues.FIREBASE_SERVICE_ACCOUNT_PATH = './secrets/firebase-service-account.json';
    configValues.FIREBASE_PROJECT_ID = 'different-project-id';

    expect(() => new FirebaseService(createConfig())).toThrow(
      /Firebase project mismatch: service account has project_id "laptop-mitra", but FIREBASE_PROJECT_ID is "different-project-id"/,
    );
  });

  it('initializes in env-var mode and properly converts escaped newlines in private key', () => {
    configValues.FIREBASE_PROJECT_ID = 'test-proj';
    configValues.FIREBASE_CLIENT_EMAIL = 'admin@test-proj.iam.gserviceaccount.com';
    configValues.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk\\n-----END PRIVATE KEY-----\\n';

    const service = new FirebaseService(createConfig());

    expect(cert).toHaveBeenCalledWith({
      projectId: 'test-proj',
      clientEmail: 'admin@test-proj.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk\n-----END PRIVATE KEY-----\n',
    });
    expect(service).toBeInstanceOf(FirebaseService);
  });

  it('guards against double initialization and reuses existing default app on hot reload', () => {
    configValues.FIREBASE_SERVICE_ACCOUNT_PATH = './secrets/firebase-service-account.json';
    (getApps as jest.Mock).mockReturnValue([existingApp]);

    new FirebaseService(createConfig());

    expect(initializeApp).not.toHaveBeenCalled();
    expect(getAuth).toHaveBeenCalledWith(existingApp);
  });

  it('checks token revocation in production', async () => {
    configValues.FIREBASE_SERVICE_ACCOUNT_PATH = './secrets/firebase-service-account.json';
    configValues.NODE_ENV = 'production';

    const service = new FirebaseService(createConfig());
    await service.verifyIdToken('test-id-token');

    expect(verifyIdToken).toHaveBeenCalledWith('test-id-token', true);
  });
});