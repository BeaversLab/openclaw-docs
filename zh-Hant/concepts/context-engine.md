---
summary: "Context engine: pluggable context assembly, compaction, and subagent lifecycle"
read_when:
  - You want to understand how OpenClaw assembles model context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
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

安裝和設定後請重新啟動閘道。

若要切換回內建引擎，請將 `contextEngine` 設為 `"legacy"` （或者完全移除該鍵 — `"legacy"` 為預設值）。

## 運作方式

每次 OpenClaw 執行模型提示時，情境引擎會參與四個生命週期點：

1. **攝取** — 當新訊息新增至工作階段時呼叫。引擎可以在其自己的資料存放區中儲存或索引該訊息。
2. **組裝** — 在每次模型執行前呼叫。引擎會傳回一組符合 Token 預算的有序訊息（以及選用的 `systemPromptAddition`）。
3. **壓縮** — 當情境視窗已滿或使用者執行 `/compact` 時呼叫。引擎會摘要較舊的歷史記錄以釋放空間。
4. **回合結束後 (After turn)** — 在運行完成後呼叫。引擎可以保存狀態、
   觸發背景壓縮，或更新索引。

### 子代理生命週期（選用）

OpenClaw 目前會呼叫一個子代理生命週期掛鉤：

- **onSubagentEnded** — 當子代理工作階段完成或被清除時進行清理。

`prepareSubagentSpawn` 掛鉤是介面的一部分供未來使用，但
執行時尚不會呼叫它。

### 系統提示詞新增

`assemble` 方法可以傳回 `systemPromptAddition` 字串。OpenClaw
會將此字串前置於該次執行的系統提示詞。這讓引擎能夠注入
動態回憶指引、檢索指示或情境感知提示，而無需靜態的工作區檔案。

## 舊版引擎

內建的 `legacy` 引擎保留了 OpenClaw 的原始行為：

- **Ingest**：無操作（session manager 直接處理訊息持久化）。
- **Assemble**：直通（runtime 中現有的 sanitize → validate → limit 管線
  處理上下文組裝）。
- **Compact**：委派給內建的摘要壓縮功能，該功能會為舊訊息
  建立單一摘要，並保持最近的訊息不變。
- **After turn**：無操作。

Legacy engine 不註冊工具也不提供 `systemPromptAddition`。

當未設定 `plugins.slots.contextEngine`（或設為 `"legacy"`）時，會
自動使用此引擎。

## 外掛引擎

外掛可以使用外掛 API 註冊 context engine：

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

| 成員               | 種類 | 用途                                                  |
| ------------------ | ---- | ----------------------------------------------------- |
| `info`             | 屬性 | Engine id、名稱、版本，以及它是否擁有壓縮功能的控制權 |
| `ingest(params)`   | 方法 | 儲存單一訊息                                          |
| `assemble(params)` | 方法 | 建構模型執行的上下文（傳回 `AssembleResult`）         |
| `compact(params)`  | 方法 | 摘要/減少上下文                                       |

`assemble` 傳回包含以下內容的 `AssembleResult`：

- `messages` — 傳送給模型的已排序訊息。
- `estimatedTokens`（必填，`number`） — 引擎對組裝
  上下文中總 token 的估算值。OpenClaw 會將此用於壓縮閾值
  決策和診斷報告。
- `systemPromptAddition`（選填，`string`） — 預先附加到系統提示詞。

選用成員：

| 成員                           | 種類 | 目的                                                                               |
| ------------------------------ | ---- | ---------------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 初始化工作階段的引擎狀態。當引擎首次看到工作階段時（例如匯入歷史記錄）會呼叫一次。 |
| `ingestBatch(params)`          | 方法 | 將完成的回合作為批次擷取。在執行完成後呼叫，一次包含該回合的所有訊息。             |
| `afterTurn(params)`            | 方法 | 執行後的生命週期工作（持續化狀態、觸發背景壓縮）。                                 |
| `prepareSubagentSpawn(params)` | 方法 | 為子工作階段設定共享狀態。                                                         |
| `onSubagentEnded(params)`      | 方法 | 在子代理結束後進行清理。                                                           |
| `dispose()`                    | 方法 | 釋放資源。在閘道關閉或外掛程式重新載入期間呼叫 — 而非針對每個工作階段。            |

### ownsCompaction

`ownsCompaction` 控制在執行期間是否保持啟用 Pi 內建嘗試中自動壓縮：

- `true` — 引擎擁有壓縮行為。OpenClaw 會停用 Pi 內建的
  自動壓縮功能以進行該次執行，並且引擎的 `compact()` 實作負責
  `/compact`、溢位復原壓縮，以及其想要在 `afterTurn()` 中執行的任何主動壓縮。
- `false` 或未設定 — Pi 的內建自動壓縮仍可能在提示詞執行期間運作，
  但仍會呼叫作用中引擎的 `compact()` 方法來進行
  `/compact` 和溢位復原。

`ownsCompaction: false` 並**不**意味著 OpenClaw 會自動回退到
傳統引擎的壓縮路徑。

這意味著有兩種有效的外掛模式：

- **擁有模式** — 實作您自己的壓縮演算法並設定
  `ownsCompaction: true`。
- **委派模式** — 設定 `ownsCompaction: false` 並讓 `compact()` 呼叫
  `delegateCompactionToRuntime(...)` 來自 `openclaw/plugin-sdk/core` 以使用
  OpenClaw 的內建壓縮行為。

一個空操作的 `compact()` 對於一個啟用的非擁有引擎是不安全的，因為它
會停用該引擎插槽正常的 `/compact` 和溢出恢復壓縮路徑。

## 設定參考

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

該插槽在執行時期是互斥的 — 對於給定的執行或壓縮操作，只會解析
一個註冊的上下文引擎。其他已啟用的
`kind: "context-engine"` 外掛程式仍然可以載入並執行其註冊
程式碼；`plugins.slots.contextEngine` 僅選擇當 OpenClaw 需要
上下文引擎時解析哪個已註冊的引擎 ID。

## 與壓縮和記憶體的關係

- **壓縮** 是語境引擎的職責之一。舊版引擎
  委託給 OpenClaw 內建的摘要功能。外掛引擎可以實作
  任何壓縮策略（DAG 摘要、向量檢索等）。
- **記憶外掛** (`plugins.slots.memory`) 與語境引擎是分開的。
  記憶外掛提供搜尋/檢索功能；語境引擎則控制模型
  看到的內容。它們可以協同工作 —— 語境引擎可能會在組裝過程中使用
  記憶外掛的資料。
- **工作階段修剪** (在記憶體中修剪舊的工具結果) 無論
  啟用哪個語境引擎都會持續執行。

## 提示

- 使用 `openclaw doctor` 來驗證您的引擎是否正確載入。
- 如果切換引擎，現有工作階段會繼續使用其目前的歷史記錄。
  新的引擎將接手未來的執行。
- 引擎錯誤會被記錄下來並顯示在診斷資訊中。如果外掛引擎註冊失敗，或無法解析選定的引擎 ID，OpenClaw 不會自動回退；執行作業會失敗，直到您修復外掛或將 `plugins.slots.contextEngine` 切換回 `"legacy"` 為止。
- 若是為了開發，請使用 `openclaw plugins install -l ./my-engine` 來連結本機外掛目錄，而不需複製檔案。

另請參閱：[Compaction](/zh-Hant/concepts/compaction)、[Context](/zh-Hant/concepts/context)、[Plugins](/zh-Hant/tools/plugin)、[Plugin manifest](/zh-Hant/plugins/manifest)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
