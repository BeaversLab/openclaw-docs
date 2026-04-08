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

<Tip>**正在寻找分步指南？** 请参阅[渠道插件](/en/plugins/sdk-channel-plugins) 或[提供者插件](/en/plugins/sdk-provider-plugins)。</Tip>

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
- OpenClaw 在首次访问时解析并记忆该架构，因此昂贵的架构
  构建器只运行一次。

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
  捕获期间会被跳过。
- `registerCliMetadata` 在 `api.registrationMode === "cli-metadata"`
  和 `api.registrationMode === "full"` 期间都会运行。
  将其作为渠道拥有的 CLI 描述符的规范位置，以便根帮助
  保持非激活状态，同时正常的 CLI 命令注册仍与
  完整插件加载兼容。
- `registerFull` 仅在 `api.registrationMode === "full"` 时运行。在
  仅设置加载期间会被跳过。
- 与 `definePluginEntry` 类似，`configSchema` 可以是一个惰性工厂，并且 OpenClaw
  会在首次访问时记忆已解析的架构。
- 对于插件拥有的根 CLI 命令，如果您希望命令保持懒加载而不从根 CLI 解析树中消失，请优先使用 `api.registerCli(..., { descriptors: [...] })`。对于渠道插件，请优先从 `registerCliMetadata(...)` 注册这些描述符，并保持 `registerFull(...)` 仅专注于运行时工作。
- 如果 `registerFull(...)` 还注册网关 RPC 方法，请将它们保留在插件特定的前缀下。保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）始终被强制转换为 `operator.admin`。

## `defineSetupPluginEntry`

**Import：** `openclaw/plugin-sdk/channel-core`

用于轻量级 `setup-entry.ts` 文件。仅返回 `{ plugin }`，不包含运行时或 CLI 连接。

```typescript
import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";

export default defineSetupPluginEntry(myChannelPlugin);
```

当渠道被禁用、未配置或启用延迟加载时，OpenClaw 会加载此项而不是完整的入口。有关何时重要的信息，请参阅[设置和配置](/en/plugins/sdk-setup#setup-entry)。

实际上，将 `defineSetupPluginEntry(...)` 与狭窄的设置辅助函数系列配对：

- `openclaw/plugin-sdk/setup-runtime` 用于运行时安全的设置辅助函数，例如导入安全的设置补丁适配器、lookup-note 输出、`promptResolvedAllowFrom`、`splitSetupEntries` 和委托设置代理
- `openclaw/plugin-sdk/channel-setup` 用于可选安装的设置表面
- `openclaw/plugin-sdk/setup-tools` 用于设置/安装 CLI/归档/文档辅助函数

将繁重的 SDK、CLI 注册和长期运行的运行时服务保留在完整入口中。

## 注册模式

`api.registrationMode` 告诉您的插件它是如何加载的：

| 模式              | 何时                  | 注册什么                                     |
| ----------------- | --------------------- | -------------------------------------------- |
| `"full"`          | 正常网关启动          | 所有内容                                     |
| `"setup-only"`    | 已禁用/未配置的渠道   | 仅渠道注册                                   |
| `"setup-runtime"` | 设置流程且运行时可用  | 渠道注册加上完整入口加载前所需的轻量级运行时 |
| `"cli-metadata"`  | 根帮助/CLI 元数据捕获 | 仅 CLI 描述符                                |

`defineChannelPluginEntry` 会自动处理这种拆分。如果你直接针对渠道使用 `definePluginEntry`，请自行检查模式：

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

将 `"setup-runtime"` 视为一个窗口，仅限设置的启动界面必须在此存在，而无需重新进入完整的捆绑渠道运行时。适合的内容包括渠道注册、设置安全的 HTTP 路由、设置安全的网关方法以及委托的设置助手。繁重的后台服务、CLI 注册器以及提供商/客户端 SDK 引导仍然属于 `"full"`。

具体对于 CLI 注册器：

- 当注册器拥有一个或多个根命令，并且你希望 OpenClaw 在首次调用时延迟加载实际的 CLI 模块时，使用 `descriptors`
- 确保这些描述符涵盖注册器公开的每个顶级命令根
- 仅对急切兼容性路径单独使用 `commands`

## 插件形态

OpenClaw 根据其注册行为对加载的插件进行分类：

| 形态                  | 描述                              |
| --------------------- | --------------------------------- |
| **plain-capability**  | 单一能力类型（例如仅提供商）      |
| **hybrid-capability** | 多种能力类型（例如提供商 + 语音） |
| **hook-only**         | 仅包含钩子，没有能力              |
| **non-capability**    | 工具/命令/服务但没有能力          |

使用 `openclaw plugins inspect <id>` 查看插件的形态。

## 相关

- [SDK 概述](/en/plugins/sdk-overview) — 注册 API 和子路径参考
- [运行时助手](/en/plugins/sdk-runtime) — `api.runtime` 和 `createPluginRuntimeStore`
- [设置和配置](/en/plugins/sdk-setup) — 清单、设置入口、延迟加载
- [渠道插件](/en/plugins/sdk-channel-plugins) — 构建 `ChannelPlugin` 对象
- [提供商插件](/en/plugins/sdk-provider-plugins) — 提供商注册和钩子
