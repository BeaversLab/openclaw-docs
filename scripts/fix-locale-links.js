#!/usr/bin/env node

/**
 * Fix internal links in markdown files by adding/correcting locale prefixes.
 *
 * For files under en/ → ensures internal links start with /en/
 * For files under zh/ → ensures internal links start with /zh/
 *
 * Handles:
 *   - Markdown links:  [text](/path)
 *   - HTML href attrs: href="/path"  href='/path'
 *
 * Skips:
 *   - External links (http://, https://, mailto:, tel:, #)
 *   - Asset/image paths (/assets/, images/)
 *   - Links inside fenced code blocks or inline code
 *   - .md/.mdx extension links (left as-is for Mintlify)
 */

import fs from 'node:fs';
import path from 'node:path';

const LOCALE_PREFIXES = ['en', 'zh'];
const LOCALE_RE = new RegExp(`^/(${LOCALE_PREFIXES.join('|')})/`);
const SKIP_PREFIXES = [
  'http://',
  'https://',
  'mailto:',
  'tel:',
  '#',
  '/assets/',
  'images/',
  '/images/',
];

function detectLocale(filePath, rootDir) {
  const rel = path.relative(rootDir, filePath).split(path.sep);
  if (rel[0] === 'en') return 'en';
  if (rel[0] === 'zh') return 'zh';
  return null;
}

function shouldSkip(url) {
  if (!url || url.trim() === '') return true;
  const trimmed = url.trim();
  return SKIP_PREFIXES.some((p) => trimmed.startsWith(p));
}

function isInternalAbsolute(url) {
  return url.startsWith('/') && !shouldSkip(url);
}

function fixUrl(url, locale) {
  if (shouldSkip(url)) return url;
  if (!url.startsWith('/')) return url;

  let cleaned = url;
  const localeMatch = cleaned.match(LOCALE_RE);
  if (localeMatch) {
    if (localeMatch[1] === locale) return url; // already correct
    cleaned = cleaned.slice(localeMatch[0].length - 1); // strip locale, keep leading /
  }

  return `/${locale}${cleaned}`;
}

/**
 * Process a single line, replacing links outside inline code spans.
 * Returns the modified line.
 */
function processLine(line, locale) {
  const parts = [];
  let cursor = 0;
  let inBacktick = false;
  let tickStart = -1;

  // Split line into code / non-code segments at backtick boundaries
  const segments = [];
  let segStart = 0;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '`') {
      if (!inBacktick) {
        if (i > segStart) segments.push({ text: line.slice(segStart, i), code: false });
        inBacktick = true;
        tickStart = i;
      } else {
        segments.push({ text: line.slice(tickStart, i + 1), code: true });
        inBacktick = false;
        segStart = i + 1;
      }
    }
  }

  if (inBacktick) {
    // unmatched backtick — treat everything from tickStart as non-code
    if (tickStart > segStart) segments.push({ text: line.slice(segStart, tickStart), code: false });
    segments.push({ text: line.slice(tickStart), code: false });
  } else if (segStart < line.length) {
    segments.push({ text: line.slice(segStart), code: false });
  }

  return segments
    .map((seg) => {
      if (seg.code) return seg.text;
      return replaceLinks(seg.text, locale);
    })
    .join('');
}

function replaceLinks(text, locale) {
  // Markdown links: [text](/path) — captures the URL portion
  text = text.replace(/\]\((\/?[^)\s]+)\)/g, (match, url) => {
    if (!isInternalAbsolute(url)) return match;
    const fixed = fixUrl(url, locale);
    return `](${fixed})`;
  });

  // HTML href with double quotes: href="/path"
  text = text.replace(/href="(\/?[^"]+)"/g, (match, url) => {
    if (!isInternalAbsolute(url)) return match;
    const fixed = fixUrl(url, locale);
    return `href="${fixed}"`;
  });

  // HTML href with single quotes: href='/path'
  text = text.replace(/href='(\/?[^']+)'/g, (match, url) => {
    if (!isInternalAbsolute(url)) return match;
    const fixed = fixUrl(url, locale);
    return `href='${fixed}'`;
  });

  return text;
}

function processFile(filePath, locale, dryRun) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const result = [];
  let inCodeBlock = false;
  let changed = false;
  const changes = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track fenced code blocks (``` or ~~~)
    if (/^(\s*`{3,}|\s*~{3,})/.test(line)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        result.push(line);
        continue;
      }
      if (/^(\s*`{3,}|\s*~{3,})\s*$/.test(line)) {
        inCodeBlock = false;
        result.push(line);
        continue;
      }
    }

    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    const processed = processLine(line, locale);
    if (processed !== line) {
      changed = true;
      changes.push({ line: i + 1, before: line.trim(), after: processed.trim() });
    }
    result.push(processed);
  }

  if (changed && !dryRun) {
    fs.writeFileSync(filePath, result.join('\n'), 'utf8');
  }

  return { changed, changes };
}

function collectFiles(dir, exts = ['.md', '.mdx']) {
  const files = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        walk(full);
      } else if (exts.some((e) => entry.name.endsWith(e))) {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

// --- CLI ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const filteredArgs = args.filter((a) => !a.startsWith('--'));

if (filteredArgs.length === 0) {
  console.log(`Usage: node scripts/fix-locale-links.js [--dry-run] <path|dir> [...]

Adds or corrects locale prefixes (/en/ or /zh/) on internal links.

Options:
  --dry-run   Preview changes without writing files

Examples:
  node scripts/fix-locale-links.js en/ zh/
  node scripts/fix-locale-links.js --dry-run zh/index.md
  node scripts/fix-locale-links.js en/ zh/`);
  process.exit(0);
}

const rootDir = process.cwd();
let totalFiles = 0;
let totalChanged = 0;
let totalLinks = 0;

for (const target of filteredArgs) {
  const resolved = path.resolve(target);
  const stat = fs.statSync(resolved, { throwIfNoEntry: false });
  if (!stat) {
    console.error(`Not found: ${target}`);
    continue;
  }

  const files = stat.isDirectory() ? collectFiles(resolved) : [resolved];

  for (const file of files) {
    const locale = detectLocale(file, rootDir);
    if (!locale) {
      console.warn(`Skipping (no locale detected): ${path.relative(rootDir, file)}`);
      continue;
    }

    totalFiles++;
    const { changed, changes } = processFile(file, locale, dryRun);
    if (changed) {
      totalChanged++;
      totalLinks += changes.length;
      const rel = path.relative(rootDir, file);
      console.log(`\n${dryRun ? '[DRY RUN] ' : ''}${rel} (${changes.length} link${changes.length > 1 ? 's' : ''}):`);
      for (const c of changes) {
        console.log(`  L${c.line}:`);
        console.log(`    - ${c.before}`);
        console.log(`    + ${c.after}`);
      }
    }
  }
}

console.log(
  `\n${dryRun ? '[DRY RUN] ' : ''}Done: ${totalChanged}/${totalFiles} files, ${totalLinks} links ${dryRun ? 'would be ' : ''}fixed.`
);
