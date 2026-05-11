---
summary: "OpenClaw 如何建構提示詞上下文並回報 Token 使用量與成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token use and costs"
---

# Token 使用與成本

OpenClaw 追蹤的是 **Token**，而非字元。Token 取決於模型，但大多數
OpenAI 風格的模型對於英文文字平均每個 Token 約為 4 個字元。

## 系統提示詞的建構方式

OpenClaw 會在每次執行時組裝自己的系統提示詞。它包含：

- 工具清單 + 簡短描述
- 技能清單（僅包含元資料；指令會透過 `read` 按需載入）。
  精簡的技能區塊由 `skills.limits.maxSkillsPromptChars` 限制範圍，
  並可在 `agents.list[].skillsLimits.maxSkillsPromptChars` 進行針對個別代理程式的選擇性覆寫。
- 自我更新指令
- Workspace + bootstrap files (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` when new, plus `MEMORY.md` when present). Lowercase root `memory.md` is not injected; it is legacy repair input for `openclaw doctor --fix` when paired with `MEMORY.md`. Large files are truncated by `agents.defaults.bootstrapMaxChars` (default: 12000), and total bootstrap injection is capped by `agents.defaults.bootstrapTotalMaxChars` (default: 60000). `memory/*.md` daily files are not part of the normal bootstrap prompt; they remain on-demand via memory tools on ordinary turns, but bare `/new` and `/reset` can prepend a one-shot startup-context block with recent daily memory for that first turn. That startup prelude is controlled by `agents.defaults.startupContext`.
- 時間（UTC + 使用者時區）
- 回覆標籤 + 心跳行為
- 執行時期元資料（主機/OS/模型/思維）

See the full breakdown in [System Prompt](/zh-Hant/concepts/system-prompt).

## 計入上下文視窗的項目

模型接收的所有內容都會計入上下文限制：

- 系統提示詞（上述列出的所有部分）
- 對話歷史（使用者 + 助手訊息）
- 工具呼叫與工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要與修剪產物
- 供應商封裝或安全標頭（不可見，但仍計入）

一些運算負載較重的介面有其各自明確的上限：

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

Per-agent overrides live under `agents.list[].contextLimits`. These knobs are
for bounded runtime excerpts and injected runtime-owned blocks. They are
separate from bootstrap limits, startup-context limits, and skills prompt
limits.

For images, OpenClaw downscales transcript/tool image payloads before provider calls.
Use `agents.defaults.imageMaxDimensionPx` (default: `1200`) to tune this:

- 較低的值通常會減少視覺權位的使用和負載大小。
- 較高的值會保留更多視覺細節，適用於 OCR/UI 密集型的螢幕截圖。

For a practical breakdown (per injected file, tools, skills, and system prompt size), use `/context list` or `/context detail`. See [Context](/zh-Hant/concepts/context).

## 如何查看目前的權位使用量

在聊天中使用這些指令：

- `/status` → **emoji‑rich status card** with the session model, context usage,
  last response input/output tokens, and **estimated cost** (API key only).
- `/usage off|tokens|full` → appends a **per-response usage footer** to every reply.
  - 每個會話持續存在（儲存為 `responseUsage`）。
  - OAuth 驗證 **會隱藏成本**（僅顯示權位）。
- `/usage cost` → 顯示來自 OpenClaw 會話日誌的本機成本摘要。

其他介面：

- **TUI/Web TUI：** 支援 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 顯示
  正規化的提供者配額視窗（`X% left`，而非單次回應成本）。
  目前支援使用量視窗的提供者：Anthropic、GitHub Copilot、Gemini CLI、
  OpenAI Codex、MiniMax、小米和 z.ai。

使用介面會在顯示前將常見的提供者原生欄位別名標準化。
對於 OpenAI 系列的 Responses 流量，這包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此傳輸特定的
欄位名稱不會改變 `/status`、`/usage` 或會話摘要。
Gemini CLI JSON 使用量也會標準化：回覆文字來自 `response`，且
`stats.cached` 對應到 `cacheRead`，並在 CLI 省略明確的
`stats.input` 欄位時使用 `stats.input_tokens - stats.cached`。
對於原生 OpenAI 系列的 Responses 流量，WebSocket/SSE 使用量別名
會以相同方式標準化，且當 `total_tokens` 遺失或
`0` 時，總計會退回標準化的輸入 + 輸出。
當目前會话快照稀疏時，`/status` 和 `session_status` 也可以
從最新的文字記錄使用量日誌中恢復 token/快取計數器和作用中的執行時期模型標籤。現有的非零即時值仍然
優先於文字記錄退回值，且當儲存的總計遺失或較小時，較大的提示導向
文字記錄總計可以獲勝。
提供者配額視窗的使用量驗證來自提供者特定的掛鉤（如果有）；
否則 OpenClaw 會退回從驗證設定檔、環境變數或設定中
匹配 OAuth/API 金鑰憑證。
助理文字記錄項目會保留相同的標準化使用量形狀，包括當作用中模型設定
了價格且提供者回傳使用量元資料時的 `usage.cost`。這給予 `/usage cost`
和文字記錄支援的會話狀態一個穩定的來源，即使在即時執行狀態消失之後。

OpenClaw 將提供者使用量計算與目前的內容快照分開。提供者 `usage.total` 可以包含快取的輸入、輸出和多次工具迴圈模型調用，因此它對成本和遙測很有用，但可能會高估即時內容視窗。內容顯示和診斷使用最新的提示快照（`promptTokens`，或者在沒有提示快照時使用最後一次模型調用）進行 `context.used`。

## 成本估算（顯示時）

成本是根據您的模型定價設定估算的：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和 `cacheWrite` 的 **每 100 萬個 Token 的 USD** 價格。如果缺少定價，OpenClaw 只會顯示 Token。OAuth Token 從不顯示美元成本。

## 快取 TTL 和修剪影響

提供者提示快取僅在快取 TTL 視窗內應用。OpenClaw 可以選擇性地執行 **cache-ttl 修剪**：它會在快取 TTL 過期後修剪一次會話，然後重設快取視窗，以便後續請求可以重新使用新快取的內容，而不是重新快取完整歷史記錄。當會話閒置超過 TTL 時，這可以保持較低的快取寫入成本。

在 [Gateway configuration](/zh-Hant/gateway/configuration) 中設定它，並在 [Session pruning](/zh-Hant/concepts/session-pruning) 中查看行為詳細資訊。

Heartbeat 可以在閒置間隔期間保持快取 **溫熱**。如果您的模型快取 TTL 是 `1h`，將心跳間隔設定為略低於該值（例如 `55m`）可以避免重新快取完整提示，從而降低快取寫入成本。

在多 Agent 設定中，您可以保留一個共用的模型設定，並使用 `agents.list[].params.cacheRetention` 針對每個 Agent 調整快取行為。

如需完整的逐項控制指南，請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。

對於 Anthropic API 定價，快取讀取顯著便宜於輸入 Token，而快取寫入則以更高的倍率計費。請參閱 Anthropic 的提示快取定價以了解最新費率和 TTL 倍率：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 範例：使用 heartbeat 保持 1 小時快取溫熱

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
    heartbeat:
      every: "55m"
```

### 範例：使用每 Agent 快取策略的混合流量

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long" # default baseline for most agents
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m" # keep long cache warm for deep sessions
    - id: "alerts"
      params:
        cacheRetention: "none" # avoid cache writes for bursty notifications
```

`agents.list[].params` 會在所選模型的 `params` 之上合併，因此您可以
僅覆寫 `cacheRetention` 並繼承其他模型預設值而不變。

### 範例：啟用 Anthropic 1M 語境 beta 標頭

Anthropic 的 1M 語境視窗目前為 beta 限定功能。當您在支援的 Opus
或 Sonnet 模型上啟用 `context1m` 時，OpenClaw 可以注入
所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

這對應到 Anthropic 的 `context-1m-2025-08-07` beta 標頭。

這僅適用於在該模型項目上設定了 `context1m: true` 時。

需求：憑證必須符合使用長語境的資格。否則，
Anthropic 將針對該請求回應提供者端速率限制錯誤。

如果您使用 OAuth/訂閱權杖 (`sk-ant-oat-*`) 對 Anthropic 進行驗證，
OpenClaw 將跳過 `context-1m-*` beta 標頭，因為 Anthropic 目前
會以 HTTP 401 拒絕該組合。

## 減少 Token 壓力的技巧

- 使用 `/compact` 來總結長對話。
- 在您的工作流程中修剪大型工具輸出。
- 對於包含大量截圖的對話，請降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短（技能列表會被注入到提示詞中）。
- 對於冗長的探索性工作，請優先選擇較小的模型。

請參閱 [技能](/zh-Hant/tools/skills) 以了解確切的技能列表開銷公式。

## 相關

- [API 使用與成本](/zh-Hant/reference/api-usage-costs)
- [提示詞快取](/zh-Hant/reference/prompt-caching)
- [使用追蹤](/zh-Hant/concepts/usage-tracking)
