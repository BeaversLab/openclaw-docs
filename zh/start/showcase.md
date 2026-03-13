---
title: "展示"
description: "来自社区的真实 OpenClaw 项目"
summary: "由社区构建并基于 OpenClaw 驱动的项目与集成"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

# 展示

来自社区的真实项目。看看大家正在用 OpenClaw 构建什么。

<Info>
**想要展示您的项目？** 在 Discord 上的 [#showcase](https://discord.gg/clawd) 分享您的项目，或者在 X 上 [标记 @openclaw](https://x.com/openclaw)。
</Info>

## 🎥 OpenClaw 实战演示

VelvetShark 带来的完整设置教程（28分钟）。

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
    title="OpenClaw：Siri 本该成为的自托管 AI（完整设置）"
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    frameBorder="0"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  />
</div>

[在 YouTube 上观看](https://www.youtube.com/watch?v=SaWSPZoPX34)

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
    title="OpenClaw 展示视频"
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    frameBorder="0"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  />
</div>

[在 YouTube 上观看](https://www.youtube.com/watch?v=mMSKQvlmFuQ)

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
    title="OpenClaw 社区展示"
    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    frameBorder="0"
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowFullScreen
  />
</div>

[在 YouTube 上观看](https://www.youtube.com/watch?v=5kkIJNUGFho)

## 🆕 Discord 最新动态

<CardGroup cols={2}>

<Card title="PR 审查 → Telegram 反馈" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode 完成更改 → 打开 PR → OpenClaw 审查差异并在 Telegram 中回复“一些小建议”以及明确的合并结论（包括需要先应用的关键修复）。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw PR 审查反馈在 Telegram 中送达" />
</Card>

<Card title="几分钟内完成酒窖技能" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

向“Robby”(@openclaw) 请求一个本地酒窖技能。它会请求示例 CSV 导出 + 存储位置，然后快速构建/测试该技能（示例中有 962 瓶酒）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw 从 CSV 构建本地酒窖技能" />
</Card>

<Card title="Tesco 购物自动" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每周膳食计划 → 常购商品 → 预订配送时段 → 确认订单。无需 API，仅通过浏览器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="通过聊天进行的 Tesco 购物自动化" />
</Card>

<Card title="SNAG 截图转 Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

热键选定屏幕区域 → Gemini 视觉 → 剪贴板中即时生成 Markdown。

  <img src="/assets/showcase/snag.png" alt="SNAG 截图转 Markdown 工具" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

用于跨 Agents、Claude、Codex 和 OpenClaw 管理技能/命令的桌面应用程序。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI 应用程序" />
</Card>

<Card title="Telegram 语音笔记 (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

封装 papla.media TTS 并将结果作为 Telegram 语音笔记发送（无恼人的自动播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="Telegram voice note output from TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.com/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

通过 Homebrew 安装的助手，用于列出/检查/监视本地 OpenAI Codex 会话（CLI + VS Code）。

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor on ClawHub" />
</Card>

<Card title="Bambu 3D Printer Control" icon="print" href="https://clawhub.com/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制和排查 BambuLab 打印机故障：状态、任务、摄像头、AMS、校准等。

  <img src="/assets/showcase/bambu-cli.png" alt="Bambu CLI skill on ClawHub" />
</Card>

<Card title="Vienna Transport (Wiener Linien)" icon="train" href="https://clawhub.com/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

维也纳公共交通的实时发车、中断、电梯状态和路线规划。

  <img src="/assets/showcase/wienerlinien.png" alt="Wiener Linien skill on ClawHub" />
</Card>

<Card title="ParentPay School Meals" icon="utensils" href="#">
  **@George5562** • `automation` `browser` `parenting`

通过 ParentPay 自动预订英国学校餐。使用鼠标坐标实现可靠的表格单元格点击。
</Card>

<Card title="R2 Upload (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.com/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

上传到 Cloudflare R2/S3 并生成安全的预签名下载链接。非常适合远程 OpenClaw 实例。
</Card>

<Card title="通过 Telegram 实现的 iOS 应用" icon="mobile" href="#">
  **@coard** • `ios` `xcode` `testflight`

构建了一个包含地图和录音功能的完整 iOS 应用，完全通过 Telegram 聊天部署到 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="TestFlight 上的 iOS 应用" />
</Card>

<Card title="Oura Ring 健康助手" icon="heart-pulse" href="#">
  **@AS** • `health` `oura` `calendar`

个人 AI 健康助手，将 Oura 指环数据与日历、预约和健身房计划集成在一起。

  <img src="/assets/showcase/oura-health.png" alt="Oura ring 健康助手" />
</Card>
<Card title="Kev 的梦之队（14+ 智能体）" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration` `architecture` `manifesto`

在一个网关下拥有 14+ 个智能体，由 Opus 4.5 编排器委派给 Codex 工作线程。全面的[技术文章](https://github.com/adam91holt/orchestrated-ai-articles)，涵盖梦之队阵容、模型选择、沙箱隔离、Webhooks、心跳检测和委派流程。用于智能体沙箱隔离的 [Clawdspace](https://github.com/adam91holt/clawdspace)。[博客文章](https://adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/)。
</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli` `issues`

Linear 的命令行界面 (CLI)，与代理工作流 (Claude Code, OpenClaw) 集成。直接从终端管理问题、项目和工作流。首个外部 PR 已合并！
</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli` `automation`

通过 Beeper Desktop 阅读、发送和归档消息。使用 Beeper 本地 MCP API，让代理能够在一个地方管理您所有的聊天 (iMessage, WhatsApp 等)。
</Card>

</CardGroup>

## 🤖 自动化与工作流

<CardGroup cols={2}>

<Card title="Winix 空气净化器控制" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 发现并确认了净化器控件，随后 OpenClaw 接管以管理室内空气质量。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="通过 OpenClaw 控制 Winix 空气净化器" />
</Card>

<Card title="美丽的天空相机镜头" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill` `images`

由屋顶摄像头触发：每当天空看起来很美时，就让 OpenClaw 拍一张照片——它设计了一个技能并完成了拍摄。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="由 OpenClaw 捕获的屋顶相机天空快照" />
</Card>

<Card title="可视化晨间简报场景" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `images` `telegram`

通过定时的提示词，每天早上通过 OpenClaw 的人设生成一张“场景”图像（天气、任务、日期、喜欢的帖子/名言）。
</Card>

<Card title="帕德尔球场预订" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`
  
  Playtomic 可用性检查器 + 预订命令行工具。再也不用担心订不到球场了。
  
  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli 截图" />
</Card>

<Card title="会计接收" icon="file-invoice-dollar">
  **社区** • `automation` `email` `pdf`
  
  从电子邮件中收集 PDF，为税务顾问整理文件。每月会计核算实现自动化。
</Card>

<Card title="沙发土豆开发模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `website` `migration` `astro`

在观看 Netflix 时通过 Telegram 重建了整个个人网站——Notion → Astro，迁移了 18 篇文章，DNS 托管到 Cloudflare。从未打开过笔记本电脑。
</Card>

<Card title="求职代理" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜索职位列表，与简历关键词匹配，并返回带有链接的相关机会。使用 JSearch API 在 30 分钟内构建完成。
</Card>

<Card title="Jira 技能构建器" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `automation` `jira` `skill` `devtools`

OpenClaw 连接到 Jira，然后即时生成了一个新技能（在它存在于 ClawHub 之前）。
</Card>

<Card title="通过 Telegram 使用 Todoist 技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `automation` `todoist` `skill` `telegram`

自动化 Todoist 任务，并让 OpenClaw 直接在 Telegram 聊天中生成技能。
</Card>

<Card title="TradingView 分析" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

通过浏览器自动化登录 TradingView，截图图表，并按需进行技术分析。无需 API——仅需浏览器控制。
</Card>

<Card title="Slack 自动支持" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

监视公司 Slack 频道，提供有益回复，并将通知转发到 Telegram。无需任何要求即可自主修复已部署应用程序中的生产错误。
</Card>

</CardGroup>

## 🧠 知识与记忆

<CardGroup cols={2}>

<Card title="xuezh 中文学习" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`
  
  中文学习引擎，通过 OpenClaw 提供发音反馈和学习流程。
  
  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh 发音反馈" />
</Card>

<Card title="WhatsApp Memory Vault" icon="vault">
  **社区** • `memory` `transcription` `indexing`
  
  摄取完整的 WhatsApp 导出数据，转录 1000+ 条语音笔记，与 git 日志交叉核对，输出关联的 markdown 报告。
</Card>

<Card title="Karakeep Semantic Search" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`
  
  使用 Qdrant + OpenAI/Ollama 嵌入为 Karakeep 书签添加向量搜索。
</Card>

<Card title="Inside-Out-2 Memory" icon="brain">
  **社区** • `memory` `beliefs` `self-model`
  
  独立的记忆管理器，将会话文件转化为记忆 → 信念 → 演进的自模型。
</Card>

</CardGroup>

## 🎙️ 语音与电话

<CardGroup cols={2}>

<Card title="Clawdia Phone Bridge" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`
  
  Vapi 语音助手 ↔ OpenClaw HTTP 桥接。与您的代理进行近乎实时的电话通话。
</Card>

<Card title="OpenRouter Transcription" icon="microphone" href="https://clawhub.com/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

通过 OpenRouter (Gemini 等) 进行多语言音频转录。可在 ClawHub 上获取。
</Card>

</CardGroup>

## 🏗️ 基础设施与部署

<CardGroup cols={2}>

<Card title="Home Assistant Add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`
  
  运行在 Home Assistant OS 上的 OpenClaw 网关，支持 SSH 隧道和持久化状态。
</Card>

<Card title="Home Assistant Skill" icon="toggle-on" href="https://clawhub.com/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation`
  
  通过自然语言控制和自动化 Home Assistant 设备。
</Card>

<Card title="Nix Packaging" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`
  
  开箱即用的 Nix 化 OpenClaw 配置，用于可复现的部署。
</Card>

<Card title="CalDAV 日历" icon="calendar" href="https://clawhub.com/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill`
  
  使用 khal/vdirsyncer 的日历技能。自托管日历集成。
</Card>

</CardGroup>

## 🏠 家庭与硬件

<CardGroup cols={2}>

<Card title="GoHome 自动化" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`
  
  基于 Nix 的原生家庭自动化，以 OpenClaw 作为界面，以及美观的 Grafana 仪表板。
  
  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana 仪表板" />
</Card>

<Card title="Roborock 扫地机器人" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`
  
  通过自然对话控制您的石头扫地机器人。
  
  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock 状态" />
</Card>

</CardGroup>

## 🌟 社区项目

<CardGroup cols={2}>

<Card title="StarSwap 市场" icon="star" href="https://star-swap.com/">
  **社区** • `marketplace` `astronomy` `webapp`
  
  完整的天文器材市场。基于/围绕 OpenClaw 生态系统构建。
</Card>

</CardGroup>

---

## 提交您的项目

有什么想分享的吗？我们很乐意展示它！

<Steps>
  <Step title="分享它">
    在 [Discord 上的 #showcase](https://discord.gg/clawd) 发帖或 [推文 @openclaw](https://x.com/openclaw)
  </Step>
  <Step title="包含详细信息">
    告诉我们它的用途，链接到仓库/演示，如果有截图请分享
  </Step>
  <Step title="获得精选">
    我们会将杰出的项目添加到此页面
  </Step>
</Steps>

import zh from '/components/footer/zh.mdx';

<zh />
