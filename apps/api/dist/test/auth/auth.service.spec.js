"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const auth_service_1 = require("../../src/auth/auth.service");
const prisma_service_1 = require("../../src/prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const random_service_1 = require("../../src/shared/random.service");
jest.mock('bcrypt');
describe('AuthService', () => {
    let authService;
    let prismaService;
    let jwtService;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: {
                        user: {
                            findUnique: jest.fn(),
                            create: jest.fn(),
                            update: jest.fn(),
                        },
                        refreshToken: {
                            create: jest.fn(),
                            deleteMany: jest.fn(),
                            findUnique: jest.fn(),
                            delete: jest.fn(),
                        },
                    },
                },
                {
                    provide: jwt_1.JwtService,
                    useValue: {
                        sign: jest.fn().mockReturnValue('jwt-token'),
                    },
                },
                {
                    provide: random_service_1.RandomService,
                    useValue: {
                        generateReferralCode: jest.fn().mockReturnValue('REF1234'),
                        generateOtp: jest.fn().mockReturnValue('123456'),
                    },
                },
            ],
        }).compile();
        authService = module.get(auth_service_1.AuthService);
        prismaService = module.get(prisma_service_1.PrismaService);
        jwtService = module.get(jwt_1.JwtService);
    });
    describe('register', () => {
        const registerDto = {
            name: 'John Doe',
            email: 'john@example.com',
            password: 'Password123!',
            phone: '+919876543210',
        };
        it('should successfully register a new user', async () => {
            prismaService.user.findUnique.mockResolvedValue(null);
            prismaService.user.create.mockResolvedValue({
                id: 'user-1',
                email: registerDto.email,
                name: registerDto.name,
                role: 'USER',
            });
            bcrypt.hash.mockResolvedValue('hashedPassword');
            jwtService.sign.mockReturnValue('jwt-token');
            prismaService.refreshToken.create.mockResolvedValue({});
            const result = await authService.register(registerDto);
            expect(result.user.email).toBe(registerDto.email);
            expect(result.user.name).toBe(registerDto.name);
            expect(result.accessToken).toBe('jwt-token');
            expect(result.refreshToken).toBe('jwt-token');
            expect(prismaService.user.findUnique).toHaveBeenCalledWith({
                where: { email: registerDto.email },
            });
            expect(prismaService.user.create).toHaveBeenCalled();
        });
        it('should throw ConflictException if user already exists', async () => {
            prismaService.user.findUnique.mockResolvedValue({
                id: 'user-1',
                email: registerDto.email,
            });
            await expect(authService.register(registerDto)).rejects.toThrow(common_1.ConflictException);
        });
    });
    describe('login', () => {
        const loginDto = {
            email: 'john@example.com',
            password: 'Password123!',
        };
        const mockUser = {
            id: 'user-1',
            email: loginDto.email,
            password: 'hashedPassword',
            name: 'John Doe',
            role: 'USER',
            status: 'ACTIVE',
        };
        it('should successfully login user', async () => {
            prismaService.user.findUnique.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwtService.sign.mockReturnValue('jwt-token');
            prismaService.refreshToken.create.mockResolvedValue({});
            const result = await authService.login(loginDto);
            expect(result.user.email).toBe(loginDto.email);
            expect(result.accessToken).toBe('jwt-token');
            expect(prismaService.user.findUnique).toHaveBeenCalledWith({
                where: { email: loginDto.email },
                select: expect.any(Object),
            });
            expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
        });
        it('should throw UnauthorizedException if user not found', async () => {
            prismaService.user.findUnique.mockResolvedValue(null);
            await expect(authService.login(loginDto)).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException if password is invalid', async () => {
            prismaService.user.findUnique.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);
            await expect(authService.login(loginDto)).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
    describe('refreshToken', () => {
        it('should return new tokens when refresh token is valid', async () => {
            const mockRefreshToken = {
                id: 'token-1',
                token: 'refresh-token',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                user: {
                    id: 'user-1',
                    email: 'john@example.com',
                    role: 'USER',
                    status: 'ACTIVE',
                },
            };
            prismaService.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
            prismaService.refreshToken.delete.mockResolvedValue({});
            prismaService.refreshToken.create.mockResolvedValue({});
            jwtService.sign.mockReturnValue('new-jwt-token');
            const result = await authService.refreshToken('user-1', 'refresh-token');
            expect(result.accessToken).toBe('new-jwt-token');
            expect(result.refreshToken).toBe('new-jwt-token');
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map