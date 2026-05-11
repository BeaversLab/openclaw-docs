---
summary: "Import map、註冊 API 參考以及 SDK 架構"
title: "Plugin SDK 概覽"
sidebarTitle: "SDK 概覽"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

Plugin SDK 是外掛與核心之間的類型合約。本頁面提供關於 **要匯入什麼** 以及 **您可以註冊什麼** 的參考。

<Tip>
  改在尋找操作指南嗎？

- 第一次製作外掛？請從[建置外掛](/zh-Hant/plugins/building-plugins)開始。
- Channel 外掛？請參閱 [Channel 外掛](/zh-Hant/plugins/sdk-channel-plugins)。
- Provider 外掛？請參閱 [Provider 外掛](/zh-Hant/plugins/sdk-provider-plugins)。
- 工具或生命週期掛鉤外掛？請參閱 [外掛掛鉤](/zh-Hant/plugins/hooks)。
  </Tip>

## 匯入慣例

請務必從特定的子路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每個子路徑都是一個小型、獨立的模組。這能保持快速啟動並防止循環相依性問題。對於特定於 channel 的進入點/建置輔助程式，建議優先使用 `openclaw/plugin-sdk/channel-core`；將 `openclaw/plugin-sdk/core` 保留給更廣泛的總體介面和共享輔助程式，例如 `buildChannelConfigSchema`。

對於 channel 設定，請透過 `openclaw.plugin.json#channelConfigs` 發布 channel 擁有的 JSON Schema。`plugin-sdk/channel-config-schema` 子路徑是用於共享的 schema 基本型別和通用建構器。已棄用的 bundle-channel schema 匯出項目位於 `plugin-sdk/channel-config-schema-legacy` 上，僅用於 bundle 相容性；它們不是新外掛的模式。

<Warning>
  不要匯入 provider 或 channel 品牌的便捷縫合層（例如
  `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`）。
  內建插件在其自己的 `api.ts` /
  `runtime-api.ts` 桶中組合通用 SDK 子路徑；核心消費者應該使用這些插件本地的
  桶，或者在需求真正跨 channel 時新增一個狹窄的通用 SDK 契約。

一小部分內建插件輔助縫合層（`plugin-sdk/feishu`、
`plugin-sdk/zalo`、`plugin-sdk/matrix*` 和類似內容）仍然出現在
生成的匯出映射中。它們僅供內建插件維護使用，不推薦
作為新的第三方插件的匯入路徑。

</Warning>

## 子路徑參考

插件 SDK 暴露為一組按區域（插件
入口、channel、provider、auth、runtime、capability、memory 和保留的
內建插件輔助程式）分組的狹窄子路徑。如需完整目錄——已分組並連結——請參閱
[Plugin SDK subpaths](/zh-Hant/plugins/sdk-subpaths)。

生成的 200 多個子路徑列表位於 `scripts/lib/plugin-sdk-entrypoints.json` 中。

## 註冊 API

`register(api)` 回調接收一個具有這些
方法的 `OpenClawPluginApi` 物件：

### 功能註冊

| 方法                                             | 註冊內容               |
| ------------------------------------------------ | ---------------------- |
| `api.registerProvider(...)`                      | 文字推斷 (LLM)         |
| `api.registerAgentHarness(...)`                  | 實驗性低階代理執行器   |
| `api.registerCliBackend(...)`                    | 本機 CLI 推斷後端      |
| `api.registerChannel(...)`                       | 訊息傳遞 Channel       |
| `api.registerSpeechProvider(...)`                | 文字轉語音 / STT 合成  |
| `api.registerRealtimeTranscriptionProvider(...)` | 串流即時轉錄           |
| `api.registerRealtimeVoiceProvider(...)`         | 雙工即時語音會話       |
| `api.registerMediaUnderstandingProvider(...)`    | 圖片/音訊/影片分析     |
| `api.registerImageGenerationProvider(...)`       | 圖片生成               |
| `api.registerMusicGenerationProvider(...)`       | 音樂生成               |
| `api.registerVideoGenerationProvider(...)`       | 影片生成               |
| `api.registerWebFetchProvider(...)`              | 網頁擷取/爬取 Provider |
| `api.registerWebSearchProvider(...)`             | 網路搜尋               |

### 工具與指令

| 方法                            | 註冊內容                                |
| ------------------------------- | --------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自訂指令（繞過 LLM）                    |

當代理需要一個簡短的、由指令擁有的路由提示時，外掛指令可以設定 `agentPromptGuidance`。請將該文字保持在指令本身；不要將提供者或外掛特定的策略新增到核心提示建構器中。

### 基礎架構

