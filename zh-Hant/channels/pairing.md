---
summary: "配對概述：批准誰可以向您發送直接訊息 + 哪些節點可以加入"
read_when:
  - 設定直接訊息存取控制
  - 配對新的 iOS/Android 節點
  - 審查 OpenClaw 安全姿勢
title: "配對"
---

# 配對

「配對」是 OpenClaw 明確的**所有者批准**步驟。
它用於兩個地方：

1. **直接訊息配對**（誰被允許與機器人交談）
2. **節點配對**（哪些裝置/節點被允許加入閘道網路）

安全性背景：[安全性](/zh-Hant/gateway/security)

## 1) 直接訊息配對（傳入聊天存取）

當頻道配置了直接訊息策略 `pairing` 時，未知發送者會收到一個簡短代碼，並且在他們的訊息被您批准之前**不會被處理**。

預設直接訊息策略記錄於：[安全性](/zh-Hant/gateway/security)

配對代碼：

- 8 個字元，大寫，無歧義字元（`0O1I`）。
- **1 小時後過期**。機器人僅在建立新請求時發送配對訊息（每位發送者大約每小時一次）。
- 待處理的直接訊息配對請求預設上限為每個頻道 **3 個**；額外的請求將被忽略，直到其中一個過期或被批准。

### 批准發送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支援的頻道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`、`feishu`。

### 狀態儲存位置

儲存在 `~/.openclaw/credentials/` 下：

- 待處理請求：`<channel>-pairing.json`
- 已批准的白名單儲存：
  - 預設帳戶：`<channel>-allowFrom.json`
  - 非預設帳戶：`<channel>-<accountId>-allowFrom.json`

帳戶範圍行為：

- 非預設帳戶僅讀取/寫入其範圍內的白名單檔案。
- 預設帳戶使用頻道範圍的無範圍白名單檔案。

將這些視為敏感資訊（它們控管您助理的存取權）。

## 2) 節點裝置配對（iOS/Android/macOS/headless 節點）

節點透過 `role: node` 作為**裝置**連接到閘道。閘道會
建立必須經過批准的裝置配對請求。

### 透過 Telegram 配對（推薦用於 iOS）

如果您使用 `device-pair` 外掛，您可以完全透過 Telegram 進行首次裝置配對：

1. 在 Telegram 中，傳送訊息給您的機器人：`/pair`
2. 機器人會回覆兩則訊息：一則指示訊息，以及一則獨立的 **設定代碼** 訊息（在 Telegram 中容易複製/貼上）。
3. 在手機上，開啟 OpenClaw iOS 應用程式 → 設定 → Gateway。
4. 貼上設定代碼並連線。
5. 回到 Telegram：`/pair approve`

設定代碼是一個 base64 編碼的 JSON 載荷，包含：

- `url`：Gateway WebSocket URL (`ws://...` 或 `wss://...`)
- `bootstrapToken`：一個短期、單一裝置的啟動令牌 (bootstrap token)，用於初始配對握手

在設定代碼有效期間，請將其視為密碼處理。

### 批准節點裝置

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 節點配對狀態儲存

儲存在 `~/.openclaw/devices/` 下：

- `pending.json` （短期；待處理請求會過期）
- `paired.json` （已配對裝置 + 令牌）

### 註記

- 舊版的 `node.pair.*` API (CLI: `openclaw nodes pending/approve`) 是一個
  獨立的 Gateway 擁有的配對儲存庫。WS 節點仍需要裝置配對。

## 相關文件

- 安全性模型 + 提示詞注入：[Security](/zh-Hant/gateway/security)
- 安全更新（執行 doctor）：[Updating](/zh-Hant/install/updating)
- 頻道設定：
  - Telegram：[Telegram](/zh-Hant/channels/telegram)
  - WhatsApp：[WhatsApp](/zh-Hant/channels/whatsapp)
  - Signal：[Signal](/zh-Hant/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/zh-Hant/channels/bluebubbles)
  - iMessage (舊版)：[iMessage](/zh-Hant/channels/imessage)
  - Discord：[Discord](/zh-Hant/channels/discord)
  - Slack：[Slack](/zh-Hant/channels/slack)

import en from "/components/footer/en.mdx";

<en />
