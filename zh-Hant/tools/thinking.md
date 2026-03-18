---
summary: "/think、/fast、/verbose 的指令語法與推理可見性"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "思考層級"
---

# 思考層級 (/think 指令)

## 功能說明

- 任何輸入內文中的內聯指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 層級（別名）：`off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → 「think」
  - low → 「think hard」
  - medium → 「think harder」
  - high → 「ultrathink」（最大預算）
  - xhigh → 「ultrathink+」（僅限 GPT-5.2 + Codex 模型）
  - adaptive → 由供應商管理的自適應推理預算（支援 Anthropic Claude 4.6 模型系列）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 對應至 `xhigh`。
  - `highest`、`max` 對應至 `high`。
- 供應商說明：
  - 當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive`。
  - Z.AI (`zai/*`) 僅支援二元思考 (`on`/`off`)。任何非 `off` 層級會被視為 `on` (對應至 `low`)。
  - Moonshot (`moonshot/*`) 將 `/think off` 對應至 `thinking: { type: "disabled" }`，並將任何非 `off` 層級對應至 `thinking: { type: "enabled" }`。當啟用思考時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息上的內聯指令（僅套用於該訊息）。
2. Session 覆蓋（透過發送僅包含指令的訊息來設定）。
3. 全域預設值（設定檔中的 `agents.defaults.thinkingDefault`）。
4. 後備值：Anthropic Claude 4.6 模型為 `adaptive`，其他具備推理能力的模型為 `low`，否則為 `off`。

## 設定工作階段預設值

- 傳送一則**僅**包含指令的訊息（允許空白字元），例如 `/think:medium` 或 `/t high`。
- 該設定會套用至目前的工作階段（預設為每位傳送者獨立）；可透過 `/think:off` 或工作階段閒置重置來清除。
- 系統會傳送確認回覆（`Thinking level set to high.` / `Thinking disabled.`）。如果等級無效（例如 `/thinking big`），該指令將會被拒絕並顯示提示訊息，而工作階段狀態將保持不變。
- 傳送 `/think`（或 `/think:`） 且不帶參數，以查看目前的思考等級。

## 代理程式應用

- **嵌入式 Pi**：解析後的等級會傳遞至程序內的 Pi 代理程式執行時。

## 快速模式 (/fast)

- 等級：`on|off`。
- 僅包含指令的訊息會切換工作階段的快速模式覆寫，並回覆 `Fast mode enabled.` / `Fast mode disabled.`。
- 傳送 `/fast`（或 `/fast status`） 且不帶模式，以查看目前有效的快速模式狀態。
- OpenClaw 依照以下順序解析快速模式：
  1. 內嵌/僅指令 `/fast on|off`
  2. 工作階段覆寫
  3. 各模型設定：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  4. 後備：`off`
- 對於 `openai/*`，快速模式會套用 OpenAI 快速設定檔：受支援時使用 `service_tier=priority`，並搭配低推理強度與低文字詳細程度。
- 對於 `openai-codex/*`，快速模式會在 Codex Responses 上套用相同的低延遲設定檔。OpenClaw 在這兩種驗證路徑之間維護一個共用的 `/fast` 切換開關。
- 對於直接的 `anthropic/*` API 金鑰請求，快速模式會對應到 Anthropic 服務等級：`/fast on` 設定 `service_tier=auto`，`/fast off` 設定 `service_tier=standard_only`。
- Anthropic 快速模式僅支援 API 金鑰。對於 Claude 設定權杖 / OAuth 驗證以及非 Anthropic 代理伺服器基礎 URL，OpenClaw 會跳過 Anthropic 服務等級的注入。

## 詳細指令 (/verbose 或 /v)

- 層級：`on` (最小) | `full` | `off` (預設)。
- 僅指令訊息會切換工作階段的詳細模式，並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效的層級會傳回提示而不改變狀態。
- `/verbose off` 會儲存明確的工作階段覆寫；透過工作階段 UI 選擇 `inherit` 來清除它。
- 內聯指令僅影響該訊息；否則套用工作階段/全域預設值。
- 傳送 `/verbose` (或 `/verbose:`) 且不帶引數，以查看目前的詳細層級。
- 當詳細模式開啟時，發出結構化工具結果的代理程式 (Pi、其他 JSON 代理程式) 會將每個工具呼叫作為其自身的僅中繼資料訊息傳回，並在可用時加上 `<emoji> <tool-name>: <arg>` 前綴 (路徑/指令)。這些工具摘要會在每個工具啟動時立即傳送 (獨立的氣泡)，而非作為串流增量。
- 工具失敗摘要在一般模式下保持可見，但原始錯誤詳細資訊後綴會被隱藏，除非詳細層級為 `on` 或 `full`。
- 當詳細層級為 `full` 時，工具輸出也會在完成後轉發 (獨立氣泡，截斷至安全長度)。如果您在執行期間切換 `/verbose on|full|off`，後續的工具氣泡將遵循新設定。

## 推論可見性 (/reasoning)

- 層級：`on|off|stream`。
- 僅指令訊息會切換是否在回覆中顯示思考區塊。
- 啟用時，推論會作為以 `Reasoning:` 為前綴的 **獨立訊息** 傳送。
- `stream` (僅限 Telegram)：在產生回覆時將推論串流至 Telegram 草稿氣泡中，然後傳送不含推論的最終答案。
- 別名：`/reason`。
- 傳送 `/reasoning` (或 `/reasoning:`) 且不帶引數，以查看目前的推論層級。

## 相關

- 提昇模式文件位於 [提昇模式](/zh-Hant/tools/elevated)。

## 心跳

- 心跳探訊內容為設定的心跳提示（預設：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳訊息中的內聯指令照常套用（但請避免從心跳中變更工作階段預設值）。
- 心跳傳送預設僅包含最終載荷。若也要傳送獨立的 `Reasoning:` 訊息（當可用時），請設定 `agents.defaults.heartbeat.includeReasoning: true` 或個別代理的 `agents.list[].heartbeat.includeReasoning: true`。

## 網頁聊天介面

- 網頁聊天的思考選擇器會在頁面載入時反映來自傳入工作階段存放區/設定中所儲存的工作階段等級。
- 選擇其他等級僅會套用於下一則訊息（`thinkingOnce`）；傳送後，選擇器會恢復為儲存的工作階段等級。
- 若要變更工作階段預設值，請傳送 `/think:<level>` 指令（如同先前做法）；選擇器會在下一次重新載入後反映該變更。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
