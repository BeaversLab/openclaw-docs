---
summary: "社群維護的 OpenClaw 外掛程式：瀏覽、安裝並提交您自己的"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "社群外掛程式"
---

社群外掛程式是第三方套件，透過新的通道、工具、供應商或其他功能來擴充 OpenClaw。它們由社群建構與維護，發佈於 [ClawHub](/zh-Hant/tools/clawhub) 或 npm，並可透過單一指令安裝。

ClawHub 是社群外掛程式的官方探索平台。請勿僅為了在此處加入您的插件以提升可見性而開啟純文件的 PR；請改為將其發佈至 ClawHub。

```bash
openclaw plugins install <package-name>
```

OpenClaw 會優先檢查 ClawHub，並自動回退至 npm。

## 列出的外掛程式

### Apify

使用超過 20,000 個現成的擷取器，從任何網站擷取資料。讓您的代理程式僅透過指令，即可從 Instagram、Facebook、TikTok、YouTube、Google Maps、Google 搜尋、電商網站等提取資料。

- **npm：** `@apify/apify-openclaw-plugin`
- **repo：** [github.com/apify/apify-openclaw-plugin](https://github.com/apify/apify-openclaw-plugin)

```bash
openclaw plugins install @apify/apify-openclaw-plugin
```

### Codex App Server Bridge

用於 Codex App Server 對話的獨立 OpenClaw 橋接器。將聊天綁定到 Codex 主題串，使用純文字與其交談，並透過聊天原生指令控制它以進行恢復、規劃、審查、模型選擇、壓縮等操作。

- **npm：** `openclaw-codex-app-server`
- **repo：** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

使用串流模式的企業機器人整合。透過任何 DingTalk 用戶端支援文字、圖片和檔案訊息。

- **npm：** `@largezhou/ddingtalk`
- **repo：** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

OpenClaw 的無損語境管理外掛程式。基於 DAG 的對話摘要與增量壓縮 — 在減少 Token 使用量的同時，保持完整的語境保真度。

- **npm：** `@martian-engineering/lossless-claw`
- **repo：** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

將代理程式追蹤匯出至 Opik 的官方外掛程式。監控代理程式的行為、成本、Token、錯誤等。

- **npm：** `@opik/opik-openclaw`
- **repo:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### Prometheus Avatar

為您的 OpenClaw 代理賦予即時口型同步、表情表達和文字轉語音功能的 Live2D 虛擬形象。包含用於生成 AI 資產的創作者工具以及一鍵部署到 Prometheus Marketplace 的功能。目前處於 Alpha 階段。

- **npm:** `@prometheusavatar/openclaw-plugin`
- **repo:** [github.com/myths-labs/prometheus-avatar](https://github.com/myths-labs/prometheus-avatar)

```bash
openclaw plugins install @prometheusavatar/openclaw-plugin
```

### QQbot

透過 QQ Bot API 將 OpenClaw 連接到 QQ。支援私聊、群組提及、頻道訊息，以及包含語音、圖片、影片和檔案在內的富媒體。

目前的 OpenClaw 版本內建了 QQ Bot。對於一般安裝，請使用 [QQ Bot](/zh-Hant/channels/qqbot) 中的內建設定；僅當您特意想要騰訊維護的獨立套件時，才安裝此外掛程式。

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

### Yuanbao

由騰訊 Yuanbao 團隊為 OpenClaw 開發的 Yuanbao 頻道外掛。基於 WebSocket 持續連線，支援私訊與群聊、串流回覆、主動訊息、圖片/檔案/音訊/影片處理、Markdown 格式、內建存取控制和斜線指令選單。

- **npm:** `openclaw-plugin-yuanbao`
- **repo:** [github.com/yb-claw/openclaw-plugin-yuanbao](https://github.com/yb-claw/openclaw-plugin-yuanbao)

```bash
openclaw plugins install openclaw-plugin-yuanbao
```

## 提交您的外掛

我們歡迎實用、有文件記錄且操作安全的社群外掛。

<Steps>
  <Step title="發布到 ClawHub 或 npm">
    您的外掛必須能透過 `openclaw plugins install \<package-name\>` 安裝。
    發布到 [ClawHub](/zh-Hant/tools/clawhub) (優先) 或 npm。
    請參閱 [Building Plugins](/zh-Hant/plugins/building-plugins) 瞭解完整指南。

  </Step>

  <Step title="託管在 GitHub 上">
    原始碼必須位於具有設定文件和問題追蹤器的公開儲存庫中。

  </Step>

  <Step title="Use docs PRs only for source-doc changes">
    您不需要為了讓外掛被發現而提交 docs PR。請改為在 ClawHub 上發布它。

    僅當 OpenClaw 的原始文檔需要實際內容變更時，才開啟 docs PR，例如更正安裝指南或新增屬於主文檔集的跨儲存庫文檔。

  </Step>
</Steps>

## 品質門檻

| 需求                    | 原因                                           |
| ----------------------- | ---------------------------------------------- |
| 已發布於 ClawHub 或 npm | 使用者需要 `openclaw plugins install` 才能運作 |
| 公開的 GitHub 儲存庫    | 原始碼審查、問題追蹤、透明度                   |
| 設定與使用說明文件      | 使用者需要知道如何進行設定                     |
| 積極維護                | 最近的更新或迅速的問題處理                     |

低品質的包裝、所有權不明或未維護的套件可能會被拒絕。

## 相關

- [安裝與設定外掛](/zh-Hant/tools/plugin) — 如何安裝任何外掛
- [建置外掛](/zh-Hant/plugins/building-plugins) — 建立您自己的外掛
- [外掛清單](/zh-Hant/plugins/manifest) — 清單架構
