---
title: "Showcase"
description: "来自社区的真实 OpenClaw 项目"
summary: "社区构建的项目与集成，基于 OpenClaw 驱动"
---

# 展示

社区的真实项目。看看大家用 OpenClaw 构建了什么。

<Info>
**想上榜？** 在 [Discord 的 #showcase](https://discord.gg/clawd) 分享你的项目，或在 X 上 [@openclaw](https://x.com/openclaw) 标记我们。
</Info>

## 🎥 OpenClaw 实战

VelvetShark 的完整安装流程（28 分钟）。

<div
  style={{
    position: "relative",
    paddingBottom: "56.25%",
    height: 0,
    overflow: "hidden",
    borderRadius: 16,
  }}
>
  <iframe
    src="https://www.youtube-nocookie.com/embed/SaWSPZoPX34"
    title="OpenClaw: The self-hosted AI that Siri should have been (Full setup)"
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    frameBorder="0"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  />
</div>

[在 YouTube 观看](https://www.youtube.com/watch?v=SaWSPZoPX34)

<div
  style={{
    position: "relative",
    paddingBottom: "56.25%",
    height: 0,
    overflow: "hidden",
    borderRadius: 16,
  }}
>
  <iframe
    src="https://www.youtube-nocookie.com/embed/mMSKQvlmFuQ"
    title="OpenClaw showcase video"
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    frameBorder="0"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  />
</div>

[在 YouTube 观看](https://www.youtube.com/watch?v=mMSKQvlmFuQ)

<div
  style={{
    position: "relative",
    paddingBottom: "56.25%",
    height: 0,
    overflow: "hidden",
    borderRadius: 16,
  }}
>
  <iframe
    src="https://www.youtube-nocookie.com/embed/5kkIJNUGFho"
    title="OpenClaw community showcase"
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    frameBorder="0"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  />
</div>

[在 YouTube 观看](https://www.youtube.com/watch?v=5kkIJNUGFho)

## 🆕 Discord 新鲜事

<CardGroup cols={2}>

<Card title="PR Review → Telegram Feedback" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

  OpenCode 完成变更 → 打开 PR → OpenClaw 审查 diff 并在 Telegram 回复“轻微建议”，给出清晰的合并结论（包含必须先修复的关键问题）。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw PR review feedback delivered in Telegram" />
</Card>

<Card title="Wine Cellar Skill in Minutes" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

  让 “Robby”（@openclaw）创建本地酒窖技能。它请求样例 CSV 导出和存放位置，然后快速构建/测试技能（示例中 962 瓶）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw building a local wine cellar skill from CSV" />
</Card>

<Card title="Tesco Shop Autopilot" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

  每周餐单 → 常购商品 → 预约配送时间 → 确认订单。无 API，仅浏览器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="Tesco shop automation via chat" />
</Card>

<Card title="SNAG Screenshot-to-Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

  热键选取屏幕区域 → Gemini 视觉 → 即时生成 Markdown 到剪贴板。

  <img src="/assets/showcase/snag.png" alt="SNAG screenshot-to-markdown tool" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

  桌面应用，用于跨 Agents、Claude、Codex 与 OpenClaw 管理技能/命令。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI app" />
</Card>

<Card title="Telegram Voice Notes (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

  封装 papla.media TTS 并以 Telegram 语音消息发送结果（无烦人的自动播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="Telegram voice note output from TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawdhub.com/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

  通过 Homebrew 安装的辅助工具，用于列出/检查/监控本地 OpenAI Codex 会话（CLI + VS Code）。

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor on ClawdHub" />
</Card>

<Card title="Bambu 3D Printer Control" icon="print" href="https://clawdhub.com/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

  控制与排障 BambuLab 打印机：状态、任务、相机、AMS、校准等。

  <img src="/assets/showcase/bambu-cli.png" alt="Bambu CLI skill on ClawdHub" />
</Card>

<Card title="Vienna Transport (Wiener Linien)" icon="train" href="https://clawdhub.com/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

  维也纳公共交通的实时发车、延误、扶梯状态与路线规划。

  <img src="/assets/showcase/wienerlinien.png" alt="Wiener Linien skill on ClawdHub" />
</Card>

<Card title="ParentPay School Meals" icon="utensils" href="#">
  **@George5562** • `automation` `browser` `parenting`

  通过 ParentPay 自动预订英国学校餐食。使用鼠标坐标可靠点击表格单元格。
</Card>

<Card title="R2 Upload (Send Me My Files)" icon="cloud-arrow-up" href="https://clawdhub.com/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

  上传到 Cloudflare R2/S3 并生成安全的预签名下载链接。适合远程 OpenClaw 实例。
</Card>

<Card title="iOS App via Telegram" icon="mobile" href="#">
  **@coard** • `ios` `xcode` `testflight`

  完全通过 Telegram 聊天构建了带地图与语音录制的 iOS 应用，并部署到 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="iOS app on TestFlight" />
</Card>

<Card title="Oura Ring Health Assistant" icon="heart-pulse" href="#">
  **@AS** • `health` `oura` `calendar`

  个人 AI 健康助理，把 Oura ring 数据与日历、预约、健身计划整合。

  <img src="/assets/showcase/oura-health.png" alt="Oura ring health assistant" />
</Card>
<Card title="Kev's Dream Team (14+ Agents)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration` `architecture` `manifesto`

  一个网关下 14+ 代理，由 Opus 4.5 编排器分派给 Codex 工作代理。全面的 [技术写作](https://github.com/adam91holt/orchestrated-ai-articles) 覆盖 Dream Team 名单、模型选择、沙箱、webhook、心跳与委派流程。[Clawdspace](https://github.com/adam91holt/clawdspace) 用于代理沙箱。[博客](https://adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/)。
</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli` `issues`

  面向 Linear 的 CLI，集成代理工作流（Claude Code、OpenClaw）。可从终端管理 issues、项目与流程。首次外部 PR 已合并！
</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli` `automation`

  通过 Beeper Desktop 读取、发送、归档消息。使用本地 Beeper MCP API，让代理管理你所有聊天（iMessage、WhatsApp 等）。
</Card>

</CardGroup>

## 🤖 自动化与流程

<CardGroup cols={2}>

<Card title="Winix Air Purifier Control" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

  Claude Code 发现并确认净化器控制方式，然后由 OpenClaw 接管管理室内空气质量。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Winix air purifier control via OpenClaw" />
</Card>

<Card title="Pretty Sky Camera Shots" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill` `images`

  由屋顶相机触发：当天空很漂亮时，让 OpenClaw 拍一张天空照片 —— 它设计了技能并拍下这张图。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Roof camera sky snapshot captured by OpenClaw" />
</Card>

<Card title="Visual Morning Briefing Scene" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `images` `telegram`

  定时提示每天生成一张“场景”图（天气、任务、日期、喜爱的帖子/引言），由 OpenClaw 人设驱动。
</Card>

<Card title="Padel Court Booking" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`
  
  Playtomic 空位检查 + 预约 CLI。再也不会错过空场。
  
  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="Accounting Intake" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf`
  
  从邮件收集 PDF，为税务顾问准备材料。每月账务自动化。
</Card>

<Card title="Couch Potato Dev Mode" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `website` `migration` `astro`

  一边看 Netflix 一边通过 Telegram 重建个人网站 — Notion → Astro，迁移 18 篇文章，DNS 到 Cloudflare。从未打开过笔记本。
</Card>

<Card title="Job Search Agent" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

  搜索职位列表，按简历关键词匹配并返回相关机会与链接。30 分钟内用 JSearch API 构建。
</Card>

<Card title="Jira Skill Builder" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `automation` `jira` `skill` `devtools`

  OpenClaw 连接到 Jira，然后即刻生成新技能（当时 ClawdHub 还不存在）。
</Card>

<Card title="Todoist Skill via Telegram" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `automation` `todoist` `skill` `telegram`

  自动化 Todoist 任务，并让 OpenClaw 直接在 Telegram 聊天中生成技能。
</Card>

<Card title="TradingView Analysis" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

  通过浏览器自动化登录 TradingView、截图图表并按需进行技术分析。无需 API，只要浏览器控制。
</Card>

<Card title="Slack Auto-Support" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

  监控公司 Slack 频道，提供帮助并转发通知到 Telegram。在未被要求的情况下自动修复已部署应用的生产问题。
</Card>

</CardGroup>

## 🧠 知识与记忆

<CardGroup cols={2}>

<Card title="xuezh Chinese Learning" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`
  
  通过 OpenClaw 进行中文学习，包含发音反馈与学习流程。
  
  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh pronunciation feedback" />
</Card>

<Card title="WhatsApp Memory Vault" icon="vault">
  **Community** • `memory` `transcription` `indexing`
  
  导入完整 WhatsApp 导出记录，转写 1000+ 语音笔记，与 git 日志交叉检查，并输出链接化 markdown 报告。
</Card>

<Card title="Karakeep Semantic Search" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`
  
  使用 Qdrant + OpenAI/Ollama 向量嵌入为 Karakeep 书签增加语义搜索。
</Card>

<Card title="Inside-Out-2 Memory" icon="brain">
  **Community** • `memory` `beliefs` `self-model`
  
  独立记忆管理器，把会话文件转为记忆 → 信念 → 演化的自我模型。
</Card>

</CardGroup>

## 🎙️ 语音与电话

<CardGroup cols={2}>

<Card title="Clawdia Phone Bridge" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`
  
  Vapi 语音助手 ↔ OpenClaw HTTP 桥接。近实时与代理通话。
</Card>

<Card title="OpenRouter Transcription" icon="microphone" href="https://clawdhub.com/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

  通过 OpenRouter（Gemini 等）进行多语言音频转写。ClawdHub 可用。
</Card>

</CardGroup>

## 🏗️ 基础设施与部署

<CardGroup cols={2}>

<Card title="Home Assistant Add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`
  
  OpenClaw 网关运行在 Home Assistant OS 上，支持 SSH 隧道与持久化状态。
</Card>

<Card title="Home Assistant Skill" icon="toggle-on" href="https://clawdhub.com/skills/homeassistant">
  **ClawdHub** • `homeassistant` `skill` `automation`
  
  通过自然语言控制与自动化 Home Assistant 设备。
</Card>

<Card title="Nix Packaging" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`
  
  具备电池的 nix 化 OpenClaw 配置，用于可复现部署。
</Card>

<Card title="CalDAV Calendar" icon="calendar" href="https://clawdhub.com/skills/caldav-calendar">
  **ClawdHub** • `calendar` `caldav` `skill`
  
  使用 khal/vdirsyncer 的日历技能。自托管日历集成。
</Card>

</CardGroup>

## 🏠 家庭与硬件

<CardGroup cols={2}>

<Card title="GoHome Automation" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`
  
  Nix 原生家庭自动化，以 OpenClaw 作为界面，并配有漂亮的 Grafana 仪表板。
  
  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana dashboard" />
</Card>

<Card title="Roborock Vacuum" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`
  
  通过自然对话控制 Roborock 扫地机器人。
  
  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock status" />
</Card>

</CardGroup>

## 🌟 社区项目

<CardGroup cols={2}>

<Card title="StarSwap Marketplace" icon="star" href="https://star-swap.com/">
  **Community** • `marketplace` `astronomy` `webapp`
  
  完整的天文器材交易市场。基于/围绕 OpenClaw 生态构建。
</Card>

</CardGroup>

---

## 提交你的项目

有内容想分享？我们很乐意展示！

<Steps>
  <Step title="分享它">
    在 [Discord 的 #showcase](https://discord.gg/clawd) 发帖，或在 X 上 [@openclaw](https://x.com/openclaw) 发推
  </Step>
  <Step title="包含细节">
    说明它做什么，附上仓库/演示链接，有截图最好
  </Step>
  <Step title="获得展示">
    我们会把优秀项目加入此页面
  </Step>
</Steps>
