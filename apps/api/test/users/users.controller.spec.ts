import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UsersController - GET /users/:id (Finding H1 IDOR Protection)', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUserA = { id: 'user-a', role: 'CUSTOMER', email: 'user.a@example.com' };
  const mockUserB = { id: 'user-b', role: 'CUSTOMER', email: 'user.b@example.com' };
  const mockAdmin = { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' };
  const mockGuest = { id: 'guest-1', role: 'GUEST', isGuest: true };

  const mockProfileA = {
    id: 'user-a',
    name: 'User A',
    email: 'user.a@example.com',
    phone: '+919876543210',
    gender: 'MALE',
    dob: null,
    address: '123 Tech Lane',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    referralCode: 'REFA123',
    createdAt: new Date(),
    updatedAt: new Date(),
    role: 'CUSTOMER',
    status: 'ACTIVE',
    imageUrl: null,
  } as any;

  const mockProfileB = {
    id: 'user-b',
    name: 'User B',
    email: 'user.b@example.com',
    phone: '+919123456780',
    gender: 'FEMALE',
    dob: null,
    address: '456 Cyber Park',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560100',
    referralCode: 'REFB456',
    createdAt: new Date(),
    updatedAt: new Date(),
    role: 'CUSTOMER',
    status: 'ACTIVE',
    imageUrl: null,
  } as any;

  beforeEach(async () => {
    const mockUsersService = {
      findById: jest.fn(),
      updateProfile: jest.fn(),
      updateAddress: jest.fn(),
      getUserStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('GET /users/:id authorization', () => {
    it('allows a user reading their own id and returns profile', async () => {
      usersService.findById.mockResolvedValue(mockProfileA);

      const result = await controller.getUserById(mockUserA, 'user-a');

      expect(result).toEqual(mockProfileA);
      expect(usersService.findById).toHaveBeenCalledWith('user-a');
    });

    it("throws ForbiddenException (403) when a user tries reading someone else's id", async () => {
      await expect(controller.getUserById(mockUserA, 'user-b')).rejects.toThrow(ForbiddenException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it('allows an ADMIN reading any id and returns the profile', async () => {
      usersService.findById.mockResolvedValue(mockProfileB);

      const result = await controller.getUserById(mockAdmin, 'user-b');

      expect(result).toEqual(mockProfileB);
      expect(usersService.findById).toHaveBeenCalledWith('user-b');
    });

    it("throws ForbiddenException (403) when a GUEST tries reading any other id", async () => {
      await expect(controller.getUserById(mockGuest, 'user-a')).rejects.toThrow(ForbiddenException);
      await expect(controller.getUserById(mockGuest, 'user-b')).rejects.toThrow(ForbiddenException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it('allows a GUEST reading their own id', async () => {
      const mockGuestProfile = { ...mockProfileA, id: 'guest-1', role: 'GUEST' };
      usersService.findById.mockResolvedValue(mockGuestProfile);

      const result = await controller.getUserById(mockGuest, 'guest-1');

      expect(result).toEqual(mockGuestProfile);
      expect(usersService.findById).toHaveBeenCalledWith('guest-1');
    });

    it('propagates NotFoundException if the requested user does not exist and requester is allowed', async () => {
      usersService.findById.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.getUserById(mockAdmin, 'non-existent')).rejects.toThrow(NotFoundException);
      expect(usersService.findById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('Route non-shadowing and profile endpoints', () => {
    it('getProfile uses authenticated user id', async () => {
      usersService.findById.mockResolvedValue(mockProfileA);

      const result = await controller.getProfile(mockUserA);

      expect(result).toEqual(mockProfileA);
      expect(usersService.findById).toHaveBeenCalledWith('user-a');
    });

    it('getStats uses authenticated user id', async () => {
      const mockStats = { cartItems: 2, wishlistItems: 1, orders: 3 };
      usersService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUserA);

      expect(result).toEqual(mockStats);
      expect(usersService.getUserStats).toHaveBeenCalledWith('user-a');
    });
  });
});
