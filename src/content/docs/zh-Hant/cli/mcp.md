---
summary: "透過 MCP 公開 OpenClaw 頻道對話並管理已儲存的 MCP 伺服器定義"
read_when:
  - Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels
  - Running `openclaw mcp serve`
  - Managing OpenClaw-saved MCP server definitions
title: "mcp"
---

# mcp

`openclaw mcp` 有兩個職責：

- 使用 `openclaw mcp serve` 將 OpenClaw 作為 MCP 伺服器執行
- 使用 `list`、`show`、
  `set` 和 `unset` 管理屬於 OpenClaw 的輸出 MCP 伺服器定義

換句話說：

- `serve` 是 OpenClaw 作為 MCP 伺服器
- `list` / `show` / `set` / `unset` 是 OpenClaw 作為 MCP 用戶端
  註冊表，用於其執行時稍後可能使用的其他 MCP 伺服器

當 OpenClaw 應自行託管編程控制台
會話並透過 ACP 路由該執行時，請使用 [`openclaw acp`](/en/cli/acp)。

## OpenClaw 作為 MCP 伺服器

這是 `openclaw mcp serve` 路徑。

## 何時使用 `serve`

當以下情況時使用 `openclaw mcp serve`：

- Codex、Claude Code 或其他 MCP 用戶端應直接與
  支援 OpenClaw 的頻道對話通訊
- 您已經擁有具備路由會話的本機或遠端 OpenClaw Gateway
- 您想要一個能在 OpenClaw 頻道後端之間運作的 MCP 伺服器，
  而不是執行各自獨立的每個頻道橋接器

當 OpenClaw 應自行託管編程
執行時並將代理程式會話保留在 OpenClaw 內時，請改用 [`openclaw acp`](/en/cli/acp)。

## 運作方式

`openclaw mcp serve` 會啟動 stdio MCP 伺服器。MCP 用戶端擁有該
程序。當用戶端保持 stdio 會話開啟時，橋接器會透過 WebSocket 連接到
本機或遠端 OpenClaw Gateway，並透過 MCP 公開路由的頻道
對話。

生命週期：

1. MCP 用戶端產生 `openclaw mcp serve`
2. 橋接器連接到 Gateway
3. 路由會話變成 MCP 對話以及文字記錄/歷史工具
4. 當橋接器已連線時，即時事件會在記憶體中排隊
5. 如果啟用 Claude 頻道模式，同一個 session 也可以接收
   Claude 專用的推送通知

重要行為：

- 即時佇列狀態在橋接器連接時開始
- 較舊的逐字稿歷史紀錄是透過 `messages_read` 讀取的
- Claude 推送通知僅在 MCP session 存活期間存在
- 當客戶端斷線時，橋接器會退出，即時佇列也會消失

## 選擇客戶端模式

以兩種不同的方式使用同一個橋接器：

- 通用 MCP 客戶端：僅限標準 MCP 工具。使用 `conversations_list`、
  `messages_read`、`events_poll`、`events_wait`、`messages_send` 以及
  核准工具。
- Claude Code：標準 MCP 工具加上 Claude 專用的頻道轉接器。
  啟用 `--claude-channel-mode on` 或保留預設值 `auto`。

目前，`auto` 的行為與 `on` 相同。目前尚無客戶端功能檢測。

## `serve` 公開的內容

橋接器使用現有的 Gateway 會話路由元資料來公開由通道支援的對話。當 OpenClaw 對已知路由（例如：）已具有會話狀態時，會出現對話：

- `channel`
- 收件者或目的地元資料
- 選用的 `accountId`
- 選用的 `threadId`

這讓 MCP 客戶端可以在一個地方：

- 列出最近的已路由對話
- 讀取最近的通訊記錄
- 等待新的傳入事件
- 透過相同路由傳送回覆
- 查看橋接器連線時到達的審核請求

## 使用方法

```bash
# Local Gateway
openclaw mcp serve

# Remote Gateway
openclaw mcp serve --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Remote Gateway with password auth
openclaw mcp serve --url wss://gateway-host:18789 --password-file ~/.openclaw/gateway.password

# Enable verbose bridge logs
openclaw mcp serve --verbose

# Disable Claude-specific push notifications
openclaw mcp serve --claude-channel-mode off
```

## 橋接工具

目前的橋接器公開了這些 MCP 工具：

