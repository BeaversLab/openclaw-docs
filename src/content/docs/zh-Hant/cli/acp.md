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

如果您希望外部 MCP 用戶端直接與 OpenClaw 頻道交談
對話而不是託管 ACP harness 會話，請改用
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
- 未知/非核心工具名稱、超出範圍的讀取以及危險工具始終需要明確的提示批准。
- 伺服器提供的 `toolCall.kind` 被視為不受信任的元資料（而非授權來源）。

## 如何使用此功能

當 IDE（或其他用戶端）使用 Agent Client Protocol 並且您希望其驅動 OpenClaw Gateway 會話時，請使用 ACP。

1. 確保 Gateway 正在運行（本機或遠端）。
2. 設定 Gateway 目標（配置或標誌）。
3. 將您的 IDE 指向透過 stdio 運行 `openclaw acp`。

配置範例（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

直接運行範例（不寫入配置）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 選擇代理程式

ACP 不會直接選擇代理程式。它根據 Gateway 會話金鑰進行路由。

使用代理程式範圍的會話金鑰來目標特定的代理程式：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每個 ACP 會話對應到一個單一的 Gateway 會話金鑰。一個代理程式可以擁有多個會話；除非您覆寫金鑰或標籤，否則 ACP 預設為隔離的 `acp:<uuid>` 會話。

橋接模式不支援各個會話的 `mcpServers`。如果 ACP 用戶端在 `newSession` 或 `loadSession` 期間發送這些設定，橋接器會傳回明確的錯誤，而不是無聲地忽略它們。

## 從 `acpx` 使用 (Codex、Claude、其他 ACP 用戶端)

如果您希望編碼代理程式（如 Codex 或 Claude Code）透過 ACP 與您的 OpenClaw 機器人通訊，請使用內建 `openclaw` 目標的 `acpx`。

典型流程：

1. 執行 Gateway 並確保 ACP 橋接器可以連線到它。
2. 將 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望編碼代理程式使用的 OpenClaw 會話金鑰。

範例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都指向特定的 Gateway 和 session key，請在 `~/.acpx/config.json` 中覆寫 `openclaw` agent 指令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

對於存放庫本地的 OpenClaw checkout，請使用直接的 CLI 進入點而不是 dev runner，以便 ACP 串流保持乾淨。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

這是讓 Codex、Claude Code 或其他支援 ACP 的客戶端從 OpenClaw agent 獲取上下文資訊而不需要擷取終端機的最簡單方式。

## Zed 編輯器設定

在 `~/.config/zed/settings.json` 中新增自訂 ACP agent（或使用 Zed 的設定 UI）：

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

若要指向特定的 Gateway 或 agent：

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

在 Zed 中，開啟 Agent 面板並選擇「OpenClaw ACP」以開始一個執行緒。

## Session 對應

根據預設，ACP session 會取得具有 `acp:` 前綴的獨立 Gateway session key。
若要重用已知的 session，請傳遞 session key 或標籤：

- `--session <key>`：使用特定的 Gateway session 金鑰。
- `--session-label <label>`：透過標籤解析現有 session。
- `--reset-session`：為該金鑰建立一個新的 session ID（相同金鑰，新的對話記錄）。

如果您的 ACP 用戶端支援元資料，您可以針對每個 session 進行覆寫：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

在 [/concepts/session](/en/concepts/session) 深入了解 session 金鑰。

## 選項

- `--url <url>`：Gateway WebSocket URL（若已設定，預設為 gateway.remote.url）。
- `--token <token>`：Gateway 驗證權杖。
- `--token-file <path>`：從檔案讀取 Gateway 驗證權杖。
- `--password <password>`：Gateway 驗證密碼。
- `--password-file <path>`：從檔案讀取 Gateway 驗證密碼。
- `--session <key>`：預設 session 金鑰。
- `--session-label <label>`：要解析的預設 session 標籤。
- `--require-existing`：如果 session key/label 不存在則失敗。
- `--reset-session`：在首次使用前重置 session key。
- `--no-prefix-cwd`：不要在提示詞前加上工作目錄。
- `--verbose, -v`：詳細日誌輸出到 stderr。

安全提示：

- 在某些系統的本機進程列表中，可能會看到 `--token` 和 `--password`。
- 建議優先使用 `--token-file`/`--password-file` 或環境變數（`OPENCLAW_GATEWAY_TOKEN`、`OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway 驗證解析遵循其他 Gateway 用戶端使用的共用合約：
  - 本機模式：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 僅在 `gateway.auth.*` 未設定時才回退（已設定但未解析的本機 SecretRefs 將以失敗關閉處理）
  - 遠端模式：`gateway.remote.*` 並依據遠端優先順序規則回退至 env/config
  - `--url` 具有覆寫安全性，不會重複使用隱含的 config/env 憑證；請傳遞明確的 `--token`/`--password`（或檔案變體）
- ACP 執行後端子程序會接收 `OPENCLAW_SHELL=acp`，可用於特定於上下文的 shell/profile 規則。
- `openclaw acp client` 在產生的橋接程序上設定 `OPENCLAW_SHELL=acp-client`。

### `acp client` 選項

- `--cwd <dir>`：ACP 會話的工作目錄。
- `--server <command>`：ACP 伺服器指令（預設值：`openclaw`）。
- `--server-args <args...>`：傳遞給 ACP 伺服器的額外參數。
- `--server-verbose`：在 ACP 伺服器上啟用詳細記錄。
- `--verbose, -v`：詳細的客戶端記錄。
