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

<Note>本頁面適用於在 OpenClaw 內部使用 `openclaw/plugin-sdk/*` 的外掛作者。對於希望透過 Gateway 執行代理程式的外部應用程式、腳本、儀表板、CI 工作和 IDE 擴充功能，請改用 [OpenClaw App SDK](/zh-Hant/concepts/openclaw-sdk) 和 `@openclaw/sdk` 套件。</Note>

<Tip>改在尋找操作指南嗎？請從 [建構外掛](/zh-Hant/plugins/building-plugins) 開始，針對通道外掛使用 [通道外掛](/zh-Hant/plugins/sdk-channel-plugins)，提供者外掛使用 [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins)，本機 AI CLI 後端使用 [CLI 後端外掛](/zh-Hant/plugins/cli-backend-plugins)，以及工具或生命週期掛勾外掛使用 [外掛掛勾](/zh-Hant/plugins/hooks)。</Tip>

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

外掛 SDK 以一組按區域分組的狹窄子路徑（外掛進入點、通道、提供者、驗證、執行時、功能、記憶體和保留的捆綁外掛輔助程式）公開。有關完整的目錄——已分組並連結——請參閱 [外掛 SDK 子路徑](/zh-Hant/plugins/sdk-subpaths)。

編譯器進入點清單位於 `scripts/lib/plugin-sdk-entrypoints.json` 中；套件匯出是從公開子集中生成的，該子集在減去 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的儲存庫本機測試/內部子路徑後得出。執行 `pnpm plugin-sdk:surface` 以稽核公開匯出計數。已棄用的公開子路徑（舊到足以且未被捆綁擴充功能生產程式碼使用）會在 `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` 中追蹤；廣泛的已棄用重新匯出匯整會在 `scripts/lib/plugin-sdk-deprecated-barrel-subpaths.json` 中追蹤。

## 註冊 API

`register(api)` 回呼會收到一個包含這些方法的 `OpenClawPluginApi` 物件：

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

| 方法                            | 註冊內容                                    |
| ------------------------------- | ------------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理程式工具（必填或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自訂指令（繞過 LLM）                        |

當代理需要一個簡短的、由命令擁有的路由提示時，外掛命令可以設定 `agentPromptGuidance`。請保持該文字與命令本身相關；不要在核心提示建構器中新增提供者或外掛特定的策略。

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

