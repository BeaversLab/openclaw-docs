---
summary: "參考：特定於提供商的文字輸入清理與修復規則"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Transcript hygiene"
---

OpenClaw 會在執行（建構模型內容）之前對對話記錄套用**提供者特定的修復**。其中大部分是為了滿足嚴格的提供者要求而進行的**記憶體內調整**。在載入工作階段之前，獨立的工作階段檔案修復程序也可能會重寫已儲存的 JSONL，方式是捨棚格式錯誤的 JSONL 行，或是修復語法正確但在重播期間已知會被提供者拒絕的已持續化回合。當進行修復時，原始檔案會與工作階段檔案一起備份。

範圍包括：

- 僅限執行時期的提示內容不納入使用者可見的對話記錄回合
- 工具呼叫 ID 清理
- 工具呼叫輸入驗證
- 工具結果配對修復
- 回合驗證 / 排序
- 思考簽章清理
- 思考簽章清理
- 圖像 Payload 清理
- 使用者輸入來源標記（用於跨工作階段路由的提示）
- 針對 Bedrock Converse 重播的空白助手錯誤回合修復

如果您需要對話記錄儲存的詳細資訊，請參閱：

- [工作階段管理深度剖析](/zh-Hant/reference/session-management-compaction)

---

## 全域規則：執行時期內容不是使用者對話記錄

執行時期/系統內容可以被加入到回合的模型提示中，但它並非最終使用者撰寫的內容。OpenClaw 會為 Gateway 回覆、排入佇列的後續追蹤、ACP、CLI 和嵌入式 Pi 執行保留一個獨立的對話記錄面向提示主體。已儲存的可見使用者回合會使用該對話記錄主體，而不是經過執行時期豐富的提示。

對於已經持續化執行時期包裝器的舊版工作階段，Gateway 歷程記錄介面會在將訊息傳回給 WebChat、TUI、REST 或 SSE 用戶端之前套用顯示投影。

---

## 執行位置

所有的對話記錄清理都集中在嵌入式執行器中：

- 原則選擇：`src/agents/transcript-policy.ts`
- 清理/修復應用：`sanitizeSessionHistory` 於 `src/agents/pi-embedded-runner/replay-history.ts`

該原則使用 `provider`、`modelApi` 和 `modelId` 來決定套用什麼。

與對話記錄清理分開的是，工作階段檔案會在載入前進行修復（如果需要）：

- `repairSessionFileIfNeeded` 於 `src/agents/session-file-repair.ts`
- 從 `run/attempt.ts` 和 `compact.ts`（嵌入式執行器）呼叫

---

## 全域規則：圖像清理

影像承載一律會進行清理，以防止因大小限制而遭到供應商拒絕（對超過大小的 base64 影像進行縮放/重新壓縮）。

這也有助於控制具備視覺能力的模型中，由影像驅動的 token 壓力。較低的最大尺寸通常會減少 token 使用量；較高的尺寸則能保留細節。

實作：

- `sanitizeSessionMessagesImages` 於 `src/agents/pi-embedded-helpers/images.ts` 中
- `sanitizeContentBlocksImages` 於 `src/agents/tool-images.ts` 中
- 最大影像邊長可透過 `agents.defaults.imageMaxDimensionPx` 進行配置（預設值：`1200`）。

---

## 全域規則：格式錯誤的工具呼叫

同時缺少 `input` 和 `arguments` 的助手工具呼叫區塊會在建立模型上下文之前被捨棄。這可以防止因部分持久化的工具呼叫（例如在速率限制失敗之後）而導致供應商拒絕。

實作：

- `sanitizeToolCallInputs` 於 `src/agents/session-transcript-repair.ts` 中
- 套用於 `sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/replay-history.ts`

---

## 全域規則：跨會話輸入來源

當代理透過 `sessions_send` 將提示傳送到另一個會話時（包括代理對代理的回覆/公告步驟），OpenClaw 會將建立的用戶轉次連同以下資訊一起持久化：

- `message.provenance.kind = "inter_session"`

此元資料是在追加轉次記錄時寫入的，並且不會更改角色（`role: "user"` 保持不變以維持供應商相容性）。轉次記錄讀取器可以使用此資訊，避免將路由的內部提示視為最終用戶撰寫的指令。

