---
title: "展示"
description: "来自社区的真实 OpenClaw 项目"
summary: "社区构建的项目以及由 OpenClaw 驱动的集成"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

# Showcase

<div className="showcase-hero">
  <p className="showcase-kicker">构建于聊天、终端、浏览器和客厅之中</p>
  <p className="showcase-lead">OpenClaw 项目绝非玩具演示。人们正从他们熟悉的渠道中，交付 PR 审查循环、移动应用、家庭自动化、语音系统、开发工具以及重度内存工作流。</p>
  <div className="showcase-actions">
    <a href="#videos">观看演示</a>
    <a href="#fresh-from-discord">浏览项目</a>
    <a href="https://discord.gg/clawd">分享你的项目</a>
  </div>
  <div className="showcase-highlights">
    <div className="showcase-highlight">
      <strong>聊天原生构建</strong>
      <span>Telegram、WhatsApp、Discord、Beeper、Web 聊天以及以终端为主的工作流。</span>
    </div>
    <div className="showcase-highlight">
      <strong>真实的自动化</strong>
      <span>预订、购物、支持、报告以及浏览器控制，无需等待 API。</span>
    </div>
    <div className="showcase-highlight">
      <strong>本地与物理世界</strong>
      <span>打印机、吸尘器、摄像头、健康数据、家庭系统以及个人知识库。</span>
    </div>
  </div>
</div>

