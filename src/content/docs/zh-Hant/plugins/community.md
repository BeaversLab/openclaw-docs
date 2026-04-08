---
summary: "社群維護的 OpenClaw 外掛：瀏覽、安裝及提交您自己的外掛"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "社群外掛"
---

# 社群外掛

社群外掛是第三方套件，透過新通道、工具、提供者或其他功能來擴展 OpenClaw。它們由社群建置與維護，發佈於 [ClawHub](/en/tools/clawhub) 或 npm，並可透過單一指令安裝。

ClawHub 是社區插件的官方發現平台。請不要僅為了在此列出您的插件以提高可見性而開啟僅包含文檔的 PR；請改為在 ClawHub 上發布。

```bash
openclaw plugins install <package-name>
```

OpenClaw 會優先檢查 ClawHub，並自動回退至 npm。

## 已列出插件

### Codex App Server Bridge

用於 Codex App Server 對話的獨立 OpenClaw 橋接器。將聊天綁定到 Codex 線程，使用純文本與其對話，並使用聊天原生命令控制恢復、規劃、審查、模型選擇、壓縮等功能。

- **npm:** `openclaw-codex-app-server`
- **repo:** [github.com/pwrdrvr/openclaw-codex-app-server](https://github.com/pwrdrvr/openclaw-codex-app-server)

```bash
openclaw plugins install openclaw-codex-app-server
```

### DingTalk

使用串流模式的企業機器人整合。透過任何 DingTalk 客戶端支援文字、圖片和檔案訊息。

- **npm:** `@largezhou/ddingtalk`
- **repo:** [github.com/largezhou/openclaw-dingtalk](https://github.com/largezhou/openclaw-dingtalk)

```bash
openclaw plugins install @largezhou/ddingtalk
```

### Lossless Claw (LCM)

OpenClaw 的無損語境管理插件。基於 DAG 的對話摘要與增量壓縮 — 在減少 Token 使用量的同時保持完整的語境保真度。

- **npm:** `@martian-engineering/lossless-claw`
- **repo:** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

將 Agent 追蹤資料匯出至 Opik 的官方插件。監控 Agent 行為、成本、Token、錯誤等。

- **npm:** `@opik/opik-openclaw`
- **repo:** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### QQbot

透過 QQ Bot API 將 OpenClaw 連接到 QQ。支援私人聊天、群組提及、頻道訊息，以及包括語音、圖片、影片和檔案在內的富媒體。

- **npm:** `@tencent-connect/openclaw-qqbot`
- **repo:** [github.com/tencent-connect/openclaw-qqbot](https://github.com/tencent-connect/openclaw-qqbot)

```bash
openclaw plugins install @tencent-connect/openclaw-qqbot
```

### wecom

由騰訊企業微信團隊開發的 OpenClaw 企業微信頻道插件。由企業微信機器人 WebSocket 持久連接提供支援，它支援直接訊息和群組聊天、串流回覆、主動訊息、圖片/檔案處理、Markdown 格式、內建存取控制以及文件/會議/訊息技能。

- **npm:** `@wecom/wecom-openclaw-plugin`
- **repo:** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## 提交您的插件

我們歡迎實用、有文件且操作安全的社群外掛。

<Steps>
  <Step title="發布至 ClawHub 或 npm">
    您的外掛必須能透過 `openclaw plugins install \<package-name\>` 安裝。
    發布至 [ClawHub](/en/tools/clawhub) (優先) 或 npm。
    請參閱 [Building Plugins](/en/plugins/building-plugins) 以取得完整指南。

  </Step>

  <Step title="託管於 GitHub">
    原始碼必須位於包含設定文件和問題追蹤器的公開存放庫中。

  </Step>

  <Step title="僅針對原始碼文件變更使用文件 PR">
    您不需要為了讓外掛被發現而提交文件 PR。請改為將其發布至 ClawHub。

    僅當 OpenClaw 的原始碼文件需要實際內容變更時，才開啟文件 PR，例如修正安裝指引或新增屬於主文件集的跨存放庫文件。

  </Step>
</Steps>

## 品質標準

| 需求                  | 原因                                       |
| --------------------- | ------------------------------------------ |
| 發布於 ClawHub 或 npm | 使用者需要 `openclaw plugins install` 運作 |
| 公開的 GitHub 存放庫  | 原始碼審查、問題追蹤、透明度               |
| 設定與使用文件        | 使用者需要知道如何設定它                   |
| 積極維護              | 最近的更新或積極回應問題處理               |

低投入的包裝器、所有權不明或未維護的套件可能會被拒絕。

## 相關

- [Install and Configure Plugins](/en/tools/plugin) — 如何安裝任何外掛
- [Building Plugins](/en/plugins/building-plugins) — 建立您自己的外掛
- [Plugin Manifest](/en/plugins/manifest) — 設定檔結構描述