在重建上下文時，OpenClaw 也會在記憶體中為那些用戶轉次附加一個簡短的 `[Inter-session message]` 標記，讓模型能夠區分它們與外部最終用戶指令。

---

## 供應商矩陣（目前行為）

**OpenAI / OpenAI Codex**

- 僅進行影像清理。
- 對於 OpenAI Responses/Codex 轉次記錄，會捨棄孤立的推理簽名（沒有後續內容區塊的獨立推理項目）；並在模型路由切換後，捨棄可重播的 OpenAI 推理內容。
- 不進行工具呼叫 ID 清理。
- 工具結果配對修復可能會移動真實的匹配輸出，並為遺失的工具呼叫合成 Codex 風格的 `aborted` 輸出。
- 不進行回合驗證或重新排序。
- 遺失的 OpenAI Responses 系列工具輸出會被合成為 `aborted`，以符合 Codex 重播標準化。
- 不移除思考簽章。

**OpenAI 相容的 Gemma 4**

- 歷史助手思考/推理區塊會在重播前移除，以免本機 OpenAI 相容的 Gemma 4 伺服器收到先前回合的推理內容。
- 目前的同回合工具呼叫延續會將助手推理區塊附加至工具呼叫，直到工具結果重播完成。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具呼叫 ID 清理：嚴格的英數字元。
- 工具結果配對修復與合成工具結果。
- 回合驗證 (Gemini 風格的回合交替)。
- Google 回合排序修復 (如果歷史記錄以助手開頭，則在前面加上微小的使用者啟動訊息)。
- Antigravity Claude：標準化思考簽章；捨棄未簽章的思考區塊。

**Anthropic / Minimax (Anthropic 相容)**

- 工具結果配對修復與合成工具結果。
- 回合驗證 (合併連續的使用者回合以滿足嚴格的交替要求)。
- 遺失、空白或空白重播簽章的思考區塊會在提供者轉換前移除。如果這讓助手回合變成空的，OpenClaw 會以非空的「省略推理」文字保留回合結構。
- 必須移除的舊版僅包含思考的助手回合會被替換為非空的「省略推理」文字，以免提供者轉接器捨棄重播回合。

**Amazon Bedrock (Converse API)**

- 空的助手串流錯誤回合會在重播前修復為非空的後備文字區塊。Bedrock Converse 會拒絕含有 `content: []` 的助手訊息，因此含有 `stopReason: "error"` 且內容為空的持久化助手回合也會在載入前於磁碟上修復。
- 遺失、空白或空白重播簽章的 Claude 思考區塊會在 Converse 重播前移除。如果這讓助手回合變成空的，OpenClaw 會以非空的「省略推理」文字保留回合結構。
- 必須移除的舊版僅包含思考的助手回合會被替換為非空的「省略推理」文字，以便 Converse 重播保持嚴格的回合結構。
- 重播會過濾掉 OpenClaw delivery-mirror 與 gateway-injected 的助手回合。
- 圖片清理透過全域規則套用。

**Mistral (包含基於 model-id 的偵測)**

- 工具呼叫 ID 清理：strict9 (長度為 9 的英數字元)。

**OpenRouter Gemini**

- 思維簽章清理：去除非 base64 `thought_signature` 數值 (保留 base64)。

**其他所有項目**

- 僅進行圖片清理。

---

## 歷史行為 (2026.1.22 之前)

在 2026.1.22 版本發布之前，OpenClaw 套用了多層的對話記錄清理：

- 一個 **transcript-sanitize extension** 在每次建構內容時執行，並且能夠：
  - 修復工具使用/結果的配對。
  - 清理工具呼叫 ID (包括一個保留 `_`/`-` 的非嚴格模式)。
- 執行器也會執行提供者特定的清理，這導致了工作重複。
- 在提供者原則之外發生了額外的變動，包括：
  - 在持久化之前，從助理文字中去除 `<final>` 標籤。
  - 捨棄空的助理錯誤輪次。
  - 在工具呼叫之後修剪助理內容。

這種複雜性導致了跨提供者的回歸問題 (特別是 `openai-responses`
`call_id|fc_id` 配對)。2026.1.22 的清理移除了擴充功能，將邏輯集中到執行器中，並使 OpenAI 除了圖片清理之外變成 **no-touch**。

## 相關

- [Session management](/zh-Hant/concepts/session)
- [Session pruning](/zh-Hant/concepts/session-pruning)
