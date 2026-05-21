---
summary: "Directive syntax for /think, /fast, /verbose, /trace, and reasoning visibility"
read_when:
  - Adjusting thinking, fast-mode, or verbose directive parsing or defaults
title: "思考層級"
---

## 功能

- 任何輸入內文中的內聯指令：`/t <level>`、`/think:<level>` 或 `/thinking <level>`。
- 層級（別名）：`off | minimal | low | medium | high | xhigh | adaptive | max`
  - minimal → "think"
  - low → "think hard"
  - medium → "think harder"
  - high → "ultrathink" (最大預算)
  - xhigh → "ultrathink+" (GPT-5.2+ 和 Codex 模型，加上 Anthropic Claude Opus 4.7 努力程度)
  - adaptive → 提供者管理的自適應思考（支援 Anthropic/Bedrock 上的 Claude 4.6、Anthropic Claude Opus 4.7 和 Google Gemini 動態思考）
  - max → 提供者最大推理 (Anthropic Claude Opus 4.7；Ollama 將其對應至最高的原生 `think` 力度)
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 對應至 `xhigh`。
  - `highest` 對應至 `high`。
- 提供者註記：
  - 思考選單和選擇器是由提供者設定檔驅動的。提供者插件會為選取的模型宣告確切的層級集合，包括二進位 `on` 等標籤。
  - `adaptive`、`xhigh` 和 `max` 僅針對支援它們的提供者/模型設定檔顯示。針對不支援層級的輸入指令會被拒絕，並顯示該模型的有效選項。
  - 現有儲存的不支援層級會根據提供者設定檔排名重新對應。`adaptive` 在非自適應模型上會退回至 `medium`，而 `xhigh` 和 `max` 則會退回至選取模型所支援的最大非關閉層級。
  - 當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive`。
  - Anthropic Claude Opus 4.7 不會預設為自適應思考。除非您明確設定思考層級，否則其 API 努力預設值仍由提供者擁有。
  - Anthropic Claude Opus 4.7 將 `/think xhigh` 對應至自適應思考加上 `output_config.effort: "xhigh"`，因為 `/think` 是思考指令，而 `xhigh` 是 Opus 4.7 的力度設定。
  - Anthropic Claude Opus 4.7 也公開了 `/think max`；它對應到相同的提供商擁有的最大努力路徑。
  - 直接的 DeepSeek V4 模型公開 `/think xhigh|max`；兩者都對應到 DeepSeek `reasoning_effort: "max"`，而較低的非官方層級則對應到 `high`。
  - 經由 OpenRouter 路由的 DeepSeek V4 模型公開 `/think xhigh` 並發送 OpenRouter 支援的 `reasoning_effort` 值。儲存的 `max` 覆寫會回退到 `xhigh`。
  - Ollama 支援思考的模型公開 `/think low|medium|high|max`；`max` 對應到原生的 `think: "high"`，因為 Ollama 的原生 API 接受 `low`、`medium` 和 `high` 努力程度字串。
  - OpenAI GPT 模型透過特定模型的 Responses API 努力程度支援來對應 `/think`。`/think off` 僅在目標模型支援時才發送 `reasoning.effort: "none"`；否則 OpenClaw 會省略停用的推理負載，而不是發送不支援的值。
  - 自訂的 OpenAI 相容目錄項目可以透過設定 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 來包含 `"xhigh"`，從而選擇加入 `/think xhigh`。這使用對應出站 OpenAI 推理努力程度負載的相同相容性元資料，因此選單、會話驗證、代理 CLI 和 `llm-task` 都會與傳輸行為一致。
  - 過時設定的 OpenRouter Hunter Alpha 參照會跳過代理推理注入，因為該已退役的路由可能會透過推理欄位傳回最終答案文字。
  - Google Gemini 將 `/think adaptive` 對應到 Gemini 提供商擁有的動態思考。Gemini 3 請求會省略固定的 `thinkingLevel`，而 Gemini 2.5 請求會發送 `thinkingBudget: -1`；固定層級仍然會對應到該模型系列最接近的 Gemini `thinkingLevel` 或預算。
  - MiniMax (`minimax/*`) 在 Anthropic 相容串流路徑上預設為 `thinking: { type: "disabled" }`，除非您在模型參數或請求參數中明確設定 thinking。這可避免從 MiniMax 非原生的 Anthropic 串流格式洩漏 `reasoning_content` delta。
  - Z.AI (`zai/*`) 僅支援二元思維 (`on`/`off`)。任何非 `off` 層級都會被視為 `on` (對應到 `low`)。
  - Moonshot (`moonshot/*`) 將 `/think off` 對應到 `thinking: { type: "disabled" }`，並將任何非 `off` 層級對應到 `thinking: { type: "enabled" }`。當啟用思維時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息上的內聯指令 (僅套用於該訊息)。
2. Session 覆寫 (透過發送僅包含指令的訊息來設定)。
3. 每個 Agent 的預設值 (設定中的 `agents.list[].thinkingDefault`)。
4. 全域預設值 (設定中的 `agents.defaults.thinkingDefault`)。
5. 後備機制：若可用則使用供應商宣告的預設值；否則，具備推理能力的模型會解析為 `medium` 或該模型最接近的支援非 `off` 層級，而不具推理能力的模型則保持 `off`。

## 設定 Session 預設值

- 發送一條**僅**包含指令的訊息 (允許空白字元)，例如 `/think:medium` 或 `/t high`。
- 這會在目前 session 生效 (預設為按發送者區分)。使用 `/think default` 清除 session 覆寫並繼承已設定/供應商的預設值；別名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- `/think off` 會儲存一個明確的關閉覆寫。它會停用思維功能，直到您變更或清除 session 覆寫為止。
- 會傳送確認回覆（`Thinking level set to high.` / `Thinking disabled.`）。如果等級無效（例如 `/thinking big`），該指令將被拒絕並顯示提示，且會話狀態保持不變。
- 發送 `/think`（或 `/think:`）且不帶參數，以查看當前的思考等級。

## 由代理程式應用

- **嵌入式 Pi**：解析出的等級會傳遞給程序內的 Pi 代理程式執行時。
- **Claude CLI 後端**：當使用 `claude-cli` 時，非關閉等級會作為 `--effort` 傳遞給 Claude Code；請參閱 [CLI backends](/zh-Hant/gateway/cli-backends)。

## 快速模式 (/fast)

- 等級：`on|off|default`。
- 僅包含指令的訊息會切換會話快速模式覆寫，並回覆 `Fast mode enabled.` / `Fast mode disabled.`。使用 `/fast default` 來清除會話覆寫並繼承設定的預設值；別名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- 發送 `/fast`（或 `/fast status`）且不帶模式參數，以查看當前有效的快速模式狀態。
- OpenClaw 按以下順序解析快速模式：
  1. 內聯/僅指令 `/fast on|off` 覆寫（`/fast default` 會清除此層級）
  2. 會話覆寫
  3. 每個代理程式的預設值（`agents.list[].fastModeDefault`）
  4. 每個模型的設定：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 後備：`off`
- 對於 `openai/*`，快速模式會透過在支援的 Requests 要求中發送 `service_tier=priority` 來對應到 OpenAI 的優先處理。
- 對於 `openai-codex/*`，快速模式會在 Codex Requests 上發送相同的 `service_tier=priority` 標誌。OpenClaw 在這兩種驗證路徑之間保持一個共用的 `/fast` 切換開關。
- 對於直接的公開 `anthropic/*` 請求，包括傳送到 `api.anthropic.com` 的 OAuth 驗證流量，快速模式對應至 Anthropic 服務層級：`/fast on` 設定 `service_tier=auto`，`/fast off` 設定 `service_tier=standard_only`。
- 對於 Anthropic 相容路徑上的 `minimax/*`，`/fast on` (或 `params.fastMode: true`) 會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。
- 當同時設定時，明確的 Anthropic `serviceTier` / `service_tier` 模型參數會覆寫快速模式的預設值。對於非 Anthropic 代理基礎 URL，OpenClaw 仍然會跳過 Anthropic 服務層級的注入。
- `/status` 僅在啟用快速模式時顯示 `Fast`。

## 詳細指令 (/verbose 或 /v)

- 層級：`on` (最小) | `full` | `off` (預設)。
- 僅指令訊息會切換會話的詳細模式並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效的層級會傳回提示而不會改變狀態。
- `/verbose off` 會儲存明確的會話覆寫；透過在 Sessions UI 中選擇 `inherit` 來清除它。
- 內聯指令僅影響該訊息；否則會套用會話/全域預設值。
- 傳送 `/verbose` (或 `/verbose:`) 且不帶參數，以查看目前的詳細層級。
- 當啟用詳細模式時，發出結構化工具結果的代理程式 (Pi、其他 JSON 代理程式) 會將每個工具呼叫作為其自己的僅包含中繼資料的訊息傳回，並在可用時加上 `<emoji> <tool-name>: <arg>` 前綴。這些工具摘要會在每個工具啟動時立即傳送 (獨立氣泡)，而不是作為串流增量傳送。
- 工具失敗摘要在正常模式下保持可見，但除非詳細層級為 `on` 或 `full`，否則會隱藏原始錯誤詳細資訊後綴。
- 當 verbose 為 `full` 時，工具輸出也會在完成後轉發（單獨的氣泡，截斷為安全長度）。如果您在執行過程中切換 `/verbose on|full|off`，隨後的工具氣泡將遵循新設定。
- `agents.defaults.toolProgressDetail` 控制著 `/verbose` 工具摘要和進度草稿工具行的形狀。使用 `"explain"`（預設）以獲得緊湊的標籤，例如 `🛠️ Exec: checking JS syntax`；當您也想要附加原始指令/細節以進行除錯時，請使用 `"raw"`。每個代理程式的 `agents.list[].toolProgressDetail` 會覆寫預設值。
  - `explain`：`🛠️ Exec: check JS syntax for /tmp/app.js`
  - `raw`：`🛠️ Exec: check JS syntax for /tmp/app.js, node --check /tmp/app.js`

## 外掛程式追蹤指令 (/trace)

- 層級：`on` | `off`（預設）。
- 僅指令訊息會切換工作階段外掛程式追蹤輸出並回覆 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 內聯指令僅影響該訊息；否則適用工作階段/全域預設值。
- 發送 `/trace`（或 `/trace:`）且不帶參數，以查看目前的追蹤層級。
- `/trace` 比 `/verbose` 更狹窄：它僅公開外掛程式擁有的追蹤/除錯行，例如 Active Memory 除錯摘要。
- 追蹤行可以出現在 `/status` 中，並作為正常助理回覆之後的後續診斷訊息。

## 推理可見性 (/reasoning)

- 層級：`on|off|stream`。
- 僅指令訊息會切換是否在回覆中顯示思考區塊。
- 啟用後，推理會作為以 `Thinking` 為前綴的**單獨訊息**發送。
- `stream`（僅限 Telegram）：在生成回覆時將推理串流到 Telegram 草稿氣泡中，然後發送不含推理的最終答案。
- 別名：`/reason`。
- 發送 `/reasoning`（或 `/reasoning:`）且不帶參數，以查看目前的推理層級。
- 解析順序：內聯指令，然後是會話覆蓋，接著是每個代理的預設值（`agents.list[].reasoningDefault`），然後是全域預設值（`agents.defaults.reasoningDefault`），最後是後備值（`off`）。

格式錯誤的本地模型推理標籤會被保守地處理。已封閉的 `<think>...</think>` 區塊在正常回覆中保持隱藏，且在已可見文字之後未封閉的推理也會被隱藏。如果回覆完全被單一未封閉的開頭標籤包圍，且原本會傳送為空文字，OpenClaw 會移除格式錯誤的開頭標籤並傳送剩餘的文字。

## 相關

- 提升模式文件位於 [Elevated mode](/zh-Hant/tools/elevated)。

## 心跳

- 心跳探測主體是已配置的心跳提示（預設：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳訊息中的內聯指令照常應用（但避免從心跳更改會話預設值）。
- 心跳傳遞預設僅包含最終載荷。若也要傳送單獨的 `Thinking` 訊息（如果有的話），請設定 `agents.defaults.heartbeat.includeReasoning: true` 或個別代理的 `agents.list[].heartbeat.includeReasoning: true`。

## Web 聊天 UI

- 當頁面載入時，Web 聊天的思考選擇器會反映來自傳入會話儲存/配置的會話已儲存層級。
- 選擇另一個層級會透過 `sessions.patch` 立即寫入會話覆蓋；它不會等待下一次傳送，也不是一次性 `thinkingOnce` 覆蓋。
- 第一個選項始終是清除覆蓋的選擇。當會話繼承非關閉的有效預設值時，它會顯示 `Inherited: <resolved level>`；當繼承的思考被停用時，則顯示 `Off`。
- 明確的選擇器選項會標記為覆蓋，同時在存在時保留提供者標籤（例如，對於具有提供者標籤的 `max` 選項，顯示 `Override: maximum`）。
- 選擇器使用閘道會話列/預設值傳回的 `thinkingLevels`，並將 `thinkingOptions` 保留為舊版標籤清單。瀏覽器 UI 不會維護自己的提供者正則表達式清單；外掛程式擁有特定模型的層級集。
- `/think:<level>` 仍然有效並更新相同的儲存會話層級，因此聊天指令和選擇器保持同步。

## 提供者設定檔

- 提供者外掛程式可以公開 `resolveThinkingProfile(ctx)` 來定義模型支援的層級和預設值。
- 代理 Claude 模型的提供者外掛程式應重複使用 `openclaw/plugin-sdk/provider-model-shared` 中的 `resolveClaudeThinkingProfile(modelId)`，以便直接 Anthropic 和代理目錄保持一致。
- 每個設定檔層級都有一個儲存的標準 `id`（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`），並且可能包含顯示 `label`。二元提供者使用 `{ id: "low", label: "on" }`。
- 需要驗證明確思考覆寫的工具外掛程式應使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model })` 加上 `api.runtime.agent.normalizeThinkingLevel(...)`；它們不應保留自己的提供者/模型層級清單。
- 可以存取已設定自訂模型元資料的工具外掛程式可以將 `catalog` 傳遞到 `resolveThinkingPolicy` 中，以便 `compat.supportedReasoningEfforts` 的選擇加入反映在外掛程式端的驗證中。
- 已發佈的舊版掛勾（`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`）保留為相容性轉接器，但新的自訂層級集應使用 `resolveThinkingProfile`。
- Gateway 列/預設值公開 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，以便 ACP/聊天用戶端呈現與執行時期驗證使用的相同設定檔 ID 和標籤。
