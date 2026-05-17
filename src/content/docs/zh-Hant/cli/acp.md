---
summary: "執行用於 IDE 整合的 ACP 橋接器"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "ACP"
---

執行與 OpenClaw Gateway 通訊的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 橋接器。

此指令透過 stdio 使用 ACP 與 IDE 通訊，並透過 WebSocket 將提示轉發至 Gateway。它會將 ACP 會話對應到 Gateway 會話金鑰。

`openclaw acp` 是一個由 Gateway 支援的 ACP 橋接器，而非完整的原生 ACP 編輯器
runtime。它專注於 session 路由、prompt 傳遞和基本串流
更新。

如果您希望外部 MCP 客戶端直接與 OpenClaw 頻道對話，而不是託管 ACP harness 會話，請改用
[`openclaw mcp serve`](/zh-Hant/cli/mcp)。

## 這不是什麼

此頁面常與 ACP 鞍座會話混淆。

`openclaw acp` 意味著：

- OpenClaw 充當 ACP 伺服器
- IDE 或 ACP 用戶端連接至 OpenClaw
- OpenClaw 將工作轉發至 Gateway 會話

這與 [ACP Agents](/zh-Hant/tools/acp-agents) 不同，後者是 OpenClaw 透過 `acpx` 執行
外部 harness（例如 Codex 或 Claude Code）。

快速規則：

- 編輯器/用戶端想要與 OpenClaw 進行 ACP 通訊：使用 `openclaw acp`
- OpenClaw 應將 Codex/Claude/Gemini 作為 ACP harness 啟動：請使用 `/acp spawn` 和 [ACP Agents](/zh-Hant/tools/acp-agents)

## 相容性矩陣

| ACP 區域                                                       | 狀態   | 備註                                                                                                                                                                     |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `initialize`, `newSession`, `prompt`, `cancel`                 | 已實作 | 透過 stdio 到 Gateway chat/send + abort 的核心橋接流程。                                                                                                                 |
| `listSessions`, 斜線指令                                       | 已實作 | Session list 針對 Gateway session 狀態運作，具備有界遊標分頁和 `cwd` 篩選功能，其中 Gateway session 列包含工作區元資料；指令透過 `available_commands_update` 公告。      |
| 會譜系元資料                                                   | 已實作 | 會譜系清單和會譜系資訊快照會在 `_meta` 中包含 OpenClaw 父級和子級譜系，以便 ACP 客戶端無需私有的 Gateway 側通道即可呈現子代理圖表。                                      |
| `resumeSession`、`closeSession`                                | 已實作 | Resume 會將 ACP 會話重新綁定至現有的 Gateway 會話，而不會重播歷史記錄。Close 會取消使用中的橋接器工作，將待處理的提示解析為已取消，並釋放橋接器會話狀態。                |
| `loadSession`                                                  | 部分   | 將 ACP 會話重新綁定至 Gateway 會話金鑰，並為橋接器建立的會話重播 ACP 事件帳本歷史記錄。較舊或無帳本的會話會回退至儲存的使用者/助理文字。                                 |
| 提示內容（`text`、內嵌的 `resource`、圖片）                    | 部分   | 文字/資源會被扁平化至聊天輸入；圖片會變成 Gateway 附件。                                                                                                                 |
| 會話模式                                                       | 部分   | 支援 `session/set_mode`，且橋接器會針對思維層級、工具詳細程度、推理、使用細節和提昇動作，公開初始的 Gateway 支援會話控制。更廣泛的原生 ACP 模式/配置介面目前仍超出範圍。 |
| 會譜系資訊和使用量更新                                         | 部分   | 橋接器會從快取的 Gateway 會譜系快照發送 `session_info_update` 和盡力的 `usage_update` 通知。使用量為近似值，僅在 Gateway token 總數標記為最新時才會發送。                |
| 工具串流                                                       | 部分   | `tool_call` / `tool_call_update` 事件包含原始 I/O、文字內容，以及當 Gateway 工具參數/結果公開時的最佳檔案位置。內嵌終端機和更豐富的 diff-native 輸出仍未公開。           |
| 執行核准                                                       | 部分   | 在作用中 ACP 提示回合期間，Gateway 執行核准提示會透過 `session/request_permission` 中繼至 ACP 用戶端。                                                                   |
| 各工作階段 MCP 伺服器 (`mcpServers`)                           | 不支援 | 橋接模式會拒絕各工作階段 MCP 伺服器要求。請改為在 OpenClaw gateway 或 agent 上設定 MCP。                                                                                 |
| 用戶端檔案系統方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支援 | 橋接器不會呼叫 ACP 用戶端檔案系統方法。                                                                                                                                  |
| 用戶端終端機方法 (`terminal/*`)                                | 不支援 | 橋接器不會建立 ACP 用戶端終端機或透過工具呼叫串流終端機 ID。                                                                                                             |
| 工作階段計劃 / 思考串流                                        | 不支援 | 橋接器目前發出輸出文字和工具狀態，而非 ACP 計劃或思考更新。                                                                                                              |

