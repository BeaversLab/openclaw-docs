---
summary: "匯入對照表、註冊 API 參考資料以及 SDK 架構"
title: "外掛程式 SDK 概觀"
sidebarTitle: "外掛程式 SDK 概觀"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

Plugin SDK 是外掛與核心之間的類型合約。本頁面提供關於 **要匯入什麼** 以及 **您可以註冊什麼** 的參考。

<Note>本頁面適用於在 OpenClaw 內部使用 `openclaw/plugin-sdk/*` 的外掛程式作者。若為希望透過 Gateway 執行代理程式的外部應用程式、腳本、儀表板、CI 工作或 IDE 擴充功能，請改用 [OpenClaw App SDK](/zh-Hant/concepts/openclaw-sdk) 和 `@openclaw/sdk` 套件。</Note>

<Tip>尋找操作指南嗎？請從 [建置外掛程式](/zh-Hant/plugins/building-plugins) 開始，針對通道外掛程式使用 [通道外掛程式](/zh-Hant/plugins/sdk-channel-plugins)，針對提供者外掛程式使用 [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins)，針對本機 AI CLI 後端使用 [CLI 後端外掛程式](/zh-Hant/plugins/cli-backend-plugins)，以及針對工具或生命週期掛勾外掛程式使用 [外掛程式掛勾](/zh-Hant/plugins/hooks)。</Tip>

## 匯入慣例

請務必從特定的子路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每個子路徑都是一個小型的自封閉模組。這能保持快速啟動並避免循環相依性問題。針對通道特定的進入點/建置輔助程式，建議優先使用 `openclaw/plugin-sdk/channel-core`；將 `openclaw/plugin-sdk/core` 保留給更廣泛的總覽介面和共用輔助程式，例如 `buildChannelConfigSchema`。

針對通道配置，請透過 `openclaw.plugin.json#channelConfigs` 發布通道所擁有的 JSON Schema。`plugin-sdk/channel-config-schema` 子路徑是用於共用的 Schema 基元和通用建構器。OpenClaw 的內建外掛程式使用 `plugin-sdk/bundled-channel-config-schema` 來保留內建通道的 Schema。已棄用的相容性匯出仍保留在 `plugin-sdk/channel-config-schema-legacy` 上；這兩個內建 Schema 子路徑皆非新外掛程式的參考範本。

<Warning>
  請勿匯入提供者 或通道 品牌化的便利縫合層 (例如
  `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`)。
  捆綁外掛程式會在其自身的 `api.ts` /
  `runtime-api.ts` 桶檔案中組合通用 SDK 子路徑；核心使用者應使用這些外掛程式本地的
  桶檔案，或者在需求確實跨通道時，新增一個狹隘的通用 SDK 合約。

一小組捆綁外掛程式輔助縫合層在具有追蹤的擁有者使用情況時，仍會出現在生成的匯出
對應表中。它們僅供捆綁外掛程式維護使用，不建議作為新的第三方
外掛程式的匯入路徑。

`openclaw/plugin-sdk/discord` 和 `openclaw/plugin-sdk/telegram-account` 也會作為已棄用的
相容性外觀為具有追蹤的擁有者使用情況而保留。請勿將這些匯入路徑複製到新的
外掛程式中；請改用注入的執行時期輔助程式和通用通道 SDK 子路徑。

</Warning>

## 子路徑參考

外掛程式 SDK 會以一組依區域分組的狹窄子路徑公開 (外掛程式
進入點、通道、提供者、驗證、執行時期、功能、記憶體和保留的
捆綁外掛程式輔助程式)。若要查看完整的目錄 — 已分組且已連結 — 請參閱
[外掛程式 SDK 子路徑](/zh-Hant/plugins/sdk-subpaths)。

