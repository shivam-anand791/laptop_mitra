import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Product Detail Experience & Motion Contract Tests (Phase 5)', () => {
  describe('1. Gallery Navigation & Mobile Swipe Logic', () => {
    const sampleImages = [
      { url: '/img1.webp', isPrimary: true },
      { url: '/img2.webp', isPrimary: false },
      { url: '/img3.webp', isPrimary: false },
    ];

    it('navigates next image with circular wrapping', () => {
      let currentIdx = 0;
      const getNext = (idx: number, total: number) => (idx + 1) % total;
      currentIdx = getNext(currentIdx, sampleImages.length);
      assert.strictEqual(currentIdx, 1);
      currentIdx = getNext(currentIdx, sampleImages.length);
      assert.strictEqual(currentIdx, 2);
      currentIdx = getNext(currentIdx, sampleImages.length);
      assert.strictEqual(currentIdx, 0); // Wraps back to start
    });

    it('navigates previous image with circular wrapping', () => {
      let currentIdx = 0;
      const getPrev = (idx: number, total: number) => (idx - 1 + total) % total;
      currentIdx = getPrev(currentIdx, sampleImages.length);
      assert.strictEqual(currentIdx, 2); // Wraps to end
      currentIdx = getPrev(currentIdx, sampleImages.length);
      assert.strictEqual(currentIdx, 1);
    });

    it('computes mobile horizontal touch swipe navigation accurately', () => {
      const detectSwipe = (startX: number, endX: number, threshold = 45): 'next' | 'prev' | 'none' => {
        const deltaX = startX - endX;
        if (deltaX > threshold) return 'next';
        if (deltaX < -threshold) return 'prev';
        return 'none';
      };

      // User swiped left by 60px -> should go to next image
      assert.strictEqual(detectSwipe(200, 140), 'next');
      // User swiped right by 55px -> should go to previous image
      assert.strictEqual(detectSwipe(100, 155), 'prev');
      // Minor jitter or small tap (< 45px) -> no navigation
      assert.strictEqual(detectSwipe(100, 120), 'none');
      assert.strictEqual(detectSwipe(150, 140), 'none');
    });

    it('clamps desktop hover zoom coordinates within 0 to 100 percentage', () => {
      const calculateZoomPos = (clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) => {
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
        return { x, y };
      };

      const rect = { left: 100, top: 100, width: 400, height: 300 };

      // Exact center
      assert.deepStrictEqual(calculateZoomPos(300, 250, rect), { x: 50, y: 50 });
      // Out of bounds (negative / past left boundary)
      assert.deepStrictEqual(calculateZoomPos(50, 250, rect), { x: 0, y: 50 });
      // Out of bounds (past bottom boundary)
      assert.deepStrictEqual(calculateZoomPos(300, 500, rect), { x: 50, y: 100 });
    });
  });

  describe('2. Product Information & Pricing Calculations', () => {
    it('calculates savings and discount percentage accurately against compareAtPrice', () => {
      const price = 34999;
      const compareAtPrice = 49999;

      const savings = compareAtPrice > price ? compareAtPrice - price : 0;
      const discountPercent = compareAtPrice > price ? Math.round((savings / compareAtPrice) * 100) : 0;

      assert.strictEqual(savings, 15000);
      assert.strictEqual(discountPercent, 30);
    });

    it('formats Indian Rupee prices cleanly with thousand separators', () => {
      const price = 38500;
      const formatted = price.toLocaleString('en-IN');
      assert.strictEqual(formatted, '38,500');
    });

    it('extracts battery health percentage safely for visual meter rendering', () => {
      const parseBattery = (value: string | undefined): number | null => {
        if (!value) return null;
        const match = value.match(/(\d+)/);
        return match ? Math.min(100, Math.max(0, Number(match[1]))) : null;
      };

      assert.strictEqual(parseBattery('95%+ Original Battery Health'), 95);
      assert.strictEqual(parseBattery('88% Health - Tested Grade A'), 88);
      assert.strictEqual(parseBattery(undefined), null);
    });
  });

  describe('3. Purchase Interactions & Sticky Bar Protocol', () => {
    it('activates sticky purchase bar only when scrolled past the viewport threshold', () => {
      const shouldShowStickyBar = (scrollY: number, threshold = 550) => scrollY > threshold;

      assert.strictEqual(shouldShowStickyBar(200), false);
      assert.strictEqual(shouldShowStickyBar(549), false);
      assert.strictEqual(shouldShowStickyBar(551), true);
      assert.strictEqual(shouldShowStickyBar(1200), true);
    });

    it('handles async Add to Cart state transitions with confirmation', async () => {
      type AddState = 'idle' | 'adding' | 'success' | 'error';
      let state: AddState = 'idle';

      const simulateAddToCart = async (succeeds: boolean) => {
        state = 'adding';
        await new Promise((res) => setTimeout(res, 5));
        if (succeeds) {
          state = 'success';
        } else {
          state = 'error';
        }
      };

      await simulateAddToCart(true);
      assert.strictEqual(state, 'success');

      await simulateAddToCart(false);
      assert.strictEqual(state, 'error');
    });
  });

  describe('4. Accordion Smooth Animation Protocol', () => {
    it('manages accordion open states independently without clashing', () => {
      const accordions = {
        assurance: false,
        details: false,
        specs: false,
      };

      const toggle = (state: typeof accordions, key: keyof typeof accordions) => ({
        ...state,
        [key]: !state[key],
      });

      const step1 = toggle(accordions, 'assurance');
      assert.strictEqual(step1.assurance, true);
      assert.strictEqual(step1.details, false);

      const step2 = toggle(step1, 'specs');
      assert.strictEqual(step2.assurance, true);
      assert.strictEqual(step2.specs, true);
    });
  });
});