| 方法                                                                                 | 擁有的契約                                                                                            |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | 透過 Gateway 會話投射的外掛擁有、JSON 相容會話狀態                                                    |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | 針對單一會話注入至下一個 Agent 輪次的持久化僅執行一次背景                                             |
| `api.registerTrustedToolPolicy(...)`                                                 | 可封鎖或重寫工具參數的配套/受信任外掛前工具原則                                                       |
| `api.registerToolMetadata(...)`                                                      | 不變更工具實作的工具目錄顯示中繼資料                                                                  |
| `api.registerCommand(...)`                                                           | 範圍外掛命令；命令結果可以設定 `continueAgent: true`；Discord 原生命令支援 `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | 針對工作階段、工具、執行或設定期面的控制 UI 貢獻描述項                                                |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | 在重置/刪除/重新載入路徑上，針對外掛程式擁有的執行時資源的清理回呼                                    |
| `api.agent.events.registerAgentEventSubscription(...)`                               | 針對工作流程狀態和監視器的已清理事件訂閱                                                              |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | 每次執行的外掛程式暫存狀態，會在最終執行生命週期時被清除                                              |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | 清理外掛擁有的排程器作業的中繼資料；不排程工作或建立工作記錄                                          |
| `api.session.workflow.sendSessionAttachment(...)`                                    | 僅限打包版本的主機中繼檔案附件傳遞至作用中的直接輸出會話路由                                          |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | 僅限打包版本的 Cron 支援排程會話輪次以及基於標籤的清理                                                |
| `api.session.controls.registerSessionAction(...)`                                    | 客戶端可以透過 Gateway 分派的類型化會話操作                                                           |

新的外掛程式碼請使用分組命名空間：

- `api.session.state.registerSessionExtension(...)`
- `api.session.workflow.enqueueNextTurnInjection(...)`
- `api.session.workflow.registerSessionSchedulerJob(...)`
- `api.session.workflow.sendSessionAttachment(...)`
- `api.session.workflow.scheduleSessionTurn(...)`
- `api.session.workflow.unscheduleSessionTurnsByTag(...)`
- `api.session.controls.registerSessionAction(...)`
- `api.session.controls.registerControlUiDescriptor(...)`
- `api.agent.events.registerAgentEventSubscription(...)`
- `api.agent.events.emitAgentEvent(...)`
- `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`
- `api.lifecycle.registerRuntimeLifecycle(...)`

對等的扁平方法仍作為已棄用的兼容別名提供給現有插件使用。請勿添加直接呼叫
`api.registerSessionExtension`、`api.enqueueNextTurnInjection`、
`api.registerControlUiDescriptor`、`api.registerRuntimeLifecycle`、
`api.registerAgentEventSubscription`、`api.emitAgentEvent`、
`api.setRunContext`、`api.getRunContext`、`api.clearRunContext`、
`api.registerSessionSchedulerJob`、`api.registerSessionAction`、
`api.sendSessionAttachment`、`api.scheduleSessionTurn` 或
`api.unscheduleSessionTurnsByTag` 的新插件代碼。

`scheduleSessionTurn(...)` 是基於 Gateway Cron 排程器的會話範圍便捷工具。Cron 負責計時並在輪次執行時創建後台任務記錄；Plugin SDK 僅約束目標會話、插件擁有的命名和清理。當工作本身需要持久的多步驟 Task Flow 狀態時，請在預定的輪次內使用 `api.runtime.tasks.managedFlows`。

這些合約刻意分割了權限：

- 外部插件可以擁有會話擴展、UI 描述符、命令、工具元數據、下一輪次注入和普通鉤子。
- 受信任的工具策略在普通的 `before_tool_call` 鉤子之前執行，並且僅限打包版，因為它們參與主機安全策略。
- 保留的命令所有權僅限打包版。外部插件應使用其自己的命令名稱或別名。
- `allowPromptInjection=false` 會停用提示變更鉤子，包括
  `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution`、
  來自舊版 `before_agent_start` 的提示欄位以及
  `enqueueNextTurnInjection`。

非 Plan 消費者範例：

| 插件原型            | 使用的鉤子                                                                           |
| ------------------- | ------------------------------------------------------------------------------------ |
| 審批工作流          | 會話擴展、命令繼續、下一輪次注入、UI 描述符                                          |
| 預算/工作區策略閘道 | 受信任的工具策略、工具元數據、會話投影                                               |
| 後台生命週期監控器  | 執行時生命週期清理、代理程式事件訂閱、會話排程器擁有權/清理、心跳提示貢獻、UI 描述符 |
| 設定或上架精靈      | 會話擴充、範圍指令、控制 UI 描述符                                                   |

<Note>保留的核心管理員命名空間 (`config.*`, `exec.approvals.*`, `wizard.*`, `update.*`) 即使外掛嘗試分配 更窄的閘道方法範圍，也會保持 `operator.admin`。 對於外掛擁有的方法，建議優先使用外掛特定的前綴。</Note>

<Accordion title="何時使用工具結果中介軟體">
  當套件組合的外掛需要在執行後、執行時將結果回饋給模型之前重寫工具結果時，可以使用 `api.registerAgentToolResultMiddleware(...)`。這是受信任的與執行時無關的接縫，適用於 tokenjuice 等非同步輸出減少器。

套件組合的外掛必須為每個目標執行時宣告 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`。外部外掛無法註冊此中介軟體；對於不需要模型前工具結果計時的工作，請保留標準的 OpenClaw 外掛勾點。僅限 Pi 的舊式嵌入式延伸工廠註冊路徑已被移除。

</Accordion>

### 閘道探索註冊

`api.registerGatewayDiscoveryService(...)` 允許外掛透過 mDNS/Bonjour 等本機探索傳輸公開使用中的閘道。當啟用本機探索時，OpenClaw 會在閘道啟動期間呼叫此服務，傳遞目前的閘道連接埠和非機密 TXT 提示資料，並在閘道關閉時呼叫傳回的 `stop` 處理程式。

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

閘道探索外掛不得將公開的 TXT 值視為機密或驗證資訊。
探索是一種路由提示；閘道驗證和 TLS 釘選仍然擁有信任權。

### CLI 註冊元資料

`api.registerCli(registrar, opts?)` 接受兩種指令元資料：

- `commands`：由註冊者擁有的明確指令名稱
- `descriptors`：用於 CLI 說明、路由和延遲外掛 CLI 註冊的剖析時指令描述符
- `parentPath`：選用項目，用於巢狀指令群組的父指令路徑，例如
  `["nodes"]`

對於配對節點功能，請優先使用
`api.registerNodeCliFeature(registrar, opts?)`。它是 `api.registerCli(..., { parentPath: ["nodes"] })` 的小型包裝器，並使諸如
`openclaw nodes canvas` 之類的指令成為明確的插件擁有節點功能。