編譯器進入點清單位於
`scripts/lib/plugin-sdk-entrypoints.json` 中；套件匯出是從公開子集中生成的，該子集是減去
`scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的存放庫本機測試/內部子路徑後的結果。執行
`pnpm plugin-sdk:surface` 以稽核公開匯出數量。已棄用的公開
子路徑若夠舊且未被捆綁擴充功能生產程式碼使用，則會在
`scripts/lib/plugin-sdk-deprecated-public-subpaths.json` 中追蹤；廣泛的
已棄用重新匯出桶檔案則在
`scripts/lib/plugin-sdk-deprecated-barrel-subpaths.json` 中追蹤。

## 註冊 API

`register(api)` 回呼會接收一個包含這些
方法的 `OpenClawPluginApi` 物件：

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

| 方法                            | 註冊內容                                |
| ------------------------------- | --------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理工具（必要或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自訂指令（繞過 LLM）                    |

當代理需要簡短、由指令擁有的路由提示時，外掛指令可以設定 `agentPromptGuidance`。請將該文字保持在指令本身；請勿將供應商或外掛特定的策略新增至核心提示建構器。

指引條目可能是遺留字串（適用於每個提示介面），或是結構化條目：

```ts
agentPromptGuidance: ["Global command hint.", { text: "Only show this in the main PI prompt.", surfaces: ["pi_main"] }];
```

結構化 `surfaces` 可能包含 `pi_main`、`codex_app_server`、`cli_backend`、`acp_backend` 或 `subagent`。若要針對所有介面提供有意圖的指引，請省略 `surfaces`。請勿傳遞空的 `surfaces` 陣列；該陣列會被拒絕，以免意外失去範圍變成全域提示文字。

原生 Codex 應用伺服器開發者指令比其他提示介面更嚴格：只有明確範圍限定為 `codex_app_server` 的指引才會提升至該高優先級路徑。為了相容性，遺留字串指引和無範圍結構化指引仍可供非 Codex 提示介面使用。

### 基礎架構

| 方法                                           | 註冊內容                          |
| ---------------------------------------------- | --------------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件掛鉤                          |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端點                 |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法                  |
| `api.registerGatewayDiscoveryService(service)` | 本機 Gateway 探索廣告器           |
| `api.registerCli(registrar, opts?)`            | CLI 子指令                        |
| `api.registerNodeCliFeature(registrar, opts?)` | `openclaw nodes` 下的節點功能 CLI |
| `api.registerService(service)`                 | 背景服務                          |
| `api.registerInteractiveHandler(registration)` | 互動式處理程式                    |
| `api.registerAgentToolResultMiddleware(...)`   | 執行階段工具結果中介軟體          |
| `api.registerMemoryPromptSupplement(builder)`  | 新增記憶體相鄰提示區段            |
| `api.registerMemoryCorpusSupplement(adapter)`  | 累加記憶體搜尋/讀取語料庫         |

### 工作流程外掛程式的主機掛鉤

主機掛鉤是供外掛程式參與主機生命週期，而非僅新增提供者、通道或工具的 SDK 縫合點。它們是通用合約；計畫模式可以使用它們，但審核工作流程、工作區原則閘道、背景監視器、設定精靈和 UI 伴隨外掛程式也可以使用它們。

| 方法                                                                                 | 其擁有的合約                                                                                              |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | 透過 Gateway 會話投射的外掛程式擁有、JSON 相容的會話狀態                                                  |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | 針對單一会話注入至下一個代理程式輪次的持久精確一次性內容                                                  |
| `api.registerTrustedToolPolicy(...)`                                                 | 內建的/受信任的外掛前工具原則，可封鎖或重寫工具參數                                                       |
| `api.registerToolMetadata(...)`                                                      | 工具目錄顯示中繼資料，不會變更工具實作                                                                    |
| `api.registerCommand(...)`                                                           | 範圍外掛程式指令；指令結果可以設定 `continueAgent: true`；Discord 原生指令支援 `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | 針對會話、工具、執行或設定介面的控制 UI 貢獻描述元                                                        |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | 在重設/刪除/重新載入路徑上，針對外掛程式擁有的執行階段資源的清除回呼                                      |
| `api.agent.events.registerAgentEventSubscription(...)`                               | 針對工作流程狀態與監視器的清理事件訂閱                                                                    |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | 每次執行的外掛程式暫存狀態，會在終端執行生命週期時清除                                                    |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | 針對外掛程式擁有的排程器作業的清除中繼資料；不排程工作或建立任務記錄                                      |
| `api.session.workflow.sendSessionAttachment(...)`                                    | 僅限內建的主機媒體檔案附件傳送，至作用中的直接輸出會話路由                                                |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | 僅限內建的 Cron 支援排程會話輪次，加上標籤式清除                                                          |
| `api.session.controls.registerSessionAction(...)`                                    | 用戶端可透過 Gateway 分派的類型化會話動作                                                                 |

