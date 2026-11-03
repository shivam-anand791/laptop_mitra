export const RENTAL_PRICE_TENURES = [1, 3, 6, 12, 24] as const;
export const ILLUSTRATIVE_RENTAL_PRICE_LABEL = 'Illustrative Estimate - Pending Business Approval';

export interface RentalCostAssumptions {
  landedCost: number;
  setupDeliveryCost: number;
  monthlyMaintenanceCost: number;
  recoveryMonths: number;
  targetGrossMargin: number;
}

export function calculateIllustrativeRentalPriceDrafts(assumptions: RentalCostAssumptions) {
  const {
    landedCost,
    setupDeliveryCost,
    monthlyMaintenanceCost,
    recoveryMonths,
    targetGrossMargin,
  } = assumptions;
  if (
    !Number.isFinite(landedCost) || landedCost <= 0 ||
    !Number.isFinite(setupDeliveryCost) || setupDeliveryCost < 0 ||
    !Number.isFinite(monthlyMaintenanceCost) || monthlyMaintenanceCost < 0 ||
    !Number.isInteger(recoveryMonths) || recoveryMonths <= 0 ||
    !Number.isFinite(targetGrossMargin) || targetGrossMargin < 0 || targetGrossMargin >= 1
  ) {
    throw new Error('Rental cost assumptions are invalid');
  }

  const monthlyPrice = Math.round(
    ((landedCost / recoveryMonths + monthlyMaintenanceCost) / (1 - targetGrossMargin)) / 100,
  ) * 100;

  return RENTAL_PRICE_TENURES.map((tenureMonths) => ({
    tenureMonths,
    monthlyPrice,
    securityDeposit: 0,
    deliveryCharge: setupDeliveryCost,
    sourceType: 'ILLUSTRATIVE' as const,
    estimateLabel: ILLUSTRATIVE_RENTAL_PRICE_LABEL,
  }));
}
