#!/usr/bin/env node

const fs = require('fs');

// 读取检查结果
const results = JSON.parse(fs.readFileSync('./docs/zh-pages-check-results.json', 'utf8'));

// 过滤出可能有未翻译段落的页面
const needsTranslation = results
  .filter(r => r.exists && r.potentialUntranslated > 3)
  .sort((a, b) => b.potentialUntranslated - a.potentialUntranslated);

console.log(`找到 ${needsTranslation.length} 个可能包含未翻译段落的页面\n`);
console.log('='.repeat(80));
console.log('需要进一步检查的页面（按可能未翻译数量排序）');
console.log('='.repeat(80));

needsTranslation.forEach(({ path, potentialUntranslated }) => {
  const fullPath = path.startsWith('/') ? path.slice(1) : path;

  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  // 找到 frontmatter 结束位置
  let frontmatterEnd = -1;
  if (lines[0] === '---') {
    frontmatterEnd = lines.indexOf('---', 1);
  }

  const startLine = frontmatterEnd > 0 ? frontmatterEnd + 1 : 0;
  const untranslatedLines = [];

  // 检查每一行
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];

    // 跳过代码块
    if (line.trim().startsWith('```')) continue;
    // 跳过空行
    if (line.trim() === '') continue;
    // 跳过标题行（通常是中文）
    if (line.trim().startsWith('#')) continue;
    // 跳过列表标记
    if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
      const textContent = line.replace(/^[-\d.*]+\s*/, '').replace(/[*_`#\-\[\]()]/g, '').trim();
      if (textContent.length > 20 && /^[A-Za-z\s.,!?]+$/.test(textContent)) {
        untranslatedLines.push(i + 1);
      }
      continue;
    }
    // 跳过特殊标记
    if (line.trim().match(/^<[a-z]/)) continue;
    // 跳过水平线
    if (line.trim().match(/^---+$/)) continue;

    // 提取纯文本内容
    const textContent = line.replace(/[*_`#\-\[\]()>]/g, '').trim();

    // 检查是否为纯英文且长度超过20字符
    if (textContent.length > 20 && /^[A-Za-z\s.,!?;:'"()]+$/.test(textContent)) {
      // 排除一些常见的英文标记
      if (!textContent.match(/^(NOTE|WARNING|IMPORTANT|TIP|TODO)/)) {
        untranslatedLines.push(i + 1);
      }
    }
  }

  if (untranslatedLines.length > 0) {
    console.log(`\n📄 ${path}`);
    console.log(`   可能未翻译的行数: ${untranslatedLines.length}`);

    // 显示前5个未翻译行的示例
    const samples = untranslatedLines.slice(0, 5);
    console.log(`   示例行 (${samples.length}/${untranslatedLines.length}):`);
    samples.forEach(lineNum => {
      const lineContent = lines[lineNum - 1].trim();
      const preview = lineContent.length > 80
        ? lineContent.substring(0, 80) + '...'
        : lineContent;
      console.log(`     ${lineNum}: ${preview}`);
    });

    if (untranslatedLines.length > 5) {
      console.log(`     ... 还有 ${untranslatedLines.length - 5} 行`);
    }
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log(`建议：`);
console.log(`1. 上述页面可能包含未翻译的英文段落`);
console.log(`2. 请人工检查这些页面的翻译质量`);
console.log(`3. 某些英文可能是代码示例、专有名词或技术术语，无需翻译`);
console.log(`4. 使用 markdown-i18n skill 批量翻译未完成的内容`);
console.log(`${'='.repeat(80)}`);
