---
summary: "透過 MCP 公開 OpenClaw 頻道對話並管理已儲存的 MCP 伺服器定義"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "MCP"
sidebarTitle: "MCP"
---

`openclaw mcp` 有兩項職責：

- 使用 `openclaw mcp serve` 將 OpenClaw 作為 MCP 伺服器執行
- 使用 `list`、`show`、`status`、`doctor`、`probe`、`add`、`set`、`configure`、`tools`、`login`、`logout`、`reload` 和 `unset` 管理由 OpenClaw 擁有的輸出 MCP 伺服器定義

換句話說：

- `serve` 是 OpenClaw 作為 MCP 伺服器的模式
- 其他子命令則是 OpenClaw 作為 MCP 伺服器的用戶端註冊表，供其執行時稍後消費

當 OpenClaw 應自行託管編程工具會話並透過 ACP 路由該執行時時，請使用 [`openclaw acp`](/zh-Hant/cli/acp)

## 選擇正確的 MCP 路徑

OpenClaw 具有多種 MCP 介面。請選擇符合誰擁有代理程式執行時以及誰擁有工具的那一個。

| 目標                                                | 使用                                                                      | 原因                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 讓外部 MCP 用戶端讀取/傳送 OpenClaw 頻道對話        | `openclaw mcp serve`                                                      | OpenClaw 是 MCP 伺服器，並透過 stdio 公開以 Gateway 為後盾的對話。                        |
| 為 OpenClaw 管理的代理程式執行儲存第三方 MCP 伺服器 | `openclaw mcp add`、`set`、`configure`、`tools`、`login`                  | OpenClaw 是 MCP 用戶端註冊表，稍後會將這些伺服器投射至符合條件的執行時。                  |
| 檢查已儲存的伺服器而不執行代理程式回合              | `openclaw mcp status`、`doctor`、`probe`                                  | `status` 和 `doctor` 檢查配置；`probe` 開啟即時 MCP 連線並列出功能。                      |
| 從瀏覽器編輯 MCP 配置                               | 控制 UI `/mcp`                                                            | 該頁面顯示清單、啟用狀態、OAuth/過濾器摘要、命令提示，以及一個具有作用域的 `mcp` 編輯器。 |
| 為 Codex app-server 提供具有作用域的原生 MCP 伺服器 | `mcp.servers.<name>.codex`                                                | `codex` 區塊僅影響 Codex app-server 執行緒投影，並會在原生配置移交前被移除。              |
| 執行 ACP 託管的 harness 會話                        | [`openclaw acp`](/zh-Hant/cli/acp) 和 [ACP Agents](/zh-Hant/tools/acp-agents-setup) | ACP 橋接模式不接受每個會話的 MCP 伺服器注入；請改為配置閘道/外掛程式橋接。                |

<Tip>如果您不確定需要哪種途徑，請從 `openclaw mcp status --verbose` 開始。它會顯示 OpenClaw 已儲存的內容，而不會啟動任何 MCP 伺服器。</Tip>

## OpenClaw 作為 MCP 伺服器

這是 `openclaw mcp serve` 途徑。

### 何時使用 `serve`

當符合以下情況時使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 用戶端應直接與由 OpenClaw 支援的頻道對話進行通訊
- 您已經擁有具備路由會話的本機或遠端 OpenClaw Gateway
- 您希望使用一個適用於 OpenClaw 頻道後端的 MCP 伺服器，而不是為每個頻道執行個別的橋接

當 OpenClaw 應自行託管編碼執行時並將代理程式會話保留在 OpenClaw 內部時，請改用 [`openclaw acp`](/zh-Hant/cli/acp)。

### 運作方式

`openclaw mcp serve` 啟動一個 stdio MCP 伺服器。MCP 用戶端擁有該程序。當用戶端保持 stdio 會話開啟時，橋接器會透過 WebSocket 連線到本機或遠端 OpenClaw Gateway，並透過 MCP 公開路由頻道對話。

<Steps>
  <Step title="Client spawns the bridge">MCP 用戶端生成 `openclaw mcp serve`。</Step>
  <Step title="橋接器連接到 Gateway">橋接器透過 WebSocket 連接到 OpenClaw Gateway。</Step>
  <Step title="會話變為 MCP 對話">路由會話變為 MCP 對話以及文字記錄/歷史工具。</Step>
  <Step title="即時事件佇列">當橋接器連接時，即時事件會在記憶體中進行佇列。</Step>
  <Step title="選用的 Claude 推播">如果啟用 Claude 頻道模式，同一個會話也可以接收 Claude 專屬的推播通知。</Step>
