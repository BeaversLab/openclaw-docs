---
summary: "Agent runtime, workspace contract, and session bootstrap"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent Runtime"
---

# Agent Runtime

OpenClaw 運行一個單一的嵌入式 Agent 運行時。

## Workspace (必要)

OpenClaw 使用單一 Agent 工作區目錄 (`agents.defaults.workspace`) 作為工具和上下文的 Agent **唯一** 工作目錄 (`cwd`)。

建議：使用 `openclaw setup` 來建立 `~/.openclaw/openclaw.json`（如果缺失）並初始化工作區文件。

完整的工作區佈局 + 備份指南：[Agent 工作區](/zh-Hant/concepts/agent-workspace)

如果啟用了 `agents.defaults.sandbox`，非主要會話可以在 `agents.defaults.sandbox.workspaceRoot` 下使用各會話專屬的工作區來覆寫此設定（請參閱 [Gateway 設定](/zh-Hant/gateway/configuration)）。

## Bootstrap files (注入)

在 `agents.defaults.workspace` 內部，OpenClaw 預期這些使用者可編輯的文件：

- `AGENTS.md` — 操作指令 + “記憶”
- `SOUL.md` — 人格、邊界、語氣
- `TOOLS.md` — 使用者維護的工具註記（例如 `imsg`、`sag`、慣例）
- `BOOTSTRAP.md` — 一次性首次運行儀式（完成後刪除）
- `IDENTITY.md` — Agent 名稱/氛圍/表情符號
- `USER.md` — 使用者資料 + 偏好稱呼

在新會話的第一輪中，OpenClaw 會將這些文件的內容直接注入到 Agent 上下文中。

空白文件會被跳過。大文件會被修剪並用標記截斷，以保持提示簡潔（讀取文件以獲取完整內容）。

如果文件缺失，OpenClaw 會注入單行“文件缺失”標記（並且 `openclaw setup` 將建立一個安全的預設模板）。

`BOOTSTRAP.md` 僅為 **全新的工作區** 建立（不存在其他引導文件）。如果您在完成儀式後將其刪除，則不應在後續重啟時重新建立它。

要完全禁用引導文件的建立（對於預先播種的工作區），請設置：

```json5
{ agent: { skipBootstrap: true } }
```

## 內建工具

核心工具（讀取/執行/編輯/寫入及相關系統工具）始終可用，但需遵循工具策略。`apply_patch` 是可選的，並由 `tools.exec.applyPatch` 控制存取。`TOOLS.md` **不會**控制存在哪些工具；它僅提供關於 _你_ 希望如何使用這些工具的指引。

## 技能

OpenClaw 會從這些位置載入技能（優先順序由高至低）：

- 工作區：`<workspace>/skills`
- 專案代理技能：`<workspace>/.agents/skills`
- 個人代理技能：`~/.agents/skills`
- 受管理/本機：`~/.openclaw/skills`
- 內建（隨安裝版本附帶）
- 額外的技能資料夾：`skills.load.extraDirs`

技能可以透過設定/環境變數來控管（請參閱 [Gateway 設定](/zh-Hant/gateway/configuration) 中的 `skills`）。

## 執行時邊界

嵌入式代理執行時建構於 Pi 代理核心（模型、工具和提示管線）之上。會話管理、探索、工具接線和通道傳遞則是 OpenClaw 在該核心之上的擁有層級。

## 會話

會話記錄會以 JSONL 格式儲存於：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

會話 ID 是穩定的，且由 OpenClaw 選取。
不會讀取來自其他工具的舊版會話資料夾。

## 串流時導引

當佇列模式為 `steer` 時，傳入訊息會被注入到目前的執行中。
排入佇列的導引訊息會在 **目前助理回合完成執行其工具呼叫後**、下次 LLM 呼叫前傳遞。導引功能不再會跳過目前助理訊息中剩餘的工具呼叫；相反地，它會在下一個模型邊界注入排入佇列的訊息。

當佇列模式為 `followup` 或 `collect` 時，傳入訊息會保留直到目前回合結束，然後新的代理回合會以排入佇列的負載開始。請參閱 [佇列](/zh-Hant/concepts/queue) 以了解模式 + 防抖/容量限制行為。

區塊串流會在完成後立即發送已完成的助理區塊；預設為**關閉** (`agents.defaults.blockStreamingDefault: "off"`)。
透過 `agents.defaults.blockStreamingBreak` 調整邊界 (`text_end` vs `message_end`；預設為 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制軟區塊分塊 (預設為
800–1200 個字元；優先使用段落分隔，然後是換行；最後是句子)。
使用 `agents.defaults.blockStreamingCoalesce` 合併串流區塊，以減少
單行垃圾訊息 (發送前基於閒置的合併)。非 Telegram 頻道需要
明確指定 `*.blockStreaming: true` 才能啟用區塊回覆。
詳細的工具摘要會在工具開始時發出 (無防抖)；控制 UI
會在可用時透過代理事件串流工具輸出。
更多細節：[Streaming + chunking](/zh-Hant/concepts/streaming)。

## Model refs

組態中的 Model refs (例如 `agents.defaults.model` 和 `agents.defaults.models`) 會透過在 **第一個** `/` 處分割來解析。

- 在設定模型時使用 `provider/model`。
- 如果模型 ID 本身包含 `/` (OpenRouter 風格)，請包含提供者前綴 (例如：`openrouter/moonshotai/kimi-k2`)。
- 如果您省略提供者，OpenClaw 會先嘗試別名，然後是該特定模型 ID 的唯一
  已設定提供者匹配，只有在那之後才會回退
  到已設定的預設提供者。如果該提供者不再公開
  已設定的預設模型，OpenClaw 會回退到第一個已設定的
  提供者/模型，而不是顯示陳舊的已移除提供者預設值。

## Configuration (minimal)

至少設定：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (強烈建議)

---

_下一頁：[Group Chats](/zh-Hant/channels/group-messages)_ 🦞
