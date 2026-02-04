#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const INPUT_YAML = path.join(process.cwd(), '.i18n/link-translations.yaml');
const OUTPUT_YAML = path.join(process.cwd(), '.i18n/link-translations.yaml');

// 判断文本是否包含英文（简单判断：包含英文字母且不是纯中文）
function isEnglishText(text) {
  // 排除纯代码、URL、数字
  if (/^`[^`]+`$/.test(text)) return false; // 代码块
  if (/^https?:\/\//.test(text)) return false; // URL
  if (/^[\d\s\W]+$/.test(text)) return false; // 纯符号数字

  // 检查是否包含英文字母（排除已经翻译的中文）
  const hasEnglish = /[a-zA-Z]{3,}/.test(text);
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);

  // 如果有英文且没有中文，或者是中英混合但英文占主导
  if (hasEnglish && !hasChinese) return true;

  return false;
}

// 翻译英文文本到中文
function translateText(text) {
  // 常见翻译映射表（可以扩展）
  const translations = {
    // 基础词汇
    'Install': '安装',
    'Installation': '安装',
    'Setup': '设置',
    'Configuration': '配置',
    'Configure': '配置',
    'Getting Started': '入门指南',
    'Quick Start': '快速开始',
    'Guide': '指南',
    'Guides': '指南',
    'Tutorial': '教程',
    'Tutorials': '教程',
    'Documentation': '文档',
    'Docs': '文档',
    'Reference': '参考',
    'API Reference': 'API 参考',
    'Overview': '概述',
    'Introduction': '简介',
    'Usage': '用法',
    'Examples': '示例',
    'Example': '示例',
    'Troubleshooting': '故障排查',
    'FAQ': '常见问题',
    'Changelog': '变更日志',
    'Release Notes': '发布说明',
    'Requirements': '要求',
    'Dependencies': '依赖',
    'Development': '开发',
    'Testing': '测试',
    'Building': '构建',
    'Deployment': '部署',
    'Upgrade': '升级',
    'Update': '更新',
    'Migration': '迁移',
    'Migration Guide': '迁移指南',

    // CLI 相关
    'CLI': 'CLI',
    'Command': '命令',
    'Commands': '命令',
    'Flags': '标志',
    'Options': '选项',
    'Arguments': '参数',
    'Parameters': '参数',

    // 概念
    'Concepts': '概念',
    'Architecture': '架构',
    'Components': '组件',
    'Features': '特性',
    'Workflow': '工作流',
    'Authentication': '认证',
    'Authorization': '授权',
    'Security': '安全',
    'Performance': '性能',
    'Optimization': '优化',

    // 平台和环境
    'Platforms': '平台',
    'Environment': '环境',
    'Production': '生产环境',
    'Development': '开发环境',
    'Staging': '预发布环境',

    // 工具
    'Tools': '工具',
    'Plugins': '插件',
    'Extensions': '扩展',
    'Integrations': '集成',
    'Providers': '提供商',
    'Services': '服务',

    // 通道
    'Channels': '通道',
    'Channel': '通道',
    'Integration': '集成',

    // 代理和会话
    'Agent': 'Agent',
    'Agents': 'Agent',
    'Session': '会话',
    'Sessions': '会话',
    'Context': '上下文',
    'Memory': '记忆',
    'Model': '模型',
    'Models': '模型',

    // 网关和节点
    'Gateway': 'Gateway',
    'Node': '节点',
    'Nodes': '节点',

    // 时间和任务
    'Schedule': '计划',
    'Scheduling': '调度',
    'Tasks': '任务',
    'Jobs': '作业',
    'Cron': 'Cron',
    'Heartbeat': 'Heartbeat',

    // 其他
    'Advanced': '高级',
    'Basic': '基础',
    'Intermediate': '中级',
    'Best Practices': '最佳实践',
    'Tips': '技巧',
    'Tricks': '技巧',
    'Notes': '注意事项',
    'Warning': '警告',
    'Error': '错误',
    'Issues': '问题',
    'Debug': '调试',
    'Logging': '日志',
    'Monitoring': '监控',
  };

  // 直接匹配
  if (translations[text]) {
    return translations[text];
  }

  // 尝试部分匹配和组合翻译
  let result = text;

  // 按长度降序排序，避免短词优先匹配
  const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    result = result.replace(regex, translations[key]);
  }

  // 如果翻译后没有变化，返回原文标记
  if (result === text) {
    return null; // 无法翻译
  }

  return result;
}

// 在文件中替换链接文本
function replaceLinkInFile(filePath, lineNum, oldText, newText) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  if (lineNum < 1 || lineNum > lines.length) {
    return { success: false, error: 'Line number out of range' };
  }

  const line = lines[lineNum - 1];

  // 替换 [oldText]( 为 [newText](
  const oldPattern = `[${oldText}](`;
  const newPattern = `[${newText}](`;

  if (!line.includes(oldPattern)) {
    return { success: false, error: 'Pattern not found in line' };
  }

  lines[lineNum - 1] = line.replace(oldPattern, newPattern);

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  return { success: true };
}

function main() {
  console.log('读取链接翻译文件...\n');

  const yamlContent = fs.readFileSync(INPUT_YAML, 'utf8');

  // 手动解析 YAML（因为可能没有 js-yaml 依赖）
  const lines = yamlContent.split('\n');
  const data = [];
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('- file:')) {
      if (currentItem) {
        data.push(currentItem);
      }
      currentItem = {
        file: line.replace('- file:', '').trim(),
        links: []
      };
    } else if (line.startsWith('      text:') && currentItem) {
      const textMatch = line.match(/text:\s*(.+)$/);
      if (textMatch) {
        // 读取下一个 link 行
        const nextLine = lines[i + 1];
        const linkMatch = nextLine ? nextLine.match(/link:\s*(.+)$/) : null;

        // 读取 translated 行
        const translatedLine = lines[i + 2];
        const translatedMatch = translatedLine ? translatedLine.match(/translated:\s*(.+)$/) : null;

        if (textMatch && linkMatch) {
          // 解析 JSON 字符串
          const text = JSON.parse(textMatch[1]);
          const link = JSON.parse(linkMatch[1]);
          const translated = translatedMatch ? translatedMatch[1].trim() === 'true' : false;

          currentItem.links.push({
            line: parseInt(lines[i - 1].replace(/.*line:\s*/, '')),
            text: text,
            link: link,
            translated: translated
          });
        }
      }
    }
  }

  if (currentItem) {
    data.push(currentItem);
  }

  console.log(`找到 ${data.length} 个文件\n`);

  let totalProcessed = 0;
  let totalTranslated = 0;
  let totalSkipped = 0;
  let totalError = 0;

  for (const fileData of data) {
    const filePath = fileData.file;
    const fullPath = path.join(process.cwd(), filePath);

    console.log(`处理: ${filePath}`);

    let fileTranslated = 0;

    for (const linkData of fileData.links) {
      if (linkData.translated) {
        totalSkipped++;
        continue;
      }

      totalProcessed++;
      const text = linkData.text;

      if (!isEnglishText(text)) {
        totalSkipped++;
        linkData.translated = true; // 标记为已处理（非英文）
        continue;
      }

      // 翻译
      const translated = translateText(text);

      if (!translated) {
        console.log(`  ⚠️  行 ${linkData.line}: 无法翻译 "${text}"`);
        totalSkipped++;
        continue;
      }

      // 替换
      const result = replaceLinkInFile(fullPath, linkData.line, text, translated);

      if (result.success) {
        console.log(`  ✓ 行 ${linkData.line}: "${text}" → "${translated}"`);
        linkData.translated = true;
        fileTranslated++;
        totalTranslated++;
      } else {
        console.log(`  ✗ 行 ${linkData.line}: 替换失败 - ${result.error}`);
        totalError++;
      }
    }

    if (fileTranslated > 0) {
      console.log(`  → 共翻译 ${fileTranslated} 个链接\n`);
    }
  }

  // 保存更新后的 YAML
  let outputYaml = `# 链接翻译扫描结果\n`;
  outputYaml += `# 更新时间: ${new Date().toISOString()}\n`;
  outputYaml += `#\n`;

  data.forEach(item => {
    outputYaml += `- file: ${item.file}\n`;
    outputYaml += `  links:\n`;
    item.links.forEach(link => {
      outputYaml += `    - line: ${link.line}\n`;
      outputYaml += `      text: ${JSON.stringify(link.text)}\n`;
      outputYaml += `      link: ${JSON.stringify(link.link)}\n`;
      outputYaml += `      translated: ${link.translated}\n`;
    });
    outputYaml += `\n`;
  });

  fs.writeFileSync(OUTPUT_YAML, outputYaml, 'utf8');

  console.log('\n' + '='.repeat(50));
  console.log('翻译完成！');
  console.log('='.repeat(50));
  console.log(`总计处理: ${totalProcessed}`);
  console.log(`成功翻译: ${totalTranslated}`);
  console.log(`跳过: ${totalSkipped}`);
  console.log(`错误: ${totalError}`);
  console.log(`\n更新的 YAML 已保存到: ${OUTPUT_YAML}`);
}

main();
