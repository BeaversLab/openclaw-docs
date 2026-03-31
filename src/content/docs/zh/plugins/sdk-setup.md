---
title: "插件设置和配置"
sidebarTitle: "设置和配置"
summary: "设置向导、setup-entry.ts、配置模式和 package. 元数据"
read_when:
  - You are adding a setup wizard to a plugin
  - You need to understand setup-entry.ts vs index.ts
  - You are defining plugin config schemas or package.json openclaw metadata
---

# 插件设置和配置

关于插件打包（`package.json` 元数据）、清单
（`openclaw.plugin.json`）、设置入口和配置架构的参考。

<Tip>**正在寻找演练？** 操作指南涵盖了相关背景下的打包： [渠道插件](/en/plugins/sdk-channel-plugins#step-1-package-and-manifest) 和 [提供者插件](/en/plugins/sdk-provider-plugins#step-1-package-and-manifest)。</Tip>

## 包元数据

您的 `package.json` 需要一个 `openclaw` 字段，用于告知插件系统
您的插件提供什么：

**渠道插件：**

```json
{
  "name": "@myorg/openclaw-my-channel",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "channel": {
      "id": "my-channel",
      "label": "My Channel",
      "blurb": "Short description of the channel."
    }
  }
}
```

**提供商插件：**

```json
{
  "name": "@myorg/openclaw-my-provider",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "providers": ["my-provider"]
  }
}
```

### `openclaw` 字段

| 字段         | 类型       | 描述                                                                                 |
| ------------ | ---------- | ------------------------------------------------------------------------------------ |
| `extensions` | `string[]` | 入口文件（相对于包根目录）                                                           |
| `setupEntry` | `string`   | 轻量级仅设置入口（可选）                                                             |
| `channel`    | `object`   | 渠道元数据：`id`、`label`、`blurb`、`selectionLabel`、`docsPath`、`order`、`aliases` |
| `providers`  | `string[]` | 由此插件注册的提供商 ID                                                              |
| `install`    | `object`   | 安装提示：`npmSpec`、`localPath`、`defaultChoice`                                    |
| `startup`    | `object`   | 启动行为标志                                                                         |

### 延迟完全加载

渠道插件可以通过以下方式选择延迟加载：

```json
{
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

启用后，OpenClaw 在预监听启动
阶段仅加载 `setupEntry`，即使对于已配置的渠道也是如此。完整入口在
网关开始监听后加载。

<Warning>仅当您的 `setupEntry` 在网关开始监听之前注册了网关所需的所有内容（渠道注册、HTTP 路由、 网关方法）时，才启用延迟加载。如果完整入口拥有必需的启动功能，请 保持默认行为。</Warning>

## 插件清单

每个原生插件必须在包根目录中提供一个 `openclaw.plugin.json`。
OpenClaw 使用它来验证配置，而无需执行插件代码。

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Adds My Plugin capabilities to OpenClaw",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "webhookSecret": {
        "type": "string",
        "description": "Webhook verification secret"
      }
    }
  }
}
```

对于渠道插件，请添加 `kind` 和 `channels`：

```json
{
  "id": "my-channel",
  "kind": "channel",
  "channels": ["my-channel"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

即使没有配置的插件也必须提供一个架构。空架构是有效的：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

有关完整的架构参考，请参阅 [插件清单](/en/plugins/manifest)。

## 设置入口

`setup-entry.ts` 文件是 `index.ts` 的轻量级替代方案，
当 OpenClaw 仅需要设置界面（新手引导、配置修复、
已禁用渠道检查）时会加载它。

```typescript
// setup-entry.ts
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
import { myChannelPlugin } from "./src/channel.js";

export default defineSetupPluginEntry(myChannelPlugin);
```

这避免了在设置流程期间加载繁重的运行时代码（加密库、CLI 注册、
后台服务）。

**当 OpenClaw 使用 `setupEntry` 而不是完整入口时：**

- 渠道已禁用但需要设置/新手引导界面
- 渠道已启用但未配置
- 已启用延迟加载（`deferConfiguredChannelFullLoadUntilAfterListen`）

**`setupEntry` 必须注册的内容：**

- 渠道插件对象（通过 `defineSetupPluginEntry`）
- 网关监听之前所需的任何 HTTP 路由
- 启动期间所需的任何网关方法

**`setupEntry` 不应包含的内容：**

- CLI 注册
- 后台服务
- 繁重的运行时导入（crypto、SDK）
- 仅在启动后需要的 Gateway(网关) 方法

## 配置架构

插件配置会根据清单中的 JSON Schema 进行验证。用户
通过以下方式配置插件：

```json5
{
  plugins: {
    entries: {
      "my-plugin": {
        config: {
          webhookSecret: "abc123",
        },
      },
    },
  },
}
```

您的插件会在注册期间以 `api.pluginConfig` 的形式接收此配置。

对于特定于渠道的配置，请改用渠道配置部分：

```json5
{
  channels: {
    "my-channel": {
      token: "bot-token",
      allowFrom: ["user1", "user2"],
    },
  },
}
```

### 构建渠道配置架构

使用来自 `openclaw/plugin-sdk/core` 的 `buildChannelConfigSchema` 将
Zod 架构转换为 OpenClaw 验证的 `ChannelConfigSchema` 包装器：

```typescript
import { z } from "zod";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk/core";

const accountSchema = z.object({
  token: z.string().optional(),
  allowFrom: z.array(z.string()).optional(),
  accounts: z.object({}).catchall(z.any()).optional(),
  defaultAccount: z.string().optional(),
});

const configSchema = buildChannelConfigSchema(accountSchema);
```

## 设置向导

渠道插件可以为 `openclaw onboard` 提供交互式设置向导。
该向导是 `ChannelPlugin` 上的一个 `ChannelSetupWizard` 对象：

```typescript
import type { ChannelSetupWizard } from "openclaw/plugin-sdk/channel-setup";

const setupWizard: ChannelSetupWizard = {
  channel: "my-channel",
  status: {
    configuredLabel: "Connected",
    unconfiguredLabel: "Not configured",
    resolveConfigured: ({ cfg }) => Boolean((cfg.channels as any)?.["my-channel"]?.token),
  },
  credentials: [
    {
      inputKey: "token",
      providerHint: "my-channel",
      credentialLabel: "Bot token",
      preferredEnvVar: "MY_CHANNEL_BOT_TOKEN",
      envPrompt: "Use MY_CHANNEL_BOT_TOKEN from environment?",
      keepPrompt: "Keep current token?",
      inputPrompt: "Enter your bot token:",
      inspect: ({ cfg, accountId }) => {
        const token = (cfg.channels as any)?.["my-channel"]?.token;
        return {
          accountConfigured: Boolean(token),
          hasConfiguredValue: Boolean(token),
        };
      },
    },
  ],
};
```

`ChannelSetupWizard` 类型支持 `credentials`、`textInputs`、
`dmPolicy`、`allowFrom`、`groupAccess`、`prepare`、`finalize` 等等。
请参阅捆绑插件（例如 `extensions/discord/src/channel.setup.ts`）以获取
完整示例。

对于只需要标准 `note -> prompt -> parse -> merge -> patch` 流程的私信
允许列表提示，请优先使用来自 `openclaw/plugin-sdk/setup` 的共享设置
辅助函数：`createPromptParsedAllowFromForAccount(...)`、
`createTopLevelChannelParsedAllowFromPrompt(...)` 和
`createNestedChannelParsedAllowFromPrompt(...)`。

对于仅标签、分数和可选额外行不同的渠道设置状态块，请优先使用来自
`openclaw/plugin-sdk/setup` 的 `createStandardChannelSetupStatus(...)`，而不是在每个插件中
手动构建相同的 `status` 对象。

对于仅应在特定上下文中出现的可选设置界面，请使用
来自 `openclaw/plugin-sdk/channel-setup` 的 `createOptionalChannelSetupSurface`：

```typescript
import { createOptionalChannelSetupSurface } from "openclaw/plugin-sdk/channel-setup";

const setupSurface = createOptionalChannelSetupSurface({
  channel: "my-channel",
  label: "My Channel",
  npmSpec: "@myorg/openclaw-my-channel",
  docsPath: "/channels/my-channel",
});
// Returns { setupAdapter, setupWizard }
```

## 发布和安装

**外部插件：** 发布到 [ClawHub](/en/tools/clawhub) 或 npm，然后安装：

```bash
openclaw plugins install @myorg/openclaw-my-plugin
```

OpenClaw 先尝试 ClawHub，然后自动回退到 npm。您也可以
强制指定特定源：

```bash
openclaw plugins install clawhub:@myorg/openclaw-my-plugin   # ClawHub only
openclaw plugins install npm:@myorg/openclaw-my-plugin       # npm only
```

**仓库内插件：** 放置在 `extensions/` 下，它们将在
构建期间自动被发现。

**用户可以浏览和安装：**

```bash
openclaw plugins search <query>
openclaw plugins install <package-name>
```

<Info>对于来自 npm 的安装，`openclaw plugins install` 运行 `npm install --ignore-scripts`（无生命周期脚本）。保持插件依赖 树为纯 JS/TS，并避免需要 `postinstall` 构建的包。</Info>

## 相关

- [SDK 入口点](/en/plugins/sdk-entrypoints) -- `definePluginEntry` 和 `defineChannelPluginEntry`
- [插件清单](/en/plugins/manifest) -- 完整的清单架构参考
- [构建插件](/en/plugins/building-plugins) -- 分步入门指南
