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

使用 `/compact`（可選地帶有指示）來強制執行壓合：

```
/compact Focus on decisions and open questions
```

## Context window source

Context window is model-specific. OpenClaw uses the model definition from the configured provider catalog to determine limits.

## Compaction vs pruning

- **Compaction**：總結並以 JSONL **持久化**。
- **Session pruning**：僅修剪舊的 **tool results**，**在記憶體中**進行，依請求處理。

有關修剪的詳細資訊，請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning)。

## OpenAI server-side compaction

OpenClaw 也支援相容的直接 OpenAI 模型的 OpenAI Responses 伺服器端壓合提示。這與本機 OpenClaw 壓合是分開的，並可與其並行運作。

- Local compaction：OpenClaw 總結並持久化到 session JSONL。
- Server-side compaction：當啟用
  `store` + `context_management` 時，OpenAI 在提供者端壓合上下文。

有關模型參數和覆寫，請參閱 [OpenAI provider](/zh-Hant/providers/openai)。

## Tips

- 當 session 感覺陳舊或上下文臃腫時，請使用 `/compact`。
- Large tool outputs are already truncated; pruning can further reduce tool-result buildup.
- If you need a fresh slate, `/new` or `/reset` starts a new session id.

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
