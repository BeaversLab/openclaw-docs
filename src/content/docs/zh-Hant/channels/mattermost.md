---
summary: "Mattermost 機器人設定與 OpenClaw 設定"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost (外掛)

狀態：透過外掛支援（機器人權杖 + WebSocket 事件）。支援頻道、群組和私人訊息。
Mattermost 是一個可自託管的團隊訊息平台；請造訪
[mattermost.com](https://mattermost.com) 官方網站以取得產品詳細資訊和下載。

## 需要安裝外掛

Mattermost 以外掛形式提供，並未包含於核心安裝套件中。

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/mattermost
```

本地檢出 (當從 git 儲存庫執行時)：

```bash
openclaw plugins install ./path/to/local/mattermost-plugin
```

如果您在設定過程中選擇 Mattermost 且偵測到 git 檢出，
OpenClaw 將會自動提供本地安裝路徑。

詳細資訊：[外掛](/en/tools/plugin)

## 快速設定

1. 安裝 Mattermost 外掛。
2. 建立 Mattermost 機器人帳戶並複製 **bot token**。
3. 複製 Mattermost **base URL** (例如 `https://chat.example.com`)。
4. 設定 OpenClaw 並啟動閘道。

最小設定：

```json5
{
  channels: {
    mattermost: {
      enabled: true,
      botToken: "mm-token",
      baseUrl: "https://chat.example.com",
      dmPolicy: "pairing",
    },
  },
}
```

## 原生斜線指令

原生斜線指令為選用功能。啟用後，OpenClaw 會透過 Mattermost API 註冊 `oc_*` 斜線指令，
並在閘道 HTTP 伺服器上接收回呼 POST 請求。

```json5
{
  channels: {
    mattermost: {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // Use when Mattermost cannot reach the gateway directly (reverse proxy/public URL).
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
    },
  },
}
```

注意事項：

- `native: "auto"` 預設對於 Mattermost 為停用。設定 `native: true` 以啟用。
- 如果省略 `callbackUrl`，OpenClaw 會根據閘道主機/連接埠 + `callbackPath` 推導出來。
- 對於多帳號設定，`commands` 可以設定在頂層或
  `channels.mattermost.accounts.<id>.commands` 之下 (帳號值會覆寫頂層欄位)。
- 指令回呼會使用每個指令的權杖進行驗證，並在權杖檢查失敗時採取封閉式失敗處理。
- 連線能力需求：回呼端點必須可從 Mattermost 伺服器存取。
  - 除非 Mattermost 與 OpenClaw 執行於相同的主機/網路命名空間，否則請勿將 `callbackUrl` 設定為 `localhost`。
  - 除非該 URL 將 `/api/channels/mattermost/command` 反向代理至 OpenClaw，否則請勿將 `callbackUrl` 設定為您的 Mattermost base URL。
  - 快速檢查方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 請求應從 OpenClaw 返回 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 出站允許清單要求：
  - 如果您的回調目標是私人/tailnet/內部位址，請設定 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回調主機/網域。
  - 請使用主機/網域條目，而非完整的 URL。
    - 正確：`gateway.tailnet-name.ts.net`
    - 錯誤：`https://gateway.tailnet-name.ts.net`

## 環境變數（預設帳戶）

如果您偏好使用環境變數，請在 gateway 主機上設定這些：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

環境變數僅適用於 **預設** 帳戶（`default`）。其他帳戶必須使用設定值。

## 聊天模式

Mattermost 會自動回覆私訊 (DM)。頻道行為由 `chatmode` 控制：

- `oncall`（預設）：僅在頻道中被 @提及 時回覆。
- `onmessage`：回覆每一則頻道訊息。
- `onchar`：當訊息以觸發前綴開頭時回覆。

設定範例：

```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"],
    },
  },
}
```

備註：

- `onchar` 仍會回覆明確的 @提及。
- `channels.mattermost.requireMention` 在舊版設定中仍然有效，但建議使用 `chatmode`。

## 主題串與工作階段

使用 `channels.mattermost.replyToMode` 來控制頻道和群組的回覆是留在主頻道，還是在觸發貼文下開啟主題串。

- `off`（預設）：僅當入站貼文已經在主題串中時，才在該主題串中回覆。
- `first`：對於頂層頻道/群組貼文，在該貼文下啟動主題串，並將
  對話路由至以主題串為範圍的工作階段。
- `all`：目前對 Mattermost 的行為與 `first` 相同。
- 私訊 (DM) 會忽略此設定，並保持非主題串狀態。

設定範例：

```json5
{
  channels: {
    mattermost: {
      replyToMode: "all",
    },
  },
}
```

備註：

- 以主題串為範圍的工作階段使用觸發貼文 ID 作為主題串根。
- `first` 和 `all` 目前是等效的，因為一旦 Mattermost 有了主題串根，
  後續的區塊和媒體會繼續在同一個主題串中。

## 存取控制 (DMs)

- 預設值：`channels.mattermost.dmPolicy = "pairing"`（未知發送者會獲得配對碼）。
- 核准方式：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公開 DM：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 頻道（群組）

- 預設值：`channels.mattermost.groupPolicy = "allowlist"`（提及 gated）。
- 使用 `channels.mattermost.groupAllowFrom` 將發送者加入允許清單（建議使用使用者 ID）。
- `@username` 比對是可變的，且僅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 時啟用。
- 公開頻道：`channels.mattermost.groupPolicy="open"`（提及 gated）。
- 執行時期備註：如果完全缺少 `channels.mattermost`，執行時期會針對群組檢查回退到 `groupPolicy="allowlist"`（即使設定了 `channels.defaults.groupPolicy`）。

## 出站遞送的目標

將這些目標格式與 `openclaw message send` 或 cron/webhooks 搭配使用：

- `channel:<id>` 用於頻道
- `user:<id>` 用於 DM
- `@username` 用於 DM（透過 Mattermost API 解析）

純不透明 ID（如 `64ifufp...`）在 Mattermost 中是**有歧義的**（使用者 ID 與頻道 ID）。

OpenClaw 以**使用者優先**的方式解析它們：

- 如果該 ID 作為使用者存在（`GET /api/v4/users/<id>` 成功），OpenClaw 會透過 `/api/v4/channels/direct` 解析直接頻道來發送 **DM**。
- 否則該 ID 會被視為**頻道 ID**。

如果您需要確定性行為，請務必使用明確的前綴（`user:<id>` / `channel:<id>`）。

## DM 頻道重試

當 OpenClaw 發送到 Mattermost DM 目標並需要先解析直接頻道時，
預設會重試暫時性的直接頻道建立失敗。

使用 `channels.mattermost.dmChannelRetry` 全局調整 Mattermost 外掛的該行為，
或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 針對單個帳戶進行設定。

```json5
{
  channels: {
    mattermost: {
      dmChannelRetry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
      },
    },
  },
}
```

備註：

- 這僅適用於 DM 頻道建立（`/api/v4/channels/direct`），而非每次 Mattermost API 呼叫。
- 重試適用於暫時性錯誤，例如速率限制、5xx 回應以及網路或逾時錯誤。
- 除 `429` 外的 4xx 客戶端錯誤被視為永久性錯誤，不會重試。

## 反應（訊息工具）

- 使用 `message action=react` 搭配 `channel=mattermost`。
- `messageId` 是 Mattermost 的貼文 ID。
- `emoji` 接受諸如 `thumbsup` 或 `:+1:` 的名稱（冒號可選）。
- 設定 `remove=true`（布林值）以移除反應。
- 反應新增/移除事件會作為系統事件轉發至路由的代理程式工作階段。

範例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

設定：

- `channels.mattermost.actions.reactions`：啟用/停用反應動作（預設為 true）。
- 各帳號覆寫：`channels.mattermost.accounts.<id>.actions.reactions`。

## 互動式按鈕（訊息工具）

傳送包含可點擊按鈕的訊息。當使用者點擊按鈕時，代理程式會收到選項並可進行回應。

將 `inlineButtons` 新增至頻道功能以啟用按鈕：

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

使用帶有 `buttons` 參數的 `message action=send`。按鈕是一個二維陣列（按鈕列）：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

按鈕欄位：

- `text`（必填）：顯示標籤。
- `callback_data`（必填）：點擊時回傳的值（用作動作 ID）。
- `style`（選填）：`"default"`、`"primary"` 或 `"danger"`。

當使用者點擊按鈕時：

1. 所有按鈕會被替換為確認行（例如，「✓ **Yes** 已由 @user 選取」）。
2. 代理程式會收到選項作為傳入訊息並進行回應。

備註：

- 按鈕回呼使用 HMAC-SHA256 驗證（自動執行，無需設定）。
- Mattermost 會從其 API 回應中移除回呼資料（安全功能），因此所有按鈕
  都會在點擊時被移除 — 無法部分移除。
- 包含連字號或底線的動作 ID 會自動被清理
  （Mattermost 路由限制）。

設定：

- `channels.mattermost.capabilities`：功能字串陣列。新增 `"inlineButtons"` 以
  在代理程式系統提示中啟用按鈕工具描述。
- `channels.mattermost.interactions.callbackBaseUrl`：按鈕回呼的選用外部基礎 URL
  （例如 `https://gateway.example.com`）。當 Mattermost 無法
  直接在其綁定主機連上閘道時請使用此設定。
- 在多帳號設定中，您也可以在
  `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下設定相同的欄位。
- 如果省略了 `interactions.callbackBaseUrl`，OpenClaw 會從
  `gateway.customBindHost` + `gateway.port` 推導回調 URL，然後後備使用 `http://localhost:<port>`。
- 連線性規則：按鈕回調 URL 必須能從 Mattermost 伺服器存取。
  `localhost` 僅在 Mattermost 和 OpenClaw 運行於同一台主機/網路命名空間時有效。
- 如果您的回調目標是私有/tailnet/內部網路，請將其主機/網域新增至 Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 整合（外部腳本）

外部腳本和 webhook 可以直接透過 Mattermost REST API 發送按鈕，
而不經過代理程式的 `message` 工具。請盡可能使用擴充功能中的
`buildButtonAttachments()`；如果發送原始 JSON，請遵循以下規則：

**Payload 結構：**

```json5
{
  channel_id: "<channelId>",
  message: "Choose an option:",
  props: {
    attachments: [
      {
        actions: [
          {
            id: "mybutton01", // alphanumeric only — see below
            type: "button", // required, or clicks are silently ignored
            name: "Approve", // display label
            style: "primary", // optional: "default", "primary", "danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // must match button id (for name lookup)
                action: "approve",
                // ... any custom fields ...
                _token: "<hmac>", // see HMAC section below
              },
            },
          },
        ],
      },
    ],
  },
}
```

**關鍵規則：**

1. 附件應放在 `props.attachments` 中，而非頂層 `attachments`（會被靜默忽略）。
2. 每個動作都需要 `type: "button"` —— 沒有它，點擊操作將被靜默吞沒。
3. 每個動作都需要一個 `id` 欄位 —— Mattermost 會忽略沒有 ID 的動作。
4. 動作 `id` 必須**僅為字母數字** (`[a-zA-Z0-9]`)。連字元和底線會破壞
   Mattermost 的伺服器端動作路由（返回 404）。使用前請將其剝離。
5. `context.action_id` 必須與按鈕的 `id` 相符，以便確認訊息顯示
   按鈕名稱（例如「批准」）而非原始 ID。
6. `context.action_id` 是必填的 —— 如果沒有它，互動處理程式會返回 400。

**HMAC 權杖產生：**

閘道使用 HMAC-SHA256 驗證按鈕點擊。外部腳本必須產生符合
閘道驗證邏輯的權杖：

1. 從機器人權杖推導金鑰：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 建構包含**除** `_token` 以外所有欄位的 context 物件。
3. 使用**排序的鍵**且**不包含空格**進行序列化（閘道使用帶有排序鍵的 `JSON.stringify`，這會產生緊湊的輸出）。
4. 簽署：`HMAC-SHA256(key=secret, data=serializedContext)`
5. 將產生的十六進位摘要作為 `_token` 加入到上下文中。

Python 範例：

```python
import hmac, hashlib, json

secret = hmac.new(
    b"openclaw-mattermost-interactions",
    bot_token.encode(), hashlib.sha256
).hexdigest()

ctx = {"action_id": "mybutton01", "action": "approve"}
payload = json.dumps(ctx, sort_keys=True, separators=(",", ":"))
token = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

context = {**ctx, "_token": token}
```

常見 HMAC 陷阱：

- Python 的 `json.dumps` 預設會新增空格（`{"key": "val"}`）。請使用
  `separators=(",", ":")` 來符合 JavaScript 的緊湊輸出（`{"key":"val"}`）。
- 請務必簽署**所有**上下文欄位（排除 `_token`）。閘道會移除 `_token` 然後
  簽署剩餘的所有內容。簽署子集會導致無聲的驗證失敗。
- 使用 `sort_keys=True` — 閘道在簽署前會對鍵進行排序，而 Mattermost 在儲存載荷時可能會
  重新排序上下文欄位。
- 從 bot token 推導金鑰（確定性），而非隨機位元組。金鑰
  在建立按鈕的程序與進行驗證的閘道之間必須保持一致。

## 目錄適配器

Mattermost 外掛包含一個目錄適配器，可透過 Mattermost API 解析頻道和使用者名稱。
這啟用了 `#channel-name` 和 `@username` 目標於
`openclaw message send` 以及 cron/webhook 傳遞中。

不需要任何設定 — 適配器使用帳號設定中的 bot token。

## 多帳號

Mattermost 支援在 `channels.mattermost.accounts` 下設置多個帳號：

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primary", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "Alerts", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" },
      },
    },
  },
}
```

## 疑難排解

- 頻道中沒有回覆：請確認 bot 在頻道中並提及它（oncall），使用觸發前綴（onchar），或設定 `chatmode: "onmessage"`。
- 驗證錯誤：請檢查 bot token、基礎 URL，以及帳號是否已啟用。
- 多帳號問題：環境變數僅適用於 `default` 帳號。
- 按鈕顯示為白框：代理程式可能發送了格式錯誤的按鈕資料。請檢查每個按鈕是否同時具有 `text` 和 `callback_data` 欄位。
- 按鈕已渲染但點擊無反應：請驗證 Mattermost 伺服器設定中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，且 `EnablePostActionIntegration` 在 ServiceSettings 中為 `true`。
- 點擊按鈕時返回 404：按鈕的 `id` 可能包含連字號或底線。Mattermost 的動作路由器會因非字母數字 ID 而中斷。請僅使用 `[a-zA-Z0-9]`。
- Gateway 記錄 `invalid _token`：HMAC 不符。請檢查您是否簽署了所有上下文欄位（而非子集）、使用排序鍵，並使用精簡 JSON（無空格）。請參閱上方的 HMAC 章節。
- Gateway 記錄 `missing _token in context`：`_token` 欄位不在按鈕的上下文中。請確保在建立整合負載時包含它。
- 確認顯示原始 ID 而非按鈕名稱：`context.action_id` 與按鈕的 `id` 不符。請將兩者設為相同的經清理值。
- Agent 不知道按鈕：請將 `capabilities: ["inlineButtons"]` 加入 Mattermost 頻道設定中。

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私人訊息驗證和配對流程
- [群組](/en/channels/groups) — 群組聊天行為和提及閘控
- [頻道路由](/en/channels/channel-routing) — 訊息的工作階段路由
- [安全性](/en/gateway/security) — 存取模型和強化防護
