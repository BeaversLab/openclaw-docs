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

如果您希望外部 MCP 用戶端直接與 OpenClaw 頻道
對話，而不是託管 ACP harness session，請改用
[`openclaw mcp serve`](/zh-Hant/cli/mcp)。

## 這不是什麼

此頁面常與 ACP 鞍座會話混淆。

`openclaw acp` 意味著：

- OpenClaw 充當 ACP 伺服器
- IDE 或 ACP 用戶端連接至 OpenClaw
- OpenClaw 將工作轉發至 Gateway 會話

這與 [ACP Agents](/zh-Hant/tools/acp-agents) 不同，後者是 OpenClaw 透過 `acpx` 執行
外部 harness（如 Codex 或 Claude Code）。

快速規則：

- 編輯器/用戶端想要與 OpenClaw 進行 ACP 通訊：使用 `openclaw acp`
- OpenClaw 應該將 Codex/Claude/Gemini 作為 ACP harness 啟動：使用 `/acp spawn` 和 [ACP Agents](/zh-Hant/tools/acp-agents)

## 相容性矩陣

| ACP 區域                                                       | 狀態   | 備註                                                                                                                                                                         |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                 | 已實作 | 透過 stdio 到 Gateway chat/send + abort 的核心橋接流程。                                                                                                                     |
| `listSessions`, 斜線指令                                       | 已實作 | Session list 針對 Gateway session 狀態運作，具備有界遊標分頁和 `cwd` 篩選功能，其中 Gateway session 列包含工作區元資料；指令透過 `available_commands_update` 公告。          |
| `resumeSession`, `closeSession`                                | 已實作 | Resume 將 ACP session 重新綁定到現有的 Gateway session，而不重播歷史記錄。Close 會取消進行中的橋接器工作，將待處理的 prompts 解析為已取消，並釋放橋接器 session 狀態。       |
| `loadSession`                                                  | 部分   | 將 ACP session 重新綁定到 Gateway session 金鑰，並為橋接器建立的 session 重播 ACP 事件帳本歷史記錄。較舊或無帳本的 session 會回退到已儲存的使用者/助理文字。                 |
| Prompt 內容 (`text`, 嵌入的 `resource`, 圖片)                  | 部分   | 文字/資源被扁平化為聊天輸入；圖片變成 Gateway 附件。                                                                                                                         |
| Session 模式                                                   | 部分   | `session/set_mode` 已獲支援，橋接器公開了基於 Gateway 的初步會話控制，包括思維層級、工具詳細程度、推理、使用詳情和提升操作。更廣泛的 ACP 原生模式/配置介面目前仍不在範圍內。 |
| 會話資訊與使用量更新                                           | 部分   | 橋接器會從快取的 Gateway 會話快照發出 `session_info_update` 以及盡力而為的 `usage_update` 通知。使用量為近似值，僅在 Gateway token 總數被標記為最新時才發送。                |
| 工具串流                                                       | 部分   | 當 Gateway 工具參數/結果公開資訊時，`tool_call` / `tool_call_update` 事件會包含原始 I/O、文字內容以及盡力而為的檔案位置。嵌入式終端機和更豐富的差異原生輸出目前仍未公開。    |
| 執行核准                                                       | 部分   | 在作用中的 ACP 提示回合期間，Gateway 執行核准提示會透過 `session/request_permission` 中繼至 ACP 用戶端。                                                                     |
| 各別會話 MCP 伺服器 (`mcpServers`)                             | 不支援 | 橋接器模式會拒絕各別會話 MCP 伺服器請求。請改為在 OpenClaw gateway 或 agent 上設定 MCP。                                                                                     |
| 用戶端檔案系統方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支援 | 橋接器不會呼叫 ACP 用戶端檔案系統方法。                                                                                                                                      |
| 用戶端終端機方法 (`terminal/*`)                                | 不支援 | 橋接器不會建立 ACP 用戶端終端機或透過工具呼叫串流終端機 ID。                                                                                                                 |
| 會話計畫 / 思維串流                                            | 不支援 | 橋接器目前發出輸出文字和工具狀態，而非 ACP 計畫或思維更新。                                                                                                                  |

## 已知限制

