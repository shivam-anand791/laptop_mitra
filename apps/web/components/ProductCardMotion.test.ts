import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readProductCardSource = () =>
  readFileSync(resolve(process.cwd(), 'components/ProductCard.tsx'), 'utf8');

const readProductsPageSource = () =>
  readFileSync(resolve(process.cwd(), 'app/products/page.tsx'), 'utf8');

const readSkeletonSource = () =>
  readFileSync(resolve(process.cwd(), 'components/ui/Skeleton.tsx'), 'utf8');

describe('Product Card & Product Listing Motion Contract Tests (Phase 4)', () => {
  it('extracts and presents battery health metadata alongside specs', () => {
    const src = readProductCardSource();
    assert.ok(
      src.includes('getBatteryHealth'),
      'Must define getBatteryHealth helper'
    );
    assert.ok(
      src.includes('batteryHealth'),
      'Must inspect batteryHealth metadata'
    );
    assert.ok(
      src.includes('variant="battery"'),
      'Must render SpecTag with variant="battery"'
    );
  });

  it('guarantees Add-to-Cart never displays success before the operation confirms', () => {
    const src = readProductCardSource();
    
    // Find handleAdd function block
    const handleAddStart = src.indexOf('const handleAdd = async');
    assert.ok(handleAddStart > -1, 'Must have handleAdd handler');
    const handleAddBlock = src.slice(handleAddStart, handleAddStart + 700);

    const awaitAddItemIndex = handleAddBlock.indexOf('await addItem(');
    const setJustAddedIndex = handleAddBlock.indexOf('setJustAdded(true)');
    const toastSuccessIndex = handleAddBlock.indexOf("addToast('success'");

    assert.ok(awaitAddItemIndex > -1, 'Must await addItem');
    assert.ok(setJustAddedIndex > -1, 'Must set justAdded after success');
    assert.ok(
      setJustAddedIndex > awaitAddItemIndex,
      'setJustAdded(true) MUST occur AFTER await addItem confirms'
    );
    assert.ok(
      toastSuccessIndex > awaitAddItemIndex,
      'Success toast MUST occur AFTER await addItem confirms'
    );
  });

  it('provides loading state spinner during Add-to-Cart update', () => {
    const src = readProductCardSource();
    assert.ok(
      src.includes('Adding...'),
      'Must display "Adding..." text during pending add operation'
    );
    assert.ok(
      src.includes('animate-spin-slow'),
      'Must render spinner during pending add operation'
    );
  });

  it('implements restrained image zoom between 1.00 and 1.03 on hover', () => {
    const src = readProductCardSource();
    assert.ok(
      src.includes('group-hover:scale-[1.03]'),
      'Image scale must be restrained to 1.03 on hover'
    );
    assert.ok(
      src.includes('hover:-translate-y-1'),
      'Card must elevate by translateY(-4px) on hover'
    );
  });

  it('implements wishlist button feedback, heart fill transition and toast confirmation', () => {
    const src = readProductCardSource();
    assert.ok(
      src.includes('isHeartPopping'),
      'Must implement heart popping animation'
    );
    assert.ok(
      src.includes("isWish ? 'currentColor' : 'none'"),
      'Heart SVG fill must transition based on wishlist state'
    );
    assert.ok(
      src.includes('addToast('),
      'Must trigger confirmation toast on wishlist toggle'
    );
  });

  it('renders live quantity stepper when product is in cart and preserves Fly-to-Cart destination', () => {
    const src = readProductCardSource();
    assert.ok(
      src.includes('quantityInCart > 0'),
      'Must render stepper when item is already in cart'
    );
    assert.ok(
      src.includes('triggerFlyToCart'),
      'Must retain fly to cart animation helper'
    );
    assert.ok(
      src.includes('header-cart-icon'),
      'Must target header-cart-icon'
    );
  });

  it('verifies product listing page implements smooth filter drawer and staggered card animation', () => {
    const pageSrc = readProductsPageSource();
    assert.ok(
      pageSrc.includes('animate-modal-in'),
      'Mobile filter drawer must use smooth modal entrance'
    );
    assert.ok(
      pageSrc.includes('animate-fade-up'),
      'Product grid items must use staggered fade-up reveal'
    );
    assert.ok(
      pageSrc.includes('ProductCardSkeleton'),
      'Must use ProductCardSkeleton during loading'
    );
  });

  it('verifies ProductCardSkeleton matches cream/off-white surface tokens', () => {
    const skelSrc = readSkeletonSource();
    assert.ok(
      skelSrc.includes('bg-[#FFFDF9]'),
      'Skeleton must use brand card surface #FFFDF9'
    );
    assert.ok(
      skelSrc.includes('aspect-[4/3]'),
      'Skeleton must mirror product media frame aspect-[4/3]'
    );
  });
});
