import { PincodeService } from '../../src/modules/shipping/pincode.service';
import { BadRequestException } from '@nestjs/common';

describe('PincodeService & Delhi NCR COD Enforcement', () => {
  let service: PincodeService;

  beforeEach(() => {
    service = new PincodeService();
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const pin = String(input).split('/').pop() || '';
      const location = POSTAL_LOCATIONS[pin];
      return {
        ok: true,
        json: async () => [location
          ? { Status: 'Success', PostOffice: [{ Name: 'Test Post Office', District: location[0], State: location[1] }] }
          : { Status: 'Error', Message: 'No records found' }],
      } as Response;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const POSTAL_LOCATIONS: Record<string, [string, string]> = {
    '110001': ['Central Delhi', 'Delhi'], '110019': ['South Delhi', 'Delhi'], '110092': ['East Delhi', 'Delhi'],
    '122001': ['Gurgaon', 'Haryana'], '122018': ['Gurgaon', 'Haryana'],
    '121001': ['Faridabad', 'Haryana'], '201301': ['Gautam Buddha Nagar', 'Uttar Pradesh'],
    '201310': ['Gautam Buddha Nagar', 'Uttar Pradesh'], '201001': ['Ghaziabad', 'Uttar Pradesh'],
    '131001': ['Sonipat', 'Haryana'], '124507': ['Jhajjar', 'Haryana'],
    '560001': ['Bangalore', 'Karnataka'], '560038': ['Bangalore', 'Karnataka'],
    '400001': ['Mumbai', 'Maharashtra'], '400020': ['Mumbai', 'Maharashtra'],
    '700001': ['Kolkata', 'West Bengal'], '600001': ['Chennai', 'Tamil Nadu'],
    '500001': ['Hyderabad', 'Telangana'], '302001': ['Jaipur', 'Rajasthan'],
    '226001': ['Lucknow', 'Uttar Pradesh'], '160017': ['Chandigarh', 'Chandigarh'],
  };

  describe('Pincode Format & Validation', () => {
    it('rejects pincodes that are not exactly 6 numeric digits', async () => {
      const invalidCases = ['', '12345', '1234567', '11001A', 'ABCDEF', '  ', '11-001'];
      for (const pin of invalidCases) {
        const res = await service.verifyPincode(pin);
        expect(res.valid).toBe(false);
        expect(res.serviceable).toBe(false);
      }
    });

    it('rejects pincodes starting with 0', async () => {
      const res = await service.verifyPincode('012345');
      expect(res.valid).toBe(false);
      expect(res.serviceable).toBe(false);
      expect(res.message).toBe('Please enter a valid Indian pincode.');
    });

    it('rejects 900001 when India Post reports no postal records', async () => {
      const res = await service.verifyPincode('900001');
      expect(res.valid).toBe(false);
      expect(res.serviceable).toBe(false);
      expect(res.codAvailable).toBe(false);
    });

    it('marks a verified Army Postal Service pincode as unserviceable for commercial delivery', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ Status: 'Success', PostOffice: [{ Name: 'Army Post Office', District: 'Army Postal Service', State: 'India' }] }],
      });
      const res = await service.verifyPincode('900004');
      expect(res.valid).toBe(true);
      expect(res.serviceable).toBe(false);
      expect(res.codAvailable).toBe(false);
      expect(res.message).toContain('Army Postal Service');
    });

    it('fails closed when postal verification is unavailable instead of trusting a prefix', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network timeout'));
      const res = await service.verifyPincode('119999');
      expect(res.valid).toBe(false);
      expect(res.serviceable).toBe(false);
      expect(res.message).toContain('temporarily unavailable');
    });
  });

  describe('Delhi NCR COD Eligibility Coverage', () => {
    it('does not treat an entire numeric prefix as NCR when postal district is outside the configured delivery area', () => {
      expect(service.isPincodeOrDistrictDelhiNcr('122900', 'Ambala', 'Haryana')).toBe(false);
      expect(service.isPincodeOrDistrictDelhiNcr('122001', 'Gurgaon', 'Haryana')).toBe(true);
    });

    const ncrTestCases = [
      { pin: '110001', area: 'Connaught Place, Central Delhi' },
      { pin: '110019', area: 'Nehru Place, South Delhi' },
      { pin: '110092', area: 'East Delhi' },
      { pin: '122001', area: 'Gurugram, Haryana' },
      { pin: '122018', area: 'Gurugram Sector 37, Haryana' },
      { pin: '121001', area: 'Faridabad, Haryana' },
      { pin: '201301', area: 'Noida Sector 1, UP' },
      { pin: '201310', area: 'Greater Noida, UP' },
      { pin: '201001', area: 'Ghaziabad, UP' },
      { pin: '131001', area: 'Sonipat, Haryana' },
      { pin: '124507', area: 'Bahadurgarh, Jhajjar, Haryana' },
    ];

    it.each(ncrTestCases)('identifies $pin ($area) as Delhi NCR with COD available', async ({ pin }) => {
      const res = await service.verifyPincode(pin);
      expect(res.valid).toBe(true);
      expect(res.serviceable).toBe(true);
      expect(res.isDelhiNcr).toBe(true);
      expect(res.codAvailable).toBe(true);
      expect(res.message).toContain('Delivery available');
    });

    const nonNcrTestCases = [
      { pin: '560001', area: 'Bengaluru, Karnataka' },
      { pin: '400001', area: 'Mumbai, Maharashtra' },
      { pin: '700001', area: 'Kolkata, West Bengal' },
      { pin: '600001', area: 'Chennai, Tamil Nadu' },
      { pin: '500001', area: 'Hyderabad, Telangana' },
      { pin: '302001', area: 'Jaipur, Rajasthan' },
      { pin: '226001', area: 'Lucknow, UP' },
      { pin: '160017', area: 'Chandigarh' },
    ];

    it.each(nonNcrTestCases)('identifies $pin ($area) as serviceable outside Delhi NCR with COD disabled', async ({ pin }) => {
      const res = await service.verifyPincode(pin);
      expect(res.valid).toBe(true);
      expect(res.serviceable).toBe(true);
      expect(res.isDelhiNcr).toBe(false);
      expect(res.codAvailable).toBe(false);
      expect(res.message).toContain('Delivery available');
    });
  });

  describe('validateOrderShipping (Order Creation Guard)', () => {
    it('permits COD orders when delivery address is in Delhi NCR', async () => {
      const shippingAddress = {
        fullName: 'Rahul Sharma',
        phone: '+919876543210',
        address: 'B-12, Green Park',
        pincode: '110019',
      };

      const res = await service.validateOrderShipping(shippingAddress, 'cod');
      expect(res.valid).toBe(true);
      expect(res.isDelhiNcr).toBe(true);
    });

    it('permits prepaid Razorpay orders for non-NCR serviceable locations', async () => {
      const shippingAddress = {
        fullName: 'Ananya Rao',
        phone: '+919876543210',
        address: '100 Feet Road, Indiranagar',
        pincode: '560038',
      };

      const res = await service.validateOrderShipping(shippingAddress, 'razorpay');
      expect(res.valid).toBe(true);
      expect(res.serviceable).toBe(true);
      expect(res.isDelhiNcr).toBe(false);
    });

    it('strictly rejects COD orders for delivery addresses outside Delhi NCR', async () => {
      const shippingAddress = {
        fullName: 'Priya Patel',
        phone: '+919876543210',
        address: 'Marine Drive',
        pincode: '400020', // Mumbai
      };

      await expect(service.validateOrderShipping(shippingAddress, 'cod')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateOrderShipping(shippingAddress, 'cod')).rejects.toThrow(
        'Cash on Delivery is currently available only in Delhi NCR. Please select an online payment method to complete your order.',
      );
    });

    it('rejects order submission when pincode is missing or unserviceable', async () => {
      await expect(service.validateOrderShipping({}, 'razorpay')).rejects.toThrow(
        'A valid 6-digit delivery PIN code is required',
      );
      await expect(service.validateOrderShipping({ pincode: '000000' }, 'razorpay')).rejects.toThrow(
        'Please enter a valid Indian pincode',
      );
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ Status: 'Success', PostOffice: [{ Name: 'Army Post Office', District: 'Army Postal Service', State: 'India' }] }],
      });
      await expect(service.validateOrderShipping({ pincode: '900004' }, 'razorpay')).rejects.toThrow(
        'Sorry, we currently do not deliver to this pincode',
      );
    });
  });
});

