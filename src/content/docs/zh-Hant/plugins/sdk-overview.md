---
summary: "匯入映射、註冊 API 參考以及 SDK 架構"
title: "Plugin SDK 概覽"
sidebarTitle: "Plugin SDK 概覽"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

Plugin SDK 是外掛與核心之間的類型合約。本頁面提供關於 **要匯入什麼** 以及 **您可以註冊什麼** 的參考。

<Note>本頁面適用於在 OpenClaw 內部使用 `openclaw/plugin-sdk/*` 的外掛作者。對於希望透過 Gateway 執行代理程式的外部應用程式、腳本、儀表板、CI 作業和 IDE 擴充功能，請改用 [OpenClaw App SDK](/zh-Hant/concepts/openclaw-sdk) 和 `@openclaw/sdk` 套件。</Note>

<Tip>您在尋找操作指南嗎？請從 [建置外掛](/zh-Hant/plugins/building-plugins) 開始，針對通道外掛請使用 [通道外掛](/zh-Hant/plugins/sdk-channel-plugins)，針對提供者外掛請使用 [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins)，針對本機 AI CLI 後端請使用 [CLI 後端外掛](/zh-Hant/plugins/cli-backend-plugins)，而針對工具或生命週期掛鉤外掛則請使用 [外掛掛鉤](/zh-Hant/plugins/hooks)。</Tip>

## 匯入慣例

請務必從特定的子路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每個子路徑都是一個小型的獨立模組。這能保持啟動速度快，並防止循環依賴問題。對於特定通道的進入點/建置輔助程式，建議優先使用 `openclaw/plugin-sdk/channel-core`；將 `openclaw/plugin-sdk/core` 用於更廣泛的整體介面和共享輔助程式，例如 `buildChannelConfigSchema`。

對於通道配置，請透過 `openclaw.plugin.json#channelConfigs` 發布通道擁有的 JSON Schema。`plugin-sdk/channel-config-schema` 子路徑用於共享的 Schema 基本型別和通用建構器。OpenClaw 的捆綁外掛使用 `plugin-sdk/bundled-channel-config-schema` 來保留捆綁通道的 Schema。已棄用的相容性匯出保留在 `plugin-sdk/channel-config-schema-legacy` 上；這兩個捆綁 Schema 子路徑都不是新外掛應採用的模式。

<Warning>
  請勿匯入提供者或通道品牌的便利縫合層（例如
  `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`）。
  捆綁插件在其自身的 `api.ts` /
  `runtime-api.ts` 匯出桶內組合通用 SDK 子路徑；核心消費者應使用這些插件本地的匯出桶，或在需求真正跨通道時添加狹窄的通用 SDK 契約。

一小部分捆綁插件輔助縫合層在具有追蹤的擁有者使用情況下，仍會出現在生成的匯出對應表中。它們僅存在於捆綁插件的維護用途，不建議新的第三方插件將其作為匯入路徑。

`openclaw/plugin-sdk/discord` 和 `openclaw/plugin-sdk/telegram-account` 也作為已棄用的相容性外觀保留，供追蹤的擁有者使用。請勿將這些匯入路徑複製到新插件中；請改用注入的執行時輔助程式和通用通道 SDK 子路徑。

</Warning>

## 子路徑參考

插件 SDK 以一組按區域分組的狹窄子路徑公開（插件入口、通道、提供者、驗證、執行時、功能、記憶體和保留的捆綁插件輔助程式）。如需完整的目錄（已分組並連結），請參閱[插件 SDK 子路徑](/zh-Hant/plugins/sdk-subpaths)。

生成的 200 多個子路徑清單位於 `scripts/lib/plugin-sdk-entrypoints.json` 中。

## 註冊 API

`register(api)` 回呼會接收一個包含這些方法的 `OpenClawPluginApi` 物件：

### 功能註冊

