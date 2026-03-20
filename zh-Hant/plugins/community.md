---
summary: "社群外掛：品質門檻、託管要求以及 PR 提交流程"
read_when:
  - 您想要發布第三方 OpenClaw 外掛
  - 您想要提案將外掛列入文件
title: "社群外掛"
---

# 社群外掛

本頁面追蹤 OpenClaw 的高品質**社群維護外掛**。

我們接受符合品質門檻、在此新增社群外掛的 PR。

## 列入條件

- 外掛套件已發布於 npmjs（可透過 `openclaw plugins install <npm-spec>` 安裝）。
- 原始碼託管於 GitHub（公開儲存庫）。
- 儲存庫包含設定/使用文件與問題追蹤器。
- 外掛具有明確的維護信號（積極的維護者、最近的更新，或對問題的快速回應）。

## 如何提交

開啟一個 PR，並包含以下資訊將您的 新增至本頁面：

- 外掛名稱
- npm 套件名稱
- GitHub 儲存庫 URL
- 一句話描述
- 安裝指令

## 審查門檻

我們偏好實用、文件齊全且操作安全的外掛。
低品質的包裝、不明確的所有權或未維護的套件可能會被拒絕。

## 候選格式

新增條目時請使用此格式：

- **外掛名稱** — 簡短描述
  npm: `@scope/package`
  repo: `https://github.com/org/repo`
  install: `openclaw plugins install @scope/package`

## 已列入的外掛

- **WeChat** — 透過 WeChatPadPro（iPad 協定）將 OpenClaw 連接至微信個人帳號。支援文字、圖片與檔案傳輸，以及關鍵字觸發的對話。
  npm: `@icesword760/openclaw-wechat`
  repo: `https://github.com/icesword0760/openclaw-wechat`
  install: `openclaw plugins install @icesword760/openclaw-wechat`

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
