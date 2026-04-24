---
summary: "參考：特定於提供商的文字輸入清理與修復規則"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "文字輸入清理"
---

# 文字輸入清理（提供商修復）

本文說明在執行（建構模型上下文）之前套用至文字輸入的 **提供商特定修復**。這些是用於滿足嚴格提供商要求的 **記憶體內部** 調整。這些清理步驟 **不會** 重寫磁碟上儲存的 JSONL 文字輸入；然而，獨立的會話檔案修復程序可能會在載入會話之前透過刪除無效行來重寫格式錯誤的 JSONL 檔案。當進行修復時，原始檔案會與會話檔案一起備份。

範圍包括：

- 工具呼叫 ID 清理
- 工具呼叫輸入驗證
- 工具結果配對修復
- 回合驗證 / 排序
- 思考簽章清理
- 圖像 Payload 清理
- 使用者輸入來源標記（用於跨會話路由的提示）

如果您需要文字輸入儲存的詳細資訊，請參閱：

- [/reference/session-management-compaction](/zh-Hant/reference/session-management-compaction)

---

## 執行位置

所有文字輸入清理都集中在內嵌執行器中：

- 策略選取： `src/agents/transcript-policy.ts`
- 清理/修復應用：`sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/replay-history.ts`

策略使用 `provider`、`modelApi` 和 `modelId` 來決定套用什麼。

與文字輸入清理分開，會話檔案會在載入前進行修復（如有需要）：

- `repairSessionFileIfNeeded` 於 `src/agents/session-file-repair.ts`
- 從 `run/attempt.ts` 和 `compact.ts` 呼叫（內嵌執行器）

---

## 全域規則：圖像清理

圖像 Payload 總是會經過清理，以防止因為大小限制而被提供商端拒絕（對過大的 base64 圖像進行縮小/重新壓縮）。

這也有助於控制具備視覺功能模型的圖像驅動 Token 壓力。較低的解析度通常會減少 Token 使用量；較高的解析度則能保留細節。

實作：

- `sanitizeSessionMessagesImages` 於 `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` 於 `src/agents/tool-images.ts`
- 最大影像邊長可透過 `agents.defaults.imageMaxDimensionPx` 設定（預設：`1200`）。

---

## 全域規則：格式錯誤的工具呼叫

在建立模型上下文之前，會遺棄同時缺少 `input` 和 `arguments` 的 Assistant 工具呼叫區塊。這可防止因部分持久化的工具呼叫（例如，在速率限制失敗後）導致提供商拒絕。

實作：

- `sanitizeToolCallInputs` 於 `src/agents/session-transcript-repair.ts`
- 應用於 `src/agents/pi-embedded-runner/replay-history.ts` 中的 `sanitizeSessionHistory`

---

## 全域規則：跨會話輸入來源

當 Agent 透過 `sessions_send` 將提示傳送至另一個會話時（包括 Agent 對 Agent 的回覆/公告步驟），OpenClaw 會使用以下資訊持久化建立的使用者輪次：

- `message.provenance.kind = "inter_session"`

此元數據是在附加文字紀錄時寫入的，不會更改角色（為了提供商相容性，`role: "user"` 保持不變）。文字紀錄讀取器可以使用此資訊，避免將路由的內部提示視為終端使用者撰寫的指令。

在重建上下文期間，OpenClaw 還會在記憶體中將一個簡短的 `[Inter-session message]` 標記前置到這些使用者輪次，以便模型能夠將其與外部終端使用者的指令區分開來。

---

## 提供商矩陣（目前行為）

**OpenAI / OpenAI Codex**

- 僅影像清理。
- 針對 OpenAI Responses/Codex 文字紀錄，捨棄孤立的推理簽章（沒有後續內容區塊的獨立推理項目）。
- 無工具呼叫 ID 清理。
- 無工具結果配對修復。
- 無輪次驗證或重新排序。
- 無合成工具結果。
- 無思維簽章剝離。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具呼叫 ID 清理：嚴格的英數字元。
- 工具結果配對修復和合成工具結果。
- 輪次驗證（Gemini 風格的輪次交替）。
- Google 輪次排序修復（如果歷史記錄以 Assistant 開頭，則前置一個微小的使用者引導）。
- Antigravity Claude：正規化思維簽章；捨棄未簽署的思維區塊。

**Anthropic / Minimax (Anthropic-compatible)**

- 工具結果配對修復和合成工具結果。
- 輪次驗證（合併連續的使用者輪次以滿足嚴格交替要求）。

**Mistral（包括基於模型 ID 的偵測）**

- 工具呼叫 ID 清理：strict9（長度為 9 的英數字元）。

**OpenRouter Gemini**

- 思考簽名清理：移除非 base64 `thought_signature` 值（保留 base64）。

**其他所有項目**

- 僅進行影像清理。

---

## 歷史行為（2026.1.22 之前）

在 2026.1.22 版本發布之前，OpenClaw 應用了多層的文字紀錄清理：

- **文字紀錄清理擴充功能**（transcript-sanitize extension）會在每次建構內容時執行，並且能夠：
  - 修復工具使用/結果配對。
  - 清理工具呼叫 ID（包括保留 `_`/`-` 的非嚴格模式）。
- 執行器也會執行供應商特定的清理，這導致了工作重複。
- 在供應商原則之外發生了額外的變更，包括：
  - 在持久化之前，從助理文字中移除 `<final>` 標籤。
  - 捨棄空的助理錯誤回合。
  - 在工具呼叫之後修剪助理內容。

這種複雜性導致了跨供應商的回歸問題（特別是 `openai-responses`
`call_id|fc_id` 配對）。2026.1.22 版本的清理移除了擴充功能，將邏輯集中在執行器中，並使 OpenAI 除了影像清理之外**完全不處理**（no-touch）。
