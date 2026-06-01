---
summary: "defineToolPlugin、definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 的参考"
title: "插件入口点"
sidebarTitle: "入口点"
read_when:
  - You need the exact type signature of defineToolPlugin, definePluginEntry, or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

每个插件都导出一个默认的入口对象。SDK 提供了用于创建它们的辅助函数。

对于已安装的插件，`package.json` 应在可用时将运行时加载指向已构建的 JavaScript：

```json
{
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"],
    "setupEntry": "./src/setup-entry.ts",
    "runtimeSetupEntry": "./dist/setup-entry.js"
  }
}
```

`extensions` 和 `setupEntry` 对于工作区和 git 检出开发仍然是有效的源入口。当 OpenClaw 加载已安装的软件包时，首选 `runtimeExtensions` 和 `runtimeSetupEntry`，并让 npm 软件包避免运行时 TypeScript 编译。需要显式的运行时入口：`runtimeSetupEntry` 需要 `setupEntry`，并且缺少 `runtimeExtensions` 或 `runtimeSetupEntry` 构件将导致安装/发现失败，而不是静默回退到源。如果已安装的软件包仅声明了 TypeScript 源入口，OpenClaw 将在存在时使用匹配的已构建 `dist/*.js` 同级文件，然后回退到 TypeScript 源。

所有入口路径必须保留在插件软件包目录内。运行时入口和推断的已构建 JavaScript 同级文件不会使逃逸 `extensions` 或 `setupEntry` 源路径生效。

<Tip>**正在寻找演练？** 请参阅 [工具插件](/zh/plugins/tool-plugins)、 [渠道插件](/zh/plugins/sdk-channel-plugins) 或 [提供商插件](/zh/plugins/sdk-provider-plugins) 获取分步指南。</Tip>

## `defineToolPlugin`

**导入：** `openclaw/plugin-sdk/tool-plugin`

对于仅添加代理工具的简单插件。`defineToolPlugin` 使创作源保持精简，从 TypeBox 模式推断配置和工具参数类型，将普通返回值包装在 OpenClaw 工具结果格式中，并暴露 `openclaw plugins build` 写入插件清单的静态元数据。

```typescript
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

export default defineToolPlugin({
  id: "stock-quotes",
  name: "Stock Quotes",
  description: "Fetch stock quotes.",
  configSchema: Type.Object({
    apiKey: Type.Optional(Type.String({ description: "API key." })),
  }),
  tools: (tool) => [
    tool({
      name: "quote",
      label: "Quote",
      description: "Fetch a quote.",
      parameters: Type.Object({
        symbol: Type.String({ description: "Ticker symbol." }),
      }),
      execute: async ({ symbol }, config) => ({ symbol, hasKey: Boolean(config.apiKey) }),
    }),
  ],
});
```

- `configSchema` 是可选的。当省略时，OpenClaw 使用严格的空对象模式，生成的清单仍包含 `configSchema`。
- `execute` 返回普通字符串或 JSON 可序列化值。辅助函数将其包装为带有 `details` 的文本工具结果。
- 工具名称是静态的。`openclaw plugins build` 从声明的工具推导出 `contracts.tools`，因此作者无需手动重复名称。
- 运行时加载保持严格。已安装的插件仍需要 `openclaw.plugin.json` 和 `package.json` `openclaw.extensions`；OpenClaw 不会执行插件代码来推断缺失的清单数据。

## `definePluginEntry`

**导入：** `openclaw/plugin-sdk/plugin-entry`

适用于提供商插件、高级工具插件、钩子插件以及任何**非**消息渠道的内容。

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
| `id`           | `string`                                                         | 是   | -          |
| `name`         | `string`                                                         | 是   | -          |
| `description`  | `string`                                                         | 是   | -          |
| `kind`         | `string`                                                         | 否   | -          |
| `configSchema` | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象模式 |
| `register`     | `(api: OpenClawPluginApi) => void`                               | 是   | -          |

