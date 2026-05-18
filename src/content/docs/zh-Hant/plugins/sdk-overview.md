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

<Note>此頁面適用於在 OpenClaw 內部使用 `openclaw/plugin-sdk/*` 的外掛作者。對於想要透過 Gateway 執行代理程式的外部應用程式、腳本、儀表板、CI 工作和 IDE 擴充功能，請改用 [OpenClaw App SDK](/zh-Hant/concepts/openclaw-sdk) 和 `@openclaw/sdk` 套件。</Note>

<Tip>改尋找操作指南？請從 [建置外掛](/zh-Hant/plugins/building-plugins) 開始，針對通道外掛使用 [通道外掛](/zh-Hant/plugins/sdk-channel-plugins)，提供者外掛使用 [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins)，本機 AI CLI 後端使用 [CLI 後端外掛](/zh-Hant/plugins/cli-backend-plugins)，以及工具或生命週期掛勾外掛使用 [外掛掛勾](/zh-Hant/plugins/hooks)。</Tip>

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

外掛 SDK 以一組依區域分組的狹窄子路徑形式公開（外掛入口、通道、提供者、驗證、執行階段、功能、記憶體和保留的捆綁外掛輔助程式）。若要查看完整的分類目錄（已分組並連結），請參閱 [外掛 SDK 子路徑](/zh-Hant/plugins/sdk-subpaths)。

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

對於具有固定工具名稱的簡單僅工具外掛，請使用 [`defineToolPlugin`](/zh-Hant/plugins/tool-plugins)。對於混合外掛或完全動態的工具註冊，請直接使用 `api.registerTool(...)`。

| 方法                            | 註冊內容                                    |
| ------------------------------- | ------------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理程式工具（必要或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自訂指令（繞過 LLM）                        |

當代理程式需要簡短的指令專屬路由提示時，外掛指令可以設定 `agentPromptGuidance`。請保持該文字與指令本身相關；請勿將提供者或外掛特定的政策新增至核心提示建構器中。

### 基礎架構

| 方法                                           | 註冊內容                               |
| ---------------------------------------------- | -------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件掛勾                               |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端點                      |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法                       |
| `api.registerGatewayDiscoveryService(service)` | 本機 Gateway 探索廣告器                |
| `api.registerCli(registrar, opts?)`            | CLI 子指令                             |
| `api.registerNodeCliFeature(registrar, opts?)` | 位於 `openclaw nodes` 下的節點功能 CLI |
| `api.registerService(service)`                 | 背景服務                               |
| `api.registerInteractiveHandler(registration)` | 互動式處理程式                         |
| `api.registerAgentToolResultMiddleware(...)`   | Runtime tool-result 中介軟體           |
| `api.registerMemoryPromptSupplement(builder)`  | 累加式記憶體相鄰提示區段               |
| `api.registerMemoryCorpusSupplement(adapter)`  | 累加式記憶體搜尋/讀取語料庫            |

### 工作流程外掛程式的主機掛鉤

主機掛鉤是供需要參與主機生命週期，而不僅是新增提供者、通道或工具的外掛程式使用的 SDK 介面。它們是通用契約；計劃模式可以使用它們，但審核工作流程、工作區原則閘道、背景監視器、設定精靈和 UI 伴隨外掛程式也可以使用它們。

