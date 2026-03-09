const fs = require('fs');

// 手动翻译映射表 - 精确匹配完整段落
const manualTranslations = {
  // Chunk 015
  "faq.md.chunk-015.md": {
    "### Can OpenClaw help with lead gen outreach ads and blogs for a SaaS":
      "### OpenClaw 能否帮助 SaaS 进行潜在客户开发、外联、广告和博客",

    "Yes for **research, qualification, and drafting**. It can scan sites, build shortlists, summarize prospects, and write outreach or ad copy drafts.":
      "可以用于**研究、资格筛选和起草**。它可以扫描网站、建立候选名单、总结潜在客户，并撰写外联或广告文案草稿。",

    "For **outreach or ad runs**, keep a human in the loop. Avoid spam, follow local laws and platform policies, and review anything before it is sent. The safest pattern is to let OpenClaw draft and you approve.":
      "对于**外联或广告投放**，请保持人工参与。避免垃圾邮件，遵守当地法律和平台政策，并在发送之前审查所有内容。最安全的模式是让 OpenClaw 起草，由您批准。",

    "Docs: [Security]%%P401%%.":
      "文档：[Security]%%P401%%。",

    "### What are the advantages vs Claude Code for web development":
      "### 与 Claude Code 相比，OpenClaw 在 Web 开发方面有什么优势",

    "OpenClaw is a **personal assistant** and coordination layer, not an IDE replacement. Use Claude Code or Codex for the fastest direct coding loop inside a repo. Use OpenClaw when you want durable memory, cross-device access, and tool orchestration.":
      "OpenClaw 是一个**个人助手**和协调层，而不是 IDE 的替代品。在代码库内部进行最快的直接编码循环时，请使用 Claude Code 或 Codex。当您需要持久记忆、跨设备访问和工具编排时，请使用 OpenClaw。",

    "Advantages:":
      "优势：",

    "- **Persistent memory + workspace** across sessions":
      "- **跨会话的持久记忆 + 工作区**",

    "- **Multi-platform access** (WhatsApp, Telegram, TUI, WebChat)":
      "- **多平台访问**（WhatsApp、Telegram、TUI、WebChat）",

    "- **Tool orchestration** (browser, files, scheduling, hooks)":
      "- **工具编排**（浏览器、文件、调度、钩子）",

    "- **Always-on Gateway** (run on a VPS, interact from anywhere)":
      "- **始终在线的 Gateway**（在 VPS 上运行，从任何地方交互）",

    "- **Nodes** for local browser/screen/camera/exec":
      "- 用于本地浏览器/屏幕/相机/执行的**节点**",

    "Showcase: https://openclaw.ai/showcase":
      "展示：https://openclaw.ai/showcase",

    "## Skills and automation":
      "## 技能和自动化",

    "### How do I customize skills without keeping the repo dirty":
      "### 如何自定义技能而不让仓库变脏",

    "Use managed overrides instead of editing the repo copy. Put your changes in %%P402%% (or add a folder via %%P403%% in %%P404%%). Precedence is %%P405%% > %%P406%% > bundled, so managed overrides win without touching git. Only upstream-worthy edits should live in the repo and go out as PRs.":
      "使用托管覆盖而不是编辑仓库副本。将您的更改放在 %%P402%% 中（或通过 %%P404%% 中的 %%P403%% 添加文件夹）。优先级是 %%P405%% > %%P406%% > 捆绑的，因此托管覆盖胜出而无需触及 git。只有值得上游合并的编辑才应该存在于仓库中并作为 PR 提交。",

    "### Can I load skills from a custom folder":
      "### 我可以从自定义文件夹加载技能吗",

    "Yes. Add extra directories via %%P407%% in %%P408%% (lowest precedence). Default precedence remains: %%P409%% → %%P410%% → bundled → %%P411%%. %%P412%% installs into %%P413%% by default, which OpenClaw treats as %%P414%%.":
      "可以。通过 %%P408%% 中的 %%P407%% 添加额外的目录（最低优先级）。默认优先级保持不变：%%P409%% → %%P410%% → 捆绑的 → %%P411%%。%%P412%% 默认安装到 %%P413%%，OpenClaw 将其视为 %%P414%%。",

    "### How can I use different models for different tasks":
      "### 如何为不同的任务使用不同的模型",

    "Today the supported patterns are:":
      "目前支持的模式有：",

    "- **Cron jobs**: isolated jobs can set a %%P415%% override per job.":
      "- **Cron 作业**：隔离的作业可以为每个作业设置 %%P415%% 覆盖。",

    "- **Sub-agents**: route tasks to separate agents with different default models.":
      "- **子代理**：将任务路由到具有不同默认模型的单独代理。",

    "- **On-demand switch**: use %%P416%% to switch the current session model at any time.":
      "- **按需切换**：使用 %%P416%% 随时切换当前会话模型。",

    "See [Cron jobs]%%P417%%, [Multi-Agent Routing]%%P418%%, and [Slash commands]%%P419%%.":
      "参见 [Cron jobs]%%P417%%、[Multi-Agent Routing]%%P418%% 和 [Slash commands]%%P419%%。"
  }
};

function translateFile(filePath, translations) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modifiedCount = 0;

  // 替换每个翻译条目
  for (const [english, chinese] of Object.entries(translations)) {
    const escapedEnglish = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedEnglish, 'g');

    if (regex.test(content)) {
      content = content.replace(regex, chinese);
      modifiedCount++;
      console.log(`  ✓ Translated: ${english.substring(0, 50)}...`);
    }
  }

  if (modifiedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Total: ${modifiedCount} translations in ${path.basename(filePath)}\n`);
    return true;
  }

  return false;
}

// 翻译 chunk-015
const chunk015 = '/Users/marco/Documents/git/github.com/BeaversLab/crawfish-docs/.i18n/chunks/faq.md.chunk-015.md';
console.log('Translating faq.md.chunk-015.md...\n');
translateFile(chunk015, manualTranslations['faq.md.chunk-015.md']);

console.log('=== Translation Complete ===');
