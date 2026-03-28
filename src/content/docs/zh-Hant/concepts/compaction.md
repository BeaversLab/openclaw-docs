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

在您的 `openclaw.json` 中使用 `agents.defaults.compaction` 設定來配置壓縮行為（模式、目標 token 等）。
壓縮摘要預設會保留不透明識別碼（`identifierPolicy: "strict"`）。您可以使用 `identifierPolicy: "off"` 覆寫此設定，或透過 `identifierPolicy: "custom"` 和 `identifierInstructions` 提供自訂文字。

您可以選擇透過 `agents.defaults.compaction.model` 指定不同的模型來進行壓縮摘要。當您的主要模型是本地或小型模型，且您希望由更強大的模型產生壓縮摘要時，這非常有用。此覆寫接受任何 `provider/model-id` 字串：

```json
{
  "agents": {
    "defaults": {
      "compaction": {
        "model": "openrouter/anthropic/claude-sonnet-4-6"
      }
    }
  }
}
```

這也適用於本地模型，例如專用於摘要的第二個 Ollama 模型，或是微調過的壓縮專用模型：

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

若未設定，壓縮將使用代理程式的主要模型。

## 自動壓縮（預設開啟）

當對話接近或超過模型的上下文視窗時，OpenClaw 會觸發自動壓縮，並可能使用壓縮後的上下文重試原始請求。

您會看到：

- `🧹 Auto-compaction complete` 在詳細模式下
- `/status` 顯示 `🧹 Compactions: <count>`

在壓縮之前，OpenClaw 可以運行一個 **靜默記憶體刷新** 輪次，將持久化筆記存儲到磁盤。有關詳細資訊和配置，請參閱 [Memory](/zh-Hant/concepts/memory)。

## 手動壓縮

使用 `/compact`（可選配指令）強制執行壓縮：

```
/compact Focus on decisions and open questions
```

## 上下文視窗來源

上下文視窗取決於模型。OpenClaw 使用來自已配置提供商目錄中的模型定義來確定限制。

## 壓縮 vs 修剪

- **壓縮**：總結並以 JSONL **持久化**。
- **Session pruning**: 僅修剪舊的 **tool results**，**in-memory**，針對每個請求。

請參閱 [/concepts/session-pruning](/zh-Hant/concepts/session-pruning) 以了解 pruning 的細節。

## OpenAI 伺服器端壓縮

OpenClaw 也支援 OpenAI Responses 伺服器端壓縮提示，用於相容的直接 OpenAI 模型。這與本地 OpenClaw 壓縮分開，並可與其並行運作。

- 本地壓縮：OpenClaw 將摘要持久化到 session JSONL 中。
- 伺服器端壓縮：當啟用
  `store` + `context_management` 時，OpenAI 會在提供者端壓縮上下文。

請參閱 [OpenAI provider](/zh-Hant/providers/openai) 以了解模型參數和覆蓋設定。

## 自訂上下文引擎

壓縮行為由啟用的
[context engine](/zh-Hant/concepts/context-engine) 控制。傳統引擎使用上述
內建的摘要功能。透過
`plugins.slots.contextEngine` 選取的外掛引擎可以實作任何壓縮策略 — 例如
DAG 摘要、向量檢索、增量濃縮等。

當外掛引擎設定 `ownsCompaction: true` 時，OpenClaw 會將所有
壓縮決策委派給該引擎，並且不執行內建的自動壓縮。

當 `ownsCompaction` 為 `false` 或未設定時，OpenClaw 仍可能使用 Pi 的
內建嘗試中自動壓縮，但啟用引擎的 `compact()` 方法
仍會處理 `/compact` 和溢出恢復。並不會自動
回退到傳統引擎的壓縮路徑。

如果您正在建構非擁有的上下文引擎，請透過從 `openclaw/plugin-sdk/core` 呼叫 `delegateCompactionToRuntime(...)` 來實作 `compact()`。

## 提示

- 當對話感覺陳舊或上下文過於臃腫時，請使用 `/compact`。
- 大型工具輸出已經被截斷；修剪可以進一步減少工具結果的積累。
- 如果您需要一個全新的開始，`/new` 或 `/reset` 會啟動一個新的 session id。
