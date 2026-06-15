---
summary: "社区构建的项目和由 OpenClaw 驱动的集成"
title: "Showcase"
description: "来自社区的真实世界 OpenClaw 项目"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

OpenClaw 项目并非仅仅是演示玩具。人们正在从他们已经使用的渠道交付 PR 审查循环、移动应用程序、家庭自动化、语音系统、开发工具和内存繁重的工作流——基于 Telegram、WhatsApp、Discord 和终端的聊天原生构建；用于预订、购物和支持而无需等待 API 的真正自动化；以及与打印机、吸尘器、摄像头和家用系统的物理世界集成。

<Info>**想要被展示？** 在 [Discord 上的 #self-promotion](Discordhttps://discord.gg/clawd) 或 [在 X 上 @openclaw](https://x.com/openclaw) 分享您的项目。</Info>

## 来自 Discord 的最新动态

在编码、开发工具、移动应用和聊天原生产品构建领域的近期精选项目。

<CardGroup cols={2}>

<Card title="TelegramPR 审查到 Telegram 反馈" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`OpenClawTelegram

OpenCode 完成更改，打开 PR，OpenClaw 审查差异并在 Telegram 中回复建议以及明确的合并结论。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClawTelegramOpenClaw PR 审查反馈在 Telegram 中交付" />
</Card>

<Card title="几分钟内构建酒窖技能" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

向“Robby” (@openclaw) 请求一个本地酒窖技能。它请求一个样本 CSV 导出和一个存储路径，然后构建并测试该技能（示例中为 962 瓶）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClawOpenClaw 从 CSV 构建本地酒窖技能" />
</Card>

<Card title="Tesco 购物自动驾驶仪" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每周膳食计划、常购商品、预订配送时段、确认订单。无需 API，仅靠浏览器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="通过聊天进行的 Tesco 购物自动化" />
</Card>

<Card title="SNAG 截图转 Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

对屏幕区域设置快捷键，使用 Gemini 视觉功能，即刻将 Markdown 存入剪贴板。

  <img src="/assets/showcase/snag.png" alt="SNAG 截图转 Markdown 工具" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

用于在 Agents、Claude、Codex 和 OpenClaw 之间管理技能和命令的桌面应用。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI 应用" />
</Card>

<Card title="Telegram 语音备注 (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

封装 papla.media TTS 并将结果作为 Telegram 语音备注发送（没有烦人的自动播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="Telegram 语音备注 TTS 输出" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`OpenAICLI

通过 Homebrew 安装的辅助工具，用于列出、检查和监视本地 OpenAI Codex 会话（CLI + VS Code）。

  <img src="/assets/showcase/codexmonitor.png" alt="ClawHubClawHub 上的 CodexMonitor" />
</Card>

<Card title="Bambu 3D 打印机控制" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制并排查 BambuLab 打印机故障：状态、任务、摄像头、AMS、校准等。

  <img src="/assets/showcase/bambu-cli.png" alt="CLIClawHubClawHub 上的 Bambu CLI 技能" />
</Card>

<Card title="维也纳交通 (Wiener Linien)" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

维也纳公共交通的实时发车、故障、电梯状态和路线规划。

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHubClawHub 上的 Wiener Linien 技能" />
</Card>

<Card title="ParentPay 学校餐食" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

通过 ParentPay 自动预订英国学校餐食。利用鼠标坐标实现可靠的表格单元格点击。

</Card>

<Card title="R2 upload (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`OpenClaw

上传到 Cloudflare R2/S3 并生成安全的预签名下载链接。适用于远程 OpenClaw 实例。

  <img src="/assets/showcase/r2-upload.png" alt="ClawHubR2 upload skill on ClawHub" />
</Card>

<Card title="iOSTelegramiOS app via Telegram" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`iOSTelegram

构建了一款完整的 iOS 应用，包含地图和语音录制功能，完全通过 Telegram 聊天部署到 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="iOSiOS app on TestFlight" />
</Card>

<Card title="Oura Ring health assistant" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

个人 AI 健康助手，将 Oura 指环数据与日历、预约和健身计划集成。

  <img src="/assets/showcase/oura-health.png" alt="Oura ring health assistant" />
</Card>

<Card title="Kev's Dream Team (14+ agents)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration`

14+ 个代理在一个网关下，通过 Opus 4.5 编排器委派给 Codex 工作节点。请参阅[技术文档](https://github.com/adam91holt/orchestrated-ai-articles)和 [Clawdspace](https://github.com/adam91holt/clawdspace)了解代理沙箱隔离。

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli`

CLI for Linear，与代理工作流 (Claude Code, OpenClaw) 集成。从终端管理议题、项目和工作流。

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli`

通过 Beeper Desktop 阅读、发送和归档消息。使用 Beeper 本地 MCP API，以便代理在一个地方管理您所有的聊天 (iMessage、WhatsApp 等)。

</Card>

</CardGroup>

## 自动化与工作流

日程安排、浏览器控制、支持循环，以及产品的“直接为我完成任务”功能。

<CardGroup cols={2}>

<Card title="Winix air purifier control" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 发现并确认了净化器控制功能，然后 OpenClaw 接手管理室内空气质量。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Winix air purifier control via OpenClaw" />
</Card>

<Card title="Pretty sky camera shots" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill`

由屋顶摄像头触发：每当天空看起来很美时，让 OpenClaw 拍摄一张天空照片。它设计了一个技能并拍摄了这张照片。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Roof camera sky snapshot captured by OpenClaw" />
</Card>

<Card title="Visual morning briefing scene" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `telegram`

每天早上通过一个 OpenClaw 角色生成的定时提示词生成一张场景图像（天气、任务、日期、喜欢的帖子或名言）。

</Card>

<Card title="Padel court booking" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`

Playtomic 可用性检查器以及预订 CLI。再也不错过空闲场地。

  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="Accounting intake" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf`

从电子邮件中收集 PDF，为税务顾问准备文档。每月会计核算自动化。

</Card>

<Card title="沙发土豆开发者模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `migration` `astro`

在观看 Netflix 时通过 Telegram 重建了整个个人网站 —— 从 Notion 到 Astro，迁移了 18 篇文章，DNS 托管到 Cloudflare。从未打开过笔记本电脑。

</Card>

<Card title="求职搜索代理" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜索职位列表，根据简历关键词进行匹配，并返回相关机会及其链接。使用 JSearch API 在 30 分钟内构建完成。

</Card>

<Card title="Jira 技能构建器" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `jira` `skill` `devtools`

OpenClaw 连接到 Jira，然后动态生成了一项新技能（在它出现于 ClawHub 之前）。

</Card>

<Card title="通过 Telegram 使用 Todoist 技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `todoist` `skill` `telegram`

自动化 Todoist 任务，并让 OpenClaw 直接在 Telegram 聊天中生成技能。

</Card>

<Card title="TradingView analysis" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`API

通过浏览器自动化登录 TradingView，截图图表，并按需进行技术分析。无需 API——只需浏览器控制。

</Card>

<Card title="Slack 自动支持" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

监控公司 Slack 渠道，提供有益回复，并将通知转发至 Telegram。在未被询问的情况下自主修复了已部署应用中的生产环境错误。

</Card>

</CardGroup>

## 知识与记忆

能够对个人或团队知识进行索引、搜索、记忆和推理的系统。

<CardGroup cols={2}>

<Card title="xuezh 中文学习" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`

通过 OpenClaw 实现的带有发音反馈和学习流程的中文学习引擎。

  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh 发音反馈" />
</Card>

<Card title="WhatsApp 记忆库" icon="vault">
  **Community** • `memory` `transcription` `indexing`

摄取完整的 WhatsApp 导出数据，转录 1000+ 条语音笔记，与 git 日志交叉核对，输出链接的 markdown 报告。

</Card>

<Card title="Karakeep 语义搜索" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`

使用 Qdrant 以及 OpenAI 或 Ollama 嵌入为 Karakeep 书签添加向量搜索。

</Card>

<Card title="头脑特工队2 (Inside-Out-2) 记忆" icon="brain">
  **社区** • `memory` `beliefs` `self-model`

独立的记忆管理器，将会话文件转化为记忆，然后是信念，再演变为一套不断发展的自我模型。

</Card>

</CardGroup>

## 语音和电话

语音优先的入口点、电话网桥以及重度转录工作流。

<CardGroup cols={2}>

<Card title="Clawdia 电话桥接" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`

从 Vapi 语音助手到 OpenClaw HTTP 的桥接。与您的代理进行近乎实时的电话通话。

</Card>

<Card title="OpenRouter 转录" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

通过 OpenRouter (Gemini 等) 进行多语言音频转录。现已在 ClawHub 上提供。

  <img src="/assets/showcase/openrouter-transcribe.png" alt="OpenRouter 转录技能在 ClawHub 上" />
</Card>

</CardGroup>

## 基础设施和部署

打包、部署和集成，使 OpenClaw 更易于运行和扩展。

<CardGroup cols={2}>

<Card title="Home Assistant 附加组件" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`

运行在 Home Assistant OS 上的 OpenClaw 网关，支持 SSH 隧道和持久化状态。

</Card>

<Card title="Home Assistant 技能" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation`

通过自然语言控制和自动化 Home Assistant 设备。

  <img src="/assets/showcase/homeassistant.png" alt="ClawHub 上的 Home Assistant 技能" />
</Card>

<Card title="Nix 打包" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`

开箱即用的 Nix 化 OpenClaw 配置，用于可复现的部署。

</Card>

<Card title="CalDAV 日历" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill`

使用 khal 和 vdirsyncer 的日历技能。自托管日历集成。

  <img src="/assets/showcase/caldav-calendar.png" alt="ClawHub 上的 CalDAV 日历技能" />
</Card>

</CardGroup>

## 家庭和硬件

OpenClaw 的物理世界：家庭、传感器、摄像头、吸尘器和其他设备。

<CardGroup cols={2}>

<Card title="GoHome 自动化" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`Nix

Nix 原生家居自动化，以 OpenClaw 为接口，并配有 Grafana 仪表板。

  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana dashboard" />
</Card>

<Card title="Roborock 吸尘器" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`

通过自然对话控制您的 Roborock 机器人吸尘器。

  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock status" />
</Card>

</CardGroup>

## 社区项目

从单一工作流成长起来的更广泛的产品或生态系统。

<CardGroup cols={2}>

<Card title="StarSwap 市场" icon="star" href="https://star-swap.com/">
  **社区** • `marketplace` `astronomy` `webapp`

完整的天文器材市场。围绕 OpenClaw 生态系统构建而成。

</Card>

</CardGroup>

## 提交您的项目

<Steps>
  <Step title="分享它">在 [Discord 上的 #self-promotion 频道](https://discord.gg/clawd) 发帖或 [推文 @openclaw](https://x.com/openclaw)。</Step>
  <Step title="包含详细信息">告诉我们它的用途，提供仓库或演示的链接，并分享截图（如果有的话）。</Step>
  <Step title="获得精选">我们会将杰出的项目添加到此页面。</Step>
</Steps>

## 相关

- [入门指南](/zh/start/getting-started)
- [OpenClaw](/zh/start/openclaw)
