---
summary: "參考：特定於提供商的文字輸入清理與修復規則"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "Transcript hygiene"
---

OpenClaw 在執行（建構模型內容）前會對文字記錄套用**供應商特定的修復**。其中大部分是為了滿足嚴格的供應商要求而進行的**記憶體中** 調整。獨立的會話檔案修復程序也可能在載入會話之前重寫已儲存的 JSONL，但僅限於格式錯誤的行或無效的持久化記錄。已傳送的助理回覆會保留在磁碟上；供應商特定的助理預填移除僅在建構出站負載時發生。當進行修復時，原始檔案會與會話檔案一起備份。

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

- [會話管理深度解析](/zh-Hant/reference/session-management-compaction)

---

## 全域規則：執行時內容非使用者文字記錄

執行時/系統內容可以被加入至某個輪次的模型提示詞中，但它並非最終使用者所撰寫的內容。OpenClaw 會為 Gateway 回覆、排程的後續追蹤、ACP、CLI 和嵌入式 Pi 執行保留一份獨立的面對文字記錄的提示詞主體。已儲存的可見使用者輪次使用該文字記錄主體，而非經過執行時增強的提示詞。

對於已經持久化執行時包裝器的舊版會話，Gateway 歷史紀錄介面會在將訊息返回給 WebChat、TUI、REST 或 SSE 用戶端之前套用顯示投影。

---

## 執行位置

所有的文字記錄衛生處理都集中在嵌入式執行器中：

- 策略選擇：`src/agents/transcript-policy.ts`
- 淨化/修復套用：`sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/replay-history.ts`

該策略使用 `provider`、`modelApi` 和 `modelId` 來決定套用哪些內容。

與文字記錄衛生處理分開的是，會話檔案會在載入前（如有需要）進行修復：

- `repairSessionFileIfNeeded` 中的 `src/agents/session-file-repair.ts`
- 從 `run/attempt.ts` 和 `compact.ts`（嵌入式執行器）呼叫

---

## 全域規則：圖片淨化

圖片負載始終會經過淨化，以防止因大小限制導致供應商端拒絕（下採樣/重新壓縮過大的 base64 圖片）。

這也有助於控制視覺模型的圖像驅動 token 壓力。
較低的最大維度通常會減少 token 使用量；較高維度則保留細節。

實作：

- `sanitizeSessionMessagesImages` in `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` in `src/agents/tool-images.ts`
- 最大圖像邊長可透過 `agents.defaults.imageMaxDimensionPx` 設定（預設值：`1200`）。
- 當此過程檢查重播內容時，會移除空白文字區塊。在重播副本中，
  變為空白的 Assistant 輪次會被捨棄；變為空白的 User 和 tool-result
  輪次則會收到一個非空白的 omitted-content 佔位符。

---

## 全域規則：格式錯誤的工具呼叫

遺失 `input` 和 `arguments` 的 Assistant tool-call 區塊會在
建立模型內容前被捨棄。這能防止因部分持久化的工具呼叫
（例如在速率限制失敗後）而導致的提供者拒絕。

實作：

- `sanitizeToolCallInputs` in `src/agents/session-transcript-repair.ts`
- 已套用於 `src/agents/pi-embedded-runner/replay-history.ts` 中的 `sanitizeSessionHistory`

---

## 全域規則：跨會話輸入來源

當 Agent 透過 `sessions_send` 將提示詞傳送至另一個會話時（包括
agent-to-agent 回覆/公告步驟），OpenClaw 會使用以下資訊持久化建立的 User 輪次：

- `message.provenance.kind = "inter_session"`

OpenClaw 也會在路由提示詞文字之前，預先附加同一輪次的 `[Inter-session message ... isUser=false]`
標記，以便目前的模型呼叫能區分外部會話輸出與外部終端使用者指示。此標記在可用時會包含
來源會話、頻道和工具。轉錄內容為了提供者相容性仍使用
`role: "user"`，但可見文字和來源中繼資料都會將該輪次標記為跨會話資料。

在重建內容期間，OpenClaw 會將相同的標記套用於僅具有來源中繼資料的較舊
已持久化跨會話 User 輪次。

---

## 提供者對照表（目前行為）

**OpenAI / OpenAI Codex**

