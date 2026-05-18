---
summary: "參考：特定於提供商的文字輸入清理與修復規則"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Transcript hygiene"
---

OpenClaw 在運行（建立模型上下文）之前會對記錄套用**供應商特定的修復**。其中大部分是用來滿足嚴格供應商要求的**記憶體內**調整。獨立的會話檔案修復傳遞也可能在載入會話之前重寫已儲存的 JSONL，但僅限於格式錯誤的行或無效的持久化記錄。交付的助理回覆會保留在磁碟上；供應商特定的助理預填移除僅在建構輸出負載時發生。當進行修復時，原始檔案會在原子替換之前寫入到暫時的 `*.bak-<pid>-<ts>` 同層檔案，並在替換成功後移除；只有在清理本身失敗時才會保留備份（在這種情況下會回報路徑）。

範圍包括：

- 僅限執行時期的提示內容不納入使用者可見的對話記錄回合
- 工具呼叫 ID 清理
- 工具呼叫輸入驗證
- 工具結果配對修復
- 回合驗證 / 排序
- 思考簽章清理
- 思考簽章清理
- 圖像 Payload 清理
- 供應商重播前的空白文字區塊清理
- 使用者輸入來源標記（用於跨會話路由提示詞）
- Bedrock Converse 重播的空白助理錯誤輪次修復

如果您需要關於文字記錄儲存的詳細資訊，請參閱：

- [會話管理深入解析](/zh-Hant/reference/session-management-compaction)

---

## 全域規則：執行時內容非使用者文字記錄

執行時/系統內容可以被加入至某個輪次的模型提示詞中，但它並非最終使用者所撰寫的內容。OpenClaw 會為 Gateway 回覆、排程的後續追蹤、ACP、CLI 和嵌入式 Pi 執行保留一份獨立的面對文字記錄的提示詞主體。已儲存的可見使用者輪次使用該文字記錄主體，而非經過執行時增強的提示詞。

對於已經持久化執行時包裝器的舊版會話，Gateway 歷史紀錄介面會在將訊息返回給 WebChat、TUI、REST 或 SSE 用戶端之前套用顯示投影。

---

## 執行位置

所有的文字記錄衛生處理都集中在嵌入式執行器中：

- 策略選擇：`src/agents/transcript-policy.ts`
- 清理/修復應用：`sanitizeSessionHistory` 於 `src/agents/pi-embedded-runner/replay-history.ts`

該策略使用 `provider`、`modelApi` 和 `modelId` 來決定套用什麼。

與文字記錄衛生處理分開的是，會話檔案會在載入前（如有需要）進行修復：

- `repairSessionFileIfNeeded` 於 `src/agents/session-file-repair.ts`
- 從 `run/attempt.ts` 和 `compact.ts`（嵌入式執行器）呼叫

---

## 全域規則：圖片淨化

圖片負載始終會經過淨化，以防止因大小限制導致供應商端拒絕（下採樣/重新壓縮過大的 base64 圖片）。

這也有助於控制視覺模型的圖像驅動 token 壓力。
較低的最大維度通常會減少 token 使用量；較高維度則保留細節。

實作：

- `sanitizeSessionMessagesImages` 於 `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` 於 `src/agents/tool-images.ts`
- 最大影像邊長可透過 `agents.defaults.imageMaxDimensionPx` 設定（預設值：`1200`）。
- 當此過程檢查重播內容時，會移除空白文字區塊。在重播副本中，
  變為空白的 Assistant 輪次會被捨棄；變為空白的 User 和 tool-result
  輪次則會收到一個非空白的 omitted-content 佔位符。

---

## 全域規則：格式錯誤的工具呼叫

同時缺少 `input` 和 `arguments` 的助理工具呼叫區塊會在建立模型上下文之前被捨棄。
這可以防止因部分持久化的工具呼叫（例如，在速率限制失敗之後）而導致的供應商拒絕。

實作：

- `sanitizeToolCallInputs` 於 `src/agents/session-transcript-repair.ts`
- 應用於 `sanitizeSessionHistory` 於 `src/agents/pi-embedded-runner/replay-history.ts`

---

## 全域規則：跨會話輸入來源

當代理透過 `sessions_send` 將提示傳送至另一個會話時（包括
代理對代理的回覆/公告步驟），OpenClaw 會將建立的使用者輪次與以下內容一起持久化：

- `message.provenance.kind = "inter_session"`

OpenClaw 也會在路由提示文字前面加上一個同輪次的 `[Inter-session message ... isUser=false]` 標記，讓現行模型呼叫能夠區分外部會話輸出與外部終端使用者指令。此標記在可用時會包含來源會話、通道與工具。轉錄內容為了相容性仍使用 `role: "user"`，但可見文字與出處元資料都會將該輪次標記為跨會話資料。

在重建內容期間，OpenClaw 會將相同的標記套用於僅具有來源中繼資料的較舊
已持久化跨會話 User 輪次。

---

## 提供者對照表（目前行為）

**OpenAI / OpenAI Codex**

