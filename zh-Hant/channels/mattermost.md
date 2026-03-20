---
summary: "Mattermost bot setup and OpenClaw config"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost (plugin)

狀態：透過外掛支援（Bot 權杖 + WebSocket 事件）。支援頻道、群組和私訊。
Mattermost 是一個可自架設的團隊訊息平台；請前往
[mattermost.com](https://mattermost.com) 查看官方網站以獲得產品詳情和下載。

## 需要外掛

Mattermost 以外掛形式提供，並未隨附於核心安裝中。

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/mattermost
```

本機檢出 (當從 git repo 執行時)：

```bash
openclaw plugins install ./extensions/mattermost
```

如果您在設定期間選擇 Mattermost 且偵測到 git 檢出，
OpenClaw 將會自動提供本機安裝路徑。

詳細資訊：[外掛](/zh-Hant/tools/plugin)

## 快速設置

1. 安裝 Mattermost 外掛。
2. 建立一個 Mattermost bot 帳號並複製 **bot token**。
3. 複製 Mattermost **base URL** (例如 `https://chat.example.com`)。
4. 設定 OpenClaw 並啟動閘道。

最精簡設定：

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

備註：

- 對於 Mattermost，`native: "auto"` 預設為停用。請設定 `native: true` 來啟用。
- 如果省略了 `callbackUrl`，OpenClaw 會根據閘道主機/連接埠 + `callbackPath` 推導出一個。
- 對於多帳號設置，`commands` 可以設定在頂層或
  `channels.mattermost.accounts.<id>.commands` 之下 (帳號值會覆寫頂層欄位)。
- 指令回呼會使用每個指令的專屬權杖進行驗證，並在權杖檢查失敗時以封閉模式處理 (fail closed)。
- 連線需求：回呼端點必須能夠從 Mattermost 伺服器存取。
  - 除非 Mattermost 與 OpenClaw 執行於相同的主機/網路命名空間，否則請勿將 `callbackUrl` 設定為 `localhost`。
  - 除非您的 Mattermost 基礎 URL 將 `/api/channels/mattermost/command` 反向代理至 OpenClaw，否則請勿將 `callbackUrl` 設定為該 URL。
  - 快速檢查方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 請求應從 OpenClaw 返回 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 連出白名單要求：
  - 如果您的回調目標是私有/tailnet/內部位址，請設定 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回調主機/網域。
  - 請使用主機/網域條目，而非完整的 URL。
    - 正確：`gateway.tailnet-name.ts.net`
    - 錯誤：`https://gateway.tailnet-name.ts.net`

## 環境變數（預設帳戶）

如果您偏好使用環境變數，請在閘道主機上設定這些變數：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

環境變數僅適用於 **預設** 帳戶（`default`）。其他帳戶必須使用設定值。

## 聊天模式

Mattermost 會自動回應私訊 (DM)。頻道行為由 `chatmode` 控制：

- `oncall` (預設)：僅在頻道中被 @提及 時回應。
- `onmessage`：回應每則頻道訊息。
- `onchar`：當訊息以觸發前綴開頭時回應。

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

- `onchar` 仍會回應明確的 @提及。
- `channels.mattermost.requireMention` 仍然支援舊版設定，但建議使用 `chatmode`。

## 串接與工作階段

使用 `channels.mattermost.replyToMode` 來控制頻道和群組回覆是留在主頻道，還是在觸發貼文下開啟串接。

- `off` (預設)：僅當內送貼文已位於串接中時，才在串接中回覆。
- `first`：對於頂層頻道/群組貼文，在該貼文下啟動串接並將對話路由至串接範圍的工作階段。
- `all`：目前的行為與 Mattermost 的 `first` 相同。
- 私訊會忽略此設定，並保持非串接狀態。

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

- 串接範圍的工作階段使用觸發貼文 ID 作為串接根節點。
- `first` 和 `all` 目前是等效的，因為一旦 Mattermost 有了串接根節點，後續的區塊和媒體都會在同一個串接中繼續。

## 存取控制（DMs）

- 預設：`channels.mattermost.dmPolicy = "pairing"`（未知發送者會收到配對碼）。
- 透過以下方式批准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公開 DM：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 頻道（群組）

- 預設：`channels.mattermost.groupPolicy = "allowlist"`（提及限制）。
- 使用 `channels.mattermost.groupAllowFrom` 將發送者加入允許清單（建議使用使用者 ID）。
- `@username` 比對是可變的，且僅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 時啟用。
- 公開頻道：`channels.mattermost.groupPolicy="open"`（提及限制）。
- 執行時期注意：如果完全缺少 `channels.mattermost`，執行時期會針對群組檢查回退至 `groupPolicy="allowlist"`（即使已設定 `channels.defaults.groupPolicy`）。

## 外寄傳送的目標

將這些目標格式與 `openclaw message send` 或 cron/webhooks 搭配使用：

- `channel:<id>` 用於頻道
- `user:<id>` 用於 DM
- `@username` 用於 DM（透過 Mattermost API 解析）

純不透明 ID（如 `64ifufp...`）在 Mattermost 中是**不明確的**（使用者 ID 與頻道 ID）。

OpenClaw **優先將其解析為使用者**：

- 如果該 ID 作為使用者存在（`GET /api/v4/users/<id>` 成功），OpenClaw 會透過 `/api/v4/channels/direct` 解析直接頻道來發送 **DM**。
- 否則，該 ID 會被視為**頻道 ID**。

如果您需要確定性行為，請務必使用明確的前綴（`user:<id>` / `channel:<id>`）。

## DM 頻道重試

當 OpenClaw 發送到 Mattermost DM 目標並需要先解析直接頻道時，
預設會重試暫時性的直接頻道建立失敗。

使用 `channels.mattermost.dmChannelRetry` 為 Mattermost 外掛全域調整該行為，
或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 針對單一帳號進行調整。

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

- 這僅適用於 DM 頻道建立（`/api/v4/channels/direct`），而非每個 Mattermost API 呼叫。
- 重試適用於速率限制、5xx 回應以及網路或逾時錯誤等暫時性失敗。
- 除 `429` 外的 4xx 用戶端錯誤會被視為永久性錯誤，不會重試。

## 反應（訊息工具）

- 使用 `message action=react` 搭配 `channel=mattermost`。
- `messageId` 是 Mattermost 的貼文 ID。
- `emoji` 接受諸如 `thumbsup` 或 `:+1:` 的名稱（冒號可選）。
- 設定 `remove=true`（布林值）以移除反應。
- 反應新增/移除事件會作為系統事件轉發到路由的代理程式工作階段。

範例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

設定：

- `channels.mattermost.actions.reactions`：啟用/停用反應動作（預設為 true）。
- 每個帳戶的覆寫：`channels.mattermost.accounts.<id>.actions.reactions`。

## 互動式按鈕（訊息工具）

傳送包含可點擊按鈕的訊息。當使用者點擊按鈕時，代理程式會收到選擇並且回應。

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

使用 `message action=send` 搭配 `buttons` 參數。按鈕是二維陣列（按鈕列）：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

按鈕欄位：

- `text`（必填）：顯示標籤。
- `callback_data`（必填）：點擊時傳回的值（用作動作 ID）。
- `style`（選填）：`"default"`、`"primary"` 或 `"danger"`。

當使用者點擊按鈕時：

1. 所有按鈕會被一個確認行取代（例如，「✓ @user 已選取 **是**」）。
2. 代理程式會收到作為傳入訊息的選擇並進行回應。

備註：

- 按鈕回呼使用 HMAC-SHA256 驗證（自動，無需設定）。
- Mattermost 會從其 API 回應中剝離回呼資料（安全功能），因此所有按鈕在點擊時都會被移除 — 無法部分移除。
- 包含連字號或底線的動作 ID 會自動被清理（Mattermost 路由限制）。

設定：

- `channels.mattermost.capabilities`：功能字串陣列。新增 `"inlineButtons"` 以在代理程式系統提示中啟用按鈕工具描述。
- `channels.mattermost.interactions.callbackBaseUrl`：按鈕回呼的選用外部基礎 URL（例如 `https://gateway.example.com`）。當 Mattermost 無法直接透過其綁定主機連線到閘道時使用。
- 在多帳號設置中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下設定相同的欄位。
- 如果省略了 `interactions.callbackBaseUrl`，OpenClaw 會從 `gateway.customBindHost` + `gateway.port` 推導回調 URL，然後回退到 `http://localhost:<port>`。
- 連線性規則：按鈕回調 URL 必須能從 Mattermost 伺服器存取。
  `localhost` 僅在 Mattermost 和 OpenClaw 運行於相同主機/網路命名空間時有效。
- 如果您的回調目標是私人/tailnet/內部網路，請將其主機/網域新增至 Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 整合（外部腳本）

外部腳本和 Webhooks 可以直接透過 Mattermost REST API 發送按鈕，
而不需要透過代理程式的 `message` 工具。請盡可能使用擴充功能中的
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

1. 附件必須放在 `props.attachments` 中，而非頂層的 `attachments`（會被無聲忽略）。
2. 每個動作都需要 `type: "button"` —— 沒有它，點擊將被無聲吞沒。
3. 每個動作都需要一個 `id` 欄位 —— Mattermost 會忽略沒有 ID 的動作。
4. 動作 `id` 必須**僅包含字母數字**（`[a-zA-Z0-9]`）。連字號和底線會破壞
   Mattermost 的伺服器端動作路由（返回 404）。使用前請將其移除。
5. `context.action_id` 必須與按鈕的 `id` 相符，以便確認訊息顯示
   按鈕名稱（例如「批准」）而不是原始 ID。
6. `context.action_id` 是必需的 —— 互動處理程式若沒有它會返回 400。

**HMAC Token 生成：**

閘道使用 HMAC-SHA256 驗證按鈕點擊。外部腳本必須生成符合閘道驗證邏輯的 Token：

1. 從 Bot Token 推導密鑰：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 使用所有欄位（**除了** `_token`）建構 Context 物件。
3. 使用 **排序鍵** 和 **無空格** 進行序列化（閘道使用帶有排序鍵的 `JSON.stringify`，這會產生緊湊的輸出）。
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

- Python 的 `json.dumps` 預設會加入空格（`{"key": "val"}`）。請使用 `separators=(",", ":")` 來符合 JavaScript 的緊湊輸出（`{"key":"val"}`）。
- 請始終簽署 **所有** 上下文欄位（不含 `_token`）。閘道會移除 `_token`，然後簽署剩餘的所有內容。簽署子集會導致無聲驗證失敗。
- 使用 `sort_keys=True` —— 閘道會在簽署前對鍵進行排序，而 Mattermost 在儲存 Payload 時可能會重新排序上下文欄位。
- 從 bot token 推導密鑰（確定性），而非使用隨機位元組。在建立按鈕的過程與進行驗證的閘道之間，密鑰必須保持一致。

## 目錄適配器

Mattermost 外掛包含一個目錄適配器，可透過 Mattermost API 解析頻道和使用者名稱。這啟用了 `#channel-name` 和 `@username` 目標，用於 `openclaw message send` 以及 cron/webhook 傳遞。

無需配置 —— 適配器使用帳戶配置中的 bot token。

## 多帳戶

Mattermost 支援在 `channels.mattermost.accounts` 下設置多個帳戶：

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

## 故障排除

- 頻道中無回覆：請確認 bot 已加入頻道並提及它（oncall），使用觸發前綴（onchar），或設定 `chatmode: "onmessage"`。
- 驗證錯誤：請檢查 bot token、基礎 URL 以及帳戶是否已啟用。
- 多帳戶問題：環境變數僅適用於 `default` 帳戶。
- 按鈕顯示為白框：代理程式可能發送了格式錯誤的按鈕資料。請檢查每個按鈕是否同時具有 `text` 和 `callback_data` 欄位。
- 按鈕已呈現但點擊無反應：請驗證 Mattermost 伺服器設定中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，且 ServiceSettings 中的 `EnablePostActionIntegration` 為 `true`。
- 按鈕點擊時返回 404：按鈕的 `id` 可能包含連字號或底線。Mattermost 的動作路由器會在遇到非字母數字的 ID 時失效。請僅使用 `[a-zA-Z0-9]`。
- Gateway 記錄 `invalid _token`：HMAC 不符。請檢查您是否對所有上下文欄位（而非子集）進行簽名，使用排序後的鍵，並使用精簡 JSON （無空格）。請參閱上方的 HMAC 區段。
- Gateway 記錄 `missing _token in context`：`_token` 欄位不在按鈕的上下文中。請確保在建構整合負載時包含該欄位。
- 確認顯示原始 ID 而非按鈕名稱：`context.action_id` 與按鈕的 `id` 不相符。請將兩者設為相同的清理後數值。
- Agent 無法識別按鈕：請將 `capabilities: ["inlineButtons"]` 新增至 Mattermost 頻道設定中。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
