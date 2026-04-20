---
title: "插件入口"
sidebarTitle: "入口"
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 的参考"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

# 插件入口点

每个插件都会导出一个默认的入口对象。SDK 提供了三个辅助函数来创建它们。

<Tip>**寻找演练？** 请参阅 [渠道插件](/zh/plugins/sdk-channel-plugins) 或 [提供者插件](/zh/plugins/sdk-provider-plugins) 获取分步指南。</Tip>

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

- `id` 必须匹配你的 `openclaw.plugin.json` 清单。
- `kind` 用于专有插槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一个用于延迟评估的函数。
- OpenClaw 在首次访问时解析并记忆该架构，因此昂贵的架构
  构建器只运行一次。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

使用特定于渠道的线路封装 `definePluginEntry`。自动调用
`api.registerChannel({ plugin })`，暴露一个可选的根帮助 CLI 元数据
接缝，并根据注册模式控制 `registerFull`。

```typescript
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";

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

- `setRuntime` 在注册期间被调用，因此您可以存储运行时引用
  （通常通过 `createPluginRuntimeStore`）。在 CLI 元数据
  捕获期间会跳过它。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`
  和 `api.registrationMode === "full"` 期间都会运行。
  将其用作渠道拥有的 CLI 描述符的标准位置，以便根帮助
  保持非激活状态，同时正常的 CLI 命令注册保持与
  完整插件加载的兼容性。
- `registerFull` 仅在 `api.registrationMode === "full"` 时运行。在
  仅设置加载期间会跳过它。
- 与 `definePluginEntry` 类似，`configSchema` 可以是一个惰性工厂，并且 OpenClaw
  会在首次访问时记住已解析的架构。
- 对于插件拥有的根 CLI 命令，当您希望该命令保持惰性加载而不从
  根 CLI 解析树中消失时，请优先使用 `api.registerCli(..., { descriptors: [...] })`
  。对于渠道插件，建议从 `registerCliMetadata(...)` 注册这些描述符，
  并让 `registerFull(...)` 仅专注于运行时工作。
- 如果 `registerFull(...)` 还注册了网关 RPC 方法，请将它们放在
  特定于插件的前缀上。保留的核心管理命名空间（`config.*`、
  `exec.approvals.*`、`wizard.*`、`update.*`）总是被
  强制转换为 `operator.admin`。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用于轻量级的 `setup-entry.ts` 文件。仅返回 `{ plugin }`，不包含
运行时或 CLI 连接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当渠道被禁用、未配置或启用延迟加载时，OpenClaw 会加载此项
而不是完整入口。请参阅
[Setup and Config](/zh/plugins/sdk-setup#setup-entry) 了解这何时很重要。

在实践中，将 `defineSetupPluginEntry(...)` 与狭窄的设置辅助
系列配对使用：

- `openclaw/plugin-sdk/setup-runtime` 用于运行时安全的设置辅助程序，例如
  导入安全的设置补丁适配器、查找说明输出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 以及委托的设置代理
- `openclaw/plugin-sdk/channel-setup` 用于可选安装的设置表面
- 用于设置/安装 CLI/归档/文档辅助函数的 `openclaw/plugin-sdk/setup-tools`

将繁重的 SDK、CLI 注册和长期运行的运行时服务保留在完整入口中。

拆分了设置和运行时表面的打包工作区渠道可以改用
来自 `openclaw/plugin-sdk/channel-entry-contract` 的
`defineBundledChannelSetupEntry(...)`。该契约允许
设置入口保留设置安全的插件/机密导出，同时仍然暴露
运行时设置器：

```typescript
import { defineBundledChannelSetupEntry } from "openclaw/plugin-sdk/channel-entry-contract";

export default defineBundledChannelSetupEntry({
  importMetaUrl: import.meta.url,
  plugin: {
    specifier: "./channel-plugin-api.js",
    exportName: "myChannelPlugin",
  },
  runtime: {
    specifier: "./runtime-api.js",
    exportName: "setMyChannelRuntime",
  },
});
```

仅当设置流程确实需要在完整的渠道入口加载之前拥有轻量级运行时
设置器时，才使用该打包契约。

## 注册模式

`api.registrationMode` 告诉您的插件它是如何加载的：

| 模式              | 何时                     | 注册内容                                           |
| ----------------- | ------------------------ | -------------------------------------------------- |
| `"full"`          | 正常网关启动             | 全部                                               |
| `"setup-only"`    | 已禁用/未配置的渠道      | 仅渠道注册                                         |
| `"setup-runtime"` | 具有可用运行时的设置流程 | 渠道注册以及仅在完整入口加载之前所需的轻量级运行时 |
| `"cli-metadata"`  | 根帮助 / CLI 元数据捕获  | 仅 CLI 描述符                                      |

`defineChannelPluginEntry` 自动处理此拆分。如果您为渠道
直接使用 `definePluginEntry`，请自行检查模式：

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

将 `"setup-runtime"` 视为仅设置启动表面必须存在
且无需重新进入完整打包渠道运行时的窗口。合适的包括
渠道注册、设置安全的 HTTP 路由、设置安全的网关方法以及
委托的设置辅助函数。繁重的后台服务、CLI 注册器以及
提供商/客户端 SDK 引导仍然属于 `"full"`。

特别是对于 CLI 注册器：

- 当注册器拥有一个或多个根命令并且您希望
  OpenClaw 在首次调用时延迟加载实际 CLI 模块时，使用 `descriptors`
- 确保这些描述符覆盖注册器暴露的每个顶级命令根
- 仅将 `commands` 单独用于急切兼容性路径

## 插件形态

OpenClaw 根据加载插件的注册行为对其进行分类：

| 形态                  | 描述                              |
| --------------------- | --------------------------------- |
| **plain-capability**  | 一种功能类型（例如仅提供商）      |
| **hybrid-capability** | 多种功能类型（例如提供商 + 语音） |
| **hook-only**         | 仅挂钩，无功能                    |
| **non-capability**    | 工具/命令/服务，但无功能          |

使用 `openclaw plugins inspect <id>` 查看插件的结构。

## 相关

- [SDK 概述](/zh/plugins/sdk-overview) — 注册 API 和子路径参考
- [运行时辅助函数](/zh/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [设置和配置](/zh/plugins/sdk-setup) — 清单、设置入口、延迟加载
- [通道插件](/zh/plugins/sdk-channel-plugins) — 构建 `ChannelPlugin` 对象
- [提供商插件](/zh/plugins/sdk-provider-plugins) — 提供商注册和钩子
