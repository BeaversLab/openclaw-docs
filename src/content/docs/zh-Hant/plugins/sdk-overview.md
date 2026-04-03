---
title: "Plugin SDK 概觀"
sidebarTitle: "SDK 概觀"
summary: "匯入對應表、註冊 API 參考資料，以及 SDK 架構"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

# Plugin SDK 概觀

Plugin SDK 是外掛與核心之間的型別合約。此頁面是關於**要匯入什麼**以及**您可以註冊什麼**的參考。

<Tip>**正在尋找操作指南？** - 第一個外掛程式？從[開始使用](/en/plugins/building-plugins)開始 - 頻道外掛程式？請參閱[頻道外掛程式](/en/plugins/sdk-channel-plugins) - 提供者外掛程式？請參閱[提供者外掛程式](/en/plugins/sdk-provider-plugins)</Tip>

## 匯入慣例

請務必從特定的子路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
```

每個子路徑都是一個小型的自包含模組。這可以保持啟動速度並防止循環相依性問題。

## 子路徑參考

依用途分組的最常用子路徑。包含 100 多個子路徑的完整清單位於 `scripts/lib/plugin-sdk-entrypoints.json`。

### 外掛入口點

| 子路徑                    | 主要匯出                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry` | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`         | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema` |

<AccordionGroup>
  <Accordion title="Channel subpaths">
    | Subpath | Key exports |
    | --- | --- |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface` |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 頻道設定結構描述類型 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/channel-inbound` | 防抖動、提及相符、信封輔助程式 |
    | `plugin-sdk/channel-send-result` | 回覆結果類型 |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | 目標解析/相符輔助程式 |
    | `plugin-sdk/channel-contract` | 頻道合約類型 |
    | `plugin-sdk/channel-feedback` | 意見反應/反應連線 |
  </Accordion>

<Accordion title="Provider 子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 監看常數 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`, `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile` | | `plugin-sdk/provider-model-shared` | `normalizeModelCompat` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog` | |
  `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及類似內容 | | `plugin-sdk/provider-stream` | 串流包裝器類型 | | `plugin-sdk/provider-onboard` | 入門設定修補輔助程式 | | `plugin-sdk/global-singleton` | 行程本機單例/對映/快取輔助程式 |
</Accordion>

<Accordion title="驗證與安全性子路徑">| 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/secret-input` | 密鑰輸入解析輔助程式 | | `plugin-sdk/webhook-ingress` | Webhook 請求/目標輔助程式 | | `plugin-sdk/webhook-request-guards` | 請求主體大小/逾時輔助程式 |</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | Config load/write helpers | | `plugin-sdk/approval-runtime` | Exec and plugin approval helpers | | `plugin-sdk/infra-runtime` | System event/heartbeat helpers | | `plugin-sdk/collection-runtime` | Small bounded cache helpers | | `plugin-sdk/diagnostic-runtime` |
  Diagnostic flag and event helpers | | `plugin-sdk/error-runtime` | Error graph and formatting helpers | | `plugin-sdk/fetch-runtime` | Wrapped fetch, proxy, and pinned lookup helpers | | `plugin-sdk/host-runtime` | Hostname and SCP host normalization helpers | | `plugin-sdk/retry-runtime` | Retry config and retry runner helpers | | `plugin-sdk/agent-runtime` | Agent dir/identity/workspace
  helpers | | `plugin-sdk/directory-runtime` | Config-backed directory query/dedup | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

  <Accordion title="Capability and testing subpaths">
    | Subpath | Key exports |
    | --- | --- |
    | `plugin-sdk/image-generation` | Image generation provider types |
    | `plugin-sdk/media-understanding` | Media understanding provider types |
    | `plugin-sdk/speech` | Speech provider types |
    | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
  </Accordion>
</AccordionGroup>

## 註冊 API

The `register(api)` callback receives an `OpenClawPluginApi` object with these
methods:

### 功能註冊

| 方法                                          | 註冊內容              |
| --------------------------------------------- | --------------------- |
| `api.registerProvider(...)`                   | 文字推論 (LLM)        |
| `api.registerCliBackend(...)`                 | 本機 CLI 推理後端     |
| `api.registerChannel(...)`                    | 訊息頻道              |
| `api.registerSpeechProvider(...)`             | 文字轉語音 / STT 合成 |
| `api.registerMediaUnderstandingProvider(...)` | 圖像/音訊/視訊分析    |
| `api.registerImageGenerationProvider(...)`    | 圖像生成              |
| `api.registerWebSearchProvider(...)`          | 網路搜尋              |

### 工具與指令

| 方法                            | 註冊內容                                      |
| ------------------------------- | --------------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent tool (required or `{ optional: true }`) |
| `api.registerCommand(def)`      | 自訂指令（繞過 LLM）                          |

### 基礎架構

| 方法                                           | 註冊內容       |
| ---------------------------------------------- | -------------- |
| `api.registerHook(events, handler, opts?)`     | 事件掛鉤       |
| `api.registerHttpRoute(params)`                | 閘道 HTTP 端點 |
| `api.registerGatewayMethod(name, handler)`     | 閘道 RPC 方法  |
| `api.registerCli(registrar, opts?)`            | CLI 子指令     |
| `api.registerService(service)`                 | 背景服務       |
| `api.registerInteractiveHandler(registration)` | 互動式處理程序 |

