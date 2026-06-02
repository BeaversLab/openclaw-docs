---
summary: "透過 MCP 公開 OpenClaw 頻道對話並管理已儲存的 MCP 伺服器定義"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` 有兩個職責：

- 使用 `openclaw mcp serve` 將 OpenClaw 作為 MCP 伺服器執行
- 使用 `list`、`show`、`set` 和 `unset` 管理 OpenClaw 擁有的輸出 MCP 伺服器定義

換句話說：

- `serve` 是 OpenClaw 作為 MCP 伺服器
- `list` / `show` / `set` / `unset` 是 OpenClaw 作為 MCP 用戶端註冊表，用於其執行時稍後可能使用的其他 MCP 伺服器

當 OpenClaw 應該自行託管編程框架會話並透過 ACP 路由該執行環境時，請使用 [`openclaw acp`](/zh-Hant/cli/acp)。

## OpenClaw 作為 MCP 伺服器

這是 `openclaw mcp serve` 路徑。

### 何時使用 `serve`

在以下情況使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 用戶端應直接與 OpenClaw 支援的頻道對話通訊
- 您已經擁有具備路由會話的本機或遠端 OpenClaw Gateway
- 您需要一個適用於 OpenClaw 頻道後端的 MCP 伺服器，而不是執行獨立的每頻道橋接器

當 OpenClaw 應該自行託管編程執行環境並將代理程式會話保留在 OpenClaw 內部時，請改用 [`openclaw acp`](/zh-Hant/cli/acp)。

### 運作方式

`openclaw mcp serve` 啟動 stdio MCP 伺服器。MCP 用戶端擁有該程序。當用戶端保持 stdio 會話開啟時，橋接器會透過 WebSocket 連接到本地或遠端 OpenClaw Gateway，並透過 MCP 公開已路由的頻道對話。

<Steps>
  <Step title="Client spawns the bridge">MCP 用戶端生成 `openclaw mcp serve`。</Step>
  <Step title="Bridge connects to Gateway">橋接器透過 WebSocket 連接到 OpenClaw Gateway。</Step>
  <Step title="Sessions become MCP conversations">已路由的 Session 會變成 MCP 對話以及逐字稿/歷史工具。</Step>
  <Step title="Live events queue">當橋接器連線時，即時事件會在記憶體中排隊。</Step>
  <Step title="Optional Claude push">如果啟用了 Claude 頻道模式，同一個 Session 也可以接收 Claude 專用的推播通知。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="重要行為">
    - 即時佇列狀態在橋接器連線時開始
    - 較舊的逐字稿歷史記錄是使用 `messages_read` 讀取的
    - Claude 推播通知僅在 MCP 工作階段存續期間存在
    - 當客戶端斷線時，橋接器會退出且即時佇列會消失
    - 諸如 `openclaw agent` 和 `openclaw infer model run` 之類的單次代理進入點，會在回覆完成時終止其開啟的任何配套 MCP 執行時，因此重複的腳本執行不會累積 stdio MCP 子程序
    - 由 OpenClaw 啟動的 stdio MCP 伺服器（內建或使用者設定）會在關機時以程序樹的形式拆解，因此由伺服器啟動的子程序不會在父 stdio 客戶端退出後繼續存在
    - 刪除或重設工作階段會透過共用執行時清理路徑釋放該工作階段的 MCP 客戶端，因此不會有殘留的 stdio 連線繫結至已移除的工作階段

  </Accordion>
</AccordionGroup>

### 選擇用戶端模式

以兩種不同的方式使用同一個橋接器：

<Tabs>
  <Tab title="Generic MCP clients">僅限標準 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 以及核准工具。</Tab>
  <Tab title="Claude Code">標準 MCP 工具加上 Claude 專用頻道轉接器。啟用 `--claude-channel-mode on` 或保留預設值 `auto`。</Tab>
</Tabs>

<Note>今天，`auto` 的行為與 `on` 相同。目前尚未具備客戶端能力偵測功能。</Note>

### `serve` 公開了什麼

此橋接器使用現有的 Gateway 會話路由元資料，來公開以通道為基礎的對話。當 OpenClaw 已經透過已知路由（例如以下項目）建立會話狀態時，就會出現對話：

- `channel`
- 收件者或目的地元資料
- 選用的 `accountId`
- 選用的 `threadId`

這讓 MCP 客戶端可以在一個地方：

- 列出最近的路由對話
- 讀取最近的逐字稿歷史記錄
- 等待新的傳入事件
- 透過相同路由傳送回覆
- 查看橋接器連線時抵達的核准請求

### 用法

<Tabs>
  <Tab title="本機 Gateway">```bash openclaw mcp serve ```</Tab>
  <Tab title="遠端 Gateway (權杖)">```bash openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token ```</Tab>
  <Tab title="遠端 Gateway (密碼)">```bash openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password ```</Tab>
  <Tab title="詳細輸出 / 關閉 Claude">```bash openclaw mcp serve --verbose openclaw mcp serve --claude-channel-mode off ```</Tab>
</Tabs>

### 橋接器工具

目前的橋接器公開了這些 MCP 工具：

<AccordionGroup>
  <Accordion title="conversations_list">
    列出最近的會話支援對話，這些對話已在 Gateway 會話狀態中包含路由元資料。

    實用篩選器：

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    使用直接 Gateway 工作階段查詢，透過 `session_key` 傳回一個對話。
  </Accordion>
  <Accordion title="messages_read">
    讀取單一會話支援對話的最近逐字稿訊息。
  </Accordion>
  <Accordion title="attachments_fetch">
    從單一文字記錄訊息中擷取非文字訊息內容區塊。這是文字記錄內容的中繼資料檢視，而非獨立的永久附件 Blob 儲存庫。
  </Accordion>
  <Accordion title="events_poll">
    讀取自數值游標以來排入佇列的即時事件。
  </Accordion>
  <Accordion title="events_wait">
    進行長輪詢 (Long-poll)，直到下一個符合條件的佇列事件抵達或逾時為止。

    當通用 MCP 用戶端需要近乎即時的傳遞，而不使用 Claude 專用的推送協定時，請使用此功能。

  </Accordion>
  <Accordion title="messages_send">
    透過已在工作階段上記錄的相同路徑傳回文字。

    目前的行為：

    - 需要既有的對話路徑
    - 使用工作階段的頻道、收件者、帳戶 ID 和執行緒 ID
    - 僅傳送文字

  </Accordion>
  <Accordion title="permissions_list_open">
    列出橋接器自連線到 Gateway 以來所觀察到的待處理 exec/plugin 核准請求。
  </Accordion>
  <Accordion title="permissions_respond">
    解析一個待處理的 exec/plugin 核准請求，選項如下：

    - `allow-once`
    - `allow-always`
    - `deny`

  </Accordion>
</AccordionGroup>

### 事件模型

橋接器在連線時會保持記憶體中的事件佇列。

目前的事件類型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

<Warning>
- 佇列僅限即時；它在 MCP 橋接器啟動時開始
- `events_poll` 和 `events_wait` 不會自行重播較舊的 Gateway 歷史記錄
- 持久性待辦事項應使用 `messages_read` 讀取

</Warning>

### Claude 頻道通知

橋接器也可以公開 Claude 專屬的頻道通知。這是 OpenClaw 版本的 Claude Code 頻道配接器：標準 MCP 工具仍然可用，即時傳入訊息也可以作為 Claude 專屬的 MCP 通知到達。

<Tabs>
  <Tab title="off">`--claude-channel-mode off`: 僅限標準 MCP 工具。</Tab>
  <Tab title="on">`--claude-channel-mode on`: 啟用 Claude 頻道通知。</Tab>
  <Tab title="auto (default)">`--claude-channel-mode auto`: 目前的預設值；橋接器行為與 `on` 相同。</Tab>
</Tabs>

啟用 Claude 頻道模式後，伺服器會宣佈 Claude 實驗性功能並可發出：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

目前的橋接器行為：

- 傳入的 `user` 逐字稿訊息會轉發為 `notifications/claude/channel`
- 透過 MCP 收到的 Claude 權限請求會在記憶體中追蹤
- 如果連結的對話稍後發送 `yes abcde` 或 `no abcde`，橋接器會將其轉換為 `notifications/claude/channel/permission`
- 這些通知僅適用於即時工作階段；如果 MCP 用戶端斷開連線，就沒有推送目標

這是刻意針對特定用戶端設計的。通用 MCP 用戶端應依賴標準輪詢工具。

### MCP 用戶端設定

範例 stdio 用戶端設定：

```json
{
  "mcpServers": {
    "openclaw": {
      "command": "openclaw",
      "args": ["mcp", "serve", "--url", "wss://gateway-host:18789", "--token-file", "/path/to/gateway.token"]
    }
  }
}
```

對於大多數通用 MCP 用戶端，請從標準工具介面開始，並忽略 Claude 模式。僅對真正理解 Claude 專屬通知方法的用戶端開啟 Claude 模式。

### 選項

`openclaw mcp serve` 支援：

<ParamField path="--url" type="string">
  Gateway WebSocket URL。
</ParamField>
<ParamField path="--token" type="string">
  Gateway token。
</ParamField>
<ParamField path="--token-file" type="string">
  從檔案讀取 token。
</ParamField>
<ParamField path="--password" type="string">
  Gateway 密碼。
</ParamField>
<ParamField path="--password-file" type="string">
  從檔案讀取密碼。
</ParamField>
<ParamField path="--claude-channel-mode" type='"auto" | "on" | "off"'>
  Claude 通知模式。
</ParamField>
<ParamField path="-v, --verbose" type="boolean">
  在 stderr 上輸出詳細日誌。
</ParamField>

<Tip>如果可能，請優先使用 `--token-file` 或 `--password-file`，而非內嵌金鑰。</Tip>

### 安全性和信任邊界

此橋接器不會自行建立路由。它僅公開 Gateway 已知道如何路由的對話。

這意味著：

- 發送者允許清單、配對以及頻道層級的信任仍然屬於底層 OpenClaw 頻道設定
- `messages_send` 只能透過現有的已儲存路由進行回覆
- 核准狀態僅在當前的橋接階段中於記憶體內即時生效
- 橋接器驗證應使用您對任何其他遠端 Gateway 客戶端所信任的相同 Gateway token 或密碼控制機制

如果 `conversations_list` 中缺少對話，通常原因不是 MCP 設定問題，而是底層 Gateway 階段中缺少或不完整的路由元資料。

### 測試

OpenClaw 針對此橋接器提供了一個確定性的 Docker 測試：

```bash
pnpm test:docker:mcp-channels
```

該測試：

- 啟動一個已植入種子的 Gateway 容器
- 啟動第二個容器，並在其中產生 `openclaw mcp serve`
- 驗證對話探索、通訊錄讀取、附件元資料讀取、即時事件佇列行為以及外傳傳送路由
- 透過真實的 stdio MCP 橋接器驗證 Claude 風格的頻道和權限通知

這是在測試執行中無需接入真實的 Telegram、Discord 或 iMessage 帳戶即可證明橋接器運作正常的最快方法。

如需更廣泛的測試背景，請參閱 [測試](/zh-Hant/help/testing)。

### 疑難排解

<AccordionGroup>
  <Accordion title="No conversations returned">
    通常表示 Gateway 工作階段尚未可路由。請確認基礎工作階段已儲存通道/提供者、接收者，以及選用的帳戶/執行緒路由元資料。
  </Accordion>
  <Accordion title="events_poll or events_wait misses older messages">
    這是預期行為。即時佇列會在橋接器連線時啟動。請使用 `messages_read` 讀取較舊的逐字稿歷史記錄。
  </Accordion>
  <Accordion title="Claude notifications do not show up">
    請檢查以下所有項目：

    - 用戶端保持 stdio MCP 工作階段為開啟狀態
    - `--claude-channel-mode` 為 `on` 或 `auto`
    - 用戶端確實理解 Claude 特定的通知方法
    - 傳入訊息發生在橋接器連線之後

  </Accordion>
  <Accordion title="Approvals are missing">
    `permissions_list_open` 僅顯示在橋接器連線期間觀察到的核准請求。這並非持久的核准歷史記錄 API。
  </Accordion>
</AccordionGroup>

## OpenClaw 作為 MCP 用戶端註冊表

這是 `openclaw mcp list`、`show`、`status`、`probe`、`add`、`set`、
`configure`、`tools`、`login`、`reload` 和 `unset` 路徑。

這些指令不會透過 MCP 公開 OpenClaw。它們會在 OpenClaw 設定檔中的 `mcp.servers` 下管理 OpenClaw 擁有的 MCP 伺服器定義。

這些已儲存的定義適用於 OpenClaw 稍後啟動或設定的執行階段，例如嵌入式 OpenClaw 和其他執行階段轉接器。OpenClaw 會集中儲存這些定義，以便這些執行階段無需維護自己的重複 MCP 伺服器清單。

<AccordionGroup>
  <Accordion title="重要行為">
    - 這些指令僅讀取或寫入 OpenClaw 設定
    - `status`、`list`、`show`、`set`、`configure`、`tools`、`reload` 和 `unset` 不會連線到目標 MCP 伺服器
    - `probe` 會連線到選定的伺服器或所有已設定的伺服器、列出工具，並回報功能/診斷資訊
    - `add` 會在儲存前從旗標和探測建構定義，除非設定了 `--no-probe` 或需要先進行 OAuth 授權
    - 執行時介面卡會在執行時決定它們實際支援的傳輸形狀
    - `enabled: false` 會保留伺服器但將其從內嵌執行時探索中排除
    - `timeout` 和 `connectTimeout` 以秒為單位設定各伺服器的請求和連線逾時
    - `supportsParallelToolCalls: true` 標記介面卡可以並行呼叫的伺服器
    - HTTP 伺服器可以使用靜態標頭、OAuth 登入、TLS 驗證控制和 mTLS 憑證/金鑰路徑
    - 內嵌的 OpenClaw 會在一般的 `coding` 和 `messaging` 工具設定檔中公開已設定的 MCP 工具；`minimal` 仍會隱藏它們，而 `tools.deny: ["bundle-mcp"]` 則會明確停用它們
    - 各伺服器的 `toolFilter.include` 和 `toolFilter.exclude` 會在探索到的 MCP 工具變成 OpenClaw 工具之前進行篩選
    - 公告資源或提示的伺服器也會公開用於列出/讀取資源以及列出/擷取提示的公用工具；這些產生的公用名稱（`resources_list`、`resources_read`、`prompts_list`、`prompts_get`）會使用相同的包含/排除篩選器
    - 動態 MCP 工具清單的變更會使該階段的快取目錄失效；下一次探索/使用會從伺服器重新整理
    - 重複的 MCP 工具請求/通訊協定失敗會暫時該伺服器，以免一個損壞的伺服器消耗整個回合
    - 階段範圍的捆綁 MCP 執行時會在閒置 `mcp.sessionIdleTtlMs` 毫秒後（預設 10 分鐘；設定 `0` 以停用）被回收，而單次內嵌執行則會在執行結束時清理它們

  </Accordion>
</AccordionGroup>

Runtime adapters 可能會將此共享登錄檔正規化為其下游客戶端預期的形狀。例如，嵌入式 OpenClaw 直接使用 OpenClaw `transport` 值，而 Claude Code 和 Gemini 則接收 CLI 原生的 `type` 值，例如 `http`、`sse` 或 `stdio`。

Codex app-server 也會接受每個伺服器上可選的 `codex` 區塊。這是僅適用於 Codex app-server 執行緒的 OpenClaw 投影中繼資料；它不會變更 ACP 會話、通用 Codex 組態設定或其他 runtime adapters。使用非空的 `codex.agents` 將伺服器僅投影到特定的 OpenClaw 代理程式 ID。空的、空白的或無效的代理程式清單會被組態驗證拒絕，並且由 runtime 投影路徑省略，而不是變成全域設定。使用 `codex.defaultToolsApprovalMode`（`auto`、`prompt` 或 `approve`）為受信任的伺服器發出 Codex 原生的 `default_tools_approval_mode`。OpenClaw 在將原生 `mcp_servers` 組態傳遞給 Codex 之前，會移除 `codex` 中繼資料。

### 已儲存的 MCP 伺服器定義

OpenClaw 也會在設定中儲存一個輕量級的 MCP 伺服器登錄檔，供需要 OpenClaw 管理 MCP 定義的介面使用。

指令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp status`
- `openclaw mcp probe [name]`
- `openclaw mcp add <name> [flags]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp configure <name> [flags]`
- `openclaw mcp tools <name> [--include csv] [--exclude csv] [--clear]`
- `openclaw mcp login <name> [--code code]`
- `openclaw mcp reload`
- `openclaw mcp unset <name>`