## 已知限制

- `loadSession` 僅能針對橋接器建立的工作階段重播完整的 ACP 事件分類帳記錄。較舊/無分類帳的工作階段仍使用逐字稿後備機制，且不會重建歷史工具呼叫或系統通知。
- 如果多個 ACP 用戶端共用相同的 Gateway 工作階段金鑰，事件和取消路由為盡力而為，而非嚴格依每個用戶端隔離。當您需要乾淨的編輯器本地回合時，建議使用預設的隔離 `acp:<uuid>` 工作階段。
- Gateway 停止狀態會轉譯為 ACP 停止原因，但該對應不如完整的 ACP 原生執行時期具表現力。
- 初始工作階段控制項目前公開專注的 Gateway 控制項子集：思考層級、工具詳細度、推理、使用細節和提升動作。模型選擇和執行主機控制項尚未公開為 ACP 設定選項。
- `session_info_update` 和 `usage_update` 是衍生自 Gateway 工作階段快照，而非即時 ACP 原生執行時期計算。使用量為近似值，不包含成本資料，且僅在 Gateway 標記總權杖資料為最新時才會發出。
- 工具跟隨資料（Tool follow-along data）屬於盡力而為。橋接器可以呈現已知工具參數/結果中出現的檔案路徑，但目前尚不會發出 ACP 終端機或結構化檔案差異。
- 執行核准中繼（Exec approval relay）的範圍僅限於目前的 ACP 提示回合；來自其他 Gateway 工作階段的核准將被忽略。

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

使用內建 ACP 客戶端在無需 IDE 的情況下檢查橋接器的健全性。它會啟動 ACP 橋接器並讓您以互動方式輸入提示。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

權限模型 (客戶端除錯模式)：

- 自動核准基於允許清單，且僅適用於受信任的核心工具 ID。
- `read` 自動核准的範圍僅限目前工作目錄 (若設定 `--cwd` 則以其為準)。
- ACP 僅會自動核准狹隘的唯讀類別：在目前 cwd 下限定範圍的 `read` 呼叫，加上唯讀搜尋工具 (`search`、`web_search`、`memory_search`)。未知/非核心工具、超出範圍的讀取、具備執行能力的工具、控制平面工具、變異工具以及互動流程，一律需要明確的提示核准。
- 伺服器提供的 `toolCall.kind` 被視為不受信任的中繼資料 (並非授權來源)。
- 此 ACP 橋接器政策與 ACPX 測試工具權限分開。如果您透過 `acpx` 後端執行 OpenClaw，`plugins.entries.acpx.config.permissionMode=approve-all` 即為該測試工作階段的緊急備用「yolo」開關。

## 通訊協定冒煙測試

若要進行通訊協定層級的除錯，請啟動具備隔離狀態的 Gateway，並使用 ACP JSON-RPC 客戶端透過 stdio 驅動 `openclaw acp`。涵蓋 `initialize`、`session/new`、`session/list` 搭配絕對 `cwd`、`session/resume`、`session/close`、重複關閉以及遺漏恢復。

驗證應包含宣佈的生命週期功能、由 Gateway 支援的工作階段列、更新通知，以及 Gateway `sessions.list` 日誌：

```json
{
  "initialize": {
    "protocolVersion": 1,
    "agentCapabilities": {
      "sessionCapabilities": {
        "list": {},
        "resume": {},
        "close": {}
      }
    }
  },
  "listSessions": {
    "sessions": [
      {
        "sessionId": "agent:main:acp-smoke",
        "cwd": "/path/to/workspace",
        "_meta": {
          "sessionKey": "agent:main:acp-smoke",
          "kind": "direct"
        }
      }
    ],
    "nextCursor": null
  },
  "notifications": ["session_info_update", "available_commands_update", "usage_update"],
  "gatewayLogTail": ["[gateway] ready", "[ws] ⇄ res ✓ sessions.list 305ms"]
}
```

避免將 `openclaw gateway call sessions.list` 作為唯一的 ACP 證明。該 CLI 路徑可能請求新令牌的操作員範圍升級；ACP 橋接的正確性由 ACP stdio 幀以及 Gateway `sessions.list` 日誌證明。

## 如何使用

當 IDE（或其他客戶端）使用 Agent Client Protocol 並且您希望其驅動 OpenClaw Gateway 會話時，請使用 ACP。

1. 確保 Gateway 正在運行（本地或遠端）。
2. 配置 Gateway 目標（配置或標誌）。
3. 將您的 IDE 指向透過 stdio 執行 `openclaw acp`。

範例配置（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

範例直接執行（無配置寫入）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 選擇代理

ACP 不直接選擇代理。它透過 Gateway 會話金鑰進行路由。

使用代理範圍的會話金鑰來以特定代理為目標：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每個 ACP 會話對應到單個 Gateway 會話金鑰。一個代理可以擁有多個會話；除非您覆寫金鑰或標籤，否則 ACP 預設為隔離的 `acp:<uuid>` 會話。

