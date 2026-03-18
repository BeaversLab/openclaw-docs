---
summary: "運行用於 IDE 整合的 ACP 橋接器"
read_when:
  - Setting up ACP-based IDE integrations
  - Debugging ACP session routing to the Gateway
title: "acp"
---

# acp

執行與 OpenClaw Gateway 通訊的 [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) 橋接器。

此命令透過 stdio 向 IDE 傳達 ACP，並透過 WebSocket 將提示轉發至 Gateway。它會將 ACP 會話對應到 Gateway 會話金鑰。

`openclaw acp` 是一個由 Gateway 支援的 ACP 橋接器，而非完整的 ACP 原生編輯器執行時。它專注於會話路由、提示傳遞和基本串流更新。

## 相容性矩陣

| ACP 區域                                                       | 狀態   | 備註                                                                                                                                                                                       |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `initialize`, `newSession`, `prompt`, `cancel`                 | 已實作 | 透過 stdio 到 Gateway chat/send + abort 的核心橋接流程。                                                                                                                                   |
| `listSessions`, 斜線指令                                       | 已實作 | 會話列表對 Gateway 會話狀態運作；指令透過 `available_commands_update` 公告。                                                                                                               |
| `loadSession`                                                  | 部分   | 將 ACP 會話重新綁定到 Gateway 會話金鑰，並重播儲存的使用者/助理文字歷史記錄。工具/系統歷史記錄尚未重構。                                                                                   |
| 提示內容 (`text`, 嵌入的 `resource`, 影像)                     | 部分   | 文字/資源會被扁平化到聊天輸入中；影像會變成 Gateway 附件。                                                                                                                                 |
| 會話模式                                                       | 部分   | `session/set_mode` 已受支援，且橋接器會公開最初的由 Gateway 支援的會話控制項，用於思考層級、工具詳細程度、推理、使用量詳細資訊和提昇動作。更廣泛的 ACP 原生模式/設定介面目前仍不在範圍內。 |
| 會話資訊與使用量更新                                           | 部分   | 橋接器會從快取的 Gateway 會話快照發出 `session_info_update` 和盡力的 `usage_update` 通知。使用量為近似值，僅在 Gateway token 總數被標記為最新時傳送。                                      |
| 工具串流                                                       | 部分   | `tool_call` / `tool_call_update` 事件包含原始 I/O、文字內容，以及當 Gateway 工具引數/結果公開時盡力的檔案位置。嵌入式終端機和更豐富的 diff 原生輸出仍未公開。                              |
| 每個會話 MCP 伺服器 (`mcpServers`)                             | 不支援 | 橋接模式會拒絕每個會話的 MCP 伺服器請求。請改在 OpenClaw Gateway 或 Agent 上設定 MCP。                                                                                                     |
| 用戶端檔案系統方法 (`fs/read_text_file`, `fs/write_text_file`) | 不支援 | 橋接器不會呼叫 ACP 用戶端檔案系統方法。                                                                                                                                                    |
| 用戶端終端機方法 (`terminal/*`)                                | 不支援 | 橋接器不會建立 ACP 用戶端終端機，也不會透過工具呼叫串流終端機 ID。                                                                                                                         |
| 會話計劃 / 思考串流                                            | 不支援 | 橋接器目前會發出輸出文字和工具狀態，而不會發出 ACP 計劃或思考更新。                                                                                                                        |

## 已知限制

- `loadSession` 會重播已儲存的使用者和助理文字歷史記錄，但不會
  重建歷史工具呼叫、系統通知或更豐富的 ACP 原生事件
  類型。
- 如果多個 ACP 用戶端共用相同的 Gateway 會話金鑰，事件和取消
  路由是盡力而為，而非嚴格按用戶端隔離。當您需要乾淨的編輯器本機
  輪次時，請優先使用預設隔離的 `acp:<uuid>` 會話。
- Gateway 停止狀態會轉換為 ACP 停止原因，但該對應
  不如完整的 ACP 原生執行時期表達豐富。
- 初始會話控制目前會顯示 Gateway 設定的專注子集：
  思考層級、工具詳細程度、推理、使用細節和提升
  動作。模型選擇和執行主機控制尚未公開為 ACP
  設定選項。
- `session_info_update` 和 `usage_update` 衍生自 Gateway 會話
  快照，而非即時 ACP 原生執行時期計算。使用量為近似值，
  不包含成本資料，且僅在 Gateway 標記總 token
  資料為最新時才會發出。
- 工具追蹤資料是盡力而為的。橋接器可以顯示已知工具
  引數/結果中出現的檔案路徑，但目前尚未發出 ACP 終端機或
  結構化檔案差異。

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

## ACP 用戶端 (除錯)

使用內建的 ACP 用戶端在沒有 IDE 的情況下對橋接器進行健全性檢查。
它會產生 ACP 橋接器並讓您以互動方式輸入提示。

```bash
openclaw acp client

# Point the spawned bridge at a remote Gateway
openclaw acp client --server-args --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token

# Override the server command (default: openclaw)
openclaw acp client --server "node" --server-args openclaw.mjs acp --url ws://127.0.0.1:19001
```

權限模型 (用戶端除錯模式)：

- 自動核准是基於允許清單，且僅適用於受信任的核心工具 ID。
- `read` 自動核准的範圍限於目前工作目錄（設定時為 `--cwd`）。
- 未知/非核心工具名稱、超出範圍的讀取作業以及危險工具一律需要明確的提示核准。
- 伺服器提供的 `toolCall.kind` 被視為不受信任的中繼資料（而非授權來源）。

