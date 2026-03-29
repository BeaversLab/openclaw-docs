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

<Tip>**正在尋找操作指南？** - 第一個外掛？請從 [入門指南](/en/plugins/building-plugins) 開始 - 頻道外掛？請參閱 [頻道外掛](/en/plugins/sdk-channel-plugins) - 提供者外掛？請參閱 [提供者外掛](/en/plugins/sdk-provider-plugins)</Tip>

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

<Accordion title="提供者子路徑">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile` | | `plugin-sdk/provider-models` | `normalizeModelCompat` | | `plugin-sdk/provider-catalog` | 目錄類型重新匯出 | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及類似內容 | | `plugin-sdk/provider-stream` | 串流包裝器 類型 | |
  `plugin-sdk/provider-onboard` | 入門配置修補輔助函數 |
</Accordion>

<Accordion title="驗證與安全性子路徑">| Subpath | Key exports | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate` | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/secret-input` | 密鑰輸入解析輔助函數 | | `plugin-sdk/webhook-ingress` | Webhook 請求/目標輔助函數 |</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/config-runtime` | Config load/write helpers | | `plugin-sdk/infra-runtime` | System event/heartbeat helpers | | `plugin-sdk/agent-runtime` | Agent dir/identity/workspace helpers | | `plugin-sdk/directory-runtime` | Config-backed directory query/dedup | |
  `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
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

`register(api)` 回調函式會接收一個包含這些方法的 `OpenClawPluginApi` 物件：

### 功能註冊

| 方法                                          | 註冊內容              |
| --------------------------------------------- | --------------------- |
| `api.registerProvider(...)`                   | 文字推論 (LLM)        |
| `api.registerChannel(...)`                    | 訊息傳遞管道          |
| `api.registerSpeechProvider(...)`             | 文字轉語音 / STT 合成 |
| `api.registerMediaUnderstandingProvider(...)` | 圖片/音訊/影片分析    |
| `api.registerImageGenerationProvider(...)`    | 圖片生成              |
| `api.registerWebSearchProvider(...)`          | 網路搜尋              |

### 工具與指令

| 方法                            | 註冊內容                                 |
| ------------------------------- | ---------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具 (必要或 `{ optional: true }`) |
| `api.registerCommand(def)`      | 自訂指令 (繞過 LLM)                      |

### 基礎架構

| 方法                                           | 註冊內容          |
| ---------------------------------------------- | ----------------- |
| `api.registerHook(events, handler, opts?)`     | 事件掛鉤          |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端點 |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法  |
| `api.registerCli(registrar, opts?)`            | CLI 子指令        |
| `api.registerService(service)`                 | 背景服務          |
| `api.registerInteractiveHandler(registration)` | 互動式處理程序    |

### 獨佔插槽

| 方法                                       | 註冊內容                               |
| ------------------------------------------ | -------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次只有一個處於活動狀態） |
| `api.registerMemoryPromptSection(builder)` | 記憶體提示區塊建構器                   |

### 事件與生命週期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 型別化生命週期掛鉤 |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼       |

### 掛鉤決定語意

- `before_tool_call`：返回 `{ block: true }` 為終止操作。一旦任何處理程式設定了它，較低優先級的處理程式將被跳過。
- `before_tool_call`：返回 `{ block: false }` 被視為未做決定（與省略 `block` 相同），而不是覆寫。
- `message_sending`：返回 `{ cancel: true }` 為終止操作。一旦任何處理程式設定了它，較低優先級的處理程式將被跳過。
- `message_sending`：返回 `{ cancel: false }` 被視為未做決定（與省略 `cancel` 相同），而不是覆寫。

### API 物件欄位

| 欄位                     | 型別                      | 描述                                                  |
| ------------------------ | ------------------------- | ----------------------------------------------------- |
| `api.id`                 | `string`                  | 外掛程式 ID                                           |
| `api.name`               | `string`                  | 顯示名稱                                              |
| `api.version`            | `string?`                 | 外掛程式版本（可選）                                  |
| `api.description`        | `string?`                 | 外掛程式描述（可選）                                  |
| `api.source`             | `string`                  | 外掛程式來源路徑                                      |
| `api.rootDir`            | `string?`                 | 外掛程式根目錄（可選）                                |
| `api.config`             | `OpenClawConfig`          | 目前設定快照                                          |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的外掛程式特定設定 |
| `api.runtime`            | `PluginRuntime`           | [執行時輔助程式](/en/plugins/sdk-runtime)             |
| `api.logger`             | `PluginLogger`            | 範圍記錄器（`debug`、`info`、`warn`、`error`）        |
| `api.registrationMode`   | `PluginRegistrationMode`  | `"full"`、`"setup-only"` 或 `"setup-runtime"`         |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛根目錄的路徑                            |

## 內部模組約定

在您的外掛中，使用本地 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  切勿從生產程式碼透過 `openclaw/plugin-sdk/<your-plugin>`
  匯入您自己的外掛。請透過 `./api.ts` 或
  `./runtime-api.ts` 路由內部匯入。SDK 路徑僅用於外部合約。
</Warning>

## 相關

- [進入點](/en/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry` 選項
- [執行時期輔助程式](/en/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空間參考
- [設定與組態](/en/plugins/sdk-setup) — 打包、資訊清單、組態架構
- [測試](/en/plugins/sdk-testing) — 測試工具程式與 Lint 規則
- [SDK 遷移](/en/plugins/sdk-migration) — 從已淘汰的介面遷移
- [外掛內部](/en/plugins/architecture) — 深度架構與功能模型