橋接模式不支援每個會話的 `mcpServers`。如果 ACP 客戶端在 `newSession` 或 `loadSession` 期間發送它們，橋接器將返回明確錯誤，而不是靜默忽略它們。

如果您希望 ACPX 支援的會話能夠看到 OpenClaw 外掛工具或選定的內建工具（例如 `cron`），請啟用 gateway 端的 ACPX MCP 橋接器，而不是嘗試傳遞每個會話的 `mcpServers`。請參閱 [ACP Agents](/zh-Hant/tools/acp-agents-setup#plugin-tools-mcp-bridge) 和 [OpenClaw tools MCP bridge](/zh-Hant/tools/acp-agents-setup#openclaw-tools-mcp-bridge)。

## 從 `acpx` 使用（Codex、 Claude、其他 ACP 客戶端）

如果您希望編碼代理（如 Codex 或 Claude Code）透過 ACP 與您的 OpenClaw 機器人對話，請使用 `acpx` 及其內建的 `openclaw` 目標。

典型流程：

1. 執行 Gateway 並確保 ACP 橋接器可以連接到它。
2. 將 `acpx openclaw` 指向 `openclaw acp`。
3. 以您希望編碼代理使用的 OpenClaw 會話金鑰為目標。

範例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都以特定的 Gateway 和會話金鑰為目標，請在 `~/.acpx/config.json` 中覆寫 `openclaw` 代理命令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

對於存放於本機的 OpenClaw 檢出版本，請使用直接 CLI 入口點而非 dev runner，以便 ACP 串流保持乾淨。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

這是讓 Codex、Claude Code 或其他支援 ACP 的客戶端從 OpenClaw 代理程式提取背景資訊，而無須擷取終端機內容最簡單的方式。

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

若要指定特定的 Gateway 或代理程式：

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

在 Zed 中，開啟 Agent 面板並選擇「OpenClaw ACP」以啟動對話串。

## Session 對應

預設情況下，ACP 會話會取得一個具有 `acp:` 前綴的隔離 Gateway 會話金鑰。若要重用已知會話，請傳遞會話金鑰或標籤：

- `--session <key>`：使用特定的 Gateway 會話金鑰。
- `--session-label <label>`：依標籤解析現有會話。
- `--reset-session`：為該金鑰建立新的會話 ID（相同的金鑰，新的對話紀錄）。

如果您的 ACP 客戶端支援元資料，您可以針對每個會話進行覆寫：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

前往 [/concepts/session](/zh-Hant/concepts/session) 深入了解會話金鑰。

## 選項

- `--url <url>`：Gateway WebSocket URL（預設為設定時的 gateway.remote.url）。
- `--token <token>`：Gateway 驗證權杖。
- `--token-file <path>`：從檔案讀取 Gateway 驗證權杖。
- `--password <password>`：Gateway 驗證密碼。
- `--password-file <path>`：從檔案讀取 Gateway 驗證密碼。
- `--session <key>`：預設會話金鑰。
- `--session-label <label>`：要解析的預設會話標籤。
- `--require-existing`：如果會話金鑰/標籤不存在則失敗。
- `--reset-session`：在首次使用前重置會話金鑰。
- `--no-prefix-cwd`：不要在工作目錄前為提示詞加上前綴。
- `--provenance <off|meta|meta+receipt>`：包含 ACP 來源元資料或收據。
- `--verbose, -v`：將詳細記錄輸出到 stderr。

安全性說明：

- `--token` 和 `--password` 在某些系統的本機程序清單中可能是可見的。
- 偏好 `--token-file`/`--password-file` 或環境變數 (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`)。
- Gateway 身份驗證解析遵循其他 Gateway 客戶端使用的共享合約：
  - 本機模式：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 僅在 `gateway.auth.*` 未設定時回退（已設定但未解析的本機 SecretRefs 將閉鎖式失敗）
  - 遠端模式：`gateway.remote.*` 並根據遠端優先規則回退至 env/config
  - `--url` 具有覆寫安全性，不會重複使用隱含的 config/env 憑證；請傳遞明確的 `--token`/`--password`（或檔案變體）
- ACP 執行時間後端子行程會接收 `OPENCLAW_SHELL=acp`，可用於特定情境的 shell/profile 規則。
- `openclaw acp client` 會在產生的橋接行程上設定 `OPENCLAW_SHELL=acp-client`。

### `acp client` 選項

- `--cwd <dir>`：ACP 工作階段的工作目錄。
- `--server <command>`：ACP 伺服器指令（預設：`openclaw`）。
- `--server-args <args...>`：傳遞至 ACP 伺服器的額外引數。
- `--server-verbose`：在 ACP 伺服器上啟用詳細記錄。
- `--verbose, -v`：詳細的客戶端記錄。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [ACP 代理程式](/zh-Hant/tools/acp-agents)
