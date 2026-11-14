import { formatIndianRupees } from '../utils/account-helpers';

describe('Mitra Affiliate Logic & Validation', () => {
  const MINIMUM_WITHDRAWAL = 500;

  describe('Withdrawal Validation', () => {
    function validateWithdrawal(amountStr: string, availableBalance: number): { valid: boolean; error?: string } {
      const amountNum = parseFloat(amountStr);
      if (isNaN(amountNum) || amountNum < MINIMUM_WITHDRAWAL) {
        return { valid: false, error: `Minimum withdrawal amount is ₹${MINIMUM_WITHDRAWAL}.` };
      }
      if (amountNum > availableBalance) {
        return {
          valid: false,
          error: `You cannot withdraw more than your available balance (${formatIndianRupees(availableBalance)}).`,
        };
      }
      return { valid: true };
    }

    it('rejects withdrawal below minimum threshold of ₹500', () => {
      const result = validateWithdrawal('300', 5000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum withdrawal amount is ₹500');
    });

    it('rejects non-numeric withdrawal amounts', () => {
      const result = validateWithdrawal('abc', 5000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum withdrawal amount is ₹500');
    });

    it('rejects withdrawal exceeding available balance', () => {
      const result = validateWithdrawal('1500', 1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot withdraw more than your available balance');
    });

    it('accepts valid withdrawal within balance limits', () => {
      const result = validateWithdrawal('1000', 2500);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts withdrawal for the exact available balance if >= ₹500', () => {
      const result = validateWithdrawal('500', 500);
      expect(result.valid).toBe(true);
    });
  });

  describe('Payout Destination Validation', () => {
    function validateBankDetails(data: {
      bankName: string;
      accountHolderName: string;
      accountNumber: string;
      ifscCode: string;
    }): { valid: boolean; error?: string } {
      if (!data.bankName.trim()) {
        return { valid: false, error: 'Bank name is required.' };
      }
      if (!data.accountHolderName.trim()) {
        return { valid: false, error: 'Account holder name is required.' };
      }
      if (!data.accountNumber.trim() || data.accountNumber.trim().length < 8) {
        return { valid: false, error: 'Please enter a valid bank account number.' };
      }
      if (!data.ifscCode.trim() || data.ifscCode.trim().length !== 11) {
        return { valid: false, error: 'IFSC code must be exactly 11 characters (e.g. SBIN0001234).' };
      }
      return { valid: true };
    }

    function validateUpiDetails(upiId: string): { valid: boolean; error?: string } {
      const trimmed = upiId.trim();
      if (!trimmed || !trimmed.includes('@')) {
        return { valid: false, error: 'Please enter a valid UPI ID (e.g. name@okbank).' };
      }
      return { valid: true };
    }

    it('rejects bank payout with empty bank name', () => {
      const result = validateBankDetails({
        bankName: '',
        accountHolderName: 'Rahul Sharma',
        accountNumber: '1234567890',
        ifscCode: 'SBIN0001234',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Bank name is required.');
    });

    it('rejects bank account numbers shorter than 8 digits', () => {
      const result = validateBankDetails({
        bankName: 'State Bank of India',
        accountHolderName: 'Rahul Sharma',
        accountNumber: '12345',
        ifscCode: 'SBIN0001234',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please enter a valid bank account number.');
    });

    it('rejects IFSC codes that are not 11 characters', () => {
      const result = validateBankDetails({
        bankName: 'HDFC Bank',
        accountHolderName: 'Rahul Sharma',
        accountNumber: '50100234567890',
        ifscCode: 'HDFC001',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('IFSC code must be exactly 11 characters');
    });

    it('accepts well-formed bank account details', () => {
      const result = validateBankDetails({
        bankName: 'ICICI Bank',
        accountHolderName: 'Rahul Sharma',
        accountNumber: '001101234567',
        ifscCode: 'ICIC0000011',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid UPI IDs without @ symbol', () => {
      const result = validateUpiDetails('rahulsharma.okaxis');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('valid UPI ID');
    });

    it('accepts valid UPI handle', () => {
      const result = validateUpiDetails('rahul@oksbi');
      expect(result.valid).toBe(true);
    });
  });

  describe('Tier and Status Styling', () => {
    const TIER_CONFIG = {
      BASIC: { label: 'Basic Mitra', color: '#64748b' },
      GOLD: { label: 'Gold Mitra', color: '#d97706' },
      PLATINUM: { label: 'Platinum Mitra', color: '#7c3aed' },
    };

    it('maps affiliate tiers correctly to labels and themes', () => {
      expect(TIER_CONFIG.BASIC.label).toBe('Basic Mitra');
      expect(TIER_CONFIG.GOLD.label).toBe('Gold Mitra');
      expect(TIER_CONFIG.PLATINUM.label).toBe('Platinum Mitra');
    });
  });
});

