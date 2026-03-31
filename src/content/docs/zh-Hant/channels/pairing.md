---
summary: "配對概覽：批准誰可以傳送私訊給您 + 哪些節點可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配對"
---

# 配對

「配對」是 OpenClaw 明確的**所有者批准**步驟。
它用於兩個地方：

1. **DM 配對**（誰被允許與機器人交談）
2. **節點配對**（哪些設備/節點被允許加入網關網絡）

Security context: [Security](/en/gateway/security)

## 1) DM 配對（傳入聊天存取權限）

當頻道使用 DM 政策 `pairing` 進行配置時，未知發送者會收到一個短代碼，並且在他們的訊息在您批准之前**不會被處理**。

Default DM policies are documented in: [Security](/en/gateway/security)

配對代碼：

- 8 個字元，大寫，無歧義字元（`0O1I`）。
- **1 小時後過期**。機器人僅在建立新請求時發送配對訊息（每個發送者大約每小時一次）。
- 待處理的 DM 配對請求預設上限為**每個頻道 3 個**；額外的請求將被忽略，直到其中一個過期或被批准。

### 批准發送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支援的頻道：`bluebubbles`、`discord`、`feishu`、`googlechat`、`imessage`、`irc`、`line`、`matrix`、`mattermost`、`msteams`、`nextcloud-talk`、`nostr`、`openclaw-weixin`、`signal`、`slack`、`synology-chat`、`telegram`、`twitch`、`whatsapp`、`zalo`、`zalouser`。

### 狀態儲存位置

儲存在 `~/.openclaw/credentials/` 下：

- 待處理請求：`<channel>-pairing.json`
- 已批准的允許清單儲存：
  - 預設帳戶：`<channel>-allowFrom.json`
  - 非預設帳戶：`<channel>-<accountId>-allowFrom.json`

帳戶範圍界定行為：

- 非預設帳戶僅讀寫其自身的範圍內允許清單檔案。
- 預設帳戶使用通道範圍的無範圍允許清單檔案。

請將這些視為敏感資料（因為它們控制對您助理的存取權限）。

## 2) 節點裝置配對（iOS/Android/macOS/headless 節點）

節點以 **裝置** 身分使用 `role: node` 連接到 Gateway。Gateway
會建立一個必須經過核准的裝置配對請求。

### 透過 Telegram 配對（建議用於 iOS）

如果您使用 `device-pair` 外掛程式，您可以完全透過 Telegram 進行首次裝置配對：

1. 在 Telegram 中，傳訊息給您的機器人：`/pair`
2. 機器人會回覆兩則訊息：一則說明訊息和另一則獨立的**設定代碼**訊息（在 Telegram 中很容易複製/貼上）。
3. 在手機上，開啟 OpenClaw iOS 應用程式 → Settings → Gateway。
4. 貼上設定代碼並連線。
5. 回到 Telegram：`/pair pending`（檢閱請求 ID、角色和範圍），然後核准。

設定代碼是包含以下內容的 base64 編碼 JSON 載荷：

- `url`：Gateway WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：用於初始配對交握的短期單一裝置啟動權杖

在設定代碼有效時，請將其視為密碼處理。

### 核准節點裝置

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

如果同一設備使用不同的認證詳細資訊（例如不同的角色/範圍/公鑰）重試，之前的待處理請求將被取代，並建立一個新的 `requestId`。

### 節點配對狀態儲存

儲存在 `~/.openclaw/devices/` 下：

- `pending.json`（短期；待處理的請求會過期）
- `paired.json`（已配對的裝置 + 權杖）

### 備註

- 舊版的 `node.pair.*` API（CLI：`openclaw nodes pending/approve`）是一個獨立的閘道器擁有的配對儲存空間。WS 節點仍然需要裝置配對。

## 相關文件

- 安全性模型 + 提示注入：[Security](/en/gateway/security)
- 安全更新（執行 doctor）：[Updating](/en/install/updating)
- 通道設定：
  - Telegram：[Telegram](/en/channels/telegram)
  - WhatsApp：[WhatsApp](/en/channels/whatsapp)
  - Signal：[Signal](/en/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/en/channels/bluebubbles)
  - iMessage (舊版)：[iMessage](/en/channels/imessage)
  - Discord：[Discord](/en/channels/discord)
  - Slack：[Slack](/en/channels/slack)
