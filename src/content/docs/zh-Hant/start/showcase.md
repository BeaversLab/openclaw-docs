---
summary: "社群建立的專案與由 OpenClaw 驅動的整合"
title: "展示"
description: "來自社群的真實 OpenClaw 專案"
read_when:
  - Looking for real OpenClaw usage examples
  - Updating community project highlights
---

OpenClaw 專案並非玩具演示。人們正透過他們已經使用的管道——Telegram、WhatsApp、Discord 和終端機的原生聊天建構；以及用於預約、購物和支援的無需等待 API 的真實自動化；以及與印表機、吸塵器、相機和家居系統的實體世界整合——來交付 PR 審查迴圈、行動應用程式、家庭自動化、語音系統、開發工具和記憶體密集的工作流程。

<Info>**想被展示嗎？** 在 Discord 的 [#self-promotion on Discord](https://discord.gg/clawd) 分享您的專案，或在 X 上 [標記 @openclaw](https://x.com/openclaw)。</Info>

## Discord 最新精選

編程、開發工具、行動應用和聊天原生產品建置領域的近期傑出作品。

<CardGroup cols={2}>

<Card title="PR 審查到 Telegram 反饋" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode 完成變更，開啟 PR，OpenClaw 審查差異並在 Telegram 中回覆建議以及明確的合併結論。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw PR review feedback delivered in Telegram" />
</Card>

<Card title="幾分鐘內建立酒窖技能" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

請求「Robby」（@openclaw）建立一個本機酒窖技能。它會要求提供範例 CSV 匯出和儲存路徑，然後建構並測試該技能（範例中為 962 瓶酒）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw building a local wine cellar skill from CSV" />
</Card>

<Card title="Tesco 購物自動駕駛" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每週餐點計畫、常購清單、預約送貨時段、確認訂單。無需 API，僅透過瀏覽器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="Tesco shop automation via chat" />
</Card>

<Card title="SNAG screenshot-to-Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

使用熱鍵擷取螢幕區域，透過 Gemini 視覺，立即在剪貼簿中取得 Markdown。

  <img src="/assets/showcase/snag.png" alt="SNAG screenshot-to-markdown tool" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

用於管理 Agents、Claude、Codex 和 OpenClaw 技能與指令的桌面應用程式。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI app" />
</Card>

<Card title="Telegram voice notes (papla.media)" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

封裝 papla.media TTS 並將結果傳送為 Telegram 語音訊息（無煩人的自動播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="Telegram voice note output from TTS" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

透過 Homebrew 安裝的輔助工具，用於列出、檢查和監控本機 OpenAI Codex 工作階段（CLI + VS Code）。

  <img src="/assets/showcase/codexmonitor.png" alt="CodexMonitor on ClawHub" />
</Card>

<Card title="Bambu 3D 印表機控制" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制並排除 BambuLab 印表機的故障：狀態、任務、相機、AMS、校準等等。

  <img src="/assets/showcase/bambu-cli.png" alt="ClawHub 上的 Bambu CLI 技能" />
</Card>

<Card title="維也納交通" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

維也納公共交通的即時出發資訊、服務中斷、電梯狀態和路線規劃。

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHub 上的 Wiener Linien 技能" />
</Card>

<Card title="ParentPay 學校午餐" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

透過 ParentPay 自動預訂英國學校午餐。使用滑鼠座標進行可靠的表格儲存格點擊。

</Card>

<Card title="R2 上傳" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

上傳至 Cloudflare R2/S3 並產生安全的預先簽署下載連結。適用於遠端 OpenClaw 執行個體。

  <img src="/assets/showcase/r2-upload.png" alt="ClawHub 上的 R2 上傳技能" />
</Card>

<Card title="透過 Telegram 開發 iOS 應用" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

構建了一個完整的 iOS 應用，包含地圖和語音錄製功能，完全透過 Telegram 聊天部署至 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="TestFlight 上的 iOS 應用" />
</Card>

<Card title="Oura Ring 健康助理" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

個人 AI 健康助理，整合 Oura 指環數據與日曆、預約及健身房排程。

  <img src="/assets/showcase/oura-health.png" alt="Oura 指環健康助理" />
</Card>

<Card title="Kev's Dream Team (14+ 個代理程式)" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration`

14 個以上的代理程式在同一個閘道下，由 Opus 4.5 編排器協調並委派給 Codex 工作程式。查看[技術撰寫](https://github.com/adam91holt/orchestrated-ai-articles)和 [Clawdspace](https://github.com/adam91holt/clawdspace) 以了解代理程式沙盒機制。

</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli`

Linear 的 CLI 工具，與代理程式工作流程（Claude Code、OpenClaw）整合。從終端機管理問題、專案和工作流程。

</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli`

透過 Beeper Desktop 讀取、傳送和封存訊息。使用 Beeper 本地 MCP API，讓代理程式在一個地方管理您的所有聊天（iMessage、WhatsApp 等）。

</Card>

</CardGroup>

## 自動化與工作流程

排程、瀏覽器控制、支援迴圈，以及產品中「直接幫我處理任務」的一面。

<CardGroup cols={2}>

<Card title="Winix 空氣清淨機控制" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 發現並確認了空氣清淨機的控制項，接著由 OpenClaw 接手管理室內空氣品質。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="透過 OpenClaw 控制 Winix 空氣清淨機" />
</Card>

<Card title="美麗的天空攝影" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill`

由屋頂攝影機觸發：要求 OpenClaw 在天空看起來美麗時拍攝照片。它設計了一個技能並拍下了照片。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="由 OpenClaw 拍攝的屋頂攝影機天空快照" />
</Card>

<Card title="視覺化晨間簡報場景" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `telegram`

每日排程提示透過 OpenClaw 人格生成一張場景圖片（天氣、任務、日期、喜歡的貼文或語錄）。

</Card>

<Card title="帕德爾場地預訂" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`

Playtomic 可用性檢查器加上預訂 CLI。不再錯過任何空場。

  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="會計檔案收集" icon="file-invoice-dollar">
  **社群** • `automation` `email` `pdf`

從電子郵件收集 PDF，為稅務顧問準備文件。每月會計作業自動化。

</Card>

<Card title="沙發馬鈴薯開發模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `migration` `astro`

在觀看 Netflix 的同時，透過 Telegram 重建了整個個人網站 — Notion 到 Astro，遷移了 18 篇文章，DNS 到 Cloudflare。從未打開過筆記型電腦。

</Card>

<Card title="求職代理程式" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜尋職缺，根據履歷關鍵字進行配對，並傳回附有連結的相關機會。使用 JSearch API 在 30 分鐘內建構完成。

</Card>

<Card title="Jira 技能構建器" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `jira` `skill` `devtools`

OpenClaw 連接到 Jira，然後即時生成了一個新技能（甚至在它存在於 ClawHub 之前）。

</Card>

<Card title="透過 Telegram 使用 Todoist 技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `todoist` `skill` `telegram`

自動化 Todoist 任務，並讓 OpenClaw 直接在 Telegram 聊天中生成技能。

</Card>

<Card title="TradingView 分析" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

透過瀏覽器自動化登入 TradingView、截圖圖表，並根據需求執行技術分析。無需 API — 僅需瀏覽器控制。

</Card>

<Card title="Slack 自動支援" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

監看公司的 Slack 頻道、提供協助回應，並將通知轉發至 Telegram。曾在無人要求下，自主修復已部署應用程式中的生產環境錯誤。

</Card>

</CardGroup>

## 知識與記憶

能對個人或團隊知識進行索引、搜尋、記憶和推理的系統。

<CardGroup cols={2}>

<Card title="xuezh 中文學習" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`

透過 OpenClaw 運作的中文學習引擎，具備發音回饋與學習流程。

  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh 發音回饋" />
</Card>

<Card title="WhatsApp 記憶庫" icon="vault">
  **社群** • `memory` `transcription` `indexing`

匯入完整的 WhatsApp 匯出資料，轉錄 1000+ 則語音訊息，與 git 記錄交叉比對，輸出連結的 Markdown 報告。

</Card>

<Card title="Karakeep 語意搜尋" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`

使用 Qdrant 加上 OpenAI 或 Ollama 嵌入，將向量搜尋新增至 Karakeep 書籤。

</Card>

<Card title="Inside-Out-2 記憶" icon="brain">
  **社群** • `memory` `beliefs` `self-model`

獨立的記憶管理器，將會話檔案轉化為記憶，接著是信念，然後是演進的自我模型。

</Card>

</CardGroup>

## 語音與電話

以語音為優先的進入點、電話橋接器，以及重度依賴轉錄的工作流程。

<CardGroup cols={2}>

<Card title="Clawdia 電話橋接" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`

Vapi 語音助理至 OpenClaw HTTP 橋接。與您的代理進行近乎即時的通話。

</Card>

<Card title="OpenRouter 轉錄" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

透過 OpenRouter (Gemini 等) 進行多語音訊轉錄。可於 ClawHub 取得。

  <img src="/assets/showcase/openrouter-transcribe.png" alt="ClawHub 上的 OpenRouter 轉錄技能" />
</Card>

</CardGroup>

## 基礎設施與部署

讓 OpenClaw 更容易運行和擴展的打包、部署和整合功能。

<CardGroup cols={2}>

<Card title="Home Assistant 附加元件" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`

在 Home Assistant OS 上運行，支援 SSH 隧道與持久狀態的 OpenClaw 閘道。

</Card>

<Card title="Home Assistant 技能" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation`

透過自然語言控制和自動化 Home Assistant 裝置。

  <img src="/assets/showcase/homeassistant.png" alt="ClawHub 上的 Home Assistant 技能" />
</Card>

<Card title="Nix 打包" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`

功能齊全的 nixified OpenClaw 設定，用於可重現的部署。

</Card>

<Card title="CalDAV 日曆" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill`

使用 khal 和 vdirsyncer 的日曆技能。自託管的日曆整合。

  <img src="/assets/showcase/caldav-calendar.png" alt="ClawHub 上的 CalDAV 日曆技能" />
</Card>

</CardGroup>

## 家庭與硬體

OpenClaw 的實體世界面向：家庭、感測器、攝影機、吸塵器和其他裝置。

<CardGroup cols={2}>

<Card title="GoHome 家庭自動化" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`

Nix 原生家庭自動化，並以 OpenClaw 作為介面，另附 Grafana 儀表板。

  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana 儀表板" />
</Card>

<Card title="Roborock 吸塵器" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`

透過自然對話控制您的 Roborock 機器人吸塵器。

  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock 狀態" />
</Card>

</CardGroup>

## 社群專案

從單一工作流程發展而來，成為更廣泛的產品或生態系統的專案。

<CardGroup cols={2}>

<Card title="StarSwap 市集" icon="star" href="https://star-swap.com/">
  **社群** • `marketplace` `astronomy` `webapp`

完整的天文器材市集。使用 OpenClaw 生態系統及其周邊技術建構而成。

</Card>

</CardGroup>

## 提交您的專案

<Steps>
  <Step title="分享它">在 [Discord 上的 #self-promotion 頻道](https://discord.gg/clawd) 發布或在 [推特 @openclaw](https://x.com/openclaw) 上推文。</Step>
  <Step title="包含詳細資訊">告訴我們它的用途，連結到程式庫或演示，並分享一個截圖（如果有）。</Step>
  <Step title="獲得特別介紹">我們會將傑出的專案新增到此頁面。</Step>
</Steps>

## 相關

- [開始使用](/zh-Hant/start/getting-started)
- [OpenClaw](/zh-Hant/start/openclaw)
