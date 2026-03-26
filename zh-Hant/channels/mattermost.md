---
summary: "Mattermost 機器人設定與 OpenClaw 設定"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost (外掛程式)

狀態：透過外掛程式支援（Bot 權杖 + WebSocket 事件）。支援頻道、群組和私人訊息。
Mattermost 是一個可自主託管的團隊訊息傳遞平台；請造訪
[mattermost.com](https://mattermost.com) 官方網站以了解產品詳情和下載。

## 需要外掛程式

Mattermost 以外掛程式形式發行，並未隨附於核心安裝中。

透過 CLI 安裝 (npm registry)：

```bash
openclaw plugins install @openclaw/mattermost
```

本機結帳 (當從 git repo 執行時)：

```bash
openclaw plugins install ./extensions/mattermost
```

如果您在設定期間選擇 Mattermost 且偵測到 git 結帳，
OpenClaw 將會自動提供本機安裝路徑。

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定

1. 安裝 Mattermost 外掛程式。
2. 建立一個 Mattermost 機器人帳戶並複製 **機器人權杖 (bot token)**。
3. 複製 Mattermost **基礎 URL** (例如 `https://chat.example.com`)。
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

原生斜線指令為選用功能。啟用後，OpenClaw 會透過 Mattermost API 註冊 `oc_*` 斜線指令，並在閘道 HTTP 伺服器上接收回呼 POST 要求。

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

注意：

- `native: "auto"` 對於 Mattermost 預設為停用。請設定 `native: true` 以啟用。
- 如果省略 `callbackUrl`，OpenClaw 會根據閘道主機/連接埠 + `callbackPath` 推導出一個。
- 對於多帳戶設定，`commands` 可以設定在頂層或
  `channels.mattermost.accounts.<id>.commands` 之下（帳戶值會覆寫頂層欄位）。
- 指令回呼會使用各指令專屬的 token 進行驗證，當 token 檢查失敗時會以封閉模式處理（fail closed）。
- 連線能力需求：回呼端點必須能夠被 Mattermost 伺服器存取。
  - 除非 Mattermost 與 OpenClaw 執行於相同的主機/網路命名空間，否則請勿將 `callbackUrl` 設定為 `localhost`。
  - 除非該 URL 將 `/api/channels/mattermost/command` 反向代理至 OpenClaw，否則請勿將 `callbackUrl` 設定為您的 Mattermost 基礎 URL。
  - 快速檢查方式是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 請求應從 OpenClaw 傳回 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 出站允許清單需求：
  - 如果您的回呼目標是私人網路/tailnet/內部位址，請設定 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回呼的主機/網域。
  - 請使用主機/網域條目，而非完整的 URL。
    - 良好：`gateway.tailnet-name.ts.net`
    - 不良：`https://gateway.tailnet-name.ts.net`

## 環境變數（預設帳戶）

如果您偏好使用環境變數，請在 gateway 主機上設定這些：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

環境變數僅適用於 **預設** 帳戶 (`default`)。其他帳戶必須使用組態值。

## 聊天模式

Mattermost 會自動回覆私訊 (DM)。頻道行為由 `chatmode` 控制：

- `oncall`（預設）：僅在頻道中被 @提及 時回覆。
- `onmessage`：回覆每一則頻道訊息。
- `onchar`：當訊息以觸發前綴開頭時回覆。

組態範例：

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

- `onchar` 仍然會回覆明確的 @提及。
- `channels.mattermost.requireMention` 對於舊版配置仍然有效，但建議使用 `chatmode`。

## 串接與會話

使用 `channels.mattermost.replyToMode` 來控制頻道和群組的回覆是留在主頻道中，還是在觸發貼文下開啟一個串接。

- `off`（預設值）：僅當入站貼文已經在串接中時，才在串接中回覆。
- `first`：對於頂層頻道/群組貼文，在該貼文下開啟一個串接，並將對話路由到以該串接為範圍的會話。
- `all`：目前對於 Mattermost，其行為與 `first` 相同。
- 直接訊息會忽略此設定，並保持非串接狀態。

配置範例：

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

- 以串接為範圍的會話使用觸發貼文 ID 作為串接根節點。
- `first` 和 `all` 目前是等價的，因為一旦 Mattermost 擁有串迴根，後續的區塊和媒體將繼續在同一個串迴中。

## 存取控制 (DMs)

- 預設值：`channels.mattermost.dmPolicy = "pairing"` (未知發送者會收到配對碼)。
- 核准方式：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公開 DMs：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 頻道 (群組)

- 預設值：`channels.mattermost.groupPolicy = "allowlist"` (提及限制)。
- 使用 `channels.mattermost.groupAllowFrom` 將發送者加入允許清單 (建議使用使用者 ID)。
- `@username` 比對是可變的，並且僅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 時啟用。
- 公開頻道：`channels.mattermost.groupPolicy="open"` (提及限制)。
- 執行時備註：如果完全缺少 `channels.mattermost`，執行時會回退到 `groupPolicy="allowlist"` 進行群組檢查（即使設定了 `channels.defaults.groupPolicy`）。

## 外寄傳送的目標

請使用這些目標格式搭配 `openclaw message send` 或 cron/webhooks：

- `channel:<id>` 用於頻道
- `user:<id>` 用於 DM
- `@username` 用於 DM（透過 Mattermost API 解析）

純不透明 ID（例如 `64ifufp...`）在 Mattermost 中是**模稜兩可**的（使用者 ID 對比頻道 ID）。

OpenClaw 會以**使用者優先**的方式解析它們：

- 如果該 ID 作為使用者存在（`GET /api/v4/users/<id>` 成功），OpenClaw 會透過 `/api/v4/channels/direct` 解析直接頻道來發送 **DM**。
- 否則，該 ID 會被視為**頻道 ID**。

如果您需要確定性行為，請務必使用顯式前綴 (`user:<id>` / `channel:<id>`)。

## DM 頻道重試

當 OpenClaw 發送到 Mattermost DM 目標並需要先解析直接頻道時，它預設會重試暫時性的直接頻道建立失敗。

使用 `channels.mattermost.dmChannelRetry` 全域調整 Mattermost 外掛的該行為，或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 適用於單一帳戶。

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

- 這僅適用於 DM 頻道建立 (`/api/v4/channels/direct`)，而非所有 Mattermost API 呼叫。
- 重試適用於速率限制、5xx 回應以及網路或逾時錯誤等暫時性失敗。
- 除了 `429` 之外的 4xx 用戶端錯誤會被視為永久性錯誤，不會重試。

## 反應 (訊息工具)

- 將 `message action=react` 與 `channel=mattermost` 搭配使用。
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

傳送包含可點擊按鈕的訊息。當使用者點擊按鈕時，代理程式會收到
選擇並可進行回應。

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

- `text` (required)：顯示標籤。
- `callback_data` (required)：點擊時傳回的值（用作動作 ID）。
- `style` (optional)：`"default"`、`"primary"` 或 `"danger"`。

當使用者按一下按鈕時：

1. 所有按鈕會被替換為一個確認行（例如 "✓ **Yes** selected by @user"）。
2. Agent 會收到選取內容作為 inbound 訊息並進行回應。

備註：

- 按鈕回呼使用 HMAC-SHA256 驗證（自動進行，無需配置）。
- Mattermost 會從其 API 回應中移除回呼資料（安全功能），因此所有按鈕都會在點擊時被移除 — 無法部分移除。
- 包含連字號或底線的動作 ID 會自動被清理（Mattermost 路由限制）。

配置：

- `channels.mattermost.capabilities`：功能字串陣列。新增 `"inlineButtons"` 以
  在代理系統提示中啟用按鈕工具描述。
- `channels.mattermost.interactions.callbackBaseUrl`：按鈕回呼的選用外部基礎 URL
  （例如 `https://gateway.example.com`）。當 Mattermost 無法
  直接連線至其綁定主機上的閘道時使用。
- 在多帳號設定中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下設定相同的欄位。
- 如果省略 `interactions.callbackBaseUrl`，OpenClaw 會從
  `gateway.customBindHost` + `gateway.port` 推導回呼 URL，然後後備至 `http://localhost:<port>`。
- 連線性規則：按鈕回呼 URL 必須可從 Mattermost 伺服器連線。
  `localhost` 僅在 Mattermost 和 OpenClaw 執行於相同主機/網路命名空間時有效。
- 如果您的回調目標是私有的/tailnet/內部的，請將其主機/網域新增至 Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 整合（外部腳本）

外部腳本和 Webhooks 可以直接透過 Mattermost REST API 發送按鈕，而不透過代理程式的 `message` 工具。盡可能使用擴充功能中的 `buildButtonAttachments()`；如果發送原始 JSON，請遵循以下規則：

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

1. 附件必須放在 `props.attachments` 中，而不是頂層 `attachments`（會被無聲忽略）。
2. 每個動作都需要 `type: "button"` — 沒有它，點擊會被無聲吞沒。
3. 每個動作都需要一個 `id` 欄位 — Mattermost 會忽略沒有 ID 的動作。
4. Action `id` 必須**僅包含英數字元**（`[a-zA-Z0-9]`）。連字號和底線會破壞
   Mattermost 的伺服器端動作路由（會回傳 404）。請在使用前將其移除。
5. `context.action_id` 必須符合按鈕的 `id`，如此確認訊息才會顯示
   按鈕名稱（例如「Approve」），而不是原始 ID。
6. `context.action_id` 是必填的 —— 若沒有它，互動處理程式會回傳 400。

**HMAC 權杖產生：**

閘道會使用 HMAC-SHA256 驗證按鈕點擊。外部腳本必須產生
符合閘道驗證邏輯的權杖：

1. 從 bot 權杖衍生出祕密金鑰：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 使用所有欄位（**除了** `_token`）建構 context 物件。
3. 使用**排序的鍵**且**不包含空格**進行序列化（閘道使用帶有排序鍵的 `JSON.stringify`，這會產生精簡的輸出）。
4. 簽章：`HMAC-SHA256(key=secret, data=serializedContext)`
5. 將產生的十六進位摘要作為 `_token` 新增至上下文中。

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

- Python 的 `json.dumps` 預設會加入空格（`{"key": "val"}`）。請使用 `separators=(",", ":")` 以符合 JavaScript 的精簡輸出（`{"key":"val"}`）。
- 務必對**所有**上下文欄位進行簽章（`_token` 除外）。閘道會移除 `_token` 然後對剩餘的所有內容進行簽章。對子集進行簽章會導致無聲驗證失敗。
- 使用 `sort_keys=True` — 閘道在簽章前會對鍵進行排序，而 Mattermost 在儲存載荷時可能會重新排序上下文欄位。
- 從機器人權杖（決定性）派生密鑰，而非隨機位元組。在建立按鈕的處理程序與驗證的閘道之間，密鑰必須保持一致。

## 目錄適配器

Mattermost 外掛包含一個目錄適配器，可透過 Mattermost API 解析頻道和用戶名稱。這啟用了 `#channel-name` 和 `@username` 目標於 `openclaw message send` 以及 cron/webhook 傳遞中。

無需配置 — 適配器使用帳戶配置中的機器人權杖。

## 多重帳戶

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

## 疑難排解

- 頻道中無回應：請確保機器人在頻道中並提及它（oncall），使用觸發前綴（onchar），或設定 `chatmode: "onmessage"`。
- 身份驗證錯誤：請檢查機器人權杖、基礎 URL，以及帳戶是否已啟用。
- 多重帳號問題：環境變數僅適用於 `default` 帳號。
- 按鈕顯示為白框：代理程式可能發送了格式錯誤的按鈕資料。請檢查每個按鈕是否同時具有 `text` 和 `callback_data` 欄位。
- 按鈕已呈現但點擊無效：請驗證 Mattermost 伺服器設定中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，並且 ServiceSettings 中的 `EnablePostActionIntegration` 為 `true`。
- 點擊按鈕時返回 404：按鈕 `id` 可能包含連字號或底線。Mattermost 的動作路由器在遇到非字母數字 ID 時會中斷。請僅使用 `[a-zA-Z0-9]`。
- Gateway 記錄 `invalid _token`：HMAC 不符。請檢查您是否簽署了所有 context 欄位（而非子集）、使用排序後的鍵，並使用精簡的 JSON（無空格）。請參閱上方的 HMAC 章節。
- Gateway 記錄 `missing _token in context`：`_token` 欄位不在按鈕的 context 中。請確保在建立整合 payload 時包含該欄位。
- 確認畫面顯示原始 ID 而非按鈕名稱：`context.action_id` 與按鈕的 `id` 不符。請將兩者設為相同的正規化值。
- Agent 無法識別按鈕：將 `capabilities: ["inlineButtons"]` 新增至 Mattermost 頻道設定中。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