### CLI 註冊元數據

`api.registerCli(registrar, opts?)` 接受兩種頂層元數據：

- `commands`：由註冊器擁有的顯式命令根
- `descriptors`：用於根 CLI 說明、路由和延遲加載插件 CLI 註冊的解析時命令描述符

如果您希望插件命令在正常的根 CLI 路徑中保持延遲加載狀態，
請提供涵蓋該註冊器暴露的每個頂層命令根的 `descriptors`。

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
該急切相容性路徑仍受支援，但它不會為解析時延遲加載
安裝由描述符支援的佔位符。

### CLI 後端註冊

`api.registerCliBackend(...)` 允許插件擁有本地
AI CLI 後端（例如 `claude-cli` 或 `codex-cli`）的預設配置。

- 後端 `id` 會成為模型參考（如 `claude-cli/opus`）中的提供者前綴。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的形狀。
- 用戶配置優先。OpenClaw 會在運行 CLI 之前將 `agents.defaults.cliBackends.<id>` 合併到
  插件預設配置之上。
- 當後端在合併後需要相容性重寫時（例如標準化舊的標誌形狀），
  請使用 `normalizeConfig`。

### 獨佔槽位

| 方法                                       | 註冊內容                   |
| ------------------------------------------ | -------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次啟用一個） |
| `api.registerMemoryPromptSection(builder)` | 記憶提示區段構建器         |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶刷新計劃解析器         |
| `api.registerMemoryRuntime(runtime)`       | 記憶運行時適配器           |

### 記憶嵌入適配器

| 方法                                           | 註冊內容                     |
| ---------------------------------------------- | ---------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 用於活動插件的記憶嵌入適配器 |

- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是記憶插件專用的。
- `registerMemoryEmbeddingProvider` 讓使用中的記憶體插件註冊一個或多個嵌入介面卡 ID（例如 `openai`、`gemini` 或自訂的插件定義 ID）。
- 使用者設定（如 `agents.defaults.memorySearch.provider` 和 `agents.defaults.memorySearch.fallback`）會根據這些已註冊的介面卡 ID 進行解析。

### 事件與生命週期

| 方法                                         | 用途               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 型別化生命週期鉤子 |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼       |

### 鉤子決定語意

- `before_tool_call`：傳回 `{ block: true }` 即為終止。一旦有任何處理程式設定了該值，優先順序較低的處理程式將會被跳過。
- `before_tool_call`：傳回 `{ block: false }` 被視為無決定（等同於省略 `block`），而非覆寫。
- `before_install`：傳回 `{ block: true }` 即為終止。一旦有任何處理程式設定了該值，優先順序較低的處理程式將會被跳過。
- `before_install`：傳回 `{ block: false }` 被視為無決定（等同於省略 `block`），而非覆寫。
- `message_sending`：傳回 `{ cancel: true }` 即為終止。一旦有任何處理程式設定了該值，優先順序較低的處理程式將會被跳過。
- `message_sending`：傳回 `{ cancel: false }` 被視為無決定（等同於省略 `cancel`），而非覆寫。

### API 物件欄位

| 欄位                     | 型別                      | 描述                                                             |
| ------------------------ | ------------------------- | ---------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                                          |
| `api.name`               | `string`                  | 顯示名稱                                                         |
| `api.version`            | `string?`                 | 插件版本（選填）                                                 |
| `api.description`        | `string?`                 | 插件描述（選填）                                                 |
| `api.source`             | `string`                  | 插件來源路徑                                                     |
| `api.rootDir`            | `string?`                 | 插件根目錄（選填）                                               |
| `api.config`             | `OpenClawConfig`          | 目前的設定快照                                                   |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的外掛程式專屬設定            |
| `api.runtime`            | `PluginRuntime`           | [Runtime helpers](/en/plugins/sdk-runtime)                       |
| `api.logger`             | `PluginLogger`            | 範圍日誌記錄器 (`debug`, `info`, `warn`, `error`)                |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`, `"setup-only"`, `"setup-runtime"`, 或 `"cli-metadata"` |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛程式根目錄的路徑                                   |

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
  請勿從生產程式碼透過 `openclaw/plugin-sdk/<your-plugin>` 匯入您自己的外掛程式。
  請透過 `./api.ts` 或
  `./runtime-api.ts` 來傳遞內部匯入。SDK 路徑僅作為外部合約使用。
</Warning>

<Warning>
  擴充功能的生產程式碼也應避免 `openclaw/plugin-sdk/<other-plugin>`
  匯入。如果輔助程式確實是共用的，請將其升級至中立的 SDK 子路徑
  （例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  面向功能的介面），而不是將兩個外掛程式耦合在一起。
</Warning>

## 相關

- [Entry Points](/en/plugins/sdk-entrypoints) — `definePluginEntry` 與 `defineChannelPluginEntry` 選項
- [Runtime Helpers](/en/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空間參考
- [Setup and Config](/en/plugins/sdk-setup) — 打包、清單、設定架構
- [Testing](/en/plugins/sdk-testing) — 測試工具程式與 lint 規則
- [SDK Migration](/en/plugins/sdk-migration) — 從已棄用的介面進行遷移
- [Plugin Internals](/en/plugins/architecture) — 深度架構與功能模型
