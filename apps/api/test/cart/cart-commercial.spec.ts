import { BadRequestException } from '@nestjs/common';
import { CartService, WARRANTY_PRICE_PER_UNIT } from '../../src/modules/cart/cart.service';

describe('CartCommercialSpec - Variant Pricing, Warranty & Multi-Mode', () => {
  let cartService: CartService;
  let mockPrisma: any;
  let mockProductService: any;

  const mockProduct = {
    id: 'prod-t480',
    name: 'Lenovo ThinkPad T480',
    price: 30000,
    stock: 15,
    allowBackorder: false,
    status: 'ACTIVE',
  };

  const mockProductWithoutLease = {
    id: 'prod-lat7490',
    name: 'Dell Latitude 7490',
    price: 25000,
    stock: 10,
    allowBackorder: false,
    status: 'ACTIVE',
  };

  let mockCart: any;

  beforeEach(() => {
    mockCart = {
      id: 'cart-1',
      userId: 'user-1',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma = {
      cart: {
        findFirst: jest.fn().mockImplementation(() => Promise.resolve(mockCart)),
        create: jest
          .fn()
          .mockImplementation(({ data }: any) => Promise.resolve({ ...mockCart, ...data })),
      },
      cartItem: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const newItem = {
            id: `item-${Date.now()}-${Math.random()}`,
            ...data,
            productId: data.product.connect.id,
            variantId: data.variant?.connect.id ?? null,
            product: mockProduct,
          };
          mockCart.items.push(newItem);
          return Promise.resolve(newItem);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const item = mockCart.items.find((i: any) => i.id === where.id);
          if (item) Object.assign(item, data);
          return Promise.resolve({ ...item, product: mockProduct });
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          mockCart.items = mockCart.items.filter((i: any) => i.id !== where.id);
          return Promise.resolve();
        }),
        deleteMany: jest.fn().mockImplementation(() => {
          mockCart.items = [];
          return Promise.resolve({ count: 0 });
        }),
      },
      product: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === 'prod-t480') return Promise.resolve(mockProduct);
          if (where.id === 'prod-lat7490') return Promise.resolve(mockProductWithoutLease);
          return Promise.resolve(null);
        }),
      },
      productVariant: {
        findUnique: jest.fn(),
      },
      rentalPrice: {
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          if (where.productId !== mockProduct.id) return Promise.resolve(null);
          const monthlyPrice = where.tenureMonths === 6 ? 2100 : 2500;
          return Promise.resolve({ monthlyPrice, approvedAt: new Date() });
        }),
      },
    };

    mockProductService = {};
    cartService = new CartService(mockPrisma, mockProductService);
  });

  describe('Price Resolution', () => {
    it('attaches the active default variant when callers omit a variant choice', async () => {
      const variant = {
        id: 'variant-default',
        productId: mockProduct.id,
        price: 31500,
        stock: 4,
        allowBackorder: false,
        isActive: true,
      };
      mockPrisma.product.findUnique.mockResolvedValue({ ...mockProduct, variants: [variant] });
      mockPrisma.productVariant.findUnique.mockResolvedValue(variant);

      await cartService.addItem('user-1', mockProduct.id);

      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variant: { connect: { id: variant.id } },
            lineKey: `variant:${variant.id}:sell:none`,
            priceAtAdd: 31500,
          }),
        }),
      );
    });

    it('resolves standard outright purchase price', async () => {
      const item = await cartService.addItem('user-1', 'prod-t480', 1, 'sell', 'default', false);
      expect(item.priceAtAdd).toBe(30000);
      expect(item.purchaseMode).toBe('sell');
      expect(item.configuration).toBe('default');
      expect(item.hasWarranty).toBe(false);
      expect(item.warrantyPrice).toBe(0);
    });

    it('does not invent an upgrade price for a legacy configuration label', async () => {
      const item = await cartService.addItem('user-1', 'prod-t480', 1, 'sell', 'ram-16gb', false);
      expect(item.priceAtAdd).toBe(30000);
      expect(item.configuration).toBe('default');
    });

    it('uses the approved monthly rental price for the selected tenure', async () => {
      const item = await cartService.addItem(
        'user-1',
        'prod-t480',
        1,
        'lease',
        'default',
        false,
        undefined,
        12,
      );
      expect(item.priceAtAdd).toBe(2500);
      expect(item.purchaseMode).toBe('lease');
      expect(mockPrisma.rentalPrice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenureMonths: 12,
            status: 'APPROVED',
            sourceType: 'MANUAL',
            auditHistory: { some: { action: 'APPROVED' } },
          }),
        }),
      );
    });

    it('rejects lease item when no approved price exists with BadRequestException', async () => {
      await expect(
        cartService.addItem('user-1', 'prod-lat7490', 1, 'lease', 'default', false, undefined, 12),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not invent a lease upgrade price for a legacy configuration label', async () => {
      const item = await cartService.addItem(
        'user-1',
        'prod-t480',
        1,
        'lease',
        'ram-16gb',
        false,
        undefined,
        12,
      );
      expect(item.priceAtAdd).toBe(2500);
    });

    it('uses the current approved rate when displaying a saved rental cart', async () => {
      mockCart.items = [
        {
          id: 'saved-rental',
          productId: mockProduct.id,
          variantId: null,
          product: mockProduct,
          variant: null,
          priceAtAdd: 100,
          quantity: 1,
          purchaseMode: 'lease',
          tenureMonths: 6,
          hasWarranty: false,
          warrantyPrice: 0,
        },
      ];

      const cartSummary = await cartService.getCart('user-1');

      expect(cartSummary.items[0].priceAtAdd).toBe(2100);
      expect(cartSummary.monthlyTotal).toBe(2100);
    });
  });

  describe('Warranty Rules', () => {
    it('accepts warranty add-on (+₹1,999) for outright purchase', async () => {
      const item = await cartService.addItem('user-1', 'prod-t480', 1, 'sell', 'default', true);
      expect(item.hasWarranty).toBe(true);
      expect(item.warrantyPrice).toBe(WARRANTY_PRICE_PER_UNIT);
    });

    it('rejects warranty add-on for lease with BadRequestException', async () => {
      await expect(
        cartService.addItem('user-1', 'prod-t480', 1, 'lease', 'default', true, undefined, 12),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Purchase mode separation', () => {
    it('rejects mixing BUY and RENT without changing the existing cart', async () => {
      await cartService.addItem('user-1', 'prod-t480', 1, 'sell', 'default', true);
      await expect(
        cartService.addItem('user-1', 'prod-t480', 2, 'lease', 'ram-16gb', false, undefined, 12),
      ).rejects.toThrow('Buy and rent items must be kept in separate carts');

      expect(mockCart.items).toHaveLength(1);

      const buyItem = mockCart.items.find((i: any) => i.purchaseMode === 'sell');

      expect(buyItem).toBeDefined();
      expect(buyItem.priceAtAdd).toBe(30000);
      expect(buyItem.hasWarranty).toBe(true);
    });

    it('recalculates the current approved monthly total in getCart', async () => {
      await cartService.addItem('user-1', 'prod-t480', 2, 'lease', 'default', false, undefined, 12);

      const cartSummary = await cartService.getCart('user-1');

      expect(cartSummary.oneTimeTotal).toBe(0);
      expect(cartSummary.monthlyTotal).toBe(5000);
      expect(cartSummary.total).toBe(5000);
      expect(cartSummary.itemCount).toBe(2);
    });

    it('uses the current selected variant price when a saved cart is reopened', async () => {
      mockCart.items = [
        {
          id: 'variant-cart-item',
          productId: mockProduct.id,
          variantId: 'variant-16gb',
          variant: { id: 'variant-16gb', price: 34000 },
          priceAtAdd: 30000,
          quantity: 1,
          purchaseMode: 'sell',
          hasWarranty: false,
          warrantyPrice: 0,
        },
      ];

      const cartSummary = await cartService.getCart('user-1');

      expect(cartSummary.items[0].priceAtAdd).toBe(34000);
      expect(cartSummary.oneTimeTotal).toBe(34000);
    });
  });
});
