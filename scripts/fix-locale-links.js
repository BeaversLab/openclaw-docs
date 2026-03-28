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

// Load allowed locales from centralized i18n-config.json
// This file defines ALL languages currently present in the workspace
const I18N_CONFIG = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'i18n-config.json'), 'utf8'));
const LOCALE_PREFIXES = Object.keys(I18N_CONFIG.languages);

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
  const rootPart = rel[0];
  if (LOCALE_PREFIXES.includes(rootPart)) return rootPart;
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
 * Correctly handles nested or unclosed backticks without infinite loops.
 */
function processLine(line, locale) {
  let result = '';
  let i = 0;

  while (i < line.length) {
    const remaining = line.slice(i);
    const match = remaining.match(/`+/);

    if (!match) {
      // No more backticks, process the rest of the line
      result += replaceLinks(remaining, locale);
      break;
    }

    const tickStartIdx = match.index;
    const ticks = match[0];
    const tickCount = ticks.length;

    // Process text BEFORE the backticks
    if (tickStartIdx > 0) {
      result += replaceLinks(remaining.slice(0, tickStartIdx), locale);
    }

    // Move i to just after the opening backticks
    i += tickStartIdx + tickCount;

    // Look for closing backticks of the EXACT same length
    const rest = line.slice(i);
    const closingMatch = rest.match(new RegExp(`(?<!\`)(${ticks})(?!\`)`));

    if (closingMatch) {
      const closingIdx = closingMatch.index;
      // It's a valid code span, keep it as-is
      result += ticks + rest.slice(0, closingIdx + tickCount);
      i += closingIdx + tickCount;
    } else {
      // Unclosed backticks, treat the opening ticks as literal text
      result += replaceLinks(ticks, locale);
      // i is already moved past the opening ticks, loop continues
    }
  }

  return result;
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

const rootDir = path.join(process.cwd(), 'src/content/docs');
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
