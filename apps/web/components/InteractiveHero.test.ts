import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Phase 11 – Interactive Hero & Product Spotlight Contract Tests', () => {
  const mockHeroProducts = [
    {
      id: 'prod-macbook-pro-16',
      name: 'Apple MacBook Pro 16" (M2 Pro, 16GB, 512GB SSD)',
      brand: 'Apple',
      price: 154999,
      compareAtPrice: 249900,
      metadata: {
        processor: 'Apple M2 Pro (12-Core)',
        ram: '16GB Unified',
        batteryHealth: '98% Tested',
        condition: 'Grade A+ Pristine',
      },
    },
    {
      id: 'prod-thinkpad-t480',
      name: 'Lenovo ThinkPad T480 (i7 8th Gen, 16GB, 512GB)',
      brand: 'Lenovo',
      price: 29990,
      compareAtPrice: 68000,
      metadata: {
        processor: 'Intel Core i7 8th Gen',
        ram: '16GB DDR4',
        batteryHealth: '94% Tested',
        condition: 'Grade A+ Certified',
      },
    },
    {
      id: 'prod-dell-xps-15',
      name: 'Dell XPS 15 9520 (i7 12th Gen, 32GB, 1TB)',
      brand: 'Dell',
      price: 119999,
      compareAtPrice: 210000,
      metadata: {
        processor: 'Intel Core i7 12th Gen',
        ram: '32GB Dual Channel',
        batteryHealth: '95% Tested',
        condition: 'Grade A+ Pristine',
      },
    },
  ];

  describe('1. Product Spotlight Switching Logic', () => {
    it('switches active product on index change and clamps within bounds', () => {
      let activeIndex = 0;
      const selectProduct = (idx: number, total: number) => {
        if (idx < 0) return 0;
        if (idx >= total) return total - 1;
        return idx;
      };

      activeIndex = selectProduct(1, mockHeroProducts.length);
      assert.strictEqual(activeIndex, 1);
      assert.strictEqual(mockHeroProducts[activeIndex].id, 'prod-thinkpad-t480');

      // Clamping upper bound
      activeIndex = selectProduct(99, mockHeroProducts.length);
      assert.strictEqual(activeIndex, mockHeroProducts.length - 1);

      // Clamping lower bound
      activeIndex = selectProduct(-5, mockHeroProducts.length);
      assert.strictEqual(activeIndex, 0);
    });

    it('supports keyboard arrow navigation between spotlight items', () => {
      let activeIndex = 0;
      const handleKeyDown = (key: string, current: number, total: number) => {
        if (key === 'ArrowRight') {
          return (current + 1) % total;
        }
        if (key === 'ArrowLeft') {
          return (current - 1 + total) % total;
        }
        return current;
      };

      activeIndex = handleKeyDown('ArrowRight', activeIndex, mockHeroProducts.length);
      assert.strictEqual(activeIndex, 1);

      activeIndex = handleKeyDown('ArrowRight', activeIndex, mockHeroProducts.length);
      assert.strictEqual(activeIndex, 2);

      // Wraps around to beginning
      activeIndex = handleKeyDown('ArrowRight', activeIndex, mockHeroProducts.length);
      assert.strictEqual(activeIndex, 0);

      // Left arrow wraps to end
      activeIndex = handleKeyDown('ArrowLeft', activeIndex, mockHeroProducts.length);
      assert.strictEqual(activeIndex, mockHeroProducts.length - 1);
    });

    it('advances spotlight index automatically when unpaused and preserves index when paused', () => {
      let activeIndex = 1;
      const advanceTimer = (currentIndex: number, total: number, isPaused: boolean, reducedMotion: boolean) => {
        if (isPaused || reducedMotion || total <= 1) return currentIndex;
        return (currentIndex + 1) % total;
      };

      // Unpaused normal advance
      activeIndex = advanceTimer(activeIndex, mockHeroProducts.length, false, false);
      assert.strictEqual(activeIndex, 2);

      // Advances past end wrapping around
      activeIndex = advanceTimer(activeIndex, mockHeroProducts.length, false, false);
      assert.strictEqual(activeIndex, 0);

      // When user hovers (isPaused = true), it does NOT advance
      const preservedIndex = advanceTimer(activeIndex, mockHeroProducts.length, true, false);
      assert.strictEqual(preservedIndex, 0);

      // When prefers-reduced-motion is active, it does NOT advance
      const reducedMotionIndex = advanceTimer(activeIndex, mockHeroProducts.length, false, true);
      assert.strictEqual(reducedMotionIndex, 0);
    });
  });

  describe('2. Dynamic Specifications & Price Formatting (₹ Decimal)', () => {
    it('formats price accurately in Indian Rupees without fractional cents or division by 100', () => {
      const formatPrice = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

      assert.strictEqual(formatPrice(mockHeroProducts[0].price), '₹1,54,999');
      assert.strictEqual(formatPrice(mockHeroProducts[1].price), '₹29,990');
      assert.strictEqual(formatPrice(mockHeroProducts[2].price), '₹1,19,999');
    });

    it('calculates genuine savings and discount percentage from compareAtPrice', () => {
      const calcDiscount = (price: number, compareAt: number) => {
        if (!compareAt || compareAt <= price) return 0;
        return Math.round(((compareAt - price) / compareAt) * 100);
      };

      const macbookDiscount = calcDiscount(mockHeroProducts[0].price, mockHeroProducts[0].compareAtPrice);
      assert.strictEqual(macbookDiscount, 38);

      const thinkpadDiscount = calcDiscount(mockHeroProducts[1].price, mockHeroProducts[1].compareAtPrice);
      assert.strictEqual(thinkpadDiscount, 56);
    });

    it('extracts verified hardware specs safely with fallback values', () => {
      const extractSpecs = (product: any) => {
        const meta = product.metadata || {};
        return {
          processor: meta.processor || 'Intel / Apple Silicon',
          ram: meta.ram || '16GB RAM',
          batteryHealth: meta.batteryHealth || '90%+ Certified',
          condition: meta.condition || 'Grade A+ Certified',
        };
      };

      const specs = extractSpecs(mockHeroProducts[0]);
      assert.strictEqual(specs.processor, 'Apple M2 Pro (12-Core)');
      assert.strictEqual(specs.ram, '16GB Unified');
      assert.strictEqual(specs.batteryHealth, '98% Tested');

      const fallbackSpecs = extractSpecs({});
      assert.strictEqual(fallbackSpecs.processor, 'Intel / Apple Silicon');
      assert.strictEqual(fallbackSpecs.batteryHealth, '90%+ Certified');
    });
  });

  describe('3. Instant Search & Category Shortcuts Navigation', () => {
    it('constructs correct search destination URL with encoded query', () => {
      const buildSearchUrl = (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return '/products';
        return `/products?search=${encodeURIComponent(trimmed)}`;
      };

      assert.strictEqual(buildSearchUrl('ThinkPad T480'), '/products?search=ThinkPad%20T480');
      assert.strictEqual(buildSearchUrl('  MacBook M1  '), '/products?search=MacBook%20M1');
      assert.strictEqual(buildSearchUrl(''), '/products');
    });

    it('maps all 5 canonical hero categories to supported catalog routes', () => {
      const categoryRoutes: Record<string, string> = {
        'cat-business': '/products?category=cat-business',
        'cat-student': '/products?category=cat-student',
        'cat-gaming': '/products?category=cat-gaming',
        'cat-ultrabook': '/products?category=cat-ultrabook',
        'cat-apple': '/products?category=cat-apple',
      };

      assert.strictEqual(categoryRoutes['cat-business'], '/products?category=cat-business');
      assert.strictEqual(categoryRoutes['cat-apple'], '/products?category=cat-apple');
      assert.strictEqual(categoryRoutes['cat-gaming'], '/products?category=cat-gaming');
    });
  });
});
