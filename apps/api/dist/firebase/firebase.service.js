"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FirebaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
let FirebaseService = FirebaseService_1 = class FirebaseService {
    configService;
    logger = new common_1.Logger(FirebaseService_1.name);
    auth;
    checkRevoked;
    constructor(configService) {
        this.configService = configService;
        let auth;
        try {
            const { credential, projectId, clientEmail } = this.getCredential();
            const existingApps = (0, app_1.getApps)();
            const app = existingApps.length > 0
                ? existingApps[0]
                : (0, app_1.initializeApp)({ credential, projectId });
            auth = (0, auth_1.getAuth)(app);
            if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
                this.logger.log(`Using Firebase Auth Emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
            }
            this.logger.log(`Firebase Admin initialized successfully for project: ${projectId} (client_email: ${clientEmail})`);
        }
        catch (error) {
            const rawMessage = error instanceof Error ? error.message : String(error);
            const sanitized = rawMessage.replace(/-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g, '[REDACTED_KEY]');
            this.logger.error(`Firebase Admin initialization failed: ${sanitized}`);
            if (rawMessage.startsWith('Firebase Admin credentials are missing') ||
                rawMessage.startsWith('Firebase service account') ||
                rawMessage.startsWith('Firebase project mismatch') ||
                rawMessage.startsWith('Malformed JSON') ||
                rawMessage.startsWith('FIREBASE_PRIVATE_KEY')) {
                throw new Error(sanitized);
            }
            throw new Error('Firebase Admin initialization failed. Verify the configured credentials and project.');
        }
        this.auth = auth;
        const configuredCheckRevoked = this.configService.get('FIREBASE_CHECK_REVOKED')?.toLowerCase();
        this.checkRevoked = configuredCheckRevoked === 'true'
            ? true
            : configuredCheckRevoked === 'false'
                ? false
                : this.configService.get('NODE_ENV') === 'production';
    }
    createCustomToken(uid, developerClaims) {
        if (!this.auth || typeof this.auth.createCustomToken !== 'function') {
            throw new Error('Firebase Auth is not initialized');
        }
        return this.auth.createCustomToken(uid, developerClaims);
    }
    async verifyIdToken(idToken) {
        if (!this.auth || typeof this.auth.verifyIdToken !== 'function') {
            throw new Error('Firebase Auth is not initialized');
        }
        return this.auth.verifyIdToken(idToken, this.checkRevoked);
    }
    async revokeRefreshTokens(uid) {
        if (this.auth && typeof this.auth.revokeRefreshTokens === 'function') {
            await this.auth.revokeRefreshTokens(uid);
        }
    }
    async deleteUser(uid) {
        if (this.auth && typeof this.auth.deleteUser === 'function') {
            await this.auth.deleteUser(uid);
        }
    }
    getCredential() {
        const rawPath = this.configService.get('FIREBASE_SERVICE_ACCOUNT_PATH') ||
            process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        if (rawPath && typeof rawPath === 'string' && rawPath.trim().length > 0) {
            const trimmedPath = rawPath.trim();
            const packageRoot = (0, node_path_1.resolve)(__dirname, '..', '..');
            const candidatePaths = [];
            if ((0, node_path_1.isAbsolute)(trimmedPath)) {
                candidatePaths.push(trimmedPath);
            }
            else {
                candidatePaths.push((0, node_path_1.resolve)(packageRoot, trimmedPath));
                candidatePaths.push((0, node_path_1.resolve)(process.cwd(), trimmedPath));
                candidatePaths.push((0, node_path_1.resolve)(process.cwd(), 'apps', 'api', trimmedPath));
            }
            const resolvedPath = candidatePaths.find((p) => (0, node_fs_1.existsSync)(p));
            if (!resolvedPath) {
                throw new Error(`Firebase service account file not found. Checked locations: ${candidatePaths.map((p) => `"${p}"`).join(', ')}`);
            }
            let fileContent;
            try {
                fileContent = (0, node_fs_1.readFileSync)(resolvedPath, 'utf8');
            }
            catch (err) {
                throw new Error(`Failed to read Firebase service account file at "${resolvedPath}": ${err.message}`);
            }
            let parsed;
            try {
                parsed = JSON.parse(fileContent);
            }
            catch {
                throw new Error(`Malformed JSON in Firebase service account file at "${resolvedPath}"`);
            }
            if (!parsed || typeof parsed !== 'object') {
                throw new Error(`Firebase service account file at "${resolvedPath}" is not a valid JSON object`);
            }
            if (parsed.type !== 'service_account') {
                throw new Error(`Firebase service account at "${resolvedPath}" has invalid type "${parsed.type}" (expected "service_account")`);
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
            const envProjectId = this.configService.get('FIREBASE_PROJECT_ID') || process.env.FIREBASE_PROJECT_ID;
            if (envProjectId && envProjectId.trim() !== parsed.project_id.trim()) {
                throw new Error(`Firebase project mismatch: service account has project_id "${parsed.project_id}", but FIREBASE_PROJECT_ID is "${envProjectId}"`);
            }
            const formattedKey = parsed.private_key.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
            return {
                credential: (0, app_1.cert)({
                    projectId: parsed.project_id,
                    clientEmail: parsed.client_email,
                    privateKey: formattedKey,
                }),
                projectId: parsed.project_id,
                clientEmail: parsed.client_email,
            };
        }
        const projectId = this.configService.get('FIREBASE_PROJECT_ID') || process.env.FIREBASE_PROJECT_ID;
        const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL') || process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = this.configService.get('FIREBASE_PRIVATE_KEY') || process.env.FIREBASE_PRIVATE_KEY;
        if (projectId && clientEmail && privateKey) {
            privateKey = privateKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
            return {
                credential: (0, app_1.cert)({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                projectId,
                clientEmail,
            };
        }
        const missingVars = [];
        if (!projectId)
            missingVars.push('FIREBASE_PROJECT_ID');
        if (!clientEmail)
            missingVars.push('FIREBASE_CLIENT_EMAIL');
        if (!privateKey)
            missingVars.push('FIREBASE_PRIVATE_KEY');
        throw new Error(`Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_PATH or provide: ${missingVars.join(', ')}.`);
    }
};
exports.FirebaseService = FirebaseService;
exports.FirebaseService = FirebaseService = FirebaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FirebaseService);
//# sourceMappingURL=firebase.service.js.map