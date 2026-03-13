#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const footerDir = path.join(repoRoot, 'components', 'footer');
const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function isMarkdownFile(filePath) {
  return MARKDOWN_EXTENSIONS.has(path.extname(filePath));
}

function isIdentifier(value) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function toAlias(locale) {
  if (isIdentifier(locale)) {
    return locale;
  }

  const parts = locale.split(/[^A-Za-z0-9_$]+/).filter(Boolean);
  const suffix = parts.map((part) => part[0].toUpperCase() + part.slice(1)).join('');
  return suffix ? `footer${suffix}` : 'footerLocale';
}

function loadFooterConfigs() {
  if (!fs.existsSync(footerDir)) {
    exitWithError(`Missing footer directory: ${path.relative(repoRoot, footerDir)}`);
  }

  const configs = new Map();

  for (const entry of fs.readdirSync(footerDir, { withFileTypes: true })) {
    if (!entry.isFile() || path.extname(entry.name) !== '.mdx') {
      continue;
    }

    const locale = path.basename(entry.name, '.mdx');
    configs.set(locale, {
      alias: toAlias(locale),
      componentPath: `/components/footer/${entry.name}`,
      locale,
    });
  }

  if (configs.size === 0) {
    exitWithError(`No footer components found in ${path.relative(repoRoot, footerDir)}`);
  }

  return configs;
}

function listMarkdownFiles(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') {
          continue;
        }
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && isMarkdownFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function collectTargetFiles(targets, configs) {
  const files = [];

  for (const target of targets) {
    const absoluteTarget = path.resolve(repoRoot, target);
    const stat = fs.statSync(absoluteTarget, { throwIfNoEntry: false });

    if (!stat) {
      console.warn(`Skipping missing target: ${target}`);
      continue;
    }

    if (stat.isDirectory()) {
      files.push(...listMarkdownFiles(absoluteTarget));
      continue;
    }

    if (stat.isFile() && isMarkdownFile(absoluteTarget)) {
      files.push(absoluteTarget);
    }
  }

  return [...new Set(files)];
}

function getDefaultTargets(configs) {
  const targets = [];

  for (const locale of configs.keys()) {
    const localeDir = path.join(repoRoot, locale);
    if (fs.existsSync(localeDir) && fs.statSync(localeDir).isDirectory()) {
      targets.push(localeDir);
    }
  }

  return targets;
}

function getStagedMarkdownFiles() {
  const result = spawnSync(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '*.md', '*.mdx'],
    { cwd: repoRoot, encoding: 'utf8' },
  );

  if (result.status !== 0) {
    exitWithError(result.stderr.trim() || 'Failed to read staged files.');
  }

  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => path.resolve(repoRoot, file));
}

function restageFiles(files) {
  if (files.length === 0) {
    return;
  }

  const relFiles = files.map((file) => path.relative(repoRoot, file));
  const result = spawnSync('git', ['add', '--', ...relFiles], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    exitWithError(result.stderr.trim() || 'Failed to restage updated files.');
  }
}

function getLocaleConfigForFile(filePath, configs) {
  const relPath = path.relative(repoRoot, filePath);
  if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
    return null;
  }

  const [locale] = relPath.split(path.sep);
  return configs.get(locale) ?? null;
}

function normalizeFooter(content, config) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const footerImportIndexes = new Set();
  const footerAliases = new Set();
  const footerImportRe = /^\s*import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"]\/components\/footer\/([^'"]+)\.mdx['"];\s*$/;

  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(footerImportRe);
    if (!match) {
      continue;
    }

    footerImportIndexes.add(index);
    footerAliases.add(match[1]);
  }

  const nextLines = [];
  const footerTagRe = /^\s*<([A-Za-z_$][A-Za-z0-9_$]*)\s*\/>\s*$/;

  for (let index = 0; index < lines.length; index++) {
    if (footerImportIndexes.has(index)) {
      continue;
    }

    const tagMatch = lines[index].match(footerTagRe);
    if (tagMatch && footerAliases.has(tagMatch[1])) {
      continue;
    }

    nextLines.push(lines[index]);
  }

  while (nextLines.length > 0 && nextLines[nextLines.length - 1].trim() === '') {
    nextLines.pop();
  }

  if (nextLines.length > 0) {
    nextLines.push('');
  }

  nextLines.push(`import ${config.alias} from '${config.componentPath}';`);
  nextLines.push('');
  nextLines.push(`<${config.alias} />`);

  const normalized = `${nextLines.join(eol)}${eol}`;

  return {
    changed: normalized !== content,
    content: normalized,
  };
}

