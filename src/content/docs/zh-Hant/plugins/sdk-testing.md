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

<Tip>**正在尋找測試範例？** 操作指南包含實作測試範例： [Channel plugin tests](/zh-Hant/plugins/sdk-channel-plugins#step-6-test) 和 [Provider plugin tests](/zh-Hant/plugins/sdk-provider-plugins#step-6-test)。</Tip>

## 測試工具

**Import:** `openclaw/plugin-sdk/testing`

測試子路徑匯出了少量的輔助函式供外掛程式作者使用：

```typescript
import { installCommonResolveTargetErrorCases, shouldAckReaction, removeAckReactionAfterReply } from "openclaw/plugin-sdk/testing";
```

### 可用的匯出項目

| 匯出項目                               | 用途                               |
| -------------------------------------- | ---------------------------------- |
| `installCommonResolveTargetErrorCases` | 用於目標解析錯誤處理的共享測試案例 |
| `shouldAckReaction`                    | 檢查頻道是否應新增 ack 回應        |
| `removeAckReactionAfterReply`          | 在回覆傳遞後移除 ack 回應          |

### 類型

測試子路徑也會重新匯出在測試檔案中實用的類型：

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext, OpenClawConfig, PluginRuntime, RuntimeEnv, MockFn } from "openclaw/plugin-sdk/testing";
```

## 測試目標解析

使用 `installCommonResolveTargetErrorCases` 為頻道目標解析新增標準錯誤案例：

```typescript
import { describe } from "vitest";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/testing";

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

將手寫的 `api` mock 傳遞給 `register(api)` 的單元測試不會執行 OpenClaw 的載入器驗證閘道。請為您的插件依賴的每個註冊介面新增至少一個以載入器為基礎的冒煙測試 (smoke test)，特別是 Hooks 和獨佔功能（如記憶體）。

真實的載入器會在缺少必要的中繼資料或外掛程式呼叫其不擁有的功能 API 時使外掛程式註冊失敗。例如，`api.registerHook(...)` 需要 Hook 名稱，而 `api.registerMemoryCapability(...)` 需要外掛程式清單或匯出的項目來宣告 `kind: "memory"`。

### 測試執行時配置存取

測試捆綁的外掛程式時，請優先使用儲存庫測試輔助程式中的共享外掛程式執行時 mock。其已棄用的 `runtime.config.loadConfig()` 和 `runtime.config.writeConfigFile(...)` mock 預設會擲出錯誤，以便測試能夠捕捉到相容性 API 的最新使用。只有在測試明確涵蓋舊版相容性行為時，才應覆寫這些 mock。

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

### 單元測試提供者插件

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

### 模擬插件運行時

對於使用 `createPluginRuntimeStore` 的程式碼，請在測試中模擬運行時：

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

### 使用個體存根進行測試

優先使用個體存根而非原型變異：

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## 合約測試 (存放庫內插件)

內建插件具有合約測試，用於驗證註冊所有權：

```bash
pnpm test -- src/plugins/contracts/
```

這些測試斷言：

- 哪些插件註冊了哪些提供者
- 哪些插件註冊了哪些語音提供者
- 註冊形狀正確性
- 運行時合規性

### 執行限定範圍的測試

針對特定插件：

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

僅針對合約測試：

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth.contract.test.ts
pnpm test -- src/plugins/contracts/runtime.contract.test.ts
```

## Lint 強制執行 (存放庫內插件)

對於存放庫內的插件，`pnpm check` 強制執行三項規則：

1. **禁止單體根匯入** -- 拒絕 `openclaw/plugin-sdk` 根 barrel
2. **禁止直接匯入 `src/`** -- 插件不能直接匯入 `../../src/`
3. **禁止自匯入** -- 插件不能匯入自己的 `plugin-sdk/<name>` 子路徑

外部插件不受這些 Lint 規則約束，但建議遵循相同的模式。

## 測試設定

OpenClaw 使用帶有 V8 覆蓋率閾值的 Vitest。對於插件測試：

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

- [SDK 概觀](/zh-Hant/plugins/sdk-overview) -- 匯入慣例
- [SDK 通道插件](/zh-Hant/plugins/sdk-channel-plugins) -- 通道插件介面
- [SDK 提供者插件](/zh-Hant/plugins/sdk-provider-plugins) -- 提供者插件掛鉤
- [建構插件](/zh-Hant/plugins/building-plugins) -- 入門指南
