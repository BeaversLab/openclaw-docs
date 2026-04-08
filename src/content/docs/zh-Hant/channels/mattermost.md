---
summary: "Mattermost 機器人設定與 OpenClaw 設定"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost

狀態：內建外掛程式（bot token + WebSocket 事件）。支援頻道、群組和私人訊息。
Mattermost 是一個可自行架設的團隊訊息平台；請參閱
[mattermost.com](https://mattermost.com) 官方網站以取得產品詳細資訊和下載。

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

詳細資訊：[外掛程式](/en/tools/plugin)

## 快速設定

1. 確保 Mattermost 外掛程式可用。
   - 目前的套件版 OpenClaw 發行版本已內建此外掛程式。
   - 較舊或自訂的安裝版本可以使用上述指令手動新增。
2. 建立一個 Mattermost bot 帳號並複製 **bot token**。
3. 複製 Mattermost **base URL**（例如 `https://chat.example.com`）。
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

- 對於 Mattermost，`native: "auto"` 預設為停用。請設定 `native: true` 以啟用。
- 如果省略 `callbackUrl`，OpenClaw 會根據閘道主機/連接埠 + `callbackPath` 推導出一個。
- 對於多帳號設定，`commands` 可以設定在頂層或
  `channels.mattermost.accounts.<id>.commands` 之下（帳號值會覆寫頂層欄位）。
- 指令回呼會使用 OpenClaw 註冊 `oc_*` 指令時
  Mattermost 傳回的各指令 token 進行驗證。
- 當註冊失敗、啟動未完成，或回呼 token 與任一已註冊指令不符時，
  斜線回呼會封閉式地失敗（fail closed）。
- 連線能力需求：Mattermost 伺服器必須能夠連線到回呼端點。
  - 除非 Mattermost 與 OpenClaw 運行在同一主機/網路命名空間中，否則請勿將 `callbackUrl` 設置為 `localhost`。
  - 除非該 URL 將 `/api/channels/mattermost/command` 反向代理至 OpenClaw，否則請勿將 `callbackUrl` 設置為您的 Mattermost 基礎 URL。
  - 一個快速檢查方法是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 請求應從 OpenClaw 返回 `405 Method Not Allowed`，而不是 `404`。
- Mattermost 出站允許清單要求：
  - 如果您的回調目標是私有/tailnet/內部地址，請設置 Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回調主機/網域。
  - 請使用主機/網域條目，而非完整的 URL。
    - 正確：`gateway.tailnet-name.ts.net`
    - 錯誤：`https://gateway.tailnet-name.ts.net`

## 環境變量（預設帳號）

如果您偏好使用環境變量，請在 Gateway 主機上設置這些變量：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

環境變量僅適用於 **預設** 帳號 (`default`)。其他帳號必須使用配置值。

## 聊天模式

Mattermost 會自動回覆 DM。頻道行為由 `chatmode` 控制：

- `oncall` （預設）：僅在頻道中被 @提及時回覆。
- `onmessage`：回覆每一條頻道訊息。
- `onchar`：當訊息以觸發前綴開頭時回覆。

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
- 雖然支援舊版配置中的 `channels.mattermost.requireMention`，但建議優先使用 `chatmode`。

## 串回與會話

使用 `channels.mattermost.replyToMode` 來控制頻道和群組回覆是保留在主頻道中，還是在觸發貼文下開啟串回。

- `off` （預設）：僅當入站貼文已經在串回中時，才在串回中回覆。
- `first`：對於頂層頻道/群組貼文，在該貼文下開啟串回並將
  對話路由至串回範圍的會話。
- `all`：目前的 Mattermost 行為與 `first` 相同。
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
- `first` 和 `all` 目前是等價的，因為一旦 Mattermost 有了執行緒根，後續的區塊和媒體會在同一個執行緒中繼續。

## 存取控制（DM）

- 預設值：`channels.mattermost.dmPolicy = "pairing"`（未知傳送者會收到配對碼）。
- 透過以下方式核准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公開 DM：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 頻道（群組）

- 預設值：`channels.mattermost.groupPolicy = "allowlist"`（提及閘道）。
- 使用 `channels.mattermost.groupAllowFrom` 將傳送者加入允許清單（建議使用使用者 ID）。
- 個別頻道的提及覆寫位於 `channels.mattermost.groups.<channelId>.requireMention`
  或使用 `channels.mattermost.groups["*"].requireMention` 作為預設值。
- `@username` 匹配是可變的，且僅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 時啟用。
- 公開頻道：`channels.mattermost.groupPolicy="open"`（提及閘道）。
- 執行時期注意：如果完全缺少 `channels.mattermost`，執行時期會針對群組檢查回退到 `groupPolicy="allowlist"`（即使設定了 `channels.defaults.groupPolicy`）。

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
- `user:<id>` 用於 DM
- `@username` 用於 DM（透過 Mattermost API 解析）

純不透明 ID（如 `64ifufp...`）在 Mattermost 中是**模稜兩可**的（使用者 ID vs 頻道 ID）。

OpenClaw 會以**使用者優先**的方式解析它們：

- 如果該 ID 作為使用者存在（`GET /api/v4/users/<id>` 成功），OpenClaw 會透過 `/api/v4/channels/direct` 解析直接頻道來發送 **DM**。
- 否則，該 ID 會被視為**頻道 ID**。

如果您需要確定性行為，請務必使用明確的前綴（`user:<id>` / `channel:<id>`）。

## DM 頻道重試

當 OpenClaw 發送到 Mattermost DM 目標並且需要先解析直接頻道時，它
預設會重試暫時性的直接頻道建立失敗。

使用 `channels.mattermost.dmChannelRetry` 針對 Mattermost 外掛全域調整該行為，或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 針對單一帳戶進行調整。

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

- 這僅適用於 DM 頻道建立 (`/api/v4/channels/direct`)，而非每次 Mattermost API 呼叫。
- 重試機制適用於暫時性錯誤，例如速率限制、5xx 回應以及網路或逾時錯誤。
- 除 `429` 外的 4xx 用戶端錯誤會被視為永久性錯誤，不會重試。

## 反應 (訊息工具)

- 將 `message action=react` 與 `channel=mattermost` 搭配使用。
- `messageId` 是 Mattermost 的貼文 ID。
- `emoji` 接受像是 `thumbsup` 或 `:+1:` 這類名稱 (冒號為選用)。
- 設定 `remove=true` (布林值) 以移除反應。
- 反應新增/移除事件會作為系統事件轉發至路由的代理程式工作階段。

範例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

設定：

- `channels.mattermost.actions.reactions`：啟用/停用反應動作 (預設為 true)。
- 每個帳戶的覆寫設定：`channels.mattermost.accounts.<id>.actions.reactions`。

## 互動式按鈕 (訊息工具)

傳送包含可點擊按鈕的訊息。當使用者點擊按鈕時，代理程式會收到選取內容並可進行回應。

透過將 `inlineButtons` 新增至頻道功能來啟用按鈕：

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

將 `message action=send` 與 `buttons` 參數搭配使用。按鈕是一個二維陣列 (按鈕列)：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

按鈕欄位：

- `text` (必要)：顯示標籤。
- `callback_data` (必要)：點擊時傳回的值 (用作動作 ID)。
- `style` (選用)：`"default"`、`"primary"` 或 `"danger"`。

當使用者點擊按鈕時：

1. 所有按鈕會被確認行 (例如 "✓ **Yes** selected by @user") 取代。
2. 代理程式會將選取內容作為傳入訊息接收並進行回應。

備註：

- 按鈕回呼使用 HMAC-SHA256 驗證 (自動，無需設定)。
- Mattermost 會從其 API 回應中移除回呼資料 (安全性功能)，因此所有按鈕都會在點擊時被移除 — 無法部分移除。
- 包含連字號或底線的動作 ID 會自動被清理（Mattermost 路由限制）。

設定：

- `channels.mattermost.capabilities`：功能字串陣列。加入 `"inlineButtons"` 以
  在代理程式系統提示詞中啟用按鈕工具描述。
- `channels.mattermost.interactions.callbackBaseUrl`：按鈕回呼的可選外部基礎 URL
  （例如 `https://gateway.example.com`）。當 Mattermost 無法
  直接存取其綁定主機上的閘道時使用。
- 在多帳號設定中，您也可以在
  `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下設定相同的欄位。
- 如果省略 `interactions.callbackBaseUrl`，OpenClaw 會從
  `gateway.customBindHost` + `gateway.port` 推導回呼 URL，然後回退到 `http://localhost:<port>`。
- 連線能力規則：按鈕回呼 URL 必須能從 Mattermost 伺服器存取。
  `localhost` 僅在 Mattermost 和 OpenClaw 運行於相同主機/網路命名空間時有效。
- 如果您的回呼目標是私人/tailnet/內部網路，請將其主機/網域新增至 Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`。

### 直接 API 整合（外部腳本）

外部腳本和 Webhooks 可以透過 Mattermost REST API 直接張貼按鈕，
而不必透過代理程式的 `message` 工具。盡可能使用擴充功能中的
`buildButtonAttachments()`；如果張貼原始 JSON，請遵循以下規則：

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

1. 附件放在 `props.attachments` 中，而非頂層 `attachments`（會被無聲忽略）。
2. 每個動作都需要 `type: "button"` — 沒有它，點擊會被無聲吞沒。
3. 每個動作都需要一個 `id` 欄位 — Mattermost 會忽略沒有 ID 的動作。
4. 動作 `id` 必須 **僅為字母數字** （`[a-zA-Z0-9]`）。連字號和底線會破壞
   Mattermost 的伺服器端動作路由（返回 404）。使用前請將其移除。
5. `context.action_id` 必須符合按鈕的 `id`，這樣確認訊息才會顯示
   按鈕名稱（例如「核准」），而非原始 ID。
6. `context.action_id` 是必需的 —— 沒有它，互動處理程式會返回 400。

**HMAC 權杖生成：**

閘道使用 HMAC-SHA256 驗證按鈕點擊。外部腳本必須生成符合閘道驗證邏輯的權杖：

1. 從機器人權杖派生密鑰：
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. 構建包含所有欄位（**除了** `_token`）的上下文物件。
3. 使用 **排序鍵** 和 **無空格** 進行序列化（閘道使用帶有排序鍵的 `JSON.stringify`，這會產生緊湊輸出）。
4. 簽名：`HMAC-SHA256(key=secret, data=serializedContext)`
5. 將產生的十六進位摘要作為 `_token` 添加到上下文中。

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
- 務必簽署 **所有** 上下文欄位（減去 `_token`）。閘道會移除 `_token` 然後
  對其餘部分進行簽署。僅簽署子集會導致靜默驗證失敗。
- 使用 `sort_keys=True` —— 閘道在簽署前會對鍵進行排序，且 Mattermost 在儲存載荷時可能會重新排序上下文欄位。
- 從機器人權杖派生密鑰（確定性），而非隨機位元組。密鑰在建立按鈕的程序與執行驗證的閘道之間必須保持一致。

## 目錄適配器

Mattermost 外掛包含一個目錄適配器，可透過 Mattermost API 解析頻道和使用者名稱。這可在 `openclaw message send` 和 cron/webhook 傳遞中啟用 `#channel-name` 和 `@username` 目標。

無需配置 —— 適配器使用帳戶配置中的機器人權杖。

## 多帳戶

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

## 故障排除

- 頻道中無回覆：請確保機器人在頻道中並提及它（oncall）、使用觸發前綴（onchar），或設定 `chatmode: "onmessage"`。
- 驗證錯誤：請檢查機器人權杖、基礎 URL 以及帳戶是否已啟用。
- 多帳號問題：環境變數僅套用於 `default` 帳號。
- 原生斜線指令傳回 `Unauthorized: invalid command token.`：OpenClaw
  未接受回調 token。典型原因：
  - 斜線指令註冊在啟動時失敗或僅部分完成
  - 回調指向了錯誤的 gateway/帳號
  - Mattermost 仍有舊的指令指向先前的回調目標
  - gateway 重新啟動時未重新啟用斜線指令
- 如果原生斜線指令停止運作，請檢查日誌中是否有
  `mattermost: failed to register slash commands` 或
  `mattermost: native slash commands enabled but no commands could be registered`。
- 如果省略了 `callbackUrl` 且日誌警告回調解析為
  `http://127.0.0.1:18789/...`，該 URL 可能僅在
  Mattermost 與 OpenClaw 執行於相同主機/網路命名空間時才可存取。請改為設定
  明確的外部可存取 `commands.callbackUrl`。
- 按鈕顯示為白框：代理程式可能正在發送格式錯誤的按鈕資料。請檢查每個按鈕是否同時具有 `text` 和 `callback_data` 欄位。
- 按鈕已顯示但點擊無反應：請驗證 Mattermost 伺服器設定中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，且 ServiceSettings 中的 `EnablePostActionIntegration` 為 `true`。
- 點擊按鈕時傳回 404：按鈕的 `id` 可能包含連字號或底線。Mattermost 的動作路由器在遇到非字母數字 ID 時會中斷。請僅使用 `[a-zA-Z0-9]`。
- Gateway 記錄 `invalid _token`：HMAC 不符。請檢查您是否簽署了所有內容欄位（而非子集）、使用排序後的鍵，並使用精簡 JSON（無空格）。請參閱上方的 HMAC 區段。
- Gateway 記錄 `missing _token in context`：`_token` 欄位不在按鈕的內容中。請確保在建置整合負載時包含它。
- 確認訊息顯示原始 ID 而非按鈕名稱：`context.action_id` 與按鈕的 `id` 不符。請將兩者設為相同的清理後值。
- 代理程式不識別按鈕：請將 `capabilities: ["inlineButtons"]` 新增至 Mattermost 頻道設定中。

## 相關

- [頻道概覽](/en/channels) — 所有支援的頻道
- [配對](/en/channels/pairing) — 私訊認證與配對流程
- [群組](/en/channels/groups) — 群組聊天行為與提及控管
- [頻道路由](/en/channels/channel-routing) — 訊息的會話路由
- [安全性](/en/gateway/security) — 存取模型與強化防護
