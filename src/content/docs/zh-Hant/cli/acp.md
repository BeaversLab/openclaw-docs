---
summary: "運行 ACP 橋接器以用於 IDE 整合"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

執行與 OpenClaw Gateway 通訊的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 橋接器。

此指令透過 stdio 對 IDE 講述 ACP，並透過 WebSocket 將提示轉發至 Gateway。它會將 ACP 會話對應至 Gateway 會話金鑰。

`openclaw acp` 是一個由 Gateway 支援的 ACP 橋接器，而非完整的 ACP 原生編輯器執行環境。它專注於會話路由、提示傳遞以及基本的串流更新。

## 相容性矩陣

| ACP 區域                                                       | 狀態   | 備註                                                                                                                                                                                      |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                 | 已實作 | 透過 stdio 到 Gateway chat/send + abort 的核心橋接流程。                                                                                                                                  |
| `listSessions`，斜線指令                                       | 已實作 | Session list 針對 Gateway session state 運作；指令透過 `available_commands_update` 公告。                                                                                                 |
| `loadSession`                                                  | 部分   | 將 ACP session 重新綁定至 Gateway session key 並重播儲存的 user/assistant 文字記錄。Tool/system 記錄尚未重建。                                                                            |
| 提示內容 (`text`，嵌入式 `resource`，圖片)                     | 部分   | 文字/資源被扁平化為聊天輸入；圖片變成 Gateway 附件。                                                                                                                                      |
| Session 模式                                                   | 部分   | `session/set_mode` 已支援，且此橋接器公開了初始的 Gateway 支援 session 控制項，用於思考層級、工具詳細程度、推理、使用詳細資訊和提昇動作。更廣泛的 ACP 原生模式/設定介面目前仍不在範圍內。 |
| Session 資訊與使用更新                                         | 部分   | 橋接器從快取的 Gateway 會話快照中發出 `session_info_update` 和盡最大努力的 `usage_update` 通知。用量為近似值，僅在 Gateway token 總數被標記為最新時發送。                                 |
| 工具串流                                                       | 部分   | 當 Gateway 工具參數/結果提供資訊時，`tool_call` / `tool_call_update` 事件包含原始 I/O、文字內容和盡最大努力的檔案位置。嵌入式終端機和更豐富的原生 diff 輸出仍未公開。                     |
| 每個會話的 MCP 伺服器 (`mcpServers`)                           | 不支援 | 橋接模式會拒絕每個會話的 MCP 伺服器請求。請改為在 OpenClaw gateway 或代理上設定 MCP。                                                                                                     |
| 客戶端檔案系統方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支援 | 橋接器不會呼叫 ACP 客戶端檔案系統方法。                                                                                                                                                   |
| 客戶端終端機方法 (`terminal/*`)                                | 不支援 | 此橋接器不會建立 ACP 客戶端終端機或透過工具呼叫串流終端機 ID。                                                                                                                            |
| 工作階段計畫 / 思考串流                                        | 不支援 | 橋接器目前會發送輸出文字和工具狀態，而不會發送 ACP 計畫或思考更新。                                                                                                                       |

## 已知限制

- `loadSession` 會重播儲存的使用者和助理文字歷史紀錄，但不會
  重建歷史工具呼叫、系統通知或更豐富的 ACP 原生事件
  類型。
- 如果多個 ACP 客戶端共用相同的 Gateway 工作階段金鑰，事件和取消
  路由將盡力而為，而非嚴格按客戶端隔離。當您需要乾淨的編輯器本機
  互動時，建議使用預設隔離的 `acp:<uuid>` 工作階段。
- Gateway 停止狀態會轉換為 ACP 停止原因，但該對應的
  表達能力低於完全 ACP 原生的執行環境。
- 初始工作階段控制目前顯示一組專注的 Gateway 控制項：
  思考層級、工具詳細程度、推理、使用詳細資訊，以及提升權限的
  動作。模型選擇和 exec-host 控制項尚未公開為 ACP
  設定選項。
- `session_info_update` 和 `usage_update` 派生自 Gateway 工作階段
  快照，而非即時的 ACP 原生執行時間計算。使用量為近似值，
  不包含成本資料，且僅在 Gateway 將總權杖
  資料標記為最新時發出。
- 工具跟隨資料是盡力而為的。橋接器可以顯示出現在已知工具參數/結果中的
  檔案路徑，但它尚未發出 ACP 終端機或
  結構化檔案差異。

## 使用方式

```exec
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

## ACP 客戶端 (偵錯)

使用內建 ACP 客戶端在沒有 IDE 的情況下對橋接器進行健全性檢查。
它會產生 ACP 橋接器並讓您以互動方式輸入提示。

```exec
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

權限模型 (客戶端偵錯模式)：

- 自動核准是基於允許清單的，且僅適用於受信任的核心工具 ID。
- `read` 自動核准的範圍限於目前的工作目錄（若設定則為 `--cwd`）。
- 未知的/非核心工具名稱、超出範圍的讀取以及危險的工具總是需要明確的提示核准。
- 伺服器提供的 `toolCall.kind` 被視為不受信任的中繼資料（並非授權來源）。

