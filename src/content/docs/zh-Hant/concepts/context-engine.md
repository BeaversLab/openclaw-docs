---
summary: "Context engine: pluggable context assembly, compaction, and subagent lifecycle"
read_when:
  - You want to understand how OpenClaw assembles model context
  - You are switching between the legacy engine and a plugin engine
  - You are building a context engine plugin
title: "Context engine"
sidebarTitle: "Context engine"
---

**Context engine** 控制 OpenClaw 如何為每次執行建構模型上下文：包括包含哪些訊息、如何摘要較早的歷史紀錄，以及如何管理跨子代理程式邊界的上下文。

OpenClaw 內建 `legacy` 引擎並預設使用它 —— 大多數使用者從不需要變更此設定。只有在您需要不同的組裝、壓縮或跨會話召回行為時，才安裝並選擇外掛引擎。

## Quick start

<Steps>
  <Step title="檢查目前使用的引擎">
    ```bash
    openclaw doctor
    # or inspect config directly:
    cat ~/.openclaw/openclaw.json | jq '.plugins.slots.contextEngine'
    ```
  </Step>
  <Step title="安裝外掛引擎">
    Context engine 外掛的安裝方式與任何其他 OpenClaw 外掛相同。

    <Tabs>
      <Tab title="從 npm">
        ```bash
        openclaw plugins install @martian-engineering/lossless-claw
        ```
      </Tab>
      <Tab title="從本機路徑">
        ```bash
        openclaw plugins install -l ./my-context-engine
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="啟用並選擇引擎">
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

    安裝並設定後，請重新啟動閘道。

  </Step>
  <Step title="切換回舊版引擎（可選）">
    將 `contextEngine` 設定為 `"legacy"`（或完全移除該金鑰 —— 預設值為 `"legacy"`）。
  </Step>
</Steps>

## 運作原理

每次 OpenClaw 執行模型提示時，context engine 會在四個生命週期階段參與：

<AccordionGroup>
  <Accordion title="1. 摂取">當新訊息加入會話時呼叫。引擎可以將訊息儲存或索引到其自己的資料儲存中。</Accordion>
  <Accordion title="2. 組裝">在每次模型執行前呼叫。引擎會傳回一組符合 token 預算的有序訊息（以及選用的 `systemPromptAddition`）。</Accordion>
  <Accordion title="3. 壓縮">當 context window 已滿，或使用者執行 `/compact` 時呼叫。引擎會摘要較早的歷史記錄以釋放空間。</Accordion>
  <Accordion title="4. 回合之後">在執行完成後呼叫。引擎可以保存狀態、觸發背景壓縮或更新索引。</Accordion>
</AccordionGroup>

對於內建的非 ACP Codex 線具，OpenClaw 透過將組裝好的內容投影到 Codex 開發者指令和當前回合提示中，來套用相同的生命週期。Codex 仍然擁有其原生執行緒歷史和原生壓縮器。

### 子代理生命週期（可選）

OpenClaw 會呼叫兩個可選的子代理生命週期鉤子：

<ParamField path="prepareSubagentSpawn" type="method">
  在子執行開始前準備共享上下文狀態。此掛鉤接收父/子會話金鑰、`contextMode`（`isolated` 或 `fork`）、可用的逐字稿 ID/檔案，以及可選的 TTL。如果它返回回滾控制代碼，當準備成功後生成失敗時，OpenClaw 會呼叫它。請求 `lightContext` 並解析為 `contextMode="isolated"` 的原生子代理生成會有意跳過此掛鉤，以便子代理從輕量級引導上下文啟動，而沒有由上下文引擎管理的生成前狀態。
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  當子代理會話完成或被清除時進行清理。
</ParamField>

### 系統提示詞新增

`assemble` 方法可以返回一個 `systemPromptAddition` 字串。OpenClaw 會將此前置於該次執行的系統提示詞。這允許引擎注入動態的召回指引、檢索指令或上下文感知的提示，而無需靜態的工作區檔案。

## 舊版引擎

內建的 `legacy` 引擎保留了 OpenClaw 的原始行為：

- **匯入**：無操作（會話管理員直接處理訊息持久性）。
- **組裝**：傳遞（執行時中的現有清除 → 驗證 → 限制管線會處理內容組裝）。
- **Compact**：委派給內建的摘要壓縮功能，會為舊訊息建立單一摘要並保留近期訊息不變。
- **After turn**：無操作。

舊版引擎不註冊工具，也不提供 `systemPromptAddition`。

當未設定 `plugins.slots.contextEngine` 時（或設定為 `"legacy"`），會自動使用此引擎。

## 外掛引擎

外掛可以使用外掛 API 註冊上下文引擎：

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

export default function register(api) {
  api.registerContextEngine("my-engine", (ctx) => ({
    info: {
      id: "my-engine",
      name: "My Context Engine",
      ownsCompaction: true,
    },

    async ingest({ sessionId, message, isHeartbeat }) {
      // Store the message in your data store
      return { ingested: true };
    },

    async assemble({ sessionId, messages, tokenBudget, availableTools, citationsMode }) {
      // Return messages that fit the budget
      return {
        messages: buildContext(messages, tokenBudget),
        estimatedTokens: countTokens(messages),
        systemPromptAddition: buildMemorySystemPromptAddition({
          availableTools: availableTools ?? new Set(),
          citationsMode,
        }),
      };
    },

    async compact({ sessionId, force }) {
      // Summarize older context
      return { ok: true, compacted: true };
    },
  }));
}
```

