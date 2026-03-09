const fs = require('fs');
const path = require('path');

// 简化的翻译映射 - 只包含最常见的短语
const commonTranslations = {
  // 基础短语
  "OpenClaw is a personal AI assistant you run on your own devices. It replies on the messaging surfaces you already use (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) and can also do voice + a live Canvas on supported platforms. The **Gateway** is the always-on control plane; the assistant is the product.":
    "OpenClaw 是一个运行在您自己设备上的个人 AI 助手。它在您已经使用的消息平台上回复（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat），并且可以在支持的平台上进行语音对话和实时 Canvas。**Gateway** 是始终在线的控制平面；助手就是产品本身。",

  "OpenClaw is not just a Claude wrapper":
    "OpenClaw 不仅仅是一个 Claude 包装器",

  "OpenClaw is not \\\"just a Claude wrapper\\\". It\\'s a \\*\\*local-first control plane\\*\\* that lets you run a capable assistant on \\*\\*your own hardware\\*\\*, reachable from the chat apps you already use, with stateful sessions, memory, and tools - without handing control of your workflows to a hosted SaaS.":
    "OpenClaw 不仅仅是一个 Claude 包装器。它是一个本地优先的控制平面，让您可以在自己的硬件上运行功能强大的助手，从您已经使用的聊天应用程序访问，具有有状态会话、记忆和工具功能，而无需将工作流程的控制权交给托管的 SaaS。",

  "Highlights:":
    "亮点：",

  "Your devices, your data":
    "您的设备，您的数据",

  "Real channels, not a web sandbox":
    "真实渠道，而不是 Web 沙箱",

  "Model-agnostic":
    "模型无关",

  "Local-only option":
    "仅本地选项",

  "all data can stay on your device":
    "所有数据都可以保留在您的设备上",

  "Multi-agent routing":
    "多代理路由",

  "Open source and hackable":
    "开源且可定制",

  "Good first projects":
    "不错的入门项目",

  "Build a website":
    "构建一个网站",

  "Prototype a mobile app":
    "制作移动应用原型",

  "Organize files and folders":
    "整理文件和文件夹",

  "Connect Gmail and automate summaries or follow ups":
    "连接 Gmail 并自动生成摘要或跟进",

  "What are the top five everyday use cases for OpenClaw":
    "OpenClaw 的五大日常使用场景是什么",

  "Everyday wins usually look like":
    "日常优势通常包括",

  "Personal briefings":
    "个人简报",

  "Research and drafting":
    "研究和起草",

  "Reminders and follow ups":
    "提醒和跟进",

  "Browser automation":
    "浏览器自动化",

  "Cross device coordination":
    "跨设备协调",

  "send a task from your phone, let the Gateway run it on a server, and get the result back in chat":
    "从手机发送任务，让 Gateway 在服务器上运行，并在聊天中获取结果",

  "Can OpenClaw help with lead gen outreach ads and blogs for a SaaS":
    "OpenClaw 能否帮助 SaaS 进行潜在客户开发、外联、广告和博客",

  "research, qualification, and drafting":
    "研究、资格筛选和起草",

  "outreach or ad runs":
    "外联或广告投放",

  "What are the advantages vs Claude Code for web development":
    "与 Claude Code 相比，OpenClaw 在 Web 开发方面有什么优势",

  "personal assistant":
    "个人助手",

  "coordination layer":
    "协调层",

  "IDE replacement":
    "IDE 替代品",

  "Persistent memory + workspace":
    "持久记忆 + 工作区",

  "Multi-platform access":
    "多平台访问",

  "Tool orchestration":
    "工具编排",

  "Always-on Gateway":
    "始终在线的 Gateway",

  "Skills and automation":
    "技能和自动化",

  "How do I customize skills without keeping the repo dirty":
    "如何自定义技能而不让仓库变脏",

  "Use managed overrides instead of editing the repo copy":
    "使用托管覆盖而不是编辑仓库副本",

  "Can I load skills from a custom folder":
    "我可以从自定义文件夹加载技能吗",

  "How can I use different models for different tasks":
    "如何为不同的任务使用不同的模型",

  "Cron jobs":
    "Cron 作业",

  "Sub-agents":
    "子代理",

  "On-demand switch":
    "按需切换",

  "The bot freezes while doing heavy work How do I offload that":
    "机器人在执行繁重工作时冻结了，如何卸载这些工作",

  "Ask your bot to spawn a sub-agent for this task":
    "让您的机器人为此任务生成一个子代理",

  "Cron or reminders do not fire What should I check":
    "Cron 或提醒没有触发，我应该检查什么",

  "Cron runs inside the Gateway process":
    "Cron 在 Gateway 进程内运行",

  "Checklist":
    "检查清单",

  "How do I install skills on Linux":
    "如何在 Linux 上安装技能",

  "Browse skills at":
    "在以下位置浏览技能",

  "Can OpenClaw run tasks on a schedule or continuously in the background":
    "OpenClaw 可以按计划或在后台连续运行任务吗",

  "Can I run Apple macOS only skills from Linux":
    "我可以从 Linux 运行仅限 Apple macOS 的技能吗",

  "Do you have a Notion or HeyGen integration":
    "您是否有 Notion 或 HeyGen 集成",

  "Not built-in today":
    "目前没有内置",

  "Custom skill / plugin":
    "自定义技能/插件",

  "If you want to keep context per client":
    "如果您想为每个客户端保持上下文",

  "How do I install the Chrome extension for browser takeover":
    "如何安装 Chrome 扩展程序以接管浏览器",

  "What are the system requirements":
    "系统要求是什么",

  "Where should I host the Gateway local vs VPS":
    "我应该在哪里托管 Gateway：本地还是 VPS",

  "Both work. Choose based on how you use OpenClaw":
    "两者都可以。根据您使用 OpenClaw 的方式选择",

  "VPS advantages":
    "VPS 优势",

  "Always-on":
    "始终在线",

  "Accessible from anywhere":
    "可从任何地方访问",

  "Local advantages":
    "本地优势",

  "Direct file access":
    "直接文件访问",

  "Visible browser":
    "可见浏览器",

  "Lower latency":
    "更低的延迟",

  "Data never leaves your machine":
    "数据永远不会离开您的机器",

  "How important is it to run OpenClaw on a dedicated machine":
    "在专用机器上运行 OpenClaw 有多重要",

  "recommended for reliability and isolation":
    "为了可靠性和隔离性而推荐",

  "Dedicated host":
    "专用主机",

  "Shared laptop/desktop":
    "共享笔记本电脑/台式机",

  "What are the minimum VPS requirements and recommended OS":
    "最低 VPS 要求和推荐的操作系统是什么",

  "OpenClaw is lightweight":
    "OpenClaw 是轻量级的",

  "Absolute minimum":
    "绝对最低要求",

  "Can I run OpenClaw in a VM and what are the requirements":
    "我可以在 VM 中运行 OpenClaw 吗，有什么要求",

  "Treat a VM the same as a VPS":
    "将 VM 视为与 VPS 相同",

  "Baseline guidance":
    "基本指导",

  "WSL2 is the easiest VM style setup":
    "WSL2 是最简单的 VM 风格设置",

  "What is OpenClaw":
    "什么是 OpenClaw",

  "What is OpenClaw in one paragraph":
    "用一段话描述 OpenClaw",

  "Instead of a web-only chat UI":
    "而不是仅限 Web 的聊天 UI",

  "it integrates with the messaging apps and platforms you already use":
    "它与您已经使用的消息应用程序和平台集成",

  "think of it as the":
    "将其视为",

  "server piece":
    "服务器部分",

  "give it direct access to local resources":
    "使其能够直接访问本地资源",

  "files, browser windows, and cameras":
    "文件、浏览器窗口和相机",

  "designed for stateful, long-running sessions":
    "专为有状态的长时间会话而设计",

  "durable memory and tools":
    "持久的记忆和工具",

  "hardware you control":
    "您控制的硬件",

  "hosted SaaS":
    "托管的 SaaS",

  "connect from anywhere":
    "从任何地方连接",

  "### What's the value proposition":
    "### 有什么价值主张",

  "### I just set it up what should I do first":
    "### 我刚设置好，首先应该做什么",

  "### Can I run OpenClaw in a VM and what are the requirements":
    "### 我可以在 VM 中运行 OpenClaw 吗，有什么要求",

  "## What is OpenClaw?":
    "## 什么是 OpenClaw？",

  "Use the built-in installer, then load the unpacked extension in Chrome":
    "使用内置安装程序，然后在 Chrome 中加载解压的扩展程序",

  "Docs:":
    "文档：",

  "See":
    "参见",

  "Yes. Use the Gateway scheduler":
    "可以。使用 Gateway 调度程序",

  "Run the Gateway where the macOS binaries exist":
    "在存在 macOS 二进制文件的地方运行 Gateway",

  "then connect from Linux in":
    "然后通过以下方式从 Linux 连接",

  "remote mode":
    "远程模式",

  "or over Tailscale":
    "或通过 Tailscale",

  "The skills load normally because the Gateway host is macOS":
    "技能正常加载，因为 Gateway 主机是 macOS",

  "Run the Gateway on Linux, pair a macOS node":
    "在 Linux 上运行 Gateway，配对一个 macOS 节点",

  "and set":
    "并将",

  "to":
    "设置为",

  "Always Ask":
    "始终询问",

  "or Always Allow":
    "或始终允许",

  "on the Mac":
    "在 Mac 上",

  "OpenClaw can treat macOS-only skills as eligible":
    "OpenClaw 可以将仅限 macOS 的技能视为有资格",

  "when the required binaries exist on the node":
    "当节点上存在所需的二进制文件时",

  "The agent runs those skills via the":
    "代理通过以下工具运行这些技能",

  "tool":
    "工具",

  "If you choose":
    "如果您选择",

  "approving":
    "批准",

  "in the prompt adds that command to the allowlist":
    "会在提示中将该命令添加到允许列表",

  "Keep the Gateway on Linux":
    "将 Gateway 保留在 Linux 上",

  "but make the required CLI binaries resolve to SSH wrappers":
    "但使所需的 CLI 二进制文件解析为 SSH 包装器",

  "that run on a Mac":
    "在 Mac 上运行",

  "Then override the skill to allow Linux":
    "然后覆盖技能以允许 Linux",

  "so it stays eligible":
    "使其保持有资格",

  "Create an SSH wrapper for the binary":
    "为二进制文件创建 SSH 包装器",

  "for Apple Notes":
    "用于 Apple Notes",

  "Put the wrapper on":
    "将包装器放在",

  "on the Linux host":
    "在 Linux 主机上",

  "for example":
    "例如",

  "Override the skill metadata":
    "覆盖技能元数据",

  "workspace or":
    "工作区或",

  "to allow Linux":
    "以允许 Linux",

  "Start a new session so the skills snapshot refreshes":
    "启动新会话以刷新技能快照",

  "best for reliable API access":
    "最适合可靠的 API 访问",

  "both have APIs":
    "都有 API",

  "works without code but is slower and more fragile":
    "无需代码即可工作，但速度较慢且更脆弱",

  "agency workflows":
    "代理机构工作流程",

  "a simple pattern is":
    "一个简单的模式是",

  "One Notion page per client":
    "每个客户端一个 Notion 页面",

  "context + preferences + active work":
    "上下文 + 偏好 + 活跃工作",

  "Ask the agent to fetch that page at the start of a session":
    "让代理在会话开始时获取该页面",

  "If you want a native integration":
    "如果您想要原生集成",

  "open a feature request or build a skill targeting those APIs":
    "请打开功能请求或构建针对这些 API 的技能",

  "under your current directory":
    "在当前目录下",

  "or falls back to your configured OpenClaw workspace":
    "或回退到您配置的 OpenClaw 工作区",

  "on the next session":
    "在下一个会话中",

  "For shared skills across agents":
    "要在代理之间共享技能",

  "place them in":
    "请将它们放在",

  "Some skills expect binaries installed via Homebrew":
    "某些技能期望通过 Homebrew 安装二进制文件",

  "on Linux that means Linuxbrew":
    "在 Linux 上，这意味着 Linuxbrew",

  "see the":
    "请参阅",

  "FAQ entry above":
    "上面的 FAQ 条目",

  "Full guide":
    "完整指南",

  "including remote Gateway + security notes":
    "包括远程 Gateway + 安全说明",

  "Ubuntu 20.04+":
    "Ubuntu 20.04+",

  "or any modern Linux":
    "或任何现代 Linux",

  "Windows is supported via WSL2":
    "Windows 通过 WSL2 支持",

  "minimum":
    "最低",

  "recommended for comfort":
    "建议以确保舒适",

  "especially if using browser tools":
    "尤其是使用浏览器工具时",

  "for the core install":
    "核心安装",

  "more for logs and media":
    "日志和媒体需要更多空间",

  "stable internet for LLM API calls":
    "用于 LLM API 调用的稳定互联网",

  "Run on macOS, Linux, or via WSL2 on Windows":
    "在 macOS、Linux 或 Windows 上的 WSL2 上运行",

  "No strict RAM requirement":
    "没有严格的内存要求",

  "tools use what they need":
    "工具根据需要使用",

  "Always-on (no sleep)":
    "始终在线（无睡眠）",

  "Better for cron jobs and background tasks":
    "更适合 Cron 作业和后台任务",

  "Keep local machine free of load":
    "保持本地机器无负载",

  "Visible browser for debugging":
    "用于调试的可见浏览器",

  "no round-trip to cloud":
    "无需往返云",

  "VPS if you had gateway disconnects before":
    "如果您之前遇到过 Gateway 断开连接的情况，请使用 VPS",

  "Local is great when you're actively using the Mac":
    "当您积极使用 Mac 时，本地模式非常好",

  "and want local file access or UI automation with a visible browser":
    "并希望通过可见浏览器进行本地文件访问或 UI 自动化",

  "It needs to be always on, reachable, and have enough":
    "它需要始终在线、可访问，并有足够的",

  "RAM for the Gateway and any channels you enable":
    "RAM 来运行 Gateway 和您启用的任何频道",

  "if you run multiple channels, browser automation, or media tools":
    "如果您运行多个频道、浏览器自动化或媒体工具",

  "has the best tooling compatibility":
    "具有最佳的工具兼容性",

  "If you are running macOS in a VM, see":
    "如果您在 VM 中运行 macOS，请参阅",

  "messaging surfaces":
    "消息平台",

  "plus voice and Canvas on supported systems":
    "以及在支持的系统上的语音和 Canvas",

  "control plane":
    "控制平面",

  "think of it as the server piece":
    "将其视为服务器部分",

  "long-running sessions":
    "长时间会话",

  "host it on a Mac, Linux box, or VPS":
    "您可以将其托管在 Mac、Linux 机器或 VPS 上"
};

function translateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modifiedCount = 0;

  // 按照长度排序，先替换长的短语以避免部分匹配
  const sortedEntries = Object.entries(commonTranslations)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [english, chinese] of sortedEntries) {
    // 转义正则表达式特殊字符
    const escapedEnglish = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedEnglish, 'gi');

    const before = content;
    content = content.replace(regex, (match) => {
      // 保持原文的大小写格式
      modifiedCount++;
      return chinese;
    });

    if (before !== content) {
      console.log(`  ✓ Replaced: ${english.substring(0, 40)}...`);
    }
  }

  if (modifiedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Translated ${modifiedCount} items in ${path.basename(filePath)}`);
    return true;
  } else {
    console.log(`  No translations found in ${path.basename(filePath)}`);
    return false;
  }
}

// 处理所有 chunk 文件
const chunksDir = '/Users/marco/Documents/git/github.com/BeaversLab/crawfish-docs/.i18n/chunks';
let translatedCount = 0;

console.log('Starting batch translation...\n');

for (let i = 15; i <= 41; i++) {
  const chunkFile = path.join(chunksDir, `faq.md.chunk-${String(i).padStart(3, '0')}.md`);
  if (fs.existsSync(chunkFile)) {
    console.log(`\nProcessing: ${path.basename(chunkFile)}`);
    if (translateFile(chunkFile)) {
      translatedCount++;
    }
  }
}

console.log(`\n=== Translation Summary ===`);
console.log(`Total files processed: ${translatedCount}`);
console.log(`\nChunks 013-014: already translated manually`);
console.log(`Chunks 015-041: processed by script`);
