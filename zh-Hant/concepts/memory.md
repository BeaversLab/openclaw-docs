---
title: "記憶"
summary: "OpenClaw 記憶運作方式（工作區檔案 + 自動記憶排空）"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# 記憶

OpenClaw 記憶是**代理工作區中的純 Markdown**。這些檔案是真相來源；模型只會「記住」寫入磁碟的內容。

記憶搜尋工具由作用中的記憶外掛提供（預設為：
`memory-core`）。使用 `plugins.slots.memory = "none"` 停用記憶外掛。

## 記憶檔案 (Markdown)

預設的工作區佈局使用兩層記憶：

- `memory/YYYY-MM-DD.md`
  - 每日日誌（僅附加）。
  - 在會話開始時讀取今天與昨天的內容。
- `MEMORY.md`（選用）
  - 策展長期記憶。
  - 如果工作區根目錄同時存在 `MEMORY.md` 和 `memory.md`，OpenClaw 僅載入 `MEMORY.md`。
  - 小寫的 `memory.md` 僅在 `MEMORY.md` 不存在時作為後備方案使用。
  - **僅在主要私人工作階段中載入**（絕不要在群組情境中載入）。

這些檔案位於工作區下（`agents.defaults.workspace`，預設為
`~/.openclaw/workspace`）。完整配置請參閱 [Agent workspace](/zh-Hant/concepts/agent-workspace)。

## 記憶工具

OpenClaw 為這些 Markdown 檔案提供了兩個供代理使用的工具：

- `memory_search` -- 針對已索引片段的語意回溯。
- `memory_get` -- 針對特定 Markdown 檔案/行範圍的目標性讀取。

`memory_get` 現在**當檔案不存在時會優雅降級**（例如，在第一次寫入之前的當日每日記錄）。內建管理器和 QMD 後端都會回傳 `{ text: "", path }` 而非拋出 `ENOENT`，因此代理人可以處理「尚未記錄任何內容」的情況並繼續其工作流程，而無需將工具呼叫包裝在 try/catch 邏輯中。

## 何時寫入記憶

- 決策、偏好設定和持久事實會放入 `MEMORY.md`。
- 日常筆記和持續的語境會放入 `memory/YYYY-MM-DD.md`。
- 如果有人說「記住這個」，請將其寫下（不要保留在 RAM 中）。
- 此領域仍在發展中。提醒模型儲存記憶會有所幫助；它會知道該怎麼做。
- 如果您希望某些資訊被保留，**請要求機器人將其寫入**記憶。

## 自動記憶刷新（壓縮前 Ping）

當會話**接近自動壓縮**時，OpenClaw 會觸發一個**靜默的 Agent 回合**，提醒模型在上下文被壓縮**之前**寫入持久化記憶。預設提示詞明確指出模型*可以回覆*，但通常 `NO_REPLY` 是正確的回應，因此使用者永遠看不到這個回合。

這由 `agents.defaults.compaction.memoryFlush` 控制：

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

詳細資訊：

- **軟性閾值 (Soft threshold)**：當會話 Token 估算值超過
  `contextWindow - reserveTokensFloor - softThresholdTokens` 時觸發刷新。
- **預設為靜默**：提示詞包含 `NO_REPLY`，因此不會傳送任何內容。
- **兩個提示詞**：一個使用者提示詞加上一個系統提示詞來附加提醒。
- **每個壓縮週期一次刷新**（在 `sessions.json` 中追蹤）。
- **工作區必須可寫入**：如果會話在沙箱中運行，使用
  `workspaceAccess: "ro"` 或 `"none"`，則會跳過刷新。

如需完整的壓縮生命週期，請參閱
[Session management + compaction](/zh-Hant/reference/session-management-compaction)。

## 向量記憶體搜尋

OpenClaw 可以針對 `MEMORY.md` 和 `memory/*.md` 建立小型向量索引，以便
語意查詢即使措辭不同也能找到相關筆記。混合搜尋
（BM25 + 向量）可用於結合語意匹配與精確關鍵字
查詢。

記憶體搜尋支援多種嵌入提供者（OpenAI、Gemini、Voyage、
Mistral、Ollama 和本機 GGUF 模型）、可選的 QMD sidecar 後端用於
進階檢索，以及後處理功能，如 MMR 多樣性重新排序
和時間衰減。

如需完整的配置參考——包括嵌入供應商設定、QMD 後端、混合搜尋調整、多模態記憶以及所有配置選項——請參閱 [Memory configuration reference](/zh-Hant/reference/memory-config)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
