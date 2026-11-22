import { DiscountService } from '../../src/modules/discount/discount.service';

describe('Referral code validation', () => {
  it('recognizes a legacy referral alias and returns the same flat ₹500 discount', async () => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'referrer-1' }) },
      referral: { findFirst: jest.fn().mockResolvedValue({ userId: 'referrer-1' }) },
      discountCode: { findFirst: jest.fn() },
    } as any;
    const service = new DiscountService(prisma, {} as any, {} as any);

    const result = await service.validateDiscount('55JAFRTN', 1200);

    expect(result).toMatchObject({
      valid: true,
      discountType: 'fixed',
      discountValue: 500,
      discountAmount: 500,
      isReferral: true,
    });
    expect(prisma.discountCode.findFirst).not.toHaveBeenCalled();
  });

  it('caps a referral discount at the cart total', async () => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'referrer-1' }) },
      referral: { findFirst: jest.fn() },
      discountCode: { findFirst: jest.fn() },
    } as any;
    const service = new DiscountService(prisma, {} as any, {} as any);

    const result = await service.validateDiscount('mitrauser1234', 250);

    expect(result.discountAmount).toBe(250);
    expect(result.isReferral).toBe(true);
    expect(prisma.referral.findFirst).not.toHaveBeenCalled();
  });
});