如果您希望插件指令在一般根 CLI 路徑中保持延遲載入，
請提供 `descriptors`，涵蓋該註冊器公開的每個頂層指令根目錄。

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

僅當您不需要延遲根 CLI 註冊時，才單獨使用 `commands`。
該急切相容性路徑仍受支援，但不會安裝
描述符支援的預留位置以進行解析時的延遲載入。

### CLI 後端註冊

`api.registerCliBackend(...)` 允許插件擁有本機
AI CLI 後端（例如 `codex-cli`）的預設設定。

- 後端 `id` 會成為模型參考中的提供者前綴，例如 `codex-cli/gpt-5`。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的形狀。
- 使用者設定仍優先。OpenClaw 在執行 CLI 之前，會將 `agents.defaults.cliBackends.<id>` 合併到
  插件預設值之上。
- 當後端在合併後需要相容性重寫時使用 `normalizeConfig`
  （例如正規化舊的標誌形狀）。
- 對於屬於 CLI 方言的請求範圍 argv 重寫，請使用 `resolveExecutionArgs`，
  例如將 OpenClaw 思考層級映射到原生努力標誌。

如需端對端撰寫指南，請參閱
[CLI 後端插件](/zh-Hant/plugins/cli-backend-plugins)。

### 獨佔插槽

| 方法                                       | 註冊內容                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 語境引擎（一次啟用一個）。`assemble()` 回呼會接收 `availableTools` 和 `citationsMode`，以便引擎可以調整提示詞新增內容。 |
| `api.registerMemoryCapability(capability)` | 統一記憶體功能                                                                                                          |
| `api.registerMemoryPromptSection(builder)` | 記憶體提示詞區段建構器                                                                                                  |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶體排空計畫解析器                                                                                                    |
| `api.registerMemoryRuntime(runtime)`       | 記憶體執行適配器                                                                                                        |

### 記憶體嵌入適配器

| 方法                                           | 註冊內容                       |
| ---------------------------------------------- | ------------------------------ |
| `api.registerMemoryEmbeddingProvider(adapter)` | 現用外掛程式的記憶體嵌入適配器 |

- `registerMemoryCapability` 是首選的專屬記憶體外掛程式 API。
- `registerMemoryCapability` 也可以公開 `publicArtifacts.listArtifacts(...)`
  以便伴隨外掛程式可以透過 `openclaw/plugin-sdk/memory-host-core` 取用匯出的記憶體構件，
  而非存取特定記憶體外掛程式的私有佈局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是與舊版相容的專屬記憶體外掛程式 API。
- `MemoryFlushPlan.model` 可以將排空輪次釘選到確切的 `provider/model`
  參考（例如 `ollama/qwen3:8b`），而不繼承現用的後援鏈。
- `registerMemoryEmbeddingProvider` 讓現用記憶體外掛程式註冊一個
  或多個嵌入適配器 ID（例如 `openai`、`gemini` 或自訂
  外掛程式定義的 ID）。
