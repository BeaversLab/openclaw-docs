#!/usr/bin/env node
/**
 * Batch i18n quality check with enhanced reporting
 * Compares all markdown files between /en and /zh directories
 *
 * Usage:
 *   node scripts/compare-i18n.js              # Full report
 *   node scripts/compare-i18n.js --summary    # Summary only
 *   node scripts/compare-i18n.js --json       # JSON output
 *   node scripts/compare-i18n.js --failures   # Show only failures
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[90m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// Find all markdown files in a directory
async function findMarkdownFiles(dir, baseDir = dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findMarkdownFiles(fullPath, baseDir));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files.sort();
}

// Run quality check on a single file pair
async function checkFile(relPath, sourceDir, targetDir) {
  const srcFile = path.join(sourceDir, relPath);
  const tgtFile = path.join(targetDir, relPath);

  try {
    await fs.access(tgtFile);
  } catch {
    return {
      relPath,
      status: 'missing',
      error: `Target file not found`,
    };
  }

  // Import and run the quality check
  const { runAllChecks } = await import(path.join(PROJECT_ROOT, '.claude/skills/beaver-markdown-i18n/scripts/lib/quality.js'));
  const { readNoTranslateConfig, findI18nDir } = await import(path.join(PROJECT_ROOT, '.claude/skills/beaver-markdown-i18n/scripts/lib/read-no-translate.js'));
  const { fixCodeBlocks, fixLinks } = await import(path.join(PROJECT_ROOT, '.claude/skills/beaver-markdown-i18n/scripts/lib/fix.js'));

  let srcContent = await fs.readFile(srcFile, 'utf-8');
  let tgtContent = await fs.readFile(tgtFile, 'utf-8');

  const i18nDir = await findI18nDir(PROJECT_ROOT);
  const noTranslate = i18nDir ? await readNoTranslateConfig(i18nDir) : null;

  let result = runAllChecks(srcContent, tgtContent, {
    targetLocale: 'zh',
    noTranslateConfig: noTranslate,
    consistencyConfig: null,
  });

  // Auto-fix: code blocks count matches but content differs
  if (result.sections.codeBlocks && !result.sections.codeBlocks.pass) {
    const details = result.sections.codeBlocks.details;
    if (details.total > 0 && details.contentChanged > 0 && details.langMismatch === 0) {
      // Only content changed, language matches - safe to auto-fix
      const fixResult = fixCodeBlocks(srcContent, tgtContent);
      if (!fixResult.error && fixResult.replaced > 0) {
        await fs.writeFile(tgtFile, fixResult.text, 'utf-8');
        tgtContent = fixResult.text; // Update for recheck
        result = runAllChecks(srcContent, tgtContent, {
          targetLocale: 'zh',
          noTranslateConfig: noTranslate,
          consistencyConfig: null,
        });
      }
    }
  }

  // Auto-fix: links count matches but URLs differ
  if (result.sections.links && !result.sections.links.pass) {
    const details = result.sections.links.details;
    const totalMismatched = (details.external?.mismatched || 0) +
                           (details.relative?.mismatched || 0);
    // Only fix if count matches but content differs
    const srcLinkCount = details.external?.total || 0;
    const tgtLinkCount = result.sections.details?.structure?.linkCount?.tgt || 0;

    if (srcLinkCount === tgtLinkCount && totalMismatched > 0) {
      const fixResult = fixLinks(srcContent, tgtContent);
      if (!fixResult.error && fixResult.replaced > 0) {
        await fs.writeFile(tgtFile, fixResult.text, 'utf-8');
        tgtContent = fixResult.text; // Update for recheck
        result = runAllChecks(srcContent, tgtContent, {
          targetLocale: 'zh',
          noTranslateConfig: noTranslate,
          consistencyConfig: null,
        });
      }
    }
  }

  return {
    relPath,
    status: result.passed ? 'passed' : 'failed',
    errors: result.errors.length,
    warnings: result.warnings.length,
    sections: result.sections,
    details: result,
  };
}

// Format summary report
function formatSummary(results) {
  const total = results.length;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const missing = results.filter(r => r.status === 'missing').length;
  const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);
  const totalWarnings = results.reduce((sum, r) => sum + (r.warnings || 0), 0);

  const lines = [
    '',
    colorize('═'.repeat(60), 'dim'),
    colorize('SUMMARY', 'blue'),
    colorize('═'.repeat(60), 'dim'),
    '',
    `Total files:     ${total}`,
    `${colorize('✓', 'green')} Passed:         ${passed}`,
    `${colorize('✗', 'red')} Failed:         ${failed}`,
    `${colorize('○', 'yellow')} Missing:        ${missing}`,
    '',
    `Total errors:    ${totalErrors}`,
    `Total warnings:  ${totalWarnings}`,
    '',
  ];

  if (failed > 0 || missing > 0) {
    lines.push(colorize('Failed/Missing Files:', 'red'));
    for (const r of results) {
      if (r.status === 'failed' || r.status === 'missing') {
        const icon = r.status === 'missing' ? '○' : '✗';
        const count = r.errors > 0 ? ` (${r.errors} errors)` : '';
        lines.push(`  ${icon} ${r.relPath}${count}`);
      }
    }
    lines.push('');
  }

  const overallStatus = (failed === 0 && missing === 0) ? 'passed' : 'failed';
  const statusColor = overallStatus === 'passed' ? 'green' : 'red';
  lines.push(colorize('═'.repeat(60), 'dim'));
  lines.push(colorize(`Overall: ${overallStatus.toUpperCase()}`, statusColor));
  lines.push(colorize('═'.repeat(60), 'dim'));

  return lines.join('\n');
}

// Format detailed report for a single file
function formatFileReport(result) {
  if (result.status === 'missing') {
    return [
      '',
      colorize('─'.repeat(60), 'dim'),
      colorize(`○ ${result.relPath}`, 'yellow'),
      colorize('─'.repeat(60), 'dim'),
      colorize(`Error: ${result.error}`, 'red'),
    ].join('\n');
  }

  const lines = [
    '',
    colorize('─'.repeat(60), 'dim'),
    colorize(`${result.status === 'passed' ? '✓' : '✗'} ${result.relPath}`, result.status === 'passed' ? 'green' : 'red'),
    colorize('─'.repeat(60), 'dim'),
  ];

  for (const [id, sec] of Object.entries(result.sections)) {
    const status = sec.pass
      ? colorize('[PASS]', 'green')
      : sec.errors.length > 0
        ? colorize('[FAIL]', 'red')
        : colorize('[WARN]', 'yellow');

    lines.push(`${status} ${id}`);

    for (const err of sec.errors) {
      lines.push(`  ${colorize('ERROR:', 'red')} ${err}`);
    }
    for (const warn of sec.warnings) {
      lines.push(`  ${colorize('WARN:', 'yellow')} ${warn}`);
    }
  }

  const summary = result.errors > 0
    ? colorize(`${result.errors} error(s)`, 'red')
    : '';
  const warningSummary = result.warnings > 0
    ? colorize(`${result.warnings} warning(s)`, 'yellow')
    : '';

  if (summary || warningSummary) {
    lines.push(`Result: ${summary}${summary && warningSummary ? ', ' : ''}${warningSummary}`);
  }

  return lines.join('\n');
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--json') ? 'json'
    : args.includes('--summary') ? 'summary'
      : args.includes('--failures') ? 'failures'
        : 'full';

  const sourceDir = path.join(PROJECT_ROOT, 'en');
  const targetDir = path.join(PROJECT_ROOT, 'zh');

  // Silence progress output in JSON mode
  if (mode !== 'json') {
    console.log(colorize('i18n Quality Check', 'blue'));
    console.log(`Source: ${sourceDir}`);
    console.log(`Target: ${targetDir}`);
    console.log(colorize('Scanning files...', 'dim'));
  }

  const sourceFiles = await findMarkdownFiles(sourceDir);
  if (mode !== 'json') {
    console.log(colorize(`Found ${sourceFiles.length} files to check\n`, 'dim'));
  }

  const results = [];
  let checked = 0;

  for (const relPath of sourceFiles) {
    checked++;
    if (mode !== 'json') {
      process.stdout.write(`\r${colorize(`Checking... ${checked}/${sourceFiles.length}`, 'dim')}`);
    }

    const result = await checkFile(relPath, sourceDir, targetDir);
    results.push(result);
  }

  if (mode !== 'json') {
    process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear progress line
  }

  if (mode === 'json') {
    // Only output files that did not pass
    const failedResults = results.filter(r => r.status !== 'passed');
    console.log(JSON.stringify(failedResults, null, 2));
    return;
  }

  if (mode === 'summary' || mode === 'failures') {
    console.log(formatSummary(results));
  } else {
    // Full report
    for (const result of results) {
      if (mode === 'failures' && result.status === 'passed') continue;
      console.log(formatFileReport(result));
    }
    console.log(formatSummary(results));
  }

  const hasFailures = results.some(r => r.status !== 'passed');
  process.exit(hasFailures ? 1 : 0);
}

main().catch(err => {
  console.error(colorize(`Error: ${err.message}`, 'red'));
  process.exit(1);
});
