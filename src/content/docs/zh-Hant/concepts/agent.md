---
summary: "Agent runtime, workspace contract, and session bootstrap"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent runtime"
---

OpenClaw 運行一個 **單一的內嵌代理運行時**——每個 Gateway 一個代理程序，擁有專屬的工作區、啟動檔案和會話存儲。本頁面涵蓋了該運行時契約：工作區必須包含什麼、哪些檔案會被注入，以及會話如何針對其進行引導。

## Workspace (required)

OpenClaw 使用單個代理工作區目錄 (`agents.defaults.workspace`) 作為代理用於工具和上下文的 **唯一** 工作目錄 (`cwd`)。

建議：如果缺失，請使用 `openclaw setup` 建立 `~/.openclaw/openclaw.json` 並初始化工作區檔案。

完整的工作區佈局 + 備份指南：[Agent workspace](/zh-Hant/concepts/agent-workspace)

如果啟用了 `agents.defaults.sandbox`，非主要工作階段可以透過 `agents.defaults.sandbox.workspaceRoot` 下的每個工作階段的工作區來覆寫此設定（請參閱 [Gateway configuration](/zh-Hant/gateway/configuration)）。

## Bootstrap files (injected)

在 `agents.defaults.workspace` 內，OpenClaw 預期這些使用者可編輯的檔案：

- `AGENTS.md` - 操作指令 + "記憶"
- `SOUL.md` - 角色設定、邊界、語氣
- `TOOLS.md` - 用戶維護的工具說明（例如 `imsg`、`sag`、慣例）
- `BOOTSTRAP.md` - 一次性首次運行儀式（完成後刪除）
- `IDENTITY.md` - 代理名稱/氛圍/表情符號
- `USER.md` - 用戶資料 + 首選地址

在新會話的第一輪對話中，OpenClaw 會將這些檔案的內容注入到系統提示詞的項目上下文中。

空白檔案會被跳過。大型檔案會被修剪並用標記截斷，以保持提示精簡（讀取檔案以獲取完整內容）。

如果檔案遺失，OpenClaw 會注入一行單獨的「檔案遺失」標記（並且 `openclaw setup` 將建立一個安全的預設範本）。

`BOOTSTRAP.md` 僅為 **全新的工作區** 建立（不存在其他啟動檔案）。當它處於待處理狀態時，OpenClaw 會將其保留在項目上下文中，並為初始儀式添加系統提示詞引導，而不是將其複製到用戶訊息中。如果您在完成儀式後將其刪除，則不應在後續重啟時重新建立它。

在工作區被觀察到之後，OpenClaw 也會為工作區路徑保留一個狀態目錄證明標記。如果最近證明過的工作區消失或被清除，啟動程序將拒絕靜默重新植入 `BOOTSTRAP.md`；請還原工作區或使用完整的 onboard 重置，以便同時清除工作區和標記。

若要完全停用啟動檔案的建立（針對預先植入的工作區），請設定：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 內建工具

核心工具（讀取/執行/編輯/寫入及相關系統工具）始終可用，但需受工具政策限制。`apply_patch` 是選用的，並由 `tools.exec.applyPatch` 控制。`TOOLS.md` **並不**控制哪些工具存在；它是指導您希望如何使用它們的指南。

## 技能

OpenClaw 從以下位置載入技能（優先順序由高至低）：

- 工作區：`<workspace>/skills`
- 專案代理技能：`<workspace>/.agents/skills`
- 個人代理技能：`~/.agents/skills`
- 受管理/本機：`~/.openclaw/skills`
- 捆綁（隨安裝程式附帶）
- 額外技能資料夾：`skills.load.extraDirs`

技能根目錄可以包含分組資料夾，例如 `<workspace>/skills/personal/foo/SKILL.md`；該技能仍然以其扁平 frontmatter 名稱公開，例如 `foo`。

技能可以透過設定/環境變數進行閘道控制（請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 中的 `skills`）。

## 執行時邊界

嵌入式代理執行時由 OpenClaw 擁有：模型探索、工具連接、提示組合、工作階段管理和通道傳遞共用一個整合的執行時介面。

## 工作階段

工作階段紀錄以 JSONL 格式儲存在：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

工作階段 ID 是穩定的，並由 OpenClaw 選擇。
不會讀取來自其他工具的舊版工作階段資料夾。

## 串流時的導向

在運行過程中到達的入站提示預設會被引導至當前的運行中。
引導會在**當前助手回合完成執行其工具呼叫後**、下一次 LLM 呼叫之前進行，並且不再跳過當前助手訊息中剩餘的工具呼叫。

`/queue steer` 是預設的活躍運行行為。`/queue followup` 和
`/queue collect` 會讓訊息等待後續回合，而不是進行引導。
`/queue interrupt` 則會中止活躍的運行。請參閱 [Queue](/zh-Hant/concepts/queue)
和 [Steering queue](/zh-Hant/concepts/queue-steering) 以了解佇列和邊界行為。

區塊串流會在完成的助手區塊完成後立即發送；此功能預設**關閉** (`agents.defaults.blockStreamingDefault: "off"`)。
透過 `agents.defaults.blockStreamingBreak` 調整邊界 (`text_end` vs `message_end`；預設為 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制軟區塊分塊 (預設為
800-1200 個字元；優先選擇段落分隔，然後是換行符；最後是句子)。
使用 `agents.defaults.blockStreamingCoalesce` 合併串流區塊，以減少
單行垃圾訊息 (發送前基於閒置時間的合併)。非 Telegram 頻道需要
明確設定 `*.blockStreaming: true` 才能啟用區塊回覆。
詳細的工具摘要會在工具開始時發出 (無去抖動)；Control UI
會在可用時透過代理事件串流工具輸出。
更多詳情：[Streaming + chunking](/zh-Hant/concepts/streaming)。

## Model refs

設定中的模型引用 (例如 `agents.defaults.model` 和 `agents.defaults.models`) 會透過分割**第一個** `/` 來進行解析。

- 在設定模型時使用 `provider/model`。
- 如果模型 ID 本身包含 `/` (OpenRouter 樣式)，請包含提供者前綴 (例如：`openrouter/moonshotai/kimi-k2`)。
- 如果省略 provider，OpenClaw 會先嘗試別名，然後是該特定模型 ID 的唯一已配置 provider 匹配項，最後才回退到已配置的預設 provider。如果該 provider 不再提供已配置的預設模型，OpenClaw 將回退到第一個已配置的 provider/model，而不是顯示過時的已移除 provider 的預設值。

## 配置（最小）

至少需設定：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` （強烈建議）

---

_下一步：[群組聊天](/zh-Hant/channels/group-messages)_ 🦞

## 相關

- [Agent 工作區](/zh-Hant/concepts/agent-workspace)
- [多 Agent 路由](/zh-Hant/concepts/multi-agent)
- [會話管理](/zh-Hant/concepts/session)
