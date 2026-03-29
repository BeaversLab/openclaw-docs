---
summary: "社群維護的 OpenClaw 外掛：瀏覽、安裝及提交您自己的外掛"
read_when:
  - You want to find third-party OpenClaw plugins
  - You want to publish or list your own plugin
title: "社群外掛"
---

# 社群外掛

社群外掛是第三方套件，透過新通道、工具、提供者或其他功能來擴展 OpenClaw。它們由社群建置與維護，發佈於 [ClawHub](/en/tools/clawhub) 或 npm，並可透過單一指令安裝。

```bash
openclaw plugins install <package-name>
```

OpenClaw 會優先檢查 ClawHub，並自動回退至 npm。

## 列出的外掛

### Codex App Server Bridge

用於 Codex App Server 對話的獨立 OpenClaw 橋接器。將聊天綁定到 Codex 執行緒，以純文字與其對話，並透過聊天原生指令控制其恢復、規劃、審查、模型選擇、壓縮等功能。

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

OpenClaw 的無損語境管理外掛。基於 DAG 的對話摘要，搭配增量壓縮 — 在減少 token 使用量的同時，保持完整的語境保真度。

- **npm：** `@martian-engineering/lossless-claw`
- **repo：** [github.com/Martian-Engineering/lossless-claw](https://github.com/Martian-Engineering/lossless-claw)

```bash
openclaw plugins install @martian-engineering/lossless-claw
```

### Opik

將代理程式追蹤匯出至 Opik 的官方外掛。監控代理程式行為、成本、token、錯誤等資訊。

- **npm：** `@opik/opik-openclaw`
- **repo：** [github.com/comet-ml/opik-openclaw](https://github.com/comet-ml/opik-openclaw)

```bash
openclaw plugins install @opik/opik-openclaw
```

### QQbot

透過 QQ Bot API 將 OpenClaw 連接至 QQ。支援私聊、群組提及、頻道訊息，以及包含語音、圖片、影片和檔案的豐富媒體。

- **npm：** `@sliverp/qqbot`
- **repo：** [github.com/sliverp/qqbot](https://github.com/sliverp/qqbot)

```bash
openclaw plugins install @sliverp/qqbot
```

### wecom

OpenClaw 企業微信頻道插件。
由企業微信 AI Bot WebSocket 持久連線支援的機器人插件，
支援私訊與群聊、串流回應以及主動發訊。

- **npm:** `@wecom/wecom-openclaw-plugin`
- **repo:** [github.com/WecomTeam/wecom-openclaw-plugin](https://github.com/WecomTeam/wecom-openclaw-plugin)

```bash
openclaw plugins install @wecom/wecom-openclaw-plugin
```

## 提交您的插件

我們歡迎實用、文件完善且安全可靠的社群插件。

<Steps>
  <Step title="發佈至 ClawHub 或 npm">
    您的插件必須可以透過 `openclaw plugins install \<package-name\>` 安裝。
    發佈至 [ClawHub](/en/tools/clawhub) (優先) 或 npm。
    請參閱 [建置插件](/en/plugins/building-plugins) 以取得完整指南。

  </Step>

  <Step title="託管於 GitHub">
    原始碼必須位於包含設定文件和問題追蹤器的
    公開儲存庫中。

  </Step>

  <Step title="開啟 PR">
    使用以下資訊將您的插件新增至此頁面：

    - 插件名稱
    - npm 套件名稱
    - GitHub 儲存庫 URL
    - 單行描述
    - 安裝指令

  </Step>
</Steps>

## 品質標準

| 需求                  | 原因                                           |
| --------------------- | ---------------------------------------------- |
| 發佈於 ClawHub 或 npm | 使用者需要 `openclaw plugins install` 才能運作 |
| 公開的 GitHub 儲存庫  | 原始碼審查、問題追蹤、透明度                   |
| 設定與使用文件        | 使用者需要知道如何進行設定                     |
| 積極維護              | 近期有更新或能回應問題處理                     |

低品質的封裝、不明的所有權或未維護的套件可能會被拒絕。

## 相關

- [安裝與設定插件](/en/tools/plugin) — 如何安裝任何插件
- [建置插件](/en/plugins/building-plugins) — 建立屬於您自己的插件
- [插件清單](/en/plugins/manifest) — 清單架構
