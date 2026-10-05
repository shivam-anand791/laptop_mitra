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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../../prisma/prisma.service");
const allow_firebase_sync_decorator_1 = require("../../decorators/allow-firebase-sync.decorator");
const public_decorator_1 = require("../../decorators/public.decorator");
const firebase_service_1 = require("../../firebase/firebase.service");
let FirebaseAuthGuard = class FirebaseAuthGuard {
    reflector;
    firebaseService;
    prisma;
    constructor(reflector, firebaseService, prisma) {
        this.reflector = reflector;
        this.firebaseService = firebaseService;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const handler = context.getHandler();
        const controller = context.getClass();
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.PUBLIC_ROUTE_KEY, [handler, controller]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const authorization = request.headers?.authorization;
        const match = typeof authorization === 'string'
            ? /^Bearer\s+(.+)$/i.exec(authorization.trim())
            : null;
        if (!match) {
            throw new common_1.UnauthorizedException('Unauthorized');
        }
        let identity;
        try {
            identity = await this.firebaseService.verifyIdToken(match[1]);
            if (!identity.uid) {
                throw new Error('Firebase identity has no UID');
            }
        }
        catch {
            throw new common_1.UnauthorizedException('Unauthorized');
        }
        request.firebaseIdentity = identity;
        let user = await this.prisma.user.findUnique({
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
            user = await this.prisma.user.findUnique({
                where: { id: identity.uid },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                    referralCode: true,
                },
            });
        }
        if (!user) {
            const allowUnlinkedUser = this.reflector.getAllAndOverride(allow_firebase_sync_decorator_1.ALLOW_UNLINKED_FIREBASE_USER_KEY, [handler, controller]);
            if (allowUnlinkedUser) {
                return true;
            }
            throw new common_1.UnauthorizedException('Unauthorized');
        }
        if (user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('Unauthorized');
        }
        request.user = user;
        return true;
    }
};
exports.FirebaseAuthGuard = FirebaseAuthGuard;
exports.FirebaseAuthGuard = FirebaseAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        firebase_service_1.FirebaseService,
        prisma_service_1.PrismaService])
], FirebaseAuthGuard);
//# sourceMappingURL=firebase-auth.guard.js.map