</Steps>

<AccordionGroup>
  <Accordion title="重要行為">
    - 即時佇列狀態在橋接器連接時啟動
    - 舊的文字記錄歷史是使用 `messages_read` 讀取
    - Claude 推播通知僅在 MCP 會話存活時存在
    - 當用戶端斷線時，橋接器會退出且即時佇列會消失
    - 諸如 `openclaw agent` 和 `openclaw infer model run` 之類的一次性代理進入點，在回覆完成後會結束其開啟的所有配套 MCP 執行時，因此重複的腳本執行不會累積 stdio MCP 子程序
    - 由 OpenClaw 啟動的 stdio MCP 伺服器（內建或使用者設定）會在關機時以程序樹形式拆除，因此由伺服器啟動的子程序不會在父 stdio 用戶端退出後繼續存在
    - 刪除或重設會話會透過共享執行時清理路徑釋放該會話的 MCP 用戶端，因此不會有遺留的 stdio 連結繫結到已移除的會話

  </Accordion>
</AccordionGroup>

### 選擇用戶端模式

以兩種不同的方式使用同一個橋接器：

<Tabs>
  <Tab title="通用 MCP 用戶端">僅限標準 MCP 工具。使用 `conversations_list`、`messages_read`、`events_poll`、`events_wait`、`messages_send` 和審核工具。</Tab>
  <Tab title="Claude Code">標準 MCP 工具加上 Claude 專屬的通道適配器。啟用 `--claude-channel-mode on` 或保留預設值 `auto`。</Tab>
</Tabs>

<Note>目前，`auto` 的行為與 `on` 相同。尚未具備客戶端功能偵測。</Note>

### `serve` 提供了什麼

此橋接器使用現有的 Gateway 會話路由元資料來公開通道支援的對話。當 OpenClaw 針對已知路由（例如：）已具有會話狀態時，對話即會顯示：

- `channel`
- 收件者或目標地元資料
- 選用 `accountId`
- 選用 `threadId`

這讓 MCP 客戶端有一個統一的地方可以：

- 列出最近已路由的對話
- 讀取最近的逐字稿歷史記錄
- 等待新的傳入事件
- 透過相同路由傳回回覆
- 查看橋接器連線時送達的審核請求

### 使用方式

<Tabs>
  <Tab title="Local Gateway">```bash openclaw mcp serve ```</Tab>
  <Tab title="Remote Gateway (token)">```bash openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token ```</Tab>
  <Tab title="Remote Gateway (password)">```bash openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password ```</Tab>
  <Tab title="Verbose / Claude off">```bash openclaw mcp serve --verbose openclaw mcp serve --claude-channel-mode off ```</Tab>
</Tabs>

### 橋接工具

目前的橋接器公開了以下 MCP 工具：

<AccordionGroup>
  <Accordion title="conversations_list">
    列出 Gateway 會話狀態中已具有路由元資料的近期會話支援對話。

    實用篩選器：

    - `limit`
    - `search`
    - `channel`
    - `includeDerivedTitles`
    - `includeLastMessage`

  </Accordion>
  <Accordion title="conversation_get">
    使用直接的 Gateway 會話查詢，透過 `session_key` 傳回單一對話。
  </Accordion>
  <Accordion title="messages_read">
    讀取一個以會話為基礎的對話之最近逐字稿訊息。
  </Accordion>
  <Accordion title="attachments_fetch">
    從一個逐字稿訊息中提取非文字訊息內容區塊。這是逐字稿內容的中繼資料檢視，而非獨立的永久附件 Blob 儲存庫。
  </Accordion>
  <Accordion title="events_poll">
    讀取自數值游標以來的佇列即時事件。
  </Accordion>
  <Accordion title="events_wait">
    長輪詢直到下一個符合的佇列事件到達或逾時到期。

    當通用 MCP 用戶端需要近乎即時的傳遞而不使用 Claude 特定的推送協定時，請使用此功能。

  </Accordion>
  <Accordion title="messages_send">
    透過會話上已記錄的相同路由傳回文字。

    目前行為：

    - 需要現有的對話路由
    - 使用會話的頻道、收件者、帳戶 ID 和執行緒 ID
    - 僅傳送文字

  </Accordion>
  <Accordion title="permissions_list_open">
    列出橋接器自連線到 Gateway 以來所觀察到的待處理 exec/plugin 核准請求。
  </Accordion>
  <Accordion title="permissions_respond">
    透過以下方式解決一個待處理的 exec/plugin 核准請求：

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
- `events_poll` 和 `events_wait` 本身不會重播舊的 Gateway 歷史記錄
- 應使用 `messages_read` 讀取永久積壓