| 方法                                             | 註冊內容                 |
| ------------------------------------------------ | ------------------------ |
| `api.registerProvider(...)`                      | 文字推斷 (LLM)           |
| `api.registerAgentHarness(...)`                  | 實驗性低階代理程式執行器 |
| `api.registerCliBackend(...)`                    | 本機 CLI 推斷後端        |
| `api.registerChannel(...)`                       | 訊息傳遞通道             |
| `api.registerSpeechProvider(...)`                | 文字轉語音 / STT 合成    |
| `api.registerRealtimeTranscriptionProvider(...)` | 串流即時轉錄             |
| `api.registerRealtimeVoiceProvider(...)`         | 雙向即時語音工作階段     |
| `api.registerMediaUnderstandingProvider(...)`    | 影像/音訊/影片分析       |
| `api.registerImageGenerationProvider(...)`       | 影像生成                 |
| `api.registerMusicGenerationProvider(...)`       | 音樂生成                 |
| `api.registerVideoGenerationProvider(...)`       | 影片生成                 |
| `api.registerWebFetchProvider(...)`              | Web 抓取 / 擷取提供者    |
| `api.registerWebSearchProvider(...)`             | Web 搜尋                 |

### 工具和指令

| 方法                            | 註冊內容                                  |
| ------------------------------- | ----------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具（必要或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自訂指令（繞過 LLM）                      |

當 Agent 需要簡短的、指令擁有的路由提示時，外掛指令可以設定 `agentPromptGuidance`。請讓該文字保持關於指令本身；請勿將提供者或外掛特定的原則新增至核心提示建構器。

### 基礎架構

| 方法                                           | 註冊內容                          |
| ---------------------------------------------- | --------------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件掛鉤                          |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端點                 |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法                  |
| `api.registerGatewayDiscoveryService(service)` | 本機 Gateway 探索廣告程式         |
| `api.registerCli(registrar, opts?)`            | CLI 子指令                        |
| `api.registerNodeCliFeature(registrar, opts?)` | `openclaw nodes` 下的節點功能 CLI |
| `api.registerService(service)`                 | 背景服務                          |
| `api.registerInteractiveHandler(registration)` | 互動式處理程式                    |
| `api.registerAgentToolResultMiddleware(...)`   | 執行階段工具結果中介軟體          |
| `api.registerMemoryPromptSupplement(builder)`  | 新增記憶體相鄰提示區段            |
| `api.registerMemoryCorpusSupplement(adapter)`  | 新增記憶體搜尋/讀取語料庫         |

### 工作流程外掛的主機掛鉤

主機掛鉤是外掛的 SDK 介面，適用於需要參與主機生命週期，而不僅僅是新增提供者、通道或工具的外掛。它們是通用契約；計畫模式可以使用它們，但審核工作流程、工作區原則閘道、背景監視器、設定精靈和 UI 伴隨外掛也可以使用它們。

| 方法                                                                     | 擁有的契約                                                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `api.registerSessionExtension(...)`                                      | 透過 Gateway 會話投射的外掛擁有、JSON 相容會話狀態                                                            |
| `api.enqueueNextTurnInjection(...)`                                      | 針對單一會話注入至下一個 Agent 輪次的持久化僅執行一次背景                                                     |
| `api.registerTrustedToolPolicy(...)`                                     | 可封鎖或重寫工具參數的配套/受信任外掛前工具原則                                                               |
| `api.registerToolMetadata(...)`                                          | 不變更工具實作的工具目錄顯示中繼資料                                                                          |
| `api.registerCommand(...)`                                               | 範圍限定外掛程式指令；指令結果可以設定 `continueAgent: true`；Discord 原生指令支援 `descriptionLocalizations` |
| `api.registerControlUiDescriptor(...)`                                   | 針對工作階段、工具、執行或設定期面的控制 UI 貢獻描述項                                                        |
| `api.registerRuntimeLifecycle(...)`                                      | 在重置/刪除/重新載入路徑上，針對外掛程式擁有的執行時資源的清理回呼                                            |
| `api.registerAgentEventSubscription(...)`                                | 針對工作流程狀態和監視器的已清理事件訂閱                                                                      |
| `api.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)` | 每次執行的外掛程式暫存狀態，會在最終執行生命週期時被清除                                                      |
| `api.registerSessionSchedulerJob(...)`                                   | 外掛程式擁有的工作階段排程器工作記錄，具有確定性清理                                                          |

合約刻意分割了權限：

- 外部外掛程式可以擁有工作階段擴充、UI 描述項、指令、工具中繼資料、下一輪注入以及一般掛鉤。
- 受信任的工具原則會在一般 `before_tool_call` 掛鉤之前執行，且僅限捆綁發行，因為它們參與主機安全性原則。
- 保留的指令擁有權僅限捆綁發行。外部外掛程式應使用自己的指令名稱或別名。
- `allowPromptInjection=false` 會停用提示詞變異掛鉤，包括 `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution`，來自舊版 `before_agent_start` 的提示詞欄位，以及 `enqueueNextTurnInjection`。