針對新的外掛程式代碼，請使用分組命名空間：

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

同等的扁平方法仍作為已棄用的相容性別名供現有外掛使用。請勿新增直接呼叫
`api.registerSessionExtension`、`api.enqueueNextTurnInjection`、
`api.registerControlUiDescriptor`、`api.registerRuntimeLifecycle`、
`api.registerAgentEventSubscription`、`api.emitAgentEvent`、
`api.setRunContext`、`api.getRunContext`、`api.clearRunContext`、
`api.registerSessionSchedulerJob`、`api.registerSessionAction`、
`api.sendSessionAttachment`、`api.scheduleSessionTurn` 或
`api.unscheduleSessionTurnsByTag` 的外掛程式碼。

`scheduleSessionTurn(...)` 是基於 Gateway Cron 排程器的會話範圍便捷工具。Cron 負責計時並在輪次執行時建立背景任務記錄；Plugin SDK 僅限制目標會話、外掛擁有的命名和清理。當工作本身需要持久的逐步任務流程狀態時，請在排定的輪次內使用 `api.runtime.tasks.managedFlows`。

合約特意劃分了權限：

- 外部外掛可以擁有會話擴充功能、UI 描述符、指令、工具中繼資料、下一輪次注入以及一般掛鉤。
- 受信任的工具原則會在一般的 `before_tool_call` 掛鉤之前執行，並且僅限打包使用，因為它們參與了主機安全原則。
- 保留的指令擁有權僅限打包使用。外部外掛應使用自己的指令名稱或別名。
- `allowPromptInjection=false` 會停用提示變異掛鉤，包括
  `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution`、
  來自舊版 `before_agent_start` 的提示欄位，以及
  `enqueueNextTurnInjection`。

非 Plan 消費者的範例：

| 外掛原型            | 使用的掛鉤                                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| 核准工作流程        | 會話擴充、指令接續、下一輪注入、UI 描述器                                        |
| 預算/工作區政策閘道 | 信任的工具政策、工具元資料、會話投影                                             |
| 背景生命週期監視器  | 執行時生命週期清理、代理事件訂閱、會話排程器擁有權/清理、心跳提示貢獻、UI 描述器 |
| 設定或上架嚮導      | 會話擴充、範圍指令、控制 UI 描述器                                               |

<Note>保留的核心管理命名空間 (`config.*`、 `exec.approvals.*`、 `wizard.*`、 `update.*`) 即使外掛嘗試指派 更狹隘的 Gateway 方法範圍，也會維持 `operator.admin`。對於外掛擁有的方法，建議優先使用外掛特定的前綴。</Note>

<Accordion title="何時使用工具結果中介軟體">
  捆綁的外掛可以在執行後、執行時將結果反饋回模型之前
  重寫工具結果時使用 `api.registerAgentToolResultMiddleware(...)`。這是受信任的、與執行時無關的縫合點，用於 tokenjuice 等非同步輸出縮減器。