| 方法                                                                                 | 它擁有的契約                                                                                              |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | 外掛程式擁有的、透過 Gateway 會話投射的 JSON 相容會話狀態                                                 |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | 針對單一会話注入至下一個 Agent 週期的持久精確一次上下文                                                   |
| `api.registerTrustedToolPolicy(...)`                                                 | 可封鎖或重寫工具參數的內建/受信賴外掛前工具原則                                                           |
| `api.registerToolMetadata(...)`                                                      | 不變更工具實作的工具目錄顯示中繼資料                                                                      |
| `api.registerCommand(...)`                                                           | 範圍外掛程式指令；指令結果可以設定 `continueAgent: true`；Discord 原生指令支援 `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | 針對會話、工具、執行或設定介面的控制 UI 貢獻描述項                                                        |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | 在重置/刪除/重新載入路徑上，針對外掛程式擁有之執行時期資源的清理回呼                                      |
| `api.agent.events.registerAgentEventSubscription(...)`                               | 針對工作流程狀態和監視器的經清理事件訂閱                                                                  |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | 每次執行外掛程式暫存狀態，在終端執行生命週期時清除                                                        |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | 外掛程式擁有的排程器工作清理中繼資料；不排程工作或建立工作記錄                                            |
| `api.session.workflow.sendSessionAttachment(...)`                                    | 僅限內建的主機中介檔案附加傳送至作用中直接輸出會話路由                                                    |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | 僅限內建的 Cron 支援排程會話週期加上基於標籤的清理                                                        |
| `api.session.controls.registerSessionAction(...)`                                    | 用戶端可透過 Gateway 分派的類型會話動作                                                                   |

對於新的外掛程式碼，請使用分組命名空間：

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

同等的扁平方法仍作為已棄用的相容性別名提供，以供現有外掛使用。請勿加入直接呼叫
`api.registerSessionExtension`、`api.enqueueNextTurnInjection`、
`api.registerControlUiDescriptor`、`api.registerRuntimeLifecycle`、
`api.registerAgentEventSubscription`、`api.emitAgentEvent`、
`api.setRunContext`、`api.getRunContext`、`api.clearRunContext`、
`api.registerSessionSchedulerJob`、`api.registerSessionAction`、
`api.sendSessionAttachment`、`api.scheduleSessionTurn` 或
`api.unscheduleSessionTurnsByTag` 的新外掛程式碼。

`scheduleSessionTurn(...)` 是針對 Gateway Cron 排程器的範圍限定會話便利方法。Cron 擁有計時權，並在輪次執行時建立背景任務記錄；外掛 SDK 僅限制目標會話、外掛擁有的命名和清理。當工作本身需要持久的的多步驟任務流程狀態時，請在排定的輪次內使用 `api.runtime.tasks.managedFlows`。

這些合約刻意分割了權限：

- 外部外掛可以擁有會話延伸、UI 描述元、指令、工具中繼資料、下一輪注入和一般掛勾。
- 受信任的工具原則會在一般 `before_tool_call` 掛勾之前執行，並且僅限打包版，因為它們參與主機安全原則。
- 保留的指令擁有權僅限打包版。外部外掛應使用其自己的指令名稱或別名。
- `allowPromptInjection=false` 會停用提示詞變更的 hooks，包括
  `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution`、
  來自舊版 `before_agent_start` 的提示詞欄位，以及
  `enqueueNextTurnInjection`。

非 Plan 消費者的範例：

| Plugin 原型         | 使用的 Hooks                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------- |
| 審核工作流程        | Session 擴充、指令接續、下一輪注入、UI 描述器                                            |
| 預算/工作區策略閘道 | 受信任工具策略、工具中繼資料、session 投射                                               |
| 背景生命週期監控器  | 執行時生命週期清理、agent 事件訂閱、session 排程器所有權/清理、心跳提示詞貢獻、UI 描述器 |
| 設定或上架精靈      | Session 擴充、範圍指令、控制 UI 描述器                                                   |

<Note>保留的核心管理員命名空間 (`config.*`、`exec.approvals.*`、`wizard.*`、 `update.*`) 即使 plugin 嘗試指定 更狹隘的 gateway 方法範圍，也會保持 `operator.admin`。 對於 plugin 擁有的方法，建議優先使用 plugin 專屬的前綴。</Note>

<Accordion title="何時使用工具結果中介軟體">
  捆綁的 plugin 可以在執行後、執行時將結果
  餵回模型之前重寫工具結果時，使用 `api.registerAgentToolResultMiddleware(...)`。這是受信任的
  執行時中立接縫，用於像 tokenjuice 這樣的非同步輸出縮減器。

捆綁的 plugin 必須針對每個
目標執行時宣告 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`。外部 plugin
無法註冊此中介軟體；對於不需要
模型前工具結果時序的工作，請保留一般的 OpenClaw plugin hooks。舊版僅限 Pi 的
內嵌擴充工廠註冊路徑已被移除。

</Accordion>

### Gateway 探索註冊

`api.registerGatewayDiscoveryService(...)` 允許外掛程式在本地探索傳輸（如 mDNS/Bonjour）上通告作用中的
Gateway。當啟用本地探索時，OpenClaw 會在 Gateway 啟動期間呼叫該服務，傳遞目前的
Gateway 連接埠和非秘密 TXT 提示資料，並在 Gateway 關閉期間呼叫傳回的
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

Gateway 探索外掛程式不得將通告的 TXT 值視為秘密或
驗證機制。探索是一種路由提示；Gateway 驗證和 TLS 釘選仍然
擁有信任權。

### CLI 註冊元資料

`api.registerCli(registrar, opts?)` 接受兩種命令元資料：

- `commands`：由註冊者擁有的明確命令名稱
- `descriptors`：用於 CLI 說明、
  路由和延遲外掛程式 CLI 註冊的剖析時間命令描述元
- `parentPath`：用於巢狀命令群組的可選父命令路徑，例如
  `["nodes"]`

