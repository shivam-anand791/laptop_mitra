import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Brand color guard', () => {
  it('keeps the canonical blue and navy values in the tokens and web theme', () => {
    const tokens = read('../../packages/tokens/src/colors.ts');
    const tailwind = read('tailwind.config.mjs');
    const css = read('app/globals.css');

    assert.match(tokens, /primary:\s*'#2563EB'/);
    assert.match(tokens, /primaryHover:\s*'#1D4ED8'/);
    assert.match(tokens, /primaryLight:\s*'#EFF6FF'/);
    assert.match(tokens, /navy:\s*'#0B1F4B'/);
    assert.match(tokens, /navyHover:\s*'#071433'/);

    assert.match(css, /--lm-blue:\s*#2563EB;/);
    assert.match(css, /--lm-blue-hover:\s*#1D4ED8;/);
    assert.match(css, /--lm-blue-light:\s*#EFF6FF;/);
    assert.match(css, /--lm-navy:\s*#0B1F4B;/);
    assert.match(css, /--lm-navy-light:\s*#132E6B;/);

    assert.match(tailwind, /DEFAULT:\s*"#2563EB"/);
    assert.match(tailwind, /hover:\s*"#1D4ED8"/);
    assert.match(tailwind, /DEFAULT:\s*"#0B1F4B"/);
    assert.match(tailwind, /900:\s*"#071433"/);
  });

  it('keeps the Help hero and support calls to action on-brand', () => {
    const help = read('app/help/page.tsx');
    const article = read('app/help/[categorySlug]/[articleSlug]/page.tsx');

    assert.ok(help.includes('bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950'));
    assert.equal(help.match(/bg-\[#0B1F4B\]/g)?.length, 2);
    assert.ok(article.includes('bg-[#0B1F4B]'));
  });
});
