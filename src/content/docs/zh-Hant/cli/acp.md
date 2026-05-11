---
summary: "運行用於 IDE 整合的 ACP 橋接器"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "ACP"
---

運行與 OpenClaw Gateway 通訊的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 橋接器。

此指令透過 stdio 使用 ACP 與 IDE 通訊，並透過 WebSocket 將提示轉發至 Gateway。它會將 ACP 會話對應到 Gateway 會話金鑰。

`openclaw acp` 是一個由 Gateway 支援的 ACP 橋接器，而非完整的 ACP 原生編輯器執行時期。它專注於會話路由、提示傳遞與基本串流更新。

如果您希望外部 MCP 用戶端直接與 OpenClaw 頻道對話，而不是託管 ACP 鞍座會話，請改用 [`openclaw mcp serve`](/zh-Hant/cli/mcp)。

## 這不是什麼

此頁面常與 ACP 鞍座會話混淆。

`openclaw acp` 意指：

- OpenClaw 充當 ACP 伺服器
- IDE 或 ACP 用戶端連接至 OpenClaw
- OpenClaw 將工作轉發至 Gateway 會話

這與 [ACP Agents](/zh-Hant/tools/acp-agents) 不同，後者是 OpenClaw 透過 `acpx` 執行外部鞍座（例如 Codex 或 Claude Code）。

快速規則：

- 編輯器/用戶端想要使用 ACP 與 OpenClaw 通訊：使用 `openclaw acp`
- OpenClaw 應將 Codex/Claude/Gemini 作為 ACP 鞍座啟動：使用 `/acp spawn` 與 [ACP Agents](/zh-Hant/tools/acp-agents)

## 相容性矩陣

