---
summary: "/think、/fast、/verbose 指令語法與推理可見性"
read_when:
  - 調整思考、快模式或詳細指令的解析或預設值
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
  - Anthropic Claude 4.6 模型在未設定明確思考層級時，預設為 `adaptive`。
  - Z.AI (`zai/*`) 僅支援二元思考 (`on`/`off`)。任何非 `off` 層級皆被視為 `on` (對應至 `low`)。
  - Moonshot (`moonshot/*`) 將 `/think off` 對應至 `thinking: { type: "disabled" }`，並將任何非 `off` 層級對應至 `thinking: { type: "enabled" }`。啟用思考時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息上的內聯指令（僅套用於該訊息）。
2. Session 覆蓋（透過發送僅包含指令的訊息來設定）。
3. 全域預設值 (設定中的 `agents.defaults.thinkingDefault`)。
4. 後備值：Anthropic Claude 4.6 模型為 `adaptive`，其他具備推理能力的模型為 `low`，其他情況則為 `off`。

## 設定工作階段預設值

- 發送一則**僅**包含指令的訊息（允許空白字元），例如 `/think:medium` 或 `/t high`。
- 這會對當前工作階段生效（預設為針對每位發送者）；可透過 `/think:off` 或工作階段閒置重置來清除。
- 會發送確認回覆 (`Thinking level set to high.` / `Thinking disabled.`)。如果等級無效（例如 `/thinking big`），該指令將會被拒絕並顯示提示，且會話狀態保持不變。
- 傳送 `/think`（或 `/think:`）且不帶參數，以查看目前的思考等級。

## 代理程式應用

- **嵌入式 Pi**：解析後的等級會傳遞至程序內的 Pi 代理程式執行時。

## 快速模式 (/fast)

- 等級：`on|off`。
- 純指令訊息會切換會話的快速模式覆寫，並回覆 `Fast mode enabled.` / `Fast mode disabled.`。
- 傳送 `/fast`（或 `/fast status`）且不帶模式，以查看目前有效的快速模式狀態。
- OpenClaw 依照以下順序解析快速模式：
  1. 內聯/純指令 `/fast on|off`
  2. 工作階段覆寫
  3. 每個模型的配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  4. 後備：`off`
- 對於 `openai/*`，快速模式會套用 OpenAI 快速配置檔：在支援時使用 `service_tier=priority`，以及低推理強度和低文字詳細程度。
- 對於 `openai-codex/*`，快速模式會在 Codex 回應上套用相同的低延遲配置檔。OpenClaw 在這兩種驗證路徑之間共用一個 `/fast` 切換開關。
- 對於直接 `anthropic/*` API 金鑰請求，快速模式會對應至 Anthropic 服務層級：`/fast on` 設定 `service_tier=auto`，`/fast off` 設定 `service_tier=standard_only`。
- Anthropic 快速模式僅支援 API 金鑰。對於 Claude 設定權杖 / OAuth 驗證以及非 Anthropic 代理伺服器基礎 URL，OpenClaw 會跳過 Anthropic 服務等級的注入。

## 詳細指令 (/verbose 或 /v)

- 等級：`on`（最少） | `full` | `off`（預設）。
- 純指令訊息會切換會話詳細程度並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效等級會傳回提示且不會變更狀態。
- `/verbose off` 會儲存明確的會話覆寫；您可以透過選擇 `inherit` 在會話 UI 中將其清除。
- 內聯指令僅影響該訊息；否則套用工作階段/全域預設值。
- 傳送 `/verbose`（或 `/verbose:`）且不帶參數，以查看目前的詳細程度等級。
- 當 verbose 開啟時，發出結構化工具結果的代理（Pi、其他 JSON 代理）會將每個工具呼叫作為單獨的僅元數據訊息傳回，並在可用時加上 `<emoji> <tool-name>: <arg>` 前綴（路徑/指令）。這些工具摘要會在每個工具啟動時立即發送（獨立的氣泡），而不是作為串流增量發送。
- 工具失敗摘要在正常模式下仍然可見，但除非 verbose 設為 `on` 或 `full`，否則原始錯誤詳細資訊後綴會被隱藏。
- 當 verbose 設為 `full` 時，工具輸出也會在完成後轉發（獨立氣泡，截斷至安全長度）。如果您在執行過程中切換 `/verbose on|full|off`，後續的工具氣泡將遵循新設定。

## 推論可見性 (/reasoning)

- 等級：`on|off|stream`。
- 僅指令訊息會切換是否在回覆中顯示思考區塊。
- 啟用時，推理會作為**單獨訊息**發送，並加上 `Reasoning:` 前綴。
- `stream`（僅限 Telegram）：在產生回覆時將推理串流至 Telegram 草稿氣泡，然後發送不包含推理的最終答案。
- 別名：`/reason`。
- 發送不帶參數的 `/reasoning`（或 `/reasoning:`）以查看當前的推理等級。

## 相關

- 提升模式文件位於 [Elevated mode](/zh-Hant/tools/elevated)。

## 心跳

- 心跳探測主體是設定的心跳提示（預設：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳訊息中的內聯指令照常應用（但請避免從心跳更改會話預設值）。
- 心跳傳送預設僅限最終有效載荷。若也要發送單獨的 `Reasoning:` 訊息（當可用時），請設定 `agents.defaults.heartbeat.includeReasoning: true` 或每個代理的 `agents.list[].heartbeat.includeReasoning: true`。

## 網頁聊天介面

- 網頁聊天的思考選擇器會在頁面載入時反映來自傳入工作階段存放區/設定中所儲存的工作階段等級。
- 選擇另一個等級僅適用於下一則訊息（`thinkingOnce`）；發送後，選擇器會恢復為儲存的會話等級。
- 若要變更會話預設值，請發送 `/think:<level>` 指令（如同往常）；選擇器將在下次重新載入後反映該設定。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
