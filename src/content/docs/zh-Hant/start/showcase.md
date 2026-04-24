---
title: "展示"
description: "來自社群的真實 OpenClaw 專案"
summary: "由社群建構並由 OpenClaw 驅動的專案與整合"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

# 展示案例

<div className="showcase-hero">
  <p className="showcase-kicker">建構於聊天室、終端機、瀏覽器和客廳之中</p>
  <p className="showcase-lead">
    OpenClaw 專案並非只是玩具示範。人們正透過他們已經使用的管道，交付 PR 審查迴圈、行動應用程式、家庭自動化、語音系統、開發工具，以及高記憶體需求的工作流程。
  </p>
  </p>
  <div className="showcase-actions">
    <a href="#videos">觀看示範</a>
    <a href="#fresh-from-discord">瀏覽專案</a>
    <a href="https://discord.gg/clawd">分享您的作品</a>
  </div>
  <div className="showcase-highlights">
    <div className="showcase-highlight">
      <strong>聊天原生建置</strong>
      <span>Telegram、WhatsApp、Discord、Beeper、網路聊天，以及終端機優先的工作流程。</span>
    </div>
    <div className="showcase-highlight">
      <strong>真實的自動化</strong>
      <span>預約、購物、支援、報表，以及無需等待 API 的瀏覽器控制。</span>
    </div>
    <div className="showcase-highlight">
      <strong>本地 + 實體世界</strong>
      <span>印表機、吸塵器、相機、健康數據、家庭系統，以及個人知識庫。</span>
    </div>
  </div>
</div>