工廠 `ctx` 包含可選的 `config`、`agentDir` 和 `workspaceDir`
值，因此外掛程式可以在第一個生命週期掛鉤執行之前初始化每個代理或每個工作區的狀態。

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

| 成員               | 類型 | 用途                                          |
| ------------------ | ---- | --------------------------------------------- |
| `info`             | 屬性 | 引擎 ID、名稱、版本以及它是否擁有壓縮權       |
| `ingest(params)`   | 方法 | 儲存單一訊息                                  |
| `assemble(params)` | 方法 | 為模型執行建構上下文（返回 `AssembleResult`） |
| `compact(params)`  | 方法 | 摘要/減少上下文                               |

`assemble` 返回一個 `AssembleResult`，其中包含：

<ParamField path="messages" type="Message[]" required>
  傳送給模型的有序訊息。
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  引擎對組裝後內容中總 Token 數的估計。OpenClaw 將其用於壓縮閾值決策和診斷報告。
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  前置於系統提示詞。
</ParamField>
<ParamField path="promptAuthority" type='"assembled" | "preassembly_may_overflow"'>
  控制執行器在預防性溢位預檢時使用哪個 Token 估計值。預設為 `"assembled"`，這表示僅檢查組裝後提示詞的估計值——適用於返回視窗化、自包含內容的引擎。僅當您的組裝視圖可能掩蓋底層逐字稿中的溢位風險時，才將其設定為 `"preassembly_may_overflow"`；此時執行器在決定是否預防性壓縮時，將取組裝後估計值與組裝前（非視窗化）會話歷史估計值中的最大值。無論哪種方式，您返回的訊息仍然是模型看到的內容——`promptAuthority`
  僅影響預檢。
</ParamField>

`compact` 返回一個 `CompactResult`。當壓縮輪換活動逐字稿時，`result.sessionId` 和 `result.sessionFile` 會標識下一次重試或回合必須使用的後續會話。

選用成員：

| 成員                           | 種類 | 用途                                                                                     |
| ------------------------------ | ---- | ---------------------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 初始化 session 的引擎狀態。在引擎第一次看到 session 時呼叫一次（例如，匯入歷史記錄時）。 |
| `ingestBatch(params)`          | 方法 | 以批次方式擷取已完成的回合。在執行完成後呼叫，一次傳入該回合的所有訊息。                 |
| `afterTurn(params)`            | 方法 | 執行後的生命週期工作（保存狀態、觸發背景壓縮）。                                         |
| `prepareSubagentSpawn(params)` | 方法 | 在子 session 啟動之前設定共用的狀態。                                                    |
| `onSubagentEnded(params)`      | 方法 | 在子代理結束後進行清理。                                                                 |
| `dispose()`                    | 方法 | 釋放資源。在閘道關閉或外掛程式重新載入期間呼叫——而非針對每個 session。                   |

### 主機需求

內容引擎可以在 `info.hostRequirements` 上宣告主機功能需求。
OpenClaw 會在開始操作前檢查這些需求，如果選定的執行時無法滿足需求，則會以描述性錯誤訊息失敗關閉。

對於 Agent 執行，當引擎必須透過 `assemble()` 控制實際的模型提示詞時，請宣告 `assemble-before-prompt`：

```ts
info: {
  id: "my-context-engine",
  name: "My Context Engine",
  hostRequirements: {
    "agent-run": {
      requiredCapabilities: ["assemble-before-prompt"],
      unsupportedMessage:
        "Use the native Codex or OpenClaw embedded runtime, or select the legacy context engine.",
    },
  },
}
```

原生 Codex 和 OpenClaw 嵌入式代理執行滿足 `assemble-before-prompt`。
通用 CLI 後端則不滿足，因此在 CLI 程序啟動之前，需要該功能的引擎將會被拒絕。

### 故障隔離

OpenClaw 將選定的外掛引擎與核心回覆路徑隔離開來。如果非舊版引擎缺失、未通過合約驗證、在工廠建立期間拋出錯誤，或在生命週期方法中拋出錯誤，OpenClaw 將在當前 Gateway 程序中隔離該引擎，並將上下文引擎工作降級至內建的 `legacy` 引擎。錯誤會隨著失敗的操作一起被記錄下來，以便操作員修復、更新或停用外掛，而不會導致代理靜默無聲。

主機需求失敗的情況則有所不同：當引擎聲明運行時缺乏所需能力時，OpenClaw 會在開始運行之前以關閉失敗的方式處理。這可以保護那些在不支援的主機上運行會破壞狀態的引擎。

