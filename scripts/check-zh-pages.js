#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取 docs.json
const docsJson = JSON.parse(fs.readFileSync('./docs.json', 'utf8'));

// 提取所有 zh 页面路径
const zhPages = [];
const cnLanguage = docsJson.navigation.languages.find(l => l.language === 'cn');

if (cnLanguage) {
  cnLanguage.groups.forEach(group => {
    group.pages.forEach(page => {
      zhPages.push({
        group: group.group,
        path: page + '.md'
      });
    });
  });
}

console.log(`找到 ${zhPages.length} 个中文页面\n`);

// 检查每个页面
const results = [];

zhPages.forEach(({ group, path }) => {
  const fullPath = path.startsWith('/') ? path.slice(1) : path;

  if (!fs.existsSync(fullPath)) {
    results.push({
      path,
      group,
      exists: false,
      issues: ['文件不存在']
    });
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const issues = [];

  // 检查 frontmatter
  const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
  let hasTitle = false;
  let hasTranslationNote = false;

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    hasTitle = /title:\s*['"]/.test(frontmatter);
    hasTranslationNote = /translation|翻译|WIP|TODO/i.test(frontmatter);
  } else {
    issues.push('缺少 frontmatter');
  }

  if (!hasTitle) {
    issues.push('缺少 title 字段');
  }

  // 检查是否有英文段落（简单的启发式检查）
  const lines = content.split('\n');
  const linesAfterFrontmatter = frontmatterMatch
    ? lines.slice(lines.indexOf('---', lines.indexOf('---') + 1) + 1)
    : lines;

  let potentialUntranslated = 0;
  linesAfterFrontmatter.forEach(line => {
    // 跳过代码块
    if (line.trim().startsWith('```')) return;
    // 跳过空行
    if (line.trim() === '') return;
    // 跳过特殊标记
    if (line.trim().match(/^<[a-z]/)) return;

    // 检查是否包含大量英文（非代码、非标题）
    const textContent = line.replace(/[*_`#\-\[\]()]/g, '').trim();
    if (textContent.length > 20 && /^[A-Za-z\s.,!?]+$/.test(textContent)) {
      potentialUntranslated++;
    }
  });

  if (potentialUntranslated > 3) {
    issues.push(`可能存在未翻译段落（约 ${potentialUntranslated} 处）`);
  }

  results.push({
    path,
    group,
    exists: true,
    hasTitle,
    hasTranslationNote,
    potentialUntranslated,
    issues
  });
});

// 生成报告
console.log('='.repeat(80));
console.log('中文页面检查报告');
console.log('='.repeat(80));

const needsTitle = results.filter(r => r.exists && !r.hasTitle);
const hasUntranslated = results.filter(r => r.exists && r.potentialUntranslated > 3);
const hasTranslationNote = results.filter(r => r.exists && r.hasTranslationNote);
const notExists = results.filter(r => !r.exists);

console.log(`\n📊 统计：`);
console.log(`   总页面数: ${results.length}`);
console.log(`   缺少 title: ${needsTitle.length}`);
console.log(`   可能未翻译: ${hasUntranslated.length}`);
console.log(`   有翻译标记: ${hasTranslationNote.length}`);
console.log(`   文件不存在: ${notExists.length}`);

if (needsTitle.length > 0) {
  console.log(`\n\n❌ 缺少 title 的页面 (${needsTitle.length})：`);
  needsTitle.forEach(r => {
    console.log(`   - ${r.path}`);
  });
}

if (hasUntranslated.length > 0) {
  console.log(`\n\n⚠️  可能存在未翻译段落的页面 (${hasUntranslated.length})：`);
  hasUntranslated.forEach(r => {
    console.log(`   - ${r.path} (${r.potentialUntranslated} 处)`);
  });
}

if (hasTranslationNote.length > 0) {
  console.log(`\n\n📝 带有翻译标记的页面 (${hasTranslationNote.length})：`);
  hasTranslationNote.forEach(r => {
    console.log(`   - ${r.path}`);
  });
}

if (notExists.length > 0) {
  console.log(`\n\n🚫 文件不存在的页面 (${notExists.length})：`);
  notExists.forEach(r => {
    console.log(`   - ${r.path}`);
  });
}

// 输出 JSON 格式供后续处理
fs.writeFileSync(
  './docs/zh-pages-check-results.json',
  JSON.stringify(results, null, 2),
  'utf8'
);

console.log(`\n\n✅ 详细结果已保存到: docs/zh-pages-check-results.json`);