- 諸如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback` 等使用者設定會根據這些已註冊的
  適配器 ID 進行解析。

### 事件與生命週期

| 方法                                         | 作用                 |
| -------------------------------------------- | -------------------- |
| `api.on(hookName, handler, opts?)`           | 具型別的生命週期掛鉤 |
| `api.onConversationBindingResolved(handler)` | 對話繫結回呼         |

請參閱 [外掛程式掛鉤](/zh-Hant/plugins/hooks) 以了解範例、常見掛鉤名稱和防護
語意。

### 掛鉤決策語意

- `before_tool_call`：傳回 `{ block: true }` 即為終止。一旦任何處理程式設定該值，就會跳過較低優先順序的處理程式。
- `before_tool_call`：傳回 `{ block: false }` 會被視為未做決定（等同於省略 `block`），而非覆寫。
- `before_install`：傳回 `{ block: true }` 即為終止。一旦任何處理程式設定該值，就會跳過較低優先順序的處理程式。
- `before_install`：傳回 `{ block: false }` 被視為未作決定（與省略 `block` 相同），而非覆寫。
- `reply_dispatch`：傳回 `{ handled: true, ... }` 是終止性的。一旦任何處理程序聲明分派，較低優先級的處理程式和預設模型分派路徑將被跳過。
- `message_sending`：傳回 `{ cancel: true }` 是終止性的。一旦任何處理程式設定它，較低優先級的處理程式將被跳過。
- `message_sending`：傳回 `{ cancel: false }` 被視為未作決定（與省略 `cancel` 相同），而非覆寫。
- `message_received`：當您需要入站執行緒/主題路由時，請使用具型別的 `threadId` 欄位。將 `metadata` 用於通道特定的額外資訊。
- `message_sending`：在回退到通道特定的 `metadata` 之前，使用具型別的 `replyToId` / `threadId` 路由欄位。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 來處理閘道擁有的啟動狀態，而不是依賴內部的 `gateway:startup` hooks。
- `cron_changed`：觀察閘道擁有的 cron 生命週期變更。在同步外部喚醒排程器時使用 `event.job?.state?.nextRunAtMs` 和 `ctx.getCron?.()`，並將 OpenClaw 作為到期檢查和執行的唯一事實來源。

### API 物件欄位

| 欄位                     | 類型                      | 描述                                                                      |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 外掛 ID                                                                   |
| `api.name`               | `string`                  | 顯示名稱                                                                  |
| `api.version`            | `string?`                 | 外掛版本（選填）                                                          |
| `api.description`        | `string?`                 | 外掛描述（選填）                                                          |
| `api.source`             | `string`                  | 外掛來源路徑                                                              |
| `api.rootDir`            | `string?`                 | 外掛程式根目錄（可選）                                                    |
| `api.config`             | `OpenClawConfig`          | 目前設定快照（可用時為活躍的記憶體內執行時快照）                          |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的外掛程式特定設定                     |
| `api.runtime`            | `PluginRuntime`           | [執行時輔助程式](/zh-Hant/plugins/sdk-runtime)                                 |
| `api.logger`             | `PluginLogger`            | 範圍記錄器（`debug`、`info`、`warn`、`error`）                            |
| `api.registrationMode`   | `PluginRegistrationMode`  | 目前載入模式；`"setup-runtime"` 是完整的項目啟動/設定視窗之前的輕量級視窗 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛程式根目錄的路徑                                            |

## 內部模組慣例

在您的外掛程式內，使用本地 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  永遠不要在生產程式碼中透過 `openclaw/plugin-sdk/<your-plugin>` 匯入您自己的外掛程式。
  請透過 `./api.ts` 或 `./runtime-api.ts` 路由內部匯入。
  SDK 路徑僅供外部合約使用。
</Warning>

Facade載入的捆綁外掛程式公共介面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 和類似的公共入口檔案）在 OpenClaw
已執行時優先使用活躍的執行時設定快照。如果執行時快照尚不存在，它們會退回到磁碟上的解析設定檔。
打包的捆綁外掛程式 facade 應透過 OpenClaw 的外掛程式 facade 載入器載入；
直接從 `dist/extensions/...` 匯入會繞過清單和執行時 sidecar 檢查，
而這些檢查是打包安裝用於外掛程式擁有程式碼的。

提供者外掛程式可以在輔助程式專門針對特定提供者且尚未屬於通用 SDK
子路徑時，公開一個狹窄的外掛程式本地合約 barrel。捆綁範例：

- **Anthropic**：針對 Claude 的公開 `api.ts` / `contract-api.ts` 接縫，
  以及 beta-header 和 `service_tier` 串流輔助函式。
- **`@openclaw/openai-provider`**：`api.ts` 匯出提供者建構器、
  預設模型輔助函式，以及即時提供者建構器。
- **`@openclaw/openrouter-provider`**：`api.ts` 匯出提供者建構器
  以及上架/配置輔助函式。

<Warning>
  擴充功能的生產程式碼也應避免 `openclaw/plugin-sdk/<other-plugin>`
  匯入。如果輔助函式確實是共用的，請將其提升至中立的 SDK 子路徑
  （例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  面向功能的介面），而不是將兩個外掛程式耦合在一起。
</Warning>

## 相關

<CardGroup cols={2}>
  <Card title="進入點" icon="door-open" href="/zh-Hant/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 選項。
  </Card>
  <Card title="執行時輔助函式" icon="gears" href="/zh-Hant/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空間參考。
  </Card>
  <Card title="設定與配置" icon="sliders" href="/zh-Hant/plugins/sdk-setup">
    打包、清單與配置結構描述。
  </Card>
  <Card title="測試" icon="vial" href="/zh-Hant/plugins/sdk-testing">
    測試工具與 Lint 規則。
  </Card>
  <Card title="SDK 遷移" icon="arrows-turn-right" href="/zh-Hant/plugins/sdk-migration">
    從已棄用的介面遷移。
  </Card>
  <Card title="Plugin internals" icon="diagram-project" href="/zh-Hant/plugins/architecture">
    深層架構與能力模型。
  </Card>
</CardGroup>
