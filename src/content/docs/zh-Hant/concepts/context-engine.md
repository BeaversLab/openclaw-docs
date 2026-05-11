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

OpenClaw 內建 `legacy` 引擎並預設使用 — 大多數使用者不需要變更此設定。僅在您需要不同的組裝、壓縮或跨會話召回行為時，才安裝並選擇外掛引擎。

## Quick start

<Steps>
  <Step title="檢查作用中的引擎">
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
  <Step title="切換回舊版（選用）">
    將 `contextEngine` 設定為 `"legacy"`（或完全移除該金鑰 — `"legacy"` 為預設值）。
  </Step>
</Steps>

## 運作原理

每次 OpenClaw 執行模型提示時，context engine 會在四個生命週期階段參與：

<AccordionGroup>
  <Accordion title="1. 摄取">當新訊息加入會話時被呼叫。引擎可以在其自己的資料存放區中儲存或索引訊息。</Accordion>
  <Accordion title="2. 組裝">在每次模型運行之前呼叫。引擎會傳回一組符合 token 預算的有序訊息（以及可選的 `systemPromptAddition`）。</Accordion>
  <Accordion title="3. 壓縮">當內容視窗已滿，或使用者執行 `/compact` 時呼叫。引擎會摘要較舊的歷史記錄以釋放空間。</Accordion>
  <Accordion title="4. 回合後">在執行完成後呼叫。引擎可以保存狀態、觸發背景壓縮，或更新索引。</Accordion>
</AccordionGroup>

對於內建的非 ACP Codex 線具，OpenClaw 透過將組裝好的內容投影到 Codex 開發者指令和當前回合提示中，來套用相同的生命週期。Codex 仍然擁有其原生執行緒歷史和原生壓縮器。

### 子代理生命週期（可選）

OpenClaw 會呼叫兩個可選的子代理生命週期鉤子：

<ParamField path="prepareSubagentSpawn" type="method">
  在子執行開始前準備共享內容狀態。該鉤子會接收父/子會話金鑰、`contextMode`（`isolated` 或 `fork`）、可用的逐字稿 ID/檔案，以及可選的 TTL。如果它傳回一個還原控制代碼，OpenClaw 會在準備成功後產生失敗時呼叫它。
</ParamField>
<ParamField path="onSubagentEnded" type="method">
  當子代理會話完成或被清除時進行清理。
</ParamField>

### 系統提示詞新增

`assemble` 方法可以傳回一個 `systemPromptAddition` 字串。OpenClaw 會將其前置到該次執行的系統提示詞中。這允許引擎注入動態回憶指引、檢索指令或內容感知提示，而不需要靜態的工作區檔案。

## 舊版引擎

內建的 `legacy` 引擎保留了 OpenClaw 的原始行為：

- **匯入**：無操作（會話管理員直接處理訊息持久性）。
- **組裝**：傳遞（執行時中的現有清除 → 驗證 → 限制管線會處理內容組裝）。
- **Compact**：委派給內建的摘要壓縮功能，會為舊訊息建立單一摘要並保留近期訊息不變。
- **After turn**：無操作。

舊版引擎不註冊工具也不提供 `systemPromptAddition`。

當未設定 `plugins.slots.contextEngine` 時（或設為 `"legacy"`），會自動使用此引擎。

## 外掛引擎

外掛可以使用外掛 API 註冊上下文引擎：

