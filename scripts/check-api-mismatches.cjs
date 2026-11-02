#!/usr/bin/env node
/**
 * CI Mismatch Guard
 *
 * Verifies that every client endpoint called by apps/web and packages/api-client
 * corresponds to a registered route in apps/api controllers.
 * Exits with code 1 if any mismatches are detected to prevent deploy-skew bugs.
 */

const fs = require('fs');
const path = require('path');

function getFiles(dir, filter) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== '.turbo') {
        results = results.concat(getFiles(full, filter));
      }
    } else if (filter(file)) {
      results.push(full);
    }
  }
  return results;
}

// 1. Collect all API controller routes
const controllerFiles = getFiles(path.join(__dirname, '../apps/api/src'), f => f.endsWith('.controller.ts'));
const apiRoutes = [];

for (const file of controllerFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let bases = [''];
  const ctrlArrayMatch = content.match(/@Controller\(\s*\[([^\]]+)\]\s*\)/);
  const ctrlSingleMatch = content.match(/@Controller\(\s*(?:['"]([^'"]*)['"])?\s*\)/);

  if (ctrlArrayMatch) {
    bases = ctrlArrayMatch[1].split(',').map(s => s.replace(/['"\s]/g, ''));
  } else if (ctrlSingleMatch) {
    bases = [ctrlSingleMatch[1] || ''];
  }

  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/@(Get|Post|Put|Patch|Delete)\((?:\[([^\]]+)\]|['"]([^'"]*)['"])?\)/);
    if (m) {
      const verb = m[1].toUpperCase();
      let subPaths = [''];
      if (m[2]) {
        // array of subpaths
        subPaths = m[2].split(',').map(s => s.replace(/['"\s]/g, ''));
      } else if (m[3]) {
        subPaths = [m[3]];
      }

      for (let sub of subPaths) {
        if (sub.startsWith('/')) sub = sub.slice(1);
        for (const base of bases) {
          const cleanBase = base.startsWith('/') ? base.slice(1) : base;
          const fullPath = ('/' + cleanBase + (sub ? '/' + sub : '')).replace(/\/+/g, '/');
          apiRoutes.push({ verb, path: fullPath, file: path.relative(path.join(__dirname, '..'), file) });
        }
      }
    }
  }
}

// 2. Collect client calls from web & api-client
const clientFiles = [
  path.join(__dirname, '../apps/web/lib/api.ts'),
  path.join(__dirname, '../packages/api-client/src/index.ts'),
];

const clientCalls = [];

for (const file of clientFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  // Match path expressions inside request(...) or this.request(...)
  const matches = content.matchAll(/(?:request|this\.request)(?:<[^>]+>)?\(\s*[`'"]([^`'"]+)/g);
  for (const match of matches) {
    let rawPath = match[1];
    // Separate hardcoded query string
    let pathOnly = rawPath.split('?')[0];

    // If template literal param:
    // If it has /${...} -> /:param
    // If it has ${...} without preceding slash (e.g. /products${query}) -> query param (strip it)
    let cleanPath = pathOnly;
    while (cleanPath.includes('${')) {
      const idx = cleanPath.indexOf('${');
      const before = cleanPath.slice(0, idx);
      const afterIdx = cleanPath.indexOf('}', idx);
      const remainder = afterIdx !== -1 ? cleanPath.slice(afterIdx + 1) : '';
      if (before.endsWith('/')) {
        cleanPath = before + ':param' + remainder;
      } else {
        cleanPath = before + remainder;
      }
    }

    cleanPath = cleanPath.replace(/\/+/g, '/');
    if (cleanPath.endsWith('/') && cleanPath.length > 1) {
      cleanPath = cleanPath.slice(0, -1);
    }

    clientCalls.push({
      raw: rawPath,
      normalized: cleanPath,
      file: path.relative(path.join(__dirname, '..'), file),
    });
  }
}

console.log(`[CI Mismatch Guard] Scanned ${apiRoutes.length} backend routes across ${controllerFiles.length} controllers.`);
console.log(`[CI Mismatch Guard] Scanned ${clientCalls.length} client requests.`);

const uniqueCalls = [...new Set(clientCalls.map(c => c.normalized))];
const mismatches = [];

for (const endpoint of uniqueCalls) {
  const parts = endpoint.split('/').filter(Boolean);
  const match = apiRoutes.find(r => {
    const rParts = r.path.split('/').filter(Boolean);
    if (rParts.length !== parts.length) return false;
    return rParts.every((p, i) => p.startsWith(':') || parts[i].startsWith(':') || p === parts[i]);
  });

  if (!match) {
    mismatches.push(endpoint);
  }
}

if (mismatches.length > 0) {
  console.error(`\n❌ [CI Mismatch Guard] Found ${mismatches.length} route mismatches between client and API:`);
  for (const m of mismatches) {
    console.error(`   - Client calls "${m}" but no matching API controller route exists!`);
  }
  process.exit(1);
} else {
  console.log(`\n✅ [CI Mismatch Guard] All ${uniqueCalls.length} unique client endpoint paths exist in the backend API.`);
  process.exit(0);
}
