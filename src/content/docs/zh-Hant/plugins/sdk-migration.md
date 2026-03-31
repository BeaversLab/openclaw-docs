---
title: "Plugin SDK 遷移"
sidebarTitle: "遷移至 SDK"
summary: "從舊版向後相容層遷移至現代化外掛 SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

# Plugin SDK 遷移

OpenClaw 已從廣泛的向後相容層轉移到現代化的外掛架構，具有專注且有文件記錄的匯入項。如果您的插件是在新架構之前構建的，本指南將幫助您進行遷移。

## 有什麼變化

舊的插件系統提供了兩個開放的平台，允許插件從單一入口點匯入它們需要的任何東西：

- **`openclaw/plugin-sdk/compat`** — 單一的匯入項，重新匯出了數十個輔助函數。它的引進是為了在構建新的插件架構時，保持較舊的基於 hook 的插件繼續工作。
- **`openclaw/extension-api`** — 一座橋樑，賦予插件對主機端輔助函數（如嵌入式代理運行器）的直接存取權限。

這兩個平台現已**棄用**。它們在運行時仍然有效，但新插件絕不能使用它們，現有插件應在下一次主要版本將其移除之前進行遷移。

<Warning>向下相容層將在未來的主要版本中被移除。 屆時，仍從這些介面匯入的外掛程式將會中斷運作。</Warning>

## 為何做出此變更

舊的方法導致了以下問題：

- **啟動緩慢** — 匯入一個輔助函數會加載數十個無關的模組
- **循環相依** — 廣泛的重新匯出使得很容易建立匯入循環
- **API 介面不明確** — 無法區分哪些匯出項是穩定的，哪些是內部的

現代化的插件 SDK 解決了這個問題：每個匯入路徑 (`openclaw/plugin-sdk/\<subpath\>`) 都是一個小型的、獨立的模組，具有明確的目的和有文件記錄的合約。

## 如何遷移

<Steps>
  <Step title="尋找已棄用的匯入項">
    在您的插件中搜尋來自任一已棄用平台的匯入項：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替換為專門的匯入">
    舊介面中的每個匯出項都對應一個特定的現代匯入路徑：

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    對於主機端輔助函數，請使用注入的外掛程式執行環境，而不是直接匯入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    相同的模式也適用於其他舊版橋接輔助函數：

    | 舊匯入 | 現代等效項 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | session store helpers | `api.runtime.agent.session.*` |

  </Step>

  <Step title="建置並測試">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 匯入路徑參考

<Accordion title="完整匯入路徑表">
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準外掛程式進入點輔助程式 | `definePluginEntry` | | `plugin-sdk/core` | 頻道進入點定義、頻道建構器、基本類型 | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/channel-setup` | 設定精靈配接器 | `createOptionalChannelSetupSurface` | | `plugin-sdk/channel-pairing` | 私訊配對基本元素 |
  `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回覆前綴 + 輸入接線 | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | 設定配接器工廠 | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | 設定架構建構器 | 頻道設定架構類型 | | `plugin-sdk/channel-policy` | 群組/私訊原則解析 | `resolveChannelGroupRequireMention` | |
  `plugin-sdk/channel-lifecycle` | 帳號狀態追蹤 | `createAccountStatusSink` | | `plugin-sdk/channel-runtime` | 執行時接線輔助程式 | 頻道執行時公用程式 | | `plugin-sdk/channel-send-result` | 傳送結果類型 | 回覆結果類型 | | `plugin-sdk/runtime-store` | 持久化外掛程式儲存空間 | `createPluginRuntimeStore` | | `plugin-sdk/approval-runtime` | 核准提示輔助程式 | Exec/外掛程式核准 payload 和回覆輔助程式 |
  | `plugin-sdk/collection-runtime` | 有界快取輔助程式 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 診斷閘門輔助程式 | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 錯誤格式化輔助程式 | `formatUncaughtError`, 錯誤圖形輔助程式 | | `plugin-sdk/fetch-runtime` | 包裝的 fetch/proxy 輔助程式 | `resolveFetch`, proxy 輔助程式 | |
  `plugin-sdk/host-runtime` | 主機正規化輔助程式 | `normalizeHostname`, `normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重試輔助程式 | `RetryConfig`, `retryAsync`, 原則執行器 | | `plugin-sdk/allow-from` | 允許清單格式化 | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | 允許清單輸入對應 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘門 |
  `resolveControlCommandGate` | | `plugin-sdk/secret-input` | 秘密輸入解析 | 秘密輸入輔助程式 | | `plugin-sdk/webhook-ingress` | Webhook 請求輔助程式 | Webhook 目標公用程式 | | `plugin-sdk/webhook-request-guards` | Webhook body guard 輔助程式 | 請求 body 讀取/限制輔助程式 | | `plugin-sdk/reply-payload` | 訊息回覆類型 | 回覆 payload 類型 | | `plugin-sdk/provider-onboard` | 提供者上線修補程式 |
  Onboarding 設定輔助程式 | | `plugin-sdk/keyed-async-queue` | 有序非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/testing` | 測試公用程式 | 測試輔助程式和模擬物件 |
</Accordion>

使用符合任務需求的特定匯入路徑。如果您找不到匯出項，請檢查 `src/plugin-sdk/` 中的原始碼或在 Discord 中詢問。

## 移除時間表

| 時間               | 發生什麼事                                       |
| ------------------ | ------------------------------------------------ |
| **現在**           | 已棄用的介面會發出執行階段警告                   |
| **下一個主要版本** | 已棄用的介面將被移除；仍在使用它們的外掛將會失效 |

所有核心外掛已經完成遷移。外部外掛應在下一個主要版本發布前完成遷移。

## 暫時隱藏警告

在您進行遷移時，設定這些環境變數：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

這是一個暫時的緊急應變措施，並非永久解決方案。

## 相關

- [入門指南](/en/plugins/building-plugins) — 建構您的第一個外掛
- [SDK 概覽](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [通道外掛](/en/plugins/sdk-channel-plugins) — 建構通道外掛
- [提供者外掛](/en/plugins/sdk-provider-plugins) — 建構提供者外掛
- [外掛內部機制](/en/plugins/architecture) — 架構深入解析
- [外掛清單](/en/plugins/manifest) — 清單架構參考
