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
  - xhigh → "ultrathink+" (GPT-5.2+ 和 Codex 模型，以及 Anthropic Claude Opus 4.7+ 的 effort)
  - adaptive → 提供商管理的自適應思考 (支援 Anthropic/Bedrock 上的 Claude 4.6、Anthropic Claude Opus 4.7+，以及 Google Gemini 動態思考)
  - max → 提供商最大推理 (Anthropic Claude Opus 4.7+; Ollama 將此對應至其最高的原生 `think` effort)
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 對應至 `xhigh`。
  - `highest` 對應至 `high`。
- 提供者註記：
  - 思考選單和選擇器是由提供者設定檔驅動的。提供者插件會為選取的模型宣告確切的層級集合，包括二進位 `on` 等標籤。
  - `adaptive`、`xhigh` 和 `max` 僅針對支援它們的提供者/模型設定檔顯示。針對不支援層級的輸入指令會被拒絕，並顯示該模型的有效選項。
  - 現有儲存的不支援層級會根據提供者設定檔排名重新對應。`adaptive` 在非自適應模型上會退回至 `medium`，而 `xhigh` 和 `max` 則會退回至選取模型所支援的最大非關閉層級。
  - 當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive`。
  - Anthropic Claude Opus 4.8 和 Opus 4.7 除非您明確設定思考層級，否則會關閉思考。啟用自適應思考後，Opus 4.8 的提供商擁有 effort 預設值為 `high`。
  - Anthropic Claude Opus 4.7+ 將 `/think xhigh` 對應至自適應思考加上 `output_config.effort: "xhigh"`，因為 `/think` 是思考指令，而 `xhigh` 是 Opus effort 設定。
  - Anthropic Claude Opus 4.7+ 也公開 `/think max`；它對應至相同的提供商擁有 max effort 路徑。
  - 直接 DeepSeek V4 模型公開 `/think xhigh|max`；兩者都對應至 DeepSeek `reasoning_effort: "max"`，而較低的非 off 層級則對應至 `high`。
  - OpenRouter 路由的 DeepSeek V4 模型公開 `/think xhigh` 並發送 OpenRouter 支援的 `reasoning_effort` 值。儲存的 `max` 覆寫會退回至 `xhigh`。
  - Ollama 具備思考能力的模型公開 `/think low|medium|high|max`；`max` 對應至原生 `think: "high"`，因為 Ollama 的原生 API 接受 `low`、`medium` 和 `high` effort 字串。
  - OpenAI GPT 模型透過特定模型的 Responses API effort 支援來對應 `/think`。`/think off` 僅在目標模型支援時才發送 `reasoning.effort: "none"`；否則 OpenClaw 會省略停用的 reasoning payload，而不是發送不支援的值。
  - 自訂的 OpenAI 相容目錄項目可以透過設定 `models.providers.<provider>.models[].compat.supportedReasoningEfforts` 包含 `"xhigh"` 來選擇加入 `/think xhigh`。這使用相同的相容性元資料來對應傳出的 OpenAI 推理工作負載 Payload，因此選單、Session 驗證、Agent CLI 和 `llm-task` 會與傳輸行為保持一致。
  - 過時設定的 OpenRouter Hunter Alpha 參照會跳過代理推理注入，因為該已退役的路由可能會透過推理欄位傳回最終答案文字。
  - Google Gemini 將 `/think adaptive` 對應至 Gemini 提供商擁有的動態思考。Gemini 3 請求會省略固定的 `thinkingLevel`，而 Gemini 2.5 請求則會發送 `thinkingBudget: -1`；固定等級仍然會對應至該模型系列最接近的 Gemini `thinkingLevel` 或預算。
  - 在 Anthropic 相容串流路徑上的 MiniMax (`minimax/*`) 預設為 `thinking: { type: "disabled" }`，除非您在模型參數或請求參數中明確設定思考。這可避免來自 MiniMax 非原生 Anthropic 串流格式的洩漏 `reasoning_content` delta。
  - Z.AI (`zai/*`) 僅支援二進位思考 (`on`/`off`)。任何非 `off` 等級都會被視為 `on` (對應至 `low`)。
  - Moonshot (`moonshot/*`) 將 `/think off` 對應至 `thinking: { type: "disabled" }`，並將任何非 `off` 等級對應至 `thinking: { type: "enabled" }`。當啟用思考時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息上的內聯指令 (僅套用於該訊息)。
2. Session 覆寫 (透過發送僅包含指令的訊息來設定)。
3. 個別 Agent 預設值 (設定中的 `agents.list[].thinkingDefault`)。
4. 全域預設值 (設定中的 `agents.defaults.thinkingDefault`)。
5. 後備：當可用時使用提供商宣告的預設值；否則，具備推理能力的模型會解析為 `medium` 或該模型最接近支援的非 `off` 等級，而不具推理能力的模型則保持 `off`。

## 設定 Session 預設值

- 傳送一條**僅**包含指令的訊息 (允許空白字元)，例如 `/think:medium` 或 `/t high`。
- 這會在目前的工作階段中生效（預設為依發送者區分）。使用 `/think default` 以清除工作階段覆寫並繼承已設定/提供者的預設值；別名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- `/think off` 會儲存一個明確關閉的覆寫。它會停用思考功能，直到您變更或清除工作階段覆寫。
- 會傳送確認回覆（`Thinking level set to high.` / `Thinking disabled.`）。如果等級無效（例如 `/thinking big`），該指令會被拒絕並顯示提示，而工作階段狀態將保持不變。
- 傳送 `/think`（或 `/think:`） 且不帶任何引數，以查看目前的思考等級。

## 由代理程式應用

- **內嵌式 OpenClaw**：解析出的等級會傳遞給程序內的 OpenClaw 代理程式執行階段。
- **Claude CLI 後端**：當使用 `claude-cli` 時，非關閉等級會以 `--effort` 的形式傳遞給 Claude Code；請參閱 [CLI 後端](/zh-Hant/gateway/cli-backends)。

## 快速模式 (/fast)

- 等級：`on|off|default`。
- 僅包含指令的訊息會切換工作階段的快速模式覆寫並回覆 `Fast mode enabled.` / `Fast mode disabled.`。使用 `/fast default` 以清除工作階段覆寫並繼承已設定的預設值；別名包括 `inherit`、`clear`、`reset` 和 `unpin`。
- 傳送 `/fast`（或 `/fast status`） 且不帶任何模式，以查看目前實際的快速模式狀態。
- OpenClaw 按以下順序解析快速模式：
  1. 內嵌/僅指令的 `/fast on|off` 覆寫（`/fast default` 會清除此層級）
  2. 會話覆寫
  3. 個別代理程式預設值（`agents.list[].fastModeDefault`）
  4. 個別模型設定：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 後備選項：`off`
- 對於 `openai/*`，快速模式會透過在支援的 Responses 請求中發送 `service_tier=priority` 來對應至 OpenAI 的優先處理。
- 對於由 Codex 支援的 `openai/*` 模型，快速模式會在 Codex Responses 上傳送相同的 `service_tier=priority` 標誌。OpenClaw 在這兩種驗證路徑之間保持一個共享的 `/fast` 切換開關。
- 對於直接公開的 `anthropic/*` 請求，包括發送到 `api.anthropic.com` 的 OAuth 驗證流量，快速模式會對應到 Anthropic 服務等級：`/fast on` 設定 `service_tier=auto`，`/fast off` 設定 `service_tier=standard_only`。
- 對於 Anthropic 相容路徑上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。
- 當同時設定時，明確的 Anthropic `serviceTier` / `service_tier` 模型參數會覆蓋快速模式的預設值。對於非 Anthropic 代理基底 URL，OpenClaw 仍然會跳過 Anthropic 服務等級的注入。
- `/status` 僅在啟用快速模式時顯示 `Fast`。

## 詳細指令 (/verbose 或 /v)

- 等級：`on`（最低）| `full` | `off`（預設）。
- 僅包含指令的訊息會切換會話的詳細模式並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效的等級會傳回提示而不改變狀態。
- `/verbose off` 會儲存明確的會話覆蓋設定；透過在 Sessions UI 中選擇 `inherit` 來清除它。
- 經授權的外部頻道發送者可以保存會話的詳細模式覆蓋設定。內部 gateway/webchat 用戶端需要 `operator.admin` 才能保存它。
- 內聯指令僅影響該訊息；否則會套用會話/全域預設值。
- 發送不帶參數的 `/verbose`（或 `/verbose:`） 以查看當前的詳細等級。
- 當開啟詳細模式時，發出結構化工具結果的代理會將每個工具呼叫作為其自己的僅元資料訊息傳回，並在可用時加上 `<emoji> <tool-name>: <arg>` 前綴。這些工具摘要會在每個工具啟動時立即發送（獨立的氣泡），而不是作為串流增量。
- 工具失敗摘要在一般模式下仍然可見，但除非詳細模式為 `full`，否則原始錯誤細節後綴會被隱藏。
- 當詳細模式為 `full` 時，工具輸出也會在完成後轉發（獨立氣泡，截斷為安全長度）。如果您在執行期間切換 `/verbose on|full|off`，後續的工具氣泡將採用新設定。
- `agents.defaults.toolProgressDetail` 控制 `/verbose` 工具摘要和進度草稿工具行的格式。使用 `"explain"`（預設）以獲得緊湊的人類可讀標籤，例如 `🛠️ Exec: checking JS syntax`；如果您希望附加原始指令/細節以進行除錯，請使用 `"raw"`。每個代理的 `agents.list[].toolProgressDetail` 會覆蓋預設值。
  - `explain`: `🛠️ Exec: check JS syntax for /tmp/app.js`
  - `raw`: `🛠️ Exec: check JS syntax for /tmp/app.js, node --check /tmp/app.js`

## 外掛程式追蹤指令 (/trace)

- 層級：`on` | `off`（預設）。
- 僅包含指令的訊息會切換工作階段外掛程式追蹤輸出，並回覆 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 內聯指令僅影響該訊息；否則適用工作階段/全域預設值。
- 發送 `/trace`（或 `/trace:`） 不帶參數，以查看目前的追蹤層級。
- `/trace` 比 `/verbose` 更狹窄：它僅顯示外掛程式擁有的追蹤/除錯行，例如主動記憶體除錯摘要。
- 追蹤行可以出現在 `/status` 中，並在正常的助手回覆之後作為後續診斷訊息顯示。

## 推理可見性 (/reasoning)

- 層級：`on|off|stream`。
- 僅包含指令的訊息會切換回覆中是否顯示思考區塊。
- 啟用後，推理會作為單獨的訊息發送，前綴為 `Thinking`。
- `stream`：當作用中的頻道支援推理預覽時，在生成回覆期間串流推理，然後發送不包含推理的最終答案。
- 別名：`/reason`。
- 傳送 `/reasoning`（或 `/reasoning:`） 且不帶參數，以查看目前的推理等級。
- 解析順序：行內指令，然後是會話覆寫，接著是各代理程式預設值（`agents.list[].reasoningDefault`），然後是全域預設值（`agents.defaults.reasoningDefault`），最後是後備值（`off`）。

格式錯誤的本機模型推理標籤會以保守方式處理。已封閉的 `<think>...</think>` 區塊在一般回覆中保持隱藏，而在已可見文字之後未封閉的推理也會被隱藏。如果回覆完全被單一未封閉的開頭標籤包裹，且否則將會傳遞為空文字，OpenClaw 會移除該格式錯誤的開頭標籤並傳遞其餘文字。

## 相關

- 提升模式的文件位於 [Elevated mode](/zh-Hant/tools/elevated)。

## 心跳

- 心跳探測主體是設定好的心跳提示（預設：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`）。心跳訊息中的行內指令照常適用（但請避免從心跳變更會話預設值）。
- 心跳傳遞預設為僅包含最終酬載。若也要傳送獨立的 `Thinking` 訊息（當可用時），請設定 `agents.defaults.heartbeat.includeReasoning: true` 或各代理程式的 `agents.list[].heartbeat.includeReasoning: true`。

## 網頁聊天介面

- 網頁聊天思考選擇器會在頁面載入時反映來自輸入會話儲存/設定的會話已儲存等級。
- 選擇另一個等級會透過 `sessions.patch` 立即寫入會話覆寫；它不會等待下一次傳送，也不是一次性 `thinkingOnce` 覆寫。
- 第一個選項一律是清除覆寫的選項。它顯示 `Inherited: <resolved level>`，包括當繼承的思考已停用時顯示 `Inherited: Off`。
- 明確的選擇器選項使用其直接等級標籤，同時在提供者標籤存在時予以保留（例如針對有提供者標籤的 `max` 選項顯示 `Maximum`）。
- 選擇器使用由閘道會話列/預設值返回的 `thinkingLevels`，並將 `thinkingOptions` 保留為舊版標籤列表。瀏覽器 UI 不維護自己的提供者正則表達式列表；插件擁有模型特定的層級集。
- `/think:<level>` 仍然有效並更新相同的儲存會話層級，因此聊天指令和選擇器保持同步。

## 提供者設定檔

- 提供者插件可以公開 `resolveThinkingProfile(ctx)` 來定義模型支援的層級和預設值。
- 代理 Claude 模型的提供者插件應該重複使用來自 `openclaw/plugin-sdk/provider-model-shared` 的 `resolveClaudeThinkingProfile(modelId)`，以便直接 Anthropic 和代理目錄保持一致。
- 每個設定檔層級都有一個儲存的標準 `id` (`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`adaptive` 或 `max`)，並且可能包含顯示 `label`。二進位提供者使用 `{ id: "low", label: "on" }`。
- 設定檔掛鉤會在可用時接收合併的目錄事實，包括 `reasoning`、`compat.thinkingFormat` 和 `compat.supportedReasoningEfforts`。使用這些事實僅在設定的請求合約支援相符的載荷時公開二進位或自訂設定檔。
- 需要驗證明確思考覆寫的工具插件應該使用 `api.runtime.agent.resolveThinkingPolicy({ provider, model })` 加上 `api.runtime.agent.normalizeThinkingLevel(...)`；它們不應維護自己的提供者/模型層級列表。
- 可以存取已設定自訂模型元資料的工具插件可以將 `catalog` 傳遞到 `resolveThinkingPolicy` 中，以便 `compat.supportedReasoningEfforts` 選擇加入反映在插件端驗證中。
- 已發布的舊版掛鉤 (`supportsXHighThinking`、`isBinaryThinking` 和 `resolveDefaultThinkingLevel`) 保留為相容性適配器，但新的自訂層級集應該使用 `resolveThinkingProfile`。
- Gateway rows/defaults 會公開 `thinkingLevels`、`thinkingOptions` 和 `thinkingDefault`，以便 ACP/chat 用戶端呈現與執行時期驗證所使用的相同設定檔 ID 和標籤。