</Warning>

### Claude 頻道通知

橋接器也可以公開特定於 Claude 的頻道通知。這相當於 OpenClaw 版本的 Claude Code 頻道轉接器：標準 MCP 工具仍然可用，即時傳入訊息也可以作為特定於 Claude 的 MCP 通知到達。

<Tabs>
  <Tab title="off">`--claude-channel-mode off`：僅標準 MCP 工具。</Tab>
  <Tab title="on">`--claude-channel-mode on`：啟用 Claude 頻道通知。</Tab>
  <Tab title="auto (default)">`--claude-channel-mode auto`：目前預設值；橋接器行為同 `on`。</Tab>
</Tabs>

啟用 Claude 頻道模式後，伺服器會宣佈支援 Claude 實驗性功能並可發出：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

目前的橋接器行為：

- 傳入的 `user` 逐字稿訊息會轉發為 `notifications/claude/channel`
- 透過 MCP 接收的 Claude 權限請求會在記憶體中追蹤
- 如果連結的對話後續發送 `yes abcde` 或 `no abcde`，橋接器會將其轉換為 `notifications/claude/channel/permission`
- 這些通知僅限即時工作階段；如果 MCP 用戶端斷線，就沒有推送目標

這是有意針對特定用戶端的設計。通用 MCP 用戶端應依賴標準輪詢工具。

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

對於大多數通用 MCP 用戶端，請從標準工具介面開始並忽略 Claude 模式。僅對真正了解特定於 Claude 之通知方法的用戶端開啟 Claude 模式。

### 選項

`openclaw mcp serve` 支援：

<ParamField path="--url" type="string">
  Gateway WebSocket URL。
</ParamField>
<ParamField path="--token" type="string">
  Gateway 權杖。
</ParamField>
<ParamField path="--token-file" type="string">
  從檔案讀取權杖。
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

<Tip>盡可能使用 `--token-file` 或 `--password-file` 而非內聯密鑰。</Tip>

### 安全性與信任邊界

橋接器不會自行建立路由。它僅公開 Gateway 已知如何路由的對話。

這意味著：

- 傳送者允許清單、配對和通道層級的信任仍屬於底層 OpenClaw 通道配置
- `messages_send` 只能透過現有的已儲存路由進行回覆
- 批准狀態僅對當前橋接會話是即時/記憶體中的
- 橋接器驗證應使用與您信任給任何其他遠端 Gateway 用戶端相同的 Gateway 權杖或密碼控制

如果 `conversations_list` 中缺少對話，通常原因不是 MCP 配置。而是底層 Gateway 會話中缺少或不完整的路由中繼資料。

### 測試

OpenClaw 隨附了一個確定性的 Docker 橋接器冒煙測試：

```bash
pnpm test:docker:mcp-channels
```

該冒煙測試會：

- 啟動一個已植入種子的 Gateway 容器
- 啟動第二個生成 `openclaw mcp serve` 的容器
- 驗證對話發現、逐字稿讀取、附件中繼資料讀取、即時事件佇列行為以及傳出傳送路由
- 透過真實的 stdio MCP 橋接器驗證 Claude 風格的通道和權限通知

這是在測試執行中不連接真實的 Telegram、Discord 或 iMessage 帳戶來證明橋接器運作的最快方式。

有關更廣泛的測試背景，請參閱[測試](/zh-Hant/help/testing)。

### 故障排除

