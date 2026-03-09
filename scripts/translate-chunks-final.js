const fs = require('fs');
const path = require('path');

// 常见翻译规则
const translationRules = [
  // 标题和问题
  [/^### (Can|How|What|Where|When|Why|Which|Who)/, (match) => {
    const questions = {
      "Can": "可以",
      "How": "如何",
      "What": "什么",
      "Where": "哪里",
      "When": "何时",
      "Why": "为什么",
      "Which": "哪个",
      "Who": "谁"
    };
    return match.replace(/^### (Can|How|What|Where|When|Why|Which|Who)/, (m, key) => `### ${questions[key]}`);
  }],

  // 常见术语
  { pattern: /\bpersonal assistant\b/g, replacement: "个人助手" },
  { pattern: /\bcoordination layer\b/g, replacement: "协调层" },
  { pattern: /\bIDE replacement\b/g, replacement: "IDE 替代品" },
  { pattern: /\bdurable memory\b/g, replacement: "持久记忆" },
  { pattern: /\bcross-device access\b/g, replacement: "跨设备访问" },
  { pattern: /\btool orchestration\b/g, replacement: "工具编排" },
  { pattern: /\bMulti-platform access\b/g, replacement: "多平台访问" },
  { pattern: /\bPersistent memory\b/g, replacement: "持久记忆" },
  { pattern: /\bAlways-on Gateway\b/g, replacement: "始终在线的 Gateway" },
  { pattern: /\bSkills and automation\b/g, replacement: "技能和自动化" },
  { pattern: /\bCron jobs\b/g, replacement: "Cron 作业" },
  { pattern: /\bSub-agents\b/g, replacement: "子代理" },
  { pattern: /\bOn-demand switch\b/g, replacement: "按需切换" },

  // 常见动词和短语
  { pattern: /\bHow do I\b/g, replacement: "我如何" },
  { pattern: /\bWhat are\b/g, replacement: "什么是" },
  { pattern: /\bWhat is\b/g, replacement: "什么是" },
  { pattern: /\bWhere should I\b/g, replacement: "我应该在哪里" },
  { pattern: /\bCan I\b/g, replacement: "我可以" },
  { pattern: /\bCan OpenClaw\b/g, replacement: "OpenClaw 能否" },
  { pattern: /\buse\b/g, replacement: "使用" },
  { pattern: /\brun\b/g, replacement: "运行" },
  { pattern: /\bset\b/g, replacement: "设置" },
  { pattern: /\bkeep\b/g, replacement: "保持" },
  { pattern: /\bget\b/g, replacement: "获取" },
  { pattern: /\bmake\b/g, replacement: "使" },
  { pattern: /\bhelp\b/g, replacement: "帮助" },
  { pattern: /\bwork\b/g, replacement: "工作" },
  { pattern: /\bneed\b/g, replacement: "需要" },
  { pattern: /\bwant\b/g, replacement: "想要" },

  // 保留占位符的翻译
  { pattern: /%%P\d+%%/g, replacement: (match) => match }, // 保持占位符不变
  { pattern: /%%CB_[a-f0-9]+%%/g, replacement: (match) => match }, // 保持代码块占位符不变
];

function translateBlock(text) {
  let translated = text;

  // 应用所有翻译规则
  for (const rule of translationRules) {
    if (rule instanceof RegExp) {
      // 这是一个正则表达式规则
      // 跳过，因为我们使用对象形式
    } else if (rule.pattern && rule.replacement) {
      translated = translated.replace(rule.pattern, rule.replacement);
    }
  }

  return translated;
}

function translateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modifiedCount = 0;

  // 提取并翻译每个 i18n:todo 块
  content = content.replace(
    /<!-- i18n:todo -->([\s\S]*?)<!-- \/i18n:todo -->/g,
    (match, innerContent) => {
      const trimmed = innerContent.trim();
      if (trimmed.length === 0) return match;

      const translated = translateBlock(trimmed);
      const wasModified = translated !== trimmed;

      if (wasModified) {
        modifiedCount++;
        return `<!-- i18n:todo -->\n${translated}\n<!-- /i18n:todo -->`;
      }

      return match;
    }
  );

  if (modifiedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Translated ${modifiedCount} blocks in ${path.basename(filePath)}`);
    return true;
  } else {
    console.log(`  No translations in ${path.basename(filePath)}`);
    return false;
  }
}

// 由于这是一个演示版本，我们只处理几个文件来测试
const chunksDir = '/Users/marco/Documents/git/github.com/BeaversLab/crawfish-docs/.i18n/chunks';
console.log('Starting rule-based translation...\n');
console.log('Note: This is a basic rule-based translator. For production use, manual review is recommended.\n');

// 只处理 chunk-015 作为测试
const testFile = path.join(chunksDir, 'faq.md.chunk-015.md');
if (fs.existsSync(testFile)) {
  console.log(`Processing: ${path.basename(testFile)}`);
  translateFile(testFile);
}

console.log('\n=== Test Complete ===');
console.log('Review the translated file and adjust rules as needed.');
