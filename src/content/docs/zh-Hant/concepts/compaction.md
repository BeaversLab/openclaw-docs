---
summary: "內容視窗 + 壓縮：OpenClaw 如何讓會話保持在模型限制內"
read_when:
  - You want to understand auto-compaction and /compact
  - You are debugging long sessions hitting context limits
title: "壓縮"
---

# 內容視窗與壓縮

每個模型都有一個 **內容視窗**（context window，即它能看到的最大 token 數）。長時間的對話會累積訊息和工具結果；一旦視窗接近限制，OpenClaw 會 **壓縮** 舊的歷史記錄以保持在限制之內。

## 什麼是壓縮

壓縮會將 **較舊的對話** 總結為一個精簡的摘要條目，並保持最近的訊息不變。摘要會儲存在會話歷史中，因此未來的請求將使用：

- 壓縮摘要
- 壓縮點之後的近期訊息

壓縮 **持久化** 在會話的 JSONL 歷史記錄中。

## 設定

使用您的 `openclaw.json` 中的 `agents.defaults.compaction` 設定來設定壓縮行為（模式、目標 token 等）。
壓縮摘要預設會保留不透明識別符（`identifierPolicy: "strict"`）。您可以使用 `identifierPolicy: "off"` 覆寫此設定，或透過 `identifierPolicy: "custom"` 和 `identifierInstructions` 提供自訂文字。

您可以選擇透過 `agents.defaults.compaction.model` 指定不同的模型來進行壓縮摘要。當您的主要模型是本機或小型模型，且您希望由更強大的模型產生壓縮摘要時，這非常有用。此覆寫接受任何 `provider/model-id` 字串：

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

這也適用於本機模型，例如專門用於摘要的第二個 Ollama 模型，或微調過的壓縮專家模型：

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

未設定時，壓縮會使用代理程式的主要模型。

## 自動壓縮（預設開啟）

當會話接近或超過模型的內容視窗時，OpenClaw 會觸發自動壓縮，並可能使用壓縮後的上下文重試原始請求。

您會看到：

- 在詳細模式下看到 `🧹 Auto-compaction complete`
- 顯示 `🧹 Compactions: <count>` 的 `/status`

在壓縮之前，OpenClaw 可以執行 **無聲記憶體清理** 回合，將持久化筆記儲存到磁碟。詳情與設定請參閱 [記憶體](/en/concepts/memory)。

## 手動壓縮

使用 `/compact`（可選附帶指令）來強制執行壓縮：

```
/compact Focus on decisions and open questions
```

## Context window 來源

Context window 視模型而定。OpenClaw 使用設定好的提供商目錄中的模型定義來判斷限制。

## 壓縮與剪枝

- **壓縮**：總結並以 JSONL 格式**持久化**。
- **Session 剪枝**：僅修剪舊的 **tool results**，**在記憶體中**進行，針對每個請求。

請參閱 [/concepts/session-pruning](/en/concepts/session-pruning) 以了解剪枝細節。

## OpenAI 伺服器端壓縮

OpenClaw 也支援相容的 OpenAI 直接模型之 OpenAI Responses 伺服器端壓縮提示。這與本機 OpenClaw
壓縮是分開的，兩者可以並行運作。

- 本機壓縮：OpenClaw 進行總結並持久化至 session JSONL。
- 伺服器端壓縮：當啟用
  `store` + `context_management` 時，OpenAI 會在提供商端壓縮 context。

請參閱 [OpenAI provider](/en/providers/openai) 以了解模型參數與覆寫。

## 自訂 context 引擎

壓縮行為由使用中的
[context engine](/en/concepts/context-engine) 掌管。舊版引擎使用上述內建的
總結功能。透過
`plugins.slots.contextEngine` 選擇的插件引擎可以實作任何壓縮策略 — 例如
DAG 摘要、向量檢索、增量壓縮等。

當插件引擎設定 `ownsCompaction: true` 時，OpenClaw 會將所有
壓縮決策委派給該引擎，並不執行內建的自動壓縮。

當 `ownsCompaction` 為 `false` 或未設定時，OpenClaw 可能仍會使用 Pi 的
內建嘗試中自動壓縮，但使用中引擎的 `compact()` 方法
仍會處理 `/compact` 與溢出恢復。不會自動
回退至舊版引擎的壓縮路徑。

如果您正在建構非擁有權的 context 引擎，請透過從 `openclaw/plugin-sdk/core` 呼叫 `delegateCompactionToRuntime(...)` 來實作 `compact()`。

## 提示

- 當 session 感覺停滯或 context 臃腫時，請使用 `/compact`。
- 大型工具輸出已經被截斷；剪枝可以進一步減少工具結果的累積。
- 如果您需要重新開始，`/new` 或 `/reset` 會啟動一個新的 session id。
