---
summary: "Directive syntax for /think, /fast, /verbose, /trace, and reasoning visibility"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "思考層級"
---

# 思考層級（/think 指令）

## 作用

- 任何輸入內容中的內聯指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 層級（別名）：`off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → 「think」
  - low → 「think hard」
  - medium → 「think harder」
  - high → 「ultrathink」（最大預算）
  - xhigh → 「ultrathink+」（GPT-5.2 + Codex 模型和 Anthropic Claude Opus 4.7 力度）
  - adaptive → 提供者管理的自適應思考（支援 Anthropic/Bedrock 上的 Claude 4.6 和 Anthropic Claude Opus 4.7）
  - max → 提供者最大推理（目前為 Anthropic Claude Opus 4.7）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 對應到 `xhigh`。
  - `highest` 對應到 `high`。
- 提供者備註：
  - 思考選單和選擇器是由提供商配置檔案驅動的。提供商外掛程式會宣告所選模型的確切層級集，包括二元 `on` 等標籤。
  - `adaptive`、`xhigh` 和 `max` 僅針對支援它們的提供商/模型配置檔案進行宣傳。針對不支援層級的輸入指令將會被拒絕，並顯示該模型的有效選項。
  - 現有儲存的不支援層級會根據提供商配置檔案排名重新對應。在非自適應模型上，`adaptive` 會退回至 `medium`，而 `xhigh` 和 `max` 則會退回至所選模型支援的最大非關閉層級。
  - 當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive`。
  - Anthropic Claude Opus 4.7 不會預設為自適應思考。除非您明確設定思考層級，否則其 API 努力程度預設值仍由提供商擁有。
  - Anthropic Claude Opus 4.7 將 `/think xhigh` 對應為自適應思考加上 `output_config.effort: "xhigh"`，因為 `/think` 是思考指令，而 `xhigh` 是 Opus 4.7 的努力程度設定。
  - Anthropic Claude Opus 4.7 也會公開 `/think max`；它會對應到相同的提供商擁有最大努力程度路徑。
  - OpenAI GPT 模型透過模型特定的 Responses API 努力程度支援來對應 `/think`。`/think off` 僅在目標模型支援時才傳送 `reasoning.effort: "none"`；否則 OpenClaw 會省略已停用的推理內容，而不是傳送不支援的值。
  - Anthropic 相容串流路徑上的 MiniMax (`minimax/*`) 預設為 `thinking: { type: "disabled" }`，除非您在模型參數或請求參數中明確設定思考。這可避免從 MiniMax 的非原生 Anthropic 串流格式中洩漏 `reasoning_content` 差異。
  - Z.AI (`zai/*`) 僅支援二元思維 (`on`/`off`)。任何非 `off` 層級都被視為 `on` (對應至 `low`)。
  - Moonshot (`moonshot/*`) 將 `/think off` 對應至 `thinking: { type: "disabled" }`，並將任何非 `off` 層級對應至 `thinking: { type: "enabled" }`。當啟用思維時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息中的內聯指令 (僅適用於該訊息)。
2. 工作階段覆寫 (透過發送僅包含指令的訊息來設定)。
3. 個別代理預設值 (設定中的 `agents.list[].thinkingDefault`)。
4. 全域預設值 (設定中的 `agents.defaults.thinkingDefault`)。
5. 後備機制：在可用時使用供應商宣告的預設值，對於其他標記為具備推理能力的目錄模型則使用 `low`，否則使用 `off`。

## 設定工作階段預設值

- 發送一條**僅**包含指令的訊息 (允許空白字元)，例如 `/think:medium` 或 `/t high`。
- 該設定對目前的工作階段保持有效 (預設為依發送者區分)；可透過 `/think:off` 或工作階段閒置重置來清除。
- 系統會發送確認回覆 (`Thinking level set to high.` / `Thinking disabled.`)。如果層級無效 (例如 `/thinking big`)，該指令會被拒絕並附帶提示，且工作階段狀態保持不變。
- 發送不帶參數的 `/think` (或 `/think:`) 以查看目前的思維層級。

## 代理應用方式

- **嵌入式 Pi**：解析出的層級會傳遞給處理程序內的 Pi 代理執行環境。

## 快速模式 (/fast)

- 層級：`on|off`。
- 僅包含指令的訊息會切換工作階段的快速模式覆寫設定，並回覆 `Fast mode enabled.` / `Fast mode disabled.`。
- 發送不帶模式參數的 `/fast` (或 `/fast status`) 以查看目前有效的快速模式狀態。
- OpenClaw 按以下順序解析快速模式：
  1. 僅限內聯/指令 `/fast on|off`
  2. 會話覆蓋
  3. 每個代理的預設值 (`agents.list[].fastModeDefault`)
  4. 每個模型的配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 後備方案：`off`
