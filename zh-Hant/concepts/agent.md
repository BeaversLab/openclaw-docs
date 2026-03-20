---
summary: "Agent runtime (embedded pi-mono), workspace contract, and session bootstrap"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent Runtime"
---

# Agent Runtime 🤖

OpenClaw 執行單一內建代理運行環境，源自 **pi-mono**。

## Workspace (必要)

OpenClaw 使用單一 agent 工作區目錄 (`agents.defaults.workspace`) 作為工具與 context 的 agent **唯一** 工作目錄 (`cwd`)。

建議：使用 `openclaw setup` 在缺失時建立 `~/.openclaw/openclaw.json` 並初始化工作區檔案。

完整工作區佈局 + 備份指南：[Agent workspace](/zh-Hant/concepts/agent-workspace)

若啟用 `agents.defaults.sandbox`，非主要 session 可用 `agents.defaults.sandbox.workspaceRoot`) 下的各 session 工作區覆寫此設定（參見
[Gateway configuration](/zh-Hant/gateway/configuration)）。

## Bootstrap files (注入)

在 `agents.defaults.workspace` 內，OpenClaw 預期這些使用者可編輯的檔案：

- `AGENTS.md` — 操作指示 + 「記憶」
- `SOUL.md` — 角色設定、邊界、語氣
- `TOOLS.md` — 使用者維護的工具說明（例如 `imsg`、`sag`、慣例）
- `BOOTSTRAP.md` — 單次首次執行儀式（完成後刪除）
- `IDENTITY.md` — agent 名稱/氛圍/emoji
- `USER.md` — 使用者檔案 + 偏好稱呼

在新會話的第一輪對話中，OpenClaw 會將這些檔案的內容直接注入代理語境中。

空白檔案會被跳過。大型檔案會被修剪並加上標記截斷，以保持提示精簡 (請讀取檔案以取得完整內容)。

若檔案缺失，OpenClaw 會插入單行「檔案缺失」標記（且 `openclaw setup` 將建立安全的預設範本）。

`BOOTSTRAP.md` 僅會針對 **全新的工作區** 建立（無其他啟動檔案）。若你在完成儀式後刪除它，之後重新啟動時不應被重新建立。

若要完全停用啟動檔案的建立 (針對預先填種的工作區)，請設定：

```json5
{ agent: { skipBootstrap: true } }
```

## Built-in tools

核心工具（read/exec/edit/write 及相關系統工具）皆恆定可用，
但受工具政策約束。`apply_patch` 為選用項且由
`tools.exec.applyPatch` 控制存取。`TOOLS.md` **不** 控制存在哪些工具；它是
針對 _你_ 希望如何使用它們的指引。

## 技能 (Skills)

OpenClaw 從三個位置載入技能（發生名稱衝突時，工作區優先）：

- 內建（隨安裝包提供）
- 受管/本端：`~/.openclaw/skills`
- 工作區：`<workspace>/skills`

技能可以透過配置/環境進行限制（請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) 中的 `skills`）。

## pi-mono 整合

OpenClaw 重用了 pi-mono 程式碼庫的部分內容（模型/工具），但 **會話管理、探索和工具連線是由 OpenClaw 擁有的**。

- 沒有 pi-coding agent runtime。
- 不會查詢 `~/.pi/agent` 或 `<workspace>/.pi` 設定。

## 會話 (Sessions)

會話紀錄以 JSONL 格式儲存在：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

工作階段 ID 是穩定的，且由 OpenClaw 選擇。
不會讀取舊版 Pi/Tau 工作階段資料夾。

## 串流時導向 (Steering while streaming)

當佇列模式為 `steer` 時，傳入訊息會被注入到目前的執行中。
佇列會在**每次工具呼叫後**檢查；如果存在佇列訊息，
目前助手訊息中剩餘的工具呼叫將被跳過（錯誤工具
結果會顯示「因排隊的使用者訊息而跳過」），然後在下一個助手回應之前注入排隊的使用者
訊息。

當佇列模式為 `followup` 或 `collect` 時，傳入訊息會一直保留到
目前回合結束，然後新的代理回合會以排隊的負載開始。請參閱
[Queue](/zh-Hant/concepts/queue) 以了解模式 + 防抖/容量行為。

區塊串流會在完成的助手區塊完成後立即發送；它預設為**關閉**
(`agents.defaults.blockStreamingDefault: "off"`)。
透過 `agents.defaults.blockStreamingBreak` 調整邊界 (`text_end` 與 `message_end`；預設為 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制軟區塊分塊 (預設為
800–1200 個字元；優先選擇段落換行，然後是換行符；最後是句子)。
使用 `agents.defaults.blockStreamingCoalesce` 合併串流區塊以減少
單行垃圾訊息（發送前基於閒置的合併）。非 Telegram 頻道需要
明確的 `*.blockStreaming: true` 才能啟用區塊回覆。
詳細的工具摘要會在工具開始時發出（無防抖）；控制 UI
會在可用時透過代理事件串流工具輸出。
更多細節：[Streaming + chunking](/zh-Hant/concepts/streaming)。

## Model refs

配置中的模型參照（例如 `agents.defaults.model` 和 `agents.defaults.models`）會透過在 **第一個** `/` 處分割來進行解析。

- 在配置模型時請使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 風格），請包含提供者前綴（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供者，OpenClaw 會將輸入視為別名或 **預設提供者** 的模型（僅在模型 ID 中沒有 `/` 時有效）。

## Configuration (minimal)

至少設定：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（強烈建議）

---

_下一頁：[群組聊天](/zh-Hant/channels/group-messages)_ 🦞

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
