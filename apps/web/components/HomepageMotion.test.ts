import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readHomePageSource = () =>
  readFileSync(resolve(process.cwd(), 'app/page.tsx'), 'utf8');

const readRevealSource = () =>
  readFileSync(resolve(process.cwd(), 'components/RevealOnScroll.tsx'), 'utf8');

describe('Homepage Motion & Visual Enhancement Contract Tests (Phase 3)', () => {
  it('implements line-by-line staggered reveal for the hero headline', () => {
    const src = readHomePageSource();
    assert.ok(
      src.includes('Certified Laptops'),
      'Hero must contain "Certified Laptops"'
    );
    assert.ok(
      src.includes('for Your'),
      'Hero must contain "for Your"'
    );
    assert.ok(
      src.includes('Business.'),
      'Hero must contain "Business."'
    );
    // Timing check for line-by-line reveal
    assert.ok(
      src.includes("animationDuration: '750ms'"),
      'Hero entrance duration must be 750ms'
    );
    assert.ok(
      src.includes("animationDelay: '120ms'"),
      'Line 1 animation delay must be 120ms'
    );
    assert.ok(
      src.includes("animationDelay: '240ms'"),
      'Line 2 animation delay must be 240ms'
    );
  });

  it('implements staggered supporting text and tactile CTA buttons', () => {
    const src = readHomePageSource();
    assert.ok(
      src.includes("animationDelay: '380ms'"),
      'Subcopy paragraph must enter with 380ms delay'
    );
    assert.ok(
      src.includes("animationDelay: '480ms'"),
      'CTA buttons must enter with 480ms delay'
    );
    assert.ok(
      src.includes('hover-scale-subtle'),
      'CTA buttons must have subtle hover scale feedback'
    );
  });

  it('integrates restrained parallax with reduced-motion awareness', () => {
    const src = readHomePageSource();
    assert.ok(
      src.includes('useReducedMotion'),
      'Must import and use useReducedMotion'
    );
    assert.ok(
      src.includes('prefersReducedMotion'),
      'Must check prefersReducedMotion for parallax'
    );
    assert.ok(
      src.includes('translate3d(0,'),
      'Must use GPU-accelerated translate3d for parallax'
    );
  });

  it('preserves all 8 canonical homepage sections in exact sequence without reordering', () => {
    const src = readHomePageSource();

    const heroIndex = src.indexOf('1. HERO SECTION');
    const categoryIndex = src.indexOf('2. SHOP BY CATEGORY');
    const dealIndex = src.indexOf('3. DEAL OF THE DAY');
    const statsIndex = src.indexOf('4. CANONICAL STATS STRIP');
    const marqueeIndex = src.indexOf('5. ENTERPRISE BRANDS LOGO MARQUEE');
    const trendingIndex = src.indexOf('6. TRENDING INVENTORY LIST');
    const bannerIndex = src.indexOf('7. MORE THAN A PURCHASE BANNER');
    const testimonialsIndex = src.indexOf('8. TESTIMONIALS');

    assert.ok(heroIndex > -1, 'Section 1 (Hero) must exist');
    assert.ok(categoryIndex > heroIndex, 'Section 2 must follow Section 1');
    assert.ok(dealIndex > categoryIndex, 'Section 3 must follow Section 2');
    assert.ok(statsIndex > dealIndex, 'Section 4 must follow Section 3');
    assert.ok(marqueeIndex > statsIndex, 'Section 5 must follow Section 4');
    assert.ok(trendingIndex > marqueeIndex, 'Section 6 must follow Section 5');
    assert.ok(bannerIndex > trendingIndex, 'Section 7 must follow Section 6');
    assert.ok(testimonialsIndex > bannerIndex, 'Section 8 must follow Section 7');
  });

  it('preserves genuine numeric claims in the Stats Strip without inventing metrics', () => {
    const src = readHomePageSource();
    assert.ok(
      src.includes('target={1500} suffix="+"'),
      'Must preserve genuine 1500+ devices sold'
    );
    assert.ok(
      src.includes('target={27} suffix="+"'),
      'Must preserve genuine 27+ corporate clients'
    );
    assert.ok(
      src.includes('target={95} suffix="%"'),
      'Must preserve genuine 95% satisfaction rate'
    );
    assert.ok(
      src.includes('target={2} suffix="+ Yrs"'),
      'Must preserve genuine 2+ Yrs experience'
    );
  });

  it('verifies RevealOnScroll component provides triggerOnce and reduced motion support', () => {
    const src = readRevealSource();
    assert.ok(
      src.includes('triggerOnce: true'),
      'RevealOnScroll must animate only once upon entering viewport'
    );
    assert.ok(
      src.includes('useReducedMotion'),
      'RevealOnScroll must support prefers-reduced-motion'
    );
    assert.ok(
      src.includes('cubic-bezier(0.16, 1, 0.3, 1)'),
      'RevealOnScroll must use the LaptopMitra brand easing'
    );
  });
});