備註：

- `list` 會對伺服器名稱進行排序。
- `show` 若不指定名稱，則會列印完整的已設定 MCP 伺服器物件。
- `status` 會分類已設定的傳輸，而不進行連接。
- `probe` 會連接並回報工具計數、資源/提示支援、清單變更支援以及診斷資訊。
- `add` 接受 stdio 標誌，例如 `--command`、`--arg`、`--env` 和 `--cwd`，或 HTTP 標誌，例如 `--url`、`--transport`、`--header`、`--auth oauth`、TLS、timeout 和 tool-selection 標誌。
- `set` 預期在命令列上有一個 JSON 物件值。
- `configure` 更新啟用狀態、工具篩選器、逾時、OAuth、TLS 和 parallel-tool-call 提示，而不會取代整個伺服器定義。
- `tools` 更新各伺服器的工具篩選器。包含/排除項目是 MCP 工具名稱和簡單的 `*` glob 模式。
- `login` 針對使用 `auth: "oauth"` 設定的 HTTP 伺服器執行 OAuth 流程。第一次執行會列印授權 URL；核准後請使用 `--code` 重新執行。
- `reload` 會釋放快取的進程內 MCP 執行階段。位於另一個進程中的 Gateway 或 agent 程序仍需自己的重新載入或重新啟動路徑。
- 對於可串流的 HTTP MCP 伺服器，請使用 `transport: "streamable-http"`。`openclaw mcp set` 也會將 CLI 原生的 `type: "http"` 正規化為相同的標準設定形狀，以確保相容性。
- 如果指定的伺服器不存在，`unset` 將會失敗。