- `conversations_list`
- `conversation_get`
- `messages_read`
- `attachments_fetch`
- `events_poll`
- `events_wait`
- `messages_send`
- `permissions_list_open`
- `permissions_respond`

### `conversations_list`

列出 Gateway 工作階段狀態中已具備路由中繼資料的最近工作階段支援對話。

實用的篩選器：

- `limit`
- `search`
- `channel`
- `includeDerivedTitles`
- `includeLastMessage`

### `conversation_get`

根據 `session_key` 傳回一個對話。

### `messages_read`

讀取一個工作階段支援對話的最近逐字稿訊息。

### `attachments_fetch`

從一個逐字稿訊息中提取非文字訊息內容區塊。這是逐字稿內容的元數據檢視，並非獨立的持久附件 Blob 儲存。

### `events_poll`

讀取自數字游標以來排隊的即時事件。

### `events_wait`

長輪詢直到下一個符合條件的排隊事件到達或逾時結束。

當通用 MCP 客戶端需要近乎即時的傳遞而不使用 Claude 專用的推送協定時，請使用此工具。

### `messages_send`

透過已記錄在會話中的相同路由將文字傳回。

目前行為：

- 需要一個現有的對話路由
- 使用會話的頻道、收件者、帳戶 ID 和執行緒 ID
- 僅傳送文字

### `permissions_list_open`

列出橋接器自連線到 Gateway 以來觀察到的待處理 exec/plugin 批准請求。

### `permissions_respond`

使用以下內容解決一個待處理的 exec/plugin 審批請求：

- `allow-once`
- `allow-always`
- `deny`

## 事件模型

橋接器在連接時會維護一個記憶體內的事件佇列。

當前事件類型：

- `message`
- `exec_approval_requested`
- `exec_approval_resolved`
- `plugin_approval_requested`
- `plugin_approval_resolved`
- `claude_permission_request`

重要限制：

- 佇列僅在運行時有效；它會在 MCP 橋接器啟動時開始
- `events_poll` 和 `events_wait` 本身不會重播較舊的
  Gateway 歷史記錄
- 應使用 `messages_read` 讀取持久的積壓訊息

## Claude 頻道通知

橋接器也可以公開 Claude 特定的通道通知。這是 OpenClaw 版本的
Claude Code 通道適配器：標準 MCP 工具仍然可用，但即時傳入訊息也可以作為
Claude 特定的 MCP 通知到達。

標誌：

- `--claude-channel-mode off`：僅限標準 MCP 工具
- `--claude-channel-mode on`：啟用 Claude 通道通知
- `--claude-channel-mode auto`：目前預設值；橋接器行為與 `on` 相同

當啟用 Claude 通道模式時，伺服器會通告 Claude 實驗性功能並且可以發送：

- `notifications/claude/channel`
- `notifications/claude/channel/permission`

目前橋接器行為：

- 傳入的 `user` 逐字稿訊息會被轉發為
  `notifications/claude/channel`
- 透過 MCP 接收到的 Claude 權限請求會在記憶體中追蹤
- 如果連結的對話稍後發送 `yes abcde` 或 `no abcde`，橋接器會將其轉換為 `notifications/claude/channel/permission`
- 這些通知僅限於即時會話；如果 MCP 客戶端斷開連線，將沒有推送目標

這是有意為之的客戶端特定設計。通用 MCP 客戶端應依賴標準輪詢工具。

## MCP 客戶端設定

範例 stdio 客戶端設定：

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

對於大多數通用 MCP 客戶端，請從標準工具介面開始並忽略 Claude 模式。僅對實際理解 Claude 特定通知方法的客戶端開啟 Claude 模式。

## 選項

`openclaw mcp serve` 支援：

- `--url <url>`：Gateway WebSocket URL
- `--token <token>`：Gateway 權杖
- `--token-file <path>`：從檔案讀取權杖
- `--password <password>`：Gateway 密碼
- `--password-file <path>`：從檔案讀取密碼
- `--claude-channel-mode <auto|on|off>`：Claude 通知模式
- `-v`, `--verbose`：在 stderr 上輸出詳細日誌

盡可能優先使用 `--token-file` 或 `--password-file` 而非內嵌機密。

## 安全性與信任邊界

橋接器不會自行建立路由。它僅公開 Gateway 已知如何路由的對話。