| 方法                                           | 註冊內容                    |
| ---------------------------------------------- | --------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件掛鉤                    |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端點           |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法            |
| `api.registerGatewayDiscoveryService(service)` | 本機 Gateway 探索廣告器     |
| `api.registerCli(registrar, opts?)`            | CLI 子指令                  |
| `api.registerService(service)`                 | 背景服務                    |
| `api.registerInteractiveHandler(registration)` | 互動處理程序                |
| `api.registerAgentToolResultMiddleware(...)`   | 執行時期工具結果中介軟體    |
| `api.registerMemoryPromptSupplement(builder)`  | 新增的記憶體相鄰提示區段    |
| `api.registerMemoryCorpusSupplement(adapter)`  | 新增的記憶體搜尋/讀取語料庫 |

<Note>保留的核心管理員命名空間（`config.*`、`exec.approvals.*`、`wizard.*`、 `update.*`）將始終保持 `operator.admin`，即使外掛嘗試指派 更狹窄的 Gateway 方法範圍。對於外掛擁有的方法，建議使用外掛特定的前綴。</Note>

<Accordion title="何時使用工具結果中介軟體">
  當套件外掛需要在執行後、執行時期將結果饋送回模型之前重寫工具結果時，可以使用 `api.registerAgentToolResultMiddleware(...)`。這是受信任的執行時期中立縫隙，適用於 tokenjuice 等非同步輸出減速器。

套件外掛必須為每個目標執行時期宣告 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`。外部外掛無法註冊此中介軟體；對於不需要模型前工具結果時機的工作，請保留正常的 OpenClaw 外掛掛鉤。僅適用於 Pi 的舊式內嵌擴充功能工廠註冊路徑已被移除。

</Accordion>

### Gateway 探索註冊

`api.registerGatewayDiscoveryService(...)` 讓外掛程式在本地探索傳輸（例如 mDNS/Bonjour）上通告作用中的
Gateway。當啟用本地探索時，OpenClaw 會在 Gateway 啟動期間呼叫此服務，
傳遞目前的 Gateway 連接埠和非機密 TXT 提示資料，並在 Gateway 關閉期間呼叫傳回的
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
驗證資訊。探索是一個路由提示；Gateway 驗證和 TLS 釘選仍然
擁有信任權。

### CLI 註冊元資料

`api.registerCli(registrar, opts?)` 接受兩種頂層元資料：

- `commands`：由註冊器擁有的明確命令根
- `descriptors`：用於根 CLI 說明、
  路由和延遲外掛 CLI 註冊的剖析時命令描述項

如果您希望外掛程式命令在正常根 CLI 路徑中保持延遲載入，
請提供涵蓋該註冊器所公開每個頂層命令根的 `descriptors`。

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

僅當您不需要延遲根 CLI 註冊時，才單獨使用 `commands`。
該積極相容路徑仍受支援，但它不會安裝
用於剖析時延遲載入的描述項支援預留位置。

### CLI 後端註冊

`api.registerCliBackend(...)` 讓外掛程式擁有本地
AI CLI 後端（例如 `codex-cli`）的預設組態。

- 後端 `id` 會成為模型參考（例如 `codex-cli/gpt-5`）中的提供者前綴。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的形狀。
- 使用者組態仍然優先。OpenClaw 會在執行 CLI 之前，將
  `agents.defaults.cliBackends.<id>` 合併到外掛程式預設值之上。
- 當後端在合併後需要相容性重寫時
  （例如正規化舊的旗標形狀），請使用 `normalizeConfig`。

### 專用插槽

| 方法                                       | 註冊內容                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 內容引擎 (一次啟用一個)。`assemble()` 回呼會接收 `availableTools` 和 `citationsMode`，以便引擎可以調整提示新增項目。 |
| `api.registerMemoryCapability(capability)` | 統一記憶體功能                                                                                                       |
| `api.registerMemoryPromptSection(builder)` | 記憶體提示區塊建構器                                                                                                 |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶體清除計畫解析器                                                                                                 |
| `api.registerMemoryRuntime(runtime)`       | 記憶體執行適配器                                                                                                     |

### 記憶體嵌入適配器

| 方法                                           | 註冊內容                         |
| ---------------------------------------------- | -------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 作用中外掛程式的記憶體嵌入適配器 |

- `registerMemoryCapability` 是首選的專屬記憶體外掛 API。
- `registerMemoryCapability` 也可以公開 `publicArtifacts.listArtifacts(...)`，
  以便伴隨外掛程式可以透過 `openclaw/plugin-sdk/memory-host-core` 取用匯出的記憶體成果，
  而不需深入特定記憶體外掛程式的私有配置。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是相容舊版的專屬記憶體外掛 API。
- `registerMemoryEmbeddingProvider` 讓作用中的記憶體外掛程式註冊一個
  或多個嵌入適配器 ID (例如 `openai`、`gemini` 或自訂
  外掛定義的 ID)。
- 使用者設定 (例如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`) 會針對這些已註冊的
  適配器 ID 進行解析。

### 事件與生命週期

| 方法                                         | 用途               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 型別化生命週期鉤子 |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼       |

請參閱 [外掛鉤子](/zh-Hant/plugins/hooks) 以了解範例、常見鉤子名稱和防護
語意。