範例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp status
openclaw mcp probe context7 --json
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp configure docs --timeout 20 --connect-timeout 5 --include 'search,read_*'
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp login docs
openclaw mcp unset context7
```

範例設定形狀：

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com",
        "transport": "streamable-http",
        "timeout": 20,
        "connectTimeout": 5,
        "supportsParallelToolCalls": true,
        "auth": "oauth",
        "oauth": {
          "scope": "docs.read"
        },
        "sslVerify": true,
        "clientCert": "/path/to/client.crt",
        "clientKey": "/path/to/client.key",
        "toolFilter": {
          "include": ["search_*"],
          "exclude": ["admin_*"]
        }
      }
    }
  }
}
```

### Stdio 傳輸

啟動本機子進程並透過 stdin/stdout 通訊。

| 欄位                       | 說明                    |
| -------------------------- | ----------------------- |
| `command`                  | 要產生的可執行檔 (必填) |
| `args`                     | 命令列引數陣列          |
| `env`                      | 額外的環境變數          |
| `cwd` / `workingDirectory` | 程序的工作目錄          |

<Warning>
**Stdio 環境安全過濾器**

OpenClaw 會拒絕可能改變 stdio MCP 伺服器在首次 RPC 之前啟動方式的直譯器啟動環境鍵，即使它們出現在伺服器的 `env` 區塊中。被封鎖的鍵包括 `NODE_OPTIONS`、`NODE_REDIRECT_WARNINGS`、`NODE_REPL_EXTERNAL_MODULE`、`NODE_REPL_HISTORY`、`NODE_V8_COVERAGE`、`PYTHONSTARTUP`、`PYTHONPATH`、`PERL5OPT`、`RUBYOPT`、`SHELLOPTS`、`PS4` 及類似的執行時期控制變數。啟動程序會因配置錯誤而拒絕這些鍵，以免它們注入隱含的序言、交換直譯器、啟用偵錯工具，或對 stdio 程序重新導向執行時期輸出。一般的憑證、代理伺服器和伺服器特定的環境變數（`GITHUB_TOKEN`、`HTTP_PROXY`、自訂 `*_API_KEY` 等）不受影響。

