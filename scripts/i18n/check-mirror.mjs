#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const repoRoot = process.cwd();
const enRoot = path.join(repoRoot, 'en');
const zhRoot = path.join(repoRoot, 'zh');

function listDocs(root) {
  const results = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        results.push(path.relative(root, full));
      }
    }
  }
  return results.sort();
}

if (!fs.existsSync(enRoot) || !fs.existsSync(zhRoot)) {
  console.error('Missing en/ or zh/ directory.');
  process.exit(1);
}

const enFiles = new Set(listDocs(enRoot));
const zhFiles = new Set(listDocs(zhRoot));

const missingInZh = [...enFiles].filter((f) => !zhFiles.has(f));
const missingInEn = [...zhFiles].filter((f) => !enFiles.has(f));

if (missingInZh.length || missingInEn.length) {
  if (missingInZh.length) {
    console.error('Missing in zh/:');
    console.error(missingInZh.join('\n'));
  }
  if (missingInEn.length) {
    console.error('Missing in en/:');
    console.error(missingInEn.join('\n'));
  }
  process.exit(1);
}

console.log('OK: en/ and zh/ doc trees match.');
