---
summary: "用于 OpenClaw 插件的测试工具和模式"
title: "插件测试"
sidebarTitle: "测试"
read_when:
  - You are writing tests for a plugin
  - You need test utilities from the plugin SDK
  - You want to understand contract tests for bundled plugins
---

OpenClaw 插件的测试工具、模式和 Lint 强制执行的参考。

<Tip>**正在寻找测试示例？** 操作指南指南包含完整的测试示例： [通道插件测试](/zh/plugins/sdk-channel-plugins#step-6-test) 和 [提供者插件测试](/zh/plugins/sdk-provider-plugins#step-6-test)。</Tip>

## 测试工具

这些测试辅助子路径是 OpenClaw 自有捆绑插件测试的仓库本地源入口。它们不是第三方插件的包导出，并且它们可能会导入 Vitest 或其他仅限仓库的测试依赖项。

**插件 API 模拟导入：** API`openclaw/plugin-sdk/plugin-test-api`

**代理运行时合约导入：** `openclaw/plugin-sdk/agent-runtime-test-contracts`

**通道合约导入：** `openclaw/plugin-sdk/channel-contract-testing`

**通道测试助手导入：** `openclaw/plugin-sdk/channel-test-helpers`

**通道目标测试导入：** `openclaw/plugin-sdk/channel-target-testing`

**插件合约导入：** `openclaw/plugin-sdk/plugin-test-contracts`

**插件运行时测试导入：** `openclaw/plugin-sdk/plugin-test-runtime`

**提供商合约导入：** `openclaw/plugin-sdk/provider-test-contracts`

**提供商 HTTP 模拟导入：** `openclaw/plugin-sdk/provider-http-test-mocks`

**环境/网络测试导入：** `openclaw/plugin-sdk/test-env`

**通用装置导入：** `openclaw/plugin-sdk/test-fixtures`

**Node 内置模拟导入：** `openclaw/plugin-sdk/test-node-mocks`

在 OpenClaw 仓库内，对于新的捆绑插件测试，请优先使用以下专注的子路径。宽泛的 `openclaw/plugin-sdk/testing` 桶导出仅用于遗留兼容性。仓库防护机制会拒绝从 `plugin-sdk/testing` 和 `plugin-sdk/test-utils` 进行新的实际导入；这些名称仅作为弃用的兼容性表面，用于兼容性记录测试。

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

### 可用导出

| 导出                                                 | 用途                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `createTestPluginApi`                                | 构建最小的插件 API 模拟，用于直接注册单元测试。从 API`plugin-sdk/plugin-test-api` 导入                        |
| `AUTH_PROFILE_RUNTIME_CONTRACT`                      | 用于原生代理运行时适配器的共享认证配置文件合约装置。从 `plugin-sdk/agent-runtime-test-contracts` 导入         |
| `DELIVERY_NO_REPLY_RUNTIME_CONTRACT`                 | 用于原生代理运行时适配器的共享传递抑制合约装置。从 `plugin-sdk/agent-runtime-test-contracts` 导入             |
| `OUTCOME_FALLBACK_RUNTIME_CONTRACT`                  | 用于原生代理运行时适配器的共享回退分类合约装置。从 `plugin-sdk/agent-runtime-test-contracts` 导入             |
| `createParameterFreeTool`                            | 为原生运行时合约测试构建动态工具模式装置。从 `plugin-sdk/agent-runtime-test-contracts` 导入                   |
| `expectChannelInboundContextContract`                | 断言渠道入站上下文形状。从 `plugin-sdk/channel-contract-testing` 导入                                         |
| `installChannelOutboundPayloadContractSuite`         | 安装渠道出站负载合约用例。从 `plugin-sdk/channel-contract-testing` 导入                                       |
| `createStartAccountContext`                          | 构建渠道账户生命周期上下文。从 `plugin-sdk/channel-test-helpers` 导入                                         |
| `installChannelActionsContractSuite`                 | 安装通用渠道消息操作合约用例。从 `plugin-sdk/channel-test-helpers` 导入                                       |
| `installChannelSetupContractSuite`                   | 安装通用渠道设置合约用例。从 `plugin-sdk/channel-test-helpers` 导入                                           |
| `installChannelStatusContractSuite`                  | 安装通用渠道状态合约用例。从 `plugin-sdk/channel-test-helpers` 导入                                           |
| `expectDirectoryIds`                                 | 断言来自目录列表函数的渠道目录 ID。从 `plugin-sdk/channel-test-helpers` 导入                                  |
| `assertBundledChannelEntries`                        | 断言打包的渠道入口点暴露预期的公共合约。从 `plugin-sdk/channel-test-helpers` 导入                             |
| `formatEnvelopeTimestamp`                            | 格式化确定性信封时间戳。从 `plugin-sdk/channel-test-helpers` 导入                                             |
| `expectPairingReplyText`                             | 断言渠道配对回复文本并提取其代码。从 `plugin-sdk/channel-test-helpers` 导入                                   |
| `describePluginRegistrationContract`                 | 安装插件注册合约检查。从 `plugin-sdk/plugin-test-contracts` 导入                                              |
| `registerSingleProviderPlugin`                       | 在加载器冒烟测试中注册一个提供商插件。从 `plugin-sdk/plugin-test-runtime` 导入                                |
| `registerProviderPlugin`                             | 从一个插件中捕获所有提供商种类。从 `plugin-sdk/plugin-test-runtime` 导入                                      |
| `registerProviderPlugins`                            | 跨多个插件捕获提供商注册。从 `plugin-sdk/plugin-test-runtime` 导入                                            |
| `requireRegisteredProvider`                          | 断言提供商集合包含一个 ID。从 `plugin-sdk/plugin-test-runtime` 导入                                           |
| `createRuntimeEnv`                                   | 构建模拟的 CLI/插件运行时环境。从 `plugin-sdk/plugin-test-runtime` 导入                                       |
| `createPluginSetupWizardStatus`                      | 为渠道插件构建设置状态辅助器。从 `plugin-sdk/plugin-test-runtime` 导入                                        |
| `describeOpenAIProviderRuntimeContract`              | 安装提供商系列运行时契约检查。从 `plugin-sdk/provider-test-contracts` 导入                                    |
| `expectPassthroughReplayPolicy`                      | 断言提供商重放策略通过提供商拥有的工具和元数据。从 `plugin-sdk/provider-test-contracts` 导入                  |
| `runRealtimeSttLiveTest`                             | 使用共享音频固件运行实时实时 STT 提供商测试。从 `plugin-sdk/provider-test-contracts` 导入                     |
| `normalizeTranscriptForMatch`                        | 在模糊断言之前规范化实时转录输出。从 `plugin-sdk/provider-test-contracts` 导入                                |
| `expectExplicitVideoGenerationCapabilities`          | 断言视频提供商声明显式的生成模式功能。从 `plugin-sdk/provider-test-contracts` 导入                            |
| `expectExplicitMusicGenerationCapabilities`          | 断言音乐提供商声明显式的生成/编辑功能。从 `plugin-sdk/provider-test-contracts` 导入                           |
| `mockSuccessfulDashscopeVideoTask`                   | 安装成功的兼容 DashScope 的视频任务响应。从 `plugin-sdk/provider-test-contracts` 导入                         |
| `getProviderHttpMocks`                               | 访问可选提供商 HTTP/身份验证 Vitest 模拟。从 `plugin-sdk/provider-http-test-mocks` 导入                       |
| `installProviderHttpMockCleanup`                     | 在每个测试后重置提供商 HTTP/身份验证模拟。从 `plugin-sdk/provider-http-test-mocks` 导入                       |
| `installCommonResolveTargetErrorCases`               | 用于目标解析错误处理的共享测试用例。从 `plugin-sdk/channel-target-testing` 导入                               |
| `shouldAckReaction`                                  | 检查渠道是否应添加确认反应。从 `plugin-sdk/channel-feedback` 导入                                             |
| `removeAckReactionAfterReply`                        | 在回复传递后移除确认反应。从 `plugin-sdk/channel-feedback` 导入                                               |
| `createTestRegistry`                                 | 构建渠道插件注册表固件。从 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 导入         |
| `createEmptyPluginRegistry`                          | 构建一个空的插件注册表固件。从 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 导入     |
| `setActivePluginRegistry`                            | 为插件运行时测试安装注册表固件。从 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 导入 |
| `createRequestCaptureJsonFetch`                      | 在 media helper 测试中捕获 JSON fetch 请求。从 `plugin-sdk/test-env` 导入                                     |
| `withServer`                                         | 针对一次性本地 HTTP 服务器运行测试。从 `plugin-sdk/test-env` 导入                                             |
| `createMockIncomingRequest`                          | 构建一个最小的传入 HTTP 请求对象。从 `plugin-sdk/test-env` 导入                                               |
| `withFetchPreconnect`                                | 在安装了 preconnect hooks 的情况下运行 fetch 测试。从 `plugin-sdk/test-env` 导入                              |
| `withEnv` / `withEnvAsync`                           | 临时修补环境变量。从 `plugin-sdk/test-env` 导入                                                               |
| `createTempHomeEnv` / `withTempHome` / `withTempDir` | 创建隔离的文件系统测试装置。从 `plugin-sdk/test-env` 导入                                                     |
| `createMockServerResponse`                           | 创建一个最小的 HTTP 服务器响应 mock。从 `plugin-sdk/test-env` 导入                                            |
| `createCliRuntimeCapture`                            | 在测试中捕获 CLI 运行时输出。从 `plugin-sdk/test-fixtures` 导入                                               |
| `importFreshModule`                                  | 导入带有新查询令牌的 ESM 模块以绕过模块缓存。从 `plugin-sdk/test-fixtures` 导入                               |
| `bundledPluginRoot` / `bundledPluginFile`            | 解析捆绑插件源码或 dist 装置路径。从 `plugin-sdk/test-fixtures` 导入                                          |
| `mockNodeBuiltinModule`                              | 安装狭窄的 Node 内置 Vitest mocks。从 `plugin-sdk/test-node-mocks` 导入                                       |
| `createSandboxTestContext`                           | 构建沙盒测试上下文。从 `plugin-sdk/test-fixtures` 导入                                                        |
| `writeSkill`                                         | 编写技能装置。从 `plugin-sdk/test-fixtures` 导入                                                              |
| `makeAgentAssistantMessage`                          | 构建 Agent 传输消息装置。从 `plugin-sdk/test-fixtures` 导入                                                   |
| `peekSystemEvents` / `resetSystemEventsForTest`      | 检查并重置系统事件装置。从 `plugin-sdk/test-fixtures` 导入                                                    |
| `sanitizeTerminalText`                               | 清理终端输出以用于断言。从 `plugin-sdk/test-fixtures` 导入                                                    |
| `countLines` / `hasBalancedFences`                   | 断言分块输出形状。从 `plugin-sdk/test-fixtures` 导入                                                          |
| `runProviderCatalog`                                 | 使用测试依赖项执行提供商目录钩子                                                                              |
| `resolveProviderWizardOptions`                       | 解析合约测试中的提供商设置向导选项                                                                            |
| `resolveProviderModelPickerEntries`                  | 解析合约测试中的提供商模型选择器条目                                                                          |
| `buildProviderPluginMethodChoice`                    | 构建提供商向导选项 ID 以进行断言                                                                              |
| `setProviderWizardProvidersResolverForTest`          | 为隔离测试注入提供商向导提供商                                                                                |
| `createProviderUsageFetch`                           | 构建提供商使用获取装置                                                                                        |
| `useFrozenTime` / `useRealTime`                      | 冻结和恢复计时器以进行时间敏感测试。从 `plugin-sdk/test-env` 导入                                             |
| `createTestWizardPrompter`                           | 构建模拟的设置向导提示器                                                                                      |
| `createRuntimeTaskFlow`                              | 创建隔离的运行时任务流状态                                                                                    |
| `typedCases`                                         | 保留表驱动测试的字面量类型。从 `plugin-sdk/test-fixtures` 导入                                                |

捆绑插件合约套件也使用 SDK 测试子路径来处理仅测试的注册表、清单、公共工件和运行时装置助手。依赖于捆绑 OpenClaw 清单的核心专用套件保留在 OpenClaw`src/plugins/contracts` 下。
请将新的扩展测试放在文档化的专注 SDK 子路径上，例如
`plugin-sdk/plugin-test-api`、`plugin-sdk/channel-contract-testing`、
`plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/channel-test-helpers`、
`plugin-sdk/plugin-test-contracts`、`plugin-sdk/plugin-test-runtime`、
`plugin-sdk/provider-test-contracts`、`plugin-sdk/provider-http-test-mocks`、
`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures`，而不是直接导入
广泛的 `plugin-sdk/testing` 兼容性桶、仓库 `src/**` 文件或仓库
`test/helpers/*` 桥接。

### 类型

专注的测试子路径还会重新导出测试文件中有用的类型：

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext } from "openclaw/plugin-sdk/channel-contract";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import type { MockFn, PluginRuntime, RuntimeEnv } from "openclaw/plugin-sdk/plugin-test-runtime";
```

## 测试目标解析

使用 `installCommonResolveTargetErrorCases` 添加渠道目标解析的标准错误情况：

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

## 测试模式

### 测试注册契约

将手写的 `api` mock 传递给 `register(api)` 的单元测试不会执行
OpenClaw 的加载器接受检查。请为您的插件依赖的每个注册表面
（尤其是 hooks 和 memory 等独占功能）至少添加一个由加载器支持的冒烟测试。

当缺少必需的元数据或插件调用了其不拥有的功能 API 时，
真正的加载器会导致插件注册失败。例如，
`api.registerHook(...)` 需要一个 hook 名称，
而 `api.registerMemoryCapability(...)` 要求插件清单或导出的
入口声明 `kind: "memory"`。

### 测试运行时配置访问

在测试捆绑的渠道插件时，请首选 `openclaw/plugin-sdk/channel-test-helpers` 中的
共享插件运行时 mock。其已弃用的 `runtime.config.loadConfig()` 和
`runtime.config.writeConfigFile(...)` mocks 默认会抛出错误，以便测试捕获
对兼容性 的新使用。仅当测试明确涵盖旧版兼容性行为时，
才覆盖这些 mocks。

### 单元测试渠道插件

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

### 单元测试提供商插件

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

### 模拟插件运行时

对于使用 `createPluginRuntimeStore` 的代码，请在测试中模拟运行时：

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

### 使用逐实例存根进行测试

首选逐实例存根而非原型变更：

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## 契约测试（仓库内插件）

捆绑插件具有验证注册所有权的契约测试：

```bash
pnpm test -- src/plugins/contracts/
```

这些测试断言：

- 哪些插件注册了哪些提供商
- 哪些插件注册了哪些语音提供商
- 注册形状的正确性
- 运行时契约合规性

### 运行作用域测试

对于特定插件：

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

仅运行契约测试：

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth-choice.contract.test.ts
pnpm test -- src/plugins/contracts/runtime-seams.contract.test.ts
```

## Lint 强制执行（仓库内插件）

对于仓库内插件，`pnpm check` 强制执行三项规则：

1. **禁止单体根导入** -- 拒绝 `openclaw/plugin-sdk` 根 barrel
2. **禁止直接 `src/` 导入** -- 插件不能直接导入 `../../src/`
3. **禁止自导入** -- 插件不能导入自己的 `plugin-sdk/<name>` 子路径

外部插件不受这些 lint 规则的约束，但建议遵循相同的模式。

## 测试配置

OpenClaw 使用 Vitest 和 V8 覆盖率阈值。对于插件测试：

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

如果本地运行导致内存压力：

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## 相关

- [SDK 概述](/zh/plugins/sdk-overview) -- 导入约定
- [SDK 渠道插件](/zh/plugins/sdk-channel-plugins) -- 渠道插件接口
- [SDK 提供商插件](/zh/plugins/sdk-provider-plugins) -- 提供商插件钩子
- [构建插件](/zh/plugins/building-plugins) -- 入门指南