捆綁的外掛必須為每個目標執行時宣告 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`。外部外掛無法註冊此中介軟體；對於不需要模型前工具結果計時的工作，請保留一般的 OpenClaw 外掛鉤子。舊的僅限 Pi 的內嵌擴充工廠註冊路徑已被移除。

</Accordion>

### Gateway 探索註冊

`api.registerGatewayDiscoveryService(...)` 允許外掛在 mDNS/Bonjour 等本機探索傳輸上
公告作用中的 Gateway。當本機探索已啟用時，OpenClaw 會在 Gateway 啟動期間呼叫該服務，傳遞目前的 Gateway 連接埠和非機密 TXT 提示資料，並在 Gateway 關閉期間呼叫傳回的 `stop` 處理程式。

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

Gateway 探索外掛不得將公告的 TXT 值視為機密或
驗證機制。探索僅是路由提示；Gateway 驗證和 TLS 釘選仍擁有信任主體。

### CLI 註冊元資料

`api.registerCli(registrar, opts?)` 接受兩種指令元資料：

- `commands`：由註冊者擁有的明確指令名稱
- `descriptors`：用於 CLI 說明、路由和延遲插件 CLI 註冊的解析時命令描述元
- `parentPath`：嵌套命令群組的可選父命令路徑，例如 `["nodes"]`

對於配對節點功能，首選 `api.registerNodeCliFeature(registrar, opts?)`。它是 `api.registerCli(..., { parentPath: ["nodes"] })` 的小型包裝器，並使 `openclaw nodes canvas` 等命令成為明確的插件擁有節點功能。

如果您希望插件命令在正常根 CLI 路徑中保持延遲加載，請提供覆蓋該註冊器公開的每個頂層命令根的 `descriptors`。

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

嵌套命令接收解析後的父命令作為 `program`：

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

僅當您不需要延遲根 CLI 註冊時，才單獨使用 `commands`。該急切相容性路徑仍受支援，但不會安裝用於解析時延遲加載的基於描述元的佔位符。

### CLI 後端註冊

`api.registerCliBackend(...)` 允許插件擁有本地 AI CLI 後端（例如 `claude-cli` 或 `my-cli`）的預設配置。

- 後端 `id` 成為模型參考（例如 `my-cli/gpt-5`）中的提供者前綴。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的形狀。
- 使用者配置仍然優先。OpenClaw 在運行 CLI 之前會將 `agents.defaults.cliBackends.<id>` 合併到插件預設值之上。
- 當後端在合併後需要相容性重寫時（例如標準化舊的旗標形狀），請使用 `normalizeConfig`。
- 對於屬於 CLI 方言的請求範圍 argv 重寫（例如將 OpenClaw 思考等級映射到原生努力旗標），請使用 `resolveExecutionArgs`。

如需端到端的編寫指南，請參閱 [CLI 後端插件](/zh-Hant/plugins/cli-backend-plugins)。

### 專屬插槽

| 方法                                       | 註冊內容                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次啟用一個）。`assemble()` 回呼接收 `availableTools` 和 `citationsMode`，以便引擎可以自訂提示詞附加內容。 |
| `api.registerMemoryCapability(capability)` | 統一記憶體能力                                                                                                          |
| `api.registerMemoryPromptSection(builder)` | 記憶體提示區段建構器                                                                                                    |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶體排空計畫解析器                                                                                                    |
| `api.registerMemoryRuntime(runtime)`       | 記憶體執行時適配器                                                                                                      |

### 記憶體嵌入適配器

| 方法                                           | 註冊內容                         |
| ---------------------------------------------- | -------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 作用中外掛程式的記憶體嵌入適配器 |

- `registerMemoryCapability` 是首選的專用記憶體外掛程式 API。
- `registerMemoryCapability` 也可以公開 `publicArtifacts.listArtifacts(...)`
  以便伴隨外掛程式可以透過 `openclaw/plugin-sdk/memory-host-core` 消費匯出的記憶體成果，
  而不必存取特定記憶體外掛程式的私人配置。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是相容舊版的專用記憶體外掛程式 API。
- `MemoryFlushPlan.model` 可以將排空輪次釘選到確切的 `provider/model`
  參考（例如 `ollama/qwen3:8b`），而不繼承作用中的後援鏈。
- `registerMemoryEmbeddingProvider` 允許作用中的記憶體外掛程式註冊一個
  或多個嵌入適配器 ID（例如 `openai`、`gemini` 或自訂
  外掛程式定義的 ID）。
- 使用者配置（如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）會根據這些已註冊的適配器 ID 進行解析。

### 事件與生命週期

| 方法                                         | 功能                |
| -------------------------------------------- | ------------------- |
| `api.on(hookName, handler, opts?)`           | 類型化生命週期 Hook |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼        |

請參閱 [外掛程式 Hooks](/zh-Hant/plugins/hooks) 以了解範例、常見 Hook 名稱和防衛語意。

### Hook 決策語意

- `before_tool_call`：傳回 `{ block: true }` 即為終止。一旦任何處理程式設定了它，優先順序較低的處理程式將被跳過。
- `before_tool_call`：傳回 `{ block: false }` 被視為未作決定（與省略 `block` 相同），而非覆寫。
- `before_install`：傳回 `{ block: true }` 即為終止。一旦任何處理程式設定了它，優先順序較低的處理程式將被跳過。
- `before_install`：返回 `{ block: false }` 被視為不作決定（與省略 `block` 相同），而非覆寫。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是終止性的。一旦任何處理器聲明分派，優先級較低的處理器和預設模型分派路徑將被跳過。
- `message_sending`：返回 `{ cancel: true }` 是終止性的。一旦任何處理器設定了它，優先級較低的處理器將被跳過。
- `message_sending`：返回 `{ cancel: false }` 被視為不作決定（與省略 `cancel` 相同），而非覆寫。
- `message_received`：當您需要入站執行緒/主題路由時，請使用類型化的 `threadId` 欄位。保留 `metadata` 用於特定頻道的額外內容。
- `message_sending`：在回退到特定頻道的 `metadata` 之前，請使用類型化的 `replyToId` / `threadId` 路由欄位。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 來管理閘道擁有的啟動狀態，而不是依賴內部的 `gateway:startup` 掛鉤。
- `cron_changed`：觀察閘道擁有的 cron 生命週期變化。在同步外部喚醒排程器時使用 `event.job?.state?.nextRunAtMs` 和 `ctx.getCron?.()`，並將 OpenClaw 保持為到期檢查和執行的唯一真實來源。

### API 物件欄位

| 欄位                     | 類型                      | 描述                                                              |
| ------------------------ | ------------------------- | ----------------------------------------------------------------- |
| `api.id`                 | `string`                  | Plugin id                                                         |
| `api.name`               | `string`                  | 顯示名稱                                                          |
| `api.version`            | `string?`                 | Plugin version (optional)                                         |
| `api.description`        | `string?`                 | Plugin description (optional)                                     |
| `api.source`             | `string`                  | Plugin source path                                                |
| `api.rootDir`            | `string?`                 | 外掛程式根目錄（可選）                                            |
| `api.config`             | `OpenClawConfig`          | 目前設定快照（可用時為活躍的記憶體內執行時快照）                  |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的外掛程式特定設定             |
| `api.runtime`            | `PluginRuntime`           | [執行時輔助程式](/zh-Hant/plugins/sdk-runtime)                         |
| `api.logger`             | `PluginLogger`            | 範圍日誌記錄器（`debug`、`info`、`warn`、`error`）                |
| `api.registrationMode`   | `PluginRegistrationMode`  | 目前載入模式；`"setup-runtime"` 是輕量級的完整進入前啟動/設定視窗 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛程式根目錄的路徑                                    |

## 內部模組慣例

在您的外掛程式內，請使用本機 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  請勿從生產程式碼透過 `openclaw/plugin-sdk/<your-plugin>` 匯入您自己的
  外掛程式。請透過 `./api.ts` 或 `./runtime-api.ts`
  路由內部匯入。SDK 路徑僅為外部合約。
</Warning>

由 Facade 載入的捆綁外掛程式公開表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 及類似的公開進入檔案）在 OpenClaw
正在執行時，偏好使用活躍的執行時設定快照。如果執行時快照尚不存在，它們會退回到
磁碟上的解析設定檔。打包的捆綁外掛程式 Facade 應透過 OpenClaw 的外掛程式
Facade 載入器載入；從 `dist/extensions/...` 直接匯入會繞過清單
和執行時 Sidecar 檢查，而這些是打包安裝用於外掛程式擁有程式碼的檢查。

當輔助程式故意提供者特定且尚不屬於通用 SDK 子路徑時，提供者外掛程式可以
公開一個狹窄的外掛程式本機合約 barrel。捆綁範例：

- **Anthropic**：Claude 的公開 `api.ts` / `contract-api.ts` 接縫，以及 beta-header 和 `service_tier` 串流輔助函式。
- **`@openclaw/openai-provider`**：`api.ts` 匯出提供者建構器、預設模型輔助函式和即時提供者建構器。
- **`@openclaw/openrouter-provider`**：`api.ts` 匯出提供者建構器以及入門/設定輔助函式。

<Warning>
  擴充功能的正式程式碼也應避免使用 `openclaw/plugin-sdk/<other-plugin>`
  匯入。如果輔助函式是真正共用的，請將其提升至中立的 SDK 子路徑，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  以功能為導向的介面，而不是將兩個外掛程式耦合在一起。
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
    打包、清單與組態綱要。
  </Card>
  <Card title="測試" icon="vial" href="/zh-Hant/plugins/sdk-testing">
    測試工具程式與 Lint 規則。
  </Card>
  <Card title="SDK 遷移" icon="arrows-turn-right" href="/zh-Hant/plugins/sdk-migration">
    從已淘汰的介面遷移。
  </Card>
  <Card title="Plugin internals" icon="diagram-project" href="/zh-Hant/plugins/architecture">
    深層架構與功能模型。
  </Card>
</CardGroup>
