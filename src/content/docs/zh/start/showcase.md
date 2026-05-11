---
summary: "社区构建的项目和由 OpenClaw 驱动的集成"
title: "Showcase"
description: "来自社区的真实世界 OpenClaw 项目"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

OpenClaw 项目并非仅仅是演示玩具。人们正在从他们已经使用的渠道交付 PR 审查循环、移动应用程序、家庭自动化、语音系统、开发工具和内存繁重的工作流——基于 Telegram、WhatsApp、Discord 和终端的聊天原生构建；用于预订、购物和支持而无需等待 API 的真正自动化；以及与打印机、吸尘器、摄像头和家用系统的物理世界集成。

<Info>**想要被展示？** 在 Discord 的 [#self-promotion 频道](https://discord.gg/clawd) 分享你的项目，或者在 X 上 [标记 @openclaw](https://x.com/openclaw)。</Info>

## 视频

如果你想寻找从“这是什么？”到“好的，我懂了”的最短路径，请从这里开始。

<CardGroup cols={3}>

<Card title="完整设置演练" href="https://www.youtube.com/watch?v=SaWSPZoPX34">
  VelvetShark，28 分钟。安装、入职，并端到端地获得第一个可工作的助手。
</Card>

<Card title="社区展示集锦" href="https://www.youtube.com/watch?v=mMSKQvlmFuQ">
  围绕 OpenClaw 构建的真实项目、界面和工作流的快速浏览。
</Card>

<Card title="实际项目案例" href="https://www.youtube.com/watch?v=5kkIJNUGFho">
  来自社区的示例，从聊天原生编码循环到硬件和个人自动化。
</Card>

</CardGroup>

## 来自 Discord 的最新动态

在编码、开发工具、移动端和聊天原生产品构建方面的近期杰出案例。

<CardGroup cols={2}>

<Card title="PR Review to Telegram Feedback" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode 完成更改，打开 PR，OpenClaw 审查差异并在 Telegram 中回复建议以及明确的合并结论。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw PR review feedback delivered in Telegram" />
</Card>

<Card title="Wine Cellar Skill in Minutes" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

请求 "Robby" (@openclaw) 创建一个本地酒窖技能。它请求样本 CSV 导出和存储路径，然后构建并测试该技能（示例中包含 962 瓶酒）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw building a local wine cellar skill from CSV" />
</Card>

<Card title="Tesco Shop Autopilot" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每周膳食计划、常购商品、预订送货时段、确认订单。无需 API，仅通过浏览器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="Tesco shop automation via chat" />
</Card>

<Card title="SNAG 截图转 Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

对屏幕区域使用热键，通过 Gemini 视觉功能，即时获取剪贴板中的 Markdown。

  <img src="/assets/showcase/snag.png" alt="SNAG screenshot-to-markdown 工具" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

用于管理 Agents、Claude、Codex 和 OpenClaw 之间的技能和命令的桌面应用。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI app" />
</Card>

<Card title="Telegram 语音备注 (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

封装 papla.media TTS 并将结果作为 Telegram 语音备注发送（没有烦人的自动播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="Telegram voice note output from TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

通过 Homebrew 安装的辅助工具，用于列出、检查和监视本地 OpenAI Codex 会话 (CLI + VS Code)。

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor on ClawHub" />
</Card>

<Card title="Bambu 3D 打印机控制" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制和排查 BambuLab 打印机故障：状态、任务、摄像头、AMS、校准等。

  <img src="/assets/showcase/bambu-cli.png" alt="ClawHub 上的 Bambu CLI 技能" />
</Card>

<Card title="维也纳交通" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

维也纳公共交通的实时出发、中断、电梯状态和路线规划。

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHub 上的 Wiener Linien 技能" />
</Card>

<Card title="ParentPay 学校膳食" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

通过 ParentPay 自动预订英国学校膳食。使用鼠标坐标进行可靠的表格单元格点击。

</Card>

<Card title="R2 上传" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

上传到 Cloudflare R2/S3 并生成安全的预签名下载链接。适用于远程 OpenClaw 实例。

</Card>

<Card title="iOS app via Telegram" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

构建了一个完整的 iOS 应用，包含地图和语音录制功能，完全通过 Telegram 聊天部署到 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="TestFlight 上的 iOS 应用" />
</Card>

<Card title="Oura Ring 健康助手" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

个人 AI 健康助手，将 Oura 指环数据与日历、预约和健身计划相整合。

  <img src="/assets/showcase/oura-health.png" alt="Oura ring 健康助手" />
</Card>

<Card title="Kev 的梦幻团队 (14+ 个代理)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration`

在一个网关下管理 14+ 个代理，使用 Opus 4.5 编排器委派给 Codex 工作线程。查看[技术文章](https://github.com/adam91holt/orchestrated-ai-articles)和 [Clawdspace](https://github.com/adam91holt/clawdspace)了解代理沙箱隔离。

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli`

Linear 的 CLI，与代理工作流 (Claude Code, OpenClaw) 集成。从终端管理议题、项目和工作流。

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli`

通过 Beeper Desktop 阅读、发送和归档消息。使用 Beeper 本地 MCP API，以便代理在一个地方管理您的所有聊天（iMessage、WhatsApp 等）。

</Card>

</CardGroup>

## 自动化和工作流

日程安排、浏览器控制、支持循环，以及产品中“直接帮我完成任务”的一面。

<CardGroup cols={2}>

<Card title="Winix 空气净化器控制" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 发现并确认了空气净化器控制功能，然后由 OpenClaw 接管以管理室内空气质量。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="通过 OpenClaw 控制 Winix 空气净化器" />
</Card>

<Card title="美丽的天空相机拍摄" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill`

由屋顶摄像头触发：当天空看起来很美时，让 OpenClaw 拍摄一张天空照片。它设计了一个技能并完成了拍摄。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="由 OpenClaw 捕获的屋顶天空快照" />
</Card>

<Card title="可视化晨间简报场景" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `telegram`

通过 OpenClaw 角色，每日定时生成一张场景图像（天气、任务、日期、最喜欢的帖子或语录）。

</Card>

<Card title="帕德尔球场预订" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`

Playtomic 可用性检查器兼预订 CLI。再也不必错过空场。

  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="会计 intake" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf`

从电子邮件中收集 PDF，为税务顾问准备文件。每月会计事务实现自动驾驶。

</Card>

<Card title="沙发土豆开发模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `migration` `astro`

在观看 Netflix 时通过 Telegram 重建了整个个人网站 —— 从 Notion 到 Astro，迁移了 18 篇文章，DNS 托管到 Cloudflare。从未打开过笔记本电脑。

</Card>

<Card title="职位搜索代理" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜索职位列表，与简历关键词匹配，并返回附带链接的相关机会。使用 JSearch API 在 30 分钟内构建完成。

</Card>

<Card title="Jira 技能构建器" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `jira` `skill` `devtools`

OpenClaw 连接到 Jira，然后即时生成了一个新技能（在其存在于 ClawHub 之前）。

</Card>

<Card title="通过 Telegram 使用 Todoist 技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `todoist` `skill` `telegram`

自动化 Todoist 任务，并让 OpenClaw 直接在 Telegram 聊天中生成该技能。

</Card>

<Card title="TradingView 分析" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

通过浏览器自动化登录 TradingView，截图图表，并根据需求进行技术分析。不需要 API — 只需浏览器控制即可。

</Card>

<Card title="Slack 自动支持" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

监视公司 Slack 渠道，提供有益回复，并将通知转发到 Telegram。曾在未被要求的情况下自主修复已部署应用程序中的生产错误。

</Card>

</CardGroup>

## 知识与记忆

能够对个人或团队知识进行索引、搜索、记忆和推理的系统。

<CardGroup cols={2}>

<Card title="xuezh 中文学习" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`

通过 OpenClaw 实现的中文学习引擎，提供发音反馈和学习流程。

  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh pronunciation feedback" />
</Card>

<Card title="WhatsApp 记忆库" icon="vault">
  **社区** • `memory` `transcription` `indexing`

摄取完整的 WhatsApp 导出数据，转录 1000+ 条语音笔记，与 git 日志交叉核对，输出链接的 markdown 报告。

</Card>

<Card title="Karakeep 语义搜索" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`

使用 Qdrant 以及 OpenAI 或 Ollama 嵌入，为 Karakeep 书签添加向量搜索功能。

</Card>

<Card title="Inside-Out-2 记忆" icon="brain">
  **社区** • `memory` `beliefs` `self-model`

独立的记忆管理器，将会话文件转化为记忆，然后是信念，最后是一个不断演进的自我模型。

</Card>

</CardGroup>

## 语音和电话

语音优先的入口点、电话网桥以及重度依赖转录的工作流。

<CardGroup cols={2}>

<Card title="Clawdia 电话网桥" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`

Vapi 语音助手到 OpenClaw HTTP 网桥。与您的代理进行近乎实时的通话。

</Card>

<Card title="OpenRouter 转录" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

通过 OpenRouter（Gemini 等）进行多语言音频转录。可在 ClawHub 上获取。

</Card>

</CardGroup>

## 基础设施和部署

让 OpenClaw 更易于运行和扩展的打包、部署和集成方案。

<CardGroup cols={2}>

<Card title="Home Assistant add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`

在 Home Assistant OS 上运行的 OpenClaw 网关，支持 SSH 隧道并具有持久状态。

</Card>

<Card title="Home Assistant skill" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation`

通过自然语言控制和自动化 Home Assistant 设备。

</Card>

<Card title="Nix packaging" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`

功能齐全的 nix 化 OpenClaw 配置，用于可复现的部署。

</Card>

<Card title="CalDAV calendar" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill`

使用 khal 和 vdirsyncer 的日历技能。自托管日历集成。

</Card>

</CardGroup>

## 家庭与硬件

OpenClaw 的物理世界端：家庭、传感器、摄像头、吸尘器和其他设备。

<CardGroup cols={2}>

<Card title="GoHome 自动化" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`

原生 Nix 家庭自动化，以 OpenClaw 作为接口，并配有 Grafana 仪表板。

  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana dashboard" />
</Card>

<Card title="Roborock 真空吸尘器" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`

通过自然对话控制您的 Roborock 扫地机器人。

  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock status" />
</Card>

</CardGroup>

## 社区项目

那些从单一工作流演变为更广泛产品或生态系统的项目。

<CardGroup cols={2}>

<Card title="StarSwap 市场" icon="star" href="https://star-swap.com/">
  **Community** • `marketplace` `astronomy` `webapp`

完整的天文器材市场。基于 OpenClaw 生态系统构建。

</Card>

</CardGroup>

## 提交您的项目

<Steps>
  <Step title="分享它">在 [%PH:GLOSSARY:466:f873438a%% 上的 #self-promotion 频道](https://discord.gg/clawd) 发布或 [发推 @openclaw](https://x.com/openclaw)。</Step>
  <Step title="提供详细信息">告诉我们它的作用，链接到仓库或演示，如果有的话，分享一张截图。</Step>
  <Step title="获得展示">我们将杰出项目添加到此页面。</Step>
</Steps>

## 相关

- [入门指南](/zh/start/getting-started)
- [%PH:GLOSSARY:467:7fd4d2c6%%](/zh/start/openclaw)
