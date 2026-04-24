---
summary: "運行用於 IDE 整合的 ACP 橋接器"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

執行與 OpenClaw Gateway 通訊的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 橋接器。

此命令透過 stdio 與 IDE 進行 ACP 通訊，並透過 WebSocket 將提示轉發至 Gateway。它將 ACP 會話對應到 Gateway 會話金鑰。

`openclaw acp` 是一個由 Gateway 支援的 ACP 橋接器，而非完整的 ACP 原生編輯器執行環境。它專注於會話路由、提示傳遞和基本串流更新。

如果您想要外部 MCP 用戶端直接與 OpenClaw 頻道對話進行通訊，而不是託管 ACP harness session，請改用
[`openclaw mcp serve`](/zh-Hant/cli/mcp)。

## 這不是什麼

此頁面經常與 ACP harness 會話混淆。

`openclaw acp` 意味著：

- OpenClaw 充當 ACP 伺服器
- IDE 或 ACP 用戶端連接到 OpenClaw
- OpenClaw 將該工作轉發到 Gateway 會話

這與 [ACP Agents](/zh-Hant/tools/acp-agents) 不同，後者是 OpenClaw 透過 `acpx` 執行外部 harness（例如 Codex 或 Claude Code）。

快速規則：

- 編輯器/用戶端想要以 ACP 與 OpenClaw 通訊：使用 `openclaw acp`
- OpenClaw 應啟動 Codex/Claude/Gemini 作為 ACP harness：使用 `/acp spawn` 和 [ACP Agents](/zh-Hant/tools/acp-agents)

## 相容性矩陣

