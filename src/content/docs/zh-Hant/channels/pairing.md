---
summary: "配對概述：批准誰可以私訊您 + 哪些節點可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配對"
---

「配對」是 OpenClaw 明確的**所有者批准**步驟。
它用於兩個地方：

1. **DM 配對**（誰被允許與機器人交談）
2. **節點配對**（哪些設備/節點被允許加入閘道網路）

安全背景：[安全性](/zh-Hant/gateway/security)

## 1) DM 配對（入站聊天存取）

當頻道配置了 DM 策略 `pairing` 時，未知發送者會收到一個短代碼，並且在他們的訊息**不會被處理**，直到您批准為止。

預設 DM 策略記錄於：[安全性](/zh-Hant/gateway/security)

配對代碼：

- 8 個字元，大寫，無歧義字元（`0O1I`）。
- **1 小時後過期**。機器人僅在建立新請求時發送配對訊息（每個發送者大約每小時一次）。
- 待處理的 DM 配對請求預設上限為**每個頻道 3 個**；額外的請求將被忽略，直到其中一個過期或被批准。

### 批准發送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

支援的頻道：`bluebubbles`, `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`。

### 狀態儲存位置

儲存在 `~/.openclaw/credentials/` 下：

- 待處理請求：`<channel>-pairing.json`
- 已批准的允許清單儲存：
  - 預設帳戶：`<channel>-allowFrom.json`
  - 非預設帳戶：`<channel>-<accountId>-allowFrom.json`

帳戶範圍行為：

- 非預設帳戶僅讀取/寫入其範圍內的允許清單檔案。
- 預設帳戶使用以頻道為範圍的非範圍限定允許清單檔案。

請將這些視為敏感資料（因為它們控制了對您助理的存取）。

<Note>此存儲僅適用於 DM 存取。群組授權是分開的。批准 DM 配對代碼並不會自動允許該發送者執行群組指令或在群組中控制機器人。若要存取群組，請設定頻道的明確群組允許清單（例如 `groupAllowFrom`、`groups`，或是根據頻道設定的每個群組或每個主題的覆寫設定）。</Note>

## 2) 節點裝置配對 (iOS/Android/macOS/headless 節點)

節點透過 `role: node` 以**裝置**身分連接到閘道。閘道
會建立一個裝置配對請求，該請求必須經過批准。

### 透過 Telegram 配對 (建議用於 iOS)

如果您使用 `device-pair` 外掛，您可以完全透過 Telegram 進行首次裝置配對：

1. 在 Telegram 中，傳送訊息給您的機器人：`/pair`
2. 機器人會回覆兩則訊息：一則是指示訊息，另一則是獨立的**設定代碼**訊息（在 Telegram 中易於複製/貼上）。
3. 在手機上，開啟 OpenClaw iOS 應用程式 → Settings → Gateway。
4. 貼上設定代碼並進行連線。
5. 回到 Telegram：`/pair pending`（檢查請求 ID、角色和範圍），然後批准。

設定代碼是一個 base64 編碼的 JSON 載荷，包含：

- `url`：閘道 WebSocket URL (`ws://...` 或 `wss://...`)
- `bootstrapToken`：一個短效的單一裝置引導令牌，用於初始配對握手

該引導令牌攜帶內建的配對引導設定檔：

- 主要移交的 `node` 令牌保持 `scopes: []`
- 任何移交的 `operator` 令牌均受限於引導允許清單：
  `operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`
- 引導範圍檢查是以前綴角色為基礎，而非單一扁平的範圍池：
  操作員範圍項目僅滿足操作員請求，而非操作員角色
  仍必須在其自身角色前綴下請求範圍
- 後續的 token 輪替/撤銷仍受限於裝置的已批准角色合約以及呼叫者會話的操作員範圍

在設置代碼有效期間，請將其視為密碼處理。

### 批准節點設備

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

如果同一裝置使用不同的認證詳細資料（例如不同的角色/範圍/公鑰）重試，之前的待處理請求將被取代，並建立一個新的 `requestId`。

<Note>已配對的裝置不會在無聲無息中獲得更廣泛的存取權限。如果它重新連線時請求更多範圍或更廣泛的角色，OpenClaw 將保持現有的批准不變，並建立一個新的待處理升級請求。在您批准之前，請使用 `openclaw devices list` 來比較目前已批准的存取權限與新請求的存取權限。</Note>

### 可選的信任 CIDR 節點自動批准

預設情況下，裝置配對保持為手動操作。對於嚴密控制的節點網路，您可以選擇透過明確的 CIDR 或確切 IP 進行首次節點自動批准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

這僅適用於沒有請求範圍的全新 `role: node` 配對請求。操作員、瀏覽器、Control UI 和 WebChat 用戶端仍需手動批准。角色、範圍、元資料和公鑰變更仍需手動批准。

### 節點配對狀態儲存

儲存在 `~/.openclaw/devices/` 下：

- `pending.json`（短期；待處理請求會過期）
- `paired.json`（已配對的裝置 + token）

### 注意事項

- 舊版 `node.pair.*` API (CLI: `openclaw nodes pending|approve|reject|remove|rename`) 是一個
  獨立的閘道擁有配對儲存。WS 節點仍需要裝置配對。
- 配對記錄是已批准角色的永久性真實來源。使用中的
  裝置 token 仍受限於該已批准的角色集合；已批准角色之外的
  零散 token 項目不會建立新的存取權限。

## 相關文件

- 安全模型 + 提示詞注入：[安全性](/zh-Hant/gateway/security)
- 安全更新 (執行 doctor)：[更新](/zh-Hant/install/updating)
- 頻道設定：
  - Telegram：[Telegram](/zh-Hant/channels/telegram)
  - WhatsApp：[WhatsApp](/zh-Hant/channels/whatsapp)
  - Signal：[Signal](/zh-Hant/channels/signal)
  - BlueBubbles (iMessage)：[BlueBubbles](/zh-Hant/channels/bluebubbles)
  - iMessage (舊版)：[iMessage](/zh-Hant/channels/imessage)
  - Discord: [Discord](/zh-Hant/channels/discord)
  - Slack: [Slack](/zh-Hant/channels/slack)