| ACP 區域                                                       | 狀態   | 備註                                                                                                                                                                         |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`、`newSession`、`prompt`、`cancel`                 | 已實作 | 透過 stdio 到 Gateway chat/send + abort 的核心橋接流程。                                                                                                                     |
| `listSessions`、斜線指令                                       | 已實作 | 會話清單針對 Gateway 會話狀態運作；指令透過 `available_commands_update` 公告。                                                                                               |
| `loadSession`                                                  | 部分   | 將 ACP 會話重新綁定至 Gateway 會話金鑰，並重播儲存的使用者/助手文字歷史。工具/系統歷史尚未重建。                                                                             |
| 提示內容（`text`、內嵌 `resource`、圖片）                      | 部分   | 文字/資源被扁平化至聊天輸入；圖片成為 Gateway 附件。                                                                                                                         |
| 會話模式                                                       | 部分   | `session/set_mode` 獲得支援，且橋接器暴露了初始的基於 Gateway 的會話控制，用於思維層級、工具詳細程度、推理、使用詳情和提升動作。更廣泛的 ACP 原生模式/配置介面仍在範圍之外。 |
| 會話資訊與使用更新                                             | 部分   | 橋接器會從快取的 Gateway 會話快照中發出 `session_info_update` 以及盡力而為的 `usage_update` 通知。使用情況為近似值，僅在 Gateway token 總數被標記為新鮮時發送。              |
| 工具串流                                                       | 部分   | `tool_call` / `tool_call_update` 事件包含原始 I/O、文字內容，以及當 Gateway 工具參數/結果暴露時盡力提供的檔案位置。內嵌終端機和更豐富的 diff 原生輸出仍未被暴露。            |
| 每個會話的 MCP 伺服器 (`mcpServers`)                           | 不支援 | 橋接模式會拒絕每個會話的 MCP 伺服器請求。請改為在 OpenClaw gateway 或 agent 上設定 MCP。                                                                                     |
| 客戶端檔案系統方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支援 | 橋接器不會呼叫 ACP 客戶端檔案系統方法。                                                                                                                                      |
| 客戶端終端機方法 (`terminal/*`)                                | 不支援 | 橋接器不會建立 ACP 客戶端終端機，也不會透過工具呼叫串流終端機 ID。                                                                                                           |
| 會話計畫 / 思維串流                                            | 不支援 | 橋接器目前發出輸出文字和工具狀態，而不是 ACP 計畫或思維更新。                                                                                                                |

## 已知限制

- `loadSession` 會重播儲存的使用者和助理文字歷史記錄，但它不會
  重建歷史工具呼叫、系統通知或更豐富的 ACP 原生事件
  類型。
- 如果多個 ACP 客戶端共享相同的 Gateway 會話金鑰，事件和取消
  路由是盡力而為的，而不是每個客戶端嚴格隔離的。當您需要乾淨的編輯器本機
  回合時，請優先使用
  預設的隔離 `acp:<uuid>` 會話。
- Gateway 停止狀態會轉換為 ACP 停止原因，但該映射
  不如完全 ACP 原生運行時那樣具有表現力。
- 初始會話控制目前暴露了 Gateway 控制項的專注子集：
  思維層級、工具詳細程度、推理、使用詳情和提升
  動作。模型選擇和執行主機控制尚未作為 ACP
  配置選項公開。
- `session_info_update` 和 `usage_update` 源自於 Gateway 會話快照，而非即時的 ACP 原生執行時間計算。使用量為近似值，不包含成本資料，且僅在 Gateway 將總 token 資料標記為最新時才會發送。
- 工具追蹤資料為盡力而為的結果。橋接器可以顯示出現於已知工具參數/結果中的檔案路徑，但目前尚未發出 ACP 終端機或結構化檔案差異。

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

## ACP 客戶端 (除錯)

使用內建的 ACP 客戶端在沒有 IDE 的情況下對橋接器進行健全性檢查。它會啟動 ACP 橋接器並讓您以互動方式輸入提示。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

權限模型 (客戶端除錯模式)：

- 自動核准是基於允許清單 的，且僅適用於受信任的核心工具 ID。
- `read` 自動核准的範圍限於目前的工作目錄 (設定時為 `--cwd`)。
- ACP 僅自動核准狹隘的唯讀類別：作用中 cwd 下的範圍限 `read` 呼叫，加上唯讀搜尋工具 (`search`、`web_search`、`memory_search`)。未知/非核心工具、超出範圍的讀取、具 exec 能力的工具、控制平面工具、變異工具以及互動式流程始終需要明確的提示核准。
- 伺服器提供的 `toolCall.kind` 被視為未受信任的中繼資料 (而非授權來源)。
- 此 ACP 橋接器政策與 ACPX 組合 權限分開。如果您透過 `acpx` 後端執行 OpenClaw，`plugins.entries.acpx.config.permissionMode=approve-all` 是該組合會話的緊急「yolo」開關。

## 使用方法

當 IDE (或其他客戶端) 使用 Agent Client Protocol 通訊，且您希望其驅動 OpenClaw Gateway 會話時，請使用 ACP。

1. 確保 Gateway 正在執行 (本機或遠端)。
2. 設定 Gateway 目標 (設定或旗標)。
3. 將您的 IDE 指向透過 stdio 執行 `openclaw acp`。

範例設定 (已儲存)：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

範例直接執行 (不寫入設定)：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 選擇代理程式

ACP 不會直接選擇代理程式。它是透過 Gateway 會話金鑰進行路由。

使用代理程式範圍的會話金鑰以鎖定特定代理程式：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每個 ACP session 會對應到單一 Gateway session key。一個 agent 可以擁有多個 session；除非您覆寫 key 或 label，否則 ACP 預設會使用獨立的 `acp:<uuid>` session。

橋接模式不支援個別 session 的 `mcpServers`。如果 ACP 用戶端在 `newSession` 或 `loadSession` 期間發送這些設定，橋接器會傳回明確的錯誤訊息，而非直接將其忽略。

如果您希望 ACPX 支援的 session 能夠看見 OpenClaw 外掛工具或特定內建工具（例如 `cron`），請啟用 gateway 端的 ACPX MCP 橋接器，而不要嘗試傳遞個別 session 的 `mcpServers`。請參閱 [ACP Agents](/zh-Hant/tools/acp-agents-setup#plugin-tools-mcp-bridge) 與 [OpenClaw tools MCP bridge](/zh-Hant/tools/acp-agents-setup#openclaw-tools-mcp-bridge)。

## 從 `acpx` 使用 (Codex、Claude、其他 ACP 用戶端)

如果您希望編碼 agent（例如 Codex 或 Claude Code）透過 ACP 與您的 OpenClaw 機器人通訊，請使用內建 `openclaw` 目標的 `acpx`。

典型流程：

1. 執行 Gateway 並確保 ACP 橋接器可以連線到它。
2. 將 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望編碼 agent 使用的 OpenClaw session key。

範例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都指定特定的 Gateway 和 session key，請在 `~/.acpx/config.json` 中覆寫 `openclaw` agent 指令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

對於 repo 本地的 OpenClaw checkout，請使用直接 CLI 進入點而非 dev runner，讓 ACP 串流保持乾淨。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

這是讓 Codex、Claude Code 或其他支援 ACP 的用戶端從 OpenClaw agent 擷取情境資訊，而不需擷取終端機內容的最簡單方式。

## Zed 編輯器設定

在 `~/.config/zed/settings.json` 中新增自訂 ACP agent (或使用 Zed 的 Settings UI)：

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

若要指定特定的 Gateway 或 agent：

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

在 Zed 中，開啟 Agent 面板並選擇「OpenClaw ACP」以開始對話。

## Session 對應

預設情況下，ACP session 會取得帶有 `acp:` 前綴的獨立 Gateway session key。若要重複使用已知的 session，請傳遞 session key 或 label：

- `--session <key>`：使用指定的 Gateway session key。
- `--session-label <label>`：根據標籤解析現有的工作階段。
- `--reset-session`：為該金鑰建立一個新的工作階段 ID（相同的金鑰，新的對話紀錄）。

如果您的 ACP 用戶端支援元數據，您可以針對每個工作階段進行覆寫：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

在 [/concepts/session](/zh-Hant/concepts/session) 深入了解工作階段金鑰。

## 選項

- `--url <url>`：Gateway WebSocket URL（設定時預設為 gateway.remote.url）。
- `--token <token>`：Gateway 驗證權杖。
- `--token-file <path>`：從檔案讀取 Gateway 驗證權杖。
- `--password <password>`：Gateway 驗證密碼。
- `--password-file <path>`：從檔案讀取 Gateway 驗證密碼。
- `--session <key>`：預設工作階段金鑰。
- `--session-label <label>`：要解析的預設工作階段標籤。
- `--require-existing`：如果工作階段金鑰/標籤不存在則失敗。
- `--reset-session`：在首次使用前重設工作階段金鑰。
- `--no-prefix-cwd`：不要在工作目錄提示詞中加入前綴。
- `--provenance <off|meta|meta+receipt>`：包含 ACP 來源元數據或收據。
- `--verbose, -v`：輸出詳細記錄至 stderr。

安全提示：

- `--token` 和 `--password` 在某些系統的本機程序列表中可能是可見的。
- 建議優先使用 `--token-file`/`--password-file` 或環境變數（`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway 驗證解析遵循其他 Gateway 用戶端使用的共用合約：
  - 本機模式：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 僅在 `gateway.auth.*` 未設定時進行回退（已設定但未解析的本機 SecretRefs 將會失敗關閉）
  - 遠端模式：`gateway.remote.*` 搭配 env/config 回退，遵循遠端優先順序規則
  - `--url` 是可安全覆寫的，不會重複使用隱含的 config/env 憑證；請傳遞明確的 `--token`/`--password`（或檔案變體）
- ACP 執行時間後端子行程會接收 `OPENCLAW_SHELL=acp`，該變數可用於特定於內容的 shell/profile 規則。
- `openclaw acp client` 會在產生的橋接行程上設定 `OPENCLAW_SHELL=acp-client`。

### `acp client` 選項

- `--cwd <dir>`：ACP 會話的工作目錄。
- `--server <command>`：ACP 伺服器指令（預設值：`openclaw`）。
- `--server-args <args...>`：傳遞給 ACP 伺服器的額外引數。
- `--server-verbose`：在 ACP 伺服器上啟用詳細記錄。
- `--verbose, -v`：詳細的客戶端記錄。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [ACP agents](/zh-Hant/tools/acp-agents)