- 僅進行圖像清理。
- 針對 OpenAI Responses/Codex 轉錄內容，捨棄孤立的推理簽章（獨立的推理項目，其後沒有內容區塊），並在模型路由切換後捨棄可重播的 OpenAI 推理。
- 保留可重播的 OpenAI Responses 推理項目內容，包括加密的空摘要項目，以便手動/WebSocket 重播時能讓所需的 `rs_*` 狀態與助理輸出項目保持配對。
- 原生 ChatGPT Codex Responses 遵循 Codex 線上對等性，在沒有先前項目 ID 的情況下重播先前的 Responses 推理/訊息/函式內容，同時保留會話 `prompt_cache_key`。
- 不進行工具呼叫 ID 清理。
- 工具結果配對修復可能會移動真實的相符輸出，並為遺失的工具呼叫合成 Codex 風格的 `aborted` 輸出。
- 不進行輪次驗證或重新排序。
- 遺失的 OpenAI Responses 系列工具輸出會被合成為 `aborted`，以符合 Codex 重播正規化。
- 不移除思考簽章。

**OpenAI 相容的聊天完成 (Chat Completions)**

- 歷史助理思考/推理區塊會在重播前移除，讓本機與 Proxy 風格的 OpenAI 相容伺服器不會收到先前的推理欄位，例如 `reasoning` 或 `reasoning_content`。
- 目前的同輪次工具呼叫延續會將助理推理區塊附加到工具呼叫上，直到工具結果被重播為止。
- 當提供者的線上協定要求
  重播推理元資料時，提供者擁有的例外可以選擇不加入。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具呼叫 ID 清理：僅限純英數字元。
- 工具結果配對修復與合成工具結果。
- 輪次驗證 (Gemini 風格的輪次交替)。
- Google 輪次排序修復 (如果歷史紀錄以助理開頭，則在前面加上一個微小的使用者引導)。
- Antigravity Claude：正規化思考簽章；捨棄未簽署的思考區塊。

**Anthropic / Minimax (Anthropic 相容)**

- 工具結果配對修復與合成工具結果。
- 輪次驗證 (合併連續的使用者輪次以滿足嚴格的交替要求)。
- 當啟用思考功能時，尾隨的助理預填充輪次會從傳出的 Anthropic Messages
  載荷中移除，包括 Cloudflare AI Gateway 路由。
- 缺少、空白或僅含空白字元重播簽章的思考區塊會在
  提供者轉換前被移除。如果這使得助理輪次變為空，OpenClaw 會
  保持輪次結構並使用非空白的「已省略推理」文字。
- 必須移除的僅含思考的舊版助理輪次會被替換為
  非空白的「已省略推理」文字，以免提供者介接器捨棄該
  重播輪次。

**Amazon Bedrock (Converse API)**

- 空的串流錯誤助理輪次會在重播前修復為非空白的後備文字區塊。Bedrock Converse 會拒絕含有 `content: []` 的助理訊息，因此持久化並帶有 `stopReason: "error"` 且內容為空的助理輪次，也會在載入前於磁碟上修復。
- 若助理串流錯誤輪次僅包含空白文字區塊，將會從
  記憶體中的重播副本中移除，而不是重播無效的空白區塊。
- 缺少、空白或僅含空白字元重播簽章的 Claude 思考區塊會
  在 Converse 重播前被移除。如果這使得助理輪次變為空，OpenClaw
  會保持輪次結構並使用非空白的「已省略推理」文字。
- 必須移除的舊版僅思考助理輪次會被替換為非空白的 omitted-reasoning 文字，以便 Converse 重放保持嚴格的輪次結構。
- 重放會過濾掉 OpenClaw 的傳遞鏡像和閘道注入的助理輪次。
- 影像清理透過全域規則套用。

**Mistral（包括基於模型 ID 的偵測）**

- 工具呼叫 ID 清理：strict9（長度為 9 的英數字元）。

**OpenRouter Gemini**

- 思考簽章清理：移除非 base64 的 `thought_signature` 值（保留 base64）。

**OpenRouter Anthropic**

- 當啟用推理時，會從已驗證的 OpenRouter OpenAI 相容 Anthropic 模型酬載中移除結尾的助理預填輪次，以符合直接 Anthropic 和 Cloudflare Anthropic 的重放行為。

**其他所有提供者**

- 僅進行影像清理。

---

## 歷史行為（2026.1.22 之前）

在 2026.1.22 版本發布之前，OpenClaw 套用了多層的文字記錄清理：

- 每個情境建置時都會執行 **transcript-sanitize 擴充功能**，並且可以：
  - 修復工具使用/結果配對。
  - 清理工具呼叫 ID（包括保留 `_`/`-` 的非嚴格模式）。
- 執行器也會執行特定提供者的清理，這導致了工作重複。
- 在提供者原則之外發生了額外的變異，包括：
  - 在持久化前從助理文字中移除 `<final>` 標籤。
  - 捨棄空的助理錯誤輪次。
  - 在工具呼叫之後修剪助理內容。

這種複雜性導致了跨供應商的迴歸（特別是 `openai-responses`
`call_id|fc_id` 配對）。2026.1.22 的清理工作移除了該擴充功能，將邏輯集中在運行器中，並使 OpenAI 除了圖像清理外變為 **no-touch**（不變更）。

## 相關

- [Session management](/zh-Hant/concepts/session)
- [Session pruning](/zh-Hant/concepts/session-pruning)
