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

這些測試輔助子路徑是 OpenClaw 自有內掛件測試的倉庫本機源入口點。它們不是第三方掛件的套件匯出，而且它們可能匯入 Vitest 或其他僅限倉庫內的測試相依項。

**插件 API mock 匯入：** `openclaw/plugin-sdk/plugin-test-api`

**Agent 執行時期契約匯入：** `openclaw/plugin-sdk/agent-runtime-test-contracts`

**通道契約匯入：** `openclaw/plugin-sdk/channel-contract-testing`

**通道測試輔助匯入：** `openclaw/plugin-sdk/channel-test-helpers`

**通道目標測試匯入：** `openclaw/plugin-sdk/channel-target-testing`

**插件契約匯入：** `openclaw/plugin-sdk/plugin-test-contracts`

**插件執行時期測試匯入：** `openclaw/plugin-sdk/plugin-test-runtime`

**提供者契約匯入：** `openclaw/plugin-sdk/provider-test-contracts`

**提供者 HTTP mock 匯入：** `openclaw/plugin-sdk/provider-http-test-mocks`

**環境/網路測試匯入：** `openclaw/plugin-sdk/test-env`

**通用 fixture 匯入：** `openclaw/plugin-sdk/test-fixtures`

**Node 內建 mock 匯入：** `openclaw/plugin-sdk/test-node-mocks`

在 OpenClaw 倉庫內，針對新的內掛件測試，請優先使用下列專注的子路徑。寬泛的 `openclaw/plugin-sdk/testing` 匯出僅用於舊版相容性。倉庫防護機制會拒絕來自 `plugin-sdk/testing` 和 `plugin-sdk/test-utils` 的新實際匯入；這些名稱僅保留為已棄用的相容性介面，用於相容性記錄測試。

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

### 可用的匯出

