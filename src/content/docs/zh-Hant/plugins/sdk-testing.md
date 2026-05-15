---
summary: "OpenClaw 外掛程式的測試工具與模式"
title: "外掛程式測試"
sidebarTitle: "測試"
read_when:
  - You are writing tests for a plugin
  - You need test utilities from the plugin SDK
  - You want to understand contract tests for bundled plugins
---

OpenClaw 外掛程式的測試工具、模式與 Lint 強制執行參考。

<Tip>**尋找測試範例？** 操作指南包含完整的測試範例： [通道外掛測試](/zh-Hant/plugins/sdk-channel-plugins#step-6-test) 和 [提供者外掛測試](/zh-Hant/plugins/sdk-provider-plugins#step-6-test)。</Tip>

## 測試工具

**外掛 API 模組匯入：** `openclaw/plugin-sdk/plugin-test-api`

**代理程式執行期合約匯入：** `openclaw/plugin-sdk/agent-runtime-test-contracts`

**通道合約匯入：** `openclaw/plugin-sdk/channel-contract-testing`

**通道測試輔助函式匯入：** `openclaw/plugin-sdk/channel-test-helpers`

**通道目標測試匯入：** `openclaw/plugin-sdk/channel-target-testing`

**外掛合約匯入：** `openclaw/plugin-sdk/plugin-test-contracts`

**外掛執行期測試匯入：** `openclaw/plugin-sdk/plugin-test-runtime`

**提供者合約匯入：** `openclaw/plugin-sdk/provider-test-contracts`

**提供者 HTTP 模組匯入：** `openclaw/plugin-sdk/provider-http-test-mocks`

**環境/網路測試匯入：** `openclaw/plugin-sdk/test-env`

**通用固定裝置匯入：** `openclaw/plugin-sdk/test-fixtures`

**Node 內建模組匯入：** `openclaw/plugin-sdk/test-node-mocks`

對於新的外掛測試，建議優先使用下列專用的子路徑。廣泛的
`openclaw/plugin-sdk/testing` 匯出僅保留用於舊版相容性。
程式碼庫防護機制會拒絕來自 `plugin-sdk/testing` 和
`plugin-sdk/test-utils` 的新實際匯入；這些名稱僅作為外部外掛和相容性記錄測試的已棄用相容性介面保留。

```typescript
import { shouldAckReaction, removeAckReactionAfterReply } from "openclaw/plugin-sdk/channel-feedback";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/channel-target-testing";
import { AUTH_PROFILE_RUNTIME_CONTRACT } from "openclaw/plugin-sdk/agent-runtime-test-contracts";
import { createTestPluginApi } from "openclaw/plugin-sdk/plugin-test-api";
import { expectChannelInboundContextContract } from "openclaw/plugin-sdk/channel-contract-testing";
import { createStartAccountContext } from "openclaw/plugin-sdk/channel-test-helpers";
import { describePluginRegistrationContract } from "openclaw/plugin-sdk/plugin-test-contracts";
import { registerSingleProviderPlugin } from "openclaw/plugin-sdk/plugin-test-runtime";
import { describeOpenAIProviderRuntimeContract } from "openclaw/plugin-sdk/provider-test-contracts";
import { getProviderHttpMocks } from "openclaw/plugin-sdk/provider-http-test-mocks";
import { withEnv, withFetchPreconnect, withServer } from "openclaw/plugin-sdk/test-env";
import { bundledPluginRoot, createCliRuntimeCapture, typedCases } from "openclaw/plugin-sdk/test-fixtures";
import { mockNodeBuiltinModule } from "openclaw/plugin-sdk/test-node-mocks";
```

### 可用匯出

| 匯出                                                 | 用途                                                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `createTestPluginApi`                                | 為直接註冊的單元測試建構最小外掛 API 模組。請自 `plugin-sdk/plugin-test-api` 匯入                                     |
| `AUTH_PROFILE_RUNTIME_CONTRACT`                      | 用於原生代理程式執行期轉接器的共用 auth-profile 合約固定裝置。請自 `plugin-sdk/agent-runtime-test-contracts` 匯入     |
| `DELIVERY_NO_REPLY_RUNTIME_CONTRACT`                 | 用於原生代理程式執行期轉接器的共用遞送抑制合約固定裝置。請自 `plugin-sdk/agent-runtime-test-contracts` 匯入           |
| `OUTCOME_FALLBACK_RUNTIME_CONTRACT`                  | 用於原生代理程式執行期轉接器的共用後備分類合約固定裝置。請自 `plugin-sdk/agent-runtime-test-contracts` 匯入           |
| `createParameterFreeTool`                            | 為原生執行期合約測試建構動態工具綱要固定裝置。請自 `plugin-sdk/agent-runtime-test-contracts` 匯入                     |
| `expectChannelInboundContextContract`                | 斷言通道輸入語境形狀。從 `plugin-sdk/channel-contract-testing` 匯入                                                   |
| `installChannelOutboundPayloadContractSuite`         | 安裝通道輸出 Payload 合約案例。從 `plugin-sdk/channel-contract-testing` 匯入                                          |
| `createStartAccountContext`                          | 建構通道帳號生命週期語境。從 `plugin-sdk/channel-test-helpers` 匯入                                                   |
| `installChannelActionsContractSuite`                 | 安裝通用通道訊息動作合約案例。從 `plugin-sdk/channel-test-helpers` 匯入                                               |
| `installChannelSetupContractSuite`                   | 安裝通用通道設定合約案例。從 `plugin-sdk/channel-test-helpers` 匯入                                                   |
| `installChannelStatusContractSuite`                  | 安裝通用通道狀態合約案例。從 `plugin-sdk/channel-test-helpers` 匯入                                                   |
| `expectDirectoryIds`                                 | 從目錄列表函數斷言通道目錄 ID。從 `plugin-sdk/channel-test-helpers` 匯入                                              |
| `assertBundledChannelEntries`                        | 斷言打包的通道進入點暴露了預期的公開合約。從 `plugin-sdk/channel-test-helpers` 匯入                                   |
| `formatEnvelopeTimestamp`                            | 格式化確定性信封時間戳記。從 `plugin-sdk/channel-test-helpers` 匯入                                                   |
| `expectPairingReplyText`                             | 斷言通道配對回覆文字並擷取其代碼。從 `plugin-sdk/channel-test-helpers` 匯入                                           |
| `describePluginRegistrationContract`                 | 安裝外掛註冊合約檢查。從 `plugin-sdk/plugin-test-contracts` 匯入                                                      |
| `registerSingleProviderPlugin`                       | 在載入器冒煙測試中註冊一個提供者外掛。從 `plugin-sdk/plugin-test-runtime` 匯入                                        |
| `registerProviderPlugin`                             | 從一個外掛捕獲所有提供者種類。從 `plugin-sdk/plugin-test-runtime` 匯入                                                |
| `registerProviderPlugins`                            | 捕獲多個外掛中的提供者註冊。從 `plugin-sdk/plugin-test-runtime` 匯入                                                  |
| `requireRegisteredProvider`                          | 斷言提供者集合包含一個 ID。從 `plugin-sdk/plugin-test-runtime` 匯入                                                   |
| `createRuntimeEnv`                                   | 建構模擬的 CLI/外掛執行時環境。從 `plugin-sdk/plugin-test-runtime` 匯入                                               |
| `createPluginSetupWizardStatus`                      | 為通道外掛建構設定狀態輔助函式。從 `plugin-sdk/plugin-test-runtime` 匯入                                              |
| `describeOpenAIProviderRuntimeContract`              | 安裝提供商系列運行時合約檢查。從 `plugin-sdk/provider-test-contracts` 匯入                                            |
| `expectPassthroughReplayPolicy`                      | 斷言提供商重播政策會透過提供商擁有的工具和中繼資料。從 `plugin-sdk/provider-test-contracts` 匯入                      |
| `runRealtimeSttLiveTest`                             | 使用共享的音訊裝置執行即時 STT 提供商測試。從 `plugin-sdk/provider-test-contracts` 匯入                               |
| `normalizeTranscriptForMatch`                        | 在模糊斷言之前正規化即時逐字稿輸出。從 `plugin-sdk/provider-test-contracts` 匯入                                      |
| `expectExplicitVideoGenerationCapabilities`          | 斷言影片提供商宣告了明確的生成模式能力。從 `plugin-sdk/provider-test-contracts` 匯入                                  |
| `expectExplicitMusicGenerationCapabilities`          | 斷言音樂提供商宣告了明確的生成/編輯能力。從 `plugin-sdk/provider-test-contracts` 匯入                                 |
| `mockSuccessfulDashscopeVideoTask`                   | 安裝一個成功的 DashScope 相容影片任務回應。從 `plugin-sdk/provider-test-contracts` 匯入                               |
| `getProviderHttpMocks`                               | 存取選用的 Provider HTTP/Auth Vitest 模擬。從 `plugin-sdk/provider-http-test-mocks` 匯入                              |
| `installProviderHttpMockCleanup`                     | 在每次測試後重置 Provider HTTP/Auth 模擬。從 `plugin-sdk/provider-http-test-mocks` 匯入                               |
| `installCommonResolveTargetErrorCases`               | 用於目標解析錯誤處理的共享測試案例。從 `plugin-sdk/channel-target-testing` 匯入                                       |
| `shouldAckReaction`                                  | 檢查頻道是否應新增 ack 反應。從 `plugin-sdk/channel-feedback` 匯入                                                    |
| `removeAckReactionAfterReply`                        | 在回覆傳遞後移除 ack 反應。從 `plugin-sdk/channel-feedback` 匯入                                                      |
| `createTestRegistry`                                 | 建構一個頻道外掛程式登錄檔裝置。從 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 匯入         |
| `createEmptyPluginRegistry`                          | 建構一個空的外掛程式登錄檔裝置。從 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 匯入         |
| `setActivePluginRegistry`                            | 為外掛程式運行時測試安裝一個登錄檔裝置。從 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 匯入 |
| `createRequestCaptureJsonFetch`                      | 在媒體輔助程式測試中擷取 JSON fetch 要求。從 `plugin-sdk/test-env` 匯入                                               |
| `withServer`                                         | 對可拋棄的本機 HTTP 伺服器執行測試。從 `plugin-sdk/test-env` 匯入                                                     |
| `createMockIncomingRequest`                          | 建置一個最小的傳入 HTTP 要求物件。從 `plugin-sdk/test-env` 匯入                                                       |
| `withFetchPreconnect`                                | 執行安裝了預先連接掛鉤的 fetch 測試。從 `plugin-sdk/test-env` 匯入                                                    |
| `withEnv` / `withEnvAsync`                           | 暫時修補環境變數。從 `plugin-sdk/test-env` 匯入                                                                       |
| `createTempHomeEnv` / `withTempHome` / `withTempDir` | 建立獨立的檔案系統測試裝置。從 `plugin-sdk/test-env` 匯入                                                             |
| `createMockServerResponse`                           | 建立一個最小的 HTTP 伺服器回應模擬物件。從 `plugin-sdk/test-env` 匯入                                                 |
| `createCliRuntimeCapture`                            | 在測試中擷取 CLI 執行時輸出。從 `plugin-sdk/test-fixtures` 匯入                                                       |
| `importFreshModule`                                  | 使用新的查詢 token 匯入 ESM 模組以繞過模組快取。從 `plugin-sdk/test-fixtures` 匯入                                    |
| `bundledPluginRoot` / `bundledPluginFile`            | 解析捆綁的 plugin source 或 dist fixture 路徑。從 `plugin-sdk/test-fixtures` 匯入                                     |
| `mockNodeBuiltinModule`                              | 安裝狹隘的 Node 內建 Vitest 模擬。從 `plugin-sdk/test-node-mocks` 匯入                                                |
| `createSandboxTestContext`                           | 建置沙盒測試上下文。從 `plugin-sdk/test-fixtures` 匯入                                                                |
| `writeSkill`                                         | 寫入技能裝置。從 `plugin-sdk/test-fixtures` 匯入                                                                      |
| `makeAgentAssistantMessage`                          | 建置代理程式對話訊息裝置。從 `plugin-sdk/test-fixtures` 匯入                                                          |
| `peekSystemEvents` / `resetSystemEventsForTest`      | 檢查並重設系統事件裝置。從 `plugin-sdk/test-fixtures` 匯入                                                            |
| `sanitizeTerminalText`                               | 清理終端機輸出以進行斷言。從 `plugin-sdk/test-fixtures` 匯入                                                          |
| `countLines` / `hasBalancedFences`                   | 斷言分塊輸出形狀。從 `plugin-sdk/test-fixtures` 匯入                                                                  |
| `runProviderCatalog`                                 | 使用測試相依性執行提供者目錄鉤子                                                                                      |
| `resolveProviderWizardOptions`                       | 在合約測試中解析提供者設定精靈選項                                                                                    |
| `resolveProviderModelPickerEntries`                  | 在合約測試中解析提供者模型選擇器條目                                                                                  |
| `buildProviderPluginMethodChoice`                    | 建構提供者精靈選項 ID 以用於斷言                                                                                      |
| `setProviderWizardProvidersResolverForTest`          | 為獨立測試注入提供者精靈提供者                                                                                        |
| `createProviderUsageFetch`                           | 建構提供者使用情況獲取 fixture                                                                                        |
| `useFrozenTime` / `useRealTime`                      | 凍結並還原計時器以進行時間敏感測試。從 `plugin-sdk/test-env` 匯入                                                     |
| `createTestWizardPrompter`                           | 建構模擬的設定精靈提示器                                                                                              |
| `createRuntimeTaskFlow`                              | 建立獨立的執行時任務流程狀態                                                                                          |
| `typedCases`                                         | 保留表格驅動測試的字面型別。從 `plugin-sdk/test-fixtures` 匯入                                                        |

Bundled-plugin 合約套件也使用 SDK 測試子路徑來處理僅測試用的登錄檔、清單、公開構件和執行時 fixture 輔助程式。依賴 bundled OpenClaw 庫存的 Core-only 套件則保留在 `src/plugins/contracts` 之下。
請將新的擴充功能測試放在已記載的專注 SDK 子路徑上，例如
`plugin-sdk/plugin-test-api`、`plugin-sdk/channel-contract-testing`、
`plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/channel-test-helpers`、
`plugin-sdk/plugin-test-contracts`、`plugin-sdk/plugin-test-runtime`、
`plugin-sdk/provider-test-contracts`、`plugin-sdk/provider-http-test-mocks`、
`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures`，而不是直接匯入
寬泛的 `plugin-sdk/testing` 相容性 barrel、repo `src/**` 檔案或 repo
`test/helpers/*` 橋接器。

### 型別

專注的測試子路徑也會重新匯出測試檔案中可用的型別：

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext } from "openclaw/plugin-sdk/channel-contract";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-types";
import type { MockFn, PluginRuntime, RuntimeEnv } from "openclaw/plugin-sdk/plugin-test-runtime";
```

## 測試目標解析

使用 `installCommonResolveTargetErrorCases` 來新增通道目標解析的標準錯誤情況：

```typescript
import { describe } from "vitest";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/channel-target-testing";

