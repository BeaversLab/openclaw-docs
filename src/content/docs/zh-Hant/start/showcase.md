---
title: "展示"
description: "來自社群的真實 OpenClaw 專案"
summary: "由社群建構並由 OpenClaw 驅動的專案與整合"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

{/* markdownlint-disable MD033 */}

# 展示

<div className="showcase-hero">
  <p className="showcase-kicker">內建於聊天、終端機、瀏覽器與客廳中</p>
  <p className="showcase-lead">OpenClaw 專案並非玩具示範。人們正在透過他們已經使用的管道，發布 PR 審查迴圈、行動應用程式、家庭自動化、 語音系統、開發工具以及重度記憶體的工作流程。</p>
  <div className="showcase-actions">
    <a href="#videos">觀看示範</a>
    <a href="#fresh-from-discord">瀏覽專案</a>
    <a href="https://discord.gg/clawd">分享您的專案</a>
  </div>
  <div className="showcase-highlights">
    <div className="showcase-highlight">
      <strong>聊天原生建置</strong>
      <span>Telegram、WhatsApp、Discord、Beeper、網頁聊天以及終端機優先的工作流程。</span>
    </div>
    <div className="showcase-highlight">
      <strong>真實的自動化</strong>
      <span>預訂、購物、支援、報告以及瀏覽器控制，無需等待 API。</span>
    </div>
    <div className="showcase-highlight">
      <strong>本機與實體世界</strong>
      <span>印表機、吸塵器、攝影機、健康資料、家庭系統以及個人知識庫。</span>
    </div>
  </div>
</div>