| 匯出                                                 | 用途                                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `createTestPluginApi`                                | 為直接註冊單元測試建構最小的插件 API mock。從 `plugin-sdk/plugin-test-api` 匯入                                          |
| `AUTH_PROFILE_RUNTIME_CONTRACT`                      | 用於原生 agent 執行時期轉接器的共享 auth-profile 契約 fixture。從 `plugin-sdk/agent-runtime-test-contracts` 匯入         |
| `DELIVERY_NO_REPLY_RUNTIME_CONTRACT`                 | 用於原生 agent 執行時期轉接器的共享傳遞抑制契約 fixture。從 `plugin-sdk/agent-runtime-test-contracts` 匯入               |
| `OUTCOME_FALLBACK_RUNTIME_CONTRACT`                  | 用於原生 agent 執行時期轉接器的共享後備分類契約 fixture。從 `plugin-sdk/agent-runtime-test-contracts` 匯入               |
| `createParameterFreeTool`                            | 為原生執行時期契約測試建構動態工具 schema fixtures。從 `plugin-sdk/agent-runtime-test-contracts` 匯入                    |
| `expectChannelInboundContextContract`                | 斷言通道輸入上下文形狀。從 `plugin-sdk/channel-contract-testing` 匯入                                                    |
| `installChannelOutboundPayloadContractSuite`         | 安裝頻道輸出負載合約案例。從 `plugin-sdk/channel-contract-testing` 匯入                                                  |
| `createStartAccountContext`                          | 建構頻道帳戶生命週期上下文。從 `plugin-sdk/channel-test-helpers` 匯入                                                    |
| `installChannelActionsContractSuite`                 | 安裝通用頻道訊息動作合約案例。從 `plugin-sdk/channel-test-helpers` 匯入                                                  |
| `installChannelSetupContractSuite`                   | 安裝通用頻道設置合約案例。從 `plugin-sdk/channel-test-helpers` 匯入                                                      |
| `installChannelStatusContractSuite`                  | 安裝通用頻道狀態合約案例。從 `plugin-sdk/channel-test-helpers` 匯入                                                      |
| `expectDirectoryIds`                                 | 從目錄列表函式斷言頻道目錄 ID。從 `plugin-sdk/channel-test-helpers` 匯入                                                 |
| `assertBundledChannelEntries`                        | 斷言打包的頻道進入點公開預期的公開合約。從 `plugin-sdk/channel-test-helpers` 匯入                                        |
| `formatEnvelopeTimestamp`                            | 格式化確定性信封時間戳記。從 `plugin-sdk/channel-test-helpers` 匯入                                                      |
| `expectPairingReplyText`                             | 斷言頻道配對回覆文字並擷取其代碼。從 `plugin-sdk/channel-test-helpers` 匯入                                              |
| `describePluginRegistrationContract`                 | 安裝外掛程式註冊合約檢查。從 `plugin-sdk/plugin-test-contracts` 匯入                                                     |
| `registerSingleProviderPlugin`                       | 在載入器煙霧測試中註冊一個提供者外掛程式。從 `plugin-sdk/plugin-test-runtime` 匯入                                       |
| `registerProviderPlugin`                             | 從一個外掛程式擷取所有提供者種類。從 `plugin-sdk/plugin-test-runtime` 匯入                                               |
| `registerProviderPlugins`                            | 跨多個外掛程式擷取提供者註冊。從 `plugin-sdk/plugin-test-runtime` 匯入                                                   |
| `requireRegisteredProvider`                          | 斷言提供者集合包含一個 ID。從 `plugin-sdk/plugin-test-runtime` 匯入                                                      |
| `createRuntimeEnv`                                   | 建構模擬的 CLI/外掛程式執行時環境。從 `plugin-sdk/plugin-test-runtime` 匯入                                              |
| `createPluginSetupWizardStatus`                      | 為頻道外掛程式建構設置狀態輔助工具。從 `plugin-sdk/plugin-test-runtime` 匯入                                             |
| `describeOpenAIProviderRuntimeContract`              | 安裝 provider-family 執行時合約檢查。從 `plugin-sdk/provider-test-contracts` 匯入                                        |
| `expectPassthroughReplayPolicy`                      | 斷言 provider 重播策略會透過 provider 擁有的工具和元數據。從 `plugin-sdk/provider-test-contracts` 匯入                   |
| `runRealtimeSttLiveTest`                             | 使用共享的音效 fixture 執行即時 STT provider 測試。從 `plugin-sdk/provider-test-contracts` 匯入                          |
| `normalizeTranscriptForMatch`                        | 在模糊斷言之前正規化即時輸出內容。從 `plugin-sdk/provider-test-contracts` 匯入                                           |
| `expectExplicitVideoGenerationCapabilities`          | 斷言 video providers 宣告了明確的生成模式能力。從 `plugin-sdk/provider-test-contracts` 匯入                              |
| `expectExplicitMusicGenerationCapabilities`          | 斷言 music providers 宣告了明確的生成/編輯能力。從 `plugin-sdk/provider-test-contracts` 匯入                             |
| `mockSuccessfulDashscopeVideoTask`                   | 安裝一個成功的 DashScope 相容視訊任務回應。從 `plugin-sdk/provider-test-contracts` 匯入                                  |
| `getProviderHttpMocks`                               | 存取選用的 provider HTTP/auth Vitest 模擬。從 `plugin-sdk/provider-http-test-mocks` 匯入                                 |
| `installProviderHttpMockCleanup`                     | 在每次測試後重置 provider HTTP/auth 模擬。從 `plugin-sdk/provider-http-test-mocks` 匯入                                  |
| `installCommonResolveTargetErrorCases`               | 用於目標解析錯誤處理的共享測試案例。從 `plugin-sdk/channel-target-testing` 匯入                                          |
| `shouldAckReaction`                                  | 檢查 channel 是否應該新增 ack 反應。從 `plugin-sdk/channel-feedback` 匯入                                                |
| `removeAckReactionAfterReply`                        | 在回覆傳遞後移除 ack 反應。從 `plugin-sdk/channel-feedback` 匯入                                                         |
| `createTestRegistry`                                 | 建立 channel plugin registry fixture。從 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 匯入      |
| `createEmptyPluginRegistry`                          | 建立空的 plugin registry fixture。從 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 匯入          |
| `setActivePluginRegistry`                            | 為 plugin 執行時測試安裝 registry fixture。從 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 匯入 |
| `createRequestCaptureJsonFetch`                      | 在媒體輔助測試中擷取 JSON fetch 請求。從 `plugin-sdk/test-env` 匯入                                                      |
| `withServer`                                         | 對一次性本地 HTTP 伺服器執行測試。從 `plugin-sdk/test-env` 匯入                                                          |
| `createMockIncomingRequest`                          | 建立最小的傳入 HTTP 請求物件。從 `plugin-sdk/test-env` 匯入                                                              |
| `withFetchPreconnect`                                | 在已安裝 preconnect hooks 的情況下執行 fetch 測試。從 `plugin-sdk/test-env` 匯入                                         |
| `withEnv` / `withEnvAsync`                           | 暫時修補環境變數。從 `plugin-sdk/test-env` 匯入                                                                          |
| `createTempHomeEnv` / `withTempHome` / `withTempDir` | 建立隔離的檔案系統測試裝置。從 `plugin-sdk/test-env` 匯入                                                                |
| `createMockServerResponse`                           | 建立最小的 HTTP 伺服器回應模擬物件。從 `plugin-sdk/test-env` 匯入                                                        |
| `createCliRuntimeCapture`                            | 在測試中擷取 CLI 執行時輸出。從 `plugin-sdk/test-fixtures` 匯入                                                          |
| `importFreshModule`                                  | 使用新的查詢 token 匯入 ESM 模組以繞過模組快取。從 `plugin-sdk/test-fixtures` 匯入                                       |
| `bundledPluginRoot` / `bundledPluginFile`            | 解析套件插件的 source 或 dist 裝置路徑。從 `plugin-sdk/test-fixtures` 匯入                                               |
| `mockNodeBuiltinModule`                              | 安裝狹隘的 Node 內建 Vitest 模擬物件。從 `plugin-sdk/test-node-mocks` 匯入                                               |
| `createSandboxTestContext`                           | 建置沙箱測試語境。從 `plugin-sdk/test-fixtures` 匯入                                                                     |
| `writeSkill`                                         | 撰寫技能裝置。從 `plugin-sdk/test-fixtures` 匯入                                                                         |
| `makeAgentAssistantMessage`                          | 建置代理程式訊息記錄裝置。從 `plugin-sdk/test-fixtures` 匯入                                                             |
| `peekSystemEvents` / `resetSystemEventsForTest`      | 檢查並重設系統事件裝置。從 `plugin-sdk/test-fixtures` 匯入                                                               |
| `sanitizeTerminalText`                               | 清理終端機輸出以進行斷言。從 `plugin-sdk/test-fixtures` 匯入                                                             |
| `countLines` / `hasBalancedFences`                   | 斷言分塊輸出形狀。從 `plugin-sdk/test-fixtures` 匯入                                                                     |
| `runProviderCatalog`                                 | 使用測試依賴項執行提供者目錄掛鉤                                                                                         |
| `resolveProviderWizardOptions`                       | 在合約測試中解析提供者設定精靈選項                                                                                       |
| `resolveProviderModelPickerEntries`                  | 在合約測試中解析提供者模型選擇器條目                                                                                     |
| `buildProviderPluginMethodChoice`                    | 建構提供者精靈選項 ID 以進行斷言                                                                                         |
| `setProviderWizardProvidersResolverForTest`          | 為獨立測試注入提供者精靈提供者                                                                                           |
| `createProviderUsageFetch`                           | 建構提供者用量擷取固定裝置                                                                                               |
| `useFrozenTime` / `useRealTime`                      | 凍結並還原計時器以進行時間敏感測試。從 `plugin-sdk/test-env` 匯入                                                        |
| `createTestWizardPrompter`                           | 建構模擬的設定精靈提示器                                                                                                 |
| `createRuntimeTaskFlow`                              | 建立獨立的執行時期任務流程狀態                                                                                           |
| `typedCases`                                         | 保留表格驅動測試的字面類型。從 `plugin-sdk/test-fixtures` 匯入                                                           |