describe("my-channel target resolution", () => {
  installCommonResolveTargetErrorCases({
    resolveTarget: ({ to, mode, allowFrom }) => {
      // Your channel's target resolution logic
      return myChannelResolveTarget({ to, mode, allowFrom });
    },
    implicitAllowFrom: ["user1", "user2"],
  });

  // Add channel-specific test cases
  it("should resolve @username targets", () => {
    // ...
  });
});
```

## 測試模式

### 測試註冊合約

將手寫的 `api` mock 傳遞給 `register(api)` 的單元測試不會執行
OpenClaw 的載入器驗收閘道。請為您的外掛程式所依賴的每個註冊介面新增至少一個
由載入器支援的煙霧測試，特別是 Hook 和獨佔功能（例如 memory）。

當缺少必要的元資料，或外掛程式呼叫了它不擁有的功能 API 時，真正的載入器會導致外掛程式註冊失敗。例如，
`api.registerHook(...)` 需要 Hook 名稱，而
`api.registerMemoryCapability(...)` 要求外掛程式清單或匯出的
項目宣告 `kind: "memory"`。

### 測試執行時設定存取

測試隨附的頻道外掛程式時，請優先使用 `openclaw/plugin-sdk/channel-test-helpers`
中的共享外掛程式執行時 mock。其已棄用的 `runtime.config.loadConfig()` 和
`runtime.config.writeConfigFile(...)` mock 預設會拋出錯誤，以便測試能捕捉到
相容性 API 的新用法。僅當測試明確涵蓋舊版相容性行為時，才覆寫這些 mock。

### 單元測試頻道外掛程式

```typescript
import { describe, it, expect, vi } from "vitest";

