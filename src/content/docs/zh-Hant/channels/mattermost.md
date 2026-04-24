---
summary: "Mattermost bot setup and OpenClaw config"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost

Status: bundled plugin (bot token + WebSocket events). Channels, groups, and DMs are supported.
Mattermost is a self-hostable team messaging platform; see the official site at
[mattermost.com](https://mattermost.com) for product details and downloads.

## 內建外掛程式

在目前的 OpenClaw 版本中，Mattermost 作為內建外掛程式發行，因此一般的
套件組建版本不需要另外安裝。

如果您使用的是較舊的組建版本，或是排除 Mattermost 的自訂安裝，
請手動安裝：

透過 CLI 安裝（npm registry）：

```bash
openclaw plugins install @openclaw/mattermost
```

本地結帳（當從 git repo 執行時）：

```bash
openclaw plugins install ./path/to/local/mattermost-plugin
```

Details: [Plugins](/zh-Hant/tools/plugin)

## 快速設定

1. 確保 Mattermost 外掛程式可用。
   - 目前的套件版 OpenClaw 發行版本已內建此外掛程式。
   - 較舊或自訂的安裝版本可以使用上述指令手動新增。
2. 建立一個 Mattermost bot 帳號並複製 **bot token**。
3. Copy the Mattermost **base URL** (e.g., `https://chat.example.com`).
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

Native slash commands are opt-in. When enabled, OpenClaw registers `oc_*` slash commands via
the Mattermost API and receives callback POSTs on the gateway HTTP server.

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

- `native: "auto"` defaults to disabled for Mattermost. Set `native: true` to enable.
- If `callbackUrl` is omitted, OpenClaw derives one from gateway host/port + `callbackPath`.
- For multi-account setups, `commands` can be set at the top level or under
  `channels.mattermost.accounts.<id>.commands` (account values override top-level fields).
- Command callbacks are validated with the per-command tokens returned by
  Mattermost when OpenClaw registers `oc_*` commands.
- 當註冊失敗、啟動未完成，或回呼 token 與任一已註冊指令不符時，
  斜線回呼會封閉式地失敗（fail closed）。
- 連線能力需求：Mattermost 伺服器必須能夠連線到回呼端點。
  - Do not set `callbackUrl` to `localhost` unless Mattermost runs on the same host/network namespace as OpenClaw.
  - Do not set `callbackUrl` to your Mattermost base URL unless that URL reverse-proxies `/api/channels/mattermost/command` to OpenClaw.
  - A quick check is `curl https://<gateway-host>/api/channels/mattermost/command`; a GET should return `405 Method Not Allowed` from OpenClaw, not `404`.
- Mattermost 出站允許清單要求：
  - If your callback targets private/tailnet/internal addresses, set Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` to include the callback host/domain.
  - 請使用主機/網域條目，而非完整的 URL。
    - Good: `gateway.tailnet-name.ts.net`
    - Bad: `https://gateway.tailnet-name.ts.net`

## 環境變量（預設帳號）

如果您偏好使用環境變量，請在 Gateway 主機上設置這些變量：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

Env vars apply only to the **default** account (`default`). Other accounts must use config values.

## 聊天模式

Mattermost 會自動回應直接訊息（DM）。頻道行為由 `chatmode` 控制：

- `oncall`（預設）：僅在頻道中被 @提及 時回應。
- `onmessage`：回應每一則頻道訊息。
- `onchar`：當訊息以觸發前綴開頭時回應。

配置範例：

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

注意：

- `onchar` 仍會回應明確的 @提及。
- `channels.mattermost.requireMention` 適用於舊版設定，但建議使用 `chatmode`。

## 串回與會話

使用 `channels.mattermost.replyToMode` 來控制頻道和群組的回應是留在主頻道，還是在觸發貼文下開始一個討論串。

- `off`（預設）：僅當進入的貼文已經在討論串中時，才在討論串中回應。
- `first`：對於頂層頻道/群組貼文，在該貼文下開始一個討論串，並將對話路由至一個討論串範圍的工作階段。
- `all`：目前對 Mattermost 而言，行為與 `first` 相同。
- 直接訊息會忽略此設置並保持非串回狀態。

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

注意：

- 執行緒範圍的會話使用觸發文章的 ID 作為執行緒根。
- `first` 和 `all` 目前是等效的，因為一旦 Mattermost 有了討論串根，後續的區塊和媒體會繼續在同一個討論串中。

## 存取控制（DM）

- 預設值：`channels.mattermost.dmPolicy = "pairing"`（未知發送者會收到配對代碼）。
- 透過以下方式核准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公開 DM：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 頻道（群組）

- 預設值：`channels.mattermost.groupPolicy = "allowlist"`（提及限制）。
- 使用 `channels.mattermost.groupAllowFrom` 允許清單發送者（建議使用使用者 ID）。
- 各頻道的提及覆寫位於 `channels.mattermost.groups.<channelId>.requireMention` 之下，或使用 `channels.mattermost.groups["*"].requireMention` 作為預設值。
- `@username` 匹配是可變的，且僅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 時啟用。
- 公開頻道：`channels.mattermost.groupPolicy="open"`（提及限制）。
- 執行時期備註：如果 `channels.mattermost` 完全缺失，執行時期會在群組檢查時回退到 `groupPolicy="allowlist"`（即使已設定 `channels.defaults.groupPolicy`）。

範例：

```json5
{
  channels: {
    mattermost: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
    },
  },
}
```

## 外寄交付的目標

將這些目標格式與 `openclaw message send` 或 cron/webhooks 搭配使用：

- `channel:<id>` 用於頻道
- `user:<id>` 用於私訊（DM）
- `@username` 用於私訊（透過 Mattermost API 解析）

純不透明 ID（如 `64ifufp...`）在 Mattermost 中是**有歧義**的（使用者 ID vs 頻道 ID）。

OpenClaw 會以**使用者優先**的方式解析它們：

- 如果該 ID 作為使用者存在（`GET /api/v4/users/<id>` 成功），OpenClaw 會透過 `/api/v4/channels/direct` 解析直接頻道來發送**私訊（DM）**。
- 否則，該 ID 會被視為**頻道 ID**。

如果您需要確定性行為，請始終使用顯式前綴（`user:<id>` / `channel:<id>`）。

## DM 頻道重試

當 OpenClaw 發送到 Mattermost DM 目標並且需要先解析直接頻道時，它
預設會重試暫時性的直接頻道建立失敗。

使用 `channels.mattermost.dmChannelRetry` 全域調整 Mattermost 外掛的行為，或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 調整單一帳戶的行為。

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

- 這僅適用於私訊頻道建立（`/api/v4/channels/direct`），而非所有 Mattermost API 呼叫。
- 重試機制適用於暫時性錯誤，例如速率限制、5xx 回應以及網路或逾時錯誤。
- 除了 `429` 以外的 4xx 用戶端錯誤會被視為永久性錯誤，不會重試。

## 預覽串流

Mattermost 會將思考、工具活動和部分回覆文字串流到單一**草稿預覽貼文**中，當最終答案可以安全發送時，該貼文會原地完成。預覽會在同一個貼文 ID 上更新，而不是用每個區塊的訊息刷屏頻道。媒體/錯誤的最終結果會取消待處理的預覽編輯，並使用正常傳遞，而不是清理一次性的預覽貼文。

透過 `channels.mattermost.streaming` 啟用：

```json5
{
  channels: {
    mattermost: {
      streaming: "partial", // off | partial | block | progress
    },
  },
}
```

備註：

- `partial` 是常見的選擇：一個預覽貼文，隨著回覆增長進行編輯，然後以完整答案完成。
- `block` 在預覽貼文內使用附加樣式的草稿區塊。
- `progress` 在生成時顯示狀態預覽，並僅在完成時發布最終答案。
- `off` 停用預覽串流。
- 如果串流無法原地完成（例如貼文在串流過程中被刪除），OpenClaw 會回退到發送新的最終貼文，以確保回覆不會遺失。
- 僅包含推理的內容不會顯示在頻道貼文中，包括以 `> Reasoning:` 區塊引用形式抵達的文字。設定 `/reasoning on` 可在其他介面查看思考內容；Mattermost 最終貼文僅保留答案。
- 請參閱 [串流](/zh-Hant/concepts/streaming#preview-streaming-modes) 以了解頻道映射對照表。

## 反應（訊息工具）

- 搭配 `channel=mattermost` 使用 `message action=react`。
- `messageId` 是 Mattermost 的貼文 ID。
- `emoji` 接受像 `thumbsup` 或 `:+1:` 這樣的名稱（冒號可選）。
- 設定 `remove=true`（布林值）以移除反應。
- 反應新增/移除事件會作為系統事件轉發至已路由的代理程式工作階段。

範例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

設定：

- `channels.mattermost.actions.reactions`：啟用/停用反應動作（預設為 true）。
- 個別帳號覆寫：`channels.mattermost.accounts.<id>.actions.reactions`。

## 互動式按鈕（訊息工具）

傳送包含可點擊按鈕的訊息。當使用者點擊按鈕時，代理程式會收到
選擇內容並可做出回應。

透過將 `inlineButtons` 新增至管道功能來啟用按鈕：

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

- `text`（必要）：顯示標籤。
- `callback_data`（必要）：點擊時回傳的值（用作動作 ID）。
- `style`（選用）：`"default"`、`"primary"` 或 `"danger"`。

當使用者點擊按鈕時：

1. 所有按鈕會被替換為確認行（例如，「✓ **Yes** 由 @user 選取」）。
2. 代理程式會以傳入訊息的形式接收選擇內容並做出回應。

備註：

- 按鈕回調使用 HMAC-SHA256 驗證（自動進行，無需設定）。
- Mattermost 會從其 API 回應中移除回調資料（安全性功能），因此所有按鈕
  都會在點擊時被移除 — 無法部分移除。
- 包含連字號或底線的動作 ID 會自動被清除
  （Mattermost 路由限制）。

設定：

- `channels.mattermost.capabilities`：功能字串陣列。新增 `"inlineButtons"` 以
  在代理程式系統提示中啟用按鈕工具描述。
- `channels.mattermost.interactions.callbackBaseUrl`：按鈕回調的選用外部基礎 URL
  （例如 `https://gateway.example.com`）。當 Mattermost 無法
  直接透過其綁定主機連線至閘道時使用此選項。
- 在多帳戶設定中，您也可以在
  `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下設定相同的欄位。
- 如果省略了 `interactions.callbackBaseUrl`，OpenClaw 會從
  `gateway.customBindHost` + `gateway.port` 推導回調 URL，然後回退到 `http://localhost:<port>`。
- 連線規則：按鈕回調 URL 必須能夠從 Mattermost 伺服器存取。
  `localhost` 僅在 Mattermost 和 OpenClaw 運行於相同的主機/網路命名空間時有效。
- 如果您的回調目標是私有/tailnet/內部網路，請將其主機/網域新增至 Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 整合（外部腳本）

外部腳本和 webhook 可以透過 Mattermost REST API 直接發布按鈕，
而無需透過代理程式的 `message` 工具。請盡可能使用來自
插件的 `buildButtonAttachments()`；如果發布原始 JSON，請遵循以下規則：

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
2. 每個操作都需要 `type: "button"` —— 沒有它，點擊操作將被無聲吞沒。
3. 每個操作都需要一個 `id` 欄位 —— Mattermost 會忽略沒有 ID 的操作。
4. 操作 `id` 必須**僅包含字母數字** (`[a-zA-Z0-9]`)。連字號和底線會破壞
   Mattermost 的伺服器端操作路由（返回 404）。使用前請將其移除。
5. `context.action_id` 必須與按鈕的 `id` 相符，以便確認訊息顯示
   按鈕名稱（例如「核准」）而不是原始 ID。
6. `context.action_id` 是必需的 —— 互動處理程式在沒有它時會返回 400。

**HMAC Token 生成：**

閘道器使用 HMAC-SHA256 驗證按鈕點擊。外部腳本必須生成
符合閘道器驗證邏輯的 token：

1. 從 bot token 推導金鑰：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 使用所有欄位（**除了** `_token`）構建 context 物件。
3. 使用**排序鍵**和**無空格**進行序列化（閘道使用帶排序鍵的 `JSON.stringify`，這會產生緊湊的輸出）。
4. 簽署：`HMAC-SHA256(key=secret, data=serializedContext)`
5. 將結果十六進位摘要作為 `_token` 新增到內文中。

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
- 請務必簽署**所有**內文欄位（不包括 `_token`）。閘道會移除 `_token`，然後對剩餘的所有內容進行簽署。若只簽署子集，會導致靜默驗證失敗。
- 使用 `sort_keys=True` — 閘道會在簽署前對鍵進行排序，而 Mattermost 在儲存 payload 時可能會重新排列內文欄位。
- 從 bot token 推導出金鑰（確定性），而非使用隨機位元組。建立按鈕的處理程序與驗證的閘道必須使用相同的金鑰。

## 目錄適配器

Mattermost 外掛包含一個目錄適配器，透過 Mattermost API 解析頻道和使用者名稱。這使得 `#channel-name` 和 `@username` 目標可在 `openclaw message send` 和 cron/webhook 傳遞中使用。

無需設定 — 適配器使用帳號設定中的 bot token。

## 多重帳號

Mattermost 支援在 `channels.mattermost.accounts` 下設定多個帳號：

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

- 頻道中無回應：請確認 bot 在頻道中並提及它（oncall），使用觸發前綴（onchar），或設定 `chatmode: "onmessage"`。
- 驗證錯誤：請檢查 bot token、基礎 URL，以及帳號是否已啟用。
- 多重帳號問題：環境變數僅適用於 `default` 帳號。
- 原生斜線指令傳回 `Unauthorized: invalid command token.`：OpenClaw 未接受回呼 token。常見原因：
  - 斜線指令註冊在啟動時失敗或僅部分完成
  - 回呼發送到錯誤的閘道/帳號
  - Mattermost 上仍有指向先前回呼目標的舊指令
  - 閘道重新啟動但未重新啟動斜線指令
- If native slash commands stop working, check logs for
  `mattermost: failed to register slash commands` or
  `mattermost: native slash commands enabled but no commands could be registered`.
- If `callbackUrl` is omitted and logs warn that the callback resolved to
  `http://127.0.0.1:18789/...`, that URL is probably only reachable when
  Mattermost runs on the same host/network namespace as OpenClaw. Set an
  explicit externally reachable `commands.callbackUrl` instead.
- Buttons appear as white boxes: the agent may be sending malformed button data. Check that each button has both `text` and `callback_data` fields.
- Buttons render but clicks do nothing: verify `AllowedUntrustedInternalConnections` in Mattermost server config includes `127.0.0.1 localhost`, and that `EnablePostActionIntegration` is `true` in ServiceSettings.
- Buttons return 404 on click: the button `id` likely contains hyphens or underscores. Mattermost's action router breaks on non-alphanumeric IDs. Use `[a-zA-Z0-9]` only.
- Gateway logs `invalid _token`: HMAC mismatch. Check that you sign all context fields (not a subset), use sorted keys, and use compact JSON (no spaces). See the HMAC section above.
- Gateway logs `missing _token in context`: the `_token` field is not in the button's context. Ensure it is included when building the integration payload.
- Confirmation shows raw ID instead of button name: `context.action_id` does not match the button's `id`. Set both to the same sanitized value.
- Agent doesn't know about buttons: add `capabilities: ["inlineButtons"]` to the Mattermost channel config.

## 相關

- [Channels Overview](/zh-Hant/channels) — all supported channels
- [Pairing](/zh-Hant/channels/pairing) — DM authentication and pairing flow
- [Groups](/zh-Hant/channels/groups) — group chat behavior and mention gating
- [Channel Routing](/zh-Hant/channels/channel-routing) — session routing for messages
- [Security](/zh-Hant/gateway/security) — access model and hardening
