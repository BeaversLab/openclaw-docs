#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const INPUT_YAML = path.join(process.cwd(), '.i18n/link-translations.yaml');
const OUTPUT_FILE = path.join(process.cwd(), '.i18n/untranslated-links.txt');

// 读取 YAML 并提取未翻译的链接
function extractUntranslatedLinks() {
  const yamlContent = fs.readFileSync(INPUT_YAML, 'utf8');
  const lines = yamlContent.split('\n');

  const untranslated = [];
  let currentFile = null;
  let currentLine = null;
  let currentText = null;
  let currentLink = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('- file:')) {
      currentFile = line.replace('- file:', '').trim();
    } else if (line.includes('line:')) {
      currentLine = line.replace(/.*line:\s*/, '').trim();
    } else if (line.includes('text:')) {
      const match = line.match(/text:\s*(.+)$/);
      if (match) {
        currentText = JSON.parse(match[1]);
      }
    } else if (line.includes('link:')) {
      const match = line.match(/link:\s*(.+)$/);
      if (match) {
        currentLink = JSON.parse(match[1]);
      }
    } else if (line.includes('translated: false')) {
      if (currentFile && currentLine && currentText) {
        // 判断是否是英文
        const isEnglish = /[a-zA-Z]{3,}/.test(currentText) && !/[\u4e00-\u9fa5]/.test(currentText);

        if (isEnglish) {
          untranslated.push({
            file: currentFile,
            line: currentLine,
            text: currentText,
            link: currentLink
          });
        }
      }
    }
  }

  return untranslated;
}

function main() {
  console.log('提取未翻译的链接...\n');

  const untranslated = extractUntranslatedLinks();

  console.log(`找到 ${untranslated.length} 个未翻译的英文链接\n`);

  // 生成文本文件
  let output = `# 未翻译的链接文本\n`;
  output += `# 生成时间: ${new Date().toISOString()}\n`;
  output += `# 总数: ${untranslated.length}\n\n`;
  output += `# 格式: 行号 | 文件路径 | 原文 | 链接\n\n`;

  // 按文件分组
  const byFile = {};
  untranslated.forEach(item => {
    if (!byFile[item.file]) {
      byFile[item.file] = [];
    }
    byFile[item.file].push(item);
  });

  Object.keys(byFile).sort().forEach(file => {
    output += `\n## ${file}\n\n`;
    byFile[file].forEach(item => {
      output += `${item.line} | "${item.text}" | ${item.link}\n`;
    });
  });

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

  console.log(`✓ 未翻译链接已保存到: ${OUTPUT_FILE}\n`);

  // 显示统计
  const textCounts = {};
  untranslated.forEach(item => {
    const key = item.text;
    textCounts[key] = (textCounts[key] || 0) + 1;
  });

  // 找出最常见的未翻译文本
  const sorted = Object.entries(textCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('最常见的 20 个未翻译文本：\n');
  sorted.forEach(([text, count], index) => {
    console.log(`${index + 1}. "${text}" (${count} 次)`);
  });
}

main();
