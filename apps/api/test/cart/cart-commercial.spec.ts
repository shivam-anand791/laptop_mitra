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
    leasePriceMonthly: 2500,
    stock: 15,
    allowBackorder: false,
    status: 'ACTIVE',
  };

  const mockProductWithoutLease = {
    id: 'prod-lat7490',
    name: 'Dell Latitude 7490',
    price: 25000,
    leasePriceMonthly: null,
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
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...mockCart, ...data })),
      },
      cartItem: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const newItem = { id: `item-${Date.now()}-${Math.random()}`, ...data, product: mockProduct };
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

      expect(mockPrisma.cartItem.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          variant: { connect: { id: variant.id } },
          lineKey: `variant:${variant.id}:sell`,
          priceAtAdd: 31500,
        }),
      }));
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

    it('resolves explicit leasePriceMonthly when available', async () => {
      const item = await cartService.addItem('user-1', 'prod-t480', 1, 'lease', 'default', false);
      expect(item.priceAtAdd).toBe(2500);
      expect(item.purchaseMode).toBe('lease');
    });

    it('rejects lease item when leasePriceMonthly is null with BadRequestException', async () => {
      await expect(
        cartService.addItem('user-1', 'prod-lat7490', 1, 'lease', 'default', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not invent a lease upgrade price for a legacy configuration label', async () => {
      const item = await cartService.addItem('user-1', 'prod-t480', 1, 'lease', 'ram-16gb', false);
      expect(item.priceAtAdd).toBe(2500);
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
        cartService.addItem('user-1', 'prod-t480', 1, 'lease', 'default', true),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Multi-Mode Coexistence', () => {
    it('allows same product as BUY and RENT to coexist in one cart', async () => {
      await cartService.addItem('user-1', 'prod-t480', 1, 'sell', 'default', true);
      await cartService.addItem('user-1', 'prod-t480', 2, 'lease', 'ram-16gb', false);

      expect(mockCart.items.length).toBe(2);

      const buyItem = mockCart.items.find((i: any) => i.purchaseMode === 'sell');
      const leaseItem = mockCart.items.find((i: any) => i.purchaseMode === 'lease');

      expect(buyItem).toBeDefined();
      expect(buyItem.priceAtAdd).toBe(30000);
      expect(buyItem.hasWarranty).toBe(true);

      expect(leaseItem).toBeDefined();
      expect(leaseItem.priceAtAdd).toBe(2500);
      expect(leaseItem.quantity).toBe(2);
      expect(leaseItem.hasWarranty).toBe(false);
    });

    it('computes separated oneTimeTotal and monthlyTotal in getCart', async () => {
      // 1 Buy laptop (30000) + warranty (1999) = 31999
      await cartService.addItem('user-1', 'prod-t480', 1, 'sell', 'default', true);
      // 2 Lease laptops (2500/mo) * 2 = 5000/mo
      await cartService.addItem('user-1', 'prod-t480', 2, 'lease', 'ram-16gb', false);

      const cartSummary = await cartService.getCart('user-1');

      expect(cartSummary.oneTimeTotal).toBe(31999);
      expect(cartSummary.monthlyTotal).toBe(5000);
      expect(cartSummary.total).toBe(36999);
      expect(cartSummary.itemCount).toBe(3);
    });

    it('uses the current selected variant price when a saved cart is reopened', async () => {
      mockCart.items = [{
        id: 'variant-cart-item',
        productId: mockProduct.id,
        variantId: 'variant-16gb',
        variant: { id: 'variant-16gb', price: 34000, leasePriceMonthly: 2800 },
        priceAtAdd: 30000,
        quantity: 1,
        purchaseMode: 'sell',
        hasWarranty: false,
        warrantyPrice: 0,
      }];

      const cartSummary = await cartService.getCart('user-1');

      expect(cartSummary.items[0].priceAtAdd).toBe(34000);
      expect(cartSummary.oneTimeTotal).toBe(34000);
    });
  });
});