如果您的 MCP 伺服器確實需要其中一個被封鎖的變數，請將其設定在閘道主機程序上，而不是在 stdio 伺服器的 `env` 之下。

</Warning>

### SSE / HTTP 傳輸

透過 HTTP Server-Sent Events 連線到遠端 MCP 伺服器。

| 欄位                           | 描述                                               |
| ------------------------------ | -------------------------------------------------- |
| `url`                          | 遠端伺服器的 HTTP 或 HTTPS URL（必要）             |
| `headers`                      | HTTP 標頭的選用鍵值對映射（例如驗證權杖）          |
| `connectionTimeoutMs`          | 每個伺服器的連線逾時時間，以毫秒為單位（選用）     |
| `connectTimeout`               | 各伺服器的連線逾時時間，以秒為單位（選用）         |
| `timeout` / `requestTimeoutMs` | 各伺服器的 MCP 要求逾時時間，以秒或毫秒為單位      |
| `auth: "oauth"`                | 使用 MCP OAuth 權杖儲存空間和 `openclaw mcp login` |
| `sslVerify`                    | 僅針對明確信任的私人 HTTPS 端點設為 false          |
| `clientCert` / `clientKey`     | mTLS 用戶端憑證和金鑰路徑                          |
| `supportsParallelToolCalls`    | 提示此伺服器可安全進行並行呼叫                     |

