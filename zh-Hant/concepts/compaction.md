---
summary: "Context window + compaction: how OpenClaw keeps sessions under model limits"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "Compaction"
---

# Context Window & Compaction

Every model has a **context window** (max tokens it can see). Long-running chats accumulate messages and tool results; once the window is tight, OpenClaw **compacts** older history to stay within limits.

## What compaction is

Compaction **summarizes older conversation** into a compact summary entry and keeps recent messages intact. The summary is stored in the session history, so future requests use:

- The compaction summary
- Recent messages after the compaction point

Compaction **persists** in the session’s JSONL history.

## Configuration

Use the `agents.defaults.compaction` setting in your `openclaw.json` to configure compaction behavior (mode, target tokens, etc.).
Compaction summarization preserves opaque identifiers by default (`identifierPolicy: "strict"`). You can override this with `identifierPolicy: "off"` or provide custom text with `identifierPolicy: "custom"` and `identifierInstructions`.

You can optionally specify a different model for compaction summarization via `agents.defaults.compaction.model`. This is useful when your primary model is a local or small model and you want compaction summaries produced by a more capable model. The override accepts any `provider/model-id` string:

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-5"
      }
    }
  }
}
```

This also works with local models, for example a second Ollama model dedicated to summarization or a fine-tuned compaction specialist:

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "ollama/llama3.1:8b"
      }
    }
  }
}
```

When unset, compaction uses the agent's primary model.

## Auto-compaction (default on)

When a session nears or exceeds the model’s context window, OpenClaw triggers auto-compaction and may retry the original request using the compacted context.

You’ll see:

- `🧹 Auto-compaction complete` in verbose mode
- `/status` showing `🧹 Compactions: <count>`

Before compaction, OpenClaw can run a **silent memory flush** turn to store
durable notes to disk. See [Memory](/zh-Hant/concepts/memory) for details and config.

## Manual compaction

使用 `/compact`（可選附帶指令）強制執行壓縮：

```
/compact Focus on decisions and open questions
```

## Context window 來源

Context window 取決於特定模型。OpenClaw 使用來自已配置提供商目錄的模型定義來確定限制。

## 壓縮 vs 修剪

- **壓縮**：摘要並以 JSONL 形式**持久化**。
- **Session 修剪**：僅修剪舊的 **tool results**，每次請求**在記憶體中**進行。

請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning) 以了解修剪詳情。

## OpenAI 伺服器端壓縮

OpenClaw 也支援針對相容直接 OpenAI 模型的 OpenAI Responses 伺服器端壓縮提示。這與本機 OpenClaw 壓縮分開，並可與其並行運作。

- 本機壓縮：OpenClaw 摘要並持久化至 session JSONL。
- 伺服器端壓縮：當啟用 `store` + `context_management` 時，OpenAI 會在提供商端壓縮 context。

請參閱 [OpenAI provider](/zh-Hant/providers/openai) 以了解模型參數和覆寫。

## 自訂 context 引擎

壓縮行為由啟用的 [context engine](/zh-Hant/concepts/context-engine) 掌控。Legacy 引擎使用上述內建摘要功能。外掛引擎（透過 `plugins.slots.contextEngine` 選取）可實作任何壓縮策略——DAG 摘要、向量檢索、增量壓縮等。

當外掛引擎設定 `ownsCompaction: true` 時，OpenClaw 會將所有壓縮決策委派給該引擎，並且不執行內建的自動壓縮。

當 `ownsCompaction` 為 `false` 或未設定時，OpenClaw 可能仍會使用 Pi 的內建嘗試中自動壓縮，但啟用引擎的 `compact()` 方法仍會處理 `/compact` 和溢位復原。不會自動回退至 legacy 引擎的壓縮路徑。

如果您正在建構非擁有的 context 引擎，請透過從 `openclaw/plugin-sdk/core` 呼叫 `delegateCompactionToRuntime(...)` 來實作 `compact()`。

## 提示

- 當 sessions 感覺陳舊或 context 臃腫時，請使用 `/compact`。
- 大型 tool 輸出已被截斷；修剪可進一步減少 tool-result 的累積。
- 如果您需要一個全新的開始，`/new` 或 `/reset` 會啟動一個新的會話 id。

import en from "/components/footer/en.mdx";

<en />