非 Plan 消費者的範例：

| 外掛程式原型        | 使用的掛鉤                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------ |
| 審核工作流程        | 工作階段擴充、指令接續、下一輪注入、UI 描述項                                              |
| 預算/工作區原則閘道 | 受信任的工具原則、工具中繼資料、工作階段投射                                               |
| 背景生命週期監視器  | 執行時生命週期清理、代理程式事件訂閱、工作階段排程器擁有權/清理、心跳提示詞貢獻、UI 描述項 |
| 設定或上架精靈      | 工作階段擴充、範圍限定指令、控制 UI 描述項                                                 |

<Note>保留的核心管理員命名空間 (`config.*`、`exec.approvals.*`、`wizard.*`、 `update.*`) 將始終保持 `operator.admin`，即使外掛程式嘗試指派 更狹隘的 Gateway 方法範圍。對於外掛程式擁有的方法，建議優先使用外掛程式特定的前綴。</Note>

<Accordion title="何時使用工具結果中介軟體">
  當捆綁的外掛程式需要在執行後且執行時將結果回饋給模型之前重寫工具結果時，可以使用 `api.registerAgentToolResultMiddleware(...)`。這是受信任的、與執行時無關的接縫，用於諸如 tokenjuice 之類的非同步輸出縮減器。

捆綁的外掛程式必須為每個目標執行時宣告 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`。外部外掛程式無法註冊此中介軟體；對於不需要模型前工具結果計時的工作，請保留一般的 OpenClaw 外掛程式掛鉤。舊的僅限 Pi 的嵌入式延伸工廠註冊路徑已被移除。

</Accordion>

### Gateway 探索註冊

`api.registerGatewayDiscoveryService(...)` 讓外掛程式能夠在本機探索傳輸（例如 mDNS/Bonjour）上通告
作用中的 Gateway。當啟用本機探索時，OpenClaw 會在 Gateway 啟動期間呼叫此服務，傳遞目前的 Gateway 連接埠和非機密 TXT 提示資料，並在 Gateway 關閉期間呼叫傳回的
`stop` 處理程式。

```typescript
api.registerGatewayDiscoveryService({
  id: "my-discovery",
  async advertise(ctx) {
    const handle = await startMyAdvertiser({
      gatewayPort: ctx.gatewayPort,
      tls: ctx.gatewayTlsEnabled,
      displayName: ctx.machineDisplayName,
    });
    return { stop: () => handle.stop() };
  },
});
```

Gateway 探索外掛程式不得將通告的 TXT 值視為機密或
驗證依據。探索是一個路由提示；Gateway 驗證和 TLS 釘選仍然
擁有信任權。

### CLI 註冊中繼資料

`api.registerCli(registrar, opts?)` 接受兩種指令中繼資料：

- `commands`：由註冊者擁有的明確指令名稱
- `descriptors`：用於 CLI 說明、
  路由和延遲外掛程式 CLI 註冊的剖析時指令描述元
- `parentPath`：用於巢狀指令群組的選用父指令路徑，例如
  `["nodes"]`

對於配對節點功能，請優先使用
`api.registerNodeCliFeature(registrar, opts?)`。它是 `api.registerCli(..., { parentPath: ["nodes"] })` 的小型封裝，並使諸如
`openclaw nodes canvas` 之類的指令成為明確的外掛擁有的節點功能。

如果您希望外掛指令在一般根 CLI 路徑中保持延遲載入，
請提供 `descriptors` 以涵蓋該註冊器公開的每個頂層指令根。

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerMatrixCli } = await import("./src/cli.js");
    registerMatrixCli({ program });
  },
  {
    descriptors: [
      {
        name: "matrix",
        description: "Manage Matrix accounts, verification, devices, and profile state",
        hasSubcommands: true,
      },
    ],
  },
);
```