| ACP 區域                                                       | 狀態   | 備註                                                                                                                                                                       |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`、`newSession`、`prompt`、`cancel`                 | 已實作 | 透過 stdio 到 Gateway chat/send + abort 的核心橋接流程。                                                                                                                   |
| `listSessions`、斜線指令                                       | 已實作 | 會話列表針對 Gateway 會話狀態運作；指令透過 `available_commands_update` 公佈。                                                                                             |
| `loadSession`                                                  | 部分   | 將 ACP 会話重新綁定到 Gateway 會話金鑰，並重播儲存的用戶/助理文字歷史記錄。工具/系統歷史記錄尚未重建。                                                                     |
| 提示內容 (`text`、內嵌 `resource`、圖片)                       | 部分   | 文字/資源被扁平化到聊天輸入中；圖片變成 Gateway 附件。                                                                                                                     |
| 會話模式                                                       | 部分   | 支援 `session/set_mode`，且橋接器公開初始的 Gateway 支援會話控制，用於思考層級、工具詳細程度、推理、使用詳細資訊和提升動作。更廣泛的 ACP 原生模式/配置介面目前不在範圍內。 |
| 會話資訊和使用量更新                                           | 部分   | 此橋接器會從快取的 Gateway 工作階段快照中發出 `session_info_update` 和盡力而為的 `usage_update` 通知。使用量為近似值，且僅在 Gateway 權杖總數被標記為最新時才會傳送。      |
| 工具串流                                                       | 部分   | 當 Gateway 工具參數/結果公開時，`tool_call` / `tool_call_update` 事件包含原始 I/O、文字內容和盡力而為的檔案位置。嵌入式終端機和更豐富的原生 diff 輸出仍未公開。            |
| 每個工作階段的 MCP 伺服器 (`mcpServers`)                       | 不支援 | 橋接模式會拒絕每個工作階段的 MCP 伺服器請求。請改為在 OpenClaw gateway 或 agent 上設定 MCP。                                                                               |
| 用戶端檔案系統方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支援 | 橋接器不會呼叫 ACP 用戶端檔案系統方法。                                                                                                                                    |
| 用戶端終端機方法 (`terminal/*`)                                | 不支援 | 橋接器不會建立 ACP 用戶端終端機或透過工具呼叫串流終端機 ID。                                                                                                               |
| 工作階段計畫 / 思維串流                                        | 不支援 | 橋接器目前會發出輸出文字和工具狀態，而不會發出 ACP 計畫或思維更新。                                                                                                        |

## 已知限制

- `loadSession` 會重播儲存的使用者和助理文字歷史紀錄，但不會
  重建歷史工具呼叫、系統通知或更豐富的原生 ACP 事件
  類型。
- 如果多個 ACP 用戶端共用同一個 Gateway 工作階段金鑰，事件和取消
  路由會是盡力而為，而不是嚴格地按用戶端隔離。當您需要乾淨的編輯器本機
  輪次時，建議優先使用預設的隔離 `acp:<uuid>` 工作階段。
- Gateway 停止狀態會轉換為 ACP 停止原因，但該對應關係
  的表現力不如完全的原生 ACP 執行時期。
- 初始工作階段控制項目前會公開 Gateway 選項的專注子集：
  思維等級、工具詳細程度、推理、使用量詳細資料和提升
  動作。模型選取和 exec-host 控制項尚未公開為 ACP
  設定選項。
- `session_info_update` 和 `usage_update` 是從 Gateway 工作階段
  快照推導而來，而非即時的原生 ACP 執行時期計數。使用量為近似值，
  不包含成本資料，且僅在 Gateway 將總權杖
  資料標記為最新時才會發出。
- Tool follow-along data is best-effort. The bridge can surface file paths that
  appear in known tool args/results, but it does not yet emit ACP terminals or
  structured file diffs.

## 使用方式

```bash
openclaw acp

# Remote Gateway
openclaw acp --url wss://gateway-host:18789 --token <token>

# Remote Gateway (token from file)
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Attach to an existing session key
openclaw acp --session agent:main:main

# Attach by label (must already exist)
openclaw acp --session-label "support inbox"

# Reset the session key before the first prompt
openclaw acp --session agent:main:main --reset-session
```

## ACP 客戶端（除錯）

Use the built-in ACP client to sanity-check the bridge without an IDE.
It spawns the ACP bridge and lets you type prompts interactively.

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

Permission model (client debug mode):

- Auto-approval is allowlist-based and only applies to trusted core tool IDs.
- `read` auto-approval is scoped to the current working directory (`--cwd` when set).
- ACP only auto-approves narrow readonly classes: scoped `read` calls under the active cwd plus readonly search tools (`search`, `web_search`, `memory_search`). Unknown/non-core tools, out-of-scope reads, exec-capable tools, control-plane tools, mutating tools, and interactive flows always require explicit prompt approval.
- Server-provided `toolCall.kind` is treated as untrusted metadata (not an authorization source).
- This ACP bridge policy is separate from ACPX harness permissions. If you run OpenClaw through the `acpx` backend, `plugins.entries.acpx.config.permissionMode=approve-all` is the break-glass “yolo” switch for that harness session.

## 如何使用

Use ACP when an IDE (or other client) speaks Agent Client Protocol and you want
it to drive an OpenClaw Gateway session.

1. Ensure the Gateway is running (local or remote).
2. Configure the Gateway target (config or flags).
3. Point your IDE to run `openclaw acp` over stdio.

Example config (persisted):

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

Example direct run (no config write):

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 選擇代理程式

ACP does not pick agents directly. It routes by the Gateway session key.

Use agent-scoped session keys to target a specific agent:

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

Each ACP session maps to a single Gateway session key. One agent can have many
sessions; ACP defaults to an isolated `acp:<uuid>` session unless you override
the key or label.

橋接模式下不支援每個工作階段的 `mcpServers`。如果 ACP 用戶端在 `newSession` 或 `loadSession` 期間發送這些設定，橋接器會傳回一個明確的錯誤，而不是靜靜地忽略它們。

如果您希望 ACPX 支援的 session 能夠看到 OpenClaw 外掛工具或選定的內建工具（例如 `cron`），請啟用 gateway 端的 ACPX MCP bridges，而
不要嘗試傳遞各個 session 的 `mcpServers`。請參閱
[ACP Agents](/zh-Hant/tools/acp-agents#plugin-tools-mcp-bridge) 和
[OpenClaw tools MCP bridge](/zh-Hant/tools/acp-agents#openclaw-tools-mcp-bridge)。

## 從 `acpx` 使用 (Codex, Claude, 其他 ACP 用戶端)

如果您希望編碼代理程式（例如 Codex 或 Claude Code）透過 ACP 與您的
OpenClaw 機器人通訊，請使用 `acpx` 及其內建的 `openclaw` 目標。

典型流程：

1. 執行 Gateway 並確保 ACP 橋接器能夠連線到它。
2. 將 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望程式碼代理使用的 OpenClaw 工作階段金鑰。

範例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都鎖定特定的 Gateway 和 session key，請覆寫 `~/.acpx/config.json` 中的 `openclaw` 代理程式指令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

對於存放庫本機的 OpenClaw 簽出，請使用直接 CLI 進入點而非開發執行器，以保持 ACP 串流乾淨。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

這是讓 Codex、Claude Code 或其他支援 ACP 的用戶端從 OpenClaw 代理程式擷取上下文資訊而无需擷取終端機內容的最簡單方法。

## Zed 編輯器設定

在 `~/.config/zed/settings.json` 中新增自訂 ACP 代理程式（或使用 Zed 的設定 UI）：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

要指向特定的 Gateway 或代理程式：

```json
{
  "agent_servers": {
    "OpenClaw ACP": {
      "type": "custom",
      "command": "openclaw",
      "args": ["acp", "--url", "wss://gateway-host:18789", "--token", "<token>", "--session", "agent:design:main"],
      "env": {}
    }
  }
}
```

在 Zed 中，開啟 Agent 面板並選取「OpenClaw ACP」以啟動對話。

## 工作階段對應

根據預設，ACP session 會取得具有 `acp:` 前綴的獨立 Gateway session key。
若要重複使用已知 session，請傳遞 session key 或標籤：

- `--session <key>`：使用特定的 Gateway session key。
- `--session-label <label>`：透過標籤解析現有 session。
- `--reset-session`：為該 key 建立新的 session id（相同 key，新的對話紀錄）。

如果您的 ACP 用戶端支援中繼資料，您可以針對每個工作階段進行覆寫：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

在 [/concepts/session](/zh-Hant/concepts/session) 深入了解 session keys。

## 選項

- `--url <url>`：Gateway WebSocket URL（設定時預設為 gateway.remote.url）。
- `--token <token>`: Gateway 驗證權杖。
- `--token-file <path>`: 從檔案讀取 Gateway 驗證權杖。
- `--password <password>`: Gateway 驗證密碼。
- `--password-file <path>`: 從檔案讀取 Gateway 驗證密碼。
- `--session <key>`: 預設 session 金鑰。
- `--session-label <label>`: 要解析的預設 session 標籤。
- `--require-existing`: 如果 session 金鑰/標籤不存在則失敗。
- `--reset-session`: 在首次使用前重設 session 金鑰。
- `--no-prefix-cwd`: 不要在工作目錄前為提示加上前綴。
- `--provenance <off|meta|meta+receipt>`: 包含 ACP 來源元資料或收據。
- `--verbose, -v`: 詳細的日誌記錄到 stderr。

安全性注意：

- 在某些系統上，`--token` 和 `--password` 可能會在本機程序列表中可見。
- 建議優先使用 `--token-file`/`--password-file` 或環境變數 (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`)。
- Gateway 認證解析遵循其他 Gateway 用戶端使用的共享合約：
  - 本機模式：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 僅在 `gateway.auth.*` 未設定時才回退 (已設定但未解析的本機 SecretRefs 將封閉式失敗)
  - 遠端模式：`gateway.remote.*` 並根據遠端優先順序規則使用 env/config 回退
  - `--url` 具有覆蓋安全性，不會重複使用隱含的 config/env 憑證；請傳遞明確的 `--token`/`--password` (或檔案變體)
- ACP 執行階段後端子程序會接收 `OPENCLAW_SHELL=acp`，可用於特定於語境的 shell/profile 規則。
- `openclaw acp client` 會在產生的 bridge 程序上設定 `OPENCLAW_SHELL=acp-client`。

### `acp client` 選項

- `--cwd <dir>`: ACP session 的工作目錄。
- `--server <command>`: ACP 伺服器指令 (預設: `openclaw`)。
- `--server-args <args...>`: 傳遞給 ACP 伺服器的額外引數。
- `--server-verbose`: 在 ACP 伺服器上啟用詳細記錄。
- `--verbose, -v`：詳細的客戶端記錄。