這意味著：

- 發送者允許清單、配對以及通道層級的信任仍然屬於底層
  OpenClaw 通道設定的一部分
- `messages_send` 只能透過現有的已儲存路由進行回覆
- 核准狀態僅在當前橋接工作階段中即時存放於記憶體內
- 橋接器驗證應使用您信任用於任何其他遠端 Gateway 客戶端的
  相同 Gateway 權杖或密碼控制

如果 `conversations_list` 中缺少對話，通常的原因並不是
MCP 配置。而是底層 Gateway 會話中缺少或不完整的路由元數據。

## 測試

OpenClaw 附帶了一個確定性的 Docker 煙霧測試用於此橋接器：

```bash
pnpm test:docker:mcp-channels
```

該煙霧測試：

- 啟動一個已植入種子的 Gateway 容器
- 啟動第二個生成 `openclaw mcp serve` 的容器
- 驗證對話發現、對話紀錄讀取、附件元數據讀取、
  實時事件佇列行為以及出站發送路由
- 通過真實的 stdio MCP 橋接器驗證 Claude 風格的頻道和權限通知

這是在不將真實的 Telegram、Discord 或 iMessage 帳號連接到測試運行的情況下，
證明橋接器有效工作的最快方法。

如需更廣泛的測試背景，請參閱 [測試](/en/help/testing)。

## 故障排除

### 未返回任何對話

通常表示 Gateway 工作階段尚未可路由。請確認底層工作階段已儲存頻道/提供者、收件人以及選用的帳號/執行緒路由中繼資料。

### `events_poll` 或 `events_wait` 遺漏較舊的訊息

這是預期行為。即時佇列是在橋接器連線時才開始的。請使用 `messages_read` 讀取較舊的對話紀錄歷史。

### 未顯示 Claude 通知

請檢查以下所有項目：

- 用戶端保持 stdio MCP 工作階段開啟
- `--claude-channel-mode` 為 `on` 或 `auto`
- 用戶端實際上理解 Claude 專用的通知方法
- 傳入訊息是在橋接器連線後才發生

### 遺失核准請求

`permissions_list_open` 僅顯示橋接器連線期間觀察到的核准請求。它並非持久的核准歷史記錄 API。

## OpenClaw 作為 MCP 客戶端註冊表

這是 `openclaw mcp list`、`show`、`set` 和 `unset` 路徑。

這些命令不會透過 MCP 公開 OpenClaw。它們們管理 OpenClaw 設定中 `mcp.servers` 下的 OpenClaw 擁有的 MCP
伺服器定義。

這些儲存的定義是給 OpenClaw 稍後啟動或設定的執行時期（runtime）使用的，例如嵌入式 Pi 和其他執行時期轉接器。OpenClaw 將定義集中儲存，因此那些執行時期不需要維護自己的 MCP
伺服器清單副本。

重要行為：

- 這些命令僅讀取或寫入 OpenClaw 設定
- 它們不會連線到目標 MCP 伺服器
- 它們不會驗證指令、URL 或遠端傳輸目前是否
  可到達
- 執行時期轉接器會在執行時決定它們實際支援哪些傳輸形態

## 已儲存的 MCP 伺服器定義

OpenClaw 還會在設定中儲存一個輕量級的 MCP 伺服器註冊表，供需要 OpenClaw 管理之 MCP 定義的介面使用。

指令：

- `openclaw mcp list`
- `openclaw mcp show [name]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp unset <name>`

範例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp set docs '{"url":"https://mcp.example.com"}'
openclaw mcp unset context7
```

範例設定結構：

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com"
      }
    }
  }
}
```

典型欄位：

- `command`
- `args`
- `env`
- `cwd` 或 `workingDirectory`
- `url`

這些指令僅管理已儲存的設定。它們不會啟動通道橋接、開啟即時 MCP 用戶端工作階段，或驗證目標伺服器是否可連線。

## 目前限制

本頁面記錄了目前版本隨附的橋接功能。

目前限制：

- 對話探索取決於現有的 Gateway 工作階段路由中繼資料
- 除了 Claude 專用的配接器外，沒有通用的推送協定
- 尚無訊息編輯或反應工具
- 尚無專屬的 HTTP MCP 傳輸
- `permissions_list_open` 僅包含橋接器連線時所觀察到的核准
