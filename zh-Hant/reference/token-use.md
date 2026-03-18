---
summary: "How OpenClaw builds prompt context and reports token usage + costs"
read_when:
  - Explaining token usage, costs, or context windows
  - Debugging context growth or compaction behavior
title: "Token Use and Costs"
---

# Token use & costs

OpenClaw tracks **tokens**, not characters. Tokens are model-specific, but most
OpenAI-style models average ~4 characters per token for English text.

## How the system prompt is built

OpenClaw assembles its own system prompt on every run. It includes:

- Tool list + short descriptions
- Skills list (only metadata; instructions are loaded on demand with `read`)
- Self-update instructions
- Workspace + bootstrap files (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md` when new, plus `MEMORY.md` when present or `memory.md` as a lowercase fallback). Large files are truncated by `agents.defaults.bootstrapMaxChars` (default: 20000), and total bootstrap injection is capped by `agents.defaults.bootstrapTotalMaxChars` (default: 150000). `memory/*.md` files are on-demand via memory tools and are not auto-injected.
- Time (UTC + user timezone)
- Reply tags + heartbeat behavior
- Runtime metadata (host/OS/model/thinking)

See the full breakdown in [System Prompt](/zh-Hant/concepts/system-prompt).

## What counts in the context window

Everything the model receives counts toward the context limit:

- System prompt (all sections listed above)
- Conversation history (user + assistant messages)
- Tool calls and tool results
- Attachments/transcripts (images, audio, files)
- Compaction summaries and pruning artifacts
- Provider wrappers or safety headers (not visible, but still counted)

For images, OpenClaw downscales transcript/tool image payloads before provider calls.
Use `agents.defaults.imageMaxDimensionPx` (default: `1200`) to tune this:

- Lower values usually reduce vision-token usage and payload size.
- Higher values preserve more visual detail for OCR/UI-heavy screenshots.

如需實用的細分（按每個注入的檔案、工具、技能和系統提示大小），請使用 `/context list` 或 `/context detail`。請參閱[Context](/zh-Hant/concepts/context)。

## 如何查看目前的 Token 使用量

在聊天中使用這些：

- `/status` → **豐富表情符號的狀態卡片**，包含會話模型、內容使用量、
  上次回應的輸入/輸出 Token，以及**預估成本**（僅限 API 金鑰）。
- `/usage off|tokens|full` → 在每次回覆附加**單一回應使用量頁尾**。
  - 每個會話持續存在（儲存為 `responseUsage`）。
  - OAuth 驗證**隱藏成本**（僅顯示 Token）。
- `/usage cost` → 顯示來自 OpenClaw 會話日誌的本機成本摘要。

其他介面：

- **TUI/Web TUI：** 支援 `/status` + `/usage`。
- **CLI：** `openclaw status --usage` 和 `openclaw channels list` 顯示
  提供商配額視窗（非單一回應成本）。

## 成本估算（顯示時）

成本是根據您的模型定價設定估算：

```
models.providers.<provider>.models[].cost
```

這些是 `input`、`output`、`cacheRead` 和
`cacheWrite` 的 **每百萬 Token 美元價格**。如果缺少定價，OpenClaw 只顯示 Token。OAuth Token
永遠不會顯示美元成本。

## 快取 TTL 和修剪影響

提供商提示快取僅在快取 TTL 視窗內適用。OpenClaw 可以
選擇執行 **cache-ttl 修剪**：它在快取 TTL
過期後修剪會話，然後重設快取視窗，以便後續請求可以重複使用
新快取的內容，而不是重新快取完整歷史記錄。這能在會話閒置超過 TTL 時
降低快取寫入成本。

在 [Gateway configuration](/zh-Hant/gateway/configuration) 中進行設定，並在 [Session pruning](/zh-Hant/concepts/session-pruning) 中查看
行為詳細資訊。

Heartbeat 可以在閒置間隔中保持快取 **warm**。如果您的模型快取 TTL
是 `1h`，將心跳間隔設定為略低於該值（例如 `55m`） 可以避免
重新快取完整提示，從而降低快取寫入成本。

在多代理設定中，您可以保留一個共享的模型配置，並使用 `agents.list[].params.cacheRetention` 針對每個代理調整快取行為。

如需完整的逐步指南，請參閱 [提示快取](/zh-Hant/reference/prompt-caching)。

關於 Anthropic API 的定價，快取讀取的費用顯著低於輸入 Token，而快取寫入則以更高的倍率計費。請參閱 Anthropic 的提示快取定價以獲取最新費率和 TTL 倍率：
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

`agents.list[].params` 會合併在所選模型的 `params` 之上，因此您可以只覆寫 `cacheRetention` 並繼承其他模型預設值而不變。

### 範例：啟用 Anthropic 1M 語境 Beta 標頭

Anthropic 的 1M 語境視窗目前處於 Beta 階段並受限制。當您在支援的 Opus 或 Sonnet 模型上啟用 `context1m` 時，OpenClaw 可以注入所需的 `anthropic-beta` 值。

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          context1m: true
```

這對應到 Anthropic 的 `context-1m-2025-08-07` Beta 標頭。

這僅適用於在該模型項目上設定了 `context1m: true` 時。

需求：憑證必須符合使用長語境的資格（API 金鑰付費，或已啟用額外使用量的訂閱）。如果不符合，Anthropic 將回應 `HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

如果您使用 OAuth/訂閱權杖 (`sk-ant-oat-*`) 來驗證 Anthropic，OpenClaw 將跳過 `context-1m-*` Beta 標頭，因為 Anthropic 目前會以 HTTP 401 拒絕該組合。

## 減少 Token 壓力的提示

- 使用 `/compact` 來摘要長對話。
- 在您的工作流程中修剪大型工具輸出。
- 對於包含大量截圖的對話，請降低 `agents.defaults.imageMaxDimensionPx`。
- 保持技能描述簡短（技能列表會注入到提示中）。
- 對於冗長的探索性工作，請優先使用較小的模型。

關於確切的技能列表開銷公式，請參閱 [技能](/zh-Hant/tools/skills)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
