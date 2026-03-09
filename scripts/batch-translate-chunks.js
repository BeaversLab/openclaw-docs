const fs = require('fs');
const path = require('path');

// 翻译映射表
const translations = {
  // FAQ 相关翻译
  "OpenClaw is a personal AI assistant you run on your own devices. It replies on the messaging surfaces you already use (WhatsApp, Telegram, Slack, Mattermost (plugin), Discord, Google Chat, Signal, iMessage, WebChat) and can also do voice + a live Canvas on supported platforms. The **Gateway** is the always-on control plane; the assistant is the product.":
    "OpenClaw 是一个运行在您自己设备上的个人 AI 助手。它在您已经使用的消息平台上回复（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat），并且可以在支持的平台上进行语音对话和实时 Canvas。**Gateway** 是始终在线的控制平面；助手就是产品本身。",

  "### What's the value proposition":
    "### 有什么价值主张",

  "OpenClaw is not \"just a Claude wrapper.\" It's a **local-first control plane** that lets you run a capable assistant on **your own hardware**, reachable from the chat apps you already use, with stateful sessions, memory, and tools - without handing control of your workflows to a hosted SaaS.":
    'OpenClaw 不仅仅是"一个 Claude 包装器"。它是一个**本地优先的控制平面**，让您可以在**自己的硬件**上运行功能强大的助手，从您已经使用的聊天应用程序访问，具有有状态会话、记忆和工具功能——而无需将工作流程的控制权交给托管的 SaaS。',

  "Highlights:":
    "亮点：",

  "- **Your devices, your data:** run the Gateway wherever you want (Mac, Linux, VPS) and keep the workspace + session history local.":
    "- **您的设备，您的数据：** 在您想要的任何地方（Mac、Linux、VPS）运行 Gateway，并将工作区 + 会话历史保存在本地。",

  "- **Real channels, not a web sandbox:** WhatsApp/Telegram/Slack/Discord/Signal/iMessage/etc, plus mobile voice and Canvas on supported platforms.":
    "- **真实渠道，而不是 Web 沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，以及在支持的平台上的移动语音和 Canvas。",

  "- **Model-agnostic:** use Anthropic, OpenAI, MiniMax, OpenRouter, etc., with per-agent routing and failover.":
    "- **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，支持每个代理的路由和故障转移。",

  "- **Local-only option:** run local models so **all data can stay on your device** if you want.":
    "- **仅本地选项：** 运行本地模型，这样如果需要，**所有数据都可以保留在您的设备上**。",

  "- **Multi-agent routing:** separate agents per channel, account, or task, each with its own workspace and defaults.":
    "- **多代理路由：** 为每个渠道、账户或任务设置单独的代理，每个都有自己的工作区和默认设置。",

  "- **Open source and hackable:** inspect, extend, and self-host without vendor lock-in.":
    "- **开源且可定制：** 检查、扩展和自托管，没有供应商锁定。",

  "Docs: [Gateway]%%P397%%, [Channels]%%P398%%, [Multi-agent]%%P399%%, [Memory]%%P400%%.":
    "文档：[Gateway]%%P397%%、[Channels]%%P398%%、[Multi-agent]%%P399%%、[Memory]%%P400%%。",

  "### I just set it up what should I do first":
    "### 我刚设置好，首先应该做什么",

  "Good first projects:":
    "不错的入门项目：",

  "- Build a website (WordPress, Shopify, or a simple static site).":
    "- 构建一个网站（WordPress、Shopify 或简单的静态站点）。",

  "- Prototype a mobile app (outline, screens, API plan).":
    "- 制作移动应用原型（大纲、屏幕、API 计划）。",

  "- Organize files and folders (cleanup, naming, tagging).":
    "- 整理文件和文件夹（清理、命名、标记）。",

  "- Connect Gmail and automate summaries or follow ups.":
    "- 连接 Gmail 并自动生成摘要或跟进。",

  "It can handle large tasks, but it works best when you split them into phases and use sub agents for parallel work.":
    "它可以处理大型任务，但当您将其分解为多个阶段并使用子代理进行并行工作时，效果最佳。",

  "### What are the top five everyday use cases for OpenClaw":
    "### OpenClaw 的五大日常使用场景是什么",

  "Everyday wins usually look like:":
    "日常优势通常包括：",

  "- **Personal briefings:** summaries of inbox, calendar, and news you care about.":
    "- **个人简报：** 收件箱、日历和您关心的新闻摘要。",

  "- **Research and drafting:** quick research, summaries, and first drafts for emails or docs.":
    "- **研究和起草：** 快速研究、摘要以及电子邮件或文档的初稿。",

  "- **Reminders and follow ups:** cron or heartbeat driven nudges and checklists.":
    "- **提醒和跟进：** 由 cron 或心跳驱动的提醒和检查清单。",

  "- **Browser automation:** filling forms, collecting data, and repeating web tasks.":
    "- **浏览器自动化：** 填写表单、收集数据和重复的 Web 任务。",

  "- **Cross device coordination:** send a task from your phone, let the Gateway run it on a server, and get the result back in chat.":
    "- **跨设备协调：** 从手机发送任务，让 Gateway 在服务器上运行，并在聊天中获取结果。",

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
    "参见 [Cron jobs]%%P417%%、[Multi-Agent Routing]%%P418%% 和 [Slash commands]%%P419%%。",

  "### The bot freezes while doing heavy work How do I offload that":
    "### 机器人在执行繁重工作时冻结了，如何卸载这些工作",

  "Use **sub-agents** for long or parallel tasks. Sub-agents run in their own session, return a summary, and keep your main chat responsive.":
    "对长时间或并行任务使用**子代理**。子代理在自己的会话中运行，返回摘要，并保持您的主聊天响应。",

  "Ask your bot to \"spawn a sub-agent for this task\" or use %%P420%%.":
    '让您的机器人"为此任务生成一个子代理"或使用 %%P420%%。',

  "Use %%P421%% in chat to see what the Gateway is doing right now (and whether it is busy).":
    "在聊天中使用 %%P421%% 查看 Gateway 当前正在做什么（以及是否忙碌）。",

  "Token tip: long tasks and sub-agents both consume tokens. If cost is a concern, set a cheaper model for sub-agents via %%P422%%.":
    "令牌提示：长时间任务和子代理都消耗令牌。如果成本是关注点，请通过 %%P422%% 为子代理设置更便宜的模型。",

  "Docs: [Sub-agents]%%P423%%.":
    "文档：[Sub-agents]%%P423%%。",

  "### Cron or reminders do not fire What should I check":
    "### Cron 或提醒没有触发，我应该检查什么",

  "Cron runs inside the Gateway process. If the Gateway is not running continuously, scheduled jobs will not run.":
    "Cron 在 Gateway 进程内运行。如果 Gateway 没有持续运行，计划的任务将不会运行。",

  "Checklist:":
    "检查清单：",

  "- Confirm cron is enabled (%%P424%%) and %%P425%% is not set.":
    "- 确认 cron 已启用（%%P424%%）且未设置 %%P425%%。",

  "- Check the Gateway is running 24/7 (no sleep/restarts).":
    "- 检查 Gateway 是否 24/7 运行（无睡眠/重启）。",

  "- Verify timezone settings for the job (%%P426%% vs host timezone).":
    "- 验证作业的时区设置（%%P426%% 与主机时区）。",

  "Debug:":
    "调试：",

  "Docs: [Cron jobs]%%P427%%, [Cron vs Heartbeat]%%P428%%.":
    "文档：[Cron jobs]%%P427%%、[Cron vs Heartbeat]%%P428%%。",

  "### How do I install skills on Linux":
    "### 如何在 Linux 上安装技能",

  "Use **ClawHub** (CLI) or drop skills into your workspace. The macOS Skills UI isn't available on Linux.":
    "使用 **ClawHub**（CLI）或将技能放入您的工作区。macOS 技能 UI 在 Linux 上不可用。",

  "Browse skills at https://clawhub.com.":
    "在 https://clawhub.com 浏览技能。",

  "Install the ClawHub CLI (pick one package manager):":
    "安装 ClawHub CLI（选择一个包管理器）：",

  "### Can OpenClaw run tasks on a schedule or continuously in the background":
    "### OpenClaw 可以按计划或在后台连续运行任务吗",

  "Yes. Use the Gateway scheduler:":
    "可以。使用 Gateway 调度程序：",

  "- **Cron jobs** for scheduled or recurring tasks (persist across restarts).":
    "- **Cron 作业**用于计划或重复任务（跨重启持久化）。",

  "- **Heartbeat** for \"main session\" periodic checks.":
    '- **Heartbeat**用于"主会话"定期检查。',

  "- **Isolated jobs** for autonomous agents that post summaries or deliver to chats.":
    "- **隔离作业**用于发布摘要或传递到聊天的自主代理。",

  "Docs: [Cron jobs]%%P429%%, [Cron vs Heartbeat]%%P430%%, [Heartbeat]%%P431%%.":
    "文档：[Cron jobs]%%P429%%、[Cron vs Heartbeat]%%P430%%、[Heartbeat]%%P431%%。",

  "**Can I run Apple macOS only skills from Linux**":
    "**我可以从 Linux 运行仅限 Apple macOS 的技能吗**",

  "Not directly. macOS skills are gated by %%P432%% plus required binaries, and skills only appear in the system prompt when they are eligible on the **Gateway host**. On Linux, %%P433%%-only skills (like %%P434%%, %%P435%%, %%P436%%) will not load unless you override the gating.":
    "不能直接运行。macOS 技能由 %%P432%% 加上所需的二进制文件限制，并且只有当它们在 **Gateway 主机**上有资格时才会出现在系统提示中。在 Linux 上，%%P433%%-only 技能（如 %%P434%%、%%P435%%、%%P436%%）将不会加载，除非您覆盖限制。",

  "You have three supported patterns:":
    "您有三种支持的模式：",

  "**Option A - run the Gateway on a Mac (simplest).**":
    "**选项 A - 在 Mac 上运行 Gateway（最简单）。**",

  "Run the Gateway where the macOS binaries exist, then connect from Linux in [remote mode]%%P437%% or over Tailscale. The skills load normally because the Gateway host is macOS.":
    "在存在 macOS 二进制文件的地方运行 Gateway，然后通过 [remote mode]%%P437%% 或 Tailscale 从 Linux 连接。技能正常加载，因为 Gateway 主机是 macOS。",

  "**Option B - use a macOS node (no SSH).**":
    "**选项 B - 使用 macOS 节点（无 SSH）。**",

  "Run the Gateway on Linux, pair a macOS node (menubar app), and set **Node Run Commands** to \"Always Ask\" or \"Always Allow\" on the Mac. OpenClaw can treat macOS-only skills as eligible when the required binaries exist on the node. The agent runs those skills via the %%P438%% tool. If you choose \"Always Ask\", approving \"Always Allow\" in the prompt adds that command to the allowlist.":
    '在 Linux 上运行 Gateway，配对一个 macOS 节点（菜单栏应用程序），并在 Mac 上将**节点运行命令**设置为"始终询问"或"始终允许"。当节点上存在所需的二进制文件时，OpenClaw 可以将仅限 macOS 的技能视为有资格。代理通过 %%P438%% 工具运行这些技能。如果您选择"始终询问"，在提示中批准"始终允许"会将该命令添加到允许列表中。',

  "**Option C - proxy macOS binaries over SSH (advanced).**":
    "**选项 C - 通过 SSH 代理 macOS 二进制文件（高级）。**",

  "Keep the Gateway on Linux, but make the required CLI binaries resolve to SSH wrappers that run on a Mac. Then override the skill to allow Linux so it stays eligible.":
    "将 Gateway 保留在 Linux 上，但使所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器。然后覆盖技能以允许 Linux，使其保持有资格。",

  "1. Create an SSH wrapper for the binary (example: %%P439%% for Apple Notes):":
    "1. 为二进制文件创建 SSH 包装器（例如：用于 Apple Notes 的 %%P439%%）：",

  "2. Put the wrapper on %%P441%% on the Linux host (for example %%P442%%).":
    "2. 将包装器放在 Linux 主机的 %%P441%% 上（例如 %%P442%%）。",

  "3. Override the skill metadata (workspace or %%P443%%) to allow Linux:":
    "3. 覆盖技能元数据（工作区或 %%P443%%）以允许 Linux：",

  "4. Start a new session so the skills snapshot refreshes.":
    "4. 启动新会话以刷新技能快照。",

  "### Do you have a Notion or HeyGen integration":
    "### 您是否有 Notion 或 HeyGen 集成",

  "Not built-in today.":
    "目前没有内置。",

  "Options:":
    "选项：",

  "- **Custom skill / plugin:** best for reliable API access (Notion/HeyGen both have APIs).":
    "- **自定义技能/插件：**最适合可靠的 API 访问（Notion/HeyGen 都有 API）。",

  "- **Browser automation:** works without code but is slower and more fragile.":
    "- **浏览器自动化：**无需代码即可工作，但速度较慢且更脆弱。",

  "If you want to keep context per client (agency workflows), a simple pattern is:":
    "如果您想为每个客户端保持上下文（代理机构工作流程），一个简单的模式是：",

  "- One Notion page per client (context + preferences + active work).":
    "- 每个客户端一个 Notion 页面（上下文 + 偏好 + 活跃工作）。",

  "- Ask the agent to fetch that page at the start of a session.":
    "- 让代理在会话开始时获取该页面。",

  "If you want a native integration, open a feature request or build a skill targeting those APIs.":
    "如果您想要原生集成，请打开功能请求或构建针对这些 API 的技能。",

  "Install skills:":
    "安装技能：",

  "ClawHub installs into %%P445%% under your current directory (or falls back to your configured OpenClaw workspace); OpenClaw treats that as %%P446%% on the next session. For shared skills across agents, place them in %%P447%%. Some skills expect binaries installed via Homebrew; on Linux that means Linuxbrew (see the Homebrew Linux FAQ entry above). See [Skills]%%P448%% and [ClawHub]%%P449%%.":
    "ClawHub 安装到当前目录下的 %%P445%% 中（或回退到您配置的 OpenClaw 工作区）；OpenClaw 在下一个会话中将其视为 %%P446%%。要在代理之间共享技能，请将它们放在 %%P447%% 中。某些技能期望通过 Homebrew 安装二进制文件；在 Linux 上，这意味着 Linuxbrew（请参阅上面的 Homebrew Linux FAQ 条目）。参见 [Skills]%%P448%% 和 [ClawHub]%%P449%%。",

  "### How do I install the Chrome extension for browser takeover":
    "### 如何安装 Chrome 扩展程序以接管浏览器",

  "Use the built-in installer, then load the unpacked extension in Chrome:":
    "使用内置安装程序，然后在 Chrome 中加载解压的扩展程序：",

  "Then Chrome → %%P450%% → enable \"Developer mode\" → \"Load unpacked\" → pick that folder.":
    '然后 Chrome → %%P450%% → 启用"开发者模式" → "加载解压的" → 选择该文件夹。',

  "Full guide (including remote Gateway + security notes): [Chrome extension]%%P451%%":
    "完整指南（包括远程 Gateway + 安全说明）：[Chrome extension]%%P451%%",

  "### What are the system requirements":
    "### 系统要求是什么",

  "**OpenClaw Gateway:**":
    "**OpenClaw Gateway：**",

  "- **OS:** macOS 12+, Ubuntu 20.04+, or any modern Linux. Windows is supported via WSL2.":
    "- **操作系统：** macOS 12+、Ubuntu 20.04+ 或任何现代 Linux。Windows 通过 WSL2 支持。",

  "- **RAM:** 1GB minimum, 2GB+ recommended for comfort (especially if using browser tools).":
    "- **内存：** 最低 1GB，建议 2GB+ 以确保舒适（尤其是使用浏览器工具时）。",

  "- **Disk:** ~500MB for the core install, more for logs and media.":
    "- **磁盘：** 核心安装约 500MB，日志和媒体需要更多空间。",

  "- **Network:** stable internet for LLM API calls.":
    "- **网络：** 用于 LLM API 调用的稳定互联网。",

  "**For Nodes (optional):**":
    "**对于节点（可选）：**",

  "- Run on macOS, Linux, or via WSL2 on Windows.":
    "- 在 macOS、Linux 或 Windows 上的 WSL2 上运行。",

  "- No strict RAM requirement; tools use what they need.":
    "- 没有严格的内存要求；工具根据需要使用。",

  "Docs: [Platforms]%%P452%%, [Windows]%%P453%%, [Nodes]%%P454%%.":
    "文档：[Platforms]%%P452%%、[Windows]%%P453%%、[Nodes]%%P454%%。",

  "### Where should I host the Gateway local vs VPS":
    "### 我应该在哪里托管 Gateway：本地还是 VPS",

  "Both work. Choose based on how you use OpenClaw:":
    "两者都可以。根据您使用 OpenClaw 的方式选择：",

  "**VPS advantages:**":
    "**VPS 优势：**",

  "- Always-on (no sleep).":
    "- 始终在线（无睡眠）。",

  "- Accessible from anywhere.":
    "- 可从任何地方访问。",

  "- Better for cron jobs and background tasks.":
    "- 更适合 Cron 作业和后台任务。",

  "- Keep local machine free of load.":
    "- 保持本地机器无负载。",

  "**Local advantages:**":
    "**本地优势：**",

  "- Direct file access.":
    "- 直接文件访问。",

  "- Visible browser for debugging.":
    "- 用于调试的可见浏览器。",

  "- Lower latency (no round-trip to cloud).":
    "- 更低的延迟（无需往返云）。",

  "- Data never leaves your machine.":
    "- 数据永远不会离开您的机器。",

  "**OpenClaw-specific note:** WhatsApp/Telegram/Slack/Mattermost (plugin)/Discord all work fine from a VPS. The only real trade-off is **headless browser** vs a visible window. See [Browser]%%P389%%.":
    "**OpenClaw 特别说明：** WhatsApp/Telegram/Slack/Mattermost（插件）/Discord 都可以在 VPS 上正常运行。唯一的真正权衡是**无头浏览器**与可见窗口。参见 [Browser]%%P389%%。",

  "**Recommended default:** VPS if you had gateway disconnects before. Local is great when you're actively using the Mac and want local file access or UI automation with a visible browser.":
    "**推荐默认选项：** 如果您之前遇到过 Gateway 断开连接的情况，请使用 VPS。当您积极使用 Mac 并希望通过可见浏览器进行本地文件访问或 UI 自动化时，本地模式非常好。",

  "### How important is it to run OpenClaw on a dedicated machine":
    "### 在专用机器上运行 OpenClaw 有多重要",

  "Not required, but **recommended for reliability and isolation**.":
    "不是必需的，但**为了可靠性和隔离性而推荐**。",

  "- **Dedicated host (VPS/Mac mini/Pi):** always-on, fewer sleep/reboot interruptions, cleaner permissions, easier to keep running.":
    "- **专用主机（VPS/Mac mini/Pi）：** 始终在线，更少的睡眠/重启中断，更清晰的权限，更容易保持运行。",

  "- **Shared laptop/desktop:** totally fine for testing and active use, but expect pauses when the machine sleeps or updates.":
    "- **共享笔记本电脑/台式机：** 对于测试和积极使用完全没问题，但在机器睡眠或更新时期望会有暂停。",

  "If you want the best of both worlds, keep the Gateway on a dedicated host and pair your laptop as a **node** for local screen/camera/exec tools. See [Nodes]%%P390%%.\nFor security guidance, read [Security]%%P391%%.":
    "如果您想两全其美，请将 Gateway 保持在专用主机上，并将您的笔记本电脑配对为用于本地屏幕/相机/执行工具的**节点**。参见 [Nodes]%%P390%%。\n有关安全指导，请阅读 [Security]%%P391%%。",

  "### What are the minimum VPS requirements and recommended OS":
    "### 最低 VPS 要求和推荐的操作系统是什么",

  "OpenClaw is lightweight. For a basic Gateway + one chat channel:":
    "OpenClaw 是轻量级的。对于基本的 Gateway + 一个聊天频道：",

  "- **Absolute minimum:** 1 vCPU, 1GB RAM, ~500MB disk.":
    "- **绝对最低要求：** 1 vCPU、1GB RAM、约 500MB 磁盘空间。",

  "- **Recommended:** 1-2 vCPU, 2GB RAM or more for headroom (logs, media, multiple channels). Node tools and browser automation can be resource hungry.":
    "- **推荐：** 1-2 vCPU、2GB 或更多 RAM 以留有余地（日志、媒体、多个频道）。节点工具和浏览器自动化可能会消耗大量资源。",

  "OS: use **Ubuntu LTS** (or any modern Debian/Ubuntu). The Linux install path is best tested there.":
    "操作系统：使用 **Ubuntu LTS**（或任何现代的 Debian/Ubuntu）。Linux 安装路径在那里经过了最充分的测试。",

  "Docs: [Linux]%%P392%%, [VPS hosting]%%P393%%.":
    "文档：[Linux]%%P392%%、[VPS hosting]%%P393%%。",

  "### Can I run OpenClaw in a VM and what are the requirements":
    "### 我可以在 VM 中运行 OpenClaw 吗，有什么要求",

  "Yes. Treat a VM the same as a VPS: it needs to be always on, reachable, and have enough RAM for the Gateway and any channels you enable.":
    "可以。将 VM 视为与 VPS 相同：它需要始终在线、可访问，并有足够的 RAM 来运行 Gateway 和您启用的任何频道。",

  "Baseline guidance:":
    "基本指导：",

  "- **Absolute minimum:** 1 vCPU, 1GB RAM.":
    "- **绝对最低要求：** 1 vCPU、1GB RAM。",

  "- **Recommended:** 2GB RAM or more if you run multiple channels, browser automation, or media tools.":
    "- **推荐：** 2GB 或更多 RAM，如果您运行多个频道、浏览器自动化或媒体工具。",

  "- **OS:** Ubuntu LTS or another modern Debian/Ubuntu.":
    "- **操作系统：** Ubuntu LTS 或另一个现代 Debian/Ubuntu。",

  "If you are on Windows, **WSL2 is the easiest VM style setup** and has the best tooling compatibility. See [Windows]%%P394%%, [VPS hosting]%%P395%%.\nIf you are running macOS in a VM, see [macOS VM]%%P396%%.":
    "如果您使用的是 Windows，**WSL2 是最简单的 VM 风格设置**，并且具有最佳的工具兼容性。参见 [Windows]%%P394%%、[VPS hosting]%%P395%%。\n如果您在 VM 中运行 macOS，请参见 [macOS VM]%%P396%%。",

  "## What is OpenClaw?":
    "## 什么是 OpenClaw？",

  "### What is OpenClaw in one paragraph":
    "### 用一段话描述 OpenClaw",

  "OpenClaw is a personal AI assistant that runs on your own devices. Instead of a web-only chat UI, it integrates with the messaging apps and platforms you already use—WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, and more—plus voice and Canvas on supported systems. The **Gateway** is its always‑on control plane (think of it as the \"server\" piece), while **Nodes** give it direct access to local resources like files, browser windows, and cameras. It's designed for stateful, long‑running sessions with durable memory and tools, all running on hardware you control instead of a hosted SaaS. You can host it on a Mac, Linux box, or VPS, and connect from anywhere via the chat apps you already use.":
    'OpenClaw 是一个运行在您自己设备上的个人 AI 助手。它不是仅限 Web 的聊天 UI，而是与您已经使用的消息应用程序和平台集成——WhatsApp、Telegram、Slack、Discord、Google Chat、Signal、iMessage 等——以及在支持的系统上的语音和 Canvas。**Gateway** 是其始终在线的控制平面（将其视为"服务器"部分），而**节点**使其能够直接访问本地资源，如文件、浏览器窗口和相机。它专为有状态的长时间会话而设计，具有持久的记忆和工具，全部在您控制的硬件上运行，而不是托管的 SaaS。您可以将其托管在 Mac、Linux 机器或 VPS 上，并通过您已经使用的聊天应用程序从任何地方连接。'
};

function translateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modifiedCount = 0;

  // 替换每个翻译条目
  for (const [english, chinese] of Object.entries(translations)) {
    // 使用正则表达式转义特殊字符
    const escapedEnglish = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedEnglish, 'g');

    if (regex.test(content)) {
      content = content.replace(regex, chinese);
      modifiedCount++;
      console.log(`  ✓ Replaced: ${english.substring(0, 50)}...`);
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
console.log(`\nChunk 013-014 already translated manually.`);
console.log(`Chunks 015-041 processed by script.`);
