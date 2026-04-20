---
title: "插件测试"
sidebarTitle: "测试"
summary: "OpenClaw 插件的测试工具和模式"
read_when:
  - You are writing tests for a plugin
  - You need test utilities from the plugin SDK
  - You want to understand contract tests for bundled plugins
---

# 插件测试

OpenClaw 插件的测试工具、模式和 Lint 执行参考。

<Tip>**正在寻找测试示例？** 操作指南包含详细的测试示例： [渠道插件测试](/en/plugins/sdk-channel-plugins#step-6-test) 和 [提供商插件测试](/en/plugins/sdk-provider-plugins#step-6-test)。</Tip>

## 测试工具

**导入：** `openclaw/plugin-sdk/testing`

测试子路径导出了一组有限的辅助工具，供插件作者使用：

```typescript
import { installCommonResolveTargetErrorCases, shouldAckReaction, removeAckReactionAfterReply } from "openclaw/plugin-sdk/testing";
```

### 可用的导出

| 导出                                   | 用途                               |
| -------------------------------------- | ---------------------------------- |
| `installCommonResolveTargetErrorCases` | 用于目标解析错误处理的共享测试用例 |
| `shouldAckReaction`                    | 检查渠道是否应添加确认反应         |
| `removeAckReactionAfterReply`          | 在回复传递后移除确认反应           |

### 类型

测试子路径还重新导出了测试文件中有用的类型：

```typescript
import type { ChannelAccountSnapshot, ChannelGatewayContext, OpenClawConfig, PluginRuntime, RuntimeEnv, MockFn } from "openclaw/plugin-sdk/testing";
```

## 测试目标解析

使用 `installCommonResolveTargetErrorCases` 为渠道目标解析添加标准错误用例：

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

## 测试模式

### 渠道插件的单元测试

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

### 提供商插件的单元测试

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
    loadConfig: vi.fn(),
    writeConfigFile: vi.fn(),
  },
  // ... other namespaces
} as unknown as PluginRuntime;

store.setRuntime(mockRuntime);

// After tests
store.clearRuntime();
```

### 使用每个实例的存根进行测试

优先使用每个实例的存根，而不是原型修改：

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## 合约测试（仓库内插件）

捆绑插件具有验证注册所有权的合约测试：

```bash
pnpm test -- src/plugins/contracts/
```

这些测试断言：

- 哪些插件注册了哪些提供商
- 哪些插件注册了哪些语音提供商
- 注册形状的正确性
- 运行时合约合规性

### 运行范围限定测试

对于特定插件：

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

仅对于合约测试：

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth.contract.test.ts
pnpm test -- src/plugins/contracts/runtime.contract.test.ts
```

## Lint 执行（仓库内插件）

对于仓库内插件，`pnpm check` 强制执行三条规则：

1. **禁止单体根导入** -- 拒绝 `openclaw/plugin-sdk` 根桶
2. **禁止直接导入 `src/`** -- 插件无法直接导入 `../../src/`
3. **禁止自导入** -- 插件无法导入自己的 `plugin-sdk/<name>` 子路径

外部插件不受这些 Lint 规则约束，但建议遵循相同的模式。

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

## 相关内容

- [SDK 概述](/en/plugins/sdk-overview) -- 导入约定
- [SDK 渠道插件](/en/plugins/sdk-channel-plugins) -- 渠道插件接口
- [SDK 提供商插件](/en/plugins/sdk-provider-plugins) -- 提供商插件钩子
- [构建插件](/en/plugins/building-plugins) -- 入门指南