範例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "auth": "oauth",
        "timeout": 20,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

`url`（使用者資訊）和 `headers` 中的敏感值會在記錄和狀態輸出中被編輯。

### 可串流 HTTP 傳輸

`streamable-http` 是除了 `sse` 和 `stdio` 之外的額外傳輸選項。它使用 HTTP 串流與遠端 MCP 伺服器進行雙向通訊。

| 欄位                           | 說明                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| `url`                          | 遠端伺服器的 HTTP 或 HTTPS URL（必填）                                     |
| `transport`                    | 設定為 `"streamable-http"` 以選擇此傳輸方式；若省略，OpenClaw 將使用 `sse` |
| `headers`                      | 選用性的 HTTP 標頭鍵值對（例如驗證 token）                                 |
| `connectionTimeoutMs`          | 每個伺服器的連線逾時時間，單位為毫秒（選用）                               |
| `connectTimeout`               | 每個伺服器的連線逾時時間，單位為秒（選用）                                 |
| `timeout` / `requestTimeoutMs` | 每個伺服器的 MCP 請求逾時時間，單位為秒或毫秒                              |
| `auth: "oauth"`                | 使用 MCP OAuth token 儲存與 `openclaw mcp login`                           |
| `sslVerify`                    | 僅針對明確信任的私人 HTTPS 端點設為 false                                  |
| `clientCert` / `clientKey`     | mTLS 用戶端憑證與金鑰路徑                                                  |
| `supportsParallelToolCalls`    | 提示此伺服器可安全進行並發呼叫                                             |

OpenClaw 設定使用 `transport: "streamable-http"` 作為標準拼寫。透過 `openclaw mcp set` 儲存時會接受 CLI 原生的 MCP `type: "http"` 值，並由現有設定中的 `openclaw doctor --fix` 修復，但 `transport` 才是內嵌 OpenClaw 直接使用的項目。

範例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectTimeout": 10,
        "timeout": 30,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

<Note>這些指令僅管理已儲存的設定。它們不會啟動通道橋接器、開啟即時 MCP 客戶端階段，或驗證目標伺服器是否可連線。</Note>

## 目前限制

本頁文件記載目前發布的橋接器功能。

目前限制：

- 對話探索依賴現有的 Gateway 階段路由元數據
- 除了 Claude 專用配接器外，沒有通用的推送協定
- 尚無訊息編輯或回應工具
- HTTP/SSE/streamable-http 傳輸連接至單一遠端伺服器；尚無多工上游
- `permissions_list_open` 僅包含在橋接連接時觀察到的審批

## 相關

- [CLI 參考](/zh-Hant/cli)
- [外掛程式](/zh-Hant/cli/plugins)
