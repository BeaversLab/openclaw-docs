---
summary: "Context engine: pluggable context assembly, compaction, and subagent lifecycle"
read_when:
  - 您想要了解 OpenClaw 如何組合模型上下文
  - 您正在舊版引擎和外掛引擎之間切換
  - 您正在建構一個上下文引擎外掛
title: "Context Engine"
---

# Context Engine

A **context engine** controls how OpenClaw builds model context for each run.
It decides which messages to include, how to summarize older history, and how
to manage context across subagent boundaries.

OpenClaw ships with a built-in `legacy` engine. Plugins can register
alternative engines that replace the active context-engine lifecycle.

## Quick start

Check which engine is active:

```bash
openclaw doctor
# or inspect config directly:
cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
```

### Installing a context engine plugin

Context engine plugins are installed like any other OpenClaw plugin. Install
first, then select the engine in the slot:

```bash
# Install from npm
openclaw plugins install @martian-engineering/lossless-claw

# Or install from a local path (for development)
openclaw plugins install -l ./my-context-engine
```

Then enable the plugin and select it as the active engine in your config:

```json5
// openclaw.json
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw", // must match the plugin's registered engine id
    },
    entries: {
      "lossless-claw": {
        enabled: true,
        // Plugin-specific config goes here (see the plugin's docs)
      },
    },
  },
}
```

Restart the gateway after installing and configuring.

To switch back to the built-in engine, set `contextEngine` to `"legacy"` (or
remove the key entirely — `"legacy"` is the default).

## How it works

Every time OpenClaw runs a model prompt, the context engine participates at
four lifecycle points:

1. **Ingest** — called when a new message is added to the session. The engine
   can store or index the message in its own data store.
2. **Assemble** — called before each model run. The engine returns an ordered
   set of messages (and an optional `systemPromptAddition`) that fit within
   the token budget.
3. **Compact** — called when the context window is full, or when the user runs
   `/compact`. The engine summarizes older history to free space.
4. **After turn** — called after a run completes. The engine can persist state,
   trigger background compaction, or update indexes.

### Subagent lifecycle (optional)

OpenClaw currently calls one subagent lifecycle hook:

- **onSubagentEnded** — clean up when a subagent session completes or is swept.

The `prepareSubagentSpawn` hook is part of the interface for future use, but
the runtime does not invoke it yet.

### System prompt addition

`assemble` 方法可以傳回 `systemPromptAddition` 字串。OpenClaw
會將其加到本次執行的系統提示詞前面。這讓引擎能夠注入
動態的回憶指引、檢索指令或具有情境感知的提示，
而不需要靜態的工作區檔案。

## 舊版引擎

內建的 `legacy` 引擎保留了 OpenClaw 的原始行為：

- **Ingest**（擷取）：無操作（會話管理器直接處理訊息持久化）。
- **Assemble**（組裝）：直通（執行時現有的 sanitize → validate → limit 管線
  處理內容組裝）。
- **Compact**（壓縮）：委派給內建的摘要壓縮，該功能會建立
  舊訊息的單一摘要並保留最近的訊息不變。
- **After turn**（回合後）：無操作。

舊版引擎不會註冊工具或提供 `systemPromptAddition`。

當未設定 `plugins.slots.contextEngine` 時（或設為 `"legacy"`），系統
會自動使用此引擎。

## 外掛引擎

外掛可以使用外掛 API 註冊內容引擎：

```ts
export default function register(api) {
  api.registerContextEngine("my-engine", () => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: "Use lcm_grep to search history...",
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },
  }));
}
```

然後在設定中啟用它：

```json5
{
  plugins: {
    slots: {
      contextEngine: "my-engine",
    },
    entries: {
      "my-engine": {
        enabled: true,
      },
    },
  },
}
```

### ContextEngine 介面

必要成員：

| 成員               | 種類 | 用途                                        |
| ------------------ | ---- | ------------------------------------------- |
| `info`             | 屬性 | 引擎 ID、名稱、版本，以及是否擁有壓縮功能   |
| `ingest(params)`   | 方法 | 儲存單一訊息                                |
| `assemble(params)` | 方法 | 為模型執行建立內容（傳回 `AssembleResult`） |
| `compact(params)`  | 方法 | 摘要/縮減內容                               |

`assemble` 會傳回一個 `AssembleResult`，其中包含：

- `messages` — 要傳送給模型的已排序訊息。
- `estimatedTokens`（必要，`number`） — 引擎對
  已組裝內容的總 Token 數估算值。OpenClaw 使用此值進行壓縮閾值
  決策和診斷報告。
