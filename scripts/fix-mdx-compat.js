#!/usr/bin/env node

/**
 * Fix common MDX-incompatible patterns in synced docs.
 *
 * Current fixes:
 *   - HTML comments converted to MDX comments
 *   - Angle autolinks: <https://example.com> -> [https://example.com](https://example.com)
 *
 * Scope:
 *   - Only processes .md/.mdx files
 *   - Skips fenced code blocks
 *   - Skips inline code spans
 *   - Safe to run repeatedly (idempotent)
 */

import fs from 'node:fs';
import path from 'node:path';

const HTML_COMMENT_RE = /<!--([\s\S]*?)-->/g;
const ANGLE_AUTOLINK_RE = /<(https?:\/\/[^>\s]+)>/g;

function replaceCompatPatterns(text) {
  let changed = false;
  let commentCount = 0;
  let autolinkCount = 0;

  const withComments = text.replace(HTML_COMMENT_RE, (_match, body) => {
    changed = true;
    commentCount++;
    return `{/*${body}*/}`;
  });

  const withAutolinks = withComments.replace(ANGLE_AUTOLINK_RE, (_match, url) => {
    changed = true;
    autolinkCount++;
    return `[${url}](${url})`;
  });

  return {
    text: withAutolinks,
    changed,
    commentCount,
    autolinkCount,
  };
}

function processLine(line) {
  let result = '';
  let i = 0;
  let changed = false;
  let commentCount = 0;
  let autolinkCount = 0;

  while (i < line.length) {
    const remaining = line.slice(i);
    const match = remaining.match(/`+/);

    if (!match) {
      const replaced = replaceCompatPatterns(remaining);
      result += replaced.text;
      changed ||= replaced.changed;
      commentCount += replaced.commentCount;
      autolinkCount += replaced.autolinkCount;
      break;
    }

    const tickStartIdx = match.index;
    const ticks = match[0];
    const tickCount = ticks.length;

    if (tickStartIdx > 0) {
      const replaced = replaceCompatPatterns(remaining.slice(0, tickStartIdx));
      result += replaced.text;
      changed ||= replaced.changed;
      commentCount += replaced.commentCount;
      autolinkCount += replaced.autolinkCount;
    }

    i += tickStartIdx + tickCount;

    const rest = line.slice(i);
    const closingMatch = rest.match(new RegExp(`(?<!\`)(${ticks})(?!\`)`));

    if (closingMatch) {
      const closingIdx = closingMatch.index;
      result += ticks + rest.slice(0, closingIdx + tickCount);
      i += closingIdx + tickCount;
    } else {
      result += ticks;
    }
  }

  return { line: result, changed, commentCount, autolinkCount };
}

function processFile(filePath, dryRun) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const output = [];
  let inCodeBlock = false;
  let changed = false;
  const changes = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(\s*`{3,}|\s*~{3,})/.test(line)) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        output.push(line);
        continue;
      }
      if (/^(\s*`{3,}|\s*~{3,})\s*$/.test(line)) {
        inCodeBlock = false;
        output.push(line);
        continue;
      }
    }

    if (inCodeBlock) {
      output.push(line);
      continue;
    }

    const processed = processLine(line);
    output.push(processed.line);

    if (processed.changed) {
      changed = true;
      changes.push({
        line: i + 1,
        before: line.trim(),
        after: processed.line.trim(),
        commentCount: processed.commentCount,
        autolinkCount: processed.autolinkCount,
      });
    }
  }

  if (changed && !dryRun) {
    fs.writeFileSync(filePath, output.join('\n'), 'utf8');
  }

  return { changed, changes };
}

function collectFiles(dir, exts = ['.md', '.mdx']) {
  const files = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (exts.some(ext => entry.name.endsWith(ext))) {
        files.push(full);
      }
    }
  }

  walk(dir);
  return files;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targets = args.filter(arg => !arg.startsWith('--'));

if (targets.length === 0) {
  console.log(`Usage: node scripts/fix-mdx-compat.js [--dry-run] <path|dir> [...]

Fixes MDX-incompatible patterns in markdown files copied from upstream.

Options:
  --dry-run   Preview changes without writing files

Examples:
  node scripts/fix-mdx-compat.js en/
  node scripts/fix-mdx-compat.js --dry-run en/ docs/example.mdx`);
  process.exit(0);
}

let totalFiles = 0;
let totalChanged = 0;
let totalFixes = 0;

for (const target of targets) {
  const resolved = path.resolve(target);
  const stat = fs.statSync(resolved, { throwIfNoEntry: false });

  if (!stat) {
    console.error(`Not found: ${target}`);
    process.exitCode = 1;
    continue;
  }

  const files = stat.isDirectory() ? collectFiles(resolved) : [resolved];

  for (const file of files) {
    totalFiles++;
    const { changed, changes } = processFile(file, dryRun);
    if (!changed) continue;

    totalChanged++;
    totalFixes += changes.reduce((sum, entry) => sum + entry.commentCount + entry.autolinkCount, 0);

    const rel = path.relative(process.cwd(), file);
    console.log(`\n${dryRun ? '[DRY RUN] ' : ''}${rel} (${changes.length} line${changes.length > 1 ? 's' : ''} changed):`);
    for (const change of changes) {
      console.log(`  L${change.line}:`);
      console.log(`    - ${change.before}`);
      console.log(`    + ${change.after}`);
    }
  }
}

console.log(`\nProcessed ${totalFiles} file(s), changed ${totalChanged}, applied ${totalFixes} fix(es).`);