<AccordionGroup>
  <Accordion title="No conversations returned">
    通常表示 Gateway 工作階段尚未可路由。請確認基礎工作階段已儲存頻道/提供者、收件者以及選用的帳戶/執行緒路由中繼資料。
  </Accordion>
  <Accordion title="events_poll or events_wait misses older messages">
    這是預期行為。即時佇列會在橋接器連線時啟動。請使用 `messages_read` 讀取較舊的逐字稿歷史記錄。
  </Accordion>
  <Accordion title="Claude notifications do not show up">
    請檢查以下所有項目：

    - 用戶端保持 stdio MCP 工作階段開啟
    - `--claude-channel-mode` 為 `on` 或 `auto`
    - 用戶端確實理解 Claude 特定的通知方法
    - 傳入訊息發生在橋接器連線之後

  </Accordion>
  <Accordion title="Approvals are missing">
    `permissions_list_open` 僅顯示在橋接器連線時所觀察到的核准請求。這並非一個持久的核准歷史記錄 API。
  </Accordion>
</AccordionGroup>

## OpenClaw 作為 MCP 用戶端註冊表

這是 `openclaw mcp list`、`show`、`status`、`doctor`、`probe`、`add`、`set`、
`configure`、`tools`、`login`、`logout`、`reload` 和 `unset` 路徑。

這些指令並不會透過 MCP 公開 OpenClaw。它們會管理 OpenClaw 設定中 `mcp.servers` 下的 OpenClaw 擁有 MCP 伺服器定義。

這些儲存的定義是供 OpenClaw 稍後啟動或設定的執行時期使用，例如嵌入式 OpenClaw 和其他執行時期適配器。OpenClaw 會集中儲存這些定義，因此這些執行時期不需要保留自己重複的 MCP 伺服器清單。

<AccordionGroup>
  <Accordion title="重要行為">
    - 這些指令僅讀取或寫入 OpenClaw 設定
    - 不含 `--probe`、`set`、`configure`、`tools`、`logout`、`reload` 和 `unset` 的 `status`、`list`、`show`、`doctor` 不會連線到目標 MCP 伺服器
    - `login` 針對設定的 HTTP 伺服器執行 MCP OAuth 網路流程，並儲存產生的本機憑證
    - `status --verbose` 在不連線的情況下列印已解析的傳輸、驗證、逾時、篩選和平行工具呼叫提示
    - `doctor` 檢查已儲存的定義是否有本機設定問題，例如遺失 stdio 指令、無效的工作目錄、遺失 TLS 檔案、已停用的伺服器、字面敏感的標頭/環境變數值，以及不完整的 OAuth 授權
    - `doctor --probe` 在靜態檢查通過後，加入與 `probe` 相同的即時連線驗證
    - `probe` 連線到選定的伺服器或所有已設定的伺服器，列出工具，並回報功能/診斷資訊
    - `add` 會在儲存前從旗標和探測建構定義，除非設定了 `--no-probe` 或需要先進行 OAuth 授權
    - 執行時段介接卡會在執行時決定它們實際支援的傳輸形狀
    - `enabled: false` 會保留伺服器，但將其從內嵌執行時段探索中排除
    - `timeout` 和 `connectTimeout` 以秒為單位設定各伺服器的請求和連線逾時
    - `supportsParallelToolCalls: true` 標記介接卡可以同時呼叫的伺服器
    - HTTP 伺服器可以使用靜態標頭、OAuth 登入、TLS 驗證控制，以及 mTLS 憑證/金鑰路徑
    - 內嵌式 OpenClaw 會在正常的 `coding` 和 `messaging` 工具設定檔中公開設定的 MCP 工具；`minimal` 仍會隱藏它們，而 `tools.deny: ["bundle-mcp"]` 則會明確停用它們
    - 各伺服器的 `toolFilter.include` 和 `toolFilter.exclude` 會在發現的 MCP 工具變成 OpenClaw 工具之前進行篩選
    - 公告資源或提示的伺服器也會公開用於列出/讀取資源和列出/擷取提示的公用程式工具；這些產生的公用程式名稱 (`resources_list`、`resources_read`、`prompts_list`、`prompts_get`) 會使用相同的包含/排除篩選器
    - 動態 MCP 工具清單變更會使該工作階段的快取目錄失效；下一次探索/使用會從伺服器重新整理
    - 重複的 MCP 工具請求/通訊協定失敗會短暫暫停該伺服器，以免一個損壞的伺服器佔用整個輪次
    - 工作階段範圍的捆綁 MCP 執行時段會在閒置 `mcp.sessionIdleTtlMs` 毫秒後回收 (預設為 10 分鐘；設定 `0` 以停用)，而一次性內嵌執行會在執行結束時將其清理

  </Accordion>
