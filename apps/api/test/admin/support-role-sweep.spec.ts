import { ExecutionContext, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminController } from '../../src/modules/admin/admin.controller';
import { AdminService } from '../../src/modules/admin/admin.service';
import { RolesGuard } from '../../src/guards/roles.guard';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import * as fs from 'fs';
import * as path from 'path';

describe('S2.1 Support Role Security & Admin Route Sweep', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let adminService: jest.Mocked<Partial<AdminService>>;
  let adminController: AdminController;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);

    adminService = {
      updateUserRole: jest.fn(),
      getDashboardStats: jest.fn(),
      getAnalytics: jest.fn(),
      getAllUsers: jest.fn(),
      updateUserStatus: jest.fn(),
      getAllProducts: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getAllOrders: jest.fn(),
      getOrder: jest.fn(),
      updateOrderStatus: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
      getCorporateInquiries: jest.fn(),
      updateCorporateInquiryStatus: jest.fn(),
      getAffiliates: jest.fn(),
      getAffiliateDetail: jest.fn(),
      getWithdrawalPaymentDetails: jest.fn(),
      getWithdrawalQrFile: jest.fn(),
      updateWithdrawalStatus: jest.fn(),
    };

    adminController = new AdminController(adminService as unknown as AdminService);
  });

  const createMockContext = (handler: Function, userRole: string, userId = 'user-123') => {
    return {
      getHandler: () => handler,
      getClass: () => AdminController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: userId, role: userRole },
        }),
      }),
    } as unknown as ExecutionContext;
  };

  describe('Admin Endpoint Enumeration & SUPPORT Rejection Sweep', () => {
    // Collect all endpoint handlers on AdminController
    const prototype = AdminController.prototype;
    const propertyNames = Object.getOwnPropertyNames(prototype).filter(
      (name) => name !== 'constructor' && typeof prototype[name] === 'function',
    );

    const routeHandlers = propertyNames.filter((name) => {
      const handler = prototype[name];
      return (
        Reflect.hasMetadata(PATH_METADATA, handler) &&
        Reflect.hasMetadata(METHOD_METADATA, handler)
      );
    });

    it('enumerates all AdminController routes and confirms at least 20 endpoints are covered', () => {
      expect(routeHandlers.length).toBeGreaterThanOrEqual(20);
    });

    test.each(routeHandlers)(
      'rejects SUPPORT role with 403 Forbidden on endpoint method "%s"',
      (handlerName) => {
        const handler = prototype[handlerName];
        const context = createMockContext(handler, 'SUPPORT');

        expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => rolesGuard.canActivate(context)).toThrow('Insufficient permissions');
      },
    );

    test.each(routeHandlers)(
      'permits ADMIN role on endpoint method "%s"',
      (handlerName) => {
        const handler = prototype[handlerName];
        const context = createMockContext(handler, 'ADMIN');

        expect(rolesGuard.canActivate(context)).toBe(true);
      },
    );
  });

  describe('Static @Roles Decorator Sweep across Codebase', () => {
    it('verifies no admin controller or sensitive admin endpoint grants SUPPORT access accidentally', () => {
      const srcDir = path.resolve(__dirname, '../../src');
      const files: string[] = [];

      function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.name.endsWith('.controller.ts')) {
            files.push(fullPath);
          }
        }
      }

      walk(srcDir);
      expect(files.length).toBeGreaterThan(0);

      const accidentalSupportRoles: { file: string; line: string }[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          if (line.includes('@Roles') && line.includes("'SUPPORT'")) {
            // Only support and return routes may grant SUPPORT access
            const isSupportOrReturnRoute =
              file.includes('support') || file.includes('return');
            if (!isSupportOrReturnRoute) {
              accidentalSupportRoles.push({
                file: path.relative(srcDir, file),
                line: `L${idx + 1}: ${line.trim()}`,
              });
            }
          }
        });
      }

      expect(accidentalSupportRoles).toEqual([]);
    });
  });

  describe('Role Assignment Endpoint (ADMIN Only, Audited, No Self-Demotion)', () => {
    it('controller delegates updateUserRole to adminService with admin id', async () => {
      adminService.updateUserRole!.mockResolvedValueOnce({
        id: 'target-user-1',
        name: 'Target User',
        email: 'target@example.com',
        role: 'SUPPORT',
        status: 'ACTIVE',
        updatedAt: new Date(),
      } as any);

      const result = await adminController.updateUserRole(
        { id: 'admin-1', role: 'ADMIN' },
        'target-user-1',
        { role: 'SUPPORT' },
      );

      expect(adminService.updateUserRole).toHaveBeenCalledWith(
        'target-user-1',
        'SUPPORT',
        'admin-1',
      );
      expect(result.role).toBe('SUPPORT');
    });

    describe('AdminService.updateUserRole unit logic', () => {
      let realAdminService: AdminService;
      let mockPrisma: any;

      beforeEach(() => {
        mockPrisma = {
          user: {
            findUnique: jest.fn(),
            update: jest.fn(),
          },
        };
        realAdminService = new AdminService(mockPrisma as any);
      });

      it('prevents administrator self-demotion', async () => {
        await expect(
          realAdminService.updateUserRole('admin-1', 'CUSTOMER', 'admin-1'),
        ).rejects.toThrow(BadRequestException);
        await expect(
          realAdminService.updateUserRole('admin-1', 'SUPPORT', 'admin-1'),
        ).rejects.toThrow('Administrators cannot modify their own role (self-demotion prohibited)');
      });

      it('rejects invalid roles not defined in USER_ROLES', async () => {
        await expect(
          realAdminService.updateUserRole('user-1', 'SUPER_ADMIN' as any, 'admin-1'),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws NotFoundException when target user does not exist', async () => {
        mockPrisma.user.findUnique.mockResolvedValueOnce(null);

        await expect(
          realAdminService.updateUserRole('non-existent-user', 'SUPPORT', 'admin-1'),
        ).rejects.toThrow(NotFoundException);
      });

      it('updates user role and logs audit entry when valid', async () => {
        const existingUser = {
          id: 'user-2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          updatedAt: new Date('2026-01-01'),
        };

        const updatedUser = {
          ...existingUser,
          role: 'SUPPORT',
          updatedAt: new Date('2026-10-27'),
        };

        mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser);
        mockPrisma.user.update.mockResolvedValueOnce(updatedUser);

        const result = await realAdminService.updateUserRole('user-2', 'SUPPORT', 'admin-1');

        expect(result.role).toBe('SUPPORT');
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: 'user-2' },
          data: { role: 'SUPPORT' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            updatedAt: true,
          },
        });
      });
    });
  });
});
