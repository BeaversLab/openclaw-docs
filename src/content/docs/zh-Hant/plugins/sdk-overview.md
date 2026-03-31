---
title: "Plugin SDK 概觀"
sidebarTitle: "SDK 概觀"
summary: "匯入映射、註冊 API 參考以及 SDK 架構"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

# Plugin SDK 概觀

Plugin SDK 是外掛與核心之間的型別合約。此頁面是關於**要匯入什麼**以及**您可以註冊什麼**的參考。

<Tip>**正在尋找操作指南？** - 第一個外掛程式？從 [開始使用](/en/plugins/building-plugins) 開始 - 頻道外掛程式？參閱 [頻道外掛程式](/en/plugins/sdk-channel-plugins) - 提供者外掛程式？參閱 [提供者外掛程式](/en/plugins/sdk-provider-plugins)</Tip>

## 匯入慣例

請務必從特定的子路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
```

每個子路徑都是一個小型的自包含模組。這可以保持啟動速度並防止循環相依性問題。

## 子路徑參考

最常用的子路徑，按用途分組。100 多個子路徑的完整列表在 `scripts/lib/plugin-sdk-entrypoints.json` 中。

### 外掛入口點

| 子路徑                    | 主要匯出                                                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry` | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`         | `defineChannelPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase`、`defineSetupPluginEntry`、`buildChannelConfigSchema` |

<AccordionGroup>
  <Accordion title="通道子路徑">
    | Subpath | Key exports |
    | --- | --- |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface` |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 通道配置結構類型 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/channel-inbound` | Debounce、提及匹配、信封輔助函數 |
    | `plugin-sdk/channel-send-result` | 回覆結果類型 |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`、`createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | 目標解析/匹配輔助函數 |
    | `plugin-sdk/channel-contract` | 通道合約類型 |
    | `plugin-sdk/channel-feedback` | 反饋/反應連線 |
  </Accordion>

<Accordion title="Provider subpaths">
  | 子路徑 | 主要匯出項 | | --- | --- | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 監看常數 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile` | | `plugin-sdk/provider-models` | 舊版相容提供者模型別名；建議優先使用特定提供者子路徑或 `plugin-sdk/provider-model-shared` | | `plugin-sdk/provider-model-shared` |
  `normalizeModelCompat` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog` | | `plugin-sdk/provider-catalog` | 舊版相容提供者建構器別名；建議優先使用特定提供者子路徑或 `plugin-sdk/provider-catalog-shared` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及類似項目 | | `plugin-sdk/provider-stream` | 串流包裝器型別 | |
  `plugin-sdk/provider-onboard` | Onboarding 設定修補輔助程式 | | `plugin-sdk/global-singleton` | 程序本機單例/映射/快取輔助程式 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/secret-input` | Secret input parsing helpers | | `plugin-sdk/webhook-ingress` | Webhook request/target helpers | | `plugin-sdk/webhook-request-guards` | Request body size/timeout helpers |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | Config load/write helpers | | `plugin-sdk/approval-runtime` | Exec and plugin approval helpers | | `plugin-sdk/infra-runtime` | System event/heartbeat helpers | | `plugin-sdk/collection-runtime` | Small bounded cache helpers | | `plugin-sdk/diagnostic-runtime` |
  Diagnostic flag and event helpers | | `plugin-sdk/error-runtime` | Error graph and formatting helpers | | `plugin-sdk/fetch-runtime` | Wrapped fetch, proxy, and pinned lookup helpers | | `plugin-sdk/host-runtime` | Hostname and SCP host normalization helpers | | `plugin-sdk/retry-runtime` | Retry config and retry runner helpers | | `plugin-sdk/agent-runtime` | Agent dir/identity/workspace
  helpers | | `plugin-sdk/directory-runtime` | Config-backed directory query/dedup | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

  <Accordion title="Capability and testing subpaths">
    | Subpath | Key exports |
    | --- | --- |
    | `plugin-sdk/image-generation` | 圖像生成提供者類型 |
    | `plugin-sdk/media-understanding` | 媒體理解提供者類型 |
    | `plugin-sdk/speech` | 語音提供者類型 |
    | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`、 `shouldAckReaction` |
  </Accordion>
</AccordionGroup>

## 註冊 API

`register(api)` 回呼函式會接收一個包含這些方法的 `OpenClawPluginApi` 物件：

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

| 方法                            | 註冊內容                                |
| ------------------------------- | --------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理工具（必要或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自訂指令（繞過 LLM）                    |

### 基礎架構

| 方法                                           | 註冊內容       |
| ---------------------------------------------- | -------------- |
| `api.registerHook(events, handler, opts?)`     | 事件掛鉤       |
| `api.registerHttpRoute(params)`                | 閘道 HTTP 端點 |
| `api.registerGatewayMethod(name, handler)`     | 閘道 RPC 方法  |
| `api.registerCli(registrar, opts?)`            | CLI 子指令     |
| `api.registerService(service)`                 | 背景服務       |
| `api.registerInteractiveHandler(registration)` | 互動式處理程序 |

### CLI 後端註冊

`api.registerCliBackend(...)` 允許外掛程式擁有本地 AI CLI 後端（例如 `claude-cli` 或 `codex-cli`）的預設設定。

- 後端 `id` 會成為模型參考中的提供者前綴，例如 `claude-cli/opus`。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的結構。
- 使用者設定仍優先。OpenClaw 會在執行 CLI 前，將 `agents.defaults.cliBackends.<id>` 合併到外掛預設值之上。
- 當後端在合併後需要相容性重寫（例如正規化舊的旗標結構）時，請使用 `normalizeConfig`。

### 互斥插槽

| 方法                                       | 註冊內容                 |
| ------------------------------------------ | ------------------------ |
| `api.registerContextEngine(id, factory)`   | 情境引擎（一次一個啟用） |
| `api.registerMemoryPromptSection(builder)` | 記憶體提示區段建構器     |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶體清除計畫解析器     |
| `api.registerMemoryRuntime(runtime)`       | 記憶體執行時適配器       |

### 記憶體嵌入適配器

| 方法                                           | 註冊內容                         |
| ---------------------------------------------- | -------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 作用中外掛程式的記憶體嵌入介面卡 |

- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是記憶體外掛程式專用的。
- `registerMemoryEmbeddingProvider` 讓作用中的記憶體外掛程式註冊一個
  或多個嵌入介面卡 ID（例如 `openai`、`gemini` 或自訂
  外掛程式定義的 ID）。
- 使用者設定（例如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）會根據這些已註冊的
  介面卡 ID 進行解析。

### 事件與生命週期

| 方法                                         | 說明               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 型別化生命週期鉤子 |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼       |

### 鉤子決定語意

- `before_tool_call`：傳回 `{ block: true }` 是終止性的。一旦任何處理程式設定了它，優先順序較低的處理程式將會被略過。
- `before_tool_call`：傳回 `{ block: false }` 被視為不決定（與省略 `block` 相同），而不是覆寫。
- `message_sending`：傳回 `{ cancel: true }` 是終止性的。一旦任何處理程式設定了它，優先順序較低的處理程式將會被略過。
- `message_sending`：傳回 `{ cancel: false }` 被視為不決定（與省略 `cancel` 相同），而不是覆寫。

### API 物件欄位

| 欄位                     | 類型                      | 描述                                                  |
| ------------------------ | ------------------------- | ----------------------------------------------------- |
| `api.id`                 | `string`                  | Plugin id                                             |
| `api.name`               | `string`                  | 顯示名稱                                              |
| `api.version`            | `string?`                 | 外掛程式版本（選用）                                  |
| `api.description`        | `string?`                 | 外掛程式描述（選用）                                  |
| `api.source`             | `string`                  | 外掛程式來源路徑                                      |
| `api.rootDir`            | `string?`                 | 外掛程式根目錄（選用）                                |
| `api.config`             | `OpenClawConfig`          | 目前配置快照                                          |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的外掛程式特定配置 |
| `api.runtime`            | `PluginRuntime`           | [執行時期輔助函式](/en/plugins/sdk-runtime)           |
| `api.logger`             | `PluginLogger`            | 限定範圍的記錄器 (`debug`, `info`, `warn`, `error`)   |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`, `"setup-only"`, 或 `"setup-runtime"`        |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛根目錄的路徑                            |

## 內部模組慣例

在你的外掛中，使用本地的 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  切勿在生產程式碼中透過 `openclaw/plugin-sdk/<your-plugin>`
  匯入你自己的外掛。請將內部匯入透過 `./api.ts` 或
  `./runtime-api.ts` 進行路由。SDK 路徑僅為外部契約。
</Warning>

## 相關

- [進入點](/en/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry` 選項
- [執行時期輔助程式](/en/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空間參考
- [設定與配置](/en/plugins/sdk-setup) — 打包、清單、配置結構描述
- [測試](/en/plugins/sdk-testing) — 測試工具程式與 Lint 規則
- [SDK 遷移](/en/plugins/sdk-migration) — 從已棄用的介面遷移
- [外掛程式內部](/en/plugins/architecture) — 深層架構與功能模型
