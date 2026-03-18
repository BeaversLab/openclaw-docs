---
summary: "配對概覽：核准誰可以傳送私訊給您 + 哪些節點可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配對"
---

# 配對

「配對」是 OpenClaw 的明確**所有者核准**步驟。
它用於兩個地方：

1. **DM 配對**（誰被允許與機器人交談）
2. **節點配對**（哪些裝置/節點被允許加入閘道網路）

安全性背景：[安全性](/zh-Hant/gateway/security)

## 1) DM 配對（傳入聊天存取權）

當頻道設定為 DM 原則 `pairing` 時，未知傳送者會收到一個短代碼，且在他們的訊息被您核准之前**不會被處理**。

預設 DM 原則記錄於：[安全性](/zh-Hant/gateway/security)

配對代碼：

- 8 個字元，大寫，無模糊字元（`0O1I`）。
- **1 小時後過期**。機器人僅在建立新請求時發送配對訊息（每位傳送者大約每小時一次）。
- 待處理的 DM 配對請求預設上限為**每個頻道 3 個**；額外的請求將被忽略，直到其中一個過期或被核准。

### 核准傳送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支援的頻道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`、`feishu`。

### 狀態儲存位置

儲存在 `~/.openclaw/credentials/` 下：

- 待處理請求：`<channel>-pairing.json`
- 已核准允許清單儲存：
  - 預設帳號：`<channel>-allowFrom.json`
  - 非預設帳號：`<channel>-<accountId>-allowFrom.json`

帳號範圍行為：

- 非預設帳號僅讀寫其範圍內的允許清單檔案。
- 預設帳號使用頻道範圍的無範圍允許清單檔案。

請將這些視為敏感資料（因為它們控制對您助理的存取權）。

## 2) 節點裝置配對（iOS/Android/macOS/headless 節點）

節點透過 `role: node` 以**裝置**身分連接到閘道。閘道
會建立必須被核准的裝置配對請求。

### 透過 Telegram 配對（建議用於 iOS）

如果您使用 `device-pair` 外掛程式，您可以完全透過 Telegram 進行首次裝置配對：

1. 在 Telegram 中，發送訊息給您的機器人：`/pair`
2. 機器人會回覆兩則訊息：一則是指示訊息，另一則是獨立的 **設定代碼** 訊息（在 Telegram 中易於複製/貼上）。
3. 在您的手機上，開啟 OpenClaw iOS 應用程式 → Settings → Gateway。
4. 貼上設定代碼並連接。
5. 回到 Telegram：`/pair approve`

設定代碼是 base64 編碼的 JSON 載荷，包含：

- `url`：Gateway WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：短期且僅限單一設備的啟動令牌 (bootstrap token)，用於初始配對交握

在設定代碼有效期間，請將其視為密碼般妥善保管。

### 批准節點設備

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### 節點配對狀態儲存

儲存在 `~/.openclaw/devices/` 下：

- `pending.json`（短期；待處理的請求會過期）
- `paired.json`（已配對設備 + 令牌）

### 備註

- 舊版 `node.pair.*` API（CLI：`openclaw nodes pending/approve`）是一個獨立的、由 Gateway 擁有的配對儲存。WS 節點仍需要設備配對。

## 相關文件

- 安全性模型與提示注入：[Security](/zh-Hant/gateway/security)
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
