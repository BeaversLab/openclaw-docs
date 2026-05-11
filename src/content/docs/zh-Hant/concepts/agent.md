---
summary: "Agent runtime, workspace contract, and session bootstrap"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent runtime"
---

OpenClaw 執行一個 **單一內嵌的代理運行時** —— 每個 Gateway 一個代理程序，具有其自己的工作區、啟動檔案和會話儲存。本頁涵蓋了該運行時合約：工作區必須包含什麼、哪些檔案會被注入，以及會話如何對其進行啟動。

## Workspace (required)

OpenClaw 使用單一的代理工作區目錄 (`agents.defaults.workspace`) 作為工具和上下文的代理 **唯一** 工作目錄 (`cwd`)。

建議：如果缺失，請使用 `openclaw setup` 建立 `~/.openclaw/openclaw.json` 並初始化工作區檔案。

完整的工作區佈局 + 備份指南：[Agent workspace](/zh-Hant/concepts/agent-workspace)

如果啟用了 `agents.defaults.sandbox`，非主要會話可以使用 `agents.defaults.sandbox.workspaceRoot` 下的每個會話工作區來覆蓋此設置（參閱 [Gateway configuration](/zh-Hant/gateway/configuration)）。

## Bootstrap files (injected)

在 `agents.defaults.workspace` 內，OpenClaw 預期這些使用者可編輯的檔案：

- `AGENTS.md` — 操作指令 + 「記憶」
- `SOUL.md` — 人格、邊界、語氣
- `TOOLS.md` — 使用者維護的工具筆記（例如 `imsg`、`sag`、慣例）
- `BOOTSTRAP.md` — 一次性首次執行儀式（完成後刪除）
- `IDENTITY.md` — 代理名稱/氛圍/表情符號
- `USER.md` — 使用者個人檔案 + 偏好稱呼

在新會話的第一個輪次中，OpenClaw 會將這些檔案的內容直接注入到代理上下文中。

空白檔案會被跳過。大型檔案會被修剪並用標記截斷，以保持提示精簡（讀取檔案以獲取完整內容）。

如果檔案缺失，OpenClaw 會注入單行「缺失檔案」標記（並且 `openclaw setup` 將建立一個安全的預設範本）。

`BOOTSTRAP.md` 僅為 **全新的工作區** 建立（不存在其他啟動檔案）。如果您在完成儀式後將其刪除，則不應在後續重啟時重新建立。

若要完全停用啟動檔案的建立（對於已預先植入的工作區），請設定：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 內建工具

核心工具（read/exec/edit/write 及相關系統工具）始終可用，但需遵循工具原則。`apply_patch` 是選用的，並由 `tools.exec.applyPatch` 控制。`TOOLS.md` **並不**控制哪些工具存在；它是關於您希望如何使用這些工具的指引。

## 技能

OpenClaw 會從以下位置載入技能（優先順序由高至低）：

- 工作區：`<workspace>/skills`
- 專案代理程式技能：`<workspace>/.agents/skills`
- 個人代理程式技能：`~/.agents/skills`
- 受管理/本機：`~/.openclaw/skills`
- 內建（隨安裝程式提供）
- 額外技能資料夾：`skills.load.extraDirs`

技能可以透過設定/環境變數進行控管（請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 中的 `skills`）。

## 執行時期邊界

嵌入式代理程式執行時期是建構在 Pi 代理程式核心（模型、工具和提示管線）之上。會話管理、探索、工具連線和通道傳遞則是在該核心之上的 OpenClaw 擁有層。

## 會話

會話逐字稿會以 JSONL 格式儲存於：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

會話 ID 是穩定的，並由 OpenClaw 選擇。不會讀取來自其他工具的舊版會話資料夾。

## 串流時的導引

當佇列模式為 `steer` 時，傳入訊息會被注入至目前的執行中。佇列導引會在**目前助理回合完成執行其工具呼叫之後**、但在下一次 LLM 呼叫之前傳遞。導引不再會略過目前助理訊息中剩餘的工具呼叫；取而代之的是，它會在下一個模型邊界注入佇列訊息。

當佇列模式為 `followup` 或 `collect` 時，傳入訊息會被保留直到目前回合結束，然後新的代理程式回合會隨佇列的載荷開始。請參閱 [Queue](/zh-Hant/concepts/queue) 以了解模式 + 防抖/上限行為。

區塊串流會在助手區塊完成時立即發送已完成的區塊；此功能**預設關閉** (`agents.defaults.blockStreamingDefault: "off"`)。
透過 `agents.defaults.blockStreamingBreak` 調整邊界 (`text_end` vs `message_end`; 預設為 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制軟區塊分塊 (預設為
800–1200 字元; 偏好段落斷行，其次是換行符; 最後是句子)。
使用 `agents.defaults.blockStreamingCoalesce` 合併串流區塊，以減少
單行垃圾訊息 (發送前基於閒置時間合併)。非 Telegram 頻道需要
明確設定 `*.blockStreaming: true` 才能啟用區塊回覆。
詳細的工具摘要會在工具開始時發出 (無防抖); 控制 UI
會在可用時透過代理事件串流工具輸出。
更多細節: [Streaming + chunking](/zh-Hant/concepts/streaming)。

## Model refs

設定中的 Model refs (例如 `agents.defaults.model` 和 `agents.defaults.models`) 透過分割 **第一個** `/` 進行解析。

- 設定模型時請使用 `provider/model`。
- 如果模型 ID 本身包含 `/` (OpenRouter 樣式)，請包含提供者前綴 (例如: `openrouter/moonshotai/kimi-k2`)。
- 如果您省略提供者，OpenClaw 會先嘗試別名，然後是該確切模型 ID 的唯一
  已設定提供者匹配，最後才回退到
  已設定的預設提供者。如果該提供者不再公開
  已設定的預設模型，OpenClaw 會回退到第一個已設定的
  提供者/模型，而不是顯示陳舊的已移除提供者預設值。

## Configuration (minimal)

至少設定:

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (強烈建議)

---

_下一頁: [Group Chats](/zh-Hant/channels/group-messages)_ 🦞

## Related

- [Agent workspace](/zh-Hant/concepts/agent-workspace)
- [Multi-agent routing](/zh-Hant/concepts/multi-agent)
- [Session management](/zh-Hant/concepts/session)
