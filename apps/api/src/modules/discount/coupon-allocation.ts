/**
 * Shared Proportional Coupon Discount Allocation Engine
 *
 * Guarantees that discount amount in paise is distributed across eligible items
 * proportionally to their base price, with zero remainder drift (the sum of item
 * discounts always equals total discount exactly).
 */

export interface AllocatableItem {
  id: string;
  eligiblePaise: number;
}

export interface AllocatedLine {
  id: string;
  allocatedDiscountPaise: number;
  netPaise: number;
}

export function allocateDiscountProportionally(
  items: AllocatableItem[],
  totalDiscountPaise: number,
): AllocatedLine[] {
  const totalEligible = items.reduce((sum, item) => sum + Math.max(0, item.eligiblePaise), 0);

  if (totalEligible <= 0 || totalDiscountPaise <= 0) {
    return items.map((it) => ({
      id: it.id,
      allocatedDiscountPaise: 0,
      netPaise: Math.max(0, it.eligiblePaise),
    }));
  }

  const cappedDiscount = Math.min(totalDiscountPaise, totalEligible);
  let assignedPaise = 0;
  const lines: AllocatedLine[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemBase = Math.max(0, item.eligiblePaise);

    if (i === items.length - 1) {
      // Last item absorbs any rounding remainder
      const remainder = cappedDiscount - assignedPaise;
      lines.push({
        id: item.id,
        allocatedDiscountPaise: remainder,
        netPaise: itemBase - remainder,
      });
    } else {
      const share = Math.floor((itemBase * cappedDiscount) / totalEligible);
      assignedPaise += share;
      lines.push({
        id: item.id,
        allocatedDiscountPaise: share,
        netPaise: itemBase - share,
      });
    }
  }

  return lines;
}

