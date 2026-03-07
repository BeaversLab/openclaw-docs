#!/usr/bin/env node
/**
 * Fix internal links in /en directory to ensure they have /en prefix.
 *
 * This script scans all markdown files in the /en directory and fixes
 * internal links that are missing the /en prefix.
 *
 * Usage:
 *   node fix-en-links.js [--dry-run] [--check]
 *
 * Options:
 *   --dry-run  Show what would be changed without making changes
 *   --check    Only check if files need fixing, exit with code 1 if issues found
 */

import fs from 'fs/promises';
import path from 'path';

// Link patterns to match
const LINK_PATTERNS = [
  // Markdown links: [text](path)
  /\[([^\]]+)\]\(([^)]+)\)/g,
  // Markdown images: ![alt](path)
  /!\[([^\]]*)\]\(([^)]+)\)/g,
  // HTML links: <a href="path">
  /<a\s+href="([^"]+)"/gi,
  // HTML images: <img src="path">
  /<img\s+src="([^"]+)"/gi,
];

// Patterns that should NOT get /en prefix
const SKIP_PATTERNS = [
  /^https?:\/\//,  // External URLs (http, https)
  /^#/,            // Anchor links within the same page
  /^[a-z]+:\/\//,  // Other protocols (mailto:, file:, etc.)
  /^\.+\//,        // Relative paths (./, ../)
  /^\/api\//,      // API links (stay in English)
  /^\/assets\//,   // Assets directory
  /^\/images\//,   // Images directory
  /^\/node_modules\//, // Node modules
];

function shouldSkipLink(link) {
  return SKIP_PATTERNS.some(pattern => pattern.test(link));
}

function fixLink(link) {
  // If it already has /en prefix, keep it as is
  if (link.startsWith('/en/')) {
    return link;
  }

  // Check if it should be skipped
  if (shouldSkipLink(link)) {
    return link;
  }

  // Remove /zh or /zh-CN prefix if present (in case of accidentally mixed links)
  const withoutZhPrefix = link.replace(/^\/(zh|zh-CN)\//, '/');

  // Add /en prefix for root-level links starting with /
  if (withoutZhPrefix.startsWith('/') && !withoutZhPrefix.startsWith('/en/')) {
    return '/en' + withoutZhPrefix;
  }

  return link;
}

function fixLinksInContent(content, filePath) {
  let modified = false;
  let newContent = content;

  // Process Markdown links: [text](link) and ![alt](link)
  // Use a simpler approach with string replacement
  const linkRegex = /!?\[[^\]]*\]\(([^)]+)\)/g;
  newContent = newContent.replace(linkRegex, (match) => {
    // Extract the link from the markdown syntax
    const linkMatch = match.match(/!?\[[^\]]*\]\(([^)]+)\)/);
    if (!linkMatch) return match;

    const link = linkMatch[1];

    // Split link and anchor
    const [basePath, anchor] = link.split('#');

    if (shouldSkipLink(basePath)) {
      return match;
    }

    const fixedLink = fixLink(basePath);
    if (fixedLink !== basePath) {
      modified = true;
      // Reconstruct with anchor if present
      const newLink = anchor ? `${fixedLink}#${anchor}` : fixedLink;
      return match.replace(/\(([^)]+)\)/, `(${newLink})`);
    }

    return match;
  });

  // Process HTML links: <a href="link"> and <img src="link">
  const htmlRegex = /<(a|img)\s+(href|src)="([^"]+)"/gi;
  newContent = newContent.replace(htmlRegex, (match, tag, attr, link) => {
    if (shouldSkipLink(link)) {
      return match;
    }

    const fixedLink = fixLink(link);
    if (fixedLink !== link) {
      modified = true;
      return `<${tag} ${attr}="${fixedLink}"`;
    }

    return match;
  });

  return { content: newContent, modified };
}

async function findMarkdownFiles(dir) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await findMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore directories that can't be read
  }

  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const checkOnly = args.includes('--check');

  const enDir = 'en';

  console.log(`\n🔍 Scanning /en directory for internal links...\n`);

  const files = await findMarkdownFiles(enDir);
  console.log(`Found ${files.length} markdown files\n`);

  let fixedCount = 0;
  let modifiedCount = 0;
  const fixedFiles = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      const { content: newContent, modified } = fixLinksInContent(content, file);

      if (modified) {
        modifiedCount++;
        fixedFiles.push(file);

        if (dryRun) {
          console.log(`📝 ${file} (would be modified)`);
        } else if (checkOnly) {
          console.log(`❌ ${file} (needs fixing)`);
        } else {
          await fs.writeFile(file, newContent, 'utf8');
          console.log(`✅ ${file}`);
          fixedCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results:\n`);
  console.log(`  Total files scanned: ${files.length}`);
  console.log(`  Files needing fixes:  ${modifiedCount}`);

  if (dryRun) {
    console.log(`\n⚠️  Dry run mode - no files were modified`);
    console.log(`    Run without --dry-run to apply changes\n`);
  } else if (checkOnly) {
    if (modifiedCount > 0) {
      console.log(`\n❌ Found ${modifiedCount} file(s) that need fixing\n`);
      process.exit(1);
    } else {
      console.log(`\n✅ All links are correct!\n`);
    }
  } else {
    console.log(`  Files fixed:         ${fixedCount}\n`);

    if (fixedCount > 0) {
      console.log('✅ Link fixing complete!\n');
    } else {
      console.log('✅ All links are already correct!\n');
    }
  }

  if (modifiedCount > 0 && !checkOnly) {
    console.log('\n📝 Files that were modified:');
    fixedFiles.slice(0, 10).forEach(f => console.log(`   - ${f}`));
    if (fixedFiles.length > 10) {
      console.log(`   ... and ${fixedFiles.length - 10} more`);
    }
    console.log('');
  }
}

main().catch(console.error);
