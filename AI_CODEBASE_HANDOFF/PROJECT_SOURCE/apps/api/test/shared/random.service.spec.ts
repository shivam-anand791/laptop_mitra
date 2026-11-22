import { RandomService } from '../../src/shared/random.service';

describe('RandomService - Mitra Affiliate Referral Code Generation', () => {
  let service: RandomService;

  beforeEach(() => {
    service = new RandomService();
  });

  describe('extractUserSlug', () => {
    it('extracts exactly first 4 alphanumeric lowercase characters from standard usernames', () => {
      expect(service.extractUserSlug('shivamanand')).toBe('shiv');
      expect(service.extractUserSlug('rahulsharma')).toBe('rahu');
      expect(service.extractUserSlug('ankitdev')).toBe('anki');
      expect(service.extractUserSlug('ShivamAnand')).toBe('shiv');
    });

    it('strips spaces, hyphens, and symbols when extracting slug', () => {
      expect(service.extractUserSlug('Dr. John Doe')).toBe('drjo');
      expect(service.extractUserSlug('shivam_anand-791')).toBe('shiv');
      expect(service.extractUserSlug('User #42')).toBe('user');
    });

    it('consistently pads short names (< 4 characters) to 4 characters', () => {
      const slugJoy = service.extractUserSlug('Joy');
      expect(slugJoy).toHaveLength(4);
      expect(slugJoy.startsWith('joy')).toBe(true);

      const slugAl = service.extractUserSlug('Al');
      expect(slugAl).toHaveLength(4);
      expect(slugAl.startsWith('al')).toBe(true);
    });

    it('uses fallback ID or default slug if username is completely null or empty', () => {
      const slugNull = service.extractUserSlug(null, 'user-uid-1234');
      expect(slugNull).toHaveLength(4);

      const slugEmpty = service.extractUserSlug('', null);
      expect(slugEmpty).toBe('user');
    });
  });

  describe('generateReferralCode', () => {
    it('always generates codes starting with lowercase "mitra"', () => {
      const code = service.generateReferralCode('shivamanand');
      expect(code.startsWith('mitrashiv')).toBe(true);
    });

    it('matches exact format: "mitra" + 4 alphanumeric chars + 4 numeric digits', () => {
      const codeRegex = /^mitra[a-z0-9]{4}\d{4}$/;

      const samples = [
        service.generateReferralCode('shivamanand'),
        service.generateReferralCode('rahulsharma'),
        service.generateReferralCode('ankitdev'),
        service.generateReferralCode('Joy'),
        service.generateReferralCode(''),
      ];

      for (const code of samples) {
        expect(code).toMatch(codeRegex);
        expect(code).toHaveLength(13); // 'mitra' (5) + slug (4) + suffix (4) = 13
      }
    });

    it('supports leading zeros in 4-digit numeric suffix', () => {
      // Generate multiple sample codes to verify random numeric suffix behavior
      const codes = Array.from({ length: 50 }, () => service.generateReferralCode('shivamanand'));
      for (const code of codes) {
        const numericPart = code.slice(-4);
        expect(/^\d{4}$/.test(numericPart)).toBe(true);
      }
    });

    it('produces distinct randomized codes for the same username', () => {
      const code1 = service.generateReferralCode('shivamanand');
      const code2 = service.generateReferralCode('shivamanand');
      // Extremely low probability of collision with crypto.randomInt(0, 10000)
      expect(code1.slice(0, 9)).toBe('mitrashiv');
      expect(code2.slice(0, 9)).toBe('mitrashiv');
    });
  });
});

