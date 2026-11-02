import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const appDirectory = resolve(process.cwd(), 'app');

function findPages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findPages(path);
    return entry.name === 'page.tsx' ? [path] : [];
  });
}

function hasCustomerLayout(page: string, routeRoot: string): boolean {
  let directory = dirname(page);
  while (directory.startsWith(routeRoot)) {
    const layout = join(directory, 'layout.tsx');
    if (existsSync(layout) && readFileSync(layout, 'utf8').includes('<CustomerLayout')) return true;
    if (directory === routeRoot) break;
    directory = dirname(directory);
  }
  return false;
}

describe('Support route layouts', () => {
  for (const route of ['help', 'account']) {
    it(`wraps every /${route} page in the storefront layout`, () => {
      const routeRoot = join(appDirectory, route);
      const pages = findPages(routeRoot);
      assert.ok(pages.length > 0, `Expected pages under ${routeRoot}`);
      for (const page of pages) {
        assert.ok(hasCustomerLayout(page, routeRoot), `${page} has no inherited CustomerLayout`);
      }
    });
  }
});
