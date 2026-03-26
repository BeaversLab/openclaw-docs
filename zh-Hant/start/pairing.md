---
summary: "配對概述：批准誰可以傳送私人訊息給你 + 哪些節點可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配對"
---

# 配對

「配對」是 OpenClaw 明確的**擁有者批准**步驟。
它用於兩個地方：

1. **DM 配對**（誰被允許與機器人交談）
2. **節點配對**（哪些設備/節點被允許加入閘道網路）

安全性背景：[安全性](/zh-Hant/gateway/security)

## 1) DM 配對（傳入聊天存取）

當頻道配置了 DM 原則 `pairing` 時，未知的發送者會收到一個短代碼，並且在您批准之前，他們的訊息**不會被處理**。

預設的 DM 原則記錄於：[安全性](/zh-Hant/gateway/security)

配對代碼：

- 8 個字元，大寫，無歧義字元（`0O1I`）。
- **1 小時後過期**。機器人僅在建立新請求時發送配對訊息（大約每個發送者每小時一次）。
- 待處理的 DM 配對請求預設上限為每頻道 **3 個**；額外的請求將被忽略，直到其中一個過期或獲得批准。

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

請將這些視為敏感資料（它們控制對您助手的存取）。

## 2) 節點設備配對（iOS/Android/macOS/headless 節點）

節點以 **設備** 身分連接到閘道，並帶有 `role: node`。閘道
會建立一個設備配對請求，必須獲得批准。

### 批准節點設備

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 狀態儲存位置

儲存在 `~/.openclaw/devices/` 下：

- `pending.json`（短期存在；待處理請求會過期）
- `paired.json`（已配對設備 + 權杖）

### 備註

- 舊版的 `node.pair.*` API（CLI：`openclaw nodes pending/approve`）是一個
  獨立的閘道擁有的配對儲存。WS 節點仍然需要設備配對。

## 相關文件

- 安全模型與提示詞注入：[Security](/zh-Hant/gateway/security)
- 安全更新（執行 doctor）：[Updating](/zh-Hant/install/updating)
- 頻道設定：
  - Telegram：[Telegram](/zh-Hant/channels/telegram)
  - WhatsApp：[WhatsApp](/zh-Hant/channels/whatsapp)
  - Signal：[Signal](/zh-Hant/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/zh-Hant/channels/bluebubbles)
  - iMessage (舊版)：[iMessage](/zh-Hant/channels/imessage)
  - Discord：[Discord](/zh-Hant/channels/discord)
  - Slack：[Slack](/zh-Hant/channels/slack)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
