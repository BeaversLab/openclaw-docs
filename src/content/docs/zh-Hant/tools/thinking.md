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
  - xhigh → 「ultrathink+」（僅限 GPT-5.2 + Codex 模型）
  - adaptive → 由供應商管理的自適應推理預算（支援 Anthropic Claude 4.6 模型系列）
  - `x-high`、`x_high`、`extra-high`、`extra high` 和 `extra_high` 對應到 `xhigh`。
  - `highest`、`max` 對應到 `high`。
- 供應商注意事項：
  - 當未設定明確的思考層級時，Anthropic Claude 4.6 模型預設為 `adaptive`。
  - MiniMax (`minimax/*`) 在 Anthropic 相容串流路徑上預設為 `thinking: { type: "disabled" }`，除非您在模型參數或請求參數中明確設定 thinking。這可以避免 MiniMax 非原生 Anthropic 串流格式的 `reasoning_content` 差異洩漏。
  - Z.AI (`zai/*`) 僅支援二元思維 (`on`/`off`)。任何非 `off` 層級都會被視為 `on` (對應到 `low`)。
  - Moonshot (`moonshot/*`) 將 `/think off` 對應到 `thinking: { type: "disabled" }`，並將任何非 `off` 層級對應到 `thinking: { type: "enabled" }`。當啟用思維時，Moonshot 僅接受 `tool_choice` `auto|none`；OpenClaw 會將不相容的值正規化為 `auto`。

## 解析順序

1. 訊息上的內聯指令 (僅適用於該訊息)。
2. 會話覆寫 (透過發送僅包含指令的訊息來設定)。
3. 個別代理預設值 (設定中的 `agents.list[].thinkingDefault`)。
4. 全域預設值 (設定中的 `agents.defaults.thinkingDefault`)。
5. 後備選項：針對 Anthropic Claude 4.6 模型為 `adaptive`，其他具備推理能力的模型為 `low`，否則為 `off`。

## 設定會話預設值

- 發送一條**僅**包含指令的訊息 (允許空白字元)，例如 `/think:medium` 或 `/t high`。
- 這會套用於當前會話 (預設為每位發送者獨立)；可透過 `/think:off` 或會話閒置重置來清除。
- 系統會發送確認回覆 (`Thinking level set to high.` / `Thinking disabled.`)。如果層級無效 (例如 `/thinking big`)，該指令將被拒絕並顯示提示，且會話狀態保持不變。
- 發送 `/think` (或 `/think:`) 且不帶參數，以查看目前的思維層級。

## 代理應用

- **內嵌 Pi**：解析後的層級會傳遞給程序內的 Pi 代理執行環境。

## 快速模式 (/fast)

- 層級：`on|off`。
- 僅包含指令的訊息會切換工作階段快速模式覆寫，並回覆 `Fast mode enabled.` / `Fast mode disabled.`。
- 傳送 `/fast`（或 `/fast status`）但不指定模式，以查看目前生效的快速模式狀態。
- OpenClaw 依照以下順序解析快速模式：
  1. 內聯/僅指令 `/fast on|off`
  2. 工作階段覆寫
  3. 每個代理程式的預設值 (`agents.list[].fastModeDefault`)
  4. 每個模型的組態：`agents.defaults.models["<provider>/<model>"].params.fastMode`
  5. 後備：`off`
- 對於 `openai/*`，快速模式透過在支援的 Responses 請求中傳送 `service_tier=priority`，對應至 OpenAI 優先處理。
- 對於 `openai-codex/*`，快速模式會在 Codex Responses 上傳送相同的 `service_tier=priority` 旗標。OpenClaw 在這兩種驗證路徑之間維護一個共用的 `/fast` 切換開關。
- 對於直接公開的 `anthropic/*` 請求，包括傳送到 `api.anthropic.com` 的 OAuth 驗證流量，快速模式對應至 Anthropic 服務等級：`/fast on` 設定 `service_tier=auto`，`/fast off` 設定 `service_tier=standard_only`。
- 對於 Anthropic 相容路徑上的 `minimax/*`，`/fast on`（或 `params.fastMode: true`）會將 `MiniMax-M2.7` 重寫為 `MiniMax-M2.7-highspeed`。
- 當兩者皆已設定時，明確的 Anthropic `serviceTier` / `service_tier` 模型參數會覆寫快速模式預設值。對於非 Anthropic 代理基礎 URL，OpenClaw 仍會跳過 Anthropic 服務等級注入。

