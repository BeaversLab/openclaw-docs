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

當 OpenClaw 應自行託管程式碼 harness 會話並透過 ACP 路由該執行時時，請使用 [`openclaw acp`](/zh-Hant/cli/acp)。

## OpenClaw 作為 MCP 伺服器

這是 `openclaw mcp serve` 路徑。

### 何時使用 `serve`

在以下情況使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 用戶端應直接與 OpenClaw 支援的頻道對話通訊
- 您已經擁有具備路由會話的本機或遠端 OpenClaw Gateway
- 您需要一個適用於 OpenClaw 頻道後端的 MCP 伺服器，而不是執行獨立的每頻道橋接器

當 OpenClaw 應自行託管程式碼執行時並將代理程式會話保留在 OpenClaw 內時，請改用 [`openclaw acp`](/zh-Hant/cli/acp)。

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
  <Accordion title="Important behavior">
    - 即時佇列狀態在橋接器連線時開始 - 較舊的逐字稿歷史會透過 `messages_read` 讀取 - Claude 推播通知僅在 MCP Session 存活時存在 - 當用戶端斷線時，橋接器會退出且即時佇列會消失 - 單次代理進入點（例如 `openclaw agent` 和 `openclaw infer model run`）會在回覆完成時關閉它們開啟的任何配套 MCP 運行環境，因此重複的腳本執行不會累積 stdio MCP 子程序 - 由 OpenClaw 啟動的 stdio MCP
    伺服器（無論是內建或使用者設定）會在關機時以程序樹的形式被終結，因此由伺服器啟動的子程序不會在父級 stdio 用戶端退出後繼續存在 - 刪除或重設 Session 會透過共享運行環境清理路徑釋放該 Session 的 MCP 用戶端，因此不會有殘留的 stdio 連線繫結到已移除的 Session
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
    根據 `session_key` 傳回單一對話。
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

<Warning>- 佇列僅供即時使用；它會在 MCP 橋接器啟動時開始 - `events_poll` 和 `events_wait` 本身不會重播較舊的 Gateway 歷史記錄 - 永久待辦事項應使用 `messages_read` 讀取</Warning>

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

有關更廣泛的測試背景，請參閱 [Testing](/zh-Hant/help/testing)。

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

這是 `openclaw mcp list`、`show`、`set` 和 `unset` 路徑。

這些指令不會透過 MCP 公開 OpenClaw。它們會管理 OpenClaw 設定中 `mcp.servers` 下的 OpenClaw 擁有的 MCP 伺服器定義。

那些已儲存的定義是供 OpenClaw 稍後啟動或設定的執行階段使用，例如嵌入式 Pi 和其他執行階段轉接器。OpenClaw 會集中儲存這些定義，因此這些執行階段不需要維護自己重複的 MCP 伺服器列表。

<AccordionGroup>
  <Accordion title="重要行為">
    - 這些指令僅讀取或寫入 OpenClaw 設定 - 它們不連線到目標 MCP 伺服器 - 它們不驗證指令、URL 或遠端傳輸目前是否可到達 - 執行時期配接器在執行時決定它們實際支援的傳輸形狀 - 嵌入式 Pi 在一般 `coding` 和 `messaging` 工具設定檔中公開已設定的 MCP 工具；`minimal` 仍然會隱藏它們，而 `tools.deny: ["bundle-mcp"]` 會明確停用它們 - 會議範圍的捆綁 MCP 執行環境在閒置 `mcp.sessionIdleTtlMs`
    毫秒後會被回收（預設為 10 分鐘；設定 `0` 以停用），而一次性嵌入式執行會在執行結束時將其清理
  </Accordion>
</AccordionGroup>

執行時期配接器可能會將此共用登錄檔正規化為其下游用戶端期望的形狀。例如，嵌入式 Pi 直接使用 OpenClaw `transport` 值，而 Claude Code 和 Gemini 則接收 CLI 原生的 `type` 值，例如 `http`、`sse` 或 `stdio`。

### 已儲存的 MCP 伺服器定義

OpenClaw 也會在設定中儲存一個輕量級的 MCP 伺服器登錄檔，供想要 OpenClaw 管理 MCP 定義的介面使用。

指令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

備註：

