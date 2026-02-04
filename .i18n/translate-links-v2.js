#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const INPUT_YAML = path.join(process.cwd(), '.i18n/link-translations.yaml');
const OUTPUT_YAML = path.join(process.cwd(), '.i18n/link-translations.yaml');

// 扩展翻译映射表 - 按优先级排序（长的在前）
const translations = {
  // === 组合短语 ===
  'Gateway configuration': 'Gateway 配置',
  'Gateway security': 'Gateway 安全',
  'Gateway troubleshooting': 'Gateway 故障排查',
  'Slash commands': '斜杠命令',
  'Remote access': '远程访问',
  'Cron jobs': 'Cron 作业',
  'Agent workspace': 'Agent 工作区',
  'Agent send': 'Agent 发送',
  'Multi-Agent Routing': '多 Agent 路由',
  'Channel troubleshooting': '通道故障排查',
  'Model Providers': '模型提供商',
  'Getting Started': '入门指南',
  'Channel Configuration': '通道配置',

  // === 配置和设置 ===
  'Configuration': '配置',
  'Configure': '配置',
  'Setup': '设置',
  'Installation': '安装',
  'Install': '安装',
  'Updating': '更新',
  'Update': '更新',
  'Upgrade': '升级',

  // === 安全和认证 ===
  'Authentication': '认证',
  'Authorization': '授权',
  'Security': '安全',
  'Sandboxing': '沙盒隔离',
  'Sandbox': '沙盒',

  // === 工具和功能 ===
  'Tools': '工具',
  'Plugins': '插件',
  'Extensions': '扩展',
  'Integrations': '集成',
  'Channels': '通道',
  'Channel': '通道',
  'Nodes': '节点',
  'Node': '节点',
  'Sessions': '会话',
  'Session': '会话',
  'Agent': 'Agent',
  'Agents': 'Agent',
  'Model': '模型',
  'Models': '模型',

  // === 诊断和调试 ===
  'Doctor': '诊断',
  'Troubleshooting': '故障排查',
  'Debug': '调试',
  'Logging': '日志',
  'Monitoring': '监控',
  'Diagnostics': '诊断',

  // === 网络和连接 ===
  'Network': '网络',
  'Connection': '连接',
  'Pairing': '配对',
  'Discovery': '发现',
  'Bridge': '桥接',

  // === 任务和调度 ===
  'Tasks': '任务',
  'Jobs': '作业',
  'Scheduling': '调度',
  'Schedule': '计划',
  'Automation': '自动化',

  // === 文档类型 ===
  'Guide': '指南',
  'Guides': '指南',
  'Tutorial': '教程',
  'Tutorials': '教程',
  'Reference': '参考',
  'Overview': '概述',
  'Introduction': '简介',
  'Examples': '示例',
  'Example': '示例',
  'Documentation': '文档',
  'Docs': '文档',
  'Changelog': '变更日志',
  'Release Notes': '发布说明',
  'FAQ': '常见问题',
  'Requirements': '要求',
  'Dependencies': '依赖',

  // === 开发和部署 ===
  'Development': '开发',
  'Building': '构建',
  'Deployment': '部署',
  'Testing': '测试',
  'Production': '生产环境',
  'Staging': '预发布环境',

  // === 性能和优化 ===
  'Performance': '性能',
  'Optimization': '优化',
  'Advanced': '高级',
  'Basic': '基础',

  // === 其他概念 ===
  'Concepts': '概念',
  'Architecture': '架构',
  'Components': '组件',
  'Features': '特性',
  'Workflow': '工作流',
  'Context': '上下文',
  'Memory': '记忆',
  'Usage': '用法',
  'Options': '选项',
  'Parameters': '参数',
  'Arguments': '参数',
  'Commands': '命令',
  'Command': '命令',
  'Flags': '标志',

  // === 平台和提供商标识符（保持英文）===
  // 这些会通过 isKeepEnglish 函数过滤掉
};

