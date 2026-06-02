---
summary: "OpenClaw 如何建構提示詞上下文並回報 Token 使用量與成本"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token use and costs"
---

OpenClaw 追蹤的是 **tokens**，而非字元。Token 是特定於模型的，但大多數 OpenAI 風格的模型對於英文文字平均每個 token 約為 4 個字元。

## 如何建構系統提示詞

OpenClaw 會在每次執行時組裝自己的系統提示詞。它包含：

- 工具列表 + 簡短描述
- 技能列表（僅限元資料；指令會透過 `read` 按需載入）。
  原生 Codex 回合會將緊湊的技能區塊作為回合範圍的協作開發者指令接收；其他框架則在一般提示表面接收它。它受 `skills.limits.maxSkillsPromptChars` 限制，並可透過 `agents.list[].skillsLimits.maxSkillsPromptChars` 進行每個代理的選擇性覆寫。
- 自我更新指令
- 工作區 + 引導檔案（`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 當它們是新的時，加上 `MEMORY.md` 當它們存在時）。原生 Codex 回合不會在記憶工具可用於該工作區時，從設定的代理工作區貼上原始 `MEMORY.md`；它們會在回合範圍的協作開發者指令中包含一個小型記憶指標，並按需使用記憶工具。如果工具被停用、記憶搜尋不可用，或目前工作區與代理記憶工作區不同，`MEMORY.md` 會使用一般限制的回合內容路徑。小寫根 `memory.md` 不會被注入；當與 `MEMORY.md` 配對時，它是 `openclaw doctor --fix` 的舊版修復輸入。大型注入的檔案會被 `agents.defaults.bootstrapMaxChars` 截斷（預設值：12000），且總引導注入會受到 `agents.defaults.bootstrapTotalMaxChars` 上限（預設值：60000）。`memory/*.md` 每日檔案不是一般引導提示的一部分；它們在普通回合中透過記憶工具保持按需使用，但重置/啟動模型執行可以在第一個回合前面加上包含近期每日記憶的一次性啟動內容區塊。純聊天 `/new` 和 `/reset` 指令會被確認而不會呼叫模型。啟動前奏由 `agents.defaults.startupContext` 控制。壓縮後的 AGENTS.md 摘要是分開的，並需要明確的 `agents.defaults.compaction.postCompactionSections` 選擇加入。
- 時間 (UTC + 使用者時區)
- 回覆標籤 + 心跳行為
- 執行時期中繼資料 (主機/作業系統/模型/思考)

請參閱 [System Prompt](/zh-Hant/concepts/system-prompt) 中的完整細目。

在記錄憑證或 auth 程式碼片段時，請使用
[Secret Placeholder Conventions](/zh-Hant/reference/secret-placeholder-conventions) 以
避免純文件變更導致 secret-scanner 誤報。

## 什麼計入上下文視窗

模型接收到的所有內容都會計入上下文限制：

- 系統提示詞（上述列出的所有部分）
- 對話歷史（使用者 + 助手訊息）
- 工具呼叫和工具結果
- 附件/逐字稿（圖片、音訊、檔案）
- 壓縮摘要和修剪工藝
- 供應商包裝器或安全性標頭（不可見，但仍會計入）

某些運算時資源消耗較高的介面有其自身的明確上限：

- `agents.defaults.contextLimits.memoryGetMaxChars`
- `agents.defaults.contextLimits.memoryGetDefaultLines`
- `agents.defaults.contextLimits.toolResultMaxChars`
- `agents.defaults.contextLimits.postCompactionMaxChars`

Per-agent overrides live under `agents.list[].contextLimits`. These knobs are
for bounded runtime excerpts and injected runtime-owned blocks. They are
separate from bootstrap limits, startup-context limits, and skills prompt
limits.

`toolResultMaxChars` is an advanced ceiling. When it is unset, OpenClaw chooses
the live tool-result cap from the effective model context window: `16000` chars
below 100K tokens, `32000` chars at 100K+ tokens, and `64000` chars at 200K+
tokens, still bounded by the runtime context-share guard.

For images, OpenClaw downscales transcript/tool image payloads before provider calls.
Use `agents.defaults.imageMaxDimensionPx` (default: `1200`) to tune this:

- Lower values usually reduce vision-token usage and payload size.
- Higher values preserve more visual detail for OCR/UI-heavy screenshots.

For a practical breakdown (per injected file, tools, skills, and system prompt size), use `/context list` or `/context detail`. See [Context](/zh-Hant/concepts/context).

## How to see current token usage

Use these in chat:

- `/status` → **emoji-rich status card** with the session model, context usage,
  last response input/output tokens, and **estimated cost** when local pricing is
  configured for the active model.
- `/usage off|tokens|full` → appends a **per-response usage footer** to every reply.
  - Persists per session (stored as `responseUsage`).
  - `/usage full` shows estimated cost only when OpenClaw has usage metadata and
    local pricing for the active model. Otherwise it shows tokens only.
- `/usage cost` → shows a local cost summary from OpenClaw session logs.

Other surfaces:

- **TUI/Web TUI:** `/status` + `/usage` are supported.
- **CLI:** `openclaw status --usage` and `openclaw channels list` show
  normalized provider quota windows (`X% left`, not per-response costs).
  Current usage-window providers: Anthropic, GitHub Copilot, Gemini CLI,
  OpenAI Codex, MiniMax, Xiaomi, and z.ai.

使用介面在顯示前會將常見的供應商原生欄位別名進行正規化。
對於 OpenAI 系列 Responses 流量，這包括 `input_tokens` /
`output_tokens` 和 `prompt_tokens` / `completion_tokens`，因此傳輸特定的
欄位名稱不會改變 `/status`、`/usage` 或會話摘要。
Gemini CLI JSON 使用量也會正規化：回覆文字來自 `response`，而
`stats.cached` 對應到 `cacheRead`，並在 CLI 省略明確的
`stats.input` 欄位時使用 `stats.input_tokens - stats.cached`。
對於原生 OpenAI 系列 Responses 流量，WebSocket/SSE 使用量別名也會
以相同方式正規化，當 `total_tokens` 遺失或 `0` 時，總計會退回到正規化的輸入 + 輸出。
當目前的會話快照稀疏時，`/status` 和 `session_status` 也可以
從最新的逐字稿使用量記錄中恢復 token/cache 計數器和活動執行時模型標籤。
現有的非零即時值仍然優先於逐字稿退回值，而當儲存的總計遺失或較小時，較大的導向提示的
逐字稿總計可能勝出。
供應商配額視窗的使用量授權來自供應商特定的掛鉤（如果可用）；
否則 OpenClaw 會退回到從授權設定檔、環境或配置中比對 OAuth/API 金鑰憑證。
助理逐字稿條目會保留相同的正規化使用量形狀，包括
當活動模型已設定價格且供應商返回使用量元資料時的 `usage.cost`。
這為 `/usage cost` 和逐字稿支援的會話狀態
提供了即使即時執行時狀態消失後仍然穩定的來源。

OpenClaw 將提供者使用量計算與當前上下文快照分開處理。提供者 `usage.total` 可以包含快取輸入、輸出和多次工具迴圈模型呼叫，因此它對成本和遙測很有用，但可能會高估即時上下文視窗。上下文顯示和診斷針對 `context.used` 使用最新的提示快照（`promptTokens`，或者在沒有提示快照可用時使用最後一次模型呼叫）。

## 成本估算（顯示時）

成本是根據您的模型定價配置估算的：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和 `cacheWrite` 的 **每百萬 Token 美元價格**。如果缺少定價，OpenClaw 僅顯示 Token。成本顯示不限於 API 金鑰驗證：諸如 `aws-sdk` 等非 API 金鑰提供者，當其設定的模型條目包含本地定價且提供者返回使用元數據時，可以顯示估算成本。

在 Sidecar 和通道到達 Gateway 就緒路徑後，OpenClaw 會針對尚未具備本地定價的設定模型參照，啟動可選的背景定價引導程序。該引導程序會獲取遠端 OpenRouter 和 LiteLLM 定價目錄。設定 `models.pricing.enabled: false` 以在離線或受限制的網路上跳過這些目錄獲取；明確的 `models.providers.*.models[].cost` 條目會繼續驅動本地成本估算。

## 快取 TTL 和修剪影響

提供者提示快取僅在快取 TTL 視窗內有效。OpenClaw 可以選擇執行 **快取 TTL 修剪**：它在快取 TTL 過期後修剪會話，然後重設快取視窗，以便後續請求可以重用新鮮的快取上下文，而不是重新快取完整歷史記錄。這可以在會話閒置超過 TTL 時保持較低的快取寫入成本。

在 [Gateway configuration](/zh-Hant/gateway/configuration) 中進行配置，並在 [Session pruning](/zh-Hant/concepts/session-pruning) 中查看行為細節。

心跳可以在閒置間隙期間保持快取 **溫熱**。如果您的模型快取 TTL 是 `1h`，將心跳間隔設定為略低於該值（例如 `55m`）可以避免重新快取完整提示，從而降低快取寫入成本。

在多代理設定中，您可以維護一個共用的模型設定，並使用 `agents.list[].params.cacheRetention` 針對每個代理調整快取行為。

若要了解完整的逐項控制指南，請參閱 [Prompt Caching](/zh-Hant/reference/prompt-caching)。

關於 Anthropic API 定價，快取讀取的成本遠低於輸入 tokens，而快取寫入則以較高的乘數計費。請參閱 Anthropic 的 prompt caching pricing 以了解最新費率和 TTL 乘數：
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

### 範例：使用心跳保持 1 小時快取溫熱

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

### 範例：使用每代理快取策略處理混合流量

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

`agents.list[].params` 會在選定模型的 `params` 之上合併，因此您只能
覆寫 `cacheRetention` 並繼承其他模型預設值而不變。

### Anthropic 1M context

OpenClaw 將支援 GA 的 Claude 4.x 模型（如 Opus 4.8、Opus 4.7、Opus 4.6 和
Sonnet 4.6）設定為 Anthropic 的 1M context window。對於這些模型，您不需要
`params.context1m: true`。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        alias: opus
```

較舊的設定可以保留 `context1m: true`，但 OpenClaw 不再針對此設定發送
Anthropic 已停用的 `context-1m-2025-08-07` beta 標頭，且不會
將不支援的舊版 Claude 模型擴展至 1M。

需求：憑證必須符合長 context 使用資格。若不符合，
Anthropic 會針對該請求回應供應商端的速率限制錯誤。

如果您使用 OAuth/訂閱 tokens (`sk-ant-oat-*`) 對 Anthropic 進行驗證，
OpenClaw 會保留 OAuth 所需的 Anthropic beta 標頭，同時移除
較舊設定中可能仍存在的已停用 `context-1m-*` beta。

## 減輕 token 壓力的技巧

- 使用 `/compact` 來總結長對話。
- 在工作流程中裁剪大型工具輸出。
- 對於包含大量截圖的對話，請降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短（技能清單會被注入至提示中）。
- 對於冗長或探索性的工作，請優先選擇較小的模型。

請參閱 [Skills](/zh-Hant/tools/skills) 以了解確切的技能清單開銷公式。

## 相關內容

- [API usage and costs](/zh-Hant/reference/api-usage-costs)
- [Prompt caching](/zh-Hant/reference/prompt-caching)
- [Usage tracking](/zh-Hant/concepts/usage-tracking)