- `loadSession` 只能為橋接器建立的會案重播完整的 ACP 事件帳本歷史記錄。較舊或無帳本的會案仍使用逐字稿備援，且不會重建歷史工具呼叫或系統通知。
- 如果多個 ACP 用戶端共用相同的 Gateway 會案金鑰，事件和取消路由為盡力而為，而非嚴格按用戶端隔離。當您需要乾淨的編輯器本機回合時，請優先使用預設的隔離 `acp:<uuid>` 會案。
- Gateway 停止狀態會轉換為 ACP 停止原因，但該對應的表達能力不如完整的 ACP 原生執行時期。
- 初始會話控制目前公開了 Gateway 選項的專注子集：
  思考層級、工具詳細程度、推理、使用量細節以及提升權限
  的動作。模型選擇和 exec-host 控制項尚未公開為 ACP
  設定選項。
- `session_info_update` 和 `usage_update` 派生自 Gateway 會話
  快照，而非即時的 ACP 原生執行時計數。使用量為近似值，
  不包含成本資料，且僅在 Gateway 將總計權杖
  資料標記為最新時才會發出。
- 工具跟隨資料為盡力而為。橋接器可以呈現已知工具參數/結果中出現的檔案路徑，
  但它尚未發出 ACP 終端機或結構化檔案差異。
- 執行批准中繼的範圍僅限於作用中的 ACP 提示輪次；來自
  其他 Gateway 會話的批准將被忽略。

## 用法

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

## ACP 用戶端（除錯）

使用內建的 ACP 用戶端來對橋接器進行健全性檢查，而無需 IDE。
它會生成 ACP 橋接器並讓您以互動方式輸入提示。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

權限模型（用戶端除錯模式）：

- 自動批准基於允許清單，且僅適用於受信任的核心工具 ID。
- `read` 自動批准的範圍僅限於目前的工作目錄（設定時為 `--cwd`）。
- ACP 僅自動批准狹窄的唯讀類別：作用中 cwd 下的範圍 `read` 呼叫加上唯讀搜尋工具（`search`、`web_search`、`memory_search`）。未知/非核心工具、超出範圍的讀取、具備執行能力的工具、控制平面工具、變異工具和互動式流程始終需要明確的提示批准。
- 伺服器提供的 `toolCall.kind` 被視為不受信任的中繼資料（非授權來源）。
- 此 ACP 橋接器政策與 ACPX 結合器權限分開。如果您透過 `acpx` 後端執行 OpenClaw，`plugins.entries.acpx.config.permissionMode=approve-all` 是該結合器會緊急情況的「yolo」開關。

## 通訊協定冒煙測試

若要進行協議層級的調試，請啟動具有隔離狀態的 Gateway，並使用 ACP JSON-RPC 用戶端透過 stdio 驅動 `openclaw acp`。覆蓋 `initialize`、`session/new`、`session/list`（含絕對 `cwd`）、`session/resume`、`session/close`、重複關閉以及缺少恢復的情況。

驗證應包含通告的生命週期功能、Gateway 支援的 session 列、更新通知以及 Gateway `sessions.list` 日誌：

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

避免僅使用 `openclaw gateway call sessions.list` 作為唯一的 ACP 驗證。該 CLI 路徑可能會請求新令牌的操作員範圍升級；ACP 橋接的正確性需透過 ACP stdio 幀以及 Gateway `sessions.list` 日誌來證明。

## 如何使用此功能

當 IDE（或其他用戶端）使用 Agent Client Protocol 並且您希望它驅動 OpenClaw Gateway session 時，請使用 ACP。

1. 確保 Gateway 正在執行（本地或遠端）。
2. 設定 Gateway 目標（config 或 flags）。
3. 將您的 IDE 指向以透過 stdio 執行 `openclaw acp`。

範例設定（持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

範例直接執行（不寫入設定）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 選擇 Agent

ACP 不直接選擇 agent。它透過 Gateway session 金鑰進行路由。

使用特定於 agent 範圍的 session 金鑰來指向特定 agent：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每個 ACP session 對應單一 Gateway session 金鑰。一個 agent 可以擁有多個 session；除非您覆寫金鑰或標籤，否則 ACP 預設為隔離的 `acp:<uuid>` session。

橋接模式不支援每個 session 的 `mcpServers`。如果 ACP 用戶端在 `newSession` 或 `loadSession` 期間發送它們，橋接器將返回明確的錯誤，而不是無聲地忽略它們。