</AccordionGroup>

執行時適配器可能會將此共享註冊表正規化為其下游客戶端期望的形狀。例如，嵌入式 OpenClaw 直接消耗 OpenClaw `transport` 值，而 Claude Code 和 Gemini 則接收 CLI 原生 `type` 值，例如 `http`、`sse` 或 `stdio`。

Codex app-server 也會遵守每個伺服器上可選的 `codex` 區塊。這僅適用於 Codex app-server 執行緒的 OpenClaw 投影元資料；它不會變更 ACP 會話、通用 Codex 線具配置或其他執行時適配器。使用非空的 `codex.agents` 將伺服器僅投影到特定的 OpenClaw 代理 ID。空、空白或無效的代理程式列表將被配置驗證拒絕，並由執行時投影路徑省略，而不是變成全域。使用 `codex.defaultToolsApprovalMode` (`auto`、`prompt` 或 `approve`) 來為受信任的伺服器發出 Codex 的原生 `default_tools_approval_mode`。OpenClaw 會在將原生 `mcp_servers` 配置交給 Codex 之前移除 `codex` 元資料。

### 已儲存的 MCP 伺服器定義

OpenClaw 也會在配置中儲存一個輕量級的 MCP 伺服器註冊表，供需要 OpenClaw 管理的 MCP 定義的介面使用。

指令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp status [--verbose]`
- `openclaw mcp doctor [name] [--probe]`
- `openclaw mcp probe [name]`
- `openclaw mcp add <name> [flags]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp configure <name> [flags]`
- `openclaw mcp tools <name> [--include csv] [--exclude csv] [--clear]`
- `openclaw mcp login <name> [--code code]`
- `openclaw mcp logout <name>`
- `openclaw mcp reload`
- `openclaw mcp unset <name>`

備註：

- `list` 會對伺服器名稱進行排序。
- 不帶名稱的 `show` 會列印完整的已配置 MCP 伺服器物件。
- `status` 會對已配置的傳輸進行分類而不進行連線。`--verbose` 包含已解析的啟動、逾時、OAuth、篩選和平行呼叫詳細資訊。
- `doctor` 會執行靜態檢查而不進行連線。當指令還應該驗證已啟用的伺服器能否連線時，請新增 `--probe`。
- `probe` 會進行連線並回報工具計數、資源/提示支援、清單變更支援以及診斷資訊。
- `add` 接受 stdio 旗標，例如 `--command`、`--arg`、`--env` 和 `--cwd`，或 HTTP 旗標，例如 `--url`、`--transport`、`--header`、`--auth oauth`、TLS、逾時和工具選擇旗標。
- `set` 預期指令行上有一個 JSON 物件值。
- `configure` 會更新啟用狀態、工具篩選器、逾時、OAuth、TLS 和平行工具呼叫提示，而不會取代整個伺服器定義。
- `tools` 會更新各伺服器的工具篩選器。包含/排除項目是 MCP 工具名稱和簡單的 `*` 全域模式。
- `login` 會執行透過 `auth: "oauth"` 設定的 HTTP 伺服器之 OAuth 流程。第一次執行會列印授權 URL；核准後請使用 `--code` 重新執行。
- `logout` 會清除指定伺服器的已儲存 OAuth 憑證，而不會移除已儲存的伺服器定義。
- `reload` 會釋放已快取的處理程序內 MCP 執行環境。位於另一個處理程序中的 Gateway 或代理程序仍需其自己的重新載入或重新啟動路徑。
- 請將 `transport: "streamable-http"` 用於可串流的 HTTP MCP 伺服器。`openclaw mcp set` 也會將 CLI 原生的 `type: "http"` 正規化為相同的標準設定形狀以確保相容性。
- 如果指定的伺服器不存在，`unset` 將會失敗。

範例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp status --verbose
openclaw mcp doctor --probe
openclaw mcp probe context7 --json
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp configure docs --timeout 20 --connect-timeout 5 --include 'search,read_*'
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp login docs
openclaw mcp logout docs
openclaw mcp unset context7
```

### 常見伺服器配方

這些範例僅儲存伺服器定義。之後請執行 `openclaw mcp doctor --probe` 以確認伺服器啟動並公開工具。

