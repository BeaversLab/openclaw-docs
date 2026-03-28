---
summary: "Agent runtime, workspace contract, and session bootstrap"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent Runtime"
---

# Agent Runtime

OpenClaw runs a single embedded agent runtime.

## Workspace (required)

OpenClaw uses a single agent workspace directory (`agents.defaults.workspace`) as the agent’s **only** working directory (`cwd`) for tools and context.

Recommended: use `openclaw setup` to create `~/.openclaw/openclaw.json` if missing and initialize the workspace files.

Full workspace layout + backup guide: [Agent workspace](/zh-Hant/concepts/agent-workspace)

If `agents.defaults.sandbox` is enabled, non-main sessions can override this with
per-session workspaces under `agents.defaults.sandbox.workspaceRoot` (see
[Gateway configuration](/zh-Hant/gateway/configuration)).

## 引導檔案（已注入）

在 `agents.defaults.workspace` 內，OpenClaw 預期這些使用者可編輯的檔案：

- `AGENTS.md` — 操作指示 + 「記憶」
- `SOUL.md` — 人格、邊界、語氣
- `TOOLS.md` — 使用者維護的工具說明（例如 `imsg`、`sag`、慣例）
- `BOOTSTRAP.md` — 一次性首次執行儀式（完成後刪除）
- `IDENTITY.md` — 代理程式名稱/氛圍/表情符號
- `USER.md` — 使用者個人檔案 + 偏好稱呼

在新工作階段的第一輪，OpenClaw 會將這些檔案的內容直接注入到代理程式上下文中。

空白檔案會被跳過。大型檔案會被修剪並加上標記截斷，以保持提示簡潔（讀取檔案以取得完整內容）。

如果檔案缺失，OpenClaw 會注入單行「missing file」標記（並且 `openclaw setup` 會建立一個安全的預設範本）。

`BOOTSTRAP.md` 僅會針對**全新工作區**建立（不存在其他引導檔案）。如果您在完成儀式後將其刪除，後續重新啟動時不應會重新建立。

若要完全停用引導檔案的建立（針對預先植入的工作區），請設定：

```json5
{ agent: { skipBootstrap: true } }
```

## 內建工具

核心工具（read/exec/edit/write 及相關系統工具）始終可用，但會受到工具政策的限制。`apply_patch` 是可選的，並且受 `tools.exec.applyPatch` 控制。`TOOLS.md` **並不**控制哪些工具存在；它是關於*您*希望如何使用它們的指引。

## 技能

OpenClaw 會從三個位置載入技能（發生名稱衝突時工作區優先）：

- 內建的（隨安裝包附帶）
- 受管理/本機：`~/.openclaw/skills`
- 工作區：`<workspace>/skills`

技能可以透過設定/環境變數進行控管（請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 中的 `skills`）。

## 執行時邊界

嵌入式代理程式執行時建構於 Pi 代理程式核心（模型、工具和提示管線）之上。會話管理、探索、工具連接和通道傳遞則是該核心之上的 OpenClaw 擁有層。

## 會話

會話紀錄以 JSONL 格式儲存在：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

會話 ID 是穩定的，並由 OpenClaw 選擇。
不會讀取來自其他工具的舊版會話資料夾。

## 串流時導向

當佇列模式為 `steer` 時，傳入訊息會被注入到當前運行中。
系統會在**每次工具呼叫之後**檢查佇列；如果存在佇列訊息，
當前助理訊息中剩餘的工具呼叫將會被跳過（錯誤工具結果顯示
「因佇列使用者訊息而跳過。」），然後在下一個助理回應之前
注入佇列的使用者訊息。

當佇列模式為 `followup` 或 `collect` 時，傳入訊息將被保留，直到
當前輪次結束，然後新的代理輪次將從佇列的 payloads 開始。請參閱
[Queue](/zh-Hant/concepts/queue) 以了解模式 + debounce/cap 行為。

區塊串流會在助理區塊完成後立即發送；它
**預設關閉** (`agents.defaults.blockStreamingDefault: "off"`)。
透過 `agents.defaults.blockStreamingBreak` 調整邊界 (`text_end` vs `message_end`；預設為 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制軟區塊分塊 (預設為
800–1200 字元；偏好段落斷行，其次是換行符號；句子最後)。
使用 `agents.defaults.blockStreamingCoalesce` 合併串流區塊以減少
單行垃圾訊息 (發送前基於閒置的合併)。非 Telegram 頻道需要
明確的 `*.blockStreaming: true` 才能啟用區塊回覆。
詳細的工具摘要會在工具開始時發出 (無防抖)；如果可用，控制 UI
會透過代理程式事件串流工具輸出。
更多詳情：[Streaming + chunking](/zh-Hant/concepts/streaming)。

## Model refs

配置中的模型參考（例如 `agents.defaults.model` 和 `agents.defaults.models`）會透過在**第一個** `/` 處進行分割來解析。

- 配置模型時請使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 風格），請包含提供者前綴（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 會將輸入視為**預設提供者**的別名或模型（僅在模型 ID 中沒有 `/` 時有效）。

## 配置（最低限度）

至少設定：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（強烈建議）

---

_下一步：[群組聊天](/zh-Hant/channels/group-messages)_ 🦞
