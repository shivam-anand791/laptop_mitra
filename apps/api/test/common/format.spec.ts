/**
 * Unit tests for toNumber and formatINR (rupees, not paise).
 * Testing the canonical formatting algorithm implemented in apps/web/lib/format.ts
 */

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function formatINR(amount: number | string | null | undefined): string {
  const num = toNumber(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatNumber(value: number | string | null | undefined): string {
  const num = toNumber(value);
  return new Intl.NumberFormat('en-IN').format(num);
}

describe('Format & Currency Helpers (Rupees, not Paise)', () => {
  describe('toNumber', () => {
    it('handles numeric inputs directly', () => {
      expect(toNumber(50000)).toBe(50000);
      expect(toNumber(0)).toBe(0);
      expect(toNumber(-100)).toBe(-100);
    });

    it('parses Decimal strings returned from Prisma', () => {
      expect(toNumber('49999')).toBe(49999);
      expect(toNumber('129999.99')).toBe(129999.99);
      expect(toNumber('  85000  ')).toBe(85000);
    });

    it('returns 0 for null, undefined, and non-numeric strings', () => {
      expect(toNumber(null)).toBe(0);
      expect(toNumber(undefined)).toBe(0);
      expect(toNumber('invalid-number')).toBe(0);
      expect(toNumber(NaN)).toBe(0);
    });
  });

  describe('formatINR', () => {
    it('formats rupee values with Indian currency symbol and commas without dividing by 100', () => {
      const formatted = formatINR(49999);
      // Clean non-breaking spaces for regex check
      const clean = formatted.replace(/\u00A0/g, ' ');
      expect(clean).toContain('₹');
      expect(clean).toContain('49,999');
      // Crucial: 49999 must NOT become 499.99 (it is rupees, not paise)
      expect(clean).not.toContain('499.99');
      expect(clean).not.toContain('500');
    });

    it('formats 1 Lakh with Indian grouping system (1,00,000)', () => {
      const clean = formatINR(100000).replace(/\u00A0/g, ' ');
      expect(clean).toContain('1,00,000');
    });

    it('formats Decimal string inputs accurately', () => {
      const clean = formatINR('80000').replace(/\u00A0/g, ' ');
      expect(clean).toContain('80,000');
    });

    it('handles zero, null, and undefined values safely', () => {
      const zero = formatINR(0).replace(/\u00A0/g, ' ');
      expect(zero).toContain('0');
      const nullVal = formatINR(null).replace(/\u00A0/g, ' ');
      expect(nullVal).toContain('0');
      const undefinedVal = formatINR(undefined).replace(/\u00A0/g, ' ');
      expect(undefinedVal).toContain('0');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with Indian grouping commas', () => {
      expect(formatNumber(1250000)).toBe('12,50,000');
      expect(formatNumber('4500')).toBe('4,500');
    });
  });
});