- 僅進行圖像清理。
- 針對 OpenAI Responses/Codex 轉錄內容，捨棄孤立的推理簽章（獨立的推理項目，其後沒有內容區塊），並在模型路由切換後捨棄可重播的 OpenAI 推理。
- 保留可重播的 OpenAI Responses 推理項目承載，包括加密的空摘要項目，以便手動/WebSocket 重播能將所需的 `rs_*` 狀態與助理輸出項目保持配對。
- 原生 ChatGPT Codex Responses 遵循 Codex 線路同等性，透過重播先前的 Responses 推理/訊息/函數承載但不包含先前的項目 ID，同時保留會話 `prompt_cache_key`。
- 不進行工具呼叫 ID 清理。
- 工具結果配對修復可能會移動實際相符的輸出，並為遺失的工具呼叫合成 Codex 風格的 `aborted` 輸出。
- 不進行輪次驗證或重新排序。
- 遺失的 OpenAI Responses 系列工具輸出會被合成為 `aborted`，以符合 Codex 重播正規化。
- 不移除思考簽章。

**OpenAI 相容 Gemma 4**

- 歷史助理思考/推理區塊會在重播前被移除，以便本機 OpenAI 相容 Gemma 4 伺服器不會收到先前的輪次推理內容。
- 目前的同輪次工具呼叫延續會將助理推理區塊附加到工具呼叫上，直到工具結果被重播為止。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具呼叫 ID 清理：嚴格的字母數字。
- 工具結果配對修復與合成工具結果。
- 輪次驗證 (Gemini 風格的輪次交替)。
- Google 輪次排序修復 (如果歷史記錄以助理開頭，則在前面加入微小的使用者引導)。
- Antigravity Claude：正規化思考簽章；捨棄未簽章的思考區塊。

**Anthropic / Minimax (Anthropic 相容)**

- 工具結果配對修復與合成工具結果。
- 輪次驗證 (合併連續的使用者輪次以滿足嚴格的交替要求)。
- 當啟用思考時，尾隨的助理預填充輪次會從傳出的 Anthropic Messages 承載中移除，包括 Cloudflare AI Gateway 路由。
- 在提供者轉換之前，會移除重播簽章遺失、空白或空白的思考區塊。如果這清空了助理輪次，OpenClaw 會以非空的省略推理文字保留輪次形狀。
- 必須移除的舊純思考助理輪次會被非空的省略推理文字取代，以便提供者介面卡不會捨棄重播輪次。

**Amazon Bedrock (Converse API)**

- 空的助手串流錯誤輪次會在重播前修復為非空白的後備文字區塊。Bedrock Converse 會拒絕具有 `content: []` 的助手訊息，因此具有 `stopReason: "error"` 且內容為空的已持久化助手輪次也會在載入前於磁碟上修復。
- 僅包含空白文字區塊的助手串流錯誤輪次會從記憶體中的重播副本中捨棄，而不是重播無效的空白區塊。
- 在 Converse 重播之前，會移除缺少、空白或重播簽章為空白的 Claude 思考區塊。如果這導致助手輪次變空，OpenClaw 會保留輪次結構並填入非空白的 omitted-reasoning 文字。
- 必須移除的較舊的純思考助手輪次會被替換為非空白的 omitted-reasoning 文字，以便 Converse 重播保持嚴格的輪次結構。
- 重播會過濾掉 OpenClaw 傳遞鏡像和閘道注入的助手輪次。
- 影像清理透過全域規則套用。

**Mistral（包括基於 model-id 的偵測）**

- 工具呼叫 id 清理：strict9（長度為 9 的字母數字）。

**OpenRouter Gemini**

- 思考簽章清理：移除非 base64 的 `thought_signature` 值（保留 base64）。

**OpenRouter Anthropic**

- 當啟用推理時，會從經過驗證的 OpenRouter OpenAI 相容 Anthropic 模型載荷中移除尾隨的助手預填輪次，以符合直接 Anthropic 和 Cloudflare Anthropic 重播行為。

**其他所有項目**

- 僅進行影像清理。

---

## 歷史行為（2026.1.22 之前）

在 2026.1.22 版本發布之前，OpenClaw 套用了多層的文字記錄清理：

- 每次建構上下文時都會執行 **transcript-sanitize 擴充功能**，並且可以：
  - 修復工具使用/結果配對。
  - 清理工具呼叫 id（包括保留 `_`/`-` 的非嚴格模式）。
- 執行器也執行了特定於提供者的清理，這導致了工作重複。
- 提供者策略之外還發生了額外的變異，包括：
  - 在持久化之前從助手文字中移除 `<final>` 標籤。
  - 捨棄空的助手錯誤輪次。
  - 修剪工具呼叫之後的助手內容。

這種複雜性導致了跨供應商的回歸（特別是 `openai-responses`
`call_id|fc_id` 配對）。2026.1.22 的清理工作移除了該擴充功能，將邏輯集中到執行器中，並使 OpenAI 在圖像清理之外保持**不接觸**（no-touch）。

## 相關

- [Session management](/zh-Hant/concepts/session)
- [Session pruning](/zh-Hant/concepts/session-pruning)
