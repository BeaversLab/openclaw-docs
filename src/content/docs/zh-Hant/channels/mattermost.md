---
summary: "Mattermost bot setup and OpenClaw config"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
sidebarTitle: "Mattermost"
---

狀態：可下載的外掛程式（bot token + WebSocket 事件）。支援頻道、群組和私人訊息。Mattermost 是一個可自行架設的團隊訊息傳遞平台；請參閱 [mattermost.com](https://mattermost.com) 官方網站以取得產品詳細資訊和下載。

## 安裝

在設定頻道之前先安裝 Mattermost：

<Tabs>
  <Tab title="npm registry">```bash openclaw plugins install @openclaw/mattermost ```</Tab>
  <Tab title="Local checkout">```bash openclaw plugins install ./path/to/local/mattermost-plugin ```</Tab>
</Tabs>

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定

<Steps>
  <Step title="Ensure plugin is available">
    目前封裝的 OpenClaw 發行版本已內建此外掛。較舊或自訂的安裝可以使用上述指令手動新增。
  </Step>
  <Step title="Create a Mattermost bot">
    建立一個 Mattermost bot 帳號並複製 **bot token**。
  </Step>
  <Step title="Copy the base URL">
    複製 Mattermost **base URL**（例如 `https://chat.example.com`）。
  </Step>
  <Step title="Configure OpenClaw and start the gateway">
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

  </Step>
</Steps>

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

<AccordionGroup>
  <Accordion title="行為說明">
    - 對於 Mattermost，`native: "auto"` 預設為停用。請設定 `native: true` 以啟用。
    - 如果省略 `callbackUrl`，OpenClaw 會依據閘道主機/連接埠 + `callbackPath` 推導出一個。
    - 對於多帳號設定，`commands` 可以設定在頂層或 `channels.mattermost.accounts.<id>.commands` 之下（帳號值會覆寫頂層欄位）。
    - 指令回呼會使用 OpenClaw 註冊 `oc_*` 指令時由 Mattermost 傳回的個別指令權杖進行驗證。
    - OpenClaw 在接受每個回呼之前會重新整理目前的 Mattermost 指令註冊，如此一來，來自已刪除或重新產生斜線指令的過期權杖將不再被接受，而不需要重新啟動閘道。
    - 如果 Mattermost API 無法確認指令仍為最新狀態，回呼驗證將會封閉式地失敗（fail closed）；失敗的驗證會被短暫快取，並行查詢會被合併，且新的查詢啟動會受到每個指令的速率限制，以控制重放壓力。
    - 當註冊失敗、啟動未完成，或回呼權杖與解析指令的註冊權杖不符時（適用於某個指令的權杖無法通過不同指令的上游驗證），斜線回呼將會封閉式地失敗。

  </Accordion>
  <Accordion title="連線需求">
    回呼端點必須能夠從 Mattermost 伺服器存取。

    - 除非 Mattermost 與 OpenClaw 執行於相同的主機/網路命名空間，否則請勿將 `callbackUrl` 設定為 `localhost`。
    - 除非您的 Mattermost 基礎 URL 將 `/api/channels/mattermost/command` 反向代理至 OpenClaw，否則請勿將 `callbackUrl` 設定為該 URL。
    - 快速檢查方式是 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 請求應該要從 OpenClaw 傳回 `405 Method Not Allowed`，而不是 `404`。

  </Accordion>
  <Accordion title="Mattermost egress allowlist">
    如果您的回調目標是私人/tailnet/內部位址，請設定 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回調主機/網域。

    使用主機/網域條目，而非完整的 URL。

    - 良好：`gateway.tailnet-name.ts.net`
    - 不良：`https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## 環境變數（預設帳戶）

如果您偏好使用環境變數，請在閘道主機上設定這些：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
環境變數僅適用於 **預設** 帳戶（`default`）。其他帳戶必須使用設定值。

`MATTERMOST_URL` 無法從工作區 `.env` 設定；請參閱 [Workspace `.env` files](/zh-Hant/gateway/security)。

</Note>

## 聊天模式

Mattermost 會自動回應訊息 (DM)。頻道行為由 `chatmode` 控制：

<Tabs>
  <Tab title="oncall (default)">僅在頻道中被 @提及 時回應。</Tab>
  <Tab title="onmessage">回應每一則頻道訊息。</Tab>
  <Tab title="onchar">當訊息以觸發字首開頭時回應。</Tab>
</Tabs>

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
- `channels.mattermost.requireMention` 對於舊版設定仍然有效，但建議使用 `chatmode`。

## 串接與會話

使用 `channels.mattermost.replyToMode` 來控制頻道和群組的回覆是留在主頻道中，還是在觸發貼文下開始串接。

- `off` (預設)：僅當傳入貼文已經在串接中時，才在串接中回覆。
- `first`：對於頂層頻道/群組貼文，在該貼文下開始串接，並將對話路由到串接範圍的會話。
- `all`：對於目前的 Mattermost，行為與 `first` 相同。
- 直接訊息會忽略此設定，並保持非串接狀態。

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

- 線程範圍的會話使用觸發貼文 ID 作為線程根。
- `first` 和 `all` 目前是等效的，因為一旦 Mattermost 有了線程根，後續的區塊和媒體會在同一個線程中繼續。

## 存取控制（DM）

- 預設值：`channels.mattermost.dmPolicy = "pairing"`（未知發送者會收到配對碼）。
- 透過以下方式核准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公開 DM：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。
- `channels.mattermost.allowFrom` 接受 `accessGroup:<name>` 條目。請參閱[存取群組](/zh-Hant/channels/access-groups)。

## 頻道 (群組)

- 預設值：`channels.mattermost.groupPolicy = "allowlist"`（提及門控）。
- 使用 `channels.mattermost.groupAllowFrom` 將發送者加入允許清單（建議使用使用者 ID）。
- `channels.mattermost.groupAllowFrom` 接受 `accessGroup:<name>` 條目。請參閱[存取群組](/zh-Hant/channels/access-groups)。
- 個別頻道的提及覆寫設定位於 `channels.mattermost.groups.<channelId>.requireMention` 之下，或使用 `channels.mattermost.groups["*"].requireMention` 作為預設值。
- `@username` 比對是可變的，且僅在 `channels.mattermost.dangerouslyAllowNameMatching: true` 時啟用。
- 公開頻道：`channels.mattermost.groupPolicy="open"`（提及門控）。
- 執行時期備註：如果完全缺少 `channels.mattermost`，執行時期會回退到 `groupPolicy="allowlist"` 進行群組檢查（即使設定了 `channels.defaults.groupPolicy`）。

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

## 外寄傳送的目標

將這些目標格式用於 `openclaw message send` 或 cron/webhooks：

- `channel:<id>` 用於頻道
- `user:<id>` 用於 DM
- `@username` 用於 DM（透過 Mattermost API 解析）

<Warning>
純不透明 ID（例如 `64ifufp...`）在 Mattermost 中是**模稜兩可**的（用戶 ID 與頻道 ID）。

OpenClaw 會**優先將其視為用戶**進行解析：

- 如果該 ID 作為用戶存在（`GET /api/v4/users/<id>` 成功），OpenClaw 會透過 `/api/v4/channels/direct` 解析直接頻道來發送**私訊 (DM)**。
- 否則，該 ID 將被視為**頻道 ID**。

如果您需要確定性的行為，請務必使用明確的前綴（`user:<id>` / `channel:<id>`）。

</Warning>

## 私訊頻道重試

當 OpenClaw 發送到 Mattermost 私訊目標並需要先解析直接頻道時，預設會重試暫時性的直接頻道建立失敗。

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

- 這僅適用於私訊頻道的建立（`/api/v4/channels/direct`），而非每次 Mattermost API 呼叫。
- 重試適用於暫時性失敗，例如速率限制、5xx 回應以及網路或逾時錯誤。
- 除了 `429` 之外的 4xx 用戶端錯誤會被視為永久性錯誤，且不會重試。

## 預覽串流

Mattermost 會將思考、工具活動和部分回覆文字串流到單一**草稿預覽貼文**中，當最終答案可以安全發送時，該貼文會就地定稿。預覽會在同一個貼文 ID 上更新，而不是向頻道發送逐塊訊息造成干擾。媒體/錯誤的最終結果會取消待處理的預覽編輯，並使用正常傳遞方式，而不是清除丟棄的預覽貼文。

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

<AccordionGroup>
  <Accordion title="串流模式">
    - `partial` 是通常的選擇：隨著回覆增長而編輯的單一預覽貼文，然後用完整答案定稿。
    - `block` 在預覽貼文內使用附加樣式的草稿區塊。
    - `progress` 在生成期間顯示狀態預覽，僅在完成時發布最終答案。
    - `off` 停用預覽串流。

  </Accordion>
  <Accordion title="串流行為註記">
    - 如果無法在原處完成串流（例如貼文在串流過程中被刪除），OpenClaw 會改為發送一則全新的最終貼文，以確保回覆永遠不會遺失。
    - 僅包含推理的內容會被隱藏，不會發布至頻道，包括以 `> Reasoning:` 區塊引言形式到達的文字。請設定 `/reasoning on` 以在其他介面查看思考過程；Mattermost 的最終貼文僅保留答案。
    - 請參閱 [串流](/zh-Hant/concepts/streaming#preview-streaming-modes) 以了解頻道對應矩陣。

  </Accordion>
</AccordionGroup>

## 反應（訊息工具）

- 搭配 `message action=react` 使用 `channel=mattermost`。
- `messageId` 是 Mattermost 的貼文 ID。
- `emoji` 接受諸如 `thumbsup` 或 `:+1:` 的名稱（冒號為選用）。
- 設定 `remove=true`（布林值）以移除反應。
- 反應新增/移除事件會作為系統事件轉發至路由的代理程式工作階段。

範例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

設定：

- `channels.mattermost.actions.reactions`：啟用/停用反應動作（預設為 true）。
- 每個帳號的覆寫設定：`channels.mattermost.accounts.<id>.actions.reactions`。

## 互動式按鈕（訊息工具）

發送包含可點擊按鈕的訊息。當使用者點擊按鈕時，代理程式會收到選擇並可以做出回應。

將 `inlineButtons` 加入頻道功能以啟用按鈕：

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

搭配 `buttons` 參數使用 `message action=send`。按鈕是一個二維陣列（按鈕的列）：

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

按鈕欄位：

<ParamField path="text" type="string" required>
  顯示標籤。
</ParamField>
<ParamField path="callback_data" type="string" required>
  點擊時回傳的值（用作動作 ID）。
</ParamField>
<ParamField path="style" type='"default" | "primary" | "danger"'>
  按鈕樣式。
</ParamField>

當使用者點擊按鈕時：

<Steps>
  <Step title="按鈕被確認訊息取代">所有按鈕會被確認行取代（例如：「✓ **Yes** 由 @user 選取」）。</Step>
  <Step title="Agent 接收選擇">Agent 會將此選擇作為 inbound 訊息接收並進行回應。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="實作筆記">
    - 按鈕回調使用 HMAC-SHA256 驗證（自動進行，無需設定）。
    - Mattermost 會從其 API 回應中移除回調資料（安全功能），因此所有按鈕在點擊後都會被移除 — 無法僅移除部分按鈕。
    - 包含連字號或底線的 Action ID 會自動被清理（Mattermost 路由限制）。

  </Accordion>
  <Accordion title="設定與連線性">
    - `channels.mattermost.capabilities`: 功能字串陣列。新增 `"inlineButtons"` 以在 Agent 系統提示詞中啟用按鈕工具描述。
    - `channels.mattermost.interactions.callbackBaseUrl`: 按鈕回調的選用外部基底 URL（例如 `https://gateway.example.com`）。當 Mattermost 無法直接透過其綁定主機連線到閘道時請使用此項。
    - 在多帳號設定中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下設定相同欄位。
    - 如果省略 `interactions.callbackBaseUrl`，OpenClaw 會從 `gateway.customBindHost` + `gateway.port` 推導回調 URL，然後回退到 `http://localhost:<port>`。
    - 連線規則：按鈕回調 URL 必須能從 Mattermost 伺服器連線。`localhost` 僅在 Mattermost 和 OpenClaw 執行於相同主機/網路命名空間時有效。
    - 如果您的回調目標是私人網路/tailnet/內部網路，請將其主機/網域新增至 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections`。

  </Accordion>
</AccordionGroup>

### 直接 API 整合（外部腳本）

外部腳本和 Webhook 可以直接透過 Mattermost REST API 發送按鈕，而不需透過 Agent 的 `message` 工具。請盡可能使用外掛程式中的 `buildButtonAttachments()`；如果發送原始 JSON，請遵循以下規則：

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
            id: "mybutton01", // alphanumeric only - see below
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

<Warning>
**關鍵規則**

1. 附件必須放在 `props.attachments` 中，而非頂層 `attachments`（會被無聲忽略）。
2. 每個操作都需要 `type: "button"` —— 沒有它，點擊將被無聲吞沒。
3. 每個操作都需要一個 `id` 欄位 —— Mattermost 會忽略沒有 ID 的操作。
4. 操作 `id` 必須**僅為字母數字**（`[a-zA-Z0-9]`）。連字元和底線會破壞 Mattermost 的伺服器端操作路由（返回 404）。使用前請將其剝離。
5. `context.action_id` 必須與按鈕的 `id` 匹配，以便確認訊息顯示按鈕名稱（例如，「批准」）而不是原始 ID。
6. `context.action_id` 是必需的 —— 互動處理程式沒有它會返回 400。

</Warning>

**HMAC 權杖生成**

閘道使用 HMAC-SHA256 驗證按鈕點擊。外部腳本必須生成符合閘道驗證邏輯的權杖：

<Steps>
  <Step title="從 Bot 權杖推導金鑰">`HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`</Step>
  <Step title="建構上下文物件">建構包含所有欄位**但除外** `_token` 的上下文物件。</Step>
  <Step title="使用排序鍵序列化">使用**排序鍵**和**無空格**進行序列化（閘道使用帶有排序鍵的 `JSON.stringify`，這會產生緊湊的輸出）。</Step>
  <Step title="對 Payload 簽署">`HMAC-SHA256(key=secret, data=serializedContext)`</Step>
  <Step title="加入權杖">將生成的十六進位摘要作為 `_token` 加入到上下文中。</Step>
</Steps>

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

<AccordionGroup>
  <Accordion title="常見 HMAC 陷阱">
    - Python 的 `json.dumps` 預設會加入空格（`{"key": "val"}`）。請使用 `separators=(",", ":")` 以符合 JavaScript 的緊湊輸出（`{"key":"val"}`）。
    - 始終對**所有** context 欄位進行簽名（`_token` 除外）。閘道會移除 `_token`，然後對剩餘的所有內容進行簽名。對子集進行簽名會導致靜默驗證失敗。
    - 使用 `sort_keys=True` —— 閘道在簽名前會對鍵進行排序，而 Mattermost 在儲存 payload 時可能會重新排序 context 欄位。
    - 從 bot token 推導出密鑰（確定性），而非隨機位元組。建立按鈕的程序與驗證的閘道之間，密鑰必須相同。

  </Accordion>
</AccordionGroup>

## 目錄配接器

Mattermost 外掛包含一個目錄配接器，可透過 Mattermost API 解析頻道和使用者名稱。這使得 `#channel-name` 和 `@username` 目標可用於 `openclaw message send` 和 cron/webhook 傳遞。

無需配置 —— 配接器使用帳戶配置中的 bot token。

## 多帳戶

Mattermost 在 `channels.mattermost.accounts` 下支援多個帳戶：

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

<AccordionGroup>
  <Accordion title="頻道中無回覆">
    請確保機器人在頻道中並提及它（oncall），使用觸發字首（onchar），或設定 `chatmode: "onmessage"`。
  </Accordion>
  <Accordion title="驗證或多帳戶錯誤">
    - 檢查 bot token、基本 URL，以及帳戶是否已啟用。
    - 多帳戶問題：環境變數僅適用於 `default` 帳戶。

  </Accordion>
  <Accordion title="原生斜線指令失敗">
    - `Unauthorized: invalid command token.`：OpenClaw 未接受回調令牌。常見原因：
      - 斜線指令註冊在啟動時失敗或僅部分完成
      - 回調指向了錯誤的閘道/帳戶
      - Mattermost 仍有舊指令指向先前的回調目標
      - 閘道重啟後未重新啟用斜線指令
    - 如果原生斜線指令停止運作，請檢查日誌中是否有 `mattermost: failed to register slash commands` 或 `mattermost: native slash commands enabled but no commands could be registered`。
    - 如果省略了 `callbackUrl` 且日誌警告回調解析為 `http://127.0.0.1:18789/...`，則該 URL 可能僅在 Mattermost 與 OpenClaw 運行於相同主機/網路命名空間時才能存取。請改設定一個明確的外部可存取 `commands.callbackUrl`。

  </Accordion>
  <Accordion title="按鈕問題">
    - 按鈕顯示為白框：Agent 可能發送了格式錯誤的按鈕資料。請檢查每個按鈕是否同時具有 `text` 和 `callback_data` 欄位。
    - 按鈕已渲染但點擊無反應：請驗證 Mattermost 伺服器設定中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，且 ServiceSettings 中的 `EnablePostActionIntegration` 為 `true`。
    - 按鈕點擊後返回 404：按鈕的 `id` 可能包含連字元或底線。Mattermost 的動作路由器會在非字母數字 ID 上中斷。請僅使用 `[a-zA-Z0-9]`。
    - Gateway 記錄 `invalid _token`：HMAC 不符。請檢查您是否簽署了所有上下文欄位（而非子集）、使用排序鍵，並使用精簡 JSON（無空格）。請參閱上方的 HMAC 部分。
    - Gateway 記錄 `missing _token in context`：按鈕上下文中缺少 `_token` 欄位。請確保在建構整合 payload 時包含它。
    - 確認訊息顯示原始 ID 而非按鈕名稱：`context.action_id` 與按鈕的 `id` 不符。請將兩者設為相同的經清理值。
    - Agent 無法識別按鈕：請將 `capabilities: ["inlineButtons"]` 新增至 Mattermost 頻道設定中。

  </Accordion>
</AccordionGroup>

## 相關

- [Channel Routing](/zh-Hant/channels/channel-routing) - 訊息的會話路由
- [Channels Overview](/zh-Hant/channels) - 所有支援的頻道
- [Groups](/zh-Hant/channels/groups) - 群組聊天行為和提及控制
- [Pairing](/zh-Hant/channels/pairing) - DM 身份驗證和配對流程
- [Security](/zh-Hant/gateway/security) - 存取模型和強化措施
