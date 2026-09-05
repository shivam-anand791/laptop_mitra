import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RandomService } from '../../src/shared/random.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
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
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('jwt-token'),
          },
        },
        {
          provide: RandomService,
          useValue: {
            generateReferralCode: jest.fn().mockReturnValue('REF1234'),
            generateOtp: jest.fn().mockReturnValue('123456'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    const registerDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      phone: '+919876543210',
    };

    it('should successfully register a new user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: registerDto.email,
        name: registerDto.name,
        role: 'USER',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (jwtService.sign as jest.Mock).mockReturnValue('jwt-token');
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({});

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
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: registerDto.email,
      });

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
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
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.sign as jest.Mock).mockReturnValue('jwt-token');
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.accessToken).toBe('jwt-token');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        select: expect.any(Object),
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
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

      (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockRefreshToken);
      (prismaService.refreshToken.delete as jest.Mock).mockResolvedValue({});
      (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({});
      (jwtService.sign as jest.Mock).mockReturnValue('new-jwt-token');

      const result = await authService.refreshToken('user-1', 'refresh-token');

      expect(result.accessToken).toBe('new-jwt-token');
      expect(result.refreshToken).toBe('new-jwt-token');
    });
  });
});
