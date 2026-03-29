---
summary: "/think、/fast、/verbose 和推理可見性的指令語法"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "思考層級"
---

# 思考層級（/think 指令）

## 作用

- 任何輸入內容中的內聯指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 層級（別名）：`off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → 「think」
  - low → 「think hard」
  - medium → 「think harder」
  - high → 「ultrathink」（最大預算）
  - xhigh → 「ultrathink+」（僅限 GPT-5.2 + Codex 模型）
  - adaptive → 由供應商管理的自適應推理預算（支援 Anthropic Claude 4.6 模型系列）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 對應到 `xhigh`。
  - `highest`、`max` 對應到 `high`。
- 供應商注意事項：
  - 當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive`。
  - Z.AI (`zai/*`) 僅支援二元思考 (`on`/`off`)。任何非 `off` 層級都被視為 `on`（對應到 `low`）。
  - Moonshot (`moonshot/*`) 將 `/think off` 對應到 `thinking: { type: "disabled" }`，將任何非 `off` 層級對應到 `thinking: { type: "enabled" }`。當啟用思考時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息上的內聯指令（僅適用於該訊息）。
2. 會話覆蓋（透過發送僅含指令的訊息進行設定）。
3. 每個代理的預設值（配置中的 `agents.list[].thinkingDefault`）。
4. 全域預設值（配置中的 `agents.defaults.thinkingDefault`）。
5. 後備方案：對於 Anthropic Claude 4.6 模型使用 `adaptive`，對於其他具備推理能力的模型使用 `low`，其他情況則使用 `off`。

## 設定會話預設值

- 傳送一條**僅**包含指令（允許空白字元）的訊息，例如 `/think:medium` 或 `/t high`。
- 該設定對當前會話持續有效（預設為每位傳送者獨立）；會透過 `/think:off` 或會話閒置重置來清除。
- 將傳送確認回覆（`Thinking level set to high.` / `Thinking disabled.`）。如果等級無效（例如 `/thinking big`），該指令將被拒絕並顯示提示，且會話狀態保持不變。
- 傳送不帶參數的 `/think`（或 `/think:`）以查看當前的思考等級。

## 由代理程式套用

- **嵌入式 Pi**：解析出的等級會傳遞給程序內的 Pi 代理程式執行時期。

## 快速模式 (/fast)

- 等級：`on|off`。
- 僅包含指令的訊息會切換會話的快速模式覆寫，並回覆 `Fast mode enabled.` / `Fast mode disabled.`。
- 傳送不帶模式的 `/fast`（或 `/fast status`）以查看當前有效的快速模式狀態。
- OpenClaw 依照以下順序解析快速模式：
  1. 內聯/僅指令 `/fast on|off`
  2. 會話覆寫
  3. 各代理程式預設值（`agents.list[].fastModeDefault`）
  4. 各模型設定：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 後備方案：`off`
- 對於 `openai/*`，快速模式會在支援時套用 OpenAI 快速設定檔：`service_tier=priority`，加上低推理強度與低文字詳細程度。
- 對於 `openai-codex/*`，快速模式會在 Codex Responses 上套用相同的低延遲設定檔。OpenClaw 在兩個驗證路徑之間保持一個共用的 `/fast` 切換開關。
- 對於直接的 `anthropic/*` API 金鑰請求，快速模式會對應到 Anthropic 服務層級：`/fast on` 設定 `service_tier=auto`，`/fast off` 設定 `service_tier=standard_only`。
- Anthropic 快速模式僅支援 API 金鑰。OpenClaw 會略過針對 Claude 設定權杖 / OAuth 驗證以及非 Anthropic 代理基底 URL 的 Anthropic 服務層級注入。

## 詳細指令 (/verbose 或 /v)

- 等級：`on` (最少) | `full` | `off` (預設)。
- 僅含指令的訊息會切換工作階段詳細模式並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效的等級會傳回提示而不會改變狀態。
- `/verbose off` 會儲存明確的工作階段覆寫；您可以透過工作階段 UI 選擇 `inherit` 來清除它。
- 內聯指令僅影響該訊息；否則將套用工作階段/全域預設值。
- 傳送 `/verbose` (或 `/verbose:`) 且不帶引數以查看目前的詳細等級。
- 當開啟詳細模式時，發出結構化工具結果的代理程式 (Pi、其他 JSON 代理程式) 會將每個工具呼叫作為僅包含元資料的訊息傳回，並在可用時加上 `<emoji> <tool-name>: <arg>` 前綴 (路徑/指令)。這些工具摘要會在每個工具啟動時立即傳送 (獨立的氣泡)，而非作為串流差異。
- 工具失敗摘要在正常模式下保持可見，但原始錯誤詳細資訊後綴會被隱藏，除非詳細模式為 `on` 或 `full`。
- 當詳細模式為 `full` 時，工具輸出也會在完成後轉發 (獨立氣泡，截斷至安全長度)。如果您在執行期間切換 `/verbose on|full|off`，後續的工具氣泡將採用新設定。

## 推論可見性 (/reasoning)

- 等級：`on|off|stream`。
- 僅含指令的訊息會切換是否在回覆中顯示思考區塊。
- 啟用時，推論會作為一條以 `Reasoning:` 為前綴的 **獨立訊息** 傳送。
- `stream` (僅限 Telegram)：在產生回覆時將推論串流至 Telegram 草稿氣泡，然後傳送不含推論的最終答案。
- 別名：`/reason`。
- 傳送 `/reasoning` (或 `/reasoning:`) 且不帶引數以查看目前的推論等級。
- 解析順序：內聯指令，然後是會話覆蓋，接著是各代理預設值（`agents.list[].reasoningDefault`），最後是後備值（`off`）。

## 相關

- 昇華模式文檔位於 [昇華模式](/en/tools/elevated) 中。

## 心跳

- 心跳探測主體是已配置的心跳提示詞（預設：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳訊息中的內聯指令照常適用（但請避免從心跳更改會話預設值）。
- 心跳傳遞預設僅發送最終有效載荷。若也要發送單獨的 `Reasoning:` 訊息（如果有的話），請設定 `agents.defaults.heartbeat.includeReasoning: true` 或各代理的 `agents.list[].heartbeat.includeReasoning: true`。

## 網頁聊天 UI

- 網頁聊天思考選擇器會在頁面載入時反映傳入會話存儲/配置中所儲存的會話層級。
- 選擇其他層級僅適用於下一則訊息（`thinkingOnce`）；發送後，選擇器會還原為儲存的會話層級。
- 若要更改會話預設值，請發送 `/think:<level>` 指令（同前）；選擇器將在下次重新載入後反映更改。
