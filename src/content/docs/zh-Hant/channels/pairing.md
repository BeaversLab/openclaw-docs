---
summary: "配對概覽：批准誰可以私訊你 + 哪些節點可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配對"
---

# 配對

「配對」是 OpenClaw 明確的**所有者批准**步驟。
它在兩個地方使用：

1. **DM 配對**（誰被允許與機器人對話）
2. **節點配對**（哪些裝置/節點被允許加入閘道網路）

安全背景：[Security](/zh-Hant/gateway/security)

## 1) DM 配對（入站聊天存取）

當頻道配置了 DM 原則 `pairing` 時，未知傳送者會收到一組短代碼，且在他們的訊息被您批准之前**不會被處理**。

預設 DM 原則記載於：[Security](/zh-Hant/gateway/security)

配對代碼：

- 8 個字元，大寫，無歧義字元 (`0O1I`)。
- **1 小時後過期**。機器人僅在建立新請求時發送配對訊息（大約每個發送者每小時一次）。
- 待處理的 DM 配對請求預設限制為**每個頻道 3 個**；直到其中一個請求過期或獲得批准為止，額外的請求都會被忽略。

### 批准發送者

```exec
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支援的頻道：`telegram`、`whatsapp`、`signal`、`imessage`、`discord`、`slack`、`feishu`。

### 狀態儲存位置

儲存在 `~/.openclaw/credentials/`：

- 待處理請求：`<channel>-pairing.json`
- Approved allowlist store:
  - 預設帳號：`<channel>-allowFrom.json`
  - 非默认帳號：`<channel>-<accountId>-allowFrom.json`

帳號範圍劃分行為：

- 非預設帳戶僅讀寫其作用域允許清單檔案。
- 預設帳號使用通道範圍的非範圍允許清單檔案。

請將這些視為敏感資訊（因為它們控制著對您助理的存取）。

## 2) 節點裝置配對（iOS/Android/macOS/headless 節點）

節點使用 `role: node` 以 **裝置** 身分連接到 Gateway。Gateway
會建立一個必須獲得批准的裝置配對請求。

### 透過 Telegram 配對（推薦用於 iOS）

如果您使用 `device-pair` 外掛程式，您可以完全透過 Telegram 進行首次裝置配對：

1. 在 Telegram 中，傳訊息給您的機器人：`/pair`
2. 機器人會回覆兩則訊息：一則指示訊息和另一則單獨的 **設定碼** 訊息（在 Telegram 中很容易複製貼上）。
3. 在手機上，開啟 OpenClaw iOS 應用程式 → 設定 → Gateway。
4. 貼上設定碼並連接。
5. 回到 Telegram：`/pair pending`（檢查請求 ID、角色和範圍），然後批准。

設定代碼是一個 base64 編碼的 JSON 載荷，其中包含：

- `url`：Gateway WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：一個短期、單一設備的啟動令牌，用於初始配對握手

在設定代碼有效期間，請將其視為密碼對待。

### 批准節點設備

```exec
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

如果同一設備使用不同的身分驗證詳細資料（例如不同的角色/範圍/公開金鑰）重試，先前的待處理請求將被取代，並建立一個新的
`requestId`。

### 節點配對狀態儲存

儲存在 `~/.openclaw/devices/` 下：

- `pending.json`（短期；待處理請求會過期）
- `paired.json`（已配對設備 + 令牌）

### 備註

- 傳統的 `node.pair.*` API (CLI: `openclaw nodes pending/approve`) 是一個
  獨立的閘道器擁有的配對存儲。WS 節點仍然需要裝置配對。

## 相關文件

- 安全模型 + 提示詞注入：[Security](/zh-Hant/gateway/security)
- 安全更新 (執行 doctor)：[Updating](/zh-Hant/install/updating)
- 頻道配置：
  - Telegram：[Telegram](/zh-Hant/channels/telegram)
  - WhatsApp：[WhatsApp](/zh-Hant/channels/whatsapp)
  - Signal：[Signal](/zh-Hant/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/zh-Hant/channels/bluebubbles)
  - iMessage (傳統)：[iMessage](/zh-Hant/channels/imessage)
  - Discord：[Discord](/zh-Hant/channels/discord)
  - Slack：[Slack](/zh-Hant/channels/slack)