## 詳細指令 (/verbose 或 /v)

- 層級：`on` (最少) | `full` | `off` (預設)。
- 僅包含指令的訊息會切換工作階段詳細程度，並回覆 `Verbose logging enabled.` / `Verbose logging disabled.`；無效的層級會傳回提示而不會變更狀態。
- `/verbose off` 會儲存明確的工作階段覆寫；透過在 Sessions UI 中選擇 `inherit` 來清除它。
- 內聯指令僅影響該訊息；否則套用工作階段/全域預設值。
- 傳送 `/verbose`（或 `/verbose:`） 且不帶引數，以查看目前的詳細等級。
- 當詳細模式開啟時，發出結構化工具結果的代理程式（Pi、其他 JSON 代理程式）會將每個工具呼叫作為僅包含元資料的訊息傳回，並在可用時加上 `<emoji> <tool-name>: <arg>` 前綴（路徑/指令）。這些工具摘要會在每個工具啟動時立即傳送（獨立氣泡），而非以串流增量傳送。
- 工具失敗摘要在一般模式下仍然可見，但除非詳細等級為 `on` 或 `full`，否則會隱藏原始錯誤詳細資訊後綴。
- 當詳細等級為 `full` 時，工具輸出也會在完成後轉發（獨立氣泡，截斷為安全長度）。如果您在執行期間切換 `/verbose on|full|off`，後續的工具氣泡將採用新設定。

## Plugin trace directives (/trace)

- Levels: `on` | `off` (default).
- Directive-only message toggles session plugin trace output and replies `Plugin trace enabled.` / `Plugin trace disabled.`.
- Inline directive affects only that message; session/global defaults apply otherwise.
- Send `/trace` (or `/trace:`) with no argument to see the current trace level.
- `/trace` is narrower than `/verbose`: it only exposes plugin-owned trace/debug lines such as Active Memory debug summaries.
- Trace lines can appear in `/status` and as a follow-up diagnostic message after the normal assistant reply.

## Reasoning visibility (/reasoning)

- Levels: `on|off|stream`.
- Directive-only message toggles whether thinking blocks are shown in replies.
- When enabled, reasoning is sent as a **separate message** prefixed with `Reasoning:`.
- `stream` (Telegram only): streams reasoning into the Telegram draft bubble while the reply is generating, then sends the final answer without reasoning.
- Alias: `/reason`.
- Send `/reasoning` (or `/reasoning:`) with no argument to see the current reasoning level.
- Resolution order: inline directive, then session override, then per-agent default (`agents.list[].reasoningDefault`), then fallback (`off`).

## Related

- Elevated mode docs live in [Elevated mode](/en/tools/elevated).

## Heartbeats

- Heartbeat probe body is the configured heartbeat prompt (default: `Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`). Inline directives in a heartbeat message apply as usual (but avoid changing session defaults from heartbeats).
- Heartbeat delivery defaults to the final payload only. To also send the separate `Reasoning:` message (when available), set `agents.defaults.heartbeat.includeReasoning: true` or per-agent `agents.list[].heartbeat.includeReasoning: true`.

## Web chat UI

- 當頁面載入時，網頁聊天思考選擇器會反映傳入工作階段儲存/設定中所儲存的工作階段等級。
- 選擇另一個等級會透過 `sessions.patch` 立即寫入工作階段覆寫；它不會等待下一次傳送，而且不是一次性 `thinkingOnce` 覆寫。
- 第一個選項永遠是 `Default (<resolved level>)`，其中解析出的預設值來自於目前的工作階段模型：針對 Anthropic/Bedrock 上的 Claude 4.6 是 `adaptive`，其他具備推理能力的模型是 `low`，其他情況則是 `off`。
- 選擇器會保持對供應商的感知：
  - 大多數供應商會顯示 `off | minimal | low | medium | high | adaptive`
  - Z.AI 會顯示二元選項 `off | on`
- `/think:<level>` 仍然有效，並會更新相同的儲存工作階段等級，因此聊天指令與選擇器會保持同步。