- `systemPromptAddition`（選用，`string`） — 加到系統提示詞前面。

選用成員：

| 成員                           | 種類 | 用途                                                                       |
| ------------------------------ | ---- | -------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 初始化會話的引擎狀態。當引擎首次看到會話時呼叫一次（例如，匯入歷史記錄）。 |
| `ingestBatch(params)`          | 方法 | 以批次方式擷取已完成的回合。在執行完成後呼叫，一次包含該回合的所有訊息。   |
| `afterTurn(params)`            | 方法 | 執行後的生命週期工作（保存狀態、觸發背景壓縮）。                           |
| `prepareSubagentSpawn(params)` | 方法 | 為子階段設定共享狀態。                                                     |
| `onSubagentEnded(params)`      | 方法 | 子代理結束後進行清理。                                                     |
| `dispose()`                    | 方法 | 釋放資源。在閘道關機或外掛重新載入期間呼叫——並非針對每個階段。             |

### ownsCompaction

`ownsCompaction` 控制是否在執行期間保持啟用 Pi 內建的嘗試內自動壓縮：

- `true` — 引擎擁有壓縮行為。OpenClaw 會停用該次執行的 Pi 內建自動壓縮，並由引擎的 `compact()` 實作負責 `/compact`、溢出恢復壓縮，以及任何想要在 `afterTurn()` 中進行的主動壓縮。
- `false` 或未設定 — Pi 的內建自動壓縮可能仍會在提示執行期間執行，但仍會呼叫現用引擎的 `compact()` 方法來進行 `/compact` 和溢出恢復。

`ownsCompaction: false` 並**不**代表 OpenClaw 會自動回退到舊版引擎的壓縮路徑。

這意味著有兩種有效的外掛模式：

- **擁有模式** — 實作您自己的壓縮演算法並設定 `ownsCompaction: true`。
- **委派模式** — 設定 `ownsCompaction: false` 並讓 `compact()` 呼叫 `delegateCompactionToRuntime(...)` (來自 `openclaw/plugin-sdk/core`) 以使用 OpenClaw 的內建壓縮行為。

對於現用的非擁有引擎來說，空操作的 `compact()` 是不安全的，因為它會停用該引擎插槽正常的 `/compact` 和溢出恢復壓縮路徑。

## 組態參考

```json5
{
  plugins: {
    slots: {
      // Select the active context engine. Default: "legacy".
      // Set to a plugin id to use a plugin engine.
      contextEngine: "legacy",
    },
  },
}
```

該插槽在執行時是獨佔的 — 針對特定的執行或壓縮操作，只會解析一個已註冊的語境引擎。其他已啟用的 `kind: "context-engine"` 外掛程式仍然可以載入並執行其註冊程式碼；`plugins.slots.contextEngine` 僅負責選擇當 OpenClaw 需要語境引擎時所解析的已註冊引擎 ID。

## 與壓縮和記憶體的關係

- **壓縮** 是語境引擎的職責之一。傳統引擎會委派給 OpenClaw 內建的摘要功能。外掛引擎可以實作任何壓縮策略（DAG 摘要、向量擷取等）。
- **記憶體外掛程式** (`plugins.slots.memory`) 與語境引擎是分開的。記憶體外掛程式提供搜尋/擷取功能；語境引擎則控制模型看到的內容。它們可以協同運作 — 語境引擎可能會在組裝期間使用記憶體外掛程式的資料。
- 無論啟用哪個語境引擎，**階段修剪** (在記憶體中修剪舊的工具結果) 仍會繼續執行。

## 提示

- 使用 `openclaw doctor` 來驗證您的引擎是否正確載入。
- 如果切換引擎，現有的階段會繼續使用其目前的歷程記錄。新的引擎將接管未來的執行。
- 引擎錯誤會被記錄並顯示在診斷資訊中。如果外掛引擎註冊失敗或無法解析選定的引擎 ID，OpenClaw 不會自動回退；執行會失敗，直到您修復外掛程式或將 `plugins.slots.contextEngine` 切換回 `"legacy"` 為止。
- 為了進行開發，請使用 `openclaw plugins install -l ./my-engine` 連結本機外掛程式目錄，而無需複製。

另請參閱：[壓縮](/zh-Hant/concepts/compaction)、[語境](/zh-Hant/concepts/context)、[外掛程式](/zh-Hant/tools/plugin)、[外掛程式清單](/zh-Hant/plugins/manifest)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
