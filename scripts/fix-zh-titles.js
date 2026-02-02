#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取检查结果
const results = JSON.parse(fs.readFileSync('./docs/zh-pages-check-results.json', 'utf8'));

// 过滤出需要添加 title 的页面
const needsTitle = results.filter(r => r.exists && !r.hasTitle);

console.log(`准备为 ${needsTitle.length} 个页面添加 title\n`);

let fixedCount = 0;
let skippedCount = 0;

needsTitle.forEach(({ path }) => {
  const fullPath = path.startsWith('/') ? path.slice(1) : path;

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  跳过（文件不存在）: ${path}`);
    skippedCount++;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // 查找第一个 h1 标题
  let h1Title = null;
  let h1LineIndex = -1;
  let frontmatterEndIndex = -1;

  // 检查是否有 frontmatter
  if (lines[0] === '---') {
    frontmatterEndIndex = lines.indexOf('---', 1);
  }

  // 在 frontmatter 后查找第一个 h1
  const searchStart = frontmatterEndIndex > 0 ? frontmatterEndIndex + 1 : 0;
  for (let i = searchStart; i < lines.length; i++) {
    const match = lines[i].match(/^#\s+(.+)$/);
    if (match) {
      h1Title = match[1].trim();
      h1LineIndex = i;
      break;
    }
  }

  if (!h1Title) {
    console.log(`⚠️  跳过（未找到 h1 标题）: ${path}`);
    skippedCount++;
    return;
  }

  // 构建新内容
  let newContent;
  const titleLine = `title: "${h1Title}"`;

  if (frontmatterEndIndex > 0) {
    // 已有 frontmatter，添加 title
    const frontmatterLines = lines.slice(1, frontmatterEndIndex);

    // 检查是否已有 title
    const hasTitle = frontmatterLines.some(line => line.startsWith('title:'));

    if (hasTitle) {
      console.log(`ℹ️  跳过（已有 title）: ${path}`);
      skippedCount++;
      return;
    }

    // 在 frontmatter 末尾添加 title
    frontmatterLines.push(titleLine);

    // 重建内容
    newContent = [
      '---',
      ...frontmatterLines,
      '---',
      ...lines.slice(frontmatterEndIndex + 1)
    ].join('\n');
  } else {
    // 没有 frontmatter，创建新的
    newContent = [
      '---',
      titleLine,
      '---',
      ...lines
    ].join('\n');
  }

  // 写回文件
  fs.writeFileSync(fullPath, newContent, 'utf8');
  console.log(`✅ 已添加 title "${h1Title}": ${path}`);
  fixedCount++;
});

console.log(`\n${'='.repeat(80)}`);
console.log(`修复完成：`);
console.log(`   成功: ${fixedCount}`);
console.log(`   跳过: ${skippedCount}`);
console.log(`${'='.repeat(80)}`);
