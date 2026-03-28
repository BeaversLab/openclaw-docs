---
summary: "參考：供應商特定的腳本清理和修復規則"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "腳本衛生"
---

# 腳本衛生（供應商修復）

本文描述了在運行（建構模型上下文）之前應用於腳本的 **供應商特定修復**。這些是用於滿足嚴格供應商要求的 **記憶體內部** 調整。這些衛生步驟 **不會** 重寫磁碟上儲存的 JSONL 腳本；然而，單獨的會話檔案修復過程可能會在載入會話之前透過刪除無效行來重寫格式錯誤的 JSONL 檔案。當發生修復時，原始檔案會與會話檔案一起備份。

範圍包括：

- 工具呼叫 ID 清理
- 工具呼叫輸入驗證
- 工具結果配對修復
- 回合驗證 / 排序
- 思考簽章清理
- 圖像負載清理
- 使用者輸入來源標記（用於跨會話路由的提示）

如果您需要腳本儲存的詳細資訊，請參閱：

- [/reference/session-management-compaction](/zh-Hant/reference/session-management-compaction)

---

## 運行位置

所有腳本衛生處理都集中於內嵌執行器中：

- 策略選擇：`src/agents/transcript-policy.ts`
- 清理/修復應用：`sanitizeSessionHistory` in `src/agents/pi-embedded-runner/google.ts`

該策略使用 `provider`、`modelApi` 和 `modelId` 來決定應用什麼。

與腳本衛生分開的是，會話檔案會在載入前（如果需要）進行修復：

- `repairSessionFileIfNeeded` in `src/agents/session-file-repair.ts`
- 由 `run/attempt.ts` 和 `compact.ts`（內嵌執行器）呼叫

---

## 全域規則：圖像清理

圖像負載始終會經過清理，以防止因大小限制而導致供應商端拒絕（下採樣/重新壓縮過大的 base64 圖像）。

這也有助於控制具備視覺能力模型的圖像驅動 token 壓力。較低的最大維度通常會減少 token 使用量；較高的維度則能保留細節。

實作：

- `sanitizeSessionMessagesImages` in `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` in `src/agents/tool-images.ts`
- 最大圖像邊長可透過 `agents.defaults.imageMaxDimensionPx` 設定（預設值：`1200`）。

---

## 全域規則：格式錯誤的工具呼叫

遺失 `input` 與 `arguments` 的助理工具呼叫區塊，會在建立模型上下文之前被捨棄。這能防止因部分持續化的工具呼叫（例如速率限制失敗後）導致供應商拒絕請求。

實作方式：

- `sanitizeToolCallInputs` 於 `src/agents/session-transcript-repair.ts` 中
- 套用於 `sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/google.ts`

---

## 全域規則：跨工作階段輸入來源

當 Agent 透過 `sessions_send` 將提示發送至另一個工作階段時（包含 Agent 對 Agent 的回覆/公告步驟），OpenClaw 會將建立的用戶回合持續化為：

- `message.provenance.kind = "inter_session"`

此中繼資料會在附加至對話紀錄時寫入，且不會變更角色（`role: "user"` 會保留以維持供應商相容性）。對話紀錄讀取器可利用此資訊，避免將路由的內部提示視為終端使用者撰寫的指令。

在重建上下文期間，OpenClaw 也會在記憶體中為這些用戶回合加上一個簡短的 `[Inter-session message]` 標記，讓模型能夠區分它們與外部終端使用者的指令。

---

## 供應商矩陣（目前行為）

**OpenAI / OpenAI Codex**

- 僅進行圖像清理。
- 針對 OpenAI Responses/Codex 對話紀錄，捨棄孤立的推理簽章（缺少後續內容區塊的獨立推理項目）。
- 不進行工具呼叫 ID 清理。
- 不進行工具結果配對修復。
- 不進行回合驗證或重新排序。
- 不產生合成工具結果。
- 不移除思考簽章。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具呼叫 ID 清理：嚴格僅限英數字元。
- 工具結果配對修復與合成工具結果。
- 回合驗證（Gemini 風格的回合交替）。
- Google 回合排序修復（如果歷史紀錄以助理開頭，則在前面加上一個微小的用戶引導）。
- Antigravity Claude：正規化思考簽章；捨棄未簽署的思考區塊。

**Anthropic / Minimax (Anthropic-compatible)**

- 工具結果配對修復與合成工具結果。
- 回合驗證（合併連續的用戶回合以滿足嚴格的交替要求）。

**Mistral（包含基於模型 ID 的偵測）**

- 工具呼叫 ID 清理：strict9（長度為 9 的英數字元）。

**OpenRouter Gemini**

- 思維簽名清理：移除非 base64 的 `thought_signature` 值（保留 base64）。

**其他所有項目**

- 僅清理圖片。

---

## 歷史行為（2026.1.22 之前）

在 2026.1.22 版本發布之前，OpenClaw 會套用多層的文字記錄清理：

- 每當建構情境時都會執行 **transcript-sanitize 擴充功能**，並且能夠：
  - 修復工具使用/結果的配對。
  - 清理工具呼叫 ID（包含保留 `_`/`-` 的非嚴格模式）。
- 執行器也會執行特定供應商的清理，這造成了工作重複。
- 在供應商原則之外還發生了額外的變異，包括：
  - 在持久化之前，從助理文字中移除 `<final>` 標籤。
  - 捨棄空的助理錯誤輪次。
  - 修剪工具呼叫之後的助理內容。

這種複雜性導致了跨供應商的回歸問題（特別是 `openai-responses`
`call_id|fc_id` 配對）。2026.1.22 的清理版本移除了該擴充功能，將邏輯集中到執行器中，並使 OpenAI 除了圖片清理外變為 **no-touch**。
