#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ZH_DIR = path.join(process.cwd(), 'zh');
const OUTPUT_FILE = path.join(process.cwd(), '.i18n/link-translations.yaml');

function findMarkdownFiles(dir) {
  const files = [];

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

function extractLinksFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const links = [];

  // 正则匹配 [text](link) 格式
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  lines.forEach((line, index) => {
    let match;
    // 重置正则表达式的 lastIndex
    linkRegex.lastIndex = 0;

    while ((match = linkRegex.exec(line)) !== null) {
      const [fullMatch, text, link] = match;
      links.push({
        line: index + 1,
        text: text,
        link: link,
        fullMatch: fullMatch
      });
    }
  });

  return links;
}

function main() {
  console.log(`扫描目录: ${ZH_DIR}`);
  console.log('正在查找 .md 和 .mdx 文件...\n');

  const files = findMarkdownFiles(ZH_DIR);
  console.log(`找到 ${files.length} 个 Markdown 文件\n`);

  const results = [];

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    const links = extractLinksFromFile(file);

    if (links.length > 0) {
      results.push({
        file: relativePath,
        links: links
      });
      console.log(`✓ ${relativePath}: ${links.length} 个链接`);
    }
  }

  // 生成 YAML 格式输出
  let yaml = `# 链接翻译扫描结果\n`;
  yaml += `# 生成时间: ${new Date().toISOString()}\n`;
  yaml += `#\n`;
  yaml += `# 格式说明:\n`;
  yaml += `# - file: 文件路径\n`;
  yaml += `# - links: 链接列表\n`;
  yaml += `#   - line: 行号\n`;
  yaml += `#   - text: 链接显示文本\n`;
  yaml += `#   - link: 链接地址\n`;
  yaml += `#   - translated: 是否已翻译 (true/false)\n`;
  yaml += `\n`;

  results.forEach(item => {
    yaml += `- file: ${item.file}\n`;
    yaml += `  links:\n`;
    item.links.forEach(link => {
      yaml += `    - line: ${link.line}\n`;
      yaml += `      text: ${JSON.stringify(link.text)}\n`;
      yaml += `      link: ${JSON.stringify(link.link)}\n`;
      yaml += `      translated: false\n`;
    });
    yaml += `\n`;
  });

  fs.writeFileSync(OUTPUT_FILE, yaml, 'utf8');
  console.log(`\n✓ 扫描完成！`);
  console.log(`✓ 结果已保存到: ${OUTPUT_FILE}`);
  console.log(`\n统计:`);
  console.log(`  - 文件数: ${results.length}`);
  console.log(`  - 总链接数: ${results.reduce((sum, item) => sum + item.links.length, 0)}`);
}

main();
