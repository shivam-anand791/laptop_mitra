import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { PaymentEncryptionService } from '../../common/encryption/payment-encryption.service';
import { QrStorageService } from '../../common/storage/qr-storage.service';
import {
  ORDER_STATUSES,
  OrderStatus,
  USER_STATUSES,
  UserStatus,
  USER_ROLES,
  UserRole,
  ORDER_TRANSITION_MAP,
} from '../../common/constants';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { NotificationService } from '../notifications/notification.service';
import { CreateRentalPriceDto, UpdateRentalPriceDto } from './dto/save-rental-price.dto';
import { RENTAL_PRICE_TENURES } from './rental-pricing';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private firebaseService?: FirebaseService,
    @Optional() private encryptionService?: PaymentEncryptionService,
    @Optional() private qrStorageService?: QrStorageService,
    @Optional() private notificationService?: NotificationService,
  ) {}

  async getAllUsers(query?: AdminUserQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.role) {
      where.role = query.role;
    }
    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { referralCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          referralCode: true,
          referralEarnings: true,
          referralTier: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getUserSupportHistory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const [tickets, returns] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          category: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          csatScore: true,
          csatComment: true,
        },
      }),
      this.prisma.returnRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          returnNumber: true,
          type: true,
          status: true,
          reason: true,
          createdAt: true,
          order: { select: { orderNumber: true } },
          ticket: { select: { ticketNumber: true } },
        },
      }),
    ]);

    const categoryCounts = tickets.reduce<Record<string, number>>((counts, ticket) => {
      counts[ticket.category] = (counts[ticket.category] || 0) + 1;
      return counts;
    }, {});

    return {
      user,
      ticketCount: tickets.length,
      returnCount: returns.length,
      categoryCounts,
      tickets,
      returns,
    };
  }

  async getUser360(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        businessProfile: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            finalAmount: true,
            createdAt: true,
          },
        },
        leaseContracts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            contractNumber: true,
            status: true,
            tenureMonths: true,
            monthlyAmount: true,
            buyoutStatus: true,
            createdAt: true,
          },
        },
        buybackRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            requestNumber: true,
            status: true,
            initialQuotedAmount: true,
            finalPayoutAmount: true,
            createdAt: true,
          },
        },
        returnRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            returnNumber: true,
            status: true,
            type: true,
            createdAt: true,
          },
        },
        customerTickets: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
            priority: true,
            csatScore: true,
            createdAt: true,
          },
        },
        clientNotes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            note: true,
            authorName: true,
            authorRole: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const totalOrders = await this.prisma.order.count({ where: { userId } });
    const totalLeases = await this.prisma.leaseContract.count({ where: { userId } });
    const totalBuybacks = await this.prisma.buybackRequest.count({ where: { userId } });
    const totalTickets = await this.prisma.supportTicket.count({ where: { userId } });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
      businessProfile: user.businessProfile,
      counts: {
        totalOrders,
        totalLeases,
        totalBuybacks,
        totalTickets,
      },
      orders: user.orders,
      leaseContracts: user.leaseContracts,
      buybackRequests: user.buybackRequests,
      returnRequests: user.returnRequests,
      tickets: user.customerTickets,
      notes: user.clientNotes,
    };
  }

  async updateUserStatus(userId: string, status: string, currentAdminId?: string) {
    if (!USER_STATUSES.includes(status as UserStatus)) {
      throw new BadRequestException(`Status must be one of: ${USER_STATUSES.join(', ')}`);
    }

    if (currentAdminId && userId === currentAdminId && status !== 'ACTIVE') {
      throw new BadRequestException('Admins cannot deactivate or suspend their own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (currentAdminId && userId === currentAdminId && status !== user.status) {
      throw new BadRequestException('Admins cannot modify their own status');
    }

    if (user.role === 'ADMIN' && currentAdminId && userId !== currentAdminId) {
      throw new BadRequestException('Cannot modify status of another administrator');
    }

    if (user.status === status) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      };
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { status },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      if (
        (status === 'SUSPENDED' || status === 'DELETED') &&
        user.firebaseUid &&
        this.firebaseService
      ) {
        try {
          await this.firebaseService.revokeRefreshTokens(user.firebaseUid);
          this.logger.log(`Revoked Firebase refresh tokens for suspended user ${userId}`);
        } catch (revokeErr: any) {
          this.logger.warn(
            `Failed to revoke Firebase refresh tokens for user ${userId}: ${revokeErr?.message || revokeErr}`,
          );
        }
      }

      this.logger.log(
        `[AUDIT] User status updated: adminId=${currentAdminId || 'system'}, targetUserId=${userId}, oldStatus=${user.status}, newStatus=${status}, timestamp=${new Date().toISOString()}`,
      );

      return updatedUser;
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Database error during updateUserStatus: ${err?.message || err}`);
      throw new ServiceUnavailableException('Database write failed during user status update');
    }
  }

  async updateUserRole(userId: string, role: string, currentAdminId?: string) {
    if (!USER_ROLES.includes(role as UserRole)) {
      throw new BadRequestException(`Role must be one of: ${USER_ROLES.join(', ')}`);
    }

    if (currentAdminId && userId === currentAdminId) {
      throw new BadRequestException(
        'Administrators cannot modify their own role (self-demotion prohibited)',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === role) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      };
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      this.logger.log(
        `[AUDIT] User role updated: adminId=${currentAdminId || 'system'}, targetUserId=${userId}, oldRole=${user.role}, newRole=${role}, timestamp=${new Date().toISOString()}`,
      );

      return updatedUser;
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Database error during updateUserRole: ${err?.message || err}`);
      throw new ServiceUnavailableException('Database write failed during user role update');
    }
  }

  async getAllProducts(query?: AdminProductQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query?.lowStock) {
      where.stock = { lte: 5 };
    }
    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true,
          variants: { include: { images: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  private normalizeProductVariants(variants: any[]) {
    if (!Array.isArray(variants))
      throw new BadRequestException('Product variants must be an array');
    if (variants.length === 0) return [];

    const explicitDefaults = variants.filter((variant) => variant?.isDefault === true).length;
    if (explicitDefaults > 1) throw new BadRequestException('Only one default variant is allowed');

    const skus = new Set<string>();
    const activeCombinations = new Set<string>();
    let activeAttributeKeys: string[] | undefined;
    let defaultCount = 0;
    const normalized = variants.map((variant, index) => {
      const name = typeof variant?.name === 'string' ? variant.name.trim() : '';
      const sku = typeof variant?.sku === 'string' ? variant.sku.trim() : '';
      if (!name || !sku)
        throw new BadRequestException(`Variant ${index + 1} requires a name and SKU`);
      const skuKey = sku.toLowerCase();
      if (skus.has(skuKey)) throw new BadRequestException(`Duplicate variant SKU "${sku}"`);
      skus.add(skuKey);

      const attributes = variant.attributes;
      if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
        throw new BadRequestException(`Variant "${name}" requires an attributes object`);
      }
      const cleanAttributes: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(attributes)) {
        if (
          !key.trim() ||
          !['string', 'number', 'boolean'].includes(typeof value) ||
          (typeof value === 'string' && !value.trim()) ||
          (typeof value === 'number' && !Number.isFinite(value))
        ) {
          throw new BadRequestException(`Variant "${name}" has an invalid attribute`);
        }
        cleanAttributes[key.trim()] = value as string | number | boolean;
      }
      if (!Object.keys(cleanAttributes).length) {
        throw new BadRequestException(`Variant "${name}" requires at least one attribute`);
      }

      const price = Number(variant.price);
      const stock = Number(variant.stock ?? 0);
      if (!Number.isFinite(price) || price < 0)
        throw new BadRequestException(`Variant "${name}" has an invalid price`);
      if (!Number.isSafeInteger(stock) || stock < 0)
        throw new BadRequestException(`Variant "${name}" has invalid stock`);

      const optionalPrice = (value: unknown, label: string) => {
        if (value === undefined || value === null || value === '') return null;
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new BadRequestException(`Variant "${name}" has an invalid ${label}`);
        }
        return parsed;
      };

      const isDefault = explicitDefaults ? variant.isDefault === true : index === 0;
      if (isDefault) defaultCount += 1;
      const isActive = variant.isActive !== false;
      if (isDefault && !isActive)
        throw new BadRequestException('The default variant must be active');

      if (isActive) {
        const keys = Object.keys(cleanAttributes).sort();
        if (activeAttributeKeys && keys.join('\0') !== activeAttributeKeys.join('\0')) {
          throw new BadRequestException(
            'Active variants for a product must define the same configuration attributes',
          );
        }
        activeAttributeKeys = keys;
        const combinationKey = JSON.stringify(
          Object.fromEntries(keys.map((key) => [key, cleanAttributes[key]])),
        );
        if (activeCombinations.has(combinationKey)) {
          throw new BadRequestException(`Duplicate active configuration for variant "${name}"`);
        }
        activeCombinations.add(combinationKey);
      }

      const images = Array.isArray(variant.images)
        ? variant.images.map((image: any, imageIndex: number) => {
            if (typeof image?.url !== 'string' || !image.url.trim()) {
              throw new BadRequestException(`Variant "${name}" has an invalid image URL`);
            }
            return {
              url: image.url.trim(),
              ...(typeof image.altText === 'string' ? { altText: image.altText.trim() } : {}),
              isPrimary: image.isPrimary === true,
              sortOrder:
                Number.isSafeInteger(Number(image.sortOrder)) && Number(image.sortOrder) >= 0
                  ? Number(image.sortOrder)
                  : imageIndex,
            };
          })
        : [];

      return {
        ...(typeof variant.id === 'string' && variant.id ? { id: variant.id } : {}),
        name,
        sku,
        attributes: cleanAttributes,
        price,
        compareAtPrice: optionalPrice(variant.compareAtPrice, 'compare-at price'),
        leasePriceMonthly: optionalPrice(variant.leasePriceMonthly, 'monthly lease price'),
        stock,
        allowBackorder: variant.allowBackorder === true,
        isActive,
        isDefault,
        images,
      };
    });

    if (normalized.some((variant) => variant.isActive) && defaultCount !== 1) {
      throw new BadRequestException('Exactly one active default variant is required');
    }
    return normalized;
  }

  async createProduct(data: {
    name: string;
    price: number | string;
    sku: string;
    stock?: number;
    description?: string;
    shortDescription?: string;
    categoryId?: string;
    status?: string;
    isFeatured?: boolean;
    isNewArrival?: boolean;
    imageUrl?: string;
    images?: any[];
    leasePriceMonthly?: number | string;
    bulkSellPrice?: number | string;
    bulkLeasePrice?: number | string;
    metadata?: any;
    variants?: any[];
  }) {
    if (!data.name || !data.sku || data.price === undefined) {
      throw new BadRequestException('Name, price, and SKU are required');
    }

    const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
    if (isNaN(price) || price < 0) {
      throw new BadRequestException('Price must be a valid positive number');
    }

    const existing = await this.prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) {
      throw new BadRequestException(`Product with SKU "${data.sku}" already exists`);
    }

    const slug =
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;
    const variants =
      data.variants === undefined ? undefined : this.normalizeProductVariants(data.variants);
    const defaultVariant = variants?.find((variant) => variant.isDefault);

    return this.prisma.product.create({
      data: {
        name: data.name,
        slug,
        sku: defaultVariant?.sku || data.sku,
        price: defaultVariant?.price ?? price,
        compareAtPrice: defaultVariant?.compareAtPrice,
        stock: defaultVariant?.stock ?? (data.stock !== undefined ? Number(data.stock) : 0),
        leasePriceMonthly:
          defaultVariant?.leasePriceMonthly ??
          (data.leasePriceMonthly !== undefined &&
          data.leasePriceMonthly !== null &&
          data.leasePriceMonthly !== ''
            ? Number(data.leasePriceMonthly)
            : null),
        bulkSellPrice:
          data.bulkSellPrice !== undefined &&
          data.bulkSellPrice !== null &&
          data.bulkSellPrice !== ''
            ? Number(data.bulkSellPrice)
            : null,
        bulkLeasePrice:
          data.bulkLeasePrice !== undefined &&
          data.bulkLeasePrice !== null &&
          data.bulkLeasePrice !== ''
            ? Number(data.bulkLeasePrice)
            : null,
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        categoryId: data.categoryId || null,
        status: data.status || 'ACTIVE',
        isFeatured: !!data.isFeatured,
        isNewArrival: !!data.isNewArrival,
        metadata: data.metadata || null,
        ...(variants
          ? {
              variants: {
                create: variants.map(({ images, ...variant }) => ({
                  ...variant,
                  ...(images.length ? { images: { create: images } } : {}),
                })),
              },
            }
          : {}),
        ...(Array.isArray(data.images) && data.images.length > 0
          ? {
              images: {
                create: data.images.map((img, idx) => ({
                  url: typeof img === 'string' ? img : img.url,
                  altText: typeof img === 'object' && img.altText ? img.altText : data.name,
                  isPrimary:
                    typeof img === 'object' && img.isPrimary !== undefined
                      ? !!img.isPrimary
                      : idx === 0,
                  sortOrder:
                    typeof img === 'object' && img.sortOrder !== undefined
                      ? Number(img.sortOrder)
                      : idx,
                })),
              },
            }
          : data.imageUrl
            ? {
                images: {
                  create: [
                    {
                      url: data.imageUrl,
                      altText: data.name,
                      isPrimary: true,
                      sortOrder: 0,
                    },
                  ],
                },
              }
            : {}),
      },
      include: {
        category: true,
        images: true,
        variants: { include: { images: true } },
      },
    });
  }

  async updateProduct(id: string, data: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isFeatured !== undefined) updateData.isFeatured = !!data.isFeatured;
    if (data.isNewArrival !== undefined) updateData.isNewArrival = !!data.isNewArrival;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

    let currentMetadata = (product.metadata as Record<string, any>) || {};
    if (data.metadata !== undefined && typeof data.metadata === 'object' && data.metadata !== null) {
      currentMetadata = { ...currentMetadata, ...data.metadata };
    }
    if (data.brand !== undefined) {
      currentMetadata.brand = String(data.brand).trim();
    }
    if (data.warrantyMonths !== undefined) {
      currentMetadata.warrantyMonths = Number(data.warrantyMonths) || 6;
    }
    if (data.specs !== undefined && typeof data.specs === 'object') {
      currentMetadata.specs = data.specs;
    }
    updateData.metadata = currentMetadata;

    if (data.stock !== undefined) {
      const stock = Number(data.stock);
      if (isNaN(stock) || stock < 0)
        throw new BadRequestException('Stock must be a positive integer');
      updateData.stock = stock;
    }
    if (data.price !== undefined) {
      const price = typeof data.price === 'string' ? parseFloat(data.price) : Number(data.price);
      if (isNaN(price) || price < 0)
        throw new BadRequestException('Price must be a positive number');
      updateData.price = price;
    }
    if (data.compareAtPrice !== undefined) {
      if (data.compareAtPrice === null || data.compareAtPrice === '') {
        updateData.compareAtPrice = null;
      } else {
        const compareAtPrice =
          typeof data.compareAtPrice === 'string'
            ? parseFloat(data.compareAtPrice)
            : Number(data.compareAtPrice);
        if (isNaN(compareAtPrice) || compareAtPrice < 0) {
          throw new BadRequestException('MRP must be a positive number');
        }
        updateData.compareAtPrice = compareAtPrice;
      }
    }

    const effectivePrice =
      updateData.price !== undefined ? updateData.price : Number(product.price);
    const effectiveCompareAt =
      updateData.compareAtPrice !== undefined
        ? updateData.compareAtPrice
        : product.compareAtPrice
          ? Number(product.compareAtPrice)
          : null;
    if (effectiveCompareAt !== null && effectiveCompareAt < effectivePrice) {
      throw new BadRequestException(
        'MRP (compare-at price) must be greater than or equal to selling price',
      );
    }

    if (data.leasePriceMonthly !== undefined) {
      updateData.leasePriceMonthly =
        data.leasePriceMonthly !== null && data.leasePriceMonthly !== ''
          ? Number(data.leasePriceMonthly)
          : null;
    }
    if (data.bulkSellPrice !== undefined) {
      updateData.bulkSellPrice =
        data.bulkSellPrice !== null && data.bulkSellPrice !== ''
          ? Number(data.bulkSellPrice)
          : null;
    }
    if (data.bulkLeasePrice !== undefined) {
      updateData.bulkLeasePrice =
        data.bulkLeasePrice !== null && data.bulkLeasePrice !== ''
          ? Number(data.bulkLeasePrice)
          : null;
    }

    const priceChanged =
      (updateData.price !== undefined && updateData.price !== Number(product.price)) ||
      (updateData.compareAtPrice !== undefined &&
        updateData.compareAtPrice !==
          (product.compareAtPrice ? Number(product.compareAtPrice) : null));

    if (priceChanged) {
      try {
        await this.prisma.auditLog.create({
          data: {
            entityType: 'PRODUCT',
            entityId: id,
            action: 'UPDATE_PRODUCT_PRICE',
            actorUserId: data.adminId || 'admin',
            metadata: {
              oldPrice: Number(product.price),
              newPrice: effectivePrice,
              oldCompareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
              newCompareAtPrice: effectiveCompareAt,
              reason: data.priceChangeReason || 'Catalog update',
            },
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to record product price audit for ${id}: ${err}`);
      }
    }

    if (data.images !== undefined && Array.isArray(data.images)) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
      if (data.images.length > 0) {
        await this.prisma.productImage.createMany({
          data: data.images.map((img, idx) => ({
            productId: id,
            url: typeof img === 'string' ? img : img.url,
            altText: typeof img === 'object' && img.altText ? img.altText : product.name,
            isPrimary:
              typeof img === 'object' && img.isPrimary !== undefined ? !!img.isPrimary : idx === 0,
            sortOrder:
              typeof img === 'object' && img.sortOrder !== undefined ? Number(img.sortOrder) : idx,
          })),
        });
      }
    }

    if (data.variants === undefined) {
      return this.prisma.product.update({
        where: { id },
        data: updateData,
        include: { category: true, images: true, variants: { include: { images: true } } },
      });
    }

    const variants = this.normalizeProductVariants(data.variants);
    const defaultVariant = variants.find((variant) => variant.isDefault)!;
    const existing = await this.prisma.productVariant.findMany({ where: { productId: id } });
    const existingById = new Map(existing.map((variant) => [variant.id, variant]));
    for (const variant of variants) {
      if (variant.id && !existingById.has(variant.id)) {
        throw new BadRequestException(`Variant "${variant.name}" does not belong to this product`);
      }
    }

    if (!defaultVariant) {
      return this.prisma.$transaction(async (transaction) => {
        await transaction.productVariant.updateMany({
          where: { productId: id },
          data: { isActive: false, isDefault: false },
        });
        return transaction.product.update({
          where: { id },
          data: updateData,
          include: { category: true, images: true, variants: { include: { images: true } } },
        });
      });
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.productVariant.updateMany({
        where: { productId: id },
        data: { isActive: false, isDefault: false },
      });

      for (const variant of variants) {
        const { id: variantId, images, ...variantData } = variant;
        if (variantId) {
          await transaction.productVariant.update({
            where: { id: variantId },
            data: {
              ...variantData,
              images: {
                deleteMany: {},
                ...(images.length ? { create: images } : {}),
              },
            },
          });
        } else {
          await transaction.productVariant.create({
            data: {
              ...variantData,
              productId: id,
              ...(images.length ? { images: { create: images } } : {}),
            },
          });
        }
      }

      return transaction.product.update({
        where: { id },
        data: {
          ...updateData,
          sku: defaultVariant.sku,
          price: defaultVariant.price,
          compareAtPrice: defaultVariant.compareAtPrice,
          stock: defaultVariant.stock,
          leasePriceMonthly: defaultVariant.leasePriceMonthly,
        },
        include: { category: true, images: true, variants: { include: { images: true } } },
      });
    });
  }

  async getProductReferenceSummary(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const totalOrders = await this.prisma.orderItem.count({ where: { productId: id } });
    const activeOrders = await this.prisma.orderItem.count({
      where: {
        productId: id,
        order: {
          status: { in: ['PENDING', 'PAYMENT_PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING'] },
        },
      },
    });
    const totalLeases = await this.prisma.leaseContract.count({ where: { productId: id } });
    const activeLeases = await this.prisma.leaseContract.count({
      where: {
        productId: id,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
    });

    return {
      product,
      totalOrders,
      activeOrders,
      totalLeases,
      activeLeases,
      canHardDelete: totalOrders === 0 && totalLeases === 0,
    };
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if referenced by order items or lease contracts
    const orderItemsCount = await this.prisma.orderItem.count({ where: { productId: id } });
    const leaseContractsCount = await this.prisma.leaseContract.count({ where: { productId: id } });

    if (orderItemsCount > 0 || leaseContractsCount > 0) {
      // Soft-archive if order history or lease history references it
      const updated = await this.prisma.product.update({
        where: { id },
        data: { status: 'DISCONTINUED' },
      });
      return {
        ...updated,
        archived: true,
        message: `Product soft-archived (referenced by ${orderItemsCount} orders and ${leaseContractsCount} leases).`,
      };
    }

    // Clean up dependent cart & wishlist items then delete product
    await this.prisma.cartItem.deleteMany({ where: { productId: id } });
    await this.prisma.wishlistItem.deleteMany({ where: { productId: id } });
    await this.prisma.rentalPriceAudit.deleteMany({ where: { rentalPrice: { productId: id } } });
    await this.prisma.rentalPrice.deleteMany({ where: { productId: id } });
    await this.prisma.productImage.deleteMany({ where: { productId: id } });
    await this.prisma.productVariant.deleteMany({ where: { productId: id } });

    const deleted = await this.prisma.product.delete({ where: { id } });
    return {
      ...deleted,
      archived: false,
      message: 'Product permanently deleted.',
    };
  }

  async saveProductRentalPrices(
    productId: string,
    dto: {
      enabled: boolean;
      publishImmediately?: boolean;
      prices?: { tenureMonths: number; monthlyPrice: number }[];
      reason?: string;
    },
    adminId: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.$transaction(
      async (tx) => {
        if (!dto.enabled) {
          // Supersede all active rental prices for this product
          await tx.rentalPrice.updateMany({
            where: { productId, status: 'APPROVED' },
            data: { status: 'SUPERSEDED' },
          });
          await tx.product.update({
            where: { id: productId },
            data: { leasePriceMonthly: null },
          });
          return { success: true, message: 'Rental pricing disabled for this product.' };
        }

        const validTenures = [1, 3, 6, 12, 24];
        const inputPrices = dto.prices || [];
        let lowest12MonthOrFirst: number | null = null;
        const isPublish = dto.publishImmediately !== false;
        const status = isPublish ? 'APPROVED' : 'DRAFT';
        const now = new Date();

        for (const tenure of validTenures) {
          const match = inputPrices.find((p) => Number(p.tenureMonths) === tenure);
          if (!match || isNaN(Number(match.monthlyPrice)) || Number(match.monthlyPrice) <= 0) {
            continue;
          }
          const monthlyRate = Number(match.monthlyPrice);
          if (tenure === 12 || lowest12MonthOrFirst === null) {
            lowest12MonthOrFirst = monthlyRate;
          }

          if (isPublish) {
            await tx.rentalPrice.updateMany({
              where: {
                productId,
                variantId: null,
                tenureMonths: tenure,
                status: 'APPROVED',
              },
              data: { status: 'SUPERSEDED' },
            });
          }

          // Check for existing manual draft
          const existingDraft = await tx.rentalPrice.findFirst({
            where: {
              productId,
              variantId: null,
              tenureMonths: tenure,
              status: 'DRAFT',
              sourceType: 'MANUAL',
            },
          });

          let rentalRecord;
          if (existingDraft) {
            rentalRecord = await tx.rentalPrice.update({
              where: { id: existingDraft.id },
              data: {
                monthlyPrice: monthlyRate.toFixed(2),
                status,
                approvedBy: isPublish ? adminId : null,
                approvedAt: isPublish ? now : null,
                changeReason: dto.reason || 'Admin rental pricing update',
              },
            });
          } else {
            rentalRecord = await tx.rentalPrice.create({
              data: {
                productId,
                variantId: null,
                tenureMonths: tenure,
                monthlyPrice: monthlyRate.toFixed(2),
                securityDeposit: '0.00',
                deliveryCharge: '0.00',
                sellingPriceSnapshot: Number(product.price).toFixed(2),
                percentage: '0.00',
                status,
                sourceType: 'MANUAL',
                approvedBy: isPublish ? adminId : null,
                approvedAt: isPublish ? now : null,
                changeReason: dto.reason || 'Admin rental pricing update',
              },
            });
          }

          await tx.rentalPriceAudit.create({
            data: {
              rentalPriceId: rentalRecord.id,
              action: isPublish ? 'APPROVED' : 'CREATED',
              newMonthlyPrice: rentalRecord.monthlyPrice,
              newDeposit: '0.00',
              newDeliveryCharge: '0.00',
              adminId,
              reason: dto.reason || 'Admin rental pricing update',
            },
          });
        }

        if (lowest12MonthOrFirst !== null) {
          await tx.product.update({
            where: { id: productId },
            data: { leasePriceMonthly: lowest12MonthOrFirst.toFixed(2) },
          });
        }

        return {
          success: true,
          message: isPublish
            ? 'Rental prices published successfully.'
            : 'Rental prices saved as drafts.',
          leasePriceMonthly: lowest12MonthOrFirst,
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async getProductPriceHistory(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true, price: true, compareAtPrice: true, leasePriceMonthly: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const priceAudits = await this.prisma.auditLog.findMany({
      where: { entityType: 'PRODUCT', entityId: productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const rentalPrices = await this.prisma.rentalPrice.findMany({
      where: { productId },
      include: {
        auditHistory: {
          include: { admin: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { tenureMonths: 'asc' },
    });

    return {
      product,
      priceAudits,
      rentalPrices,
    };
  }

  async bulkUpdatePricing(
    dto: {
      productIds: string[];
      type: 'PERCENTAGE' | 'FIXED';
      value: number;
      applyToCompareAtPrice?: boolean;
      reason?: string;
    },
    adminId: string,
    previewOnly = false,
  ) {
    if (!dto.productIds || dto.productIds.length === 0) {
      throw new BadRequestException('Select at least one product to update pricing.');
    }
    const val = Number(dto.value);
    if (isNaN(val)) {
      throw new BadRequestException('Invalid price adjustment value.');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.productIds } },
      select: { id: true, name: true, sku: true, price: true, compareAtPrice: true },
    });

    const results = products.map((prod) => {
      const oldPrice = Number(prod.price);
      const oldCompareAt = prod.compareAtPrice ? Number(prod.compareAtPrice) : null;
      let newPrice: number;

      if (dto.type === 'PERCENTAGE') {
        newPrice = Math.round(oldPrice * (1 + val / 100));
      } else {
        newPrice = Math.round(oldPrice + val);
      }
      if (newPrice < 1) newPrice = 1;

      let newCompareAt = oldCompareAt;
      if (dto.applyToCompareAtPrice && oldCompareAt !== null) {
        if (dto.type === 'PERCENTAGE') {
          newCompareAt = Math.round(oldCompareAt * (1 + val / 100));
        } else {
          newCompareAt = Math.round(oldCompareAt + val);
        }
      }
      if (newCompareAt !== null && newCompareAt < newPrice) {
        newCompareAt = newPrice;
      }

      return {
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        oldPrice,
        newPrice,
        oldCompareAt,
        newCompareAt,
      };
    });

    if (previewOnly) {
      return {
        preview: true,
        count: results.length,
        items: results,
      };
    }

    // Apply updates inside transaction
    return this.prisma.$transaction(async (tx) => {
      for (const item of results) {
        await tx.product.update({
          where: { id: item.id },
          data: {
            price: item.newPrice,
            compareAtPrice: item.newCompareAt,
          },
        });

        await tx.auditLog.create({
          data: {
            entityType: 'PRODUCT',
            entityId: item.id,
            action: 'UPDATE_PRODUCT_PRICE',
            actorUserId: adminId || 'admin',
            metadata: {
              oldPrice: item.oldPrice,
              newPrice: item.newPrice,
              oldCompareAtPrice: item.oldCompareAt,
              newCompareAtPrice: item.newCompareAt,
              bulk: true,
              adjustmentType: dto.type,
              adjustmentValue: val,
              reason: dto.reason || 'Bulk catalog price adjustment',
            },
          },
        });
      }

      return {
        success: true,
        count: results.length,
        items: results,
      };
    });
  }

  async exportProductsCsv(): Promise<string> {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
        rentalPrices: {
          where: { status: 'APPROVED', sourceType: 'MANUAL' },
          orderBy: { tenureMonths: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'SKU',
      'Name',
      'Brand',
      'Category',
      'Status',
      'Stock',
      'Price',
      'MRP',
      'Rent_1M',
      'Rent_3M',
      'Rent_6M',
      'Rent_12M',
      'Rent_24M',
      'IsFeatured',
      'IsNewArrival',
    ];

    const rows = products.map((prod) => {
      const meta = (prod.metadata as Record<string, any>) || {};
      const brand = meta.brand || '';
      const cat = prod.category?.name || 'Uncategorized';
      const rentPlans = prod.rentalPrices || [];
      const getRent = (tenure: number) => {
        const p = rentPlans.find((r) => r.tenureMonths === tenure);
        return p ? Number(p.monthlyPrice).toFixed(2) : '';
      };

      const escapeField = (f: any) => {
        const str = String(f ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        escapeField(prod.sku),
        escapeField(prod.name),
        escapeField(brand),
        escapeField(cat),
        escapeField(prod.status),
        prod.stock,
        Number(prod.price).toFixed(2),
        prod.compareAtPrice ? Number(prod.compareAtPrice).toFixed(2) : '',
        getRent(1),
        getRent(3),
        getRent(6),
        getRent(12),
        getRent(24),
        prod.isFeatured ? 'YES' : 'NO',
        prod.isNewArrival ? 'YES' : 'NO',
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  async importProductsCsv(csvText: string, dryRun = true) {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('CSV file is empty or missing headers.');
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const skuIdx = headers.indexOf('sku');
    const nameIdx = headers.indexOf('name');
    const priceIdx = headers.indexOf('price');
    const mrpIdx = headers.indexOf('mrp');
    const stockIdx = headers.indexOf('stock');
    const brandIdx = headers.indexOf('brand');
    const categoryIdx = headers.indexOf('category');
    const statusIdx = headers.indexOf('status');

    if (skuIdx === -1 || nameIdx === -1 || priceIdx === -1) {
      throw new BadRequestException('CSV missing mandatory columns: SKU, Name, Price.');
    }

    const categories = await this.prisma.category.findMany();
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

    const parseCsvRow = (line: string): string[] => {
      const res: string[] = [];
      let inQuotes = false;
      let cur = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          res.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          cur = '';
        } else {
          cur += char;
        }
      }
      res.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return res;
    };

    const results: any[] = [];
    const errors: { row: number; sku: string; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = parseCsvRow(lines[i]);
      const rowNum = i + 1;
      const sku = parts[skuIdx] || '';
      const name = parts[nameIdx] || '';
      const priceStr = parts[priceIdx] || '';
      const mrpStr = mrpIdx !== -1 ? parts[mrpIdx] || '' : '';
      const stockStr = stockIdx !== -1 ? parts[stockIdx] || '0' : '0';
      const brand = brandIdx !== -1 ? parts[brandIdx] || '' : '';
      const categoryName = categoryIdx !== -1 ? parts[categoryIdx] || '' : '';
      const status = statusIdx !== -1 ? parts[statusIdx]?.toUpperCase() || 'ACTIVE' : 'ACTIVE';

      if (!sku) {
        errors.push({ row: rowNum, sku: '', error: 'Missing SKU' });
        continue;
      }
      if (!name) {
        errors.push({ row: rowNum, sku, error: 'Missing product Name' });
        continue;
      }
      const price = parseFloat(priceStr);
      if (isNaN(price) || price <= 0) {
        errors.push({ row: rowNum, sku, error: `Invalid price "${priceStr}" (must be > 0)` });
        continue;
      }
      let mrp: number | null = null;
      if (mrpStr) {
        mrp = parseFloat(mrpStr);
        if (isNaN(mrp) || mrp < price) {
          errors.push({ row: rowNum, sku, error: `MRP "${mrpStr}" must be >= price "${price}"` });
          continue;
        }
      }
      const stock = parseInt(stockStr, 10);
      if (isNaN(stock) || stock < 0) {
        errors.push({ row: rowNum, sku, error: `Invalid stock "${stockStr}"` });
        continue;
      }

      const categoryId = categoryName ? categoryMap.get(categoryName.toLowerCase()) || null : null;

      results.push({
        row: rowNum,
        sku,
        name,
        brand,
        categoryId,
        categoryName,
        price,
        compareAtPrice: mrp,
        stock,
        status: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'].includes(status) ? status : 'ACTIVE',
      });
    }

    if (dryRun) {
      const existingProducts = await this.prisma.product.findMany({
        where: { sku: { in: results.map((r) => r.sku) } },
        select: { id: true, sku: true },
      });
      const existingSkuSet = new Set(existingProducts.map((p) => p.sku));

      const toCreate = results.filter((r) => !existingSkuSet.has(r.sku)).length;
      const toUpdate = results.filter((r) => existingSkuSet.has(r.sku)).length;

      return {
        dryRun: true,
        totalRows: results.length,
        toCreate,
        toUpdate,
        errors,
        previewRows: results.slice(0, 10),
      };
    }

    // Apply import in transaction
    return this.prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of results) {
        const existing = await tx.product.findUnique({ where: { sku: item.sku } });
        const metadata: Record<string, any> = (existing?.metadata as Record<string, any>) || {};
        if (item.brand) metadata.brand = item.brand;

        if (existing) {
          await tx.product.update({
            where: { id: existing.id },
            data: {
              name: item.name,
              price: item.price,
              compareAtPrice: item.compareAtPrice,
              stock: item.stock,
              status: item.status,
              ...(item.categoryId ? { categoryId: item.categoryId } : {}),
              metadata,
            },
          });
          updatedCount++;
        } else {
          const slug = `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${item.sku.toLowerCase()}`;
          await tx.product.create({
            data: {
              sku: item.sku,
              name: item.name,
              slug,
              price: item.price,
              compareAtPrice: item.compareAtPrice,
              stock: item.stock,
              status: item.status,
              categoryId: item.categoryId,
              metadata,
            },
          });
          createdCount++;
        }
      }

      return {
        dryRun: false,
        totalRows: results.length,
        createdCount,
        updatedCount,
        errors,
      };
    });
  }

  async getAllOrders(query?: AdminOrderQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query?.from || query?.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          subtotal: true,
          discountAmount: true,
          finalAmount: true,
          shippingAddress: true,
          phone: true,
          email: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          deliveries: {
            select: {
              id: true,
              status: true,
              shippedAt: true,
              deliveredAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: true,
                category: true,
              },
            },
            soldUnits: {
              include: {
                warrantyCoverage: true,
              },
            },
          },
        },
        deliveries: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        discountRedemption: {
          include: {
            discountCode: true,
          },
        },
        referralRedemption: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    adminId?: string,
    courierData?: {
      courierName?: string;
      trackingNumber?: string;
      serialAssignments?: Array<{ orderItemId: string; unitIndex: number; serialNumber: string }>;
      overrideReason?: string;
    },
  ) {
    if (!ORDER_STATUSES.includes(status as OrderStatus)) {
      throw new BadRequestException(`Status must be one of: ${ORDER_STATUSES.join(', ')}`);
    }

    const targetStatus = status as OrderStatus;

    if (targetStatus === 'SHIPPING') {
      const courierName = courierData?.courierName?.trim();
      const trackingNumber = courierData?.trackingNumber?.trim();
      if (!courierName || !trackingNumber) {
        throw new BadRequestException(
          'Courier name and tracking number are required when moving order to SHIPPING',
        );
      }
    }

    const initialOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        deliveries: true,
      },
    });

    if (!initialOrder) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    if (targetStatus === 'SHIPPING' && (this.prisma as any).soldUnit) {
      const overrideReason = courierData?.overrideReason?.trim();
      if (!overrideReason) {
        const assignments = courierData?.serialAssignments || [];
        for (const item of initialOrder.items.filter((i) => i.status !== 'CANCELLED')) {
          for (let u = 1; u <= item.quantity; u++) {
            const match = assignments.find((a) => a.orderItemId === item.id && a.unitIndex === u);
            if (!match || !match.serialNumber?.trim()) {
              throw new BadRequestException(
                `Serial number is required for "${item.product?.name || 'Item'}" (Unit ${u} of ${item.quantity}) before dispatch, or provide an administrative override reason.`,
              );
            }
          }
        }

        const serials = assignments.map((a) => a.serialNumber?.trim()).filter(Boolean);
        if (new Set(serials).size !== serials.length) {
          throw new BadRequestException('Duplicate serial numbers submitted in dispatch payload.');
        }
      }
    }

    if (initialOrder.status === targetStatus) {
      if (targetStatus === 'CANCELLED') {
        throw new BadRequestException('Order is already CANCELLED (terminal status)');
      }
      return initialOrder;
    }

    const allowedTransitions = ORDER_TRANSITION_MAP[initialOrder.status as OrderStatus] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition order from "${initialOrder.status}" to "${targetStatus}". Allowed transitions: ${
          allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal status)'
        }`,
      );
    }

    try {
      const updatedOrder = await this.prisma.$transaction(
        async (tx) => {
        const currentOrder = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            items: true,
            deliveries: true,
          },
        });

        if (!currentOrder) {
          throw new NotFoundException(`Order with id ${orderId} not found`);
        }

        const validTransitionsInTx = ORDER_TRANSITION_MAP[currentOrder.status as OrderStatus] || [];
        if (!validTransitionsInTx.includes(targetStatus)) {
          throw new BadRequestException(
            `Cannot transition order from "${currentOrder.status}" to "${targetStatus}"`,
          );
        }

        // 1. Stock restoration when moving to CANCELLED
        if (targetStatus === 'CANCELLED') {
          for (const item of currentOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        // 2. Payment status rules:
        // - COMPLETED on DELIVERED only if paymentMethod is cod
        // - REFUNDED on CANCELLED only if paymentStatus was COMPLETED
        // - Never touch paymentStatus for online payments
        let newPaymentStatus: string | undefined = undefined;
        if (targetStatus === 'DELIVERED') {
          if (currentOrder.paymentMethod?.toLowerCase() === 'cod') {
            newPaymentStatus = 'COMPLETED';
          }
        } else if (targetStatus === 'CANCELLED') {
          if (currentOrder.paymentStatus === 'COMPLETED') {
            newPaymentStatus = 'REFUNDED';
          }
        }

        // 3. Update matching Delivery record when relevant
        const existingDelivery = currentOrder.deliveries?.[0];
        const trimmedCourier = courierData?.courierName?.trim();
        const trimmedTracking = courierData?.trackingNumber?.trim();

        if (targetStatus === 'SHIPPING') {
          if (existingDelivery) {
            await tx.delivery.update({
              where: { id: existingDelivery.id },
              data: {
                status: 'SHIPPED',
                carrier: trimmedCourier,
                trackingNumber: trimmedTracking,
                shippedAt: existingDelivery.shippedAt || new Date(),
              },
            });
          } else {
            await tx.delivery.create({
              data: {
                orderId,
                status: 'SHIPPED',
                carrier: trimmedCourier,
                trackingNumber: trimmedTracking,
                shippedAt: new Date(),
              },
            });
          }
        } else if (targetStatus === 'DELIVERED') {
          if (existingDelivery) {
            await tx.delivery.update({
              where: { id: existingDelivery.id },
              data: {
                status: 'DELIVERED',
                deliveredAt: existingDelivery.deliveredAt || new Date(),
                ...(trimmedCourier ? { carrier: trimmedCourier } : {}),
                ...(trimmedTracking ? { trackingNumber: trimmedTracking } : {}),
              },
            });
          } else {
            await tx.delivery.create({
              data: {
                orderId,
                status: 'DELIVERED',
                deliveredAt: new Date(),
                ...(trimmedCourier ? { carrier: trimmedCourier } : {}),
                ...(trimmedTracking ? { trackingNumber: trimmedTracking } : {}),
              },
            });
          }
        } else if (trimmedCourier || trimmedTracking) {
          if (existingDelivery) {
            await tx.delivery.update({
              where: { id: existingDelivery.id },
              data: {
                ...(trimmedCourier ? { carrier: trimmedCourier } : {}),
                ...(trimmedTracking ? { trackingNumber: trimmedTracking } : {}),
              },
            });
          }
        } else if (targetStatus === 'CANCELLED') {
          if (existingDelivery) {
            await tx.delivery.update({
              where: { id: existingDelivery.id },
              data: {
                status: 'RETURNED',
              },
            });
          }
        }

        // 4. Serial tracking & SoldUnit creation during dispatch (SHIPPING)
        if (targetStatus === 'SHIPPING' && tx.soldUnit) {
          const overrideReason = courierData?.overrideReason?.trim();
          const assignments = courierData?.serialAssignments || [];

          for (const item of currentOrder.items.filter((i) => i.status !== 'CANCELLED')) {
              const product = tx.product?.findUnique
                ? await tx.product.findUnique({ where: { id: item.productId } })
                : null;
            const brandSnapshot = (product?.metadata as any)?.brand || 'LaptopMitra';
            const modelSnapshot = product?.name || 'Laptop';

            for (let u = 1; u <= item.quantity; u++) {
              const match = assignments.find((a) => a.orderItemId === item.id && a.unitIndex === u);
              const serial = match?.serialNumber?.trim();

              if (serial) {
                const existingActive = await tx.soldUnit.findFirst({
                  where: {
                    serialNumber: serial,
                    status: 'ACTIVE',
                    NOT: {
                      orderItemId: item.id,
                      unitIndex: u,
                    },
                  },
                });
                if (existingActive) {
                  throw new BadRequestException(
                    `Serial number "${serial}" is already registered to another active unit.`,
                  );
                }
              }

              const existingUnit = await tx.soldUnit.findUnique({
                where: {
                  orderItemId_unitIndex: {
                    orderItemId: item.id,
                    unitIndex: u,
                  },
                },
              });

              if (existingUnit) {
                const prevSerial = existingUnit.serialNumber;
                await tx.soldUnit.update({
                  where: { id: existingUnit.id },
                  data: {
                    serialNumber: serial || existingUnit.serialNumber,
                    isDispatched: true,
                    dispatchedAt: new Date(),
                    dispatchedBy: adminId,
                    overrideReason: overrideReason || existingUnit.overrideReason,
                  },
                });

                if (serial && prevSerial !== serial) {
                  await tx.soldUnitSerialHistory.create({
                    data: {
                      soldUnitId: existingUnit.id,
                      previousSerial: prevSerial,
                      newSerial: serial,
                      changedBy: adminId || currentOrder.userId,
                      reason: 'Order dispatch serial assignment',
                    },
                  });
                }
              } else {
                const newUnit = await tx.soldUnit.create({
                  data: {
                    orderItemId: item.id,
                    productId: item.productId,
                    userId: currentOrder.userId,
                    unitIndex: u,
                    serialNumber: serial || null,
                    brandSnapshot,
                    modelSnapshot,
                    status: 'ACTIVE',
                    isDispatched: true,
                    dispatchedAt: new Date(),
                    dispatchedBy: adminId,
                    overrideReason: overrideReason || null,
                  },
                });

                if (serial) {
                  await tx.soldUnitSerialHistory.create({
                    data: {
                      soldUnitId: newUnit.id,
                      previousSerial: null,
                      newSerial: serial,
                      changedBy: adminId || currentOrder.userId,
                      reason: 'Order dispatch serial assignment',
                    },
                  });
                }
              }
            }
          }
        }

        // 5. WarrantyCoverage creation at delivery (DELIVERED)
        if (targetStatus === 'DELIVERED' && tx.soldUnit) {
          const delDate = existingDelivery?.deliveredAt || new Date();

          for (const item of currentOrder.items.filter((i) => i.status !== 'CANCELLED')) {
            const product = tx.product?.findUnique
              ? await tx.product.findUnique({ where: { id: item.productId } })
              : null;
            const baseMonths = Number((product?.metadata as any)?.warrantyMonths) || 6;
            const monthsSnapshot = item.hasWarranty ? baseMonths + 12 : baseMonths;
            const endDate = new Date(delDate.getTime() + monthsSnapshot * 30 * 24 * 60 * 60 * 1000);

            for (let u = 1; u <= item.quantity; u++) {
              let unit = await tx.soldUnit.findUnique({
                where: {
                  orderItemId_unitIndex: {
                    orderItemId: item.id,
                    unitIndex: u,
                  },
                },
              });

              if (!unit) {
                unit = await tx.soldUnit.create({
                  data: {
                    orderItemId: item.id,
                    productId: item.productId,
                    userId: currentOrder.userId,
                    unitIndex: u,
                    brandSnapshot: (product?.metadata as any)?.brand || 'LaptopMitra',
                    modelSnapshot: product?.name || 'Laptop',
                    status: 'ACTIVE',
                    isDispatched: true,
                    dispatchedAt: delDate,
                  },
                });
              }

              const existingCoverage = await tx.warrantyCoverage.findUnique({
                where: { soldUnitId: unit.id },
              });

              if (!existingCoverage) {
                await tx.warrantyCoverage.create({
                  data: {
                    soldUnitId: unit.id,
                    source: item.hasWarranty ? 'EXTENDED' : 'BASE',
                    monthsSnapshot,
                    startDate: delDate,
                    endDate,
                    status: 'ACTIVE',
                  },
                });
              }

              // Create 1 free general service entitlement for outright purchases (6-month benefit)
              if (item.purchaseMode !== 'rent' && item.purchaseMode !== 'lease') {
                const existingEntitlement = await tx.serviceEntitlement.findFirst({
                  where: {
                    soldUnitId: unit.id,
                    kind: 'OUTRIGHT_FREE',
                  },
                });

                if (!existingEntitlement) {
                  const serviceEnd = new Date(delDate.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);
                  await tx.serviceEntitlement.create({
                    data: {
                      soldUnitId: unit.id,
                      userId: currentOrder.userId,
                      kind: 'OUTRIGHT_FREE',
                      periodStart: delDate,
                      periodEnd: serviceEnd,
                      status: 'AVAILABLE',
                    },
                  });
                }
              } else {
                // Stage 7: Monthly Entitlement for Active Leases
                const existingLeaseEntitlement = await tx.serviceEntitlement.findFirst({
                  where: {
                    soldUnitId: unit.id,
                    kind: 'LEASE_MONTHLY',
                    cycleMonth: 1,
                  },
                });

                if (!existingLeaseEntitlement) {
                  const monthEnd = new Date(delDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                  await tx.serviceEntitlement.create({
                    data: {
                      soldUnitId: unit.id,
                      userId: currentOrder.userId,
                      kind: 'LEASE_MONTHLY',
                      cycleMonth: 1,
                      periodStart: delDate,
                      periodEnd: monthEnd,
                      status: 'AVAILABLE',
                    },
                  });
                }
              }
            }
          }
        }

        // 6. Update the Order record
        const updateData: any = {
          status: targetStatus,
          ...(newPaymentStatus ? { paymentStatus: newPaymentStatus } : {}),
          updatedAt: new Date(),
        };

        const orderResult = await tx.order.update({
          where: { id: orderId },
          data: updateData,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                product: true,
              },
            },
            deliveries: true,
          },
        });

        // 5. Audit trail log
        this.logger.log(
          `[AUDIT] Order status updated: adminId=${adminId || 'system'}, orderId=${orderId}, oldStatus=${currentOrder.status}, newStatus=${targetStatus}, oldPaymentStatus=${currentOrder.paymentStatus}, newPaymentStatus=${orderResult.paymentStatus}, timestamp=${new Date().toISOString()}`,
        );

        return orderResult;
      }, { timeout: 15000, maxWait: 5000 });

      // 6. Trigger branded status email notification (non-blocking for DB consistency)
      if (['CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'].includes(targetStatus)) {
        try {
          await this.notificationService?.dispatchOrderStatusEmail(
            updatedOrder,
            targetStatus,
            courierData,
          );
        } catch (emailErr: any) {
          this.logger.warn(
            `Failed to dispatch status email for order ${orderId}: ${emailErr?.message || emailErr}`,
          );
        }
      }

      return updatedOrder;
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Database error during updateOrderStatus: ${err?.message || err}`);
      throw new ServiceUnavailableException('Database write failed during order status update');
    }
  }

  async cancelOrderItem(
    orderId: string,
    orderItemId: string,
    adminId: string,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payments: true,
        },
      });

      if (!order) throw new NotFoundException(`Order with id ${orderId} not found`);
      if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
        throw new BadRequestException(
          `Cannot cancel items while order is in status "${order.status}". Pre-dispatch cancellation only.`,
        );
      }

      const item = order.items.find((it: any) => it.id === orderItemId);
      if (!item) throw new NotFoundException(`Item ${orderItemId} not found in order ${orderId}`);
      if (item.status === 'CANCELLED') {
        return { order, cancelledItem: item, message: 'Item already cancelled' };
      }

      const activeItems = order.items.filter((it: any) => it.status !== 'CANCELLED');
      const isLastActiveItem = activeItems.length <= 1;

      const itemBasePrice = Number(item.price) * item.quantity;
      const itemWarrantyPrice = item.hasWarranty ? Number(item.warrantyPrice || 0) * item.quantity : 0;
      const itemGrossTotal = itemBasePrice + itemWarrantyPrice;

      const totalActiveBase = activeItems.reduce(
        (sum: number, it: any) => sum + Number(it.price) * it.quantity,
        0,
      );
      const allocatedDiscount = totalActiveBase > 0
        ? Math.round((itemBasePrice / totalActiveBase) * Number(order.discountAmount))
        : 0;

      const itemNetPayable = Math.max(0, itemGrossTotal - allocatedDiscount);
      const wasPaid = order.paymentStatus === 'COMPLETED' || order.paymentStatus === 'PAID';
      const refundAmount = wasPaid ? itemNetPayable : 0;
      const refundStatus = wasPaid ? 'REFUND_PENDING' : 'NOT_APPLICABLE';

      // Restock inventory
      const inventoryWasHeld = ['RESERVED', 'CONSUMED'].includes(order.inventoryStatus);
      if (inventoryWasHeld) {
        const inventoryModel = item.variantId ? tx.productVariant : tx.product;
        await inventoryModel.update({
          where: { id: item.variantId || item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // If lease item, terminate lease contract
      if (tx.leaseContract) {
        await tx.leaseContract.updateMany({
          where: { orderItemId: item.id, status: 'ACTIVE' },
          data: { status: 'TERMINATED' },
        });
      }
      if (tx.leaseInstallment) {
        await tx.leaseInstallment.updateMany({
          where: { contract: { orderItemId: item.id }, status: 'PENDING' },
          data: { status: 'WAIVED' },
        });
      }

      // Update OrderItem
      const updatedItem = await tx.orderItem.update({
        where: { id: item.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason || 'Staff cancelled item',
          cancelledBy: adminId,
          refundAmount: new Prisma.Decimal(refundAmount),
          refundStatus,
        },
      });

      // Record OrderItemCancellation
      await tx.orderItemCancellation.create({
        data: {
          orderItemId: item.id,
          orderId: order.id,
          cancelledBy: adminId,
          reason: reason || 'Staff cancelled item',
          refundAmount: new Prisma.Decimal(refundAmount),
          refundStatus,
          restockedQuantity: item.quantity,
        },
      });

      // AuditLog
      await tx.auditLog.create({
        data: {
          actorUserId: adminId,
          action: 'CANCEL_ORDER_ITEM',
          entityType: 'ORDER_ITEM',
          entityId: item.id,
          metadata: {
            orderId: order.id,
            refundAmount,
            reason,
          },
        },
      });

      this.logger.log(`[AUDIT] Order item cancelled: adminId=${adminId}, orderId=${order.id}, orderItemId=${item.id}, refundAmount=${refundAmount}`);

      if (isLastActiveItem) {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            paymentStatus: wasPaid ? 'REFUND_PENDING' : order.paymentStatus,
            inventoryStatus: inventoryWasHeld ? 'RELEASED' : order.inventoryStatus,
            originalSubtotal: order.originalSubtotal ?? order.subtotal,
            originalFinalAmount: order.originalFinalAmount ?? order.finalAmount,
          },
          include: { items: true, payments: true },
        });
        return { order: updatedOrder, cancelledItem: updatedItem, orderCancelled: true };
      } else {
        const remainingActive = activeItems.filter((it: any) => it.id !== item.id);
        const newSubtotal = remainingActive.reduce(
          (sum: number, it: any) =>
            sum + Number(it.price) * it.quantity + (it.hasWarranty ? Number(it.warrantyPrice || 0) * it.quantity : 0),
          0,
        );
        const newDiscountAmount = Math.max(0, Number(order.discountAmount) - allocatedDiscount);
        const taxRate = Number(order.taxRate || 0);
        const newTaxAmount = taxRate > 0
          ? Math.round((newSubtotal - newDiscountAmount) * (taxRate / 100))
          : 0;
        const newFinalAmount = Math.max(0, newSubtotal - newDiscountAmount + newTaxAmount);

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            subtotal: new Prisma.Decimal(newSubtotal),
            discountAmount: new Prisma.Decimal(newDiscountAmount),
            taxAmount: new Prisma.Decimal(newTaxAmount),
            finalAmount: new Prisma.Decimal(newFinalAmount),
            originalSubtotal: order.originalSubtotal ?? order.subtotal,
            originalFinalAmount: order.originalFinalAmount ?? order.finalAmount,
          },
          include: { items: true, payments: true },
        });

        return { order: updatedOrder, cancelledItem: updatedItem, orderCancelled: false };
      }
    });
  }

  async getDashboardStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      lowStockProducts,
      ordersToday,
      revenueCompletedAgg,
      revenuePendingAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.product.count({ where: { stock: { lte: 5 } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { finalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'PENDING' },
        _sum: { finalAmount: true },
      }),
    ]);

    const revenueCompleted = Number(revenueCompletedAgg._sum?.finalAmount || 0);
    const revenuePending = Number(revenuePendingAgg._sum?.finalAmount || 0);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      revenueCompleted,
      revenuePending,
      lowStockProducts,
      ordersToday,
      revenue: {
        completed: revenueCompleted,
        pending: revenuePending,
      },
    };
  }

  async getAnalytics(query?: AdminAnalyticsQueryDto) {
    const range = query?.range || '7d';
    const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
    const now = new Date();
    const startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    // Build zero-filled day array
    const dayKeys: string[] = [];
    const revenueMap = new Map<string, number>();
    const ordersMap = new Map<string, number>();
    const usersMap = new Map<string, number>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dayKeys.push(key);
      revenueMap.set(key, 0);
      ordersMap.set(key, 0);
      usersMap.set(key, 0);
    }
    // 1. Fetch counts in first batch
    const [totalUsers, activeUsers, totalOrders, totalProducts, lowStockProducts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.order.count(),
        this.prisma.product.count(),
        this.prisma.product.count({ where: { stock: { lte: 5 } } }),
      ]);

    // 2. Fetch range records in second batch
    const [ordersInRange, usersInRange, topSellingItems] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          finalAmount: true,
          createdAt: true,
        },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          createdAt: true,
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          createdAt: { gte: startDate },
        },
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    let totalRevenue = 0;
    ordersInRange.forEach((o) => {
      const dayKey = new Date(o.createdAt).toISOString().split('T')[0];
      if (ordersMap.has(dayKey)) {
        ordersMap.set(dayKey, (ordersMap.get(dayKey) || 0) + 1);
      }
      if (o.paymentStatus === 'COMPLETED') {
        const amount = Number(o.finalAmount || 0);
        totalRevenue += amount;
        if (revenueMap.has(dayKey)) {
          revenueMap.set(dayKey, (revenueMap.get(dayKey) || 0) + amount);
        }
      }
    });

    usersInRange.forEach((u) => {
      const dayKey = new Date(u.createdAt).toISOString().split('T')[0];
      if (usersMap.has(dayKey)) {
        usersMap.set(dayKey, (usersMap.get(dayKey) || 0) + 1);
      }
    });

    const revenueByDay = dayKeys.map((date) => ({
      date,
      amount: revenueMap.get(date) || 0,
    }));

    const ordersByDay = dayKeys.map((date) => ({
      date,
      count: ordersMap.get(date) || 0,
    }));

    const newUsersByDay = dayKeys.map((date) => ({
      date,
      count: usersMap.get(date) || 0,
    }));

    const statusMap = new Map<string, number>();
    ordersInRange.forEach((o) => {
      statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
    });
    const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // Top 5 products by units sold
    const topProducts: Array<{ id: string; name: string; units: number; revenue: number }> = [];
    const bestSellers: Array<{ name: string; sales: number }> = [];

    if (topSellingItems.length > 0) {
      const productIds = topSellingItems.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(products.map((p) => [p.id, p.name]));
      topSellingItems.forEach((item) => {
        const name = nameMap.get(item.productId) || 'Unknown Product';
        const units = item._sum?.quantity || 0;
        const revenue = Number(item._sum?.price || 0);
        topProducts.push({
          id: item.productId,
          name,
          units,
          revenue,
        });
        bestSellers.push({
          name,
          sales: units,
        });
      });
    }

    const pendingOrders = ordersInRange.filter((o) => o.status === 'PENDING').length;
    const deliveredOrders = ordersInRange.filter((o) => o.status === 'DELIVERED').length;
    const cancelledOrders = ordersInRange.filter((o) =>
      ['CANCELLED', 'REFUNDED'].includes(o.status),
    ).length;
    const conversionRate =
      ordersInRange.length > 0
        ? Number(((deliveredOrders / ordersInRange.length) * 100).toFixed(1))
        : 0;

    return {
      range,
      revenueByDay,
      ordersByDay,
      ordersByStatus,
      topProducts,
      newUsersByDay,
      summary: {
        totalRevenue,
        totalOrders: ordersInRange.length,
        totalNewUsers: usersInRange.length,
      },
      // Backwards-compatible nested objects for existing UI components
      revenue: {
        daily: revenueByDay,
        total: totalRevenue,
        growth: 0,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: deliveredOrders,
        cancelled: cancelledOrders,
        conversionRate,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: usersInRange.length,
        growth: 0,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        bestSellers,
      },
    };
  }

  async getSettings() {
    const defaults = {
      storeName: 'LaptopMitra',
      supportEmail: 'support@laptopmitra.com',
      contactPhone: '+91-1800-123-4567',
      storeAddress: '123 Tech Park, Bangalore, Karnataka 560001',
      lowStockThreshold: 5,
      freeShippingThreshold: 999,
      standardDeliveryDays: '3-5',
      expressDeliveryDays: '1-2',
      gstEnabled: false,
      gstRate: 18,
      gstAppliesToPurchases: false,
      gstAppliesToRentals: false,
      gstPriceInclusive: false,
    };

    try {
      const rows = await this.prisma.$queryRaw<Array<{ key: string; value: string }>>`
        SELECT "key", "value" FROM "system_settings"
      `;

      const settings: Record<string, any> = { ...defaults };
      for (const row of rows) {
        if (['lowStockThreshold', 'freeShippingThreshold', 'gstRate'].includes(row.key)) {
          settings[row.key] = Number(row.value);
        } else if (
          [
            'gstEnabled',
            'gstAppliesToPurchases',
            'gstAppliesToRentals',
            'gstPriceInclusive',
          ].includes(row.key)
        ) {
          settings[row.key] = row.value === 'true';
        } else {
          settings[row.key] = row.value;
        }
      }
      return settings;
    } catch (err: any) {
      this.logger.warn(
        `Failed to read system_settings, falling back to defaults: ${err?.message || err}`,
      );
      return defaults;
    }
  }

  async getRentalPriceDrafts() {
    return this.prisma.rentalPrice.findMany({
      where: { status: 'DRAFT' },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        variant: { select: { id: true, name: true, sku: true } },
        auditHistory: { select: { action: true } },
      },
      orderBy: [{ product: { name: 'asc' } }, { tenureMonths: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getRentalPrices() {
    return this.prisma.rentalPrice.findMany({
      include: {
        product: { select: { id: true, name: true, sku: true } },
        variant: { select: { id: true, name: true, sku: true } },
        auditHistory: { select: { action: true } },
      },
      orderBy: [{ product: { name: 'asc' } }, { tenureMonths: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getRentalPricingCatalog() {
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        variants: {
          where: { isActive: true },
          select: { id: true, name: true, sku: true, price: true, attributes: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getRentalPriceHistory(id: string) {
    const price = await this.prisma.rentalPrice.findUnique({ where: { id }, select: { id: true } });
    if (!price) throw new NotFoundException('Rental price not found');
    return this.prisma.rentalPriceAudit.findMany({
      where: { rentalPriceId: id },
      include: { admin: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRentalPriceDraft(dto: CreateRentalPriceDto, adminId: string) {
    if (!RENTAL_PRICE_TENURES.includes(dto.tenureMonths as (typeof RENTAL_PRICE_TENURES)[number])) {
      throw new BadRequestException('Rental tenure is not supported');
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const product = await transaction.product.findFirst({
          where: { id: dto.productId, status: 'ACTIVE' },
          include: { variants: { where: { isActive: true }, select: { id: true } } },
        });
        if (!product) throw new NotFoundException('Active product not found');

        let variant: { id: string; productId: string; price: unknown } | null = null;
        if (dto.variantId) {
          variant = await transaction.productVariant.findFirst({
            where: { id: dto.variantId, productId: product.id, isActive: true },
            select: { id: true, productId: true, price: true },
          });
          if (!variant) throw new BadRequestException('Selected product variant is unavailable');
        } else if (product.variants.length > 0) {
          throw new BadRequestException('Select a variant for products with active configurations');
        }

        const sellingPrice = Number(variant?.price ?? product.price);
        const existingDraft = await transaction.rentalPrice.findFirst({
          where: {
            productId: product.id,
            variantId: variant?.id ?? null,
            tenureMonths: dto.tenureMonths,
            status: 'DRAFT',
            sourceType: 'MANUAL',
            changeReason: { not: null },
          },
        });
        if (existingDraft)
          throw new ConflictException('A manual draft already exists for this product and tenure');

        const created = await transaction.rentalPrice.create({
          data: {
            productId: product.id,
            variantId: variant?.id ?? null,
            tenureMonths: dto.tenureMonths,
            monthlyPrice: dto.monthlyPrice.toFixed(2),
            securityDeposit: dto.securityDeposit.toFixed(2),
            deliveryCharge: dto.deliveryCharge.toFixed(2),
            sellingPriceSnapshot: sellingPrice.toFixed(2),
            percentage: '0.00',
            status: 'DRAFT',
            sourceType: 'MANUAL',
            changeReason: dto.reason.trim(),
          },
        });
        await transaction.rentalPriceAudit.create({
          data: {
            rentalPriceId: created.id,
            action: 'CREATED',
            newMonthlyPrice: created.monthlyPrice,
            newDeposit: created.securityDeposit,
            newDeliveryCharge: created.deliveryCharge,
            adminId,
            reason: dto.reason.trim(),
          },
        });
        return created;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async updateRentalPriceDraft(id: string, dto: UpdateRentalPriceDto, adminId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const draft = await transaction.rentalPrice.findUnique({ where: { id } });
      if (!draft) throw new NotFoundException('Rental price draft not found');
      if (draft.status !== 'DRAFT' || draft.sourceType !== 'MANUAL') {
        throw new BadRequestException('Only manual rental price drafts can be edited');
      }

      const updated = await transaction.rentalPrice.update({
        where: { id },
        data: {
          monthlyPrice: dto.monthlyPrice.toFixed(2),
          securityDeposit: dto.securityDeposit.toFixed(2),
          deliveryCharge: dto.deliveryCharge.toFixed(2),
          changeReason: dto.reason.trim(),
        },
      });
      await transaction.rentalPriceAudit.create({
        data: {
          rentalPriceId: id,
          action: 'UPDATED',
          previousMonthlyPrice: draft.monthlyPrice,
          newMonthlyPrice: updated.monthlyPrice,
          previousDeposit: draft.securityDeposit,
          newDeposit: updated.securityDeposit,
          previousDeliveryCharge: draft.deliveryCharge,
          newDeliveryCharge: updated.deliveryCharge,
          adminId,
          reason: dto.reason.trim(),
        },
      });
      return updated;
    });
  }

  async approveRentalPrice(id: string, adminId: string) {
    return this.prisma.$transaction(
      async (transaction) => {
        const draft = await transaction.rentalPrice.findUnique({ where: { id } });
        if (!draft || draft.status !== 'DRAFT') {
          throw new NotFoundException('Rental price draft not found');
        }
        if (draft.sourceType !== 'MANUAL') {
          throw new BadRequestException(
            'Illustrative estimates cannot be approved or used for customer pricing',
          );
        }
        if (Number(draft.securityDeposit) !== 0 || Number(draft.deliveryCharge) !== 0) {
          throw new BadRequestException(
            'Deposits and delivery fees cannot be approved until checkout supports one-time rental charges',
          );
        }
        const manualReview = await transaction.rentalPriceAudit.findFirst({
          where: { rentalPriceId: id, action: { in: ['CREATED', 'UPDATED'] } },
          select: { id: true },
        });
        if (!manualReview) {
          throw new BadRequestException(
            'Review and save this legacy draft with a reason before approving it',
          );
        }

        await transaction.rentalPrice.updateMany({
          where: {
            productId: draft.productId,
            variantId: draft.variantId,
            tenureMonths: draft.tenureMonths,
            status: 'APPROVED',
            sourceType: 'MANUAL',
          },
          data: { status: 'SUPERSEDED' },
        });

        const approved = await transaction.rentalPrice.update({
          where: { id },
          data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() },
        });
        await transaction.rentalPriceAudit.create({
          data: {
            rentalPriceId: id,
            action: 'APPROVED',
            previousMonthlyPrice: draft.monthlyPrice,
            newMonthlyPrice: draft.monthlyPrice,
            previousDeposit: draft.securityDeposit,
            newDeposit: draft.securityDeposit,
            previousDeliveryCharge: draft.deliveryCharge,
            newDeliveryCharge: draft.deliveryCharge,
            adminId,
            reason: draft.changeReason || 'Approved by administrator',
          },
        });
        return approved;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async updateSettings(dto: UpdateSettingsDto, adminId?: string) {
    try {
      for (const [key, val] of Object.entries(dto)) {
        if (val !== undefined && val !== null) {
          const stringVal = String(val);
          await this.prisma.$executeRaw`
            INSERT INTO "system_settings" ("key", "value", "updatedAt")
            VALUES (${key}, ${stringVal}, NOW())
            ON CONFLICT ("key")
            DO UPDATE SET "value" = ${stringVal}, "updatedAt" = NOW()
          `;
        }
      }

      this.logger.log(`[AUDIT] Platform settings updated by adminId=${adminId || 'system'}`);
      return await this.getSettings();
    } catch (err: any) {
      this.logger.error(`Failed to update system_settings: ${err?.message || err}`);
      throw new ServiceUnavailableException('Database error saving administrative settings');
    }
  }

  async getCorporateInquiries(params?: { status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, Math.min(100, params?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params?.status && params.status !== 'all') {
      where.status = params.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.corporateInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.corporateInquiry.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async updateCorporateInquiryStatus(
    id: string,
    status: 'PENDING' | 'CONTACTED' | 'QUOTED' | 'CLOSED',
    adminId?: string,
    adminNotes?: string,
  ) {
    const allowed = ['PENDING', 'CONTACTED', 'QUOTED', 'CLOSED'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Status must be one of: ${allowed.join(', ')}`);
    }

    const existing = await this.prisma.corporateInquiry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Corporate inquiry with id ${id} not found`);
    }

    const updated = await this.prisma.corporateInquiry.update({
      where: { id },
      data: {
        status,
        ...(adminNotes
          ? {
              notes: existing.notes
                ? `${existing.notes}\n[Admin]: ${adminNotes}`
                : `[Admin]: ${adminNotes}`,
            }
          : {}),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: adminId || null,
          action: 'UPDATE_INQUIRY_STATUS',
          entityType: 'CORPORATE_INQUIRY',
          entityId: id,
          metadata: {
            previousStatus: existing.status,
            newStatus: status,
            adminNotes: adminNotes || null,
          },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(
        `Failed to create audit log for inquiry update: ${auditErr?.message || auditErr}`,
      );
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Affiliate & Payout Management (Section 5.1)
  // ---------------------------------------------------------------------------

  async getAffiliates(query?: { page?: number; pageSize?: number; search?: string }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {
      role: 'CUSTOMER',
    };

    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { referralCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ referralEarnings: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          email: true,
          referralCode: true,
          referralTier: true,
          referralEarnings: true,
          referralReserved: true,
          referralWithdrawn: true,
          referralLinkClickedCount: true,
          createdAt: true,
          _count: {
            select: {
              withdrawalRequests: true,
            },
          },
          withdrawalRequests: {
            where: { status: 'PENDING' },
            select: { id: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((u) => {
      const earnings = Number(u.referralEarnings || 0);
      const reserved = Number(u.referralReserved || 0);
      const withdrawn = Number(u.referralWithdrawn || 0);
      const availableBalance = Math.max(0, earnings - reserved - withdrawn);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        referralCode: u.referralCode,
        referralTier: u.referralTier,
        referralEarnings: earnings,
        referralReserved: reserved,
        referralWithdrawn: withdrawn,
        availableBalance,
        clicksCount: u.referralLinkClickedCount,
        pendingWithdrawalsCount: u.withdrawalRequests.length,
        totalWithdrawalsCount: u._count.withdrawalRequests,
        createdAt: u.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getAffiliateDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        referralCode: true,
        referralTier: true,
        referralEarnings: true,
        referralReserved: true,
        referralWithdrawn: true,
        referralLinkClickedCount: true,
        createdAt: true,
        affiliatePaymentDetails: {
          select: {
            id: true,
            bankName: true,
            accountHolderName: true,
            accountNumberMasked: true,
            ifscCode: true,
            upiIdMasked: true,
            qrCodeKey: true,
            updatedAt: true,
          },
        },
        withdrawalRequests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            status: true,
            adminNotes: true,
            processedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Affiliate user with ID ${userId} not found`);
    }

    const earnings = Number(user.referralEarnings || 0);
    const reserved = Number(user.referralReserved || 0);
    const withdrawn = Number(user.referralWithdrawn || 0);
    const availableBalance = Math.max(0, earnings - reserved - withdrawn);

    let ifscCodeMasked: string | null = null;
    if (user.affiliatePaymentDetails?.ifscCode && this.encryptionService) {
      try {
        const decryptedIfsc = this.encryptionService.decrypt(user.affiliatePaymentDetails.ifscCode);
        ifscCodeMasked = this.encryptionService.maskIfsc(decryptedIfsc);
      } catch {
        ifscCodeMasked = '••••••••';
      }
    }

    const payoutDetails = user.affiliatePaymentDetails
      ? {
          bankName: user.affiliatePaymentDetails.bankName,
          accountHolderName: user.affiliatePaymentDetails.accountHolderName,
          accountNumberMasked: user.affiliatePaymentDetails.accountNumberMasked,
          ifscCodeMasked,
          upiIdMasked: user.affiliatePaymentDetails.upiIdMasked,
          hasQrCode: Boolean(user.affiliatePaymentDetails.qrCodeKey),
          updatedAt: user.affiliatePaymentDetails.updatedAt,
        }
      : null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: user.role,
      referralCode: user.referralCode,
      referralTier: user.referralTier,
      referralEarnings: earnings,
      referralReserved: reserved,
      referralWithdrawn: withdrawn,
      availableBalance,
      referralLinkClickedCount: user.referralLinkClickedCount,
      payoutDetails,
      ledger: user.withdrawalRequests.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        status: w.status,
        adminNotes: w.adminNotes,
        processedAt: w.processedAt,
        createdAt: w.createdAt,
      })),
      createdAt: user.createdAt,
    };
  }

  async getWithdrawalPaymentDetails(withdrawalId: string, adminId?: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal request with ID ${withdrawalId} not found`);
    }

    if (!this.encryptionService) {
      throw new ServiceUnavailableException('Payment encryption service is unavailable');
    }

    const decryptedSnapshot = this.encryptionService.decrypt(withdrawal.paymentMethodSnapshot);
    let parsedSnapshot: any;
    try {
      parsedSnapshot = JSON.parse(decryptedSnapshot);
    } catch {
      throw new BadRequestException('Corrupted payment snapshot data');
    }

    // Write audit log entry (NO plain decrypted secrets in metadata!)
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: adminId || null,
          action: 'VIEW_PAYMENT_SNAPSHOT',
          entityType: 'WITHDRAWAL_REQUEST',
          entityId: withdrawalId,
          metadata: {
            withdrawalAmount: Number(withdrawal.amount),
            recipientUserId: withdrawal.userId,
            viewedAt: new Date().toISOString(),
          },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(
        `Could not create audit log for snapshot view: ${auditErr?.message || auditErr}`,
      );
    }

    return {
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      user: withdrawal.user,
      amount: Number(withdrawal.amount),
      status: withdrawal.status,
      adminNotes: withdrawal.adminNotes,
      processedAt: withdrawal.processedAt,
      createdAt: withdrawal.createdAt,
      paymentDetails: parsedSnapshot,
    };
  }

  async getWithdrawalQrFile(withdrawalId: string, adminId?: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal request with ID ${withdrawalId} not found`);
    }

    if (!this.encryptionService || !this.qrStorageService) {
      throw new ServiceUnavailableException('Encryption or storage service is unavailable');
    }

    const decryptedSnapshot = this.encryptionService.decrypt(withdrawal.paymentMethodSnapshot);
    let parsed: any;
    try {
      parsed = JSON.parse(decryptedSnapshot);
    } catch {
      throw new BadRequestException('Corrupted payment snapshot data');
    }

    if (!parsed.qrCodeKey) {
      throw new NotFoundException('No QR code attached to this withdrawal request');
    }

    // Write audit log entry
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: adminId || null,
          action: 'VIEW_PAYMENT_QR',
          entityType: 'WITHDRAWAL_REQUEST',
          entityId: withdrawalId,
          metadata: {
            qrCodeKey: parsed.qrCodeKey,
            viewedAt: new Date().toISOString(),
          },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Could not create audit log for QR view: ${auditErr?.message || auditErr}`);
    }

    return this.qrStorageService.getQrFile(parsed.qrCodeKey);
  }

  async updateWithdrawalStatus(
    withdrawalId: string,
    status: 'APPROVED' | 'REJECTED',
    adminId?: string,
    adminNotes?: string,
  ) {
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new BadRequestException("Status must be either 'APPROVED' or 'REJECTED'");
    }

    if (status === 'REJECTED' && (!adminNotes || !adminNotes.trim())) {
      throw new BadRequestException(
        'Rejection notes (adminNotes) are mandatory when rejecting a withdrawal request',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Row lock on WithdrawalRequest to prevent race conditions & double processing
      const rows = await tx.$queryRaw<any[]>`
        SELECT id, "userId", amount, status
        FROM "WithdrawalRequest"
        WHERE id = ${withdrawalId}
        FOR UPDATE
      `;

      if (!rows || rows.length === 0) {
        throw new NotFoundException(`Withdrawal request with ID ${withdrawalId} not found`);
      }

      const withdrawal = rows[0];

      if (withdrawal.status !== 'PENDING') {
        throw new ConflictException(
          `Withdrawal request has already been processed with status "${withdrawal.status}"`,
        );
      }

      const amount = Number(withdrawal.amount);
      const userId = withdrawal.userId;

      if (status === 'APPROVED') {
        // Move amount from reserved to withdrawn
        await tx.user.update({
          where: { id: userId },
          data: {
            referralReserved: { decrement: amount },
            referralWithdrawn: { increment: amount },
          },
        });
      } else {
        // REJECTED: return reserved funds back to available balance
        await tx.user.update({
          where: { id: userId },
          data: {
            referralReserved: { decrement: amount },
          },
        });
      }

      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status,
          adminNotes: adminNotes?.trim() || null,
          processedAt: new Date(),
        },
      });

      // Write audit log entry
      await tx.auditLog.create({
        data: {
          actorUserId: adminId || null,
          action: status === 'APPROVED' ? 'APPROVE_WITHDRAWAL' : 'REJECT_WITHDRAWAL',
          entityType: 'WITHDRAWAL_REQUEST',
          entityId: withdrawalId,
          metadata: {
            amount,
            previousStatus: withdrawal.status,
            newStatus: status,
            adminNotes: adminNotes?.trim() || null,
          },
        },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        amount: Number(updated.amount),
        status: updated.status,
        adminNotes: updated.adminNotes,
        processedAt: updated.processedAt,
        updatedAt: updated.updatedAt,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Warranty Register & Serial Tracking (Stage 2)
  // ---------------------------------------------------------------------------

  async getWarrantyRegister(query: any) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.source) {
      where.source = query.source;
    }
    if (query?.brand) {
      where.soldUnit = {
        brandSnapshot: { contains: query.brand, mode: 'insensitive' },
      };
    }
    if (query?.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { soldUnit: { serialNumber: { contains: s, mode: 'insensitive' } } },
        { soldUnit: { modelSnapshot: { contains: s, mode: 'insensitive' } } },
        { soldUnit: { user: { name: { contains: s, mode: 'insensitive' } } } },
        { soldUnit: { user: { email: { contains: s, mode: 'insensitive' } } } },
        { soldUnit: { orderItem: { order: { orderNumber: { contains: s, mode: 'insensitive' } } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.warrantyCoverage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { endDate: 'asc' },
        include: {
          soldUnit: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              product: { select: { id: true, name: true, slug: true, images: true } },
              orderItem: {
                select: {
                  id: true,
                  orderId: true,
                  price: true,
                  quantity: true,
                  order: { select: { id: true, orderNumber: true, createdAt: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.warrantyCoverage.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getSoldUnits(query: any) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.brand) where.brandSnapshot = { contains: query.brand, mode: 'insensitive' };
    if (query?.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { serialNumber: { contains: s, mode: 'insensitive' } },
        { modelSnapshot: { contains: s, mode: 'insensitive' } },
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.soldUnit.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          warrantyCoverage: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          product: { select: { id: true, name: true, slug: true, images: true } },
          orderItem: {
            select: {
              id: true,
              orderId: true,
              price: true,
              quantity: true,
              order: { select: { id: true, orderNumber: true, createdAt: true } },
            },
          },
        },
      }),
      this.prisma.soldUnit.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async getUnitBySerial(serial: string) {
    const trimmed = serial.trim();
    const unit = await this.prisma.soldUnit.findFirst({
      where: {
        OR: [
          { serialNumber: trimmed },
          { id: trimmed },
        ],
      },
      include: {
        warrantyCoverage: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        product: { select: { id: true, name: true, slug: true, images: true } },
        orderItem: {
          include: {
            order: {
              include: {
                deliveries: true,
                payments: true,
              },
            },
          },
        },
        serialHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        serviceJobs: {
          orderBy: { createdAt: 'desc' },
          include: {
            technician: { select: { id: true, name: true, phone: true } },
          },
        },
        entitlements: true,
      },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with serial number "${serial}" not found`);
    }

    return unit;
  }

  async updateUnitSerial(unitId: string, dto: { serialNumber: string; reason: string }, adminId?: string) {
    const newSerial = dto.serialNumber?.trim();
    const reason = dto.reason?.trim();

    if (!newSerial) {
      throw new BadRequestException('Serial number cannot be empty.');
    }
    if (!reason) {
      throw new BadRequestException('A reason is required when modifying a unit serial number.');
    }

    const unit = await this.prisma.soldUnit.findUnique({
      where: { id: unitId },
    });
    if (!unit) {
      throw new NotFoundException(`SoldUnit with id "${unitId}" not found`);
    }

    if (unit.serialNumber === newSerial) {
      return unit;
    }

    const existingActive = await this.prisma.soldUnit.findFirst({
      where: {
        serialNumber: newSerial,
        status: 'ACTIVE',
        NOT: { id: unitId },
      },
    });
    if (existingActive) {
      throw new BadRequestException(`Serial number "${newSerial}" is already assigned to another active unit.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const prevSerial = unit.serialNumber;
      const updatedUnit = await tx.soldUnit.update({
        where: { id: unitId },
        data: { serialNumber: newSerial },
      });

      await tx.soldUnitSerialHistory.create({
        data: {
          soldUnitId: unit.id,
          previousSerial: prevSerial,
          newSerial,
          changedBy: adminId || unit.userId,
          reason,
        },
      });

      return updatedUnit;
    });
  }
}
