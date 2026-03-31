---
title: "記憶"
summary: "OpenClaw 記憶運作方式（工作區檔案 + 自動記憶清除）"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# 記憶

OpenClaw 的記憶是 **代理工作區中的純 Markdown**。這些檔案是
真相來源；模型只會「記住」寫入磁碟的內容。

記憶搜尋工具由現用的記憶外掛程式提供（預設：
`memory-core`）。請使用 `plugins.slots.memory = "none"` 停用記憶外掛程式。

## 記憶檔案

預設的工作區佈局使用兩個記憶層級：

- `memory/YYYY-MM-DD.md`
  - 每日日誌（僅附加）。
  - 在工作階段開始時讀取今天 + 昨天的內容。
- `MEMORY.md`（選用）
  - 經策劃的長期記憶。
  - 如果 `MEMORY.md` 和 `memory.md` 同時存在於工作區根目錄，OpenClaw 將會載入這兩個檔案（透過 realpath 去重，因此指向同一個檔案的符號連結不會被重複注入）。
  - **僅在主要的私人工作階段中載入**（絕不在群組情境中）。

這些檔案位於工作區（`agents.defaults.workspace`，預設
`~/.openclaw/workspace`）。請參閱 [Agent workspace](/en/concepts/agent-workspace) 以了解完整配置。

## 記憶工具

OpenClaw 為這些 Markdown 檔案提供了兩個供代理使用的工具：

- `memory_search` -- 對已索引片段進行語意回溯。
- `memory_get` -- 針對特定 Markdown 檔案/行範圍進行精確讀取。

`memory_get` 現在**當檔案不存在時會優雅降級**（例如，
在第一次寫入前當天的每日日誌）。內建管理器和 QMD
後端都會傳回 `{ text: "", path }` 而非拋出 `ENOENT`，因此代理可以
處理「尚未記錄任何內容」的情況並繼續其工作流程，而無需將
工具呼叫包裝在 try/catch 邏輯中。

## 何時寫入記憶

- 決策、偏好設定和持久性事實會進入 `MEMORY.md`。
- 日常筆記和持續進行的情境會進入 `memory/YYYY-MM-DD.md`。
- 如果有人說「記住這個」，請將其寫下（不要將其保留在 RAM 中）。
- 此領域仍在發展中。提醒模型儲存記憶會有幫助；它會知道該怎麼做。
- 如果您希望某些內容被保留，**請要求機器人將其寫入**記憶。

## 自動記憶刷新（壓縮前 ping）

當工作階段**接近自動壓縮**時，OpenClaw 會觸發一次**靜默的 Agent 輪次**，提醒模型在上下文壓縮**之前**寫入持久化記憶。預設提示明確指出模型*可以回覆*，但通常 `NO_REPLY` 是正確的回應，因此使用者永遠看不到這個輪次。
主動記憶外掛擁有該刷新的提示/路徑策略；預設的 `memory-core` 外掛會寫入 `memory/YYYY-MM-DD.md` 下的標準每日檔案。

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

詳情：

- **軟閾值**：當工作階段 token 估計值超過
  `contextWindow - reserveTokensFloor - softThresholdTokens` 時觸發刷新。
- **預設為靜默**：提示包含 `NO_REPLY`，因此不會傳送任何內容。
- **兩個提示**：一個使用者提示加上一個系統提示附加了提醒。
- **每個壓縮循環一次清除**（在 `sessions.json` 中追蹤）。
- **工作區必須可寫入**：如果會話在沙箱中運行且
  使用了 `workspaceAccess: "ro"` 或 `"none"`，則會跳過清除。

有關完整的壓縮生命週期，請參閱
[Session management + compaction](/en/reference/session-management-compaction)。

## 向量記憶搜尋

OpenClaw 可以在 `MEMORY.md` 和 `memory/*.md` 上建立小型向量索引，以便
語義查詢即使在措辭不同時也能找到相關筆記。混合搜尋
（BM25 + 向量）可用於將語義匹配與精確關鍵字
查找結合起來。

記憶搜尋適配器 ID 來自於現用的記憶外掛程式。預設的
`memory-core` 外掛程式內建了對 OpenAI、Gemini、Voyage、Mistral、
Ollama 和本地 GGUF 模型的支援，以及一個可選的 QMD sidecar 後端，
用於進階檢索與後處理功能，例如 MMR 多樣性重新排序
和時間衰減。

如需完整的設定參考——包括嵌入提供者設定、QMD
後端、混合搜尋調整、多模態記憶以及所有設定選項——請參閱
[記憶設定參考](/en/reference/memory-config)。
