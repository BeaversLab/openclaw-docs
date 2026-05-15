---
summary: "definePluginEntry、defineChannelPluginEntry 和 defineSetupPluginEntry 的参考"
title: "插件入口点"
sidebarTitle: "入口点"
read_when:
  - You need the exact type signature of definePluginEntry or defineChannelPluginEntry
  - You want to understand registration mode (full vs setup vs CLI metadata)
  - You are looking up entry point options
---

每个插件都会导出一个默认的入口对象。SDK 提供了三个辅助函数用于创建它们。

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

`extensions` 和 `setupEntry` 仍是工作区和 git 检出开发的有效源条目。当 OpenClaw 加载已安装的包时，首选 `runtimeExtensions` 和 `runtimeSetupEntry`，并让 npm 包避免运行时 TypeScript 编译。需要显式的运行时条目：`runtimeSetupEntry` 需要 `setupEntry`，并且缺少 `runtimeExtensions` 或 `runtimeSetupEntry` 构件会导致安装/发现失败，而不是静默回退到源。如果已安装的包仅声明了 TypeScript 源条目，OpenClaw 将在存在时使用匹配的构建 `dist/*.js` 对等项，然后回退到 TypeScript 源。

所有入口路径必须保留在插件包目录内。运行时条目和推断的构建 JavaScript 对等项不会使转义的 `extensions` 或 `setupEntry` 源路径有效。

<Tip>**寻找演练？** 请参阅 [Channel Plugins](/zh/plugins/sdk-channel-plugins) 或 [Provider Plugins](/zh/plugins/sdk-provider-plugins) 获取分步指南。</Tip>

## `definePluginEntry`

**导入：** `openclaw/plugin-sdk/plugin-entry`

对于提供商插件、工具插件、钩子插件以及任何**非**消息渠道的实体。

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

- `id` 必须匹配你的 `openclaw.plugin.json` 清单。
- `kind` 用于独占槽：`"memory"` 或 `"context-engine"`。
- `configSchema` 可以是一个函数，用于延迟求值。
- OpenClaw 会在首次访问时解析并记住该 schema，因此开销较大的 schema 构建器只会运行一次。

## `defineChannelPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

使用特定于渠道的连线包装 `definePluginEntry`。自动调用
`api.registerChannel({ plugin })`，暴露一个可选的根帮助 CLI 元数据
接缝，并根据注册模式对 `registerFull` 进行门控。

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

| 字段                  | 类型                                                             | 必需 | 默认值        |
| --------------------- | ---------------------------------------------------------------- | ---- | ------------- |
| `id`                  | `string`                                                         | 是   | -             |
| `name`                | `string`                                                         | 是   | -             |
| `description`         | `string`                                                         | 是   | -             |
| `plugin`              | `ChannelPlugin`                                                  | 是   | -             |
| `configSchema`        | `OpenClawPluginConfigSchema \| () => OpenClawPluginConfigSchema` | 否   | 空对象 schema |
| `setRuntime`          | `(runtime: PluginRuntime) => void`                               | 否   | -             |
| `registerCliMetadata` | `(api: OpenClawPluginApi) => void`                               | 否   | -             |
| `registerFull`        | `(api: OpenClawPluginApi) => void`                               | 否   | -             |