隨附外掛合約套件也使用 SDK 測試子路徑來進行僅供測試使用的登錄檔、清單、公開構件和執行時期固定裝置輔助程式。僅核心且依賴隨附 OpenClaw 清單的套件會保留在 `src/plugins/contracts` 下。
請將新的擴充測試放在記載於文件的專注 SDK 子路徑上，例如
`plugin-sdk/plugin-test-api`、`plugin-sdk/channel-contract-testing`、
`plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/channel-test-helpers`、
`plugin-sdk/plugin-test-contracts`、`plugin-sdk/plugin-test-runtime`、
`plugin-sdk/provider-test-contracts`、`plugin-sdk/provider-http-test-mocks`、
`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures`，而不是直接匯入
廣泛的 `plugin-sdk/testing` 相容性匯出檔案、repo `src/**` 檔案或 repo
`test/helpers/*` 橋接器。

### 類型

專注測試子路徑也會重新匯出測試檔案中實用的類型：

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext } from "openclaw/plugin-sdk/channel-contract";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import type { MockFn, PluginRuntime, RuntimeEnv } from "openclaw/plugin-sdk/plugin-test-runtime";
```

## 測試目標解析

使用 `installCommonResolveTargetErrorCases` 來新增頻道目標解析的標準錯誤案例：

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

將手寫的 `api` mock 傳給 `register(api)` 的單元測試不會執行
OpenClaw 的載入器驗證閘道。請為您外掛依賴的每個註冊表麵新增至少一個
由載入器支援的冒煙測試，特別是 hooks 和記憶體等獨佔功能。

當缺少必要的元資料或外掛呼叫了其不擁有的功能 API 時，真實的載入器會導致外掛註冊失敗。例如，
`api.registerHook(...)` 需要一個 hook 名稱，而
`api.registerMemoryCapability(...)` 需要外掛清單或匯出的入口來宣告
`kind: "memory"`。

### 測試執行時配置存取

在測試捆綁的頻道外掛時，優先使用來自 `openclaw/plugin-sdk/channel-test-helpers` 的共享外掛執行時 mock。
其已棄用的 `runtime.config.loadConfig()` 和 `runtime.config.writeConfigFile(...)` mock
預設會拋出錯誤，以便測試能捕捉到對相容性 API 的新用法。僅當測試明確涵蓋舊版相容性行為時，才覆蓋這些 mock。

### 單元測試頻道外掛

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

### 單元測試提供者外掛

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

### Mock 外掛執行時

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

### 使用個別實例 stub 進行測試

優先使用個別實例 stub 而非原型變異：

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## 合約測試 (儲存庫內外掛)

捆綁的外掛具有驗證註冊所有權的合約測試：

```bash
pnpm test -- src/plugins/contracts/
```

這些測試斷言：

- 哪些外掛註冊了哪些提供者
- 哪些外掛註冊了哪些語音提供者
- 註冊形狀的正確性
- 執行時合規性

### 執行限定範圍的測試

針對特定外掛：

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

僅針對合約測試：

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth-choice.contract.test.ts
pnpm test -- src/plugins/contracts/runtime-seams.contract.test.ts
```

## Lint 執行 (儲存庫內外掛)

對於儲存庫內的外掛，`pnpm check` 執行三條規則：

1. **禁止單一式根匯入** -- 拒絕 `openclaw/plugin-sdk` 的根 barrel
2. **禁止直接 `src/` 匯入** -- 外掛不能直接匯入 `../../src/`
3. **禁止自我匯入** -- 外掛不能匯入自己的 `plugin-sdk/<name>` 子路徑

外部外掛不受這些 lint 規則約束，但建議遵循相同的模式。

## 測試配置

OpenClaw 使用 Vitest 和 V8 覆蓋率閾值。對於外掛測試：

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

如果本地運行導致記憶體壓力：

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## 相關

- [SDK 概觀](/zh-Hant/plugins/sdk-overview) -- 匯入慣例
- [SDK 通道外掛](/zh-Hant/plugins/sdk-channel-plugins) -- 通道外掛介面
- [SDK 提供者外掛](/zh-Hant/plugins/sdk-provider-plugins) -- 提供者外掛鉤子
- [建置外掛](/zh-Hant/plugins/building-plugins) -- 入門指南
