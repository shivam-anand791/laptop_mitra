import {
  calculateIllustrativeRentalPriceDrafts,
  ILLUSTRATIVE_RENTAL_PRICE_LABEL,
} from '../../src/modules/admin/rental-pricing';

describe('illustrative rental price drafts', () => {
  it('calculates a rounded monthly rate and keeps every estimate explicitly illustrative', () => {
    expect(
      calculateIllustrativeRentalPriceDrafts({
        landedCost: 25000,
        setupDeliveryCost: 500,
        monthlyMaintenanceCost: 200,
        recoveryMonths: 12,
        targetGrossMargin: 0.2,
      }),
    ).toEqual(
      [1, 3, 6, 12, 24].map((tenureMonths) => ({
        tenureMonths,
        monthlyPrice: 2900,
        securityDeposit: 0,
        deliveryCharge: 500,
        sourceType: 'ILLUSTRATIVE',
        estimateLabel: ILLUSTRATIVE_RENTAL_PRICE_LABEL,
      })),
    );
  });

  it.each([
    [25000, 200, 2900],
    [30000, 250, 3400],
    [35000, 250, 4000],
    [40000, 300, 4500],
    [22000, 200, 2500],
    [45000, 350, 5100],
  ])(
    'calculates the synthetic-only estimate for landed cost ₹%i',
    (landedCost, maintenance, expected) => {
      const [estimate] = calculateIllustrativeRentalPriceDrafts({
        landedCost,
        setupDeliveryCost: 500,
        monthlyMaintenanceCost: maintenance,
        recoveryMonths: 12,
        targetGrossMargin: 0.2,
      });

      expect(estimate.monthlyPrice).toBe(expected);
      expect(estimate.sourceType).toBe('ILLUSTRATIVE');
    },
  );

  it.each([
    {
      landedCost: 0,
      setupDeliveryCost: 0,
      monthlyMaintenanceCost: 0,
      recoveryMonths: 12,
      targetGrossMargin: 0.2,
    },
    {
      landedCost: 10000,
      setupDeliveryCost: -1,
      monthlyMaintenanceCost: 0,
      recoveryMonths: 12,
      targetGrossMargin: 0.2,
    },
    {
      landedCost: 10000,
      setupDeliveryCost: 0,
      monthlyMaintenanceCost: -1,
      recoveryMonths: 12,
      targetGrossMargin: 0.2,
    },
    {
      landedCost: 10000,
      setupDeliveryCost: 0,
      monthlyMaintenanceCost: 0,
      recoveryMonths: 0,
      targetGrossMargin: 0.2,
    },
    {
      landedCost: 10000,
      setupDeliveryCost: 0,
      monthlyMaintenanceCost: 0,
      recoveryMonths: 12,
      targetGrossMargin: 1,
    },
  ])('rejects invalid cost assumptions: %o', (assumptions) => {
    expect(() => calculateIllustrativeRentalPriceDrafts(assumptions)).toThrow(
      'Rental cost assumptions are invalid',
    );
  });
});
