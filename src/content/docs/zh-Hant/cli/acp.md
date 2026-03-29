---
summary: "運行用於 IDE 整合的 ACP 橋接器"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

運行與 OpenClaw Gateway 通訊的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 橋接器。

此命令透過 stdio 與 IDE 進行 ACP 通訊，並透過 WebSocket 將提示轉發至 Gateway。它將 ACP 會話對應到 Gateway 會話金鑰。

`openclaw acp` 是一個由 Gateway 支援的 ACP 橋接器，而非完整的 ACP 原生編輯器執行環境。它專注於會話路由、提示傳遞和基本串流更新。

## 相容性矩陣

| ACP 區域                                                       | 狀態   | 備註                                                                                                                                                                               |
| -------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initialize`, `newSession`, `prompt`, `cancel`                 | 已實作 | 透過 stdio 到 Gateway chat/send + abort 的核心橋接流程。                                                                                                                           |
| `listSessions`, 斜線指令                                       | 已實作 | 會話列表對 Gateway 會話狀態運作；指令透過 `available_commands_update` 宣告。                                                                                                       |
| `loadSession`                                                  | 部分   | 將 ACP 會話重新綁定到 Gateway 會話金鑰，並重新播放儲存的使用者/助理文字歷史記錄。工具/系統歷史記錄尚未重建。                                                                       |
| 提示內容 (`text`, 嵌入的 `resource`, 圖片)                     | 部分   | 文字/資源被扁平化為聊天輸入；圖片成為 Gateway 附件。                                                                                                                               |
| 會話模式                                                       | 部分   | 支援 `session/set_mode`，且橋接器公開了初始的由 Gateway 支援的會話控制，用於思維層級、工具詳細程度、推理、使用量詳細資訊和提昇動作。更廣泛的 ACP 原生模式/配置介面目前仍超出範圍。 |
| 會話資訊和使用量更新                                           | 部分   | 橋接器從快取的 Gateway 會話快照發出 `session_info_update` 和盡力而為的 `usage_update` 通知。使用量為近似值，僅在 Gateway token 總數被標記為最新時才會傳送。                        |
| 工具串流                                                       | 部分   | 當 Gateway 工具引數/結果公開時，`tool_call` / `tool_call_update` 事件包含原始 I/O、文字內容和盡力而為的檔案位置。嵌入式終端機和更豐富的 diff 原生輸出尚未公開。                    |
| 個別會話 MCP 伺服器 (`mcpServers`)                             | 不支援 | 橋接模式會拒絕個別會話 MCP 伺服器請求。請改為在 OpenClaw Gateway 或 Agent 上設定 MCP。                                                                                             |
| 客戶端檔案系統方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支援 | 橋接器不會呼叫 ACP 客戶端檔案系統方法。                                                                                                                                            |
| 客戶端終端機方法 (`terminal/*`)                                | 不支援 | 橋接器不會建立 ACP 客戶端終端機，或透過工具呼叫串流終端機 ID。                                                                                                                     |
| 會話計畫 / 思考串流                                            | 不支援 | 橋接器目前會輸出文字和工具狀態，而非 ACP 計畫或思考更新。                                                                                                                          |

## 已知限制

- `loadSession` 會重播儲存的使用者和助手文字歷史紀錄，但不會重建歷史工具呼叫、系統通知或更豐富的 ACP 原生事件類型。
- 如果多個 ACP 客戶端共享同一個 Gateway 會話金鑰，事件和取消路由僅為盡力而為，而非嚴格地按客戶端隔離。當您需要乾淨的編輯器本機輪次時，請優先使用預設的隔離 `acp:<uuid>` 會話。
- Gateway 停止狀態會轉換為 ACP 停止原因，但該對應不如完整的 ACP 原生執行階段表現力豐富。
- 初始會話控制目前會公開 Gateway 設定的一個專注子集：思考層級、工具詳細程度、推理、使用詳細資訊和提升動作。模型選擇和執行主機控制尚未公開為 ACP 設定選項。
- `session_info_update` 和 `usage_update` 是從 Gateway 會話快照衍生而來，而非即時的 ACP 原生執行階段計算。使用量為近似值，不包含成本資料，且僅在 Gateway 將總 Token 資料標記為最新時才會發出。
- 工具跟隨資料為盡力而為。橋接器可以公開出現在已知工具引數/結果中的檔案路徑，但目前尚未發出 ACP 終端機或結構化檔案差異。

## 使用方法

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

## ACP 客戶端 (偵錯)

使用內建的 ACP 客戶端來在沒有 IDE 的情況下檢查橋接器是否正常運作。它會產生 ACP 橋接器，並讓您以互動方式輸入提示。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

權限模型 (客戶端偵錯模式)：

- 自動核准基於允許清單，且僅適用於受信任的核心工具 ID。
- `read` 自動核准的範圍僅限於目前工作目錄（設定時即為 `--cwd`）。
- 未知/非核心工具名稱、超出範圍的讀取以及危險工具一律需要明確的提示核准。
- 伺服器提供的 `toolCall.kind` 被視為不可信賴的中繼資料（並非授權來源）。

## 如何使用

當 IDE（或其他用戶端）使用 Agent Client Protocol 且您希望它驅動 OpenClaw Gateway 工作階段時，請使用 ACP。

1. 確保 Gateway 正在執行（本地或遠端）。
2. 設定 Gateway 目標（設定或旗標）。
3. 將您的 IDE 指向透過 stdio 執行 `openclaw acp`。

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

## 選擇代理程式

ACP 不會直接選擇代理程式。它是透過 Gateway 工作階段金鑰進行路由。

使用代理程式範圍的工作階段金鑰來指定特定的代理程式：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每個 ACP 工作階段對應至單一 Gateway 工作階段金鑰。一個代理程式可以擁有多個工作階段；除非您覆寫金鑰或標籤，否則 ACP 預設為隔離的 `acp:<uuid>` 工作階段。

橋接模式不支援個別工作階段的 `mcpServers`。如果 ACP 用戶端在 `newSession` 或 `loadSession` 期間發送這些內容，橋接器會傳回明確的錯誤，而不是無聲地忽略它們。

## 從 `acpx` 使用（Codex、Claude 及其他 ACP 用戶端）

如果您希望 Codex 或 Claude Code 等編碼代理程式透過 ACP 與您的 OpenClaw 機器人對話，請使用 `acpx` 及其內建的 `openclaw` 目標。

典型流程：

1. 執行 Gateway 並確保 ACP 橋接器可以連線到它。
2. 將 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望編碼代理程式使用的 OpenClaw 工作階段金鑰。

範例：

```bash
# One-shot request into your default OpenClaw ACP session
acpx openclaw exec "Summarize the active OpenClaw session state."

# Persistent named session for follow-up turns
acpx openclaw sessions ensure --name codex-bridge
acpx openclaw -s codex-bridge --cwd /path/to/repo \
  "Ask my OpenClaw work agent for recent context relevant to this repo."
```

如果您希望 `acpx openclaw` 每次都指向特定的 Gateway 和工作階段金鑰，請在 `~/.acpx/config.json` 中覆寫 `openclaw` 代理程式指令：

```json
{
  "agents": {
    "openclaw": {
      "command": "env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 openclaw acp --url ws://127.0.0.1:18789 --token-file ~/.openclaw/gateway.token --session agent:main:main"
    }
  }
}
```

對於存放區本機的 OpenClaw 檢出，請使用直接 CLI 進入點而非開發執行器，以保持 ACP 串流乾淨。例如：

```bash
env OPENCLAW_HIDE_BANNER=1 OPENCLAW_SUPPRESS_NOTES=1 node openclaw.mjs acp ...
```

這是讓 Codex、Claude Code 或其他支援 ACP 的用戶端從 OpenClaw 代理程式提取背景資訊而無需擷取終端機的最簡單方法。

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

在 Zed 中，開啟 Agent 面板並選取「OpenClaw ACP」以啟動對話。

## Session 對應

預設情況下，ACP 會話會取得具有 `acp:` 前綴的獨立 Gateway 會話金鑰。
若要重複使用已知的會話，請傳遞會話金鑰或標籤：

- `--session <key>`：使用特定的 Gateway 會話金鑰。
- `--session-label <label>`：根據標籤解析現有會話。
- `--reset-session`：為該金鑰建立新的會話 ID（相同的金鑰，新的對話紀錄）。

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

- `--url <url>`：Gateway WebSocket URL（預設為設定時的 gateway.remote.url）。
- `--token <token>`：Gateway 驗證權杖。
- `--token-file <path>`：從檔案讀取 Gateway 驗證權杖。
- `--password <password>`：Gateway 驗證密碼。
- `--password-file <path>`：從檔案讀取 Gateway 驗證密碼。
- `--session <key>`：預設會話金鑰。
- `--session-label <label>`：預設要解析的會話標籤。
- `--require-existing`：如果會話金鑰/標籤不存在則失敗。
- `--reset-session`：在首次使用前重設會話金鑰。
- `--no-prefix-cwd`：不要在工作目錄前綴提示詞。
- `--verbose, -v`：詳細記錄至 stderr。

安全性備註：

- 在某些系統上，`--token` 和 `--password` 可能會在本機程序列表中顯示。
- 建議優先使用 `--token-file`/`--password-file` 或環境變數（`OPENCLAW_GATEWAY_TOKEN`、`OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway 驗證解析遵循其他 Gateway 用戶端使用的共用合約：
  - 本機模式：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 僅在 `gateway.auth.*` 未設定時回退（已設定但未解析的本機 SecretRefs 將失敗關閉）
  - 遠端模式：`gateway.remote.*` 並根據遠端優先順序規則進行 env/config 備援
  - `--url` 是覆寫安全的，不會重複使用隱含的 config/env 憑證；請傳遞明確的 `--token`/`--password`（或檔案變體）
- ACP 執行時期後端子程序會接收 `OPENCLAW_SHELL=acp`，可用於特定於上下文的 shell/profile 規則。
- `openclaw acp client` 在產生的 bridge 程序上設定 `OPENCLAW_SHELL=acp-client`。

### `acp client` 選項

- `--cwd <dir>`：ACP 階段的工作目錄。
- `--server <command>`：ACP 伺服器指令（預設值：`openclaw`）。
- `--server-args <args...>`：傳遞給 ACP 伺服器的額外引數。
- `--server-verbose`：在 ACP 伺服器上啟用詳細記錄。
- `--verbose, -v`：詳細的客戶端記錄。
