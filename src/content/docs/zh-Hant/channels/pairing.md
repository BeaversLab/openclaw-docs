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

安全背景：[安全](/en/gateway/security)

## 1) DM 配對（傳入聊天存取權限）

當頻道使用 DM 政策 `pairing` 進行配置時，未知發送者會收到一個短代碼，並且在他們的訊息在您批准之前**不會被處理**。

預設的 DM 政策記載於：[安全](/en/gateway/security)

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

重要：此儲存是用於 DM 存取。群組授權是分開的。
核准 DM 配對程式碼並不會自動允許該發送者執行群組指令或在群組中控制機器人。若要存取群組，請設定頻道的明確群組允許清單（例如 `groupAllowFrom`、`groups`，或視頻道而定的每群組/每主題覆寫）。

## 2) 節點裝置配對 (iOS/Android/macOS/headless 節點)

節點以 `role: node` 作為**裝置**連線至閘道。閘道
會建立一個必須經過核准的裝置配對請求。

### 透過 Telegram 配對 (iOS 推薦)

如果您使用 `device-pair` 外掛，您可以完全透過 Telegram 進行首次裝置配對：

1. 在 Telegram 中，傳訊息給您的機器人：`/pair`
2. 機器人會回覆兩則訊息：一則指令訊息和一則獨立的**設置程式碼**訊息（在 Telegram 中易於複製/貼上）。
3. 在手機上，開啟 OpenClaw iOS 應用程式 → 設定 → 閘道。
4. 貼上設置程式碼並連線。
5. 回到 Telegram：`/pair pending` (檢閱請求 ID、角色和範圍)，然後核准。

設置程式碼是包含以下內容的 base64 編碼 JSON 載荷：

- `url`：閘道 WebSocket URL (`ws://...` 或 `wss://...`)
- `bootstrapToken`：用於初始配對交握的短期單一裝置啟動權杖

該啟動權杖帶有內建的配對啟動設定檔：

- 主要移交的 `node` 權杖保持 `scopes: []`
- 任何移交的 `operator` 權杖保持受限於啟動允許清單：
  `operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`
- 啟動範圍檢查是依角色加前綴，而非單一平面範圍集區：
  操作員範圍項目僅滿足操作員請求，且非操作員角色
  必須仍在其自身角色前綴下請求範圍

在設置代碼有效期間，請將其視為密碼處理。

### 批准節點設備

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

如果同一設備使用不同的身份驗證詳細信息（例如不同的
role/scopes/public key）重試，之前的待處理請求將被取代，並創建一個新的
`requestId`。

### 節點配對狀態存儲

存儲於 `~/.openclaw/devices/`：

- `pending.json`（短期存在；待處理請求會過期）
- `paired.json`（已配對設備 + 令牌）

### 備註

- 舊版 `node.pair.*` API（CLI：`openclaw nodes pending|approve|reject|rename`) 是一個
  獨立的網關擁有的配對存儲。WS 節點仍需要設備配對。
- 配對記錄是已批准角色的持久性真實來源。活動
  設備令牌保持綁定到該已批准角色集；在已批准角色之外的孤立令牌條目
  不會創建新的訪問權限。

## 相關文檔

- 安全模型 + 提示注入：[安全](/en/gateway/security)
- 安全更新（運行 doctor）：[更新](/en/install/updating)
- 頻道配置：
  - Telegram：[Telegram](/en/channels/telegram)
  - WhatsApp：[WhatsApp](/en/channels/whatsapp)
  - Signal：[Signal](/en/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/en/channels/bluebubbles)
  - iMessage (舊版)：[iMessage](/en/channels/imessage)
  - Discord：[Discord](/en/channels/discord)
  - Slack：[Slack](/en/channels/slack)
