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

如果您希望外部 MCP 用戶端直接與 OpenClaw 頻道對話，而不是託管 ACP harness session，請改用
[`openclaw mcp serve`](/en/cli/mcp)。

## 相容性矩陣

| ACP 區域                                                       | 狀態   | 備註                                                                                                                                                                       |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                 | 已實作 | 透過 stdio 到 Gateway chat/send + abort 的核心橋接流程。                                                                                                                   |
| `listSessions`, 斜線指令                                       | 已實作 | 會話列表針對 Gateway 會話狀態運作；指令透過 `available_commands_update` 公佈。                                                                                             |
| `loadSession`                                                  | 部分   | 將 ACP 會話重新綁定到 Gateway 會話金鑰，並重播儲存的使用者/助理文字歷史記錄。工具/系統歷史記錄尚未重建。                                                                   |
| 提示內容 (`text`、內嵌的 `resource`、圖片)                     | 部分   | 文字/資源被扁平化為聊天輸入；圖片變成 Gateway 附件。                                                                                                                       |
| 會話模式                                                       | 部分   | 支援 `session/set_mode`，且橋接器公開了初步由 Gateway 支援的會話控制，用於思維層級、工具詳細程度、推理、使用細節以及提權操作。更廣泛的原生 ACP 模式/配置介面仍不在範圍內。 |
| 會話資訊與使用量更新                                           | 部分   | 橋接器從快取的 Gateway 會話快照發出 `session_info_update` 和盡力而為的 `usage_update` 通知。使用量為近似值，僅在 Gateway token 總數被標記為最新時傳送。                    |
| 工具串流                                                       | 部分   | `tool_call` / `tool_call_update` 事件包含原始 I/O、文字內容，以及當 Gateway 工具引數/結果揭露時，盡力提供的檔案位置。嵌入式終端機和更豐富的原生差異輸出目前仍未揭露。      |
| 每個 Session 的 MCP 伺服器 (`mcpServers`)                      | 不支援 | 橋接模式會拒絕每個 Session 的 MCP 伺服器請求。請改在 OpenClaw gateway 或 agent 上設定 MCP。                                                                                |
| 客戶端檔案系統方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支援 | 橋接器不會呼叫 ACP 客戶端檔案系統方法。                                                                                                                                    |
| 客戶端終端機方法 (`terminal/*`)                                | 不支援 | 橋接器不會建立 ACP 客戶端終端機，也不會透過工具呼叫傳輸終端機 ID。                                                                                                         |
| Session 計畫 / 思考串流                                        | 不支援 | 此橋接器目前會發出輸出文字和工具狀態，而不會發出 ACP 計劃或思緒更新。                                                                                                      |

## 已知限制

- `loadSession` 會重播儲存的使用者和助理文字歷史記錄，但它不會
  重建歷史工具呼叫、系統通知或更豐富的 ACP 原生事件
  類型。
- 如果多個 ACP 客戶端共用相同的 Gateway 工作階段金鑰，事件和取消
  路由為盡力而為，而非嚴格按客戶端隔離。當您需要乾淨的編輯器本機
  對話時，請優先使用預設的隔離 `acp:<uuid>` 工作階段。
- Gateway 停止狀態會轉換為 ACP 停止原因，但該映射
  不如完全 ACP 原生執行時期那樣富有表現力。
- 初始工作階段控制目前會顯示 Gateway 控制項的專注子集：
  思緒層級、工具詳細程度、推理、使用詳細資訊和提升
  動作。模型選擇和執行主機控制尚未公開為 ACP
  設定選項。
- `session_info_update` 和 `usage_update` 源自 Gateway 會話快照，而非即時的 ACP 原生執行時間統計。使用情況為近似值，不包含成本資料，且僅在 Gateway 將總 token 資料標記為最新時才會輸出。
- 工具追蹤資料屬於盡力而為。橋接器可以顯示出現於已知工具引數/結果中的檔案路徑，但目前尚未輸出 ACP 終端或結構化檔案差異。

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

## ACP 客戶端 (debug)

使用內建的 ACP 客戶端來檢查橋接器的健全性，無需使用 IDE。它會啟動 ACP 橋接器，並讓您以互動方式輸入提示。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

權限模型 (客戶端 debug 模式)：

- 自動核准基於允許清單，且僅套用於受信任的核心工具 ID。
- `read` 的自動核准範圍限定於目前工作目錄 (若設定則為 `--cwd`)。
- ACP 僅自動批准狹窄的唯讀類別：作用於目前 cwd 下的範圍 `read` 呼叫，以及唯讀搜尋工具 (`search`, `web_search`, `memory_search`)。未知/非核心工具、超出範圍的讀取、具備 exec 能力的工具、控制平面工具、變異工具和互動式流程始終需要明確的提示批准。
- 伺服器提供的 `toolCall.kind` 被視為未受信任的元資料（非授權來源）。
- 此 ACP 橋接器政策與 ACPX harness 權限分開。如果您透過 `acpx` 後端執行 OpenClaw，`plugins.entries.acpx.config.permissionMode=approve-all` 是該 harness session 的緊急「yolo」開關。

## 如何使用此功能

當 IDE（或其他用戶端）使用 Agent Client Protocol 並且您希望它驅動 OpenClaw Gateway session 時，請使用 ACP。