function stripFooter(content) {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const footerImportIndexes = new Set();
  const footerAliases = new Set();
  const footerImportRe = /^\s*import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+['"]\/components\/footer\/([^'"]+)\.mdx['"];\s*$/;

  for (let index = 0; index < lines.length; index++) {
    const match = lines[index].match(footerImportRe);
    if (!match) {
      continue;
    }

    footerImportIndexes.add(index);
    footerAliases.add(match[1]);
  }

  const nextLines = [];
  const footerTagRe = /^\s*<([A-Za-z_$][A-Za-z0-9_$]*)\s*\/>\s*$/;

  for (let index = 0; index < lines.length; index++) {
    if (footerImportIndexes.has(index)) {
      continue;
    }

    const tagMatch = lines[index].match(footerTagRe);
    if (tagMatch && footerAliases.has(tagMatch[1])) {
      continue;
    }

    nextLines.push(lines[index]);
  }

  while (nextLines.length > 0 && nextLines[nextLines.length - 1].trim() === '') {
    nextLines.pop();
  }

  const normalized = nextLines.length > 0 ? `${nextLines.join(eol)}${eol}` : '';

  return {
    changed: normalized !== content,
    content: normalized,
  };
}

function parseArgs(argv) {
  const options = {
    check: false,
    remove: false,
    restage: false,
    staged: false,
    targets: [],
  };

  for (const arg of argv) {
    if (arg === '--check') {
      options.check = true;
      continue;
    }
    if (arg === '--restage') {
      options.restage = true;
      continue;
    }
    if (arg === '--remove') {
      options.remove = true;
      continue;
    }
    if (arg === '--staged') {
      options.staged = true;
      continue;
    }
    if (arg.startsWith('--')) {
      exitWithError(`Unknown option: ${arg}`);
    }
    options.targets.push(arg);
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));
const footerConfigs = loadFooterConfigs();

if (options.restage && !options.staged) {
  exitWithError('--restage can only be used together with --staged');
}

const targetFiles = options.staged
  ? getStagedMarkdownFiles()
  : collectTargetFiles(options.targets.length > 0 ? options.targets : getDefaultTargets(footerConfigs), footerConfigs);

const changedFiles = [];
let processedFiles = 0;

for (const filePath of targetFiles) {
  const localeConfig = getLocaleConfigForFile(filePath, footerConfigs);
  if (!localeConfig) {
    continue;
  }

  processedFiles++;
  const original = fs.readFileSync(filePath, 'utf8');
  const result = options.remove ? stripFooter(original) : normalizeFooter(original, localeConfig);

  if (!result.changed) {
    continue;
  }

  changedFiles.push(filePath);

  if (!options.check) {
    fs.writeFileSync(filePath, result.content, 'utf8');
  }
}

if (!options.check && options.restage) {
  restageFiles(changedFiles);
}

if (changedFiles.length > 0) {
  const verb = options.remove ? 'remove footer from' : 'update';
  const prefix = options.check ? `Would ${verb}` : options.remove ? 'Removed footer from' : 'Updated';
  console.log(`${prefix} ${changedFiles.length} file(s):`);
  for (const filePath of changedFiles) {
    console.log(`- ${toPosix(path.relative(repoRoot, filePath))}`);
  }
} else {
  console.log(`No footer updates needed across ${processedFiles} file(s).`);
}

if (options.check && changedFiles.length > 0) {
  process.exitCode = 1;
}
