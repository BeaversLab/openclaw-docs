---
summary: "Mattermost bot 設定與 OpenClaw 設定"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost（外掛程式）

狀態：透過外掛程式支援（bot token + WebSocket 事件）。支援頻道、群組和私人訊息。
Mattermost 是一個可自行架設的團隊訊息平台；請造訪
[mattermost.com](https://mattermost.com) 官方網站以取得產品詳細資訊和下載。

## 需要外掛程式

Mattermost 以外掛程式形式發行，未隨附於核心安裝中。

透過 CLI 安裝（npm registry）：

```bash
openclaw plugins install @openclaw/mattermost
```

本地端檢出（當從 git repo 執行時）：

```bash
openclaw plugins install ./extensions/mattermost
```

如果您在設定過程中選擇 Mattermost 且偵測到 git 檢出，
OpenClaw 將會自動提供本地端安裝路徑。

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定

1. 安裝 Mattermost 外掛程式。
2. 建立 Mattermost bot 帳號並複製 **bot token**。
3. 複製 Mattermost **base URL**（例如 `https://chat.example.com`）。
4. 設定 OpenClaw 並啟動閘道。

最低設定：

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
並在閘道 HTTP 伺服器上接收回呼 POST 要求。

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

- 針對 Mattermost，`native: "auto"` 預設為停用。請設定 `native: true` 以啟用。
- 如果省略 `callbackUrl`，OpenClaw 會從閘道主機/連接埠 + `callbackPath` 推導。
- 對於多帳號設定，`commands` 可以設定在頂層或
  `channels.mattermost.accounts.<id>.commands` 之下（帳號值會覆寫頂層欄位）。
- 指令回呼會使用個別指令的 token 進行驗證，當 token 檢查失敗時會以封閉式失敗處理。
- 連線能力要求：Mattermost 伺服器必須能夠連線至回呼端點。
  - 除非 Mattermost 與 OpenClaw 執行於相同的主機/網路命名空間，否則請勿將 `callbackUrl` 設定為 `localhost`。
  - 除非該 URL 將 `/api/channels/mattermost/command` 反向代理至 OpenClaw，否則請勿將 `callbackUrl` 設定為您的 Mattermost base URL。
  - 快速檢查方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 請求應從 OpenClaw 返回 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 出站允許清單要求：
  - 如果您的回調目標是私有/tailnet/內部位址，請設定 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回調主機/網域。
  - 使用主機/網域條目，而非完整的 URL。
    - 正確： `gateway.tailnet-name.ts.net`
    - 錯誤： `https://gateway.tailnet-name.ts.net`

## 環境變數（預設帳戶）

如果您偏好使用環境變數，請在 Gateway 主機上設定這些變數：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

環境變數僅適用於 **預設** 帳戶（`default`）。其他帳戶必須使用設定值。

## 聊天模式

Mattermost 會自動回應私訊（DM）。頻道行為由 `chatmode` 控制：

- `oncall`（預設）：僅在頻道中被 @提及 時回應。
- `onmessage`：回應每一則頻道訊息。
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

註記：

- `onchar` 仍會回應明確的 @提及。
- `channels.mattermost.requireMention` 對舊版設定仍然有效，但建議優先使用 `chatmode`。

## 串接與對話階段

使用 `channels.mattermost.replyToMode` 來控制頻道和群組回覆是保留在
主頻道中，還是在觸發貼文下開啟串接。

- `off`（預設）：僅當傳入貼文已經在串接中時，才在串接中回覆。
- `first`：對於頂層頻道/群組貼文，在該貼文下開啟串接並將
  對話路由至串接範圍的對話階段。
- `all`：目前對於 Mattermost 來說，其行為與 `first` 相同。
- 私訊（DM）會忽略此設定，並保持非串接狀態。

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

註記：

- 串接範圍的對話階段使用觸發貼文 ID 作為串接根。
- `first` 和 `all` 目前是等效的，因為一旦 Mattermost 有了串接根，
  後續的區塊和媒體會繼續在同一個串接中進行。

## 存取控制（私訊 DM）

- 預設：`channels.mattermost.dmPolicy = "pairing"`（未知發送者會收到配對碼）。
- 透過以下方式批准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公開 DM：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 頻道（群組）

- 預設：`channels.mattermost.groupPolicy = "allowlist"`（提及門控）。
- 使用 `channels.mattermost.groupAllowFrom` 將發送者加入允許清單（建議使用使用者 ID）。
- `@username` 匹配是可變的，且僅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 時啟用。
- 公開頻道：`channels.mattermost.groupPolicy="open"`（提及門控）。
- 執行時注意：如果完全缺少 `channels.mattermost`，執行時會針對群組檢查回退到 `groupPolicy="allowlist"`（即使設定了 `channels.defaults.groupPolicy`）。

## 出站傳送的目標

將這些目標格式與 `openclaw message send` 或 cron/webhooks 搭配使用：

- `channel:<id>` 用於頻道
- `user:<id>` 用於 DM
- `@username` 用於 DM（透過 Mattermost API 解析）

純不透明 ID（例如 `64ifufp...`）在 Mattermost 中是**模稜兩可的**（使用者 ID 與頻道 ID）。

OpenClaw 會以**使用者優先**的方式解析它們：

- 如果該 ID 作為使用者存在（`GET /api/v4/users/<id>` 成功），OpenClaw 會透過 `/api/v4/channels/direct` 解析直接頻道來發送 **DM**。
- 否則，該 ID 將被視為**頻道 ID**。

如果您需要確定性行為，請始終使用明確的前綴（`user:<id>` / `channel:<id>`）。

## 反應（訊息工具）

- 將 `message action=react` 與 `channel=mattermost` 搭配使用。
- `messageId` 是 Mattermost 的貼文 ID。
- `emoji` 接受類似 `thumbsup` 或 `:+1:` 的名稱（冒號可選）。
- 設定 `remove=true`（布林值）以移除反應。
- 反應新增/移除事件會作為系統事件轉發至路由的代理程式工作階段。

範例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

設定：

- `channels.mattermost.actions.reactions`：啟用/停用反應動作（預設為 true）。
- 個別帳戶覆寫：`channels.mattermost.accounts.<id>.actions.reactions`。

## 互動按鈕（訊息工具）

傳送帶有可點擊按鈕的訊息。當使用者點擊按鈕時，代理程式會收到選擇並且回應。

透過將 `inlineButtons` 新增至通道功能來啟用按鈕：

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

1. 所有按鈕都會被替換為確認行（例如，「✓ **Yes** 已由 @user 選取」）。
2. 代理程式會收到該選擇作為傳入訊息並進行回應。

備註：

- 按鈕回調使用 HMAC-SHA256 驗證（自動，無需設定）。
- Mattermost 會從其 API 回應中剝離回調資料（安全功能），因此所有按鈕都會在點擊時被移除 — 無法部分移除。
- 包含連字號或底線的動作 ID 會自動進行清理（Mattermost 路由限制）。

設定：

- `channels.mattermost.capabilities`：功能字串陣列。新增 `"inlineButtons"` 以
  在代理程式系統提示詞中啟用按鈕工具描述。
- `channels.mattermost.interactions.callbackBaseUrl`：按鈕回調的可選外部基本 URL（例如 `https://gateway.example.com`）。當 Mattermost 無法直接
  在其綁定主機上連線至閘道時使用此設定。
- 在多帳號設定中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下設定相同的欄位。
- 如果省略 `interactions.callbackBaseUrl`，OpenClaw 會從
  `gateway.customBindHost` + `gateway.port` 推導回調 URL，然後回退到 `http://localhost:<port>`。
- 連線能力規則：按鈕回調 URL 必須可從 Mattermost 伺服器連線。
  `localhost` 僅在 Mattermost 和 OpenClaw 運行於相同主機/網路命名空間時有效。
- 如果您的回調目標是私有/tailnet/內部網路，請將其主機/網域新增至 Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 整合（外部腳本）

外部腳本和 Webhook 可以透過 Mattermost REST API 直接發送按鈕，而不需要透過代理程式的 `message` 工具。請盡可能使用擴充功能中的 `buildButtonAttachments()`；如果發送原始 JSON，請遵循以下規則：

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

1. 附件必須放在 `props.attachments` 中，而不是頂層的 `attachments`（會被無聲忽略）。
2. 每個動作都需要 `type: "button"` — 沒有它，點擊會被無聲吞沒。
3. 每個動作都需要一個 `id` 欄位 — Mattermost 會忽略沒有 ID 的動作。
4. 動作 `id` 必須**僅包含英數字元**（`[a-zA-Z0-9]`）。連字號和底線會破壞
   Mattermost 的伺服器端動作路由（傳回 404）。使用前請將它們移除。
5. `context.action_id` 必須與按鈕的 `id` 相符，以便確認訊息顯示
   按鈕名稱（例如「Approve」/核准）而不是原始 ID。
6. `context.action_id` 是必需的 — 如果沒有它，互動處理程式會傳回 400。

**HMAC 權杖產生：**

閘道會使用 HMAC-SHA256 驗證按鈕點擊。外部腳本必須產生與閘道驗證邏輯相符的權杖：

1. 從 Bot 權杖衍生金鑰：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 使用**排除** `_token` 在內的所有欄位來建構內容物件。
3. 使用**排序鍵**且**不包含空格**進行序列化（閘道使用具有排序鍵的 `JSON.stringify`
   ，這會產生緊湊輸出）。
4. 簽署：`HMAC-SHA256(key=secret, data=serializedContext)`
5. 將產生的十六進位摘要作為內容中的 `_token` 新增。

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

- Python 的 `json.dumps` 預設會加入空格（`{"key": "val"}`）。請使用
  `separators=(",", ":")` 來符合 JavaScript 的緊湊輸出（`{"key":"val"}`）。
- 務必簽署**所有**內容欄位（扣除 `_token`）。閘道會移除 `_token` 然後
  簽署剩餘的所有內容。僅簽署子集會導致無聲的驗證失敗。
- 使用 `sort_keys=True` — 閘道在簽署前會對金鑰進行排序，而 Mattermost 在儲存 Payload 時可能會重新排序 Context 欄位。
- 從 Bot Token 推導出密鑰（確定性），而非使用隨機位元組。在建立按鈕的程序與負責驗證的閘道之間，密鑰必須保持一致。

## 目錄適配器

Mattermost 外掛包含一個目錄適配器，可透過 Mattermost API 解析頻道和用戶名稱。這使得 `#channel-name` 和 `@username` 目標能在 `openclaw message send` 以及 cron/webhook 傳遞中使用。

無需進行設定 — 適配器會使用帳戶設定中的 Bot Token。

## 多重帳戶

Mattermost 支援在 `channels.mattermost.accounts` 下設定多個帳戶：

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

- 頻道中無回覆：請確認機器人在頻道中並提及它 (oncall)、使用觸發前綴 (onchar)，或設定 `chatmode: "onmessage"`。
- 驗證錯誤：請檢查 Bot Token、Base URL 以及帳戶是否已啟用。
- 多帳戶問題：環境變數僅適用於 `default` 帳戶。
- 按鈕顯示為白色方塊：Agent 可能發送了格式錯誤的按鈕資料。請檢查每個按鈕是否同時包含 `text` 和 `callback_data` 欄位。
- 按鈕已渲染但點擊無反應：請驗證 Mattermost 伺服器設定中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，並且 ServiceSettings 中的 `EnablePostActionIntegration` 為 `true`。
- 點擊按鈕時傳回 404：按鈕的 `id` 可能包含連字號或底線。Mattermost 的動作路由器無法處理非字母數字的 ID。請僅使用 `[a-zA-Z0-9]`。
- 閘道記錄 `invalid _token`：HMAC 不符。請檢查您是否對所有 Context 欄位（而非子集）進行簽署、使用排序後的金鑰，並使用精簡 JSON（無空格）。請參閱上方的 HMAC 章節。
- 閘道記錄 `missing _token in context`：`_token` 欄位不在按鈕的 Context 中。請確保在建立整合 Payload 時將其包含在內。
- 確認訊息顯示原始 ID 而非按鈕名稱：`context.action_id` 與按鈕的 `id` 不相符。請將兩者設為相同的標準化值。
- Agent 不識別按鈕：請將 `capabilities: ["inlineButtons"]` 加入 Mattermost 頻道設定中。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
