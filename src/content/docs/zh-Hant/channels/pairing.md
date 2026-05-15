---
summary: "配對概覽：核准誰可以傳送訊息給您以及哪些節點可以加入"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "配對"
---

「配對」是 OpenClaw 的明確存取核准步驟。
它用於兩個地方：

1. **DM 配對**（誰被允許與機器人交談）
2. **節點配對**（哪些設備/節點被允許加入閘道網路）

安全性背景：[Security](/zh-Hant/gateway/security)

## 1) DM 配對（入站聊天存取）

當頻道使用 DM 政策 `pairing` 進行配置時，未知傳送者會收到一個短代碼，並且在他們的訊息**不會被處理**，直到您核准為止。

預設的 DM 政策記錄於：[Security](/zh-Hant/gateway/security)

`dmPolicy: "open"` 只有在有效的 DM 許可清單包含 `"*"` 時才是公開的。
設定與驗證需要該萬用字元用於公開開放的配置。如果現有狀態包含 `open` 且具有具體的 `allowFrom` 項目，執行時仍僅允許這些傳送者，且配對儲存庫的核准不會擴大 `open` 的存取權。

配對代碼：

- 8 個字元，大寫，無歧義字元 (`0O1I`)。
- **1 小時後過期**。機器人僅在建立新請求時發送配對訊息（每個發送者大約每小時一次）。
- 待處理的 DM 配對請求預設上限為**每個頻道 3 個**；額外的請求將被忽略，直到其中一個過期或被批准。

### 批准發送者

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

如果尚未配置指令擁有者，核准 DM 配對代碼也會將 `commands.ownerAllowFrom` 初始化給被核准的傳送者，例如 `telegram:123456789`。
這為首次設定提供了特權指令和執行核准提示的明確擁有者。擁有者存在後，後續的配對核准僅授予 DM 存取權；它們不會增加更多擁有者。

支援的頻道：`discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`.

### 可重複使用的傳送者群組

當相同的信任發送者群組應套用至多個訊息頻道，或同時用於私訊和群組允許清單時，請使用頂層 `accessGroups`。

靜態群組使用 `type: "message.senders"` 並在頻道允許清單中以 `accessGroup:<name>` 進行參照：

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
  channels: {
    telegram: { dmPolicy: "allowlist", allowFrom: ["accessGroup:operators"] },
    whatsapp: { groupPolicy: "allowlist", groupAllowFrom: ["accessGroup:operators"] },
  },
}
```

存取群組在此處有詳細文件說明：[存取群組](/zh-Hant/channels/access-groups)

### 狀態儲存位置

儲存在 `~/.openclaw/credentials/` 下：

- 待處理請求：`<channel>-pairing.json`
- 已批准的允許清單儲存位置：
  - 預設帳戶：`<channel>-allowFrom.json`
  - 非預設帳戶：`<channel>-<accountId>-allowFrom.json`

帳戶範圍設定行為：

- 非預設帳戶僅讀取/寫入其範圍內的允許清單檔案。
- 預設帳戶使用頻道範圍內的無範圍允許清單檔案。

請將這些視為敏感資料（因為它們控管對您助手的存取權）。

<Note>配對允許清單儲存是用於私訊存取。群組授權是分開的。 批准私訊配對代碼並不會自動允許該發送者執行群組指令或在群組中控制機器人。首位擁有者引導是 `commands.ownerAllowFrom` 中獨立的設定狀態，而群組聊天傳遞仍遵循頻道的群組允許清單（例如 `groupAllowFrom`、`groups`，或根據頻道而定每個群組或每個主題的覆寫設定）。</Note>

## 2) 節點裝置配對 (iOS/Android/macOS/headless 節點)

節點透過 `role: node` 以 **裝置** 身分連線到 Gateway。Gateway 會建立必須獲批准的裝置配對請求。

### 透過 Telegram 配對 (推薦用於 iOS)

如果您使用 `device-pair` 外掛，您可以完全透過 Telegram 進行首次裝置配對：

1. 在 Telegram 中，傳訊息給您的機器人：`/pair`
2. 機器人會回覆兩則訊息：一則指示訊息和一則獨立的 **設定代碼** 訊息（在 Telegram 中容易複製/貼上）。
3. 在您的手機上，開啟 OpenClaw iOS 應用程式 → 設定 → Gateway。
4. 掃描 QR code 或貼上設定代碼並連線。
5. 回到 Telegram：`/pair pending` （檢查請求 ID、角色和範圍），然後批准。

設定代碼是包含以下內容的 base64 編碼 JSON 載荷：

- `url`：閘道 WebSocket URL（`ws://...` 或 `wss://...`）
- `bootstrapToken`：用於初始配對交握的短期單一設備引導令牌