對於成對節點功能，請優先使用
`api.registerNodeCliFeature(registrar, opts?)`。它是 `api.registerCli(..., { parentPath: ["nodes"] })` 的小型包裝函式，並使諸如
`openclaw nodes canvas` 之類的命令成為明確的外掛程式擁有節點功能。

如果您希望外掛程式命令在一般根 CLI 路徑中保持延遲載入，
請提供 `descriptors` 以涵蓋該註冊者公開的每個頂層命令根。

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

巢狀命令會將解析的父命令接收為 `program`：

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
該急切相容性路徑仍受支援，但它不會安裝
由描述元支援的預留位置以供剖析時延遲載入。

### CLI 後端註冊

`api.registerCliBackend(...)` 允許外掛程式擁有本地
AI CLI 後端（例如 `claude-cli` 或 `my-cli`）的預設設定。

- 後端 `id` 會成為模型參考中的提供者前綴，例如 `my-cli/gpt-5`。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的形狀。
- 使用者設定仍然優先。OpenClaw 會在執行 CLI 之前將
  `agents.defaults.cliBackends.<id>` 合併到外掛程式預設值之上。
- 當後端在合併後需要相容性重寫（例如正規化舊的旗標形狀）時，請使用 `normalizeConfig`。
- 針對屬於 CLI 方言的請求範圍 argv 重寫（例如將 OpenClaw 思考等級對應到原生的 effort 旗標），請使用 `resolveExecutionArgs`。

若要查看端到端的撰寫指南，請參閱
[CLI 後端外掛程式](/zh-Hant/plugins/cli-backend-plugins)。

### 獨佔插槽

| 方法                                       | 註冊內容                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 情境引擎（一次啟用一個）。`assemble()` 回呼會接收 `availableTools` 和 `citationsMode`，以便引擎能調整提示新增內容。 |
| `api.registerMemoryCapability(capability)` | 統一記憶體功能                                                                                                      |
| `api.registerMemoryPromptSection(builder)` | 記憶體提示區段建構器                                                                                                |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶體排空計畫解析器                                                                                                |
| `api.registerMemoryRuntime(runtime)`       | 記憶體執行階段配接器                                                                                                |

### 記憶體嵌入配接器

| 方法                                           | 註冊內容                             |
| ---------------------------------------------- | ------------------------------------ |
| `api.registerMemoryEmbeddingProvider(adapter)` | 用於作用中外掛程式的記憶體嵌入配接器 |

- `registerMemoryCapability` 是首選的獨佔記憶體外掛程式 API。
- `registerMemoryCapability` 也可以公開 `publicArtifacts.listArtifacts(...)`，
  以便伴隨外掛程式能透過 `openclaw/plugin-sdk/memory-host-core` 取用匯出的記憶體成品，
  而不需存取特定記憶體外掛程式的私有配置。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是相容舊版的獨佔記憶體外掛程式 API。
- `MemoryFlushPlan.model` 可以將排空輪次釘選到精確的 `provider/model`
  參考（例如 `ollama/qwen3:8b`），而不繼承作用中的後援鏈。
- `registerMemoryEmbeddingProvider` 允許作用中的記憶體外掛程式註冊一個
  或多個嵌入配接器 ID（例如 `openai`、`gemini` 或自訂
  外掛程式定義的 ID）。
- 使用者設定（例如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）會根據這些註冊的配接器 ID 進行解析。

### 事件與生命週期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 具型別生命週期勾點 |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼       |

請參閱 [Plugin hooks](/zh-Hant/plugins/hooks) 以取得範例、常見 Hook 名稱和防護語意。

### Hook 決策語意

- `before_tool_call`：返回 `{ block: true }` 是終止的。一旦任何處理程式設定了它，較低優先級的處理程式將被跳過。
- `before_tool_call`：返回 `{ block: false }` 被視為無決定（與省略 `block` 相同），而非覆寫。
- `before_install`：返回 `{ block: true }` 是終止的。一旦任何處理程式設定了它，較低優先級的處理程式將被跳過。
- `before_install`：返回 `{ block: false }` 被視為無決定（與省略 `block` 相同），而非覆寫。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是終止的。一旦任何處理程式宣告分派，較低優先級的處理程式和預設模型分派路徑將被跳過。
- `message_sending`：返回 `{ cancel: true }` 是終止的。一旦任何處理程式設定了它，較低優先級的處理程式將被跳過。
- `message_sending`：返回 `{ cancel: false }` 被視為無決定（與省略 `cancel` 相同），而非覆寫。
- `message_received`：當您需要入站執行緒/主題路由時，請使用類型化的 `threadId` 欄位。保留 `metadata` 用於通道特定的額外資訊。
- `message_sending`：在回退到通道特定的 `metadata` 之前，請使用類型化的 `replyToId` / `threadId` 路由欄位。
- `gateway_start`：請使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 來處理 Gateway 擁有的啟動狀態，而不要依賴內部的 `gateway:startup` hooks。
- `cron_changed`：觀察 Gateway 所擁有的 cron 生命週期變更。在同步外部喚醒排程器時使用 `event.job?.state?.nextRunAtMs` 和 `ctx.getCron?.()`，並將 OpenClaw 作為到期檢查和執行的真實來源。