<Tabs>
  <Tab title="檔案系統">
    ```bash
    openclaw mcp add files \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-filesystem \
      --arg "$HOME/Documents" \
      --include 'read_file,list_directory,search_files'
    openclaw mcp doctor files --probe
    ```

    將檔案系統伺服器的範圍限制在代理程式應該讀取或編輯的最小目錄樹中。

  </Tab>
  <Tab title="記憶體">
    ```bash
    openclaw mcp add memory \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-memory
    openclaw mcp probe memory --json
    ```

    如果伺服器公開了不應提供給一般代理程式的寫入工具，請使用工具過濾器。

  </Tab>
  <Tab title="本機腳本">
    ```bash
    openclaw mcp add local-tools \
      --command node \
      --arg ./dist/mcp-server.js \
      --cwd /srv/openclaw-tools \
      --env API_BASE=https://internal.example
    openclaw mcp status --verbose
    ```

    `doctor` 會檢查 `cwd` 是否存在，以及該指令是否能從設定的環境中解析。

  </Tab>
  <Tab title="遠端 HTTP">
    ```bash
    openclaw mcp add docs \
      --url https://mcp.example.com/mcp \
      --transport streamable-http \
      --auth oauth \
      --oauth-scope docs.read \
      --timeout 20 \
      --connect-timeout 5 \
      --include 'search,read_*'
    openclaw mcp doctor docs --probe
    ```

    當遠端伺服器支援時，請使用 OAuth。如果伺服器需要靜態標頭，請避免提交明碼的 bearer 權杖。

  </Tab>
  <Tab title="桌面/CUA">
    ```bash
    openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
    openclaw mcp tools cua-driver --include 'list_apps,observe,click,type'
    openclaw mcp doctor cua-driver --probe
    ```

    直接桌面控制伺服器會繼承其啟動程序權限。請使用狹窄的工具過濾器和作業系統層級的權限提示。

  </Tab>
</Tabs>

### JSON 輸出格式

針對腳本和儀表板使用 `--json`。欄位集會隨時間增長，因此消費者應忽略未知的金鑰。

<AccordionGroup>
  <Accordion title="status --">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "configured": true,
          "enabled": true,
          "ok": true,
          "transport": "streamable-http",
          "launch": "streamable-http https://mcp.example.com/mcp",
          "auth": "oauth",
          "authStatus": {
            "hasTokens": true,
            "hasClientInformation": true,
            "hasCodeVerifier": false,
            "hasDiscoveryState": true,
            "hasLastAuthorizationUrl": false
          },
          "requestTimeoutMs": 20000,
          "connectionTimeoutMs": 5000,
          "toolFilter": {
            "include": ["search", "read_*"],
            "exclude": []
          },
          "supportsParallelToolCalls": true
        }
      ]
    }
    ```
  </Accordion>
  <Accordion title="doctor --">
    ```json
    {
      "ok": false,
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "ok": false,
          "issues": [
            {
              "level": "error",
              "message": "OAuth credentials are not authorized; run openclaw mcp login docs"
            }
          ]
        }
      ]
    }
    ```

    當任何已啟用的已檢查伺服器發生錯誤時，`doctor --json` 會以非零值結束。會回報警告，但單獨不會導致指令失敗。

  </Accordion>
  <Accordion title="probe --">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "generatedAt": "2026-05-31T09:00:00.000Z",
      "servers": {
        "docs": {
          "launch": "streamable-http https://mcp.example.com/mcp",
          "tools": 2,
          "resources": true,
          "prompts": false,
          "listChanged": {
            "tools": true,
            "resources": false,
            "prompts": false
          }
        }
      },
      "tools": ["docs__read_page", "docs__search"],
      "diagnostics": []
    }
    ```

    `probe` 會開啟即時 MCP 用戶端工作階段。請使用它來進行連線性和功能驗證，而不是用於靜態設定稽核。

  </Accordion>
</AccordionGroup>

範例設定格式：

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

啟動本機子進程並透過 stdin/stdout 進行通訊。

| 欄位                       | 說明                     |
| -------------------------- | ------------------------ |
| `command`                  | 要產生的可執行檔（必要） |
| `args`                     | 命令列引數陣列           |
| `env`                      | 額外的環境變數           |
| `cwd` / `workingDirectory` | 程序的「工作目錄」       |

<Warning>
**Stdio env 安全性過濾器**

