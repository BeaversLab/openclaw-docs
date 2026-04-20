---
summary: "Directive syntax for /think, /fast, /verbose, /trace, and reasoning visibility"
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
  - xhigh → 「ultrathink+」（GPT-5.2 + Codex 模型和 Anthropic Claude Opus 4.7 力度）
  - adaptive → 提供商管理的自適應思考（支援 Anthropic Claude 4.6 和 Opus 4.7）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 對應到 `xhigh`。
  - `highest`、`max` 對應到 `high`。
- 供應商注意事項：
  - 當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive`。
  - Anthropic Claude Opus 4.7 預設不使用自適應思考。除非您明確設定思考等級，否則其 API 力度預設值仍由提供商擁有。
  - Anthropic Claude Opus 4.7 將 `/think xhigh` 對應到自適應思考加上 `output_config.effort: "xhigh"`，因為 `/think` 是思考指令，而 `xhigh` 是 Opus 4.7 的力度設定。
  - 在 Anthropic 相容串流路徑上的 MiniMax（`minimax/*`）預設為 `thinking: { type: "disabled" }`，除非您在模型參數或請求參數中明確設定思考。這可避免從 MiniMax 非原生的 Anthropic 串流格式中洩漏 `reasoning_content` 增量。
  - Z.AI（`zai/*`）僅支援二元思考（`on`/`off`）。任何非 `off` 等級都會被視為 `on`（對應到 `low`）。
  - Moonshot（`moonshot/*`）將 `/think off` 對應到 `thinking: { type: "disabled" }`，並將任何非 `off` 等級對應到 `thinking: { type: "enabled" }`。當啟用思考時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息上的內聯指令（僅適用於該訊息）。
2. 會話覆寫（透過發送僅包含指令的訊息來設定）。
3. 各代理預設值（設定中的 `agents.list[].thinkingDefault`）。
4. 全域預設值（設定中的 `agents.defaults.thinkingDefault`）。
5. 後備：Anthropic Claude 4.6 模型為 `adaptive`，除非明確配置否則 Anthropic Claude Opus 4.7 為 `off`，其他具備推理能力的模型為 `low`，其他情況則為 `off`。

## 設定會話預設值

- 發送一則**僅**包含指令的訊息（允許空白字元），例如 `/think:medium` 或 `/t high`。
- 該設定將套用於目前的工作階段（預設為每位發送者個別設定）；可透過 `/think:off` 或工作階段閒置重置來清除。
- 系統會發送確認回覆（`Thinking level set to high.` / `Thinking disabled.`）。如果等級無效（例如 `/thinking big`），該指令將被拒絕並顯示提示，且工作階段狀態將保持不變。
- 傳送 `/think`（或 `/think:`） 且不帶任何參數，以查看目前的思考等級。

## 由代理程式套用

- **嵌入式 Pi**：解析後的等級會傳遞給程序內的 Pi 代理程式執行環境。

## 快速模式 (/fast)

- 等級：`on|off`。
- 僅包含指令的訊息會切換工作階段的快速模式覆寫設定，並回覆 `Fast mode enabled.` / `Fast mode disabled.`。
- 傳送 `/fast`（或 `/fast status`） 且不指定模式，以查看目前實際生效的快速模式狀態。
- OpenClaw 依照以下順序解析快速模式：
  1. 內聯/僅指令 `/fast on|off`
  2. 工作階段覆寫
  3. 各代理程式預設值（`agents.list[].fastModeDefault`）
  4. 各模型設定：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 後備值：`off`
- 對於 `openai/*`，快速模式會透過在支援的 Responses 請求中發送 `service_tier=priority`，對應至 OpenAI 的優先處理。
- 對於 `openai-codex/*`，快速模式會在 Codex Responses 上發送相同的 `service_tier=priority` 標誌。OpenClaw 在這兩種驗證路徑之間維持一個共用的 `/fast` 切換開關。
- 對於直接公開的 `anthropic/*` 請求，包括發送到 `api.anthropic.com` 的 OAuth 驗證流量，快速模式會對應至 Anthropic 服務等級：`/fast on` 設定 `service_tier=auto`，`/fast off` 設定 `service_tier=standard_only`。
- 對於 Anthropic 相容路徑上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。
- 當同時設定了明確的 Anthropic `serviceTier` / `service_tier` 模型參數時，它們會覆寫快速模式的預設值。對於非 Anthropic 代理基礎 URL，OpenClaw 仍會跳過 Anthropic 服務層級的注入。

## 詳細指令 (/verbose 或 /v)

- 層級：`on`（最少）| `full` | `off`（預設）。
- 僅含指令的訊息會切換工作階段的詳細模式並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效的層級會傳回提示而不改變狀態。
- `/verbose off` 會儲存明確的工作階段覆寫設定；您可以透過 Sessions UI 選擇 `inherit` 來清除它。
- 內聯指令僅影響該則訊息；否則會套用工作階段/全域預設值。
- 傳送 `/verbose`（或 `/verbose:`） 且不帶參數，以查看當前的詳細層級。
- 當詳細模式開啟時，發出結構化工具結果的 Agent（Pi、其他 JSON Agent）會將每個工具呼叫作為獨立的僅含元資料的訊息傳回，並在可用時加上 `<emoji> <tool-name>: <arg>` 前綴（路徑/指令）。這些工具摘要會在每個工具啟動時立即傳送（獨立的氣泡），而不是作為串流增量傳送。
- 工具失敗摘要在正常模式下仍然可見，但除非詳細層級為 `on` 或 `full`，否則會隱藏原始錯誤詳情後綴。
- 當詳細層級為 `full` 時，工具輸出也會在完成後轉發（獨立的氣泡，截斷至安全長度）。如果您在執行期間切換 `/verbose on|full|off`，隨後的工具氣泡將遵循新設定。

## 外掛程式追蹤指令 (/trace)

- 層級：`on` | `off`（預設）。
- 僅含指令的訊息會切換工作階段的外掛程式追蹤輸出並回覆 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 內聯指令僅影響該訊息；否則會套用工作階段/全域預設值。
- 發送 `/trace`（或 `/trace:`）且不帶參數，以查看當前追蹤層級。
- `/trace` 比 `/verbose` 更狹窄：它僅公開外掛程式擁有的追蹤/除錯行，例如「主動記憶體」(Active Memory) 的除錯摘要。
- 追蹤行可以出現在 `/status` 中，以及作為正常助理回覆之後的後續診斷訊息。

## 推理可見性 (/reasoning)

- 層級：`on|off|stream`。
- 僅指令訊息會切換回覆中是否顯示思考區塊。
- 啟用後，推理會作為一條以 `Reasoning:` 為前綴的**單獨訊息**發送。
- `stream`（僅限 Telegram）：在回覆生成時將推理串流至 Telegram 草稿氣泡中，然後發送不包含推理的最終答案。
- 別名：`/reason`。
- 發送 `/reasoning`（或 `/reasoning:`）且不帶參數，以查看當前推理層級。
- 解析順序：內聯指令，然後是工作階段覆寫，接著是各代理程式的預設值 (`agents.list[].reasoningDefault`)，最後是後備值 (`off`)。

## 相關

- 昇級模式文件位於 [Elevated mode](/zh-Hant/tools/elevated)。

## 心跳

- 心跳探測主體是已設定的心跳提示（預設值：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳訊息中的內聯指令照常套用（但請避免透過心跳變更工作階段預設值）。
- 心跳傳送預設僅包含最終載荷。若還要發送單獨的 `Reasoning:` 訊息（如果可用），請設定 `agents.defaults.heartbeat.includeReasoning: true` 或各代理程式的 `agents.list[].heartbeat.includeReasoning: true`。

## 網頁聊天 UI

- 網頁聊天思考選取器會在頁面載入時，從傳入的工作階段儲存/設定中反映工作階段的儲存層級。
- 選擇另一個層級會透過 `sessions.patch` 立即寫入工作階段覆寫；它不會等待下一次發送，也不是一次性 `thinkingOnce` 覆寫。
- 第一個選項始終是 `Default (<resolved level>)`，其中解析後的預設值來自活動的會話模型：除非另有配置，否則 Anthropic 的 Claude 4.6 為 `adaptive`，Anthropic Claude Opus 4.7 為 `off`，其他具備推理能力的模型為 `low`，否則為 `off`。
- 選擇器保持供應商感知狀態：
  - 大多數供應商顯示 `off | minimal | low | medium | high | adaptive`
  - Anthropic Claude Opus 4.7 顯示 `off | minimal | low | medium | high | xhigh | adaptive`
  - Z.AI 顯示二進制的 `off | on`
- `/think:<level>` 仍然有效，並會更新同一個儲存的會話層級，因此聊天指令和選擇器會保持同步。