<Info>**想要被選入精選嗎？** 在 Discord 的 [#self-promotion on Discord](https://discord.gg/clawd) 中分享您的專案，或 [在 X 上標記 @openclaw](https://x.com/openclaw)。</Info>

<div className="showcase-jump-links">
  <a href="#videos">影片</a>
  <a href="#fresh-from-discord">Discord 最新動態</a>
  <a href="#automation-workflows">自動化</a>
  <a href="#knowledge-memory">記憶體</a>
  <a href="#voice-phone">語音 &amp; 電話</a>
  <a href="#infrastructure-deployment">基礎架構</a>
  <a href="#home-hardware">家庭 &amp; 硬體</a>
  <a href="#community-projects">社群</a>
  <a href="#submit-your-project">提交專案</a>
</div>

<h2 id="videos">影片</h2>

<p className="showcase-section-intro">如果您想走從「這是什麼？」到「好吧，我懂了」的最短路徑，請從這裡開始。</p>

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
    <h3>完整設定逐步解說</h3>
    <p>VelvetShark，28 分鐘。安裝、上手，並從頭到尾建立第一個可運作的助理。</p>
    <a href="https://www.youtube.com/watch?v=SaWSPZoPX34">在 YouTube 上觀看</a>
  </div>

<div className="showcase-video-card">
  <div className="showcase-video-shell">
    <iframe src="https://www.youtube-nocookie.com/embed/mMSKQvlmFuQ" title="OpenClaw showcase video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
  </div>
  <h3>社群展示精選</h3>
  <p>快速瀏覽圍繞 OpenClaw 建構的真實專案、介面和工作流程。</p>
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
    <h3>實際運作中的專案</h3>
    <p>社群範例，從原生聊天編碼迴圈到硬體和個人自動化。</p>
    <a href="https://www.youtube.com/watch?v=5kkIJNUGFho">在 YouTube 上觀看</a>
  </div>
</div>

<h2 id="fresh-from-discord">Discord 最新精選</h2>

<p className="showcase-section-intro">近期在編碼、開發工具、行動裝置和原生聊天產品建置方面的傑出作品。</p>

<CardGroup cols={2}>

<Card title="PR 審查 → Telegram 反饋" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode 完成變更 → 開啟 PR → OpenClaw 審查差異並在 Telegram 中回覆「微小建議」以及明確的合併裁決（包含需先套用的關鍵修復）。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw PR review feedback delivered in Telegram" />
</Card>

<Card title="分鐘內建立酒窖技能" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

要求「Robby」(@openclaw) 建立一個在地酒窖技能。它會要求提供 CSV 匯出範例與儲存位置，然後快速建構/測試該技能（範例中包含 962 瓶酒）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw building a local wine cellar skill from CSV" />
</Card>

<Card title="Tesco 購物自動駕駛" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每週菜單 → 常購清單 → 預訂配送時段 → 確認訂單。無需 API，僅透過瀏覽器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="Tesco shop automation via chat" />
</Card>

<Card title="SNAG 截圖轉 Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

螢幕區域快捷鍵 → Gemini 視覺 → 剪貼簿中即時產生的 Markdown。

  <img src="/assets/showcase/snag.png" alt="SNAG screenshot-to-markdown tool" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

用於跨 Agents、Claude、Codex 和 OpenClaw 管理技能/指令的桌面應用程式。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI app" />
</Card>

<Card title="Telegram 語音備忘錄 (papla.media)" icon="microphone" href="https://papla.media/docs">
  **社群** • `voice` `tts` `telegram`

封裝 papla.media TTS 並將結果作為 Telegram 語音備忘錄發送（無惱人的自動播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="Telegram voice note output from TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

透過 Homebrew 安裝的輔助工具，用於列出/檢查/監看本機 OpenAI Codex 工作階段（CLI + VS Code）。

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor on ClawHub" />
</Card>

<Card title="Bambu 3D 印表機控制" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制和排除 BambuLab 印表機故障：狀態、工作、相機、AMS、校準等。

  <img src="/assets/showcase/bambu-cli.png" alt="ClawHub 上的 Bambu CLI 技能" />
</Card>

<Card title="維也納交通" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

維也納公共交通的即時出發資訊、服務中斷、電梯狀態和路線規劃。

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHub 上的 Wiener Linien 技能" />
</Card>

<Card title="ParentPay 學校午餐" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

透過 ParentPay 自動預約英國學校午餐。使用滑鼠座標以確保點擊表格儲存格的可靠性。

</Card>

<Card title="R2 上傳 (Send Me My Files)" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

上傳至 Cloudflare R2/S3 並產生安全的預先簽署下載連結。非常適合遠端 OpenClaw 執行個體。

</Card>

<Card title="透過 Telegram 開發 iOS 應用" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

建構了一個包含地圖和錄音功能的完整 iOS 應用，完全透過 Telegram 聊天部署至 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="iOS app on TestFlight" />
</Card>

<Card title="Oura Ring 健康助手" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

整合 Oura Ring 資料與日曆、預約及健身排程的個人 AI 健康助手。

  <img src="/assets/showcase/oura-health.png" alt="Oura ring health assistant" />
</Card>
<Card title="Kev 的夢幻團隊 (14+ 個代理程式)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration` `architecture` `manifesto`

在單一閘道下設有 14+ 個代理程式，由 Opus 4.5 編排器協調指派給 Codex 工作者。涵蓋夢幻團隊名單、模型選擇、沙盒機制、Webhooks、心跳偵測和委派流程的完整 [技術文章](https://github.com/adam91holt/orchestrated-ai-articles)。用於代理程式沙盒的 [Clawdspace](https://github.com/adam91holt/clawdspace)。[部落格文章](https://adams-ai-journey.ghost.io/2026-the-year-of-the-orchestrator/)。

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli` `issues`

與代理工作流程（Claude Code、OpenClaw）整合的 Linear CLI。從終端機管理問題、專案和工作流程。第一個外部 PR 已合併！

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli` `automation`

透過 Beeper Desktop 讀取、傳送和封存訊息。使用 Beeper 本地 MCP API，讓代理可以在一個地方管理您所有的聊天（iMessage、WhatsApp 等）。

</Card>

</CardGroup>

<h2 id="automation-workflows">自動化 &amp; 工作流程</h2>

<p className="showcase-section-intro">排程、瀏覽器控制、支援迴圈，以及產品中「幫我直接完成任務」的一面。</p>

<CardGroup cols={2}>

<Card title="Winix Air Purifier Control" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 發現並確認了空氣清淨機的控制方式，接著由 OpenClaw 接手管理室內空氣品質。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="Winix air purifier control via OpenClaw" />
</Card>

<Card title="Pretty Sky Camera Shots" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill` `images`

由屋頂攝影機觸發：要求 OpenClaw 在天氣看起來很棒時拍攝天空照片——它設計了一個技能並拍下了這張照片。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="Roof camera sky snapshot captured by OpenClaw" />
</Card>

<Card title="Visual Morning Briefing Scene" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `images` `telegram`

透過定時提示，每天早上透過 OpenClaw 角色生成一個單獨的「場景」圖像（天氣、任務、日期、喜歡的帖子/名言）。

</Card>

<Card title="Padel Court Booking" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli` Playtomic 空檢檢查器 + 預訂 CLI。再也不會錯過任何空場。
  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="Accounting Intake" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf` 從電子郵件中收集 PDF，為稅務顧問準備文件。每月記帳自動化。
</Card>

<Card title="懶人開發模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `website` `migration` `astro`

一邊看 Netflix 一邊透過 Telegram 重建整個人網站 — Notion → Astro，遷移了 18 篇文章，DNS 指向 Cloudflare。從未打開過筆記型電腦。

</Card>

<Card title="求職代理程式" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜尋職缺，根據履歷關鍵字比對，並傳回附有連結的相關機會。使用 JSearch API 於 30 分鐘內建構完成。

</Card>

<Card title="Jira 技能建構器" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `automation` `jira` `skill` `devtools`

OpenClaw 連接到 Jira，然後即時生成了一個新技能（在 ClawHub 上出現之前）。

</Card>

<Card title="透過 Telegram 的 Todoist 技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `automation` `todoist` `skill` `telegram`

自動化 Todoist 任務，並讓 OpenClaw 直接在 Telegram 聊天中生成技能。

</Card>

<Card title="TradingView Analysis" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

透過瀏覽器自動化登入 TradingView，擷取圖表，並根據需求進行技術分析。不需要 API——只需控制瀏覽器。

</Card>

<Card title="Slack Auto-Support" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

監控公司 Slack 頻道，提供有益的回應，並將通知轉發至 Telegram。無需指示即自主修復了已部署應用程式中的生產環境 Bug。

</Card>

</CardGroup>

<h2 id="knowledge-memory">知識 &amp; 記憶</h2>

<p className="showcase-section-intro">能夠索引、搜尋、記憶並針對個人或團隊知識進行推導的系統。</p>

<CardGroup cols={2}>

<Card title="xuezh Chinese Learning" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill` 透過 OpenClaw 提供發音回饋與學習流程的中文學習引擎。
  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh pronunciation feedback" />
</Card>

<Card title="WhatsApp Memory Vault" icon="vault">
  **Community** • `memory` `transcription` `indexing` 匯入完整的 WhatsApp 匯出檔案，轉錄 1000 多則語音備忘錄，與 git 記錄交叉比對，輸出連結的 markdown 報告。
</Card>

<Card title="Karakeep Semantic Search" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks` 使用 Qdrant + OpenAI/Ollama 嵌入模型為 Karakeep 書籤新增向量搜尋功能。
</Card>

<Card title="Inside-Out-2 Memory" icon="brain">
  **Community** • `memory` `beliefs` `self-model` 獨立的記憶管理器，將會話檔案轉化為記憶 → 信念 → 不斷演化的自我模型。
</Card>

</CardGroup>

<h2 id="voice-phone">語音 &amp; 電話</h2>

<p className="showcase-section-intro">語音優先的入口、電話橋接器，以及重度依賴轉錄的工作流程。</p>

<CardGroup cols={2}>

<Card title="Clawdia Phone Bridge" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge` Vapi 語音助手 ↔ OpenClaw HTTP 橋接器。與您的代理進行近乎即時的通話。
</Card>

<Card title="OpenRouter Transcription" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

透過 OpenRouter (Gemini 等) 進行的多語音訊轉錄。可在 ClawHub 上取得。

</Card>

</CardGroup>

<h2 id="infrastructure-deployment">基礎架構 &amp; 部署</h2>

<p className="showcase-section-intro">讓 OpenClaw 更容易運作和擴展的打包、部署和整合方案。</p>

<CardGroup cols={2}>

<Card title="Home Assistant 附加元件" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi` 運行於 Home Assistant OS 的 OpenClaw 網關，支援 SSH 隧道與持久狀態。
</Card>

<Card title="Home Assistant 技能" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation` 透過自然語言控制和自動化 Home Assistant 裝置。
</Card>

<Card title="Nix 打包" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment` 功能齊全的 Nix 化 OpenClaw 配置，用於可重現部署。
</Card>

<Card title="CalDAV 行事曆" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill` 使用 khal/vdirsyncer 的行事曆技能。自託管行事曆整合。
</Card>

</CardGroup>

<h2 id="home-hardware">家庭 &amp; 硬體</h2>

<p className="showcase-section-intro">OpenClaw 的實體世界面向：家庭、感應器、攝影機、吸塵器及其他裝置。</p>

<CardGroup cols={2}>

<Card title="GoHome 自動化" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana` 原生 Nix 的家庭自動化解決方案，以 OpenClaw 作為介面，並搭配精美的 Grafana 儀表板。
  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana 儀表板" />
</Card>

<Card title="Roborock 吸塵器" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin` 透過自然語言對話來控制您的 Roborock 機器人吸塵器。
  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock 狀態" />
</Card>

</CardGroup>

<h2 id="community-projects">社群專案</h2>

<p className="showcase-section-intro">那些從單一工作流程演變成更廣泛產品或生態系統的專案。</p>

<CardGroup cols={2}>

<Card title="StarSwap 市集" icon="star" href="https://star-swap.com/">
  **社群** • `marketplace` `astronomy` `webapp` 完整的天文器材市集。圍繞 OpenClaw 生態系統建構而成。
</Card>

</CardGroup>

---

<h2 id="submit-your-project">提交您的專案</h2>

<p className="showcase-section-intro">如果您正在使用 OpenClaw 建構有趣的東西，請將它寄給我們。強而有力的截圖和具體的成果會有幫助。</p>

有東西想分享嗎？我們很樂於展示它！

<Steps>
  <Step title="分享它">在 Discord 的 [#self-promotion 頻道](https://discord.gg/clawd) 發布，或 [發推文給 @openclaw](https://x.com/openclaw)</Step>
  <Step title="包含詳情">告訴我們它的用途、連結到 repo/demo，如果您有截圖請一併分享</Step>
  <Step title="獲得精選">我們會將傑出的專案新增到此頁面</Step>
</Steps>
