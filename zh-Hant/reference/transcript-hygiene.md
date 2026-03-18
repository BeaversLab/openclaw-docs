---
summary: "參考：特定提供者的對話紀錄清理與修復規則"
read_when:
  - You are debugging provider request rejections tied to transcript shape
  - You are changing transcript sanitization or tool-call repair logic
  - You are investigating tool-call id mismatches across providers
title: "對話紀錄清理"
---

# 對話紀錄清理（提供者修復）

本文件描述在運行（建立模型上下文）之前應用於對話紀錄的**特定提供者修復**。這些是用於滿足嚴格提供者要求的**記憶體中**調整。這些清理步驟**並不**會重寫磁碟上儲存的 JSONL 對話紀錄；然而，個別的對話檔案修復程序可能會透過在載入對話之前捨棄無效行來重寫格式錯誤的 JSONL 檔案。當發生修復時，原始檔案會與對話檔案一起備份。

範圍包括：

- 工具呼叫 ID 清理
- 工具呼叫輸入驗證
- 工具結果配對修復
- 輪次驗證 / 排序
- 思維簽章清理
- 圖片載荷清理
- 使用者輸入來源標記（用於跨對話路由提示）

如果您需要對話紀錄儲存詳細資訊，請參閱：

- [/reference/session-management-compaction](/zh-Hant/reference/session-management-compaction)

---

## 執行位置

所有對話紀錄清理都集中在嵌入式執行器中：

- 原則選取：`src/agents/transcript-policy.ts`
- 清理/修復應用：`sanitizeSessionHistory` 於 `src/agents/pi-embedded-runner/google.ts`

該原則使用 `provider`、`modelApi` 和 `modelId` 來決定要套用什麼。

與對話紀錄清理分開的是，對話檔案會在載入前（如需要）進行修復：

- `repairSessionFileIfNeeded` 於 `src/agents/session-file-repair.ts`
- 從 `run/attempt.ts` 和 `compact.ts`（嵌入式執行器）呼叫

---

## 全域規則：圖片清理

圖片載荷總是會經過清理，以防止因大小限制而導致提供者端拒絕（對過大的 base64 圖片進行縮小/重新壓縮）。

這也有助於控制視覺模型的圖片驅動 token 壓力。較低的最大尺寸通常會減少 token 使用量；較高的尺寸則能保留細節。

實作：

- `sanitizeSessionMessagesImages` 於 `src/agents/pi-embedded-helpers/images.ts`
- `sanitizeContentBlocksImages` 於 `src/agents/tool-images.ts`
- 圖片最大邊長可透過 `agents.defaults.imageMaxDimensionPx` 設定（預設：`1200`）。

---

## 全域規則：格式錯誤的工具呼叫

遺失 `input` 和 `arguments` 的助理工具呼叫區塊會在建立模型
語境之前被捨棄。這可防止因部分持久化的工具呼叫（例如，速率限制失敗後）
而導致供應商拒絕請求。

實作：

- `sanitizeToolCallInputs` 於 `src/agents/session-transcript-repair.ts` 中
- 套用於 `sanitizeSessionHistory` 中的 `src/agents/pi-embedded-runner/google.ts`

---

## 全域規則：跨工作階段輸入來源

當代理透過 `sessions_send` 將提示發送至另一個工作階段時（包括
代理對代理的回覆/公告步驟），OpenClaw 會將建立的使用者輪次持久化並附帶：

- `message.provenance.kind = "inter_session"`

此元資料會在附加至對話紀錄時寫入，並不會變更角色
（`role: "user"` 會保持不變以符合供應商相容性）。對話紀錄讀取器可使用
此資訊，以避免將路由的內部提示視為終端使用者撰寫的指令。

在重建語境時，OpenClaw 也會在記憶體中將簡短的 `[Inter-session message]`
標記加至那些使用者輪次前方，以便模型能將其與
外部終端使用者的指令區分開來。

---

## 供應商矩陣（目前行為）

**OpenAI / OpenAI Codex**

- 僅圖片清理。
- 針對 OpenAI Responses/Codex 對話紀錄，捨棄孤立的推理簽章（沒有後續內容區塊的獨立推理項目）。
- 不進行工具呼叫 ID 清理。
- 不進行工具結果配對修復。
- 不進行輪次驗證或重新排序。
- 無合成工具結果。
- 不移除思維簽章。

**Google (Generative AI / Gemini CLI / Antigravity)**

- 工具呼叫 ID 清理：嚴格字母數字。
- 工具結果配對修復與合成工具結果。
- 輪次驗證（Gemini 風格的輪次交替）。
- Google 輪次排序修復（如果歷史記錄以助理開頭，則在前面加上微小的使用者啟動）。
- Antigravity Claude：正規化思維簽章；捨棄未簽署的思維區塊。

**Anthropic / Minimax (Anthropic-compatible)**

- 工具結果配對修復與合成工具結果。
- 輪次驗證（合併連續的使用者輪次以滿足嚴格的交替規則）。

**Mistral（包括基於模型 ID 的檢測）**

- 工具呼叫 ID 清理：strict9（長度為 9 的英數字元）。

**OpenRouter Gemini**

- 思考簽名清理：去除非 base64 的 `thought_signature` 值（保留 base64）。

**其他所有**

- 僅清理影像。

---

## 歷史行為（2026.1.22 之前）

在 2026.1.22 版本發布之前，OpenClaw 應用了多層的對話記錄清理：

- 一個 **transcript-sanitize 擴充套件** 在每次建構語境時執行，並且能夠：
  - 修復工具使用/結果配對。
  - 清理工具呼叫 ID（包括一個保留 `_`/`-` 的非嚴格模式）。
- 執行器也執行了特定於提供商的清理，這導致了重複的工作。
- 在提供商原則之外發生了額外的變異，包括：
  - 在持久化之前從助手文本中去除 `<final>` 標籤。
  - 捨棄空的助手錯誤輪次。
  - 修剪工具呼叫後的助手內容。

這種複雜性導致了跨提供商的回歸（特別是 `openai-responses`
`call_id|fc_id` 配對）。2026.1.22 的清理移除了該擴充套件，將邏輯集中到執行器中，並使 OpenAI 除了影像清理外變為 **no-touch**。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