describe("my-channel plugin", () => {
  it("should resolve account from config", () => {
    const cfg = {
      channels: {
        "my-channel": {
          token: "test-token",
          allowFrom: ["user1"],
        },
      },
    };

    const account = myPlugin.setup.resolveAccount(cfg, undefined);
    expect(account.token).toBe("test-token");
  });

  it("should inspect account without materializing secrets", () => {
    const cfg = {
      channels: {
        "my-channel": { token: "test-token" },
      },
    };

    const inspection = myPlugin.setup.inspectAccount(cfg, undefined);
    expect(inspection.configured).toBe(true);
    expect(inspection.tokenStatus).toBe("available");
    // No token value exposed
    expect(inspection).not.toHaveProperty("token");
  });
});
```

### 單元測試提供者外掛程式

```typescript
import { describe, it, expect } from "vitest";

describe("my-provider plugin", () => {
  it("should resolve dynamic models", () => {
    const model = myProvider.resolveDynamicModel({
      modelId: "custom-model-v2",
      // ... context
    });

    expect(model.id).toBe("custom-model-v2");
    expect(model.provider).toBe("my-provider");
    expect(model.api).toBe("openai-completions");
  });

  it("should return catalog when API key is available", async () => {
    const result = await myProvider.catalog.run({
      resolveProviderApiKey: () => ({ apiKey: "test-key" }),
      // ... context
    });

    expect(result?.provider?.models).toHaveLength(2);
  });
});
```

### Mock 外掛程式執行時

對於使用 `createPluginRuntimeStore` 的程式碼，請在測試中 mock 執行時：

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>({
  pluginId: "test-plugin",
  errorMessage: "test runtime not set",
});

// In test setup
const mockRuntime = {
  agent: {
    resolveAgentDir: vi.fn().mockReturnValue("/tmp/agent"),
    // ... other mocks
  },
  config: {
    current: vi.fn(() => ({}) as const),
    mutateConfigFile: vi.fn(),
    replaceConfigFile: vi.fn(),
  },
  // ... other namespaces
} as unknown as PluginRuntime;

store.setRuntime(mockRuntime);

// After tests
store.clearRuntime();
```