<Info>**想被推荐吗？** 请在 [Discord 上的 #self-promotion](https://discord.gg/clawd) 中分享你的项目，或者在 X 上 [标记 @openclaw](https://x.com/openclaw)。</Info>

<div className="showcase-jump-links">
  <a href="#videos">视频</a>
  <a href="#fresh-from-discord">Discord 最新动态</a>
  <a href="#automation-workflows">自动化</a>
  <a href="#knowledge-memory">记忆</a>
  <a href="#voice-phone">语音 &amp; 电话</a>
  <a href="#infrastructure-deployment">基础设施</a>
  <a href="#home-hardware">家庭 &amp; 硬件</a>
  <a href="#community-projects">社区</a>
  <a href="#submit-your-project">提交项目</a>
</div>

## 视频

<p className="showcase-section-intro">如果你想通过最短的路径从“这是什么？”到“好吧，我懂了”，请从这里开始。</p>

<div className="showcase-video-grid">
  <div className="showcase-video-card">
    <div className="showcase-video-shell">
      <iframe
        src="https://www.youtube-nocookie.com/embed/SaWSPZoPX34"
        title="OpenClaw：Siri 本该采用的自托管 AI（完整设置）"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>完整设置演练</h3>
    <p>VelvetShark，28 分钟。安装、入职，并端到端地构建第一个可用的助手。</p>
    <a href="https://www.youtube.com/watch?v=SaWSPZoPX34">在 YouTube 上观看</a>
  </div>

<div className="showcase-video-card">
  <div className="showcase-video-shell">
    <iframe src="https://www.youtube-nocookie.com/embed/mMSKQvlmFuQ" title="OpenClaw 展示视频" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
  </div>
  <h3>社区展示合集</h3>
  <p>快速浏览围绕 OpenClaw 构建的真实项目、界面和工作流。</p>
  <a href="https://www.youtube.com/watch?v=mMSKQvlmFuQ">在 YouTube 上观看</a>
</div>

  <div className="showcase-video-card">
    <div className="showcase-video-shell">
      <iframe
        src="https://www.youtube-nocookie.com/embed/5kkIJNUGFho"
        title="OpenClaw 社区展示"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>实际项目</h3>
    <p>来自社区的示例，从聊天原生编码循环到硬件和个人自动化。</p>
    <a href="https://www.youtube.com/watch?v=5kkIJNUGFho">在 YouTube 上观看</a>
  </div>
</div>

## 来自 Discord 的最新动态

<p className="showcase-section-intro">编程、开发工具、移动端和聊天原生产品构建领域的近期佳作。</p>

<CardGroup cols={2}>

<Card title="PR Review → Telegram 反馈" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode 完成更改 → 打开 PR → OpenClaw 审查差异并在 Telegram 中回复“次要建议”以及明确的合并结论（包括需要先应用的关键修复）。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw PR 审查反馈已通过 Telegram 送达" />
</Card>

<Card title="几分钟内构建酒窖技能" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

请求“Robby” (@openclaw) 创建一个本地酒窖技能。它会请求导出 CSV 示例以及存储位置，然后快速构建/测试该技能（示例中包含 962 瓶酒）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw 正在根据 CSV 构建本地酒窖技能" />
</Card>

<Card title="特易购购物自动驾驶" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每周膳食计划 → 常购商品 → 预订配送时段 → 确认订单。没有 API，仅通过浏览器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="通过聊天实现的特易购购物自动化" />
</Card>

<Card title="SNAG 截图转 Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

按下热键选择屏幕区域 → Gemini 视觉 → 剪贴板中即时生成 Markdown。

  <img src="/assets/showcase/snag.png" alt="SNAG screenshot-to-markdown 工具" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

用于跨 Agents、Claude、Codex 和 OpenClaw 管理技能/命令的桌面应用程序。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI app" />
</Card>

<Card title="Telegram 语音备注 (papla.media)" icon="microphone" href="https://papla.media/docs">
  **社区** • `voice` `tts` `telegram`

封装 papla.media TTS 并将结果作为 Telegram 语音备注发送（没有恼人的自动播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="来自 TTS 的 Telegram 语音备注输出" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

通过 Homebrew 安装的辅助工具，用于列出/检查/监控本地 OpenAI Codex 会话（CLI + VS Code）。

  <img src="/assets/showcase/codexmonitor.png" alt="ClawHub 上的 CodexMonitor" />
</Card>

<Card title="Bambu 3D 打印机控制" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制和排除 BambuLab 打印机的故障：状态、任务、摄像头、AMS、校准等。

  <img src="/assets/showcase/bambu-cli.png" alt="Bambu CLI 技能位于 ClawHub" />
</Card>

<Card title="维也纳交通 (Wiener Linien)" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

维也纳公共交通的实时发车时间、中断信息、电梯状态和路线规划。

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHub 上的 Wiener Linien 技能" />
</Card>

<Card title="ParentPay 学校订餐" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

通过 ParentPay 自动预订英国学校餐食。使用鼠标坐标以可靠地点击表格单元格。

</Card>

<Card title="R2 上传 (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

上传到 Cloudflare R2/S3 并生成安全的预签名下载链接。非常适合远程 OpenClaw 实例。

</Card>

<Card title="通过 iOS 的 Telegram 应用" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

构建了一款完整的具有地图和语音录制功能的 iOS 应用，完全通过 Telegram 聊天部署到了 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="TestFlight 上的 iOS 应用" />
</Card>

<Card title="Oura Ring 健康助手" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

个人 AI 健康助手，将 Oura 指环数据与日历、预约和健身计划相结合。

  <img src="/assets/showcase/oura-health.png" alt="Oura ring health assistant" />
</Card>
<Card title="Kev's Dream Team (14+ Agents)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration` `architecture` `manifesto`

14 个以上的代理在一个网关下，由 Opus 4.5 编排器委派给 Codex 工作线程。涵盖梦之队名册、模型选择、沙箱隔离、webhooks、心跳和委派流程的全面[技术文章](https://github.com/adam91holt/orchestrated-ai-articles)。用于代理沙箱隔离的 [Clawdspace](https://github.com/adam91holt/clawdspace)。[博客文章](https://adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/)。

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli` `issues`

与智能工作流（Claude Code、OpenClaw）集成的 Linear CLI。从终端管理问题、项目和工作流。首个外部 PR 已合并！

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli` `automation`

通过 Beeper Desktop 读取、发送和存档消息。使用 Beeper 本地 MCP API，以便智能体在一个地方管理您所有的聊天（iMessage、WhatsApp 等）。

</Card>

</CardGroup>

<a id="automation-workflows"></a>

## 自动化与工作流

<p className="showcase-section-intro">日程安排、浏览器控制、支持循环，以及产品的“直接为我完成任务”的一面。</p>

<CardGroup cols={2}>

<Card title="Winix 空气净化器控制" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 发现并确认了净化器控制功能，然后由 OpenClaw 接管以管理室内空气质量。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="通过 OpenClaw 控制 Winix 空气净化器" />
</Card>

<Card title="Pretty Sky Camera Shots" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill` `images`

由屋顶摄像头触发：只要天空看起来很美，就让 OpenClaw 拍摄一张天空照片——它设计了一个技能并拍下了这张照片。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="由 OpenClaw 拍摄的屋顶摄像头天空快照" />
</Card>

<Card title="Visual Morning Briefing Scene" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `images` `telegram`

一个定时提示每天早上通过 OpenClaw 人设生成一张“场景”图片（天气、任务、日期、最喜欢的帖子/名言）。

</Card>

<Card title="Padel Court Booking" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli` Playtomic 可用性检查器 + 预订 CLI。绝不错过任何开放的场地。
  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="会计录入" icon="file-invoice-dollar">
  **社区** • `automation` `email` `pdf` 从电子邮件中收集 PDF，为税务顾问准备文件。月度会计核算自动化。
</Card>

<Card title="沙发土豆开发模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `website` `migration` `astro`

在看 Netflix 的同时通过 Telegram 重建了整个个人网站 —— Notion → Astro，迁移了 18 篇文章，DNS 切换到 Cloudflare。从未打开过笔记本电脑。

</Card>

<Card title="Job Search Agent" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜索职位列表，匹配简历关键词，并返回带有链接的相关机会。使用 JSearch API 在 30 分钟内构建。

</Card>

<Card title="Jira Skill Builder" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `automation` `jira` `skill` `devtools`

OpenClaw 连接到 Jira，然后动态生成了一个新技能（在它存在于 ClawHub 之前）。

</Card>

<Card title="通过Telegram实现Todoist技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `automation` `todoist` `skill` `telegram`

自动化Todoist任务，并让OpenClaw直接在Telegram聊天中生成技能。

</Card>

<Card title="TradingView分析" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

通过浏览器自动化登录TradingView，截取图表，并根据需求执行技术分析。无需API——仅需浏览器控制。

</Card>

<Card title="Slack 自动支持" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

监听公司 Slack 渠道，做出有益回应，并将通知转发到 Telegram。无需询问即自主修复了已部署应用中的生产环境 Bug。

</Card>

</CardGroup>

<a id="knowledge-memory"></a>

## 知识与记忆

<p className="showcase-section-intro">能够对个人或团队知识进行索引、搜索、记忆和推理的系统。</p>

<CardGroup cols={2}>

<Card title="xuezh 中文学习" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill` 通过 OpenClaw 实现的、具有发音反馈和学习流程的中文学习引擎。
  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh pronunciation feedback" />
</Card>

<Card title="WhatsApp 记忆库" icon="vault">
  **社区** • `memory` `transcription` `indexing` 摄取完整的 WhatsApp 导出数据，转录 1000+ 条语音笔记，与 git 日志交叉核对，输出链接的 markdown 报告。
</Card>

<Card title="Karakeep 语义搜索" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks` 使用 Qdrant + OpenAI/Ollama 嵌入向 Karakeep 书签添加向量搜索。
</Card>

<Card title="Inside-Out-2 Memory" icon="brain">
  **社区** • `memory` `beliefs` `self-model` 独立的管理器，将会话文件转化为记忆 → 信念 → 演化的自我模型。
</Card>

</CardGroup>

<a id="voice-phone"></a>

## 语音与电话

<p className="showcase-section-intro">
  语音优先的入口、电话桥接以及侧重转录的工作流。

</p>

<CardGroup cols={2}>

<Card title="Clawdia Phone Bridge" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge` Vapi 语音助手 ↔ OpenClaw HTTP 网桥。与您的智能体进行近乎实时的电话通话。
</Card>

<Card title="OpenRouter Transcription" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

通过 OpenRouter (Gemini 等) 进行多语言音频转录。可在 ClawHub 上获取。

</Card>

</CardGroup>

<a id="infrastructure-deployment"></a>

## 基础架构与部署

<p className="showcase-section-intro">打包、部署和集成，使 OpenClaw 更易于运行和扩展。</p>

<CardGroup cols={2}>

<Card title="Home Assistant Add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi` 运行在 Home Assistant OS 上的 OpenClaw 网关，支持 SSH 隧道和持久化状态。
</Card>

<Card title="Home Assistant 技能" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation` 通过自然语言控制和自动化 Home Assistant 设备。
</Card>

<Card title="Nix 打包" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment` 用于可重现部署的内置电池的 Nix 化 OpenClaw 配置。
</Card>

<Card title="CalDAV Calendar" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill` 使用 khal/vdirsyncer 的日历技能。自托管的日历集成。
</Card>

</CardGroup>

<a id="home-hardware"></a>

## 家庭与硬件

<p className="showcase-section-intro">
  OpenClaw 的物理世界端：家庭、传感器、摄像头、吸尘器和其他设备。
</p>
</p>

<CardGroup cols={2}>

<Card title="GoHome Automation" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana` Nix 原生家庭自动化，以 OpenClaw 为接口，以及精美的 Grafana 仪表盘。
  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana dashboard" />
</Card>

<Card title="石头扫地机器人" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin` 通过自然对话控制您的石头扫地机器人。
  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock status" />
</Card>

</CardGroup>

## 社区项目

<p className="showcase-section-intro">
  那些从单一工作流发展壮大为更广泛产品或生态系统的项目。</p>
</p>

<CardGroup cols={2}>

<Card title="StarSwap Marketplace" icon="star" href="https://star-swap.com/">
  **Community** • `marketplace` `astronomy` `webapp` 完整的天文装备交易市场。围绕 OpenClaw 生态系统构建。
</Card>

</CardGroup>

---

## 提交您的项目

<p className="showcase-section-intro">
  如果您正在使用 OpenClaw 构建有趣的东西，请发送给我们。有说服力的截图和具体的成果会有所帮助。
</p>
</p>

有什么想分享的吗？我们很乐意展示它！

<Steps>
  <Step title="分享它">在 [Discord 的 #self-promotion 频道](https://discord.gg/clawd)发布或[发推 @openclaw](https://x.com/openclaw)</Step>
  <Step title="包含详情">告诉我们它的作用，链接到代码仓库/演示，如果你有截图也请分享</Step>
  <Step title="获得精选">我们会将杰出的项目添加到此页面</Step>
</Steps>