## 使用方式

當 IDE（或其他用戶端）使用 Agent Client Protocol，且您希望其驅動 OpenClaw Gateway 工作階段時，請使用 ACP。

1. 請確保 Gateway 正在執行（本機或遠端）。
2. 設定 Gateway 目標（組態或旗標）。
3. 將您的 IDE 指向透過 stdio 執行 `openclaw acp`。

範例組態（已持久化）：

```bash
openclaw config set gateway.remote.url wss://gateway-host:18789
openclaw config set gateway.remote.token <token>
```

範例直接執行（不寫入組態）：

```bash
openclaw acp --url wss://gateway-host:18789 --token <token>
# preferred for local process safety
openclaw acp --url wss://gateway-host:18789 --token-file ~/.openclaw/gateway.token
```

## 選擇代理程式

ACP 不會直接選擇代理程式。它是透過 Gateway 工作階段金鑰進行路由。

使用代理程式範圍的工作階段金鑰來指定特定代理程式：

```bash
openclaw acp --session agent:main:main
openclaw acp --session agent:design:main
openclaw acp --session agent:qa:bug-123
```

每個 ACP 工作階段都對應到單一 Gateway 工作階段金鑰。一個代理程式可以擁有多個工作階段；除非您覆寫金鑰或標籤，否則 ACP 預設為隔離的 `acp:<uuid>` 工作階段。

橋接模式不支援個別工作階段的 `mcpServers`。如果 ACP 用戶端在 `newSession` 或 `loadSession` 期間傳送這些參數，橋接器會傳回明確錯誤，而不是靜默忽略它們。

## 從 `acpx` 使用（Codex、Claude 及其他 ACP 用戶端）

如果您希望 Codex 或 Claude Code 等程式設計代理程式透過 ACP 與您的 OpenClaw 機器人通訊，請使用 `acpx` 搭配其內建的 `openclaw` 目標。

典型流程：

1. 執行 Gateway，並確保 ACP 橋接器可以連線至該 Gateway。
2. 將 `acpx openclaw` 指向 `openclaw acp`。
3. 指定您希望程式設計代理程式使用的 OpenClaw 工作階段金鑰。

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

這是讓 Codex、Claude Code 或其他 ACP 感知用戶端從 OpenClaw 代理程式擷取情境資訊，而不必擷取終端機內容的最簡單方式。

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
      "args": [
        "acp",
        "--url",
        "wss://gateway-host:18789",
        "--token",
        "<token>",
        "--session",
        "agent:design:main"
      ],
      "env": {}
    }
  }
}
```

在 Zed 中，開啟 Agent 面板並選取「OpenClaw ACP」以開啟一個新對話。

## Session 對應

根據預設，ACP session 會獲得一個具有 `acp:` 前綴的獨立 Gateway session 金鑰。
若要重用已知的 session，請傳遞 session 金鑰或標籤：

- `--session <key>`：使用指定的 Gateway session 金鑰。
- `--session-label <label>`：根據標籤解析現有的 session。
- `--reset-session`：為該金鑰建立一個新的 session ID（相同的金鑰，新的對話紀錄）。

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

在 [/concepts/session](/zh-Hant/concepts/session) 深入了解 session 金鑰。

## 選項

- `--url <url>`：Gateway WebSocket URL（預設為已配置的 gateway.remote.url）。
- `--token <token>`：Gateway 驗證權杖。
- `--token-file <path>`：從檔案讀取 Gateway 驗證權杖。
- `--password <password>`：Gateway 驗證密碼。
- `--password-file <path>`：從檔案讀取 Gateway 驗證密碼。
- `--session <key>`：預設的 session 金鑰。
- `--session-label <label>`：要解析的預設 session 標籤。
- `--require-existing`：如果 session 金鑰/標籤不存在則失敗。
- `--reset-session`：在首次使用前重設 session 金鑰。
- `--no-prefix-cwd`：不要在提示詞前加上工作目錄。
- `--verbose, -v`：詳細的日誌輸出至 stderr。

安全性提示：

- `--token` 和 `--password` 在某些系統的本機程序列表中可能是可見的。
- 建議優先使用 `--token-file`/`--password-file` 或環境變數（`OPENCLAW_GATEWAY_TOKEN`、`OPENCLAW_GATEWAY_PASSWORD`）。
- Gateway 驗證解析遵循其他 Gateway 用戶端使用的共享協定：
  - local mode：env (`OPENCLAW_GATEWAY_*`) -> `gateway.auth.*` -> `gateway.remote.*` 僅在 `gateway.auth.*` 未設定時才回退（已配置但未解析的本機 SecretRefs 將會封閉式失敗）
  - 遠端模式：`gateway.remote.*`，並根據遠端優先順序規則回退至 env/config
  - `--url` 具有覆蓋安全性，不會重複使用隱式 config/env 認證；請傳遞明確的 `--token`/`--password`（或檔案變體）
- ACP 執行後端子程序會接收 `OPENCLAW_SHELL=acp`，可用於特定語境的 shell/profile 規則。
- `openclaw acp client` 在產生的橋接程序上設定 `OPENCLAW_SHELL=acp-client`。

### `acp client` 選項

- `--cwd <dir>`：ACP 會話的工作目錄。
- `--server <command>`：ACP 伺服器指令（預設：`openclaw`）。
- `--server-args <args...>`：傳遞給 ACP 伺服器的額外引數。
- `--server-verbose`：在 ACP 伺服器上啟用詳細日誌記錄。
- `--verbose, -v`：詳細的用戶端日誌記錄。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