### 使用個別執行個體 stub 進行測試

請優先使用個別執行個體 stub 而非原型變更：

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## 合約測試（程式庫內外掛程式）

隨附的外掛程式擁有驗證註冊所有權的合約測試：

```bash
pnpm test -- src/plugins/contracts/
```

這些測試斷言：

- 哪些外掛程式註冊了哪些提供者
- 哪些外掛程式註冊了哪些語音提供者
- 註冊形狀的正確性
- 執行時合約合規性

### 執行範圍測試

針對特定外掛程式：

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

僅針對合約測試：

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth-choice.contract.test.ts
pnpm test -- src/plugins/contracts/runtime-seams.contract.test.ts
```

## Lint 執行（程式庫內外掛程式）

針對程式庫內外掛程式，`pnpm check` 強制執行三項規則：

1. **禁止單一根目錄匯入** -- 拒絕 `openclaw/plugin-sdk` 根目錄 barrel
2. **禁止直接匯入 `src/`** -- 外掛程式無法直接匯入 `../../src/`
3. **禁止自我匯入** -- 外掛程式無法匯入其自己的 `plugin-sdk/<name>` 子路徑

外部外掛程式不受這些 lint 規則約束，但建議遵循相同的模式。

## 測試組態

OpenClaw 使用 Vitest 搭配 V8 涵蓋率閾值。對於外掛程式測試：

```bash
# Run all tests
pnpm test

# Run specific plugin tests
pnpm test -- <bundled-plugin-root>/my-channel/src/channel.test.ts

# Run with a specific test name filter
pnpm test -- <bundled-plugin-root>/my-channel/ -t "resolves account"

# Run with coverage
pnpm test:coverage
```

如果本地執行導致記憶體壓力：

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## 相關

- [SDK 概觀](/zh-Hant/plugins/sdk-overview) -- import 慣例
- [SDK 通道外掛](/zh-Hant/plugins/sdk-channel-plugins) -- 通道外掛介面
- [SDK 提供者外掛](/zh-Hant/plugins/sdk-provider-plugins) -- 提供者外掛 hooks
- [建置外掛](/zh-Hant/plugins/building-plugins) -- 入門指南