// 保持英文的专有名词和品牌
const keepEnglishList = [
  'Tailscale', 'Docker', 'WhatsApp', 'Telegram', 'Discord',
  'iMessage', 'Signal', 'Mattermost', 'Google Chat', 'Slack',
  'Matrix', 'LINE', 'Nextcloud', 'Twitch', 'Zalo', 'Nostr', 'Tlon',
  'MiniMax', 'Moonshot', 'Anthropic', 'OpenAI', 'Google', 'Azure',
  'Vercel', 'Hetzner', 'Oracle', 'DigitalOcean', 'Fly', 'GCP',
  'OpenRouter', 'Venice', 'Qwen', 'GLM', 'Zai', 'Vercel AI Gateway',
  'BlueBubbles', 'Webhooks', 'OAuth', 'API', 'CLI', 'RPC', 'JSON',
  'RSC', 'Lobster', 'Heartbeat', 'Cron', 'Tailscale', 'exe.dev',
  'hot.at', 'giffgaff', 'gogcli.sh', 'tailscale.com', 'bluebubbles.app',
  'mattermost.com', 'grammY', '@steipete', '@badlogicc',
];

function isKeepEnglish(text) {
  // 检查是否是路径（以 / 开头）
  if (text.startsWith('/')) return true;

  // 检查是否是 URL
  if (text.startsWith('http')) return true;

  // 检查是否包含域名
  if (/\.(com|app|dev|ai|org|io|sh)\b/.test(text)) return true;

  // 检查是否在保持英文列表中
  for (const keyword of keepEnglishList) {
    if (text.includes(keyword)) return true;
  }

  return false;
}

function translateText(text) {
  // 检查是否应该保持英文
  if (isKeepEnglish(text)) {
    return null; // 保持原文
  }

  // 尝试完全匹配
  if (translations[text]) {
    return translations[text];
  }

  // 尝试短语组合翻译（按长度降序）
  let result = text;
  let hasTranslation = false;

  // 按长度降序排序，优先匹配长的短语
  const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const match = result.match(regex);
    if (match) {
      result = result.replace(regex, translations[key]);
      hasTranslation = true;
    }
  }

  if (hasTranslation && result !== text) {
    return result;
  }

  // 无法翻译
  return null;
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
    } else if (line.includes('line:')) {
      // 读取后续几行
      const lineNum = line.replace(/.*line:\s*/, '').trim();
      const textLine = lines[i + 1];
      const linkLine = lines[i + 2];
      const translatedLine = lines[i + 3];

      if (textLine && linkLine && translatedLine) {
        const textMatch = textLine.match(/text:\s*(.+)$/);
        const linkMatch = linkLine.match(/link:\s*(.+)$/);
        const translatedMatch = translatedLine.match(/translated:\s*(.+)$/);

        if (textMatch && linkMatch) {
          try {
            const text = JSON.parse(textMatch[1]);
            const link = JSON.parse(linkMatch[1]);
            const translated = translatedMatch ? translatedMatch[1].trim() === 'true' : false;

            currentItem.links.push({
              line: parseInt(lineNum),
              text: text,
              link: link,
              translated: translated
            });
          } catch (e) {
            // 跳过解析错误的行
            console.error(`解析错误: ${textMatch[1]}`);
          }
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
  let totalKeepEnglish = 0;

  for (const fileData of data) {
    const filePath = fileData.file;
    const fullPath = path.join(process.cwd(), filePath);

    let fileTranslated = 0;

    for (const linkData of fileData.links) {
      if (linkData.translated) {
        totalSkipped++;
        continue;
      }

      totalProcessed++;
      const text = linkData.text;

      // 检查是否应该保持英文
      if (isKeepEnglish(text)) {
        totalKeepEnglish++;
        linkData.translated = true; // 标记为已处理
        continue;
      }

      // 翻译
      const translated = translateText(text);

      if (!translated) {
        totalSkipped++;
        continue;
      }

      // 替换
      const result = replaceLinkInFile(fullPath, linkData.line, text, translated);

      if (result.success) {
        fileTranslated++;
        totalTranslated++;
        linkData.translated = true;
      }
    }

    if (fileTranslated > 0) {
      console.log(`✓ ${filePath}: ${fileTranslated} 个链接`);
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
  console.log(`保持英文: ${totalKeepEnglish}`);
  console.log(`跳过: ${totalSkipped}`);
  console.log(`\n更新的 YAML 已保存`);
}

main();