如果您希望 ACPX 支援的 session 能夠看到 OpenClaw 外掛工具或選定的內建工具（例如 `cron`），請啟用 Gateway 端的 ACPX MCP 橋接器，而不是嘗試傳遞每個 session 的 `mcpServers`。請參閱 [ACP Agents](/zh-Hant/tools/acp-agents-setup#plugin-tools-mcp-bridge) 和 [OpenClaw tools MCP bridge](/zh-Hant/tools/acp-agents-setup#openclaw-tools-mcp-bridge)。

## 從 `acpx`（Codex、Claude、其他 ACP 用戶端）使用

如果您希望 Codex 或 Claude Code 等程式設計代理透過 ACP 與您的 OpenClaw 機器人對話，請使用 `acpx` 及其內建的 `openclaw` 目標。

典型流程：

1. 執行 Gateway 並確保 ACP 橋接器能夠連線到它。
2. 將 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望程式設計代理使用的 OpenClaw session 金鑰。

範例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都以特定的 Gateway 和 session 金鑰為目標，請在 `~/.acpx/config.json` 中覆寫 `openclaw` 代理指令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

對於本機儲存庫的 OpenClaw checkout，請使用直接的 CLI 進入點而非 dev runner，以便保持 ACP 串流乾淨。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

這是讓 Codex、Claude Code 或其他支援 ACP 的客戶端從 OpenClaw 代理擷取情境資訊而不需掃描終端機的最簡單方式。

## Zed 編輯器設定

在 `~/.config/zed/settings.json` 中新增自訂 ACP 代理（或使用 Zed 的設定 UI）：

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

若要以特定 Gateway 或代理為目標：

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

在 Zed 中，開啟 Agent 面板並選取「OpenClaw ACP」以開始對話串。

## Session 對應

預設情況下，ACP sessions 會取得具有 `acp:` 前綴的獨立 Gateway session 金鑰。
若要重用已知 session，請傳遞 session 金鑰或標籤：

- `--session <key>`：使用特定的 Gateway session 金鑰。
- `--session-label <label>`：透過標籤解析現有的 session。
- `--reset-session`：為該金鑰建立新的 session id（相同金鑰，新的對話記錄）。

如果您的 ACP 客戶端支援元資料，您可以針對每個 session 進行覆寫：

```json
{
  "_meta": {
    "sessionKey": "agent:main:main",
    "sessionLabel": "support inbox",
    "resetSession": true
  }
}
```

在 [/concepts/session](/zh-Hant/concepts/session) 深入了解 session 金鑰。

## 選項

- `--url <url>`：Gateway WebSocket URL（若已設定，預設為 gateway.remote.url）。
- `--token <token>`：Gateway 驗證權杖。
- `--token-file <path>`：從檔案讀取 Gateway 驗證權杖。
- `--password <password>`：Gateway 驗證密碼。
- `--password-file <path>`：從檔案讀取 Gateway 驗證密碼。
- `--session <key>`：預設 session 金鑰。
- `--session-label <label>`：要解析的預設 session 標籤。
- `--require-existing`：若 session 金鑰/標籤不存在則失敗。
- `--reset-session`：首次使用前重設 session key。
- `--no-prefix-cwd`：請勿在工作目錄前為提示加上前綴。
- `--provenance <off|meta|meta+receipt>`：包含 ACP 來源元資料或收據。
- `--verbose, -v`：輸出詳細記錄到 stderr。

安全性備註：

- 在某些系統上，`--token` 和 `--password` 可能會在本地程序列表中可見。
- 建議優先使用 `--token-file`/`--password-file` 或環境變數 (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`)。
- Gateway 驗證解析遵循其他 Gateway 用戶端使用的共享合約：
  - 本地模式：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 僅在 `gateway.auth.*` 未設置時回退 (已配置但未解析的本地 SecretRefs 將會閉合失敗)
  - 遠端模式：`gateway.remote.*`，並根據遠端優先順序規則回退至 env/config
  - `--url` 具有覆蓋安全性，不會重用隱含的 config/env 憑證；請傳遞明確的 `--token`/`--password` (或檔案變體)
- ACP 執行後端子程序會接收 `OPENCLAW_SHELL=acp`，這可用於特定於上下文的 shell/profile 規則。
- `openclaw acp client` 會在產生的橋接程序上設定 `OPENCLAW_SHELL=acp-client`。

### `acp client` 選項

- `--cwd <dir>`：ACP session 的工作目錄。
- `--server <command>`：ACP 伺服器指令 (預設：`openclaw`)。
- `--server-args <args...>`：傳遞給 ACP 伺服器的額外引數。
- `--server-verbose`：在 ACP 伺服器上啟用詳細記錄。
- `--verbose, -v`：詳細的客戶端記錄。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [ACP 代理程式](/zh-Hant/tools/acp-agents)