巢狀指令會將解析後的父指令作為 `program` 接收：

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerNodesCanvasCommands } = await import("./src/cli.js");
    registerNodesCanvasCommands(program);
  },
  {
    parentPath: ["nodes"],
    descriptors: [
      {
        name: "canvas",
        description: "Capture or render canvas content from a paired node",
        hasSubcommands: true,
      },
    ],
  },
);
```

僅在您不需要延遲根 CLI 註冊時，才單獨使用 `commands`。
該積極相容性路徑仍受支援，但它不會安裝
用於解析時延遲載入的描述符支援的佔位符。

### CLI 後端註冊

`api.registerCliBackend(...)` 讓外掛可以擁有本機
AI CLI 後端（例如 `codex-cli`）的預設設定。

- 後端 `id` 會成為模型參考（例如 `codex-cli/gpt-5`）中的提供者前綴。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的形狀。
- 使用者設定仍具有優先權。OpenClaw 會在執行 CLI 之前，將
  `agents.defaults.cliBackends.<id>` 與外掛預設值合併。
- 當後端在合併後需要相容性重寫時
  （例如正規化舊的旗標形狀），請使用 `normalizeConfig`。
- 對於屬於 CLI 方言的請求範圍 argv 重寫（例如將 OpenClaw 思考層級對應到原生 effort 旗標），
  請使用 `resolveExecutionArgs`。

如需端到端撰寫指南，請參閱
[CLI backend plugins](/zh-Hant/plugins/cli-backend-plugins)。

### 獨佔插槽

| 方法                                       | 註冊內容                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次啟用一個）。`assemble()` 回呼會接收 `availableTools` 和 `citationsMode`，以便引擎可以客製化提示詞新增內容。 |
| `api.registerMemoryCapability(capability)` | 統一記憶體能力                                                                                                              |
| `api.registerMemoryPromptSection(builder)` | 記憶體提示詞區段建構器                                                                                                      |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶體清除計畫解析器                                                                                                        |
| `api.registerMemoryRuntime(runtime)`       | 記憶體執行時期配接器                                                                                                        |

### 記憶體嵌入配接器

| 方法                                           | 註冊內容                             |
| ---------------------------------------------- | ------------------------------------ |
| `api.registerMemoryEmbeddingProvider(adapter)` | 目前使用的外掛程式的記憶體嵌入介面卡 |

- `registerMemoryCapability` 是首選的專用記憶體外掛 API。
- `registerMemoryCapability` 也可以公開 `publicArtifacts.listArtifacts(...)`，以便伴隨外掛程式可以透過 `openclaw/plugin-sdk/memory-host-core` 消費匯出的記憶體成品，而無需深入存取特定記憶體外掛程式的私有佈局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和 `registerMemoryRuntime` 是與舊版相容的專用記憶體外掛 API。
- `MemoryFlushPlan.model` 可以將刷新週期釘選到確切的 `provider/model` 參考，例如 `ollama/qwen3:8b`，而不繼承主動後援鏈。
- `registerMemoryEmbeddingProvider` 允許目前使用中的記憶體外掛程式註冊一或多個嵌入介面卡 ID（例如 `openai`、`gemini` 或自訂外掛程式定義的 ID）。
- 使用者設定（例如 `agents.defaults.memorySearch.provider` 和 `agents.defaults.memorySearch.fallback`）會根據這些已註冊的介面卡 ID 進行解析。

### 事件與生命週期

| 方法                                         | 用途                   |
| -------------------------------------------- | ---------------------- |
| `api.on(hookName, handler, opts?)`           | 具有型別的生命週期掛鉤 |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼           |

請參閱 [外掛程式掛鉤](/zh-Hant/plugins/hooks) 以了解範例、常見的掛鉤名稱和守護語意。

### 掛鉤決策語意

- `before_tool_call`：回傳 `{ block: true }` 為終止操作。一旦任何處理程式設定了它，優先順序較低的處理程式將被跳過。
- `before_tool_call`：回傳 `{ block: false }` 被視為不作決定（與省略 `block` 相同），而不是覆寫。
- `before_install`：回傳 `{ block: true }` 為終止操作。一旦任何處理程式設定了它，優先順序較低的處理程式將被跳過。
- `before_install`：回傳 `{ block: false }` 被視為不作決定（與省略 `block` 相同），而不是覆寫。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是終止性的。一旦任何處理器聲明了分派，較低優先級的處理器和預設模型分派路徑將被跳過。
- `message_sending`：返回 `{ cancel: true }` 是終止性的。一旦任何處理器設定了它，較低優先級的處理器將被跳過。
- `message_sending`：返回 `{ cancel: false }` 被視為未做決定（與省略 `cancel` 相同），而不是覆寫。
- `message_received`：當您需要入站線程/主題路由時，請使用類型化的 `threadId` 欄位。將 `metadata` 用於特定於頻道的額外內容。
- `message_sending`：在回退到特定於頻道的 `metadata` 之前，使用類型化的 `replyToId` / `threadId` 路由欄位。
- `gateway_start`：對於閘道擁有的啟動狀態，請使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()`，而不是依賴內部的 `gateway:startup` hooks。
- `cron_changed`：觀察閘道擁有的 cron 生命週期變更。在同步外部喚醒排程器時使用 `event.job?.state?.nextRunAtMs` 和 `ctx.getCron?.()`，並將 OpenClaw 作為到期檢查和執行的唯一事實來源。