- `id` 必须与你的 `openclaw.plugin.json` 清单匹配。
- `kind` 用于独占插槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一个函数，用于延迟求值。
- OpenClaw 会在首次访问时解析并记忆该架构，因此开销较大的架构构建器只会运行一次。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

使用特定于渠道的连接包装 `definePluginEntry`。自动调用 `api.registerChannel({ plugin })`，暴露可选的根帮助 CLI 元数据接缝，并根据注册模式对 `registerFull` 进行门控。

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
| `id`                  | `string`                                                         | 是   | -          |
| `name`                | `string`                                                         | 是   | -          |
| `description`         | `string`                                                         | 是   | -          |
| `plugin`              | `ChannelPlugin`                                                  | 是   | -          |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象架构 |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | -          |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | -          |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | -          |

- `setRuntime` 在注册期间被调用，以便您可以存储运行时引用（通常通过 `createPluginRuntimeStore`）。在 CLI 元数据捕获期间会跳过它。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`、`api.registrationMode === "discovery"` 和 `api.registrationMode === "full"` 期间运行。将其用作渠道拥有的 CLI 描述符的规范位置，以便根帮助保持非激活状态，设备发现快照包含静态命令元数据，并且正常的 CLI 命令注册与完全插件加载保持兼容。
- 设备发现注册是非激活的，但并非无导入。OpenClaw 可能会评估受信任的插件入口和渠道插件模块以构建快照，因此请保持顶级导入无副作用，并将套接字、客户端、工作程序和服务放在 `"full"` 仅限路径之后。
- `registerFull` 仅在 `api.registrationMode === "full"` 时运行。在仅设置加载期间会被跳过。
- 与 `definePluginEntry` 类似，`configSchema` 可以是一个惰性工厂，并且 OpenClaw 会在首次访问时记忆已解析的模式。
- 对于插件拥有的根 CLI 命令，当你希望命令保持惰性加载而不从根 CLI 解析树中消失时，首选 `api.registerCli(..., { descriptors: [...] })`。对于配对节点功能命令，首选 `api.registerNodeCliFeature(...)`，以便命令位于 `openclaw nodes` 下。对于其他嵌套插件命令，添加 `parentPath` 并在传递给注册器的 `program` 对象上注册命令；OpenClaw 会在调用插件之前将其解析为父命令。对于渠道插件，首选从 `registerCliMetadata(...)` 注册这些描述符，并保持 `registerFull(...)` 仅关注运行时工作。
- 如果 `registerFull(...)` 还注册了网关 RPC 方法，请将它们保持在特定于插件的前缀上。保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）始终被强制为 `operator.admin`。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用于轻量级 `setup-entry.ts` 文件。仅返回 `{ plugin }`，不涉及运行时或 CLI 连接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当渠道被禁用、未配置或启用延迟加载时，OpenClaw 会加载此内容而不是完整入口。请参阅
[设置和配置](/zh/plugins/sdk-setup#setup-entry) 了解这何时适用。

实际上，将 `defineSetupPluginEntry(...)` 与窄设置辅助函数系列配对：

- `openclaw/plugin-sdk/setup-runtime` 用于运行时安全的设置助手（如 `createSetupTranslator`）、导入安全的设置补丁适配器、查找备注输出、`promptResolvedAllowFrom`、`splitSetupEntries` 以及委托设置代理
- `openclaw/plugin-sdk/channel-setup` 用于可选安装的设置表面
- `openclaw/plugin-sdk/setup-tools` 用于设置/安装 CLI/归档/文档助手

将繁重的 SDK、CLI 注册和长期运行的运行时服务保留在完整入口中。

分离了设置和运行时表面的打包工作区渠道可以改为使用
`openclaw/plugin-sdk/channel-entry-contract` 中的
`defineBundledChannelSetupEntry(...)`。该契约允许设置入口保留设置安全的插件/机密导出，同时仍公开运行时设置器：

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
  registerSetupRuntime(api) {
    api.registerHttpRoute({
      path: "/my-channel/events",
      auth: "plugin",
      handler: async (req, res) => {
        /* setup-safe route */
      },
    });
  },
});
```