```ts
import { buildMemorySystemPromptAddition } from "openclaw/plugin-sdk/core";

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
| `info`             | 屬性 | 引擎 ID、名稱、版本，以及是否擁有壓縮功能     |
| `ingest(params)`   | 方法 | 儲存單一訊息                                  |
| `assemble(params)` | 方法 | 為模型執行建立上下文（傳回 `AssembleResult`） |
| `compact(params)`  | 方法 | 摘要/精簡上下文                               |

`assemble` 會傳回一個 `AssembleResult`，其中包含：

<ParamField path="messages" type="Message[]" required>
  要傳送給模型的有序訊息。
</ParamField>
<ParamField path="estimatedTokens" type="number" required>
  引擎對組裝後上下文中總 Token 數的預估值。OpenClaw 將其用於壓縮閾值決策和診斷報告。
</ParamField>
<ParamField path="systemPromptAddition" type="string">
  前置於系統提示詞。
</ParamField>

`compact` 會傳回一個 `CompactResult`。當壓縮輪換目前的
紀錄時，`result.sessionId` 和 `result.sessionFile` 會識別
後續重試或回合必須使用的後續工作階段。

選用成員：

| 成員                           | 類型 | 用途                                                                               |
| ------------------------------ | ---- | ---------------------------------------------------------------------------------- |
| `bootstrap(params)`            | 方法 | 初始化工作階段的引擎狀態。在引擎首次看到工作階段時呼叫一次（例如，匯入歷史紀錄）。 |
| `ingestBatch(params)`          | 方法 | 將完成的回合作為批次擷取。在執行完成後呼叫，一次包含該回合的所有訊息。             |
| `afterTurn(params)`            | 方法 | 執行後生命週期工作（保存狀態、觸發背景壓縮）。                                     |
| `prepareSubagentSpawn(params)` | 方法 | 在子會話開始之前為其設定共享狀態。                                                 |
| `onSubagentEnded(params)`      | 方法 | 在子代理結束後進行清理。                                                           |
| `dispose()`                    | 方法 | 釋放資源。在關機期間或插件重新載入時呼叫 — 而非針對每個會話。                      |

### ownsCompaction

`ownsCompaction` 控制針對該次執行，Pi 內建的自動嘗試內壓縮 是否保持啟用：

<AccordionGroup>
  <Accordion title="ownsCompaction: true">引擎擁有壓縮行為。OpenClaw 會針對該次執行停用 Pi 的內建自動壓縮，且引擎的 `compact()` 實作需負責 `/compact`、溢位恢復壓縮，以及任何它想要在 `afterTurn()` 中執行的主動壓縮。OpenClaw 可能仍會執行提示前的溢位防護機制；當它預測完整的對話紀錄將會溢位時，恢復路徑會在提交另一個提示之前呼叫目前引擎的 `compact()`。</Accordion>
  <Accordion title="ownsCompaction: false or unset">Pi 的內建自動壓縮仍可能在提示執行期間執行，但目前引擎的 `compact()` 方法仍會被呼叫以進行 `/compact` 和溢位恢復。</Accordion>
</AccordionGroup>

<Warning>`ownsCompaction: false` 並**不**代表 OpenClaw 會自動回退至舊版引擎的壓縮路徑。</Warning>

這代表有兩種有效的插件模式：

<Tabs>
  <Tab title="Owning mode">實作您自己的壓縮演算法並設定 `ownsCompaction: true`。</Tab>
  <Tab title="Delegating mode">設定 `ownsCompaction: false` 並讓 `compact()` 呼叫 `openclaw/plugin-sdk/core` 中的 `delegateCompactionToRuntime(...)`，以使用 OpenClaw 的內建壓縮行為。</Tab>
</Tabs>

對於一個活躍的非擁有引擎來說，無操作 的 `compact()` 是不安全的，因為它會停用該引擎位置正常的 `/compact` 和溢位恢復壓縮路徑。

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

<Note>此插槽在執行時間是獨佔的 —— 對於給定的執行或壓縮操作，只會解析一個已註冊的上下文引擎。其他已啟用的 `kind: "context-engine"` 外掛程式仍可載入並執行其註冊程式碼；`plugins.slots.contextEngine` 僅選擇當 OpenClaw 需要上下文引擎時解析哪一個已註冊的引擎 ID。</Note>

<Note>**外掛程式解除安裝：** 當您解除安裝目前選為 `plugins.slots.contextEngine` 的外掛程式時，OpenClaw 會將該插槽重設回預設值 (`legacy`)。同樣的重設行為也適用於 `plugins.slots.memory`。無需手動編輯配置。</Note>

## 與壓縮和記憶體的關係

<AccordionGroup>
  <Accordion title="壓縮">壓縮是上下文引擎的職責之一。舊版引擎委派給 OpenClaw 的內建摘要功能。外掛引擎可以實作任何壓縮策略（DAG 摘要、向量擷取等）。</Accordion>
  <Accordion title="記憶體外掛程式">
    記憶體外掛程式 (`plugins.slots.memory`) 與上下文引擎是分開的。記憶體外掛程式提供搜尋/擷取功能；上下文引擎控制模型看到的內容。它們可以協同工作 —— 上下文引擎可以在組裝期間使用記憶體外掛程式的資料。想要使用作用中記憶體提示路徑的外掛引擎應優先使用 `openclaw/plugin-sdk/core` 中的 `buildMemorySystemPromptAddition(...)`，它會將作用中記憶體提示區段轉換為準備好預置的
    `systemPromptAddition`。如果引擎需要更低層級的控制，它仍然可以透過 `buildActiveMemoryPromptSection(...)` 從 `openclaw/plugin-sdk/memory-host-core` 拉取原始行。
  </Accordion>
  <Accordion title="Session 修剪">無論哪個上下文引擎處於作用狀態，在記憶體中修剪舊工具結果的作業仍會繼續執行。</Accordion>
</AccordionGroup>

## 提示

- 使用 `openclaw doctor` 來驗證您的引擎是否正確載入。
- 如果切換引擎，現有的會話會繼續使用其目前的歷史記錄。新引擎將接管未來的執行。
- 引擎錯誤會被記錄並顯示在診斷資訊中。如果外掛引擎註冊失敗，或無法解析所選的引擎 ID，OpenClaw 不會自動回退；在您修復外掛或將 `plugins.slots.contextEngine` 切換回 `"legacy"` 之前，運行將會失敗。
- 若為了開發，請使用 `openclaw plugins install -l ./my-engine` 連結本機外掛目錄，而無需複製。

## 相關內容

- [壓縮](/zh-Hant/concepts/compaction) — 總結長對話
- [語境](/zh-Hant/concepts/context) — 如何為代理回合建立語境
- [外掛架構](/zh-Hant/plugins/architecture) — 註冊語境引擎外掛
- [外掛清單](/zh-Hant/plugins/manifest) — 外掛清單欄位
- [外掛](/zh-Hant/tools/plugin) — 外掛概覽