1. 確保 Gateway 正在執行（本地或遠端）。
2. 設定 Gateway 目標（配置或標誌）。
3. 將您的 IDE 指向透過 stdio 執行 `openclaw acp`。

範例配置（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

範例直接執行（不寫入配置）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 選擇代理程式

ACP 不直接選擇代理程式。它透過 Gateway session 金鑰進行路由。

使用代理程式範圍的 session 金鑰來鎖定特定代理程式：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每個 ACP session 對應到單一 Gateway session 金鑰。一個代理程式可以擁有多個
session；除非您覆寫
金鑰或標籤，否則 ACP 預設為隔離的 `acp:<uuid>` session。

橋接器模式不支援每個 session 的 `mcpServers`。如果 ACP 用戶端
在 `newSession` 或 `loadSession` 期間發送它們，橋接器會返回明確的
錯誤，而不是靜默忽略它們。

如果您希望 ACPX 支援的 session 能夠看到 OpenClaw 外掛程式工具，請啟用
gateway 端的 ACPX 外掛程式橋接器，而不是嘗試傳遞每個 session 的
`mcpServers`。請參閱 [ACP Agents](/en/tools/acp-agents#plugin-tools-mcp-bridge)。

## 從 `acpx` 使用 (Codex、Claude 及其他 ACP 用戶端)

如果您希望 Codex 或 Claude Code 等編碼代理透過 ACP 與您的
OpenClaw 機器人對話，請使用 `acpx` 及其內建的 `openclaw` 目標。

典型流程：

1. 執行 Gateway 並確保 ACP 橋接器能連線到它。
2. 將 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望編碼代理使用的 OpenClaw 會話金鑰。

範例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都指定特定的 Gateway 和會話金鑰，
請在 `~/.acpx/config.json` 中覆寫 `openclaw` 代理命令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

對於存放庫本地的 OpenClaw checkout，請使用直接 CLI 進入點而非
dev runner，以保持 ACP 串流乾淨。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

這是讓 Codex、Claude Code 或其他 ACP 感知的用戶端
從 OpenClaw 代理取得相關資訊而無需擷取終端機內容的最簡單方式。

## Zed 編輯器設定

在 `~/.config/zed/settings.json` 中新增自訂 ACP 代理 (或使用 Zed 的設定 UI)：

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

若要指定特定的 Gateway 或代理：

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

在 Zed 中，開啟 Agent 面板並選擇「OpenClaw ACP」以開始執行緒。

## 會話對應

預設情況下，ACP 會話會取得具有 `acp:` 前綴的隔離 Gateway 會話金鑰。
若要重用已知會話，請傳遞會話金鑰或標籤：

- `--session <key>`：使用特定的 Gateway 會話金鑰。
- `--session-label <label>`：依標籤解析現有會話。
- `--reset-session`：為該金鑰產生新的會話 ID (相同金鑰，新的記錄)。

如果您的 ACP 用戶端支援元資料，您可以針對每個會話進行覆寫：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

在 [/concepts/session](/en/concepts/session) 深入了解會話金鑰。

## 選項

- `--url <url>`：Gateway WebSocket URL (設定時預設為 gateway.remote.url)。
- `--token <token>`：Gateway 驗證權杖。
- `--token-file <path>`：從檔案讀取 Gateway 驗證權杖。
- `--password <password>`：Gateway 驗證密碼。
- `--password-file <path>`：從檔案讀取 Gateway 驗證密碼。
- `--session <key>`：預設會話金鑰。
- `--session-label <label>`：要解析的預設會話標籤。
- `--require-existing`：如果會話金鑰/標籤不存在，則失敗。
- `--reset-session`：在首次使用前重置會話金鑰。
- `--no-prefix-cwd`：不要在工作目錄前加上提示詞。
- `--verbose, -v`：詳細記錄到 stderr。

安全說明：

- `--token` 和 `--password` 在某些系統的本機進程列表中可能可見。
- 建議優先使用 `--token-file`/`--password-file` 或環境變數（`OPENCLAW_GATEWAY_TOKEN`， `OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway 驗證解析遵循其他 Gateway 客戶端使用的共用合約：
  - 本地模式：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 僅在 `gateway.auth.*` 未設定時後退（已設定但未解析的本地 SecretRefs 將失敗關閉）
  - 遠端模式：`gateway.remote.*`，根據遠端優先順序規則回退至 env/config
  - `--url` 是覆蓋安全的，不會重複使用隱含的 config/env 認證；請傳遞明確的 `--token`/`--password`（或檔案變體）
- ACP 執行後端子進程會接收 `OPENCLAW_SHELL=acp`，可用於特定於上下文的 shell/profile 規則。
- `openclaw acp client` 在產生的橋接程序上設定 `OPENCLAW_SHELL=acp-client`。

### `acp client` 選項

- `--cwd <dir>`：ACP 會話的工作目錄。
- `--server <command>`：ACP 伺服器指令（預設：`openclaw`）。
- `--server-args <args...>`：傳遞給 ACP 伺服器的額外引數。
- `--server-verbose`：在 ACP 伺服器上啟用詳細記錄。
- `--verbose, -v`：詳細的客戶端記錄。
