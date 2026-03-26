---
summary: "/think、/fast、/verbose 以及推理可見性的指令語法"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "思考層級"
---

# 思考層級（/think 指令）

## 功能說明

- 任何傳入內文中的內聯指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 層級（別名）：`off | minimal | low | medium | high | xhigh | adaptive`
  - minimal → “think”
  - low → “think hard”
  - medium → “think harder”
  - high → “ultrathink” (最大預算)
  - xhigh → “ultrathink+” (僅限 GPT-5.2 + Codex 模型)
  - adaptive → 由供應商管理的自適應推理預算（支援 Anthropic Claude 4.6 模型系列）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 對應到 `xhigh`。
  - `highest`、`max` 對應到 `high`。
- 供應商備註：
  - 當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive`。
  - Z.AI (`zai/*`) 僅支援二元思考 (`on`/`off`)。任何非 `off` 層級都會被視為 `on` (對應至 `low`)。
  - Moonshot (`moonshot/*`) 將 `/think off` 對應至 `thinking: { type: "disabled" }`，並將任何非 `off` 層級對應至 `thinking: { type: "enabled" }`。啟用思考時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息上的內聯指令（僅適用於該訊息）。
2. 會話覆蓋（透過發送純指令訊息來設定）。
3. 全域預設值（組態中的 `agents.defaults.thinkingDefault`）。
4. 後備值：對於 Anthropic Claude 4.6 模型為 `adaptive`，對於其他具備推理能力的模型為 `low`，否則為 `off`。

## 設定會話預設值

- 發送一條**僅**包含指令的訊息（允許空白字元），例如 `/think:medium` 或 `/t high`。
- 這將套用於當前會話（預設為按發送者區分）；並會由 `/think:off` 或會話閒置重置來清除。
- 系統會發送確認回覆（`Thinking level set to high.` / `Thinking disabled.`）。如果等級無效（例如 `/thinking big`），該指令將被拒絕並顯示提示，且會話狀態保持不變。
- 發送不帶參數的 `/think`（或 `/think:`）以查看當前的思考等級。

## 由代理程式套用

- **嵌入式 Pi**：解析後的等級會傳遞給進程內的 Pi 代理程式執行時。

## 快速模式

- 等級：`on|off`。
- 僅包含指令的訊息會切換會話的快速模式覆寫設定，並回覆 `Fast mode enabled.` / `Fast mode disabled.`。
- 發送不帶模式參數的 `/fast`（或 `/fast status`）以查看當前有效的快速模式狀態。
- OpenClaw 按以下順序解析快速模式：
  1. 內聯/僅指令 `/fast on|off`
  2. 會話覆寫
  3. 每個模型的配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  4. 後備值：`off`
- 對於 `openai/*`，快速模式會套用 OpenAI 快速配置檔案：在支援的情況下使用 `service_tier=priority`，並採用低推理強度與低文字冗長度。
- 對於 `openai-codex/*`，快速模式會在 Codex 回應上套用相同的低延遲配置檔案。OpenClaw 在這兩個驗證路徑之間共用一個 `/fast` 切換開關。
- 對於直接 `anthropic/*` API 金鑰請求，快速模式會對應到 Anthropic 服務層級：`/fast on` 會設定 `service_tier=auto`，`/fast off` 會設定 `service_tier=standard_only`。
- Anthropic 快速模式僅支援 API 金鑰。針對 Claude 設定權杖 / OAuth 驗證，以及非 Anthropic 代理基礎 URL，OpenClaw 會跳過 Anthropic 服務層級的注入。

## 詳細指令

- 層級：`on` (最小) | `full` | `off` (預設)。
- 僅包含指令的訊息會切換會話的詳細模式並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效的層級會傳回提示而不改變狀態。
- `/verbose off` 會儲存明確的會話覆蓋設定；您可以透過 Sessions UI 選擇 `inherit` 來清除它。
- 內聯指令僅影響該則訊息；否則會套用會話/全域預設值。
- 傳送 `/verbose` (或 `/verbose:`) 且不帶任何引數，以查看目前的詳細層級。
- 當詳細模式開啟時，發出結構化工具結果的代理程式 (Pi、其他 JSON 代理程式) 會將每個工具呼叫作為獨立的僅含元資料的訊息傳回，若可用則會以 `<emoji> <tool-name>: <arg>` 為前綴 (路徑/指令)。這些工具摘要會在每個工具啟動時立即傳送 (獨立的氣泡)，而非作為串流增量傳送。
- 工具失敗摘要在一般模式下仍然可見，但除非詳細模式為 `on` 或 `full`，否則原始錯誤詳情後綴會被隱藏。
- 當詳細模式為 `full` 時，工具輸出也會在完成後轉發 (獨立氣泡，截斷至安全長度)。如果您在執行期間切換 `/verbose on|full|off`，後續的工具氣泡將採用新設定。

## 推理可見性 (/reasoning)

- 層級：`on|off|stream`。
- 僅包含指令的訊息會切換是否在回覆中顯示思考區塊。
- 啟用時，推理會作為以 `Reasoning:` 為前綴的**獨立訊息**傳送。
- `stream` (僅限 Telegram)：在產生回覆時將推理串流至 Telegram 草稿氣泡中，然後傳送不含推理的最終答案。
- 別名：`/reason`。
- 傳送 `/reasoning` (或 `/reasoning:`) 且不帶任何引數，以查看目前的推理層級。

## 相關

- 提升模式 文件位於 [提升模式](/zh-Hant/tools/elevated)。

## 心跳

- 心跳探測主體是已設定的心跳提示（預設：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳訊息中的內聯指令照常套用（但請避免從心跳變更會話預設值）。
- 心跳傳遞預設僅限於最終承載。若也要傳送單獨的 `Reasoning:` 訊息（當可用時），請設定 `agents.defaults.heartbeat.includeReasoning: true` 或個別代理的 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天 UI

- Web 聊天的思考選取器會在頁面載入時，反映來自傳入會話儲存/設定之會話的已儲存層級。
- 選擇另一個層級僅適用於下一則訊息（`thinkingOnce`）；傳送後，選取器會恢復為已儲存的會話層級。
- 若要變更會話預設值，請傳送 `/think:<level>` 指令（如前所述）；選取器將在下次重新載入後反映此變更。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