### API 物件欄位

| 欄位                     | 類型                      | 描述                                                                |
| ------------------------ | ------------------------- | ------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 外掛程式 ID                                                         |
| `api.name`               | `string`                  | 顯示名稱                                                            |
| `api.version`            | `string?`                 | 外掛程式版本（選用）                                                |
| `api.description`        | `string?`                 | 外掛程式描述（選用）                                                |
| `api.source`             | `string`                  | 外掛程式來源路徑                                                    |
| `api.rootDir`            | `string?`                 | 外掛程式根目錄（選用）                                              |
| `api.config`             | `OpenClawConfig`          | 目前設定快照（可用時為作用中的記憶體內部執行時期快照）              |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的外掛程式特定設定               |
| `api.runtime`            | `PluginRuntime`           | [執行時期輔助程式](/zh-Hant/plugins/sdk-runtime)                         |
| `api.logger`             | `PluginLogger`            | 範圍記錄器 (`debug`、`info`、`warn`、`error`)                       |
| `api.registrationMode`   | `PluginRegistrationMode`  | 目前的載入模式；`"setup-runtime"` 是輕量級的完整進入前啟動/設定視窗 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛程式根目錄的路徑                                      |

## 內部模組慣例

在您的外掛程式內，請使用本地桶狀 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  絕對不要從生產程式碼透過 `openclaw/plugin-sdk/<your-plugin>` 匯入您自己的外掛程式。
  請透過 `./api.ts` 或 `./runtime-api.ts` 路由內部匯入。
  SDK 路徑僅供外部合約使用。
</Warning>

外觀載入的捆綁外掛程式公開介面 (`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 和類似的公開進入檔案) 在 OpenClaw 已執行時，偏好使用作用中的執行時期設定快照。如果執行時期快照尚不存在，它們會退回至磁碟上解析的設定檔。
已封裝的捆綁外掛程式外觀應透過 OpenClaw 的外掛程式外觀載入器載入；從 `dist/extensions/...` 直接匯入會繞過清單和執行時期 sidecar 檢查，而已封裝安裝會將這些檢查用於外掛程式擁有的程式碼。

當輔助程式刻意屬於供應商特定且尚不屬於一般 SDK 子路徑時，提供者外掛程式可以暴露狹窄的外掛程式本地合約桶狀檔案。捆綁範例：

- **Anthropic**：公開 `api.ts` / `contract-api.ts` 縫合 (seam)，用於 Claude
  beta-header 和 `service_tier` 串流輔助程式。
- **`@openclaw/openai-provider`**: `api.ts` 匯出提供者建構器、預設模型輔助函式以及即時提供者建構器。
- **`@openclaw/openrouter-provider`**: `api.ts` 匯出提供者建構器以及上手/設定輔助函式。

<Warning>
  Extension 正式程式碼也應避免 `openclaw/plugin-sdk/<other-plugin>` 匯入。如果輔助函式是真正共用的，請將其提升至中立的 SDK 子路徑，例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他以能力為介面的層級，而不是將兩個外掛程式耦合在一起。
</Warning>

## 相關

<CardGroup cols={2}>
  <Card title="進入點" icon="door-open" href="/zh-Hant/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 選項。
  </Card>
  <Card title="執行時輔助函式" icon="gears" href="/zh-Hant/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空間參考。
  </Card>
  <Card title="設定與組態" icon="sliders" href="/zh-Hant/plugins/sdk-setup">
    打包、資訊清單與組態綱要。
  </Card>
  <Card title="測試" icon="vial" href="/zh-Hant/plugins/sdk-testing">
    測試公用程式與 lint 規則。
  </Card>
  <Card title="SDK 遷移" icon="arrows-turn-right" href="/zh-Hant/plugins/sdk-migration">
    從已棄用的介面層級遷移。
  </Card>
  <Card title="外掛程式內部機制" icon="diagram-project" href="/zh-Hant/plugins/architecture">
    深度架構與能力模型。
  </Card>
</CardGroup>
