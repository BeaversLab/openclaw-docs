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
  - `adaptive` 僅在原生指令選單和選擇器中針對宣告支援自適應思考的提供者/模型進行宣傳。為了與現有設定和別名相容，它仍被接受為輸入指令。
  - `max` 僅在原生指令選單和選擇器中針對宣告支援最大思考的提供者/模型進行宣傳。當選定的模型不支援 `max` 時，現有儲存的 `max` 設定會重新對應到該模型支援的最大層級。
  - 當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive`。
  - Anthropic Claude Opus 4.7 不會預設為自適應思考。除非您明確設定思考層級，否則其 API 努力預設值仍由提供者擁有。
  - Anthropic Claude Opus 4.7 將 `/think xhigh` 對應到自適應思考加上 `output_config.effort: "xhigh"`，因為 `/think` 是思考指令，而 `xhigh` 是 Opus 4.7 的努力設定。
  - Anthropic Claude Opus 4.7 也公開 `/think max`；它對應到相同的提供者擁有最大努力路徑。
  - OpenAI GPT 模型透過模型特定的 Responses API 努力支援來對應 `/think`。`/think off` 僅在目標模型支援時才發送 `reasoning.effort: "none"`；否則 OpenClaw 會省略停用的推理載荷，而不是發送不支援的值。
  - MiniMax (`minimax/*`) 在 Anthropic 相容的串流路徑上預設為 `thinking: { type: "disabled" }`，除非您在模型參數或請求參數中明確設定 thinking。這可避免從 MiniMax 的非原生 Anthropic 串流格式中洩漏 `reasoning_content` 差異。
  - Z.AI (`zai/*`) 僅支援二元思維 (`on`/`off`)。任何非 `off` 等級都會被視為 `on` (對應至 `low`)。
  - Moonshot (`moonshot/*`) 將 `/think off` 對應至 `thinking: { type: "disabled" }`，並將任何非 `off` 等級對應至 `thinking: { type: "enabled" }`。當啟用思維時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息上的內聯指令 (僅適用於該訊息)。
2. 會話覆寫 (透過發送僅包含指令的訊息來設定)。
3. 個別代理預設值 (設定中的 `agents.list[].thinkingDefault`)。
4. 全域預設值 (設定中的 `agents.defaults.thinkingDefault`)。
5. 後備：對於 Anthropic Claude 4.6 模型為 `adaptive`，除非明確配置否則對於 Anthropic Claude Opus 4.7 為 `off`，對於其他具備推理能力的模型為 `low`，其他情況則為 `off`。

## 設定會話預設值

- 發送一條 **僅** 包含指令的訊息 (允許空白字元)，例如 `/think:medium` 或 `/t high`。
- 這會在當前會話中保持生效 (預設為每位發送者各自獨立)；可透過 `/think:off` 或會話閒置重置來清除。
- 會發送確認回覆 (`Thinking level set to high.` / `Thinking disabled.`)。如果等級無效 (例如 `/thinking big`)，該指令將被拒絕並顯示提示，且會話狀態保持不變。
- 發送不帶參數的 `/think` (或 `/think:`) 以查看當前的思維等級。

## 由代理應用

- **嵌入式 Pi**：解析後的等級會傳遞給進程內的 Pi 代理運行時。

## 快速模式 (/fast)

- 等級：`on|off`。
- 僅包含指令的訊息會切換會話的快速模式覆寫設定，並回覆 `Fast mode enabled.` / `Fast mode disabled.`。
- 發送 `/fast` (或 `/fast status`) 且不指定模式，以查看當前有效的快速模式狀態。
- OpenClaw 按以下順序解析快速模式：
  1. 內聯/僅指令 `/fast on|off`
  2. 會話覆寫
  3. 每個代理的預設值 (`agents.list[].fastModeDefault`)
  4. 每個模型的配置：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 後備：`off`
- 對於 `openai/*`，快速模式會透過在支援的 Responses 請求中發送 `service_tier=priority` 來對應至 OpenAI 的優先處理。
- 對於 `openai-codex/*`，快速模式會在 Codex Responses 上發送相同的 `service_tier=priority` 標誌。OpenClaw 在這兩種驗證路徑之間共用一個 `/fast` 切換開關。
- 對於直接公開的 `anthropic/*` 請求（包括發送到 `api.anthropic.com` 的 OAuth 驗證流量），快速模式會對應至 Anthropic 服務層級：`/fast on` 設定 `service_tier=auto`，`/fast off` 設定 `service_tier=standard_only`。
- 對於 Anthropic 相容路徑上的 `minimax/*`，`/fast on` (或 `params.fastMode: true`) 會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。
- 當兩者同時設定時，明確的 Anthropic `serviceTier` / `service_tier` 模型參數會覆寫快速模式預設值。對於非 Anthropic 代理基礎 URL，OpenClaw 仍會跳過 Anthropic 服務層級的注入。

## 詳細指令 (/verbose 或 /v)

- 等級：`on` (最少) | `full` | `off` (預設)。
- 僅包含指令的訊息會切換會話的詳細模式並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效的等級會返回提示而不會改變狀態。
- `/verbose off` 會儲存一個明確的會話覆蓋值；您可以透過在 Sessions UI 中選擇 `inherit` 來清除它。
- 內嵌指令僅影響該則訊息；否則會套用會話/全域預設值。
- 傳送 `/verbose`（或 `/verbose:`） 且不帶參數，以查看目前的詳細程度層級。
- 當詳細程度開啟時，輸出結構化工具結果的代理程式（Pi、其他 JSON 代理程式）會將每個工具呼叫作為獨立的僅中繼資料訊息傳回，並在可用時加上 `<emoji> <tool-name>: <arg>` 前綴（路徑/指令）。這些工具摘要會在每個工具啟動時立即傳送（獨立氣泡），而不是作為串流增量傳送。
- 工具失敗摘要在一般模式下保持可見，但除非詳細程度為 `on` 或 `full`，否則會隱藏原始錯誤詳細資訊後綴。
- 當詳細程度為 `full` 時，工具輸出也會在完成後轉發（獨立氣泡，截斷至安全長度）。如果您在執行過程中切換 `/verbose on|full|off`，後續的工具氣泡將採用新設定。

## 外掛程式追蹤指令 (/trace)

- 層級：`on` | `off`（預設）。
- 僅含指令的訊息會切換會話外掛程式追蹤輸出並回覆 `Plugin trace enabled.` / `Plugin trace disabled.`。
- 內嵌指令僅影響該則訊息；否則會套用會話/全域預設值。
- 傳送 `/trace`（或 `/trace:`） 且不帶參數，以查看目前的追蹤層級。
- `/trace` 比 `/verbose` 更狹隘：它僅顯示外掛程式擁有的追蹤/除錯行，例如 Active Memory 除錯摘要。
- 追蹤行可以出現在 `/status` 中，以及作為一般助理回覆後的後續診斷訊息。

## 推理可見性 (/reasoning)

- 層級：`on|off|stream`。
- 僅含指令的訊息會切換是否在回覆中顯示思考區塊。
- 啟用時，推理會作為以 `Reasoning:` 為前綴的 **獨立訊息** 傳送。
- `stream` (僅限 Telegram)：在產生回覆時將推理串流到 Telegram 的草稿氣泡中，然後發送不包含推理的最終答案。
- 別名：`/reason`。
- 發送 `/reasoning` (或 `/reasoning:`) 且不帶參數，以查看當前的推理層級。
- 解析順序：內聯指令，然後是會話覆蓋，接著是個別代理預設值 (`agents.list[].reasoningDefault`)，最後是後備值 (`off`)。

## 相關

- 提升模式 說明文件位於 [Elevated mode](/zh-Hant/tools/elevated)。

## 心跳

- 心跳探測主體是已配置的心跳提示 (預設為：`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`)。心跳訊息中的內聯指令照常適用 (但請避免從心跳中更改會話預設值)。
- 心跳傳送預設僅包含最終載荷。若也要傳送單獨的 `Reasoning:` 訊息 (當可用時)，請設定 `agents.defaults.heartbeat.includeReasoning: true` 或針對個別代理設定 `agents.list[].heartbeat.includeReasoning: true`。

## 網頁聊天介面

- 網頁聊天思考選擇器會在頁面載入時，反映來自輸入會話儲存/配置的會話已儲存層級。
- 選擇另一個層級會立即透過 `sessions.patch` 寫入會話覆蓋設定；它不會等待下一次傳送，也不是一次性 `thinkingOnce` 覆蓋設定。
- 第一個選項始終是 `Default (<resolved level>)`，其中解析出的預設值來自作用中的會話模型：針對 Anthropic 上的 Claude 4.6 為 `adaptive`，除非另有配置，否則針對 Anthropic Claude Opus 4.7 為 `off`，針對其他具備推理能力的模型為 `low`，其他情況則為 `off`。
- 選擇器會保持對供應商的感知：
  - 大多數供應商顯示 `off | minimal | low | medium | high`
  - Anthropic/Bedrock Claude 4.6 顯示 `off | minimal | low | medium | high | adaptive`
  - Anthropic Claude Opus 4.7 顯示 `off | minimal | low | medium | high | xhigh | adaptive | max`
  - Z.AI 顯示二元 `off | on`
- `/think:<level>` 仍然有效並會更新相同的已儲存會話層級，因此聊天指令與選擇器會保持同步。
