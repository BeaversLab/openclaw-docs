---
summary: "Mattermost bot setup and OpenClaw config"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
sidebarTitle: "Mattermost"
---

狀態：捆綁插件（機器人權杖 + WebSocket 事件）。支援頻道、群組和私訊。Mattermost 是一個可自託管的團隊訊息平台；請參閱 [mattermost.com](https://mattermost.com) 取得產品詳細資訊和下載。

## 內建外掛程式

<Note>Mattermost 在目前的 OpenClaw 版本中作為捆綁插件發行，因此一般的打包版本不需要額外安裝。</Note>

如果您使用的是較舊的版本或排除 Mattermost 的自訂安裝，請手動安裝：

<Tabs>
  <Tab title="npm registry">```bash openclaw plugins install @openclaw/mattermost ```</Tab>
  <Tab title="Local checkout">```bash openclaw plugins install ./path/to/local/mattermost-plugin ```</Tab>
</Tabs>

詳細資訊：[外掛程式](/zh-Hant/tools/plugin)

## 快速設定

<Steps>
  <Step title="Ensure plugin is available">
    目前的打包 OpenClaw 版本已包含此插件。較舊或自訂安裝版本可以使用上述指令手動新增。
  </Step>
  <Step title="Create a Mattermost bot">
    建立一個 Mattermost 機器人帳戶並複製 **機器人權杖**。
  </Step>
  <Step title="Copy the base URL">
    複製 Mattermost **基礎 URL**（例如 `https://chat.example.com`）。
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
  <Accordion title="行為備註">
    - 對於 Mattermost，`native: "auto"` 預設為停用。設定 `native: true` 以啟用。
    - 如果省略 `callbackUrl`，OpenClaw 會根據閘道主機/連接埠 + `callbackPath` 推導出一個。
    - 對於多帳號設定，`commands` 可以設定在頂層或 `channels.mattermost.accounts.<id>.commands` 之下（帳號值會覆寫頂層欄位）。
    - 指令回呼會使用 OpenClaw 註冊 `oc_*` 指令時由 Mattermost 回傳的個別指令 Token 進行驗證。
    - 如果註冊失敗、啟動未完成，或回呼 Token 與任一已註冊指令不符，Slash 回呼會以封閉模式（fail closed）處理。
  </Accordion>
  <Accordion title="連線能力需求">
    回呼端點必須能從 Mattermost 伺服器存取。

    - 除非 Mattermost 與 OpenClaw 執行於相同的主機/網路命名空間，否則請勿將 `callbackUrl` 設定為 `localhost`。
    - 除非您的 Mattermost 基礎 URL 將 `/api/channels/mattermost/command` 反向代理至 OpenClaw，否則請勿將 `callbackUrl` 設定為該 URL。
    - 快速檢查方式為 `curl https://<gateway-host>/api/channels/mattermost/command`；GET 請求應從 OpenClaw 傳回 `405 Method Not Allowed`，而非 `404`。

  </Accordion>
  <Accordion title="Mattermost 出站允許清單">
    如果您的回呼目標是私有/tailnet/內部位址，請設定 Mattermost 的 `ServiceSettings.AllowedUntrustedInternalConnections` 以包含回呼主機/網域。

    請使用主機/網域項目，而非完整 URL。

    - 正確：`gateway.tailnet-name.ts.net`
    - 錯誤：`https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## 環境變數（預設帳號）

如果您偏好使用環境變數，請在閘道主機上設定這些變數：

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
Env vars 僅適用於 **default** 帳號 (`default`)。其他帳號必須使用 config 值。

`MATTERMOST_URL` 無法從工作區 `.env` 設定；請參閱 [Workspace `.env` files](/zh-Hant/gateway/security)。

</Note>

## 聊天模式

Mattermost 會自動回覆 DM。頻道行為由 `chatmode` 控制：

<Tabs>
  <Tab title="oncall (default)">僅在頻道中被 @提及時回覆。</Tab>
  <Tab title="onmessage">回覆每一則頻道訊息。</Tab>
  <Tab title="onchar">當訊息以觸發前綴開頭時回覆。</Tab>
</Tabs>

Config 範例：

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
- `channels.mattermost.requireMention` 對於舊版設定仍然有效，但建議使用 `chatmode`。

## 串與會話

使用 `channels.mattermost.replyToMode` 來控制頻道和群組回覆是留在主頻道還是在觸發貼文下開啟串。

- `off` (預設)：僅當入站貼文已在串中時，才在串中回覆。
- `first`：對於頂層頻道/群組貼文，在該貼文下開啟串並將對話路由至限定範圍為串的會話。
- `all`：目前對於 Mattermost，行為與 `first` 相同。
- 直接訊息會忽略此設定並保持非串形式。

Config 範例：

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

- 限定範圍為串的會話使用觸發貼文 ID 作為串根。
- `first` 和 `all` 目前是等效的，因為一旦 Mattermost 有了串根，後續的區塊和媒體會在同一個串中繼續。

## 存取控制 (DM)

- 預設：`channels.mattermost.dmPolicy = "pairing"` (未知發送者會收到配對代碼)。
- 透過以下方式核准：
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- 公開 DM：`channels.mattermost.dmPolicy="open"` 加上 `channels.mattermost.allowFrom=["*"]`。

## 頻道 (群組)

- 預設：`channels.mattermost.groupPolicy = "allowlist"`（需提及觸發）。
- 使用 `channels.mattermost.groupAllowFrom` 允許清單發送者（建議使用使用者 ID）。
- 各頻道的提及覆寫位於 `channels.mattermost.groups.<channelId>.requireMention` 下，或使用 `channels.mattermost.groups["*"].requireMention` 作為預設值。
- `@username` 匹配是可變的，且僅在啟用 `channels.mattermost.dangerouslyAllowNameMatching: true` 時生效。
- 公開頻道：`channels.mattermost.groupPolicy="open"`（需提及觸發）。
- 執行時註記：如果完全缺少 `channels.mattermost`，執行時會針對群組檢查回退到 `groupPolicy="allowlist"`（即使已設定 `channels.defaults.groupPolicy`）。

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

## 外送目標

將這些目標格式與 `openclaw message send` 或 cron/webhooks 搭配使用：

- `channel:<id>` 用於頻道
- `user:<id>` 用於 DM
- `@username` 用於 DM（透過 Mattermost API 解析）

<Warning>
在 Mattermost 中，純不透明 ID（例如 `64ifufp...`）是**有歧義的**（使用者 ID 與頻道 ID）。

OpenClaw 以**使用者優先**的方式解析它們：

- 如果該 ID 作為使用者存在（`GET /api/v4/users/<id>` 成功），OpenClaw 會透過 `/api/v4/channels/direct` 解析直接頻道來發送 **DM**。
- 否則，該 ID 將被視為**頻道 ID**。

如果您需要確定性行為，請務必使用明確的前綴（`user:<id>` / `channel:<id>`）。

</Warning>

## DM 頻道重試

當 OpenClaw 發送到 Mattermost DM 目標並且需要先解析直接頻道時，預設會重試暫時性的直接頻道建立失敗。

使用 `channels.mattermost.dmChannelRetry` 全域調整 Mattermost 外掛的此行為，或使用 `channels.mattermost.accounts.<id>.dmChannelRetry` 針對單一帳號設定。

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

註記：

- 這僅適用於 DM 頻道建立（`/api/v4/channels/direct`），而非所有 Mattermost API 呼叫。
- 重試適用於速率限制、5xx 回應以及網路或逾時錯誤等暫時性失敗。
- 除 `429` 外的 4xx 用戶端錯誤被視為永久性錯誤，不會重試。

## 預覽串流

Mattermost 會將思考、工具活動和部分回覆文字串流到單一 **草稿預覽貼文** 中，當最終答案可以安全傳送時，會就地定稿。預覽會在同一個貼文 ID 上更新，而不是用逐區塊訊息刷頻頻道。媒體/錯誤最終訊息會取消待處理的預覽編輯，並使用正常傳遞，而不是清除用完即丟的預覽貼文。

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
    - `partial` 是常見的選擇：一個預覽貼文，隨著回覆增長而編輯，然後使用完整答案定稿。
    - `block` 在預覽貼文內使用附加樣式的草稿區塊。
    - `progress` 在產生時顯示狀態預覽，僅在完成時發布最終答案。
    - `off` 停用預覽串流。
  </Accordion>
  <Accordion title="串流行為備註">
    - 如果串流無法就地定稿（例如貼文在串流中途被刪除），OpenClaw 會退回到發送新的最終貼文，以免回覆遺失。
    - 僅包含推理的 Payload 會從頻道貼文中隱藏，包括以 `> Reasoning:` 區塊引用形式到達的文字。設定 `/reasoning on` 以在其他介面檢視思考過程；Mattermost 最終貼文僅保留答案。
    - 請參閱 [串流](/zh-Hant/concepts/streaming#preview-streaming-modes) 以了解頻道對應矩陣。
  </Accordion>
</AccordionGroup>

## 回應（訊息工具）

- 將 `message action=react` 與 `channel=mattermost` 搭配使用。
- `messageId` 是 Mattermost 貼文 ID。
- `emoji` 接受像 `thumbsup` 或 `:+1:` 這樣的名稱（冒號為選用）。
- 設定 `remove=true` (布林值) 以移除回應。
- 回應新增/移除事件會作為系統事件轉發至路由的代理程式工作階段。

範例：

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

設定：

- `channels.mattermost.actions.reactions`：啟用/停用回應動作（預設為 true）。
- 每個帳戶的覆寫：`channels.mattermost.accounts.<id>.actions.reactions`。

## 互動式按鈕（訊息工具）

傳送帶有可點擊按鈕的訊息。當使用者點擊按鈕時，代理程式會收到選擇內容並可進行回應。

透過在頻道功能中新增 `inlineButtons` 來啟用按鈕：

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

<ParamField path="text" type="string" required>
  顯示標籤。
</ParamField>
<ParamField path="callback_data" type="string" required>
  點擊時傳回的值（用作動作 ID）。
</ParamField>
<ParamField path="style" type='"default" | "primary" | "danger"'>
  按鈕樣式。
</ParamField>

當使用者點擊按鈕時：

<Steps>
  <Step title="Buttons replaced with confirmation">所有按鈕會被一個確認行取代（例如，「✓ @user 已選擇 **Yes**」）。</Step>
  <Step title="Agent receives the selection">代理程式會收到該選擇作為傳入訊息並進行回應。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Implementation notes">
    - 按鈕回呼使用 HMAC-SHA256 驗證（自動進行，無需設定）。
    - Mattermost 會從其 API 回應中移除回呼資料（安全性功能），因此所有按鈕在點擊時都會被移除 — 無法部分移除。
    - 包含連字號或底線的動作 ID 會自動被清理（Mattermost 路由限制）。
  </Accordion>
  <Accordion title="Config and reachability">
    - `channels.mattermost.capabilities`: 功能字串陣列。新增 `"inlineButtons"` 以在代理系統提示中啟用按鈕工具描述。
    - `channels.mattermost.interactions.callbackBaseUrl`: 按鈕回呼的可選外部基礎網址（例如 `https://gateway.example.com`）。當 Mattermost 無法直接透過其綁定主機存取閘道時使用。
    - 在多帳戶設定中，您也可以在 `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl` 下設定相同的欄位。
    - 如果省略 `interactions.callbackBaseUrl`，OpenClaw 會從 `gateway.customBindHost` + `gateway.port` 推導回呼網址，然後回退至 `http://localhost:<port>`。
    - 連線規則：按鈕回呼網址必須可從 Mattermost 伺服器存取。`localhost` 僅在 Mattermost 和 OpenClaw 執行於相同主機/網路命名空間時有效。
    - 如果您的回呼目標是私人/tailnet/內部網路，請將其主機/網域新增至 Mattermost `ServiceSettings.AllowedUntrustedInternalConnections`。
  </Accordion>
</AccordionGroup>

### 直接 API 整合（外部腳本）

外部腳本和 Webhook 可以透過 Mattermost REST API 直接發送按鈕，而不需透過代理的 `message` 工具。盡可能使用外掛程式中的 `buildButtonAttachments()`；如果發送原始 JSON，請遵循以下規則：

**載荷結構：**

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

<Warning>
**關鍵規則**

1. 附件必須放在 `props.attachments` 中，而非頂層的 `attachments`（會被靜默忽略）。
2. 每個動作都需要 `type: "button"` — 沒有它，點擊操作會被靜默吞掉。
3. 每個動作都需要一個 `id` 欄位 — Mattermost 會忽略沒有 ID 的動作。
4. 動作的 `id` 必須 **僅包含英數字元**（`[a-zA-Z0-9]`）。連字元和底線會破壞 Mattermost 的伺服器端動作路由（返回 404）。在使用前請將其移除。
5. `context.action_id` 必須與按鈕的 `id` 相符，這樣確認訊息才會顯示按鈕名稱（例如「批准」）而不是原始 ID。
6. `context.action_id` 是必填的 — 互動處理程序若沒有它會返回 400。
   </Warning>

**HMAC 權杖生成**

閘道會使用 HMAC-SHA256 驗證按鈕點擊。外部腳本必須產生符合閘道驗證邏輯的權杖：

<Steps>
  <Step title="從機器人權杖匯出密鑰">`HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`</Step>
  <Step title="建立內容物件">建立包含所有欄位**但除外** `_token` 的內容物件。</Step>
  <Step title="使用排序鍵進行序列化">使用**排序鍵**並且**沒有空格**進行序列化（閘道使用帶有排序鍵的 `JSON.stringify`，這會產生精簡輸出）。</Step>
  <Step title="對 Payload 進行簽署">`HMAC-SHA256(key=secret, data=serializedContext)`</Step>
  <Step title="加入權杖">將結果的十六進位摘要作為 `_token` 加入到內容中。</Step>
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
    - Python 的 `json.dumps` 預設會新增空格 (`{"key": "val"}`)。請使用 `separators=(",", ":")` 來符合 JavaScript 的緊湊輸出 (`{"key":"val"}`)。
    - 始終對 **所有** 欄位進行簽名 (`_token` 除外)。閘道會移除 `_token`，然後對剩餘的所有內容進行簽名。對子集進行簽名會導致靜默驗證失敗。
    - 請使用 `sort_keys=True` —— 閘道在簽名前會對金鑰進行排序，而 Mattermost 在儲存載荷時可能會重新排序欄位。
    - 從 Bot 權杖派生密鑰 (確定性)，而不是隨機位元組。在建立按鈕的程序與進行驗證的閘道之間，密鑰必須保持一致。
  </Accordion>
</AccordionGroup>

## 目錄配接器

Mattermost 外掛包含一個目錄配接器，可透過 Mattermost API 解析頻道和使用者名稱。這能在 `openclaw message send` 和 cron/webhook 傳送中啟用 `#channel-name` 和 `@username` 目標。

無需進行配置 —— 配接器使用帳戶配置中的 Bot 權杖。

## 多重帳戶

Mattermost 支援在 `channels.mattermost.accounts` 下的多個帳戶：

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
  <Accordion title="頻道中沒有回覆">- 請確保 Bot 在頻道中並提及它 (oncall)、使用觸發前綴 (onchar)，或是設定 `chatmode: "onmessage"`。</Accordion>
  <Accordion title="驗證或多重帳戶錯誤">- 檢查 Bot 權杖、基礎 URL 以及帳戶是否已啟用。 - 多重帳戶問題：環境變數僅適用於 `default` 帳戶。</Accordion>
  <Accordion title="原生斜線指令失敗">
    - `Unauthorized: invalid command token.`：OpenClaw 未接受回調令牌。常見原因： - 啟動時斜線指令註冊失敗或僅部分完成 - 回調請求到達了錯誤的網關/帳戶 - Mattermost 仍有指向先前回調目標的舊指令 - 網關重啟後未重新啟用斜線指令 - 如果原生斜線指令停止工作，請檢查日誌中是否有 `mattermost: failed to register slash commands` 或 `mattermost: native slash commands enabled but no commands could be
    registered`。 - 如果省略了 `callbackUrl` 且日誌警告回調解析為 `http://127.0.0.1:18789/...`，則該 URL 可能僅在 Mattermost 與 OpenClaw 位於相同主機/網路命名空間時才可存取。請改設定明確的外部可存取 `commands.callbackUrl`。
  </Accordion>
  <Accordion title="按鈕問題">
    - 按鈕顯示為白框：agent 可能發送了格式錯誤的按鈕資料。請檢查每個按鈕是否同時具有 `text` 和 `callback_data` 欄位。 - 按鈕已顯示但點擊無反應：請驗證 Mattermost 伺服器設定中的 `AllowedUntrustedInternalConnections` 包含 `127.0.0.1 localhost`，並且 ServiceSettings 中的 `EnablePostActionIntegration` 為 `true`。 - 按鈕點擊返回 404：按鈕的 `id` 可能包含連字元或底線。Mattermost
    的動作路由器在遇到非字母數字 ID 時會中斷。請僅使用 `[a-zA-Z0-9]`。 - Gateway 記錄 `invalid _token`：HMAC 不匹配。請檢查您是否對所有上下文欄位（而非子集）進行了簽名、使用了排序後的鍵，並使用了緊湊的 JSON（無空格）。請參閱上方的 HMAC 章節。 - Gateway 記錄 `missing _token in context`：`_token` 欄位未包含在按鈕的上下文中。請確保在建立整合負載時將其包含在內。 - 確認顯示原始 ID
    而非按鈕名稱：`context.action_id` 與按鈕的 `id` 不匹配。請將兩者設定為相同的經清理後的值。 - Agent 不知道有按鈕功能：將 `capabilities: ["inlineButtons"]` 加入 Mattermost 頻道設定中。
  </Accordion>
</AccordionGroup>

## 相關

- [頻道路由](/zh-Hant/channels/channel-routing) — 訊息的會話路由
- [頻道概覽](/zh-Hant/channels) — 所有支援的頻道
- [群組](/zh-Hant/channels/groups) — 群組聊天行為與提及閘道
- [配對](/zh-Hant/channels/pairing) — DM 認證與配對流程
- [安全性](/zh-Hant/gateway/security) — 存取模型與強化防護