- `list` 會對伺服器名稱進行排序。
- 未指定名稱的 `show` 會印出完整的已設定 MCP 伺服器物件。
- `set` 預期指令列上有一個 JSON 物件值。
- 對於可串流 HTTP MCP 伺服器，請使用 `transport: "streamable-http"`。`openclaw mcp set` 也會將 CLI 原生的 `type: "http"` 正規化為相同的標準設定形狀以保持相容性。
- 如果指定的伺服器不存在，`unset` 將會失敗。

範例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
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
        "transport": "streamable-http"
      }
    }
  }
}
```

### Stdio 傳輸

啟動本機子程序並透過 stdin/stdout 通訊。

| 欄位                       | 描述                     |
| -------------------------- | ------------------------ |
| `command`                  | 要產生的可執行檔（必填） |
| `args`                     | 命令列引數陣列           |
| `env`                      | 額外的環境變數           |
| `cwd` / `workingDirectory` | 程序的工作目錄           |

<Warning>
**Stdio 環境變數安全過濾器**

OpenClaw 會拒絕能夠在第一次 RPC 之前改變 stdio MCP 伺服器啟動方式的直譯器啟動環境變數鍵，即使它們出現在伺服器的 `env` 區塊中。被封鎖的鍵包括 `NODE_OPTIONS`、`PYTHONSTARTUP`、`PYTHONPATH`、`PERL5OPT`、`RUBYOPT`、`SHELLOPTS`、`PS4` 和類似的執行時控制變數。啟動時會因為配置錯誤而拒絕這些變數，以防止它們注入隱含的前導程式碼、交換直譯器，或針對 stdio 程序啟用除錯器。一般的憑證、代理和伺服器專屬的環境變數（`GITHUB_TOKEN`、`HTTP_PROXY`、自訂的 `*_API_KEY` 等）不受影響。

如果您的 MCP 伺服器確實需要其中一個被封鎖的變數，請在閘道主機程序上設定它，而不是在 stdio 伺服器的 `env` 之下。

</Warning>

### SSE / HTTP 傳輸

透過 HTTP 伺服器推送事件連接到遠端 MCP 伺服器。

| 欄位                  | 描述                                   |
| --------------------- | -------------------------------------- |
| `url`                 | 遠端伺服器的 HTTP 或 HTTPS URL（必填） |
| `headers`             | 選用的 HTTP 標頭鍵值對（例如驗證權杖） |
| `connectionTimeoutMs` | 每個伺服器的連線逾時時間（毫秒，選用） |

範例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

`url`（使用者資訊）和 `headers` 中的敏感值在日誌和狀態輸出中會被編修。

### 可串流 HTTP 傳輸

`streamable-http` 是除了 `sse` 和 `stdio` 之外的額外傳輸選項。它使用 HTTP 串流與遠端 MCP 伺服器進行雙向通訊。

| 欄位                  | 描述                                                                     |
| --------------------- | ------------------------------------------------------------------------ |
| `url`                 | 遠端伺服器的 HTTP 或 HTTPS URL（必要）                                   |
| `transport`           | 設定為 `"streamable-http"` 以選取此傳輸方式；若省略，OpenClaw 使用 `sse` |
| `headers`             | HTTP 標頭的可選鍵值對映射（例如驗證權杖）                                |
| `connectionTimeoutMs` | 每個伺服器的連線逾時時間，單位為毫秒（選填）                             |

OpenClaw 配置使用 `transport: "streamable-http"` 作為標準拼寫。透過 `openclaw mcp set` 儲存時會接受 CLI 原生的 MCP `type: "http"` 值，並由 `openclaw doctor --fix` 在既有配置中修復，但 `transport` 才是內嵌 Pi 直接使用的項目。

範例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

<Note>這些指令僅管理已儲存的配置。它們不會啟動通道橋接器、開啟即時 MCP 客戶端工作階段，或驗證目標伺服器是否可連線。</Note>

## 目前限制

本頁記錄目前發行的橋接器功能。

目前限制：

- 對話探索取決於既有的 Gateway 工作階段路由元數據
- 除了 Claude 專用的配接器外，沒有通用的推送協定
- 尚未提供訊息編輯或反應工具
- HTTP/SSE/streamable-http 傳輸方式連線至單一遠端伺服器；尚無多工上游
- `permissions_list_open` 僅包含橋接器連線時觀察到的核准

## 相關

- [CLI 參考](/zh-Hant/cli)
- [外掛程式](/zh-Hant/cli/plugins)