該引導令牌攜帶內建的配對引導配置檔案：

- 主要移交的 `node` 令牌保持 `scopes: []`
- 任何移交的 `operator` 令牌保持受限於引導允許列表：
  `operator.approvals`、`operator.read`、`operator.talk.secrets`、`operator.write`
- 引導範圍檢查是以角色為前綴，而不是一個扁平的範圍池：
  操作員範圍條目僅滿足操作員請求，而非操作員角色
  仍必須在其自己的角色前綴下請求範圍
- 後續的令牌輪換/撤銷仍然受限於設備已批准的
  角色合約以及呼叫者會話的操作員範圍

在設置代碼有效期間，請像對待密碼一樣對待它。

對於 Tailscale、公開或其他遠端行動裝置配對，請使用 Tailscale Serve/Funnel
或其他 `wss://` 閘道 URL。純文字 `ws://` 設置代碼僅接受
來自回環、私有 LAN 位址、`.local` Bonjour 主機和 Android
模擬器主機的連線。Tailnet CGNAT 位址、`.ts.net` 名稱和公開主機在
發出 QR/設置代碼之前仍然會被封鎖。

### 批准節點設備

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

當明確批准被拒絕，因為批准配對設備會話
是僅使用配對範圍開啟時，CLI 會使用
`operator.admin` 重試相同的請求。這讓現有的具備管理員能力的配對設備能夠恢復新的
控制 UI/瀏覽器配對，而無需手動編輯 `devices/paired.json`。閘道
仍然會驗證重試的連線；無法透過 `operator.admin` 進行身份驗證的
令牌仍會被封鎖。

如果同一設備使用不同的身份驗證詳細資訊（例如不同的
角色/範圍/公開金鑰）重試，則先前的待處理請求將被取代，並建立一個新的
`requestId`。

<Note>已配對的設備不會靜默獲得更廣泛的訪問權限。如果它重新連接時請求更多範圍或更廣泛的角色，OpenClaw 將保持現有批准不變，並創建一個新的待處理升級請求。在您批准之前，請使用 `openclaw devices list` 比較當前批准的訪問權限與新請求的訪問權限。</Note>

### 可選的受信任 CIDR 節點自動批准

預設情況下，設備配對保持為手動。對於嚴格控制的節點網絡，
您可以選擇通過明確的 CIDR 或確切的 IP 來首次自動批准節點：

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

這僅適用於沒有請求範圍的新 `role: node` 配對請求。操作員、瀏覽器、控制 UI 和 WebChat 客戶端仍需手動
批准。角色、範圍、元數據和公鑰更改仍需手動
批准。

### 節點配對狀態存儲

存儲在 `~/.openclaw/devices/` 下：

- `pending.json` (短期；待處理的請求會過期)
- `paired.json` (已配對設備 + 令牌)

### 注意事項

- 舊版 `node.pair.*` API (CLI: `openclaw nodes pending|approve|reject|remove|rename`) 是一個
  單獨的網關擁有的配對存儲。WS 節點仍需要設備配對。
- 配對記錄是已批准角色的持久性真實來源。活動
  設備令牌保持綁定到該已批准的角色集；在已批准角色之外的孤立令牌條目
  不會創建新的訪問權限。

## 相關文檔

- 安全模型 + 提示注入：[安全](/zh-Hant/gateway/security)
- 安全更新 (運行 doctor)：[更新](/zh-Hant/install/updating)
- 通道配置：
  - Telegram：[Telegram](/zh-Hant/channels/telegram)
  - WhatsApp：[WhatsApp](/zh-Hant/channels/whatsapp)
  - Signal：[Signal](/zh-Hant/channels/signal)
  - iMessage：[iMessage](/zh-Hant/channels/imessage)
  - Discord：[Discord](/zh-Hant/channels/discord)
  - Slack：[Slack](/zh-Hant/channels/slack)