- 對於 `openai/*`，快速模式通過在受支援的 Responses 請求中發送 `service_tier=priority`，對應到 OpenAI 優先處理。
- 對於 `openai-codex/*`，快速模式在 Codex Responses 上發送相同的 `service_tier=priority` 標誌。OpenClaw 在這兩種認證路徑之間保持一個共享的 `/fast` 開關。
- 對於直接公開的 `anthropic/*` 請求，包括發送到 `api.anthropic.com` 的 OAuth 認證流量，快速模式對應到 Anthropic 服務等級：`/fast on` 設定 `service_tier=auto`，`/fast off` 設定 `service_tier=standard_only`。
- 對於 Anthropic 相容路徑上的 `minimax/*`，`/fast on` (或 `params.fastMode: true`) 將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。
- 當兩者都設定時，明確的 Anthropic `serviceTier` / `service_tier` 模型參數會覆蓋快速模式預設值。對於非 Anthropic 代理基礎 URL，OpenClaw 仍然會跳過 Anthropic 服務等級注入。
- `/status` 僅在啟用快速模式時顯示 `Fast`。

## 詳細指令 (/verbose 或 /v)

- 等級：`on` (最低) | `full` | `off` (預設)。
- 僅限指令的訊息會切換會話詳細模式並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效的等級會傳回提示而不會改變狀態。
- `/verbose off` 儲存明確的會話覆蓋值；透過在 Sessions UI 中選擇 `inherit` 來清除它。
- 內聯指令僅影響該訊息；否則會套用會話/全域預設值。
- 傳送 `/verbose` (或 `/verbose:`) 不加參數以查看目前的詳細等級。
- 當 verbose 開啟時，發出結構化工具結果的代理程式（Pi、其他 JSON 代理程式）會將每個工具呼叫以僅元資訊訊息的形式傳回，並在可用時（路徑/指令）加上 `<emoji> <tool-name>: <arg>` 前綴。這些工具摘要會在每個工具啟動時立即傳送（獨立的氣泡），而不是作為串流增量傳送。
- 工具失敗摘要在正常模式下保持可見，但除非 verbose 為 `on` 或 `full`，否則會隱藏原始錯誤詳細資訊後綴。
- 當 verbose 為 `full` 時，工具輸出也會在完成後轉發（獨立的氣泡，截斷至安全長度）。如果您在執行進行中時切換 `/verbose on|full|off`，後續的工具氣泡將遵守新設定。

## 外掛程式追蹤指令 (/trace)

- 層級：`on` | `off`（預設）。
- 僅指令訊息會切換會話外掛程式追蹤輸出並回覆 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 內聯指令僅影響該訊息；否則適用會話/全域預設值。
- 傳送 `/trace`（或 `/trace:`）且不加參數，以查看目前的追蹤層級。
- `/trace` 比 `/verbose` 更狹窄：它僅公開外掛程式擁有的追蹤/除錯行，例如 Active Memory 除錯摘要。
- 追蹤行可以出現在 `/status` 中，並作為正常助理回覆後的後續診斷訊息出現。

## 推理可見性 (/reasoning)

- 層級：`on|off|stream`。
- 僅指令訊息會切換是否在回覆中顯示思考區塊。
- 啟用後，推理會作為 **單獨的訊息** 傳送，並加上 `Reasoning:` 前綴。
- `stream`（僅限 Telegram）：在產生回覆時將推理串流到 Telegram 草稿氣泡中，然後傳送不含推理的最終答案。
- 別名：`/reason`。
- 傳送 `/reasoning`（或 `/reasoning:`）且不加參數，以查看目前的推理層級。
- 解析順序：內聯指令，然後是會話覆蓋，接著是每個代理的預設值（`agents.list[].reasoningDefault`），最後是後備（`off`）。

## 相關

- 提升模式 文件位於 [Elevated mode](/zh-Hant/tools/elevated)。

## 心跳

- 心跳探測主體是已配置的心跳提示（預設值：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳訊息中的內聯指令照常應用（但請避免從心跳更改會話預設值）。
- 心跳傳遞預設僅限最終負載。若也要發送單獨的 `Reasoning:` 訊息（當可用時），請設定 `agents.defaults.heartbeat.includeReasoning: true` 或每個代理的 `agents.list[].heartbeat.includeReasoning: true`。

## 網路聊天 UI

- 網路聊天思考選擇器會在頁面載入時，反映來自連入會話儲存/配置的會話儲存等級。
- 選擇另一個等級會透過 `sessions.patch` 立即寫入會話覆蓋；它不會等待下一次發送，也不是一次性 `thinkingOnce` 覆蓋。
- 第一個選項永遠是 `Default (<resolved level>)`，其中解析的預設值來自於作用中會話模型的提供者思考設定檔。
- 選擇器使用閘道會話列傳回的 `thinkingOptions`。瀏覽器 UI 不會維護自己的提供者正則表示式清單；外掛程式擁有模型專屬的等級集合。
- `/think:<level>` 仍然有效並更新相同的儲存會話等級，因此聊天指令和選擇器會保持同步。

## 提供者設定檔

- 提供者外掛程式可以公開 `resolveThinkingProfile(ctx)` 來定義模型支援的等級和預設值。
- 每個設定檔等級都有一個儲存的標準 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`），並且可以包含顯示 `label`。二元提供者使用 `{ id: "low", label: "on" }`。
- 已發布的舊版掛鉤（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）保留為相容性適配器，但新的自訂層級集應使用 `resolveThinkingProfile`。
- Gateway 列公開 `thinkingOptions` 和 `thinkingDefault`，以便 ACP/聊天客戶端呈現與執行時驗證使用的相同的設定檔。