即使它們出現在伺服器的 `env` 區塊中，OpenClaw 也會拒絕可能改變 stdio MCP 伺服器在第一次 RPC 之前啟動方式的直譯器啟動 env 鍵。被封鎖的鍵包括 `NODE_OPTIONS`、`NODE_REDIRECT_WARNINGS`、`NODE_REPL_EXTERNAL_MODULE`、`NODE_REPL_HISTORY`、`NODE_V8_COVERAGE`、`PYTHONSTARTUP`、`PYTHONPATH`、`PERL5OPT`、`RUBYOPT`、`SHELLOPTS`、`PS4` 和類似的執行時期控制變數。啟動時會因配置錯誤而拒絕這些鍵，以免它們針對 stdio 程序隱含地插入前導程式碼、交換直譯器、啟用偵錯工具或重新導向執行時期輸出。一般的憑證、Proxy 和伺服器特定 env 變數（`GITHUB_TOKEN`、`HTTP_PROXY`、自訂 `*_API_KEY` 等）不受影響。

如果您的 MCP 伺服器確實需要其中一個被封鎖的變數，請在閘道主程序上設定它，而不是在 stdio 伺服器的 `env` 之下。

</Warning>

### SSE / HTTP 傳輸

透過 HTTP Server-Sent Events 連接到遠端 MCP 伺服器。

| 欄位                           | 說明                                            |
| ------------------------------ | ----------------------------------------------- |
| `url`                          | 遠端伺服器的 HTTP 或 HTTPS URL（必要）          |
| `headers`                      | HTTP 標頭的選用鍵值對應對應（例如 auth tokens） |
| `connectionTimeoutMs`          | 每個伺服器的連線逾時（以毫秒為單位）（選用）    |
| `connectTimeout`               | 每個伺服器的連線逾時（以秒為單位）（選用）      |
| `timeout` / `requestTimeoutMs` | 每個伺服器的 MCP 請求逾時（以秒或毫秒為單位）   |
| `auth: "oauth"`                | 使用 MCP OAuth 權杖儲存和 `openclaw mcp login`  |
| `sslVerify`                    | 僅針對明確信任的私人 HTTPS 端點將其設為 false   |
| `clientCert` / `clientKey`     | mTLS 客戶端憑證和金鑰路徑                       |
| `supportsParallelToolCalls`    | 提示此伺服器支援並發呼叫                        |

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

`url` (userinfo) 和 `headers` 中的敏感值會在日誌和狀態輸出中被編輯。當外觀敏感的 `headers` 或 `env` 條目包含字面值時，`openclaw mcp doctor` 會發出警告，以便操作員將這些值移出已提交的配置。

### OAuth 工作流程

OAuth 適用於宣佈支援 MCP OAuth 流程的 HTTP MCP 伺服器。當為伺服器啟用 `auth: "oauth"` 時，靜態 `Authorization` 標頭會被忽略。

<Steps>
  <Step title="儲存伺服器">
    使用 `auth: "oauth"` 和任何可選的 OAuth 元數據新增或更新伺服器。

    ```bash
    openclaw mcp set docs '{"url":"https://mcp.example.com/mcp","transport":"streamable-http","auth":"oauth","oauth":{"scope":"docs.read"}}'
    ```

  </Step>
  <Step title="開始登入">
    執行登入以建立授權請求。

    ```bash
    openclaw mcp login docs
    ```

    OpenClaw 會列印授權 URL，並將臨時 OAuth 驗證器狀態儲存在 OpenClaw 狀態目錄下。

  </Step>
  <Step title="使用代碼完成">
    在瀏覽器中批准後，將返回的代碼傳回給 OpenClaw。

    ```bash
    openclaw mcp login docs --code abc123
    ```

  </Step>
  <Step title="檢查授權">
    使用 status 或 doctor 確認權杖是否存在。

    ```bash
    openclaw mcp status --verbose
    openclaw mcp doctor docs --probe
    ```

  </Step>
  <Step title="清除憑證">
    登出會移除已儲存的 OAuth 憑證，但會保留已儲存的伺服器定義。

    ```bash
    openclaw mcp logout docs
    ```

  </Step>
</Steps>

如果提供者輪換 Token 或授權狀態卡住，請執行 `openclaw mcp logout <name>`，然後重複 `login`。即使已從設定中移除 `auth: "oauth"`，只要伺服器名稱和 URL 仍然能識別憑證儲存項目，`logout` 仍可清除已儲存 HTTP 伺服器的憑證。