<Info>**想被展示嗎？** 在 Discord 的 [#self-promotion](https://discord.gg/clawd) 分享您的專案，或在 X 上 [標記 @openclaw](https://x.com/openclaw)。</Info>

<div className="showcase-jump-links">
  <a href="#videos">影片</a>
  <a href="#fresh-from-discord">Discord 新鮮事</a>
  <a href="#automation-workflows">自動化</a>
  <a href="#knowledge-memory">記憶</a>
  <a href="#voice-phone">語音 &amp; 電話</a>
  <a href="#infrastructure-deployment">基礎設施</a>
  <a href="#home-hardware">家庭 &amp; 硬體</a>
  <a href="#community-projects">社群</a>
  <a href="#submit-your-project">提交專案</a>
</div>

## 影片

<p className="showcase-section-intro">
  如果您想從「這是什麼？」最快邁向「好吧，我懂了」，請從這裡開始。
</p>
</p>

<div className="showcase-video-grid">
  <div className="showcase-video-card">
    <div className="showcase-video-shell">
      <iframe
        src="https://www.youtube-nocookie.com/embed/SaWSPZoPX34"
        title="OpenClaw: The self-hosted AI that Siri should have been (Full setup)"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>完整安裝教學</h3>
    <p>VelvetShark，28 分鐘。安裝、導入，並完成第一個可運行的助手設定。</p>
    <a href="https://www.youtube.com/watch?v=SaWSPZoPX34">在 YouTube 上觀看</a>
  </div>

<div className="showcase-video-card">
  <div className="showcase-video-shell">
    <iframe src="https://www.youtube-nocookie.com/embed/mMSKQvlmFuQ" title="OpenClaw showcase video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
  </div>
  <h3>社群精選展示</h3>
  <p>快速瀏覽圍繞 OpenClaw 建構的真實專案、介面與工作流程。</p>
  <a href="https://www.youtube.com/watch?v=mMSKQvlmFuQ">在 YouTube 上觀看</a>
</div>

  <div className="showcase-video-card">
    <div className="showcase-video-shell">
      <iframe
        src="https://www.youtube-nocookie.com/embed/5kkIJNUGFho"
        title="OpenClaw community showcase"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
    <h3>實際應用專案</h3>
    <p>社群案例，從原生的聊天編碼迴圈到硬體與個人自動化。</p>
    <a href="https://www.youtube.com/watch?v=5kkIJNUGFho">在 YouTube 上觀看</a>
  </div>
</div>

## Discord 最新精選

<p className="showcase-section-intro">近期在編程、開發工具、行動裝置和原生聊天產品建置方面的傑出案例。</p>

<CardGroup cols={2}>

<Card title="PR Review → Telegram Feedback" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode 完成變更 → 開啟 PR → OpenClaw 審查差異並在 Telegram 中回覆「小幅建議」以及明確的合併裁決（包括需先套用的重大修復）。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw PR review feedback delivered in Telegram" />
</Card>

<Card title="Wine Cellar Skill in Minutes" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

向「Robby」(@openclaw) 要求建立一個本地酒窖技能。它會要求提供 CSV 範例匯出 + 儲存位置，然後快速建置/測試該技能（範例中包含 962 瓶酒）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw building a local wine cellar skill from CSV" />
</Card>

<Card title="Tesco Shop Autopilot" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每週餐點計畫 → 常用品 → 預訂配送時段 → 確認訂單。無需 API，僅透過瀏覽器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="Tesco shop automation via chat" />
</Card>

<Card title="SNAG 截圖轉 Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

使用快捷鍵選取螢幕區域 → Gemini 視覺 → 即時在剪貼簿中產生 Markdown。

  <img src="/assets/showcase/snag.png" alt="SNAG screenshot-to-markdown tool" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

用於管理 Agents、Claude、Codex 和 OpenClaw 技能/指令的桌面應用程式。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI app" />
</Card>

<Card title="Telegram 語音備忘錄 (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

封裝 papla.media TTS 並將結果以 Telegram 語音備忘錄形式發送（無惱人的自動播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="Telegram voice note output from TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

透過 Homebrew 安裝的輔助工具，用於列出/檢查/監看本機 OpenAI Codex 工作階段（CLI + VS Code）。

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor on ClawHub" />
</Card>

<Card title="Bambu 3D 印表機控制" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制和排除 BambuLab 印表機故障：狀態、任務、相機、AMS、校準等。

  <img src="/assets/showcase/bambu-cli.png" alt="ClawHub 上的 Bambu CLI 技能" />
</Card>

<Card title="維也納交通" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

維也納公共交通的即時出發、服務中斷、電梯狀態和路線規劃。

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHub 上的 Wiener Linien 技能" />
</Card>

<Card title="ParentPay 學校膳食" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

透過 ParentPay 自動預約英國學校膳食。使用滑鼠座標進行可靠的表格儲存格點擊。

</Card>

<Card title="R2 上傳" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

上傳至 Cloudflare R2/S3 並產生安全的預先簽署下載連結。非常適合遠端 OpenClaw 實例。

</Card>

<Card title="透過 Telegram 建構 iOS 應用" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

建構了一個包含地圖和錄音功能的完整 iOS 應用，並完全透過 Telegram 聊天部署到 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="TestFlight 上的 iOS 應用" />
</Card>

<Card title="Oura Ring 健康助手" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

個人 AI 健康助手，將 Oura Ring 資料與日曆、預約和健身排程整合。

  <img src="/assets/showcase/oura-health.png" alt="Oura Ring 健康助手" />
</Card>
<Card title="Kev 的夢幻團隊 (14+ 個代理程式)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration` `architecture` `manifesto`

在單一閘道下部署 14 個以上的代理程式，並由 Opus 4.5 編排器委派給 Codex 工作者。涵蓋夢幻團隊名單、模型選擇、沙盒機制、Webhooks、心跳和委派流程的綜合[技術文檔](https://github.com/adam91holt/orchestrated-ai-articles)。用於代理程式沙盒機制的 [Clawdspace](https://github.com/adam91holt/clawdspace)。[部落格文章](https://adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/)。

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli` `issues`

與代理工作流程整合的 Linear CLI（Claude Code、OpenClaw）。從終端機管理議題、專案和工作流程。第一個外部 PR 已合併！

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli` `automation`

透過 Beeper Desktop 讀取、傳送及封存訊息。使用 Beeper 本地 MCP API，讓代理可以在一個地方管理您所有的聊天（iMessage、WhatsApp 等）。

</Card>

</CardGroup>

<a id="automation-workflows"></a>

## 自動化與工作流程

<p className="showcase-section-intro">排程、瀏覽器控制、支援迴路，以及產品中「直接幫我完成任務」的一面。</p>

<CardGroup cols={2}>

<Card title="Winix Air Purifier Control" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 發現並確認了空氣清淨機的控制項，接著由 OpenClaw 接手管理室內空氣品質。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Winix air purifier control via OpenClaw" />
</Card>

<Card title="Pretty Sky Camera Shots" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill` `images`

由屋頂攝影機觸發：每當天氣看起來很美時，讓 OpenClaw 拍攝一張天空照片 — 它設計了一個技能並拍下了這張照片。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Roof camera sky snapshot captured by OpenClaw" />
</Card>

<Card title="Visual Morning Briefing Scene" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `images` `telegram`

透過 OpenClaw 的角色設定，一個排程提示每天早上生成一張單一的「場景」影像（天氣、任務、日期、喜歡的文章/引言）。

</Card>

<Card title="Padel Court Booking" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli` Playtomic 可用性檢查器 + 預約 CLI。再也不會錯過任何空場。
  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="Accounting Intake" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf` 從電子郵件收集 PDF，為稅務顧問準備文件。每月會計自動化。
</Card>

<Card title="沙發馬克開發模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `website` `migration` `astro`

在觀看 Netflix 的同時，透過 Telegram 重建了整個個人網站——從 Notion 到 Astro，遷移了 18 篇文章，DNS 設定到 Cloudflare。從未打開過筆記型電腦。

</Card>

<Card title="求職代理程式" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜尋職缺，根據履歷關鍵字進行匹配，並傳回附有連結的相關機會。使用 JSearch API 在 30 分鐘內建構完成。

</Card>

<Card title="Jira 技能建構器" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `automation` `jira` `skill` `devtools`

OpenClaw 連接至 Jira，然後即時生成了一個新技能（甚至在它出現在 ClawHub 上之前）。

</Card>

<Card title="透過 Telegram 的 Todoist 技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `automation` `todoist` `skill` `telegram`

自動化 Todoist 任務，並讓 OpenClaw 直接在 Telegram 聊天中生成技能。

</Card>

<Card title="TradingView 分析" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

透過瀏覽器自動化登入 TradingView，擷取圖表畫面，並根據需求執行技術分析。無需 API——僅需瀏覽器控制。

</Card>

<Card title="Slack 自動支援" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

監控公司 Slack 頻道，提供有幫助的回應，並將通知轉發至 Telegram。曾自主修復已部署應用程式中的生產環境錯誤，而無需他人指示。

</Card>

</CardGroup>

<a id="knowledge-memory"></a>

## 知識與記憶

<p className="showcase-section-intro">能對個人或團隊知識進行索引、搜尋、記憶與推理的系統。</p>

<CardGroup cols={2}>

<Card title="xuezh 中文學習" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill` 透過 OpenClaw 實現，具備發音回饋與學習流程的中文學習引擎。
  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh pronunciation feedback" />
</Card>

<Card title="WhatsApp 記憶保管庫" icon="vault">
  **社群** • `memory` `transcription` `indexing` 匯入完整的 WhatsApp 匯出檔案，轉錄 1000+ 則語音訊息，與 git 記錄交叉比對，輸出連結的 markdown 報告。
</Card>

<Card title="Karakeep 語意搜尋" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks` 使用 Qdrant + OpenAI/Ollama 嵌入為 Karakeep 書籤新增向量搜尋功能。
</Card>

<Card title="Inside-Out-2 記憶" icon="brain">
  **社群** • `memory` `beliefs` `self-model` 獨立的記憶管理器，將會話檔案轉化為記憶 → 信念 → 演進的自我模型。
</Card>

</CardGroup>

<a id="voice-phone"></a>

## 語音與電話

<p className="showcase-section-intro">語音優先的入口點、電話橋接器，以及重度依賴轉錄的工作流程。</p>

<CardGroup cols={2}>

<Card title="Clawdia 電話橋接" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge` Vapi 語音助理 ↔ OpenClaw HTTP 橋接。與您的代理進行近乎即時的通話。
</Card>

<Card title="OpenRouter 轉錄" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

透過 OpenRouter (Gemini 等) 進行多語言音訊轉錄。可於 ClawHub 取得。

</Card>

</CardGroup>

<a id="infrastructure-deployment"></a>

## 基礎架構與部署

<p className="showcase-section-intro">讓 OpenClaw 更易於執行和擴展的打包、部署與整合方案。</p>

<CardGroup cols={2}>

<Card title="Home Assistant Add-on" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi` 在 Home Assistant OS 上運行的 OpenClaw 閘道，支援 SSH 隧道與持久化狀態。
</Card>

<Card title="Home Assistant Skill" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation` 透過自然語言控制與自動化 Home Assistant 裝置。
</Card>

<Card title="Nix Packaging" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment` 功能齊全的 nix 化 OpenClaw 設定，用於可重現的部署。
</Card>

<Card title="CalDAV Calendar" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill` 使用 khal/vdirsyncer 的日曆技能。自託管日曆整合。
</Card>

</CardGroup>

<a id="home-hardware"></a>

## 家庭與硬體

<p className="showcase-section-intro">OpenClaw 的實體世界面向：家庭、感測器、攝影機、吸塵器及其他裝置。</p>

<CardGroup cols={2}>

<Card title="GoHome Automation" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana` 以 OpenClaw 為介面的原生 Nix 智能家居自動化，並搭配精美的 Grafana 儀表板。
  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana dashboard" />
</Card>

<Card title="Roborock Vacuum" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin` 透過自然對話控制您的 Roborock 機器人吸塵器。
  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock status" />
</Card>

</CardGroup>

## 社群專案

<p className="showcase-section-intro">從單一工作流程發展成更廣泛的產品或生態系統的專案。</p>

<CardGroup cols={2}>

<Card title="StarSwap Marketplace" icon="star" href="https://star-swap.com/">
  **Community** • `marketplace` `astronomy` `webapp` 完整的天文設備交易市場。使用 OpenClaw 生態系統建構而成。
</Card>

</CardGroup>

---

## 提交您的專案

<p className="showcase-section-intro">如果您正在用 OpenClaw 製作有趣的東西，請寄給我們。強大的截圖與具體的成果有助於審核。</p>

有東西想分享嗎？我們很樂於將它刊登出來！

<Steps>
  <Step title="Share It">在 Discord 的 [#self-promotion 頻道](https://discord.gg/clawd)發布，或 [發推文給 @openclaw](https://x.com/openclaw)</Step>
  <Step title="Include Details">告訴我們它的用途，連結到程式庫/展示，如果有截圖請一併分享</Step>
  <Step title="Get Featured">我們會將傑出的專案加入此頁面</Step>
</Steps>
