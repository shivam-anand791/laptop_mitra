import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readNavbarSource = () =>
  readFileSync(resolve(process.cwd(), 'components/Navbar.tsx'), 'utf8');

describe('Navbar & Navigation Foundation Contract Tests (Phase 2)', () => {
  it('preserves the critical DOM identifiers for shopping cart animations', () => {
    const src = readNavbarSource();
    assert.ok(src.includes('id="header-cart-icon"'), 'Header cart icon must have id="header-cart-icon"');
    assert.ok(src.includes('data-cart-icon="true"'), 'Header cart icon must have data-cart-icon="true"');
  });

  it('standardizes the 6 certified laptop categories as required by the visual specification', () => {
    const src = readNavbarSource();
    const requiredCategories = [
      'All Certified Laptops',
      'Business Series',
      'Apple MacBooks',
      'Gaming Series',
      'Student & Coding Under ₹25K',
      'Premium Ultrabooks',
    ];

    for (const category of requiredCategories) {
      assert.ok(
        src.includes(category),
        `Navbar must include the "${category}" certified laptop category`
      );
    }
  });

  it('preserves separate and independent Solutions menu options', () => {
    const src = readNavbarSource();
    const requiredSolutions = [
      'Outright Purchase',
      'Corporate Leasing',
      'Bulk Fleet Procurement',
      'Mitra Partner Program',
      '36-Month Assurance',
    ];

    for (const solution of requiredSolutions) {
      assert.ok(
        src.includes(solution),
        `Navbar must include the "${solution}" solution option`
      );
    }
  });

  it('provides accessibility listeners for Escape key and click outside', () => {
    const src = readNavbarSource();
    assert.ok(src.includes("e.key === 'Escape'"), 'Must handle Escape key to dismiss menus');
    assert.ok(src.includes('handleClickOutside'), 'Must handle click outside to dismiss menus');
    assert.ok(src.includes('aria-expanded'), 'Must manage aria-expanded states for screen readers');
    assert.ok(src.includes('aria-haspopup="true"'), 'Must manage aria-haspopup states');
  });

  it('provides smooth scroll handling for the sticky header transition', () => {
    const src = readNavbarSource();
    assert.ok(src.includes('handleScroll'), 'Must track scroll position');
    assert.ok(src.includes('window.scrollY > 12'), 'Must trigger elevation threshold on scroll');
    assert.ok(src.includes('isScrolled'), 'Must apply dynamic elevation classes when scrolled');
  });
});
