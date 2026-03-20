---
summary: "配對概覽：核准誰可以傳送私訊給您 + 哪些節點可以加入"
read_when:
  - 設定 DM 存取控制
  - 配對新的 iOS/Android 節點
  - 審查 OpenClaw 安全性狀態
title: "配對"
---

# 配對

「配對」是 OpenClaw 明確的 **所有者核准** 步驟。
它用於兩個地方：

1. **DM 配對**（誰被允許與機器人對話）
2. **節點配對**（哪些裝置/節點被允許加入閘道網路）

安全性背景：[安全性](/zh-Hant/gateway/security)

## 1) DM 配對（傳入聊天存取）

當頻道設定為 DM 政策 `pairing` 時，未知發送者會收到一個簡短代碼，且在他們的訊息在您核准之前**不會被處理**。

預設 DM 政策記錄於：[安全性](/zh-Hant/gateway/security)

配對代碼：

- 8 個字元，大寫，無歧義字元 (`0O1I`)。
- **1 小時後過期**。機器人僅在建立新請求時發送配對訊息（大約每位發送者每小時一次）。
- 待處理的 DM 配對請求預設限制為每頻道 **3 個**；額外的請求將被忽略，直到其中一個過期或被批准。

### 批准發送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支援的頻道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`。

### 狀態儲存位置

儲存在 `~/.openclaw/credentials/` 下：

- 待處理請求：`<channel>-pairing.json`
- 已批准的允許清單儲存：`<channel>-allowFrom.json`

請將這些資料視為敏感資訊（它們控制對您助手的存取權限）。

## 2) 節點裝置配對 (iOS/Android/macOS/headless 節點)

節點以 **devices** 身份並帶有 `role: node` 連接到 Gateway。Gateway 會建立一個必須核准的裝置配對請求。

### 核准節點裝置

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 狀態儲存位置

儲存在 `~/.openclaw/devices/` 下：

- `pending.json` (短暫；待處理請求會過期)
- `paired.json` (已配對裝置 + 權杖)

### 備註

- 舊版 `node.pair.*` API (CLI: `openclaw nodes pending/approve`) 是一個獨立的 Gateway 擁有的配對儲存。WS 節點仍需要裝置配對。

## 相關文件

- 安全性模型 + 提示注入：[Security](/zh-Hant/gateway/security)
- 安全更新 (執行 doctor)：[Updating](/zh-Hant/install/updating)
- 頻道設定：
  - Telegram：[Telegram](/zh-Hant/channels/telegram)
  - WhatsApp：[WhatsApp](/zh-Hant/channels/whatsapp)
  - Signal：[Signal](/zh-Hant/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/zh-Hant/channels/bluebubbles)
  - iMessage (legacy)：[iMessage](/zh-Hant/channels/imessage)
  - Discord：[Discord](/zh-Hant/channels/discord)
  - Slack：[Slack](/zh-Hant/channels/slack)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