### ownsCompaction

`ownsCompaction` 控制著 OpenClaw 執行時內建的在嘗試中的自動壓縮是否在執行期間保持啟用：

<AccordionGroup>
  <Accordion title="ownsCompaction: true">引擎擁有壓縮行為。OpenClaw 會在該次執行中停用 OpenClaw 執行時內建的自動壓縮，並由引擎的 `compact()` 實作負責 `/compact`、溢出恢復壓縮，以及它想要在 `afterTurn()` 中進行的任何主動壓縮。OpenClaw 仍可能執行提示詞前的溢出安全防護；當它預測完整的對話記錄將會溢出時，恢復路徑會在提交另一個提示詞之前呼叫現用引擎的 `compact()`。</Accordion>
  <Accordion title="ownsCompaction: false or unset">OpenClaw 執行時內建的自動壓縮仍可能會在提示詞執行期間執行，但現用引擎的 `compact()` 方法仍會被呼叫以進行 `/compact` 和溢出恢復。</Accordion>
</AccordionGroup>

<Warning>`ownsCompaction: false` 並**不**意味著 OpenClaw 會自動回退到舊版引擎的壓縮路徑。</Warning>

這意味著有兩種有效的外掛程式模式：

<Tabs>
  <Tab title="Owning mode">實作您自己的壓縮演算法並設定 `ownsCompaction: true`。</Tab>
  <Tab title="委派模式">設定 `ownsCompaction: false` 並讓 `compact()` 從 `openclaw/plugin-sdk/core` 呼叫 `delegateCompactionToRuntime(...)`，以使用 OpenClaw 內建的壓縮行為。</Tab>
</Tabs>

對於啟用的非自有引擎，無操作的 `compact()` 是不安全的，因為它會停用該引擎插槽的正常 `/compact` 和溢位恢復壓縮路徑。

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

<Note>該插槽在執行時期是獨佔的 - 對於給定的執行或壓縮操作，只會解析一個已註冊的內容引擎。其他已啟用的 `kind: "context-engine"` 外掛程式仍然可以載入並執行其註冊程式碼；`plugins.slots.contextEngine` 僅在 OpenClaw 需要內容引擎時選擇要解析哪個已註冊的引擎 ID。</Note>

<Note>**外掛程式解除安裝：** 當您解除安裝目前選取為 `plugins.slots.contextEngine` 的外掛程式時，OpenClaw 會將該插槽重設回預設值 (`legacy`)。相同的重設行為也適用於 `plugins.slots.memory`。無需手動編輯設定。</Note>

## 與壓縮和記憶體的關係

<AccordionGroup>
  <Accordion title="壓縮">壓縮是上下文引擎的職責之一。舊版引擎會委派給 OpenClaw 的內建摘要。外掛引擎可以實作任何壓縮策略（DAG 摘要、向量檢索等）。</Accordion>
  <Accordion title="記憶體外掛程式">
    記憶體外掛程式 (`plugins.slots.memory`) 與內容引擎是分開的。記憶體外掛程式提供搜尋/檢索功能；內容引擎則控制模型看到的內容。它們可以協同工作 - 內容引擎可能會在組裝期間使用記憶體外掛程式的資料。如果外掛程式引擎想要使用現有的記憶體提示路徑，應優先使用 `openclaw/plugin-sdk/core` 中的 `buildMemorySystemPromptAddition(...)`，它會將現有的記憶體提示區段轉換為準備好 prepended 的
    `systemPromptAddition`。如果引擎需要更低階的控制，它仍然可以透過 `buildActiveMemoryPromptSection(...)` 從 `openclaw/plugin-sdk/memory-host-core` 提取原始行。
  </Accordion>
  <Accordion title="Session pruning">在記憶體中修剪舊的工具結果仍會繼續執行，無論目前啟用的是哪個情境引擎。</Accordion>
</AccordionGroup>

## 提示

- 使用 `openclaw doctor` 來驗證您的引擎是否正確載入。
- 如果切換引擎，現有的工作階段會以其目前的歷史記錄繼續執行。新的引擎將接管未來的執行。
- 引擎錯誤會被記錄下來，且選定的外掛引擎會在目前的 Gateway 程序中被隔離。OpenClaw 會針對使用者輪次回退至 `legacy`，以便回覆能繼續進行，但您仍應修復、更新、停用或解除安裝損壞的外掛。
- 對於開發，請使用 `openclaw plugins install -l ./my-engine` 來連結本機外掛目錄而不進行複製。

## 相關

- [壓縮](/zh-Hant/concepts/compaction) - 摘要長對話
- [Context](/zh-Hant/concepts/context) - 如何為代理輪次建立內容
- [外掛架構](/zh-Hant/plugins/architecture) - 註冊內容引擎外掛
- [外掛清單](/zh-Hant/plugins/manifest) - 外掛清單欄位
- [外掛](/zh-Hant/tools/plugin) - 外掛概覽
