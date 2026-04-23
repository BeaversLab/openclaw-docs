---
summary: "社群維護的 OpenClaw 外掛：瀏覽、安裝並提交您的外掛"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "社群外掛"
---

# 社群外掛

社群外掛是由社群建構和維護的第三方套件，透過新的通道、工具、提供者或其他功能來擴充 OpenClaw。它們發佈於 [ClawHub](/zh-Hant/tools/clawhub) 或 npm，並且只需一個指令即可安裝。

ClawHub 是社區插件的官方發現平台。請不要僅為了在此列出您的插件以提高可見性而開啟僅包含文檔的 PR；請改為在 ClawHub 上發布。

```bash
openclaw plugins install <package-name>
```

OpenClaw 會優先檢查 ClawHub，並自動回退至 npm。

## 已列出插件

### Apify

使用超過 20,000 個現成的爬蟲，從任何網站爬取資料。讓您的代理程式只需透過提問，即可從 Instagram、Facebook、TikTok、YouTube、Google Maps、Google 搜尋、電子商務網站等擷取資料。

- **npm:** `@apify/apify-openclaw-plugin`
- **repo:** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

Codex App Server 對話的獨立 OpenClaw 橋接器。將聊天綁定到 Codex 執行緒，使用純文字與其對話，並透過聊天原生指令進行恢復、規劃、審查、模型選擇、壓縮等操作。

- **npm:** `openclaw-codex-app-server`
- **repo:** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

使用串流模式的企業機器人整合。透過任何 DingTalk 用戶端支援文字、圖片和檔案訊息。

- **npm:** `@largezhou/ddingtalk`
- **repo:** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

OpenClaw 的無損內容管理外掛。基於 DAG 的對話摘要，具有增量壓縮功能 — 在減少 token 用量的同時，保持完整的內容保真度。

- **npm:** `@martian-engineering/lossless-claw`
- **repo:** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

將代理程式追蹤匯出至 Opik 的官方外掛。監控代理程式的行為、成本、token、錯誤等資訊。

- **npm:** `@opik/opik-openclaw`
- **repo:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

賦予您的 OpenClaw 代理程式 Live2D 虛擬形象，具備即時唇形同步、情緒表達以及文字轉語音功能。包含用於生成 AI 資產的創作者工具，以及一鍵部署至 Prometheus Marketplace 的功能。目前處於 Alpha 階段。

- **npm:** `@prometheusavatar/openclaw-plugin`
- **repo:** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

透過 QQ Bot API 將 OpenClaw 連接至 QQ。支援私人聊天、群組提及、頻道訊息，以及包含語音、圖片、影片和檔案在內的豐富媒體。

- **npm:** `@tencent-connect/openclaw-qqbot`
- **repo:** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

由騰訊企微團隊為 OpenClaw 開發的企微頻道外掛。透過企微機器人 WebSocket 持續連線驅動，它支援直接訊息與群組聊天、串流回覆、主動訊息推送、圖片/檔案處理、Markdown 格式、內建存取控制，以及文件/會議/訊息技能。

- **npm:** `@wecom/wecom-openclaw-plugin`
- **repo:** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## 提交您的外掛

我們歡迎實用、文件齊全且安全可營運的社群外掛。

<Steps>
  <Step title="發布至 ClawHub 或 npm">
    您的外掛必須能透過 `openclaw plugins install \<package-name\>` 安裝。
    請發布至 [ClawHub](/zh-Hant/tools/clawhub) (首選) 或 npm。
    請參閱 [建構外掛](/zh-Hant/plugins/building-plugins) 以取得完整指南。

  </Step>

  <Step title="託管於 GitHub">
    原始碼必須位於包含設定文件和問題追蹤器的公開存放庫中。

  </Step>

  <Step title="僅針對原始碼文件變更使用 docs PR">
    您不需要為了讓外掛被搜尋到而建立 docs PR。請改為將其發布至 ClawHub。

    僅當 OpenClaw 的原始文件需要實際內容變更時 (例如更正安裝指南或新增屬於主要文件集的跨存放庫文件)，才開啟 docs PR。

  </Step>
</Steps>

## 品質標準

| 需求                    | 原因                                           |
| ----------------------- | ---------------------------------------------- |
| 已發布至 ClawHub 或 npm | 使用者需要 `openclaw plugins install` 才能運作 |
| 公開的 GitHub 存放庫    | 原始碼審查、問題追蹤、透明度                   |
| 安裝與使用文件          | 使用者需要知道如何設定它                       |
| 積極維護                | 最近的更新或迅速處理問題                       |

低品質的封裝、不明的擁有權或未維護的套件可能會被拒絕。

## 相關

- [安裝與設定外掛](/zh-Hant/tools/plugin) — 如何安裝任何外掛
- [建構外掛](/zh-Hant/plugins/building-plugins) — 建立屬於您自己的外掛
- [外掛清單](/zh-Hant/plugins/manifest) — 清單架構
