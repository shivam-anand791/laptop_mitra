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

// Fallback Indian postal prefix directory for resilience if external API is slow or offline
const INDIAN_PINCODE_PREFIX_MAP: Record<string, { state: string; sampleCity: string }> = {
  '11': { state: 'Delhi', sampleCity: 'Delhi' },
  '12': { state: 'Haryana', sampleCity: 'Gurugram' },
  '13': { state: 'Haryana', sampleCity: 'Ambala' },
  '14': { state: 'Punjab', sampleCity: 'Ludhiana' },
  '15': { state: 'Punjab', sampleCity: 'Bathinda' },
  '16': { state: 'Chandigarh', sampleCity: 'Chandigarh' },
  '17': { state: 'Himachal Pradesh', sampleCity: 'Shimla' },
  '18': { state: 'Jammu & Kashmir', sampleCity: 'Jammu' },
  '19': { state: 'Jammu & Kashmir', sampleCity: 'Srinagar' },
  '20': { state: 'Uttar Pradesh', sampleCity: 'Noida' },
  '21': { state: 'Uttar Pradesh', sampleCity: 'Prayagraj' },
  '22': { state: 'Uttar Pradesh', sampleCity: 'Lucknow' },
  '23': { state: 'Uttar Pradesh', sampleCity: 'Varanasi' },
  '24': { state: 'Uttarakhand', sampleCity: 'Dehradun' },
  '25': { state: 'Uttar Pradesh', sampleCity: 'Meerut' },
  '26': { state: 'Uttarakhand', sampleCity: 'Haldwani' },
  '27': { state: 'Uttar Pradesh', sampleCity: 'Gorakhpur' },
  '28': { state: 'Uttar Pradesh', sampleCity: 'Agra' },
  '30': { state: 'Rajasthan', sampleCity: 'Jaipur' },
  '31': { state: 'Rajasthan', sampleCity: 'Udaipur' },
  '32': { state: 'Rajasthan', sampleCity: 'Kota' },
  '33': { state: 'Rajasthan', sampleCity: 'Bikaner' },
  '34': { state: 'Rajasthan', sampleCity: 'Jodhpur' },
  '36': { state: 'Gujarat', sampleCity: 'Rajkot' },
  '37': { state: 'Gujarat', sampleCity: 'Bhuj' },
  '38': { state: 'Gujarat', sampleCity: 'Ahmedabad' },
  '39': { state: 'Gujarat', sampleCity: 'Surat' },
  '40': { state: 'Maharashtra', sampleCity: 'Mumbai' },
  '41': { state: 'Maharashtra', sampleCity: 'Pune' },
  '42': { state: 'Maharashtra', sampleCity: 'Nashik' },
  '43': { state: 'Maharashtra', sampleCity: 'Aurangabad' },
  '44': { state: 'Maharashtra', sampleCity: 'Nagpur' },
  '45': { state: 'Madhya Pradesh', sampleCity: 'Indore' },
  '46': { state: 'Madhya Pradesh', sampleCity: 'Bhopal' },
  '47': { state: 'Madhya Pradesh', sampleCity: 'Gwalior' },
  '48': { state: 'Madhya Pradesh', sampleCity: 'Jabalpur' },
  '49': { state: 'Chhattisgarh', sampleCity: 'Raipur' },
  '50': { state: 'Telangana', sampleCity: 'Hyderabad' },
  '51': { state: 'Andhra Pradesh', sampleCity: 'Tirupati' },
  '52': { state: 'Andhra Pradesh', sampleCity: 'Vijayawada' },
  '53': { state: 'Andhra Pradesh', sampleCity: 'Visakhapatnam' },
  '56': { state: 'Karnataka', sampleCity: 'Bengaluru' },
  '57': { state: 'Karnataka', sampleCity: 'Mangaluru' },
  '58': { state: 'Karnataka', sampleCity: 'Hubballi' },
  '59': { state: 'Karnataka', sampleCity: 'Belagavi' },
  '60': { state: 'Tamil Nadu', sampleCity: 'Chennai' },
  '61': { state: 'Tamil Nadu', sampleCity: 'Thanjavur' },
  '62': { state: 'Tamil Nadu', sampleCity: 'Madurai' },
  '63': { state: 'Tamil Nadu', sampleCity: 'Salem' },
  '64': { state: 'Tamil Nadu', sampleCity: 'Coimbatore' },
  '67': { state: 'Kerala', sampleCity: 'Kozhikode' },
  '68': { state: 'Kerala', sampleCity: 'Kochi' },
  '69': { state: 'Kerala', sampleCity: 'Thiruvananthapuram' },
  '70': { state: 'West Bengal', sampleCity: 'Kolkata' },
  '71': { state: 'West Bengal', sampleCity: 'Howrah' },
  '72': { state: 'West Bengal', sampleCity: 'Siliguri' },
  '73': { state: 'West Bengal', sampleCity: 'Darjeeling' },
  '74': { state: 'West Bengal', sampleCity: 'North 24 Parganas' },
  '75': { state: 'Odisha', sampleCity: 'Bhubaneswar' },
  '76': { state: 'Odisha', sampleCity: 'Cuttack' },
  '77': { state: 'Odisha', sampleCity: 'Rourkela' },
  '78': { state: 'Assam', sampleCity: 'Guwahati' },
  '79': { state: 'North East', sampleCity: 'Shillong' },
  '80': { state: 'Bihar', sampleCity: 'Patna' },
  '81': { state: 'Bihar', sampleCity: 'Bhagalpur' },
  '82': { state: 'Bihar', sampleCity: 'Gaya' },
  '83': { state: 'Jharkhand', sampleCity: 'Ranchi' },
  '84': { state: 'Bihar', sampleCity: 'Muzaffarpur' },
  '85': { state: 'Bihar', sampleCity: 'Purnea' },
};

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

    // Pincodes starting with 9 are Army Postal Service (unserviceable for standard commercial delivery)
    if (pin.startsWith('9')) {
      return {
        valid: true,
        pincode: pin,
        serviceable: false,
        isDelhiNcr: false,
        codAvailable: false,
        message: 'Sorry, we currently do not deliver to Army Postal Service addresses.',
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

      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'LaptopMitra-PincodeVerifier/1.0' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const payload: any = await response.json();
        if (Array.isArray(payload) && payload.length > 0) {
          const first = payload[0];
          if (first.Status === 'Success' && Array.isArray(first.PostOffice) && first.PostOffice.length > 0) {
            const po = first.PostOffice[0];
            const city = po.District || po.Name || 'Local Delivery';
            const district = po.District || city;
            const state = po.State || 'India';
            const postOffice = po.Name;

            const isDelhiNcr = this.isPincodeOrDistrictDelhiNcr(pin, district, state);

            const result: PincodeVerificationResult = {
              valid: true,
              pincode: pin,
              city,
              district,
              state,
              postOffice,
              serviceable: true,
              isDelhiNcr,
              codAvailable: isDelhiNcr,
              message: `Delivery available to ${city}, ${state}.`,
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
      this.logger.warn(`External postal API check failed for pincode ${pin}: ${err?.message || err}. Falling back to internal postal directory.`);
    }

    // 4. Fallback lookup via internal prefix mapping
    const prefix = pin.substring(0, 2);
    const prefixInfo = INDIAN_PINCODE_PREFIX_MAP[prefix];

    if (prefixInfo) {
      const isDelhiNcr = this.isPincodeOrDistrictDelhiNcr(pin, prefixInfo.sampleCity, prefixInfo.state);
      const fallbackResult: PincodeVerificationResult = {
        valid: true,
        pincode: pin,
        city: prefixInfo.sampleCity,
        district: prefixInfo.sampleCity,
        state: prefixInfo.state,
        serviceable: true,
        isDelhiNcr,
        codAvailable: isDelhiNcr,
        message: `Delivery available to ${prefixInfo.sampleCity}, ${prefixInfo.state}.`,
      };
      return fallbackResult;
    }

    return {
      valid: false,
      pincode: pin,
      serviceable: false,
      isDelhiNcr: false,
      codAvailable: false,
      message: 'Please enter a valid Indian pincode.',
    };
  }

  /**
   * Evaluates whether a pincode, district, or state belongs to the Delhi NCR delivery coverage.
   */
  isPincodeOrDistrictDelhiNcr(pincode: string, district?: string, state?: string): boolean {
    const pin = pincode.trim();

    // 1. Delhi NCT range: 110001 - 110096
    if (pin.startsWith('110')) {
      const num = parseInt(pin, 10);
      if (num >= 110001 && num <= 110096) return true;
    }

    // 2. Gurugram (Gurgaon), Haryana: 122xxx
    if (pin.startsWith('122')) {
      const num = parseInt(pin, 10);
      if (num >= 122001 && num <= 122508) return true;
    }

    // 3. Faridabad, Haryana: 121xxx
    if (pin.startsWith('121')) {
      const num = parseInt(pin, 10);
      if (num >= 121001 && num <= 121107) return true;
    }

    // 4. Gautam Buddha Nagar (Noida & Greater Noida), UP: 201301 - 201318
    if (pin.startsWith('2013')) {
      const num = parseInt(pin, 10);
      if (num >= 201301 && num <= 201318) return true;
    }

    // 5. Ghaziabad, UP: 201001 - 201206
    if (pin.startsWith('2010') || pin.startsWith('2011') || pin.startsWith('2012')) {
      const num = parseInt(pin, 10);
      if (num >= 201001 && num <= 201206) return true;
    }

    // 6. Sonipat, Haryana: 131xxx
    if (pin.startsWith('131')) {
      const num = parseInt(pin, 10);
      if (num >= 131001 && num <= 131409) return true;
    }

    // 7. Bahadurgarh (Jhajjar), Haryana: 124507
    if (pin === '124507') {
      return true;
    }

    // 8. District name matching check
    if (district) {
      const cleanDist = district.trim().toLowerCase();
      if (DELHI_NCR_DISTRICTS.has(cleanDist)) return true;
    }

    // 9. State level Delhi check
    if (state && state.trim().toLowerCase() === 'delhi') {
      return true;
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