## 如何使用此功能

當 IDE（或其他用戶端）使用 Agent Client Protocol 且您希望
其驅動 OpenClaw Gateway 工作階段時，請使用 ACP。

1. 確保 Gateway 正在執行（本地或遠端）。
2. 設定 Gateway 目標（設定或旗標）。
3. 將您的 IDE 指向以透過 stdio 執行 `openclaw acp`。

設定範例（已儲存）：

```exec
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

直接執行範例（不寫入設定）：

```exec
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 選擇代理程式

ACP 不會直接挑選代理程式。它是根據 Gateway 工作階段金鑰進行路由。

使用代理範圍的會話金鑰來指定特定的代理：

```exec
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每個 ACP 會話對應到單一個 Gateway 會話金鑰。一個代理可以擁有許多會話；除非您覆寫金鑰或標籤，否則 ACP 預設為獨立的 `acp:<uuid>` 會話。

橋接模式不支援每個會話的 `mcpServers`。如果 ACP 用戶端在 `newSession` 或 `loadSession` 期間發送這些設定，橋接器會傳回明確的錯誤，而不是無聲地忽略它們。

## 從 `acpx` (Codex, Claude, 其他 ACP 用戶端) 使用

如果您希望 Codex 或 Claude Code 等編碼代理透過 ACP 與您的 OpenClaw 機器人通訊，請使用 `acpx` 及其內建的 `openclaw` 目標。

典型流程：

1. 執行 Gateway 並確保 ACP 橋接器可以連線到它。
2. 將 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望編碼代理使用的 OpenClaw 會話金鑰。

範例：

```exec
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都鎖定特定的 Gateway 和會話金鑰，請在 `~/.acpx/config.json` 中覆寫 `openclaw` 代理指令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

對於本機 OpenClaw 檢出，請使用直接 CLI 進入點而非 dev runner，以保持 ACP 串流乾淨。例如：

```exec
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

這是讓 Codex、Claude Code 或其他支援 ACP 的客戶端從 OpenClaw 代理提取上下文資訊而無需擷取終端機的最簡單方法。

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

若要鎖定特定的 Gateway 或代理：

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

在 Zed 中，開啟 Agent 面板並選擇「OpenClaw ACP」以開始新對話。

## 會話映射

根據預設，ACP 工作階段會取得具有 `acp:` 前綴的獨立 Gateway 工作階段金鑰。
若要重用已知的工作階段，請傳遞工作階段金鑰或標籤：

- `--session <key>`：使用特定的 Gateway 工作階段金鑰。
- `--session-label <label>`：根據標籤解析現有的工作階段。
- `--reset-session`：為該金鑰建立一個新的工作階段 ID（相同的金鑰，新的對話紀錄）。

如果您的 ACP 用戶端支援元資料，您可以針對每個工作階段進行覆寫：

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

- `--url <url>`：Gateway WebSocket URL（預設為已配置的 gateway.remote.url）。
- `--token <token>`：Gateway 驗證權杖。
- `--token-file <path>`：從檔案讀取 Gateway 驗證權杖。
- `--password <password>`：Gateway 驗證密碼。
- `--password-file <path>`：從檔案讀取 Gateway 驗證密碼。
- `--session <key>`：預設 session 金鑰。
- `--session-label <label>`：要解析的預設 session 標籤。
- `--require-existing`：如果 session 金鑰/標籤不存在則失敗。
- `--reset-session`：在首次使用前重設 session 金鑰。
- `--no-prefix-cwd`：不要在工作目錄前為提示加前綴。
- `--verbose, -v`：詳細記錄到 stderr。

安全性備註：

- `--token` 和 `--password` 可能會在某些系統的本機進程列表中可見。
- 建議優先使用 `--token-file`/`--password-file` 或環境變數 (`OPENCLAW_GATEWAY_TOKEN`, `OPENCLAW_GATEWAY_PASSWORD`)。
- Gateway 驗證解析遵循其他 Gateway 用戶端使用的共享協定：
  - 本地模式：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 僅在 `gateway.auth.*` 未設定時才進行後備（已設定但未解析的本地 SecretRefs 將封閉失敗）
  - 遠端模式：`gateway.remote.*` 搭配 env/config 後備，依遠端優先順序規則執行
  - `--url` 具有覆寫安全性，不會重複使用隱式 config/env 憑證；請傳遞明確的 `--token`/`--password`（或檔案變體）
- ACP 運行後端子行程會接收 `OPENCLAW_SHELL=acp`，可用於特定於環境的 shell/profile 規則。
- `openclaw acp client` 會在產生的橋接程序上設定 `OPENCLAW_SHELL=acp-client`。

### `acp client` 選項

- `--cwd <dir>`：ACP 工作階段的工作目錄。
- `--server <command>`：ACP 伺服器指令（預設：`openclaw`）。
- `--server-args <args...>`：傳遞給 ACP 伺服器的額外引數。
- `--server-verbose`：啟用 ACP 伺服器上的詳細記錄。
- `--verbose, -v`：詳細的用戶端記錄。