### 可串流 HTTP 傳輸

`streamable-http` 是 `sse` 和 `stdio` 之外的額外傳輸選項。它使用 HTTP 串流與遠端 MCP 伺服器進行雙向通訊。

| 欄位                           | 說明                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| `url`                          | 遠端伺服器的 HTTP 或 HTTPS URL（必填）                                   |
| `transport`                    | 設為 `"streamable-http"` 以選擇此傳輸方式；若省略，OpenClaw 會使用 `sse` |
| `headers`                      | HTTP 標頭的選用鍵值對（例如 auth tokens）                                |
| `connectionTimeoutMs`          | 每個伺服器的連線逾時時間（毫秒，選用）                                   |
| `connectTimeout`               | 每個伺服器的連線逾時時間（秒，選用）                                     |
| `timeout` / `requestTimeoutMs` | 每個伺服器的 MCP 請求逾時時間（秒或毫秒）                                |
| `auth: "oauth"`                | 使用 MCP OAuth Token 儲存和 `openclaw mcp login`                         |
| `sslVerify`                    | 僅針對明確信任的私人 HTTPS 端點設為 false                                |
| `clientCert` / `clientKey`     | mTLS 用戶端憑證和金鑰路徑                                                |
| `supportsParallelToolCalls`    | 提示此伺服器可安全進行並行呼叫                                           |

OpenClaw 設定使用 `transport: "streamable-http"` 作為標準拼寫。透過 `openclaw mcp set` 儲存時接受 CLI 原生 MCP `type: "http"` 值，並由現有設定中的 `openclaw doctor --fix` 修復，但 `transport` 才是內嵌 OpenClaw 直接使用的值。

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

<Note>Registry 指令不會啟動通道橋接。只有 `probe` 和 `doctor --probe` 會開啟即時 MCP 用戶端會話以證明目標伺服器是可連線的。</Note>

## 控制介面

瀏覽器控制介面包含位於 `/mcp` 的專用 MCP 設定頁面。它顯示已配置的伺服器計數、已啟用/OAuth/過濾器摘要、各伺服器傳輸列、啟用/停用控制項、常用 CLI 指令，以及 `mcp` 配置區段的範圍編輯器。

使用該頁面進行操作員編輯和快速清點。當您需要即時伺服器驗證時，請使用 `openclaw mcp doctor --probe` 或 `openclaw mcp probe`。

操作員工作流程：

1. 開啟控制介面並選擇 **MCP**。
2. 檢視總計、已啟用、OAuth 和已過濾伺服器的摘要卡片。
3. 使用每個伺服器列來查看傳輸、驗證、過濾器、逾時和指令提示。
4. 當您想要保留定義但將其從執行階段探索中排除時，切換啟用狀態。
5. 編輯範圍 `mcp` 配置區段以進行結構性變更，例如新增伺服器、標頭、TLS、OAuth 中繼資料或工具過濾器。
6. 選擇 **Save** 僅儲存配置，或選擇 **Save & Publish** 以透過 Gateway 配置路徑套用變更。
7. 當您需要即時驗證編輯後的伺服器是否啟動並列出工具時，請執行 `openclaw mcp doctor --probe`。

註記：

- 指令片段會引用伺服器名稱，以便特殊名稱在 shell 中仍可複製
- 顯示的類似 URL 的值如果包含嵌入式憑證，會在呈現前被編輯
- 該頁面不會自行啟動 MCP 傳輸
- 作用中的執行階段可能需要 `openclaw mcp reload`、Gateway 配置發佈或程序重新啟動，具體取決於哪個程序擁有 MCP 用戶端

## 目前限制

本頁面記載了目前發布的橋接功能。

目前限制：

- 對話探索依賴現有的 Gateway 會話路由中繼資料
- 除了 Claude 專用配接器外，沒有通用的推送協定
- 尚未提供訊息編輯或回應工具
- HTTP/SSE/streamable-http 傳輸連線到單一遠端伺服器；尚無多工上遊
- `permissions_list_open` 僅包含在橋接連線時觀察到的核准項目

## 相關

- [CLI 參考](/zh-Hant/cli)
- [外掛](/zh-Hant/cli/plugins)
