import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readCertifiedBenchSource = () =>
  readFileSync(resolve(process.cwd(), 'components/CertifiedBench.tsx'), 'utf8');

describe('Customer-Friendly Quality Inspection & Diagnostic Bench', () => {
  it('validates 6 customer-oriented categories and elimination of 50-point contradiction', () => {
    const src = readCertifiedBenchSource();

    // Reconciled count
    assert.ok(
      src.includes('32-Point Certified'),
      'Must contain verified 32-Point Certified badge'
    );
    assert.ok(
      !src.includes('50-Point Bench Testing'),
      'Must not contain contradictory 50-Point Bench Testing'
    );
    assert.ok(
      !src.includes('100% Tested Safe'),
      'Must eliminate unverified 100% Tested Safe slogan'
    );
    assert.ok(
      !src.includes('0 Compromised Units Dispatched'),
      'Must eliminate unverified zero compromised claim'
    );

    // 6 Categories
    const expectedCategories = [
      'Performance & Processor',
      'Display & Screen',
      'Battery & Charging',
      'Heating & Cooling',
      'Keyboard & Touchpad',
      'Ports, Wi-Fi & Sound',
    ];

    expectedCategories.forEach((cat) => {
      assert.ok(src.includes(cat), `Must contain customer category: ${cat}`);
    });
  });

  it('verifies 3-level progressive disclosure (what we check, customer benefit, on-demand tech details)', () => {
    const src = readCertifiedBenchSource();

    // Level 1: What we check
    assert.ok(src.includes('What we check:'), 'Must include plain everyday what we check label');
    assert.ok(src.includes('Reliable Everyday Performance'), 'Must have everyday performance check');
    assert.ok(src.includes('Screen Quality & Clarity'), 'Must have customer-friendly screen check');
    assert.ok(src.includes('Battery Health Check'), 'Must have everyday battery check');
    assert.ok(src.includes('Cooling System Maintenance'), 'Must have cooling maintenance check');

    // Level 2: Customer benefit
    assert.ok(src.includes('Why it matters:'), 'Must include customer benefit explanation');

    // Level 3: On-demand accordion for engineering diagnostics
    assert.ok(src.includes('See technical details'), 'Must provide expandable technical toggle');
    assert.ok(src.includes('Engineering Diagnostics'), 'Must display engineering diagnostics section when expanded');
    assert.ok(src.includes('Test Procedure:'), 'Must display test procedure in tech details');
    assert.ok(src.includes('Pass Criteria:'), 'Must display pass criteria in tech details');
  });

  it('validates the 4-stage customer inspection journey timeline', () => {
    const src = readCertifiedBenchSource();

    assert.ok(src.includes('Carefully Sourced'), 'Stage 1 must be Carefully Sourced');
    assert.ok(src.includes('Thoroughly Checked'), 'Stage 2 must be Thoroughly Checked');
    assert.ok(src.includes('Cleaned & Prepared'), 'Stage 3 must be Cleaned & Prepared');
    assert.ok(src.includes('Certified & Guaranteed'), 'Stage 4 must be Certified & Guaranteed');
  });

  it('verifies cosmetic grading standards and warranty coverage', () => {
    const src = readCertifiedBenchSource();

    assert.ok(src.includes('Grade A+'), 'Must contain Grade A+');
    assert.ok(src.includes('Certified Like-New'), 'Must label Grade A+ as Certified Like-New');
    assert.ok(src.includes('Grade A'), 'Must contain Grade A');
    assert.ok(src.includes('Certified Excellent'), 'Must label Grade A as Certified Excellent');
    assert.ok(src.includes('Grade B'), 'Must contain Grade B');
    assert.ok(src.includes('Certified Value Workhorse'), 'Must label Grade B as Certified Value Workhorse');
    assert.ok(src.includes('1 Year Full Hardware Warranty Included'), 'Must provide 1 Year Full Hardware Warranty');
  });
});
