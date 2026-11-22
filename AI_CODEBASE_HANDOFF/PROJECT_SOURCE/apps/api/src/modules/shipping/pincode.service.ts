import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface PincodeVerificationResult {
  valid: boolean;
  pincode: string;
  city?: string;
  district?: string;
  state?: string;
  postOffice?: string;
  serviceable: boolean;
  isDelhiNcr: boolean;
  codAvailable: boolean;
  message: string;
}

interface CacheEntry {
  data: PincodeVerificationResult;
  timestamp: number;
}

// Delhi NCR specific districts (case-insensitive normalized matching)
const DELHI_NCR_DISTRICTS = new Set([
  'central delhi',
  'east delhi',
  'new delhi',
  'north delhi',
  'north east delhi',
  'north west delhi',
  'south delhi',
  'south east delhi',
  'south west delhi',
  'west delhi',
  'delhi',
  'gurgaon',
  'gurugram',
  'faridabad',
  'gautam buddha nagar',
  'gautam buddh nagar',
  'noida',
  'ghaziabad',
  'sonipat',
  'sonepat',
]);

@Injectable()
export class PincodeService {
  private readonly logger = new Logger(PincodeService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly API_TIMEOUT_MS = 3500;

  /**
   * Verify an Indian postal pincode with format check, India Post lookup,
   * Laptop Mitra delivery serviceability, and Delhi NCR COD eligibility.
   */
  async verifyPincode(rawPincode: string | undefined | null): Promise<PincodeVerificationResult> {
    const pin = (rawPincode || '').trim();

    // 1. Format check: exactly 6 digits, first digit 1-8
    if (!/^\d{6}$/.test(pin)) {
      return {
        valid: false,
        pincode: pin,
        serviceable: false,
        isDelhiNcr: false,
        codAvailable: false,
        message: 'Please enter a valid 6-digit Indian postal PIN code.',
      };
    }

    // Pincodes starting with 0 do not exist in India
    if (pin.startsWith('0')) {
      return {
        valid: false,
        pincode: pin,
        serviceable: false,
        isDelhiNcr: false,
        codAvailable: false,
        message: 'Please enter a valid Indian pincode.',
      };
    }

    // 2. Check in-memory cache
    const cached = this.cache.get(pin);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    // 3. Query India Post postal verification API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT_MS);

      let response: Response;
      let payload: any;
      try {
        response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'LaptopMitra-PincodeVerifier/1.0' },
        });
        if (response.ok) payload = await response.json();
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.ok) {
        if (Array.isArray(payload) && payload.length > 0) {
          const first = payload[0];
          if (first.Status === 'Success' && Array.isArray(first.PostOffice) && first.PostOffice.length > 0) {
            const po = first.PostOffice[0];
            const city = po.Block && po.Block !== 'NA' ? po.Block : po.District || po.Name || 'Local Delivery';
            const district = po.District || city;
            const state = po.State || 'India';
            const postOffice = po.Name;
            const serviceable = !pin.startsWith('9');

            const isDelhiNcr = this.isPincodeOrDistrictDelhiNcr(pin, district, state);

            const result: PincodeVerificationResult = {
              valid: true,
              pincode: pin,
              city,
              district,
              state,
              postOffice,
              serviceable,
              isDelhiNcr,
              codAvailable: serviceable && isDelhiNcr,
              message: serviceable
                ? `Delivery available to ${city}, ${state}.`
                : 'Sorry, we currently do not deliver to Army Postal Service addresses.',
            };

            this.cache.set(pin, { data: result, timestamp: Date.now() });
            return result;
          } else if (first.Status === 'Error' || first.Message === 'No records found') {
            const invalidResult: PincodeVerificationResult = {
              valid: false,
              pincode: pin,
              serviceable: false,
              isDelhiNcr: false,
              codAvailable: false,
              message: 'Please enter a valid Indian pincode.',
            };
            this.cache.set(pin, { data: invalidResult, timestamp: Date.now() });
            return invalidResult;
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`External postal API check failed for pincode ${pin}: ${err?.message || err}.`);
    }

    return {
      valid: false,
      pincode: pin,
      serviceable: false,
      isDelhiNcr: false,
      codAvailable: false,
      message: 'Pincode verification is temporarily unavailable. Please try again.',
    };
  }

  /**
   * Evaluates whether a pincode, district, or state belongs to the Delhi NCR delivery coverage.
   */
  isPincodeOrDistrictDelhiNcr(_pincode: string, district?: string, _state?: string): boolean {
    if (_pincode.trim() === '124507') return true;

    // Use verified postal district; numeric prefix ranges include unrelated locations.
    if (district) {
      const cleanDist = district.trim().toLowerCase();
      if (DELHI_NCR_DISTRICTS.has(cleanDist)) return true;
    }

    return false;
  }

  /**
   * Server-side guard to assert valid pincode and enforce COD Delhi NCR restriction during order checkout.
   */
  async validateOrderShipping(shippingAddress: any, paymentMethod: string): Promise<PincodeVerificationResult> {
    const rawPin = shippingAddress?.pincode;
    if (!rawPin || typeof rawPin !== 'string') {
      throw new BadRequestException('A valid 6-digit delivery PIN code is required');
    }

    const verification = await this.verifyPincode(rawPin);
    if (!verification.valid) {
      throw new BadRequestException(verification.message || 'Please enter a valid Indian pincode');
    }

    if (!verification.serviceable) {
      throw new BadRequestException('Sorry, we currently do not deliver to this pincode');
    }

    if (paymentMethod === 'cod' && !verification.isDelhiNcr) {
      throw new BadRequestException(
        'Cash on Delivery is currently available only in Delhi NCR. Please select an online payment method to complete your order.',
      );
    }

    return verification;
  }
}

