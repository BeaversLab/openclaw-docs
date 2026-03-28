---
summary: "Community plugins：品質門檻、託管要求與 PR 提交流程"
read_when:
  - You want to publish a third-party OpenClaw plugin
  - You want to propose a plugin for docs listing
title: "Community plugins"
---

# Community plugins

本頁面追蹤 OpenClaw 的高品質 **社群維護外掛**。

當社群外掛符合品質門檻時，我們接受將其新增至此頁面的 PR。

## 列出示例的必要條件

- 外掛套件已發佈至 npmjs（可透過 `openclaw plugins install <npm-spec>` 安裝）。
- 原始碼託管於 GitHub（公開儲存庫）。
- 儲存庫包含設定/使用文件與問題追蹤器。
- 外掛具有明確的維護信號（積極的維護者、近期更新或迅速回應問題處理）。

## 如何提交

開啟一個 PR 將您的外掛新增至此頁面，包含：

- 外掛名稱
- npm 套件名稱
- GitHub 儲存庫 URL
- 一句話描述
- 安裝指令

## 審核門檻

我們偏好的外掛應具備實用性、文件齊全且操作安全。
低品質的封裝、所有權不明或未維護的套件可能會被拒絕。

## 候選格式

新增條目時請使用此格式：

- **Plugin Name** — 簡短描述
  npm: `@scope/package`
  repo: `https://github.com/org/repo`
  install: `openclaw plugins install @scope/package`

## 已列出外掛

- **openclaw-dingtalk** — OpenClaw DingTalk 頻道外掛能使用串流模式整合企業機器人。透過任何 DingTalk 客戶端，它支援文字、圖片與檔案訊息。
  npm: `@largezhou/ddingtalk`
  repo: `https://github.com/largezhou/openclaw-dingtalk`
  install: `openclaw plugins install @largezhou/ddingtalk`
- **QQbot** — 透過 QQ Bot API 將 OpenClaw 連接至 QQ。支援私聊、群組提及、頻道訊息，以及包含語音、圖片、影片和檔案的富媒體。
  npm: `@sliverp/qqbot`
  repo: `https://github.com/sliverp/qqbot`
  install: `openclaw plugins install @sliverp/qqbot`

- **WeChat** — 透過 WeChatPadPro (iPad 協定) 將 OpenClaw 連接至微信個人帳號。支援文字、圖片和檔案交換，以及關鍵字觸發的對話。
  npm: `@icesword760/openclaw-wechat`
  repo: `https://github.com/icesword0760/openclaw-wechat`
  install: `openclaw plugins install @icesword760/openclaw-wechat`
