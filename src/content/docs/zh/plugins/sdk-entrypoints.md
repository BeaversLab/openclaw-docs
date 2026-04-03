---
title: "插件入口点"
sidebarTitle: "入口点"
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 的参考文档"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

# 插件入口点

每个插件都会导出一个默认的入口对象。SDK 提供了三个辅助函数来创建它们。

<Tip>**寻找分步指南？** 请参阅[渠道插件](/en/plugins/sdk-channel-plugins) 或[提供者插件](/en/plugins/sdk-provider-plugins)。</Tip>

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

用特定于渠道的连接包装 `definePluginEntry`。自动调用
`api.registerChannel({ plugin })`，公开一个可选的根帮助 CLI 元数据
接缝，并根据注册模式对 `registerFull` 进行门控。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";

export default defineChannelPluginEntry({
  id: "my-channel",
  name: "My Channel",
  description: "Short summary",
  plugin: myChannelPlugin,
  setRuntime: setMyRuntime,
  registerCliMetadata(api) {
    api.registerCli(/* ... */);
  },
  registerFull(api) {
    api.registerGatewayMethod(/* ... */);
  },
});
```

| 字段                  | 类型                                                             | 必填 | 默认值     |
| --------------------- | ---------------------------------------------------------------- | ---- | ---------- |
| `id`                  | `string`                                                         | 是   | —          |
| `name`                | `string`                                                         | 是   | —          |
| `description`         | `string`                                                         | 是   | —          |
| `plugin`              | `ChannelPlugin`                                                  | 是   | —          |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象架构 |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | —          |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | —          |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | —          |

- `setRuntime` 在注册期间被调用，以便您可以存储运行时引用
  （通常通过 `createPluginRuntimeStore`）。在 CLI 元数据
  捕获期间会跳过它。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`
  和 `api.registrationMode === "full"` 期间都会运行。
  将其作为渠道拥有的 CLI 描述符的规范位置，以便根帮助
  保持非激活状态，同时正常的 CLI 命令注册仍然与
  完整的插件加载兼容。
- `registerFull` 仅在 `api.registrationMode === "full"` 时运行。它仅在
  设置期间加载时被跳过。
- 对于插件拥有的根 CLI 命令，当您希望命令保持延迟加载而不从
  根 CLI 解析树中消失时，请优先使用 `api.registerCli(..., { descriptors: [...] })`。
  对于渠道插件，请优先从 `registerCliMetadata(...)` 注册这些描述符，
  并保持 `registerFull(...)` 仅专注于运行时工作。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/core`

用于轻量级 `setup-entry.ts` 文件。仅返回 `{ plugin }`，没有
运行时或 CLI 连接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当渠道被禁用、未配置或启用延迟加载时，OpenClaw 会加载此文件而不是完整入口。请参阅
[设置和配置](/en/plugins/sdk-setup#setup-entry) 了解其重要性。

## 注册模式

`api.registrationMode` 告诉您的插件它是如何被加载的：

| 模式              | 何时                              | 注册什么             |
| ----------------- | --------------------------------- | -------------------- |
| `"full"`          | 正常网关启动                      | 所有内容             |
| `"setup-only"`    | 已禁用/未配置的渠道               | 仅渠道注册           |
| `"setup-runtime"` | Setup flow with runtime available | 渠道 + 轻量级运行时  |
| `"cli-metadata"`  | Root help / CLI metadata capture  | CLI descriptors only |

`defineChannelPluginEntry` handles this split automatically. If you use
`definePluginEntry` directly for a 渠道, check mode yourself:

```typescript
register(api) {
  if (api.registrationMode === "cli-metadata" || api.registrationMode === "full") {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerService(/* ... */);
}
```

For CLI registrars specifically:

- use `descriptors` when the registrar owns one or more root commands and you
  want OpenClaw to lazy-load the real CLI module on first invocation
- make sure those descriptors cover every top-level command root exposed by the
  registrar
- use `commands` alone only for eager compatibility paths

## Plugin shapes

OpenClaw classifies loaded plugins by their registration behavior:

| Shape                 | Description                                      |
| --------------------- | ------------------------------------------------ |
| **plain-capability**  | One capability type (e.g. 提供商-only)           |
| **hybrid-capability** | Multiple capability types (e.g. 提供商 + speech) |
| **hook-only**         | Only hooks, no capabilities                      |
| **non-capability**    | Tools/commands/services but no capabilities      |

Use `openclaw plugins inspect <id>` to see a plugin's shape.

## Related

- [SDK Overview](/en/plugins/sdk-overview) — registration API and subpath reference
- [Runtime Helpers](/en/plugins/sdk-runtime) — `api.runtime` and `createPluginRuntimeStore`
- [Setup and Config](/en/plugins/sdk-setup) — manifest, setup entry, deferred loading
- [Channel Plugins](/en/plugins/sdk-channel-plugins) — building the `ChannelPlugin` object
- [Provider Plugins](/en/plugins/sdk-provider-plugins) — 提供商 registration and hooks