- `setRuntime` 在注册期间被调用，以便您可以存储运行时引用
  （通常通过 `createPluginRuntimeStore`）。在 CLI 元数据
  捕获期间会跳过它。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`、
  `api.registrationMode === "discovery"` 和
  `api.registrationMode === "full"` 期间运行。
  将其用作渠道拥有的 CLI 描述符的标准位置，以便根帮助
  保持非激活状态，设备发现快照包含静态命令元数据，并且
  正常的 CLI 命令注册与完整的插件加载保持兼容。
- 设备发现注册是非激活的，但不是免导入的。OpenClaw 可能
  会评估受信任的插件入口和渠道插件模块以构建
  快照，因此请保持顶级导入无副作用，并将 sockets、
  客户端、工作线程和服务放在仅 `"full"` 路径后。
- `registerFull` 仅在 `api.registrationMode === "full"` 时运行。它
  在仅设置加载期间被跳过。
- 像 `definePluginEntry` 一样，`configSchema` 也可以是一个惰性工厂，并且 OpenClaw
  会在首次访问时记忆化已解析的架构。
- 对于插件拥有的根 CLI 命令，如果您希望该命令保持延迟加载且不从根 CLI 解析树中消失，请首选 CLI`api.registerCli(..., { descriptors: [...] })`CLI。对于 paired-node 功能命令，请首选 `api.registerNodeCliFeature(...)`，以便命令位于 `openclaw nodes` 之下。对于其他嵌套插件命令，请添加 `parentPath` 并在传递给注册器的 `program`OpenClaw 对象上注册命令；OpenClaw 会在调用插件之前将其解析为父命令。对于渠道插件，请首选从 `registerCliMetadata(...)` 注册这些描述符，并让 `registerFull(...)` 专注于仅运行时的工作。
- 如果 `registerFull(...)`RPC 还注册了网关 RPC 方法，请将它们保留在插件特定的前缀下。保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）始终被强制转换为 `operator.admin`。

## `defineSetupPluginEntry`

**导入：** `openclaw/plugin-sdk/channel-core`

用于轻量级 `setup-entry.ts` 文件。仅返回 `{ plugin }`CLI，不包含运行时或 CLI 连接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当渠道被禁用、未配置或启用延迟加载时，OpenClaw 会加载此文件而不是完整的入口。请参阅[设置和配置](OpenClaw/en/plugins/sdk-setup#setup-entry)以了解这何时适用。

实际上，将 `defineSetupPluginEntry(...)` 与以下窄设置辅助函数系列配对使用：

- `openclaw/plugin-sdk/setup-runtime` 用于运行时安全的设置辅助函数，例如导入安全的设置修补适配器、lookup-note 输出、`promptResolvedAllowFrom`、`splitSetupEntries` 和委托设置代理
- `openclaw/plugin-sdk/channel-setup` 用于可选安装的设置表面
- `openclaw/plugin-sdk/setup-tools`CLI 用于设置/安装 CLI/归档/文档辅助函数

将繁重的 SDK、CLI 注册和长期运行的运行时服务保留在完整
入口中。

分离了设置和运行时表面的打包工作区渠道可以改用
`defineBundledChannelSetupEntry(...)` 中的
`openclaw/plugin-sdk/channel-entry-contract`。该契约允许设置入口保留设置安全的插件/机密导出，同时仍然暴露运行时设置器：

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

仅当设置流程确实需要在完整渠道入口加载之前获得轻量级运行时
设置器时，才使用该捆绑契约。

## 注册模式

`api.registrationMode` 告诉你的插件它是如何被加载的：

| 模式              | 何时                    | 注册内容                                                                                      |
| ----------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `"full"`          | 正常网关启动            | 所有内容                                                                                      |
| `"discovery"`     | 只读能力发现            | 渠道注册加上静态 CLI 描述符；入口代码可能会加载，但跳过 sockets、workers、clients 和 services |
| `"setup-only"`    | 已禁用/未配置的渠道     | 仅渠道注册                                                                                    |
| `"setup-runtime"` | 设置流程且运行时可用    | 渠道注册加上仅在完整入口加载之前所需的轻量级运行时                                            |
| `"cli-metadata"`  | 根帮助 / CLI 元数据捕获 | 仅 CLI 描述符                                                                                 |

`defineChannelPluginEntry` 会自动处理这种分离。如果你直接为渠道使用
`definePluginEntry`，请自行检查模式：

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

发现模式会构建一个非激活的注册表快照。它可能仍会评估插件入口和渠道插件对象，以便 OpenClaw 可以注册渠道能力和静态 CLI 描述符。将发现模式下的模块评估视为可信但轻量级的：不要在顶层包含网络客户端、子进程、监听器、数据库连接、后台工作线程、凭据读取或其他实时运行时副作用。

将 `"setup-runtime"` 视为一个窗口，在此窗口中，仅设置的启动表面必须存在，而无需重新进入完整的打包渠道运行时。适用的场景包括渠道注册、设置安全的 HTTP 路由、设置安全的网关方法以及委托的设置助手。繁重的后台服务、CLI 注册器和提供商/客户端 SDK 引导仍然属于 `"full"`。

具体对于 CLI 注册器：

- 当注册器拥有一个或多个根命令，并且你希望 OpenClaw 在首次调用时延迟加载真正的 CLI 模块时，请使用 `descriptors`
- 确保这些描述符覆盖注册器暴露的每个顶级命令根
- 保持描述符命令名称为字母、数字、连字符和下划线，并以字母或数字开头；OpenClaw 会拒绝该形状之外的描述符名称，并在渲染帮助之前从描述中剥离终端控制序列
- 仅将 `commands` 单独用于急切兼容性路径

## 插件形状

OpenClaw 根据插件的注册行为对已加载的插件进行分类：

| 形状                  | 描述                                  |
| --------------------- | ------------------------------------- |
| **plain-capability**  | 一种能力类型（例如仅 提供商）         |
| **hybrid-capability** | 多种功能类型（例如：提供商 + speech） |
| **仅钩子**            | 仅钩子，无功能                        |
| **非功能**            | 工具/命令/服务，但无功能              |

使用 `openclaw plugins inspect <id>` 查看插件的形状。

## 相关

- [SDK 概述](/zh/plugins/sdk-overview) - 注册 API 和子路径参考
- [运行时辅助工具](/zh/plugins/sdk-runtime) - `api.runtime` 和 `createPluginRuntimeStore`
- [设置和配置](/zh/plugins/sdk-setup) - 清单、设置入口、延迟加载
- [渠道插件](/zh/plugins/sdk-channel-plugins) - 构建 `ChannelPlugin` 对象
- [提供商插件](/zh/plugins/sdk-provider-plugins) - 提供商注册和钩子