仅当设置流程确实需要在完整渠道入口加载之前使用轻量级运行时设置程序或设置安全的网关接口时，才使用该捆绑合约。`registerSetupRuntime` 仅针对 `"setup-runtime"` 加载运行；将其限制为
仅配置的路由或必须在延迟完全激活之前存在的方法。

## 注册模式

`api.registrationMode` 告诉您的插件它是如何被加载的：

| 模式              | 何时                     | 注册内容                                                                              |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| `"full"`          | 正常网关启动             | 所有内容                                                                              |
| `"discovery"`     | 只读功能发现             | 渠道注册加上静态 CLI 描述符；入口代码可能会加载，但跳过套接字、工作进程、客户端和服务 |
| `"setup-only"`    | 已禁用/未配置的渠道      | 仅渠道注册                                                                            |
| `"setup-runtime"` | 具有可用运行时的设置流程 | 渠道注册加上加载完整入口之前仅需要的轻量级运行时                                      |
| `"cli-metadata"`  | 根帮助 / CLI 元数据捕获  | 仅 CLI 描述符                                                                         |

`defineChannelPluginEntry` 自动处理这种拆分。如果您直接为
渠道使用 `definePluginEntry`，请自行检查模式：

```typescript
register(api) {
  if (
    api.registrationMode === "cli-metadata" ||
    api.registrationMode === "discovery" ||
    api.registrationMode === "full"
  ) {
    api.registerCli(/* ... */);
    if (api.registrationMode === "cli-metadata") return;
  }

  api.registerChannel({ plugin: myPlugin });
  if (api.registrationMode !== "full") return;

  // Heavy runtime-only registrations
  api.registerService(/* ... */);
}
```

设备发现模式会构建一个非激活的注册表快照。它可能仍会评估插件入口和渠道插件对象，以便 OpenClaw 能够注册渠道功能和静态 CLI 描述符。应将设备发现中的模块评估视为受信任且轻量级的：不要在顶层包含网络客户端、子进程、监听器、数据库连接、后台工作线程、凭据读取或其他实时运行时副作用。

将 `"setup-runtime"` 视为仅设置启动表面必须存在而不重新进入完整捆绑渠道运行时的窗口。适合的选项包括
渠道注册、设置安全的 HTTP 路由、设置安全的网关方法和
委托设置助手。繁重的后台服务、CLI 注册器以及
提供商/客户端 SDK 引导仍然属于 `"full"`。

具体针对 CLI 注册器：

- 当注册器拥有一个或多个根命令并且您
  希望 OpenClaw 在首次调用时延迟加载真正的 CLI 模块时，请使用 `descriptors`
- 确保这些描述符覆盖注册器公开的每个顶级命令根
- 描述符命令名称应仅保留字母、数字、连字符和下划线，并以字母或数字开头；OpenClaw 会拒绝此形状之外的描述符名称，并在呈现帮助之前从描述中剥离终端控制序列
- 仅对急切兼容性路径单独使用 `commands`

## 插件形状

OpenClaw 根据其注册行为对已加载的插件进行分类：

| 形状                  | 描述                              |
| --------------------- | --------------------------------- |
| **plain-capability**  | 一种功能类型（例如仅提供商）      |
| **hybrid-capability** | 多种功能类型（例如提供商 + 语音） |
| **hook-only**         | 仅挂钩，无功能                    |
| **non-capability**    | 工具/命令/服务，但无功能          |

使用 `openclaw plugins inspect <id>` 查看插件的形状。

## 相关

- [SDK 概述](/zh/plugins/sdk-overview) - 注册 API 和子路径参考
- [运行时助手](/zh/plugins/sdk-runtime) - `api.runtime` 和 `createPluginRuntimeStore`
- [Setup and Config](/zh/plugins/sdk-setup) - manifest, setup entry, deferred loading
- [Channel Plugins](/zh/plugins/sdk-channel-plugins) - building the `ChannelPlugin` object
- [Provider Plugins](/zh/plugins/sdk-provider-plugins) - 提供商 registration and hooks