### API 物件欄位

| 欄位                     | 類型                      | 說明                                                              |
| ------------------------ | ------------------------- | ----------------------------------------------------------------- |
| `api.id`                 | `string`                  | 外掛程式 ID                                                       |
| `api.name`               | `string`                  | 顯示名稱                                                          |
| `api.version`            | `string?`                 | 外掛程式版本 (可選)                                               |
| `api.description`        | `string?`                 | 外掛程式描述 (可選)                                               |
| `api.source`             | `string`                  | 外掛程式來源路徑                                                  |
| `api.rootDir`            | `string?`                 | 外掛程式根目錄 (可選)                                             |
| `api.config`             | `OpenClawConfig`          | 目前設定快照 (可用時為作用中的記憶體內執行時期快照)               |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的外掛程式專屬設定             |
| `api.runtime`            | `PluginRuntime`           | [執行時期輔助函式](/zh-Hant/plugins/sdk-runtime)                       |
| `api.logger`             | `PluginLogger`            | 範圍 Logger (`debug`, `info`, `warn`, `error`)                    |
| `api.registrationMode`   | `PluginRegistrationMode`  | 目前載入模式；`"setup-runtime"` 是輕量級的完整進入前啟動/設定視窗 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛程式根目錄的路徑                                    |

## 內部模組慣例

在您的外掛程式中，請使用本地 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  請勿從生產程式碼透過 `openclaw/plugin-sdk/<your-plugin>`
  匯入您自己的外掛程式。請透過 `./api.ts` 或
  `./runtime-api.ts` 路由內部匯入。SDK 路徑僅為外部合約。
</Warning>

外觀載入的捆綁外掛公開表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 和類似的公開進入檔案）在 OpenClaw 已運行時優先使用
作用中的執行時設定快照。如果尚未存在執行時快照，它們會
回退到磁碟上的解析設定檔。
打包的捆綁外掛外觀應透過 OpenClaw 的外掛
外觀載入器載入；從 `dist/extensions/...` 直接匯入會繞過清單
和執行時 sidecar 檢查，這些檢查是打包安裝用於外掛擁有程式碼的。

提供者外掛可以在輔助功能
刻意針對特定提供者且尚不屬於通用 SDK
子路徑時，公開一個狹窄的外掛本機合約 barrel。捆綁範例：

- **Anthropic**：公開 `api.ts` / `contract-api.ts` 縫合用於 Claude
  beta-header 和 `service_tier` 串流輔助功能。
- **`@openclaw/openai-provider`**：`api.ts` 匯出提供者建構器、
  預設模型輔助功能和即時提供者建構器。
- **`@openclaw/openrouter-provider`**：`api.ts` 匯出提供者建構器
  加上上手/設定輔助功能。

<Warning>
  擴充生產程式碼也應避免 `openclaw/plugin-sdk/<other-plugin>`
  匯入。如果輔助功能確實是共享的，請將其提升到中立的 SDK 子路徑，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  以功能為導向的表面，而不是將兩個外掛耦合在一起。
</Warning>

## 相關

<CardGroup cols={2}>
  <Card title="進入點" icon="door-open" href="/zh-Hant/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 選項。
  </Card>
  <Card title="執行時輔助功能" icon="gears" href="/zh-Hant/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空間參考。
  </Card>
  <Card title="設定與配置" icon="sliders" href="/zh-Hant/plugins/sdk-setup">
    打包、資訊清單和配置架構。
  </Card>
  <Card title="測試" icon="vial" href="/zh-Hant/plugins/sdk-testing">
    測試工具程式和 Lint 規則。
  </Card>
  <Card title="SDK 遷移" icon="arrows-turn-right" href="/zh-Hant/plugins/sdk-migration">
    從已棄用的介面進行遷移。
  </Card>
  <Card title="外掛程式內部機制" icon="diagram-project" href="/zh-Hant/plugins/architecture">
    深度架構和功能模型。
  </Card>
</CardGroup>
