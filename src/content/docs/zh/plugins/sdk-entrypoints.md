---
title: "插件入口点"
sidebarTitle: "入口点"
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 的参考文档"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup)
  - You are looking up entry point options
---

# 插件入口点

每个插件都会导出一个默认的入口对象。SDK 提供了三个辅助函数来创建它们。

<Tip>**正在寻找分步教程？** 请参阅 [渠道插件](/en/plugins/sdk-channel-plugins) 或 [提供商插件](/en/plugins/sdk-provider-plugins) 获取分步指南。</Tip>

## `definePluginEntry`

**导入：** `openclaw/plugin-sdk/plugin-entry`

适用于提供商插件、工具插件、Hook 插件以及任何**非**消息渠道的内容。

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  description: "Short summary",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
  },
});
```

| 字段           | 类型                                                             | 必填 | 默认值     |
| -------------- | ---------------------------------------------------------------- | ---- | ---------- |
| `id`           | `string`                                                         | 是   | —          |
| `name`         | `string`                                                         | 是   | —          |
| `description`  | `string`                                                         | 是   | —          |
| `kind`         | `string`                                                         | 否   | —          |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象模式 |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是   | —          |

- `id` 必须与您的 `openclaw.plugin.json` 清单匹配。
- `kind` 用于独占插槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一个用于延迟求值的函数。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/core`

使用特定于渠道的连线包装 `definePluginEntry`。根据注册模式自动调用
`api.registerChannel({ plugin })` 并控制 `registerFull`。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerFull(api) {
    api.registerCli(/* ... */);
    api.registerGatewayMethod(/* ... */);
  },
});
```

| 字段           | 类型                                                             | 必填 | 默认值     |
| -------------- | ---------------------------------------------------------------- | ---- | ---------- |
| `id`           | `string`                                                         | 是   | —          |
| `name`         | `string`                                                         | 是   | —          |
| `description`  | `string`                                                         | 是   | —          |
| `plugin`       | `ChannelPlugin`                                                  | 是   | —          |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象架构 |
| `setRuntime`   | `(runtime: PluginRuntime) => void`                               | 否   | —          |
| `registerFull` | `(api: OpenClawPluginApi) => void`                               | 否   | —          |

- `setRuntime` 在注册期间被调用，以便您可以存储运行时引用
  (通常通过 `createPluginRuntimeStore`)。
- `registerFull` 仅在 `api.registrationMode === "full"` 时运行。在仅设置加载期间
  它会被跳过。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/core`

用于轻量级的 `setup-entry.ts` 文件。仅返回 `{ plugin }`，没有
运行时或 CLI 连接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当渠道被禁用、未配置或启用延迟加载时，OpenClaw 会加载此内容而不是完整入口。请参阅
[Setup and Config](/en/plugins/sdk-setup#setup-entry) 了解这何时适用。

## 注册模式

`api.registrationMode` 告诉您的插件它是如何被加载的：

| 模式              | 何时                   | 注册什么            |
| ----------------- | ---------------------- | ------------------- |
| `"full"`          | 正常网关启动           | 所有内容            |
| `"setup-only"`    | 已禁用/未配置的渠道    | 仅渠道注册          |
| `"setup-runtime"` | 有运行时可用的设置流程 | 渠道 + 轻量级运行时 |

`defineChannelPluginEntry` 自动处理这种分离。如果您
直接针对渠道使用 `definePluginEntry`，请自行检查模式：

```typescript
register(api) {
  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerCli(/* ... */);
  api.registerService(/* ... */);
}
```

## 插件形态

OpenClaw 根据插件的注册行为对其进行分类：

| 形态                  | 描述                              |
| --------------------- | --------------------------------- |
| **plain-capability**  | 一种能力类型（例如仅提供商）      |
| **hybrid-capability** | 多种能力类型（例如提供商 + 语音） |
| **hook-only**         | 仅钩子，无能力                    |
| **non-capability**    | 工具/命令/服务，但没有能力        |

使用 `openclaw plugins inspect <id>` 查看插件的形态。

## 相关

- [SDK Overview](/en/plugins/sdk-overview) — 注册 API 和子路径参考
- [Runtime Helpers](/en/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [Setup and Config](/en/plugins/sdk-setup) — 清单、setup 入口、延迟加载
- [Channel Plugins](/en/plugins/sdk-channel-plugins) — 构建 `ChannelPlugin` 对象
- [Provider Plugins](/en/plugins/sdk-provider-plugins) — 提供商注册和钩子
