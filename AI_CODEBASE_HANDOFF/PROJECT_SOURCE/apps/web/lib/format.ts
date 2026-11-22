/**
 * Safe numeric conversion helper for Decimal fields serialized as string or number.
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format currency in Indian Rupees (INR).
 * Hard rule: Order amounts (subtotal, discountAmount, finalAmount) are in RUPEES, NOT paise.
 * Never divide by 100.
 */
export function formatINR(amount: number | string | null | undefined): string {
  const num = toNumber(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats a date string or Date object in Indian English format (e.g., 23 Oct 2026).
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);
    return new Intl.DateTimeFormat('en-IN', options).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Formats numbers in Indian numbering system (e.g. 1,00,000).
 */
export function formatNumber(value: number | string | null | undefined): string {
  const num = toNumber(value);
  return new Intl.NumberFormat('en-IN').format(num);
}

// Aliases for clean backward compatibility
export const formatPrice = formatINR;
export const formatCurrency = formatINR;