### 鉤子決策語意

- `before_tool_call`：傳回 `{ block: true }` 即為終止。一旦有任何處理程式設定它，優先順序較低的處理程式將會被跳過。
- `before_tool_call`：傳回 `{ block: false }` 會被視為無決定 (與省略 `block` 相同)，而非覆寫。
- `before_install`：傳回 `{ block: true }` 即為終止。一旦有任何處理程式設定它，優先順序較低的處理程式將會被跳過。
- `before_install`：傳回 `{ block: false }` 會被視為無決定 (與省略 `block` 相同)，而非覆寫。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是終止性的。一旦任何處理程式宣稱了分派，較低優先級的處理程式和預設模型分派路徑將被跳過。
- `message_sending`：返回 `{ cancel: true }` 是終止性的。一旦任何處理程式設定了它，較低優先級的處理程式將被跳過。
- `message_sending`：返回 `{ cancel: false }` 被視為未做決定（與省略 `cancel` 相同），而不是覆寫。
- `message_received`：當您需要入站執行緒/主題路由時，請使用類型化的 `threadId` 欄位。將 `metadata` 用於特定頻道的額外內容。
- `message_sending`：在回退到特定頻道的 `metadata` 之前，使用類型化的 `replyToId` / `threadId` 路由欄位。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 來處理閘道擁有的啟動狀態，而不是依賴內部的 `gateway:startup` hooks。

### API 物件欄位

| 欄位                     | 類型                      | 描述                                                                       |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Plugin id                                                                  |
| `api.name`               | `string`                  | 顯示名稱                                                                   |
| `api.version`            | `string?`                 | Plugin version (optional)                                                  |
| `api.description`        | `string?`                 | Plugin description (optional)                                              |
| `api.source`             | `string`                  | Plugin source path                                                         |
| `api.rootDir`            | `string?`                 | Plugin root directory (optional)                                           |
| `api.config`             | `OpenClawConfig`          | Current config snapshot (active in-memory runtime snapshot when available) |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的 Plugin-specific config               |
| `api.runtime`            | `PluginRuntime`           | [Runtime helpers](/zh-Hant/plugins/sdk-runtime)                                 |
| `api.logger`             | `PluginLogger`            | 作用域記錄器 (`debug`, `info`, `warn`, `error`)                            |
| `api.registrationMode`   | `PluginRegistrationMode`  | 目前載入模式；`"setup-runtime"` 是完整進入啟動/設定視窗之前的輕量級階段    |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛根目錄的路徑                                                 |

## 內部模組慣例

在您的外掛中，請使用本機 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  絕對不要在生產程式碼中透過 `openclaw/plugin-sdk/<your-plugin>`
  匯入您自己的外掛。請透過 `./api.ts` 或
  `./runtime-api.ts` 路由內部匯入。SDK 路徑僅供外部契約使用。
</Warning>

Facade 載入的套件外掛公開表面 (`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts`, 以及類似的公開進入檔案) 在 OpenClaw 已運行時偏好使用有效的執行時設定快照。如果尚未存在執行時快照，它們會回退到磁碟上解析的設定檔。

當輔助函式特意為提供者專有且尚不屬於通用 SDK 子路徑時，提供者外掛可以公開一個狹窄的外掛本機契約 barrel。套件範例：

- **Anthropic**：公開 `api.ts` / `contract-api.ts` 介面，用於 Claude
  beta-header 和 `service_tier` 資料流輔助函式。
- **`@openclaw/openai-provider`**：`api.ts` 匯出提供者建構器、
  預設模型輔助函式和即時提供者建構器。
- **`@openclaw/openrouter-provider`**：`api.ts` 匯出提供者建構器
  以及上架/設定輔助函式。

<Warning>
  擴充功能生產程式碼也應避免 `openclaw/plugin-sdk/<other-plugin>`
  匯入。如果輔助函式確實是共享的，請將其提升為中立的 SDK 子路徑，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  面向功能的表面，而不是將兩個外掛耦合在一起。
</Warning>

## 相關

<CardGroup cols={2}>
  <Card title="進入點" icon="door-open" href="/zh-Hant/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 選項。
  </Card>
  <Card title="執行時期輔助函式" icon="gears" href="/zh-Hant/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空間參考。
  </Card>
  <Card title="設定與配置" icon="sliders" href="/zh-Hant/plugins/sdk-setup">
    打包、清單與配置結構描述。
  </Card>
  <Card title="測試" icon="vial" href="/zh-Hant/plugins/sdk-testing">
    測試工具程式與 Lint 規則。
  </Card>
  <Card title="SDK 遷移" icon="arrows-turn-right" href="/zh-Hant/plugins/sdk-migration">
    從已淘汰的介面進行遷移。
  </Card>
  <Card title="外掛程式內部運作" icon="diagram-project" href="/zh-Hant/plugins/architecture">
    深層架構與功能模型。
  </Card>
</CardGroup>
