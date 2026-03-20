---
summary: "參考：特定供應商的文字記錄清理與修復規則"
read_when:
  - 您正在調試與文字記錄形狀相關的供應商請求拒絕
  - 您正在更改文字記錄清理或工具呼叫修復邏輯
  - 您正在調查跨供應商的工具呼叫 ID 不匹配問題
title: "文字記錄清理"
---

# 文字記錄清理（供應商修復）

本文件描述了在運行（建立模型上下文）之前對文字記錄套用的**特定供應商修復**。這些是用於滿足嚴格供應商要求的**記憶體內**調整。這些清理步驟**不會**重寫磁碟上儲存的 JSONL 文字記錄；然而，單獨的會話檔案修復傳遞可能會在載入會話之前透過刪除無效行來重寫格式錯誤的 JSONL 檔案。當發生修復時，原始檔案會與會話檔案一起備份。

範圍包括：

- 工具呼叫 ID 清理
- 工具呼叫輸入驗證
- 工具結果配對修復
- 回合驗證 / 排序
- 思維簽章清理
- 圖像 Payload 清理
- 使用者輸入來源標記（用於跨會話路由的提示）

如果您需要文字記錄儲存的詳細資訊，請參閱：

- [/reference/session-management-compaction](/zh-Hant/reference/session-management-compaction)

---

## 運行位置

所有文字記錄清理都集中在嵌入式 Runner 中：

- 原則選擇： `src/agents/transcript-policy.ts`
- 清理/修復應用： `sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/google.ts`

該原則使用 `provider`、`modelApi` 和 `modelId` 來決定套用什麼。

與文字記錄清理分開，會話檔案會在載入前進行修復（如需要）：

- `repairSessionFileIfNeeded` 中的 `src/agents/session-file-repair.ts`
- 從 `run/attempt.ts` 和 `compact.ts` 呼叫（嵌入式 Runner）

---

## 全域規則：圖像清理

圖像 Payload 始終經過清理，以防止因大小限制而導致供應商端拒絕（對過大的 base64 圖像進行縮小/重新壓縮）。

這也有助於控制具備視覺能力的模型的圖像驅動 Token 壓力。較低的最大尺寸通常會減少 Token 使用量；較高的尺寸則保留細節。

實作：

- `sanitizeSessionMessagesImages` 在 `src/agents/pi-embedded-helpers/images.ts` 中
- `sanitizeContentBlocksImages` 在 `src/agents/tool-images.ts` 中
- 最大圖像邊長可透過 `agents.defaults.imageMaxDimensionPx` 設定（預設：`1200`）。

---

## 全域規則：格式錯誤的工具呼叫

同時缺少 `input` 和 `arguments` 的助理工具呼叫區塊會在建立模型內容之前捨棄。這可防止因部分持續化的工具呼叫（例如在速率限制失敗後）而導致的供應商拒絕。

實作：

- `sanitizeToolCallInputs` 在 `src/agents/session-transcript-repair.ts` 中
- 套用於 `sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/google.ts`

---

## 全域規則：跨工作階段輸入來源

當代理透過 `sessions_send` 將提示傳送至另一個工作階段時（包括代理對代理回覆/公告步驟），OpenClaw 會持續化建立的使用者回合，包含：

- `message.provenance.kind = "inter_session"`

此中繼資料是在文字記錄附加時間寫入的，並不會變更角色（`role: "user"` 保持不變以確保供應商相容性）。文字記錄讀取器可以使用此資料來避免將路由的內部提示視為終端使用者撰寫的指令。

在重建內容時，OpenClaw 也會在記憶體中將一個簡短的 `[Inter-session message]` 標記加至那些使用者回合之前，以便模型能夠將其與外部終端使用者的指令區分開來。

---

## 供應商對照表（目前行為）

**OpenAI / OpenAI Codex**

- 僅進行圖像清理。
- 捨棄 OpenAI Responses/Codex 文字記錄中的孤立推理簽章（沒有後續內容區塊的獨立推理項目）。
- 不進行工具呼叫 ID 清理。
- 不進行工具結果配對修復。
- 不進行回合驗證或重新排序。
- 不產生合成工具結果。
- 不進行思考簽章剝除。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具呼叫 ID 清理：嚴格的英數字元。
- 工具結果配對修復與合成工具結果。
- 回合驗證（Gemini 風格的回合交替）。
- Google 回合排序修整（如果歷史紀錄以助理開頭，則在前面加上微小的使用者啟動）。
- Antigravity Claude：正規化思考簽章；捨棄未簽署的思考區塊。

**Anthropic / Minimax (Anthropic 相容)**

- 工具結果配對修復與合成工具結果。
- 回合驗證（合併連續的使用者回合以滿足嚴格交替）。

**Mistral (包括基於 model-id 的偵測)**

- 工具呼叫 ID 清理：strict9 (長度為 9 的英數字元)。

**OpenRouter Gemini**

- 思考簽章清理：移除非 base64 `thought_signature` 數值 (保留 base64)。

**其他所有項目**

- 僅圖片清理。

---

## 歷史行為 (2026.1.22 之前)

在 2026.1.22 版本發布之前，OpenClaw 套用了多層次的對話清理：

- 每當建置內容時都會執行 **transcript-sanitize extension**，並能夠：
  - 修復工具使用/結果配對。
  - 清理工具呼叫 ID (包括保留 `_`/`-` 的非嚴格模式)。
- Runner 也會執行特定供應商的清理，這導致了工作重複。
- 在供應商政策之外還發生了額外變更，包括：
  - 在持久化之前，從助手文字中移除 `<final>` 標籤。
  - 捨棄空的助手錯誤回合。
  - 在工具呼叫之後修剪助手內容。

這種複雜性導致了跨供應商的回歸問題 (特別是 `openai-responses`
`call_id|fc_id` 配對)。2026.1.22 的清理工作移除了該擴充功能，將邏輯集中到
runner 中，並使 OpenAI 除了圖片清理之外完全 **不觸碰 (no-touch)**。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
