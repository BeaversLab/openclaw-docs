---
summary: "Import map、注册 API 参考以及 SDK 架构"
title: "插件 SDK 概览"
sidebarTitle: "SDK 概览"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

插件 SDK 是插件与核心之间的类型化契约。此页面是关于**导入什么**以及**可以注册什么**的参考。

<Tip>
  在寻找操作指南？

- 第一次编写插件？从[构建插件](/zh/plugins/building-plugins)开始。
- 渠道插件？请参阅[渠道插件](/zh/plugins/sdk-channel-plugins)。
- 提供商插件？请参阅[提供商插件](/zh/plugins/sdk-provider-plugins)。
- 工具或生命周期钩子插件？请参阅[插件钩子](/zh/plugins/hooks)。
  </Tip>

## 导入约定

始终从特定的子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每个子路径都是一个小的、独立的模块。这可以保持快速启动并防止循环依赖问题。对于特定渠道的入口/构建辅助程序，首选 `openclaw/plugin-sdk/channel-core`；将 `openclaw/plugin-sdk/core` 用于更广泛的整体表面和共享辅助程序，例如 `buildChannelConfigSchema`。

对于渠道配置，请通过 `openclaw.plugin.json#channelConfigs` 发布渠道拥有的 JSON Schema。`plugin-sdk/channel-config-schema` 子路径用于共享的 Schema 原语和通用构建器。已弃用的捆绑渠道 Schema 导出位于 `plugin-sdk/channel-config-schema-legacy` 上，仅用于捆绑兼容性；它们不是新插件的模式。

<Warning>
  不要导入提供商或渠道品牌的便捷接缝（例如
  `openclaw/plugin-sdk/slack`, `.../discord`, `.../signal`, `.../whatsapp`）。
  捆绑插件在其自己的 `api.ts` /
  `runtime-api.ts` 桶内组合通用的 SDK 子路径；核心使用者应该使用那些插件本地的
  桶，或者在需求真正跨渠道时添加狭窄的通用 SDK 契约。

少量捆绑插件辅助接缝（`plugin-sdk/feishu`,
`plugin-sdk/zalo`, `plugin-sdk/matrix*`, 和类似的）仍然出现在
生成的导出映射中。它们仅用于捆绑插件的维护，对于新的第三方插件来说不是推荐的导入路径。

</Warning>

## 子路径参考

插件 SDK 作为一组按领域分组（插件入口、渠道、提供商、身份验证、运行时、能力、内存和保留的
捆绑插件辅助）的狭窄子路径公开。有关完整的目录——已分组并链接——请参阅
[Plugin SDK subpaths](/zh/plugins/sdk-subpaths)。

生成的包含 200 多个子路径的列表位于 `scripts/lib/plugin-sdk-entrypoints.json` 中。

## 注册 API

`register(api)` 回调接收一个包含以下
方法的 `OpenClawPluginApi` 对象：

### 能力注册

| 方法                                             | 注册内容              |
| ------------------------------------------------ | --------------------- |
| `api.registerProvider(...)`                      | 文本推理 (LLM)        |
| `api.registerAgentHarness(...)`                  | 实验性低级代理执行器  |
| `api.registerCliBackend(...)`                    | 本地 CLI 推理后端     |
| `api.registerChannel(...)`                       | 消息传递渠道          |
| `api.registerSpeechProvider(...)`                | 文本转语音 / STT 合成 |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转录          |
| `api.registerRealtimeVoiceProvider(...)`         | 双工实时语音会话      |
| `api.registerMediaUnderstandingProvider(...)`    | 图像/音频/视频分析    |
| `api.registerImageGenerationProvider(...)`       | 图像生成              |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成              |
| `api.registerVideoGenerationProvider(...)`       | 视频生成              |
| `api.registerWebFetchProvider(...)`              | Web 获取/抓取提供商   |
| `api.registerWebSearchProvider(...)`             | Web 搜索              |

### 工具和命令

| 方法                            | 注册内容                                  |
| ------------------------------- | ----------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具（必填或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）                    |

当 Agent 需要一个简短的、由命令拥有的路由提示时，插件命令可以设置 `agentPromptGuidance`。请保持该文本与命令本身相关；不要在核心提示构建器中添加提供商或插件特定的策略。

### 基础设施

| 方法                                           | 注册内容                      |
| ---------------------------------------------- | ----------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件钩子                      |
| `api.registerHttpRoute(params)`                | Gateway(网关) HTTP 端点       |
| `api.registerGatewayMethod(name, handler)`     | Gateway(网关) RPC 方法        |
| `api.registerGatewayDiscoveryService(service)` | 本地 Gateway(网关) 发现广告器 |
| `api.registerCli(registrar, opts?)`            | CLI 子命令                    |
| `api.registerService(service)`                 | 后台服务                      |
| `api.registerInteractiveHandler(registration)` | 交互式处理器                  |
| `api.registerAgentToolResultMiddleware(...)`   | 运行时工具结果中间件          |
| `api.registerMemoryPromptSupplement(builder)`  | 附加的内存邻近提示部分        |
| `api.registerMemoryCorpusSupplement(adapter)`  | 附加的内存搜索/读取语料库     |

<Note>保留的核心管理命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、 `update.*`）始终 `operator.admin`，即使插件尝试分配 更窄的网关方法作用域。对于插件拥有的方法，首选特定于插件的前缀。</Note>

<Accordion title="何时使用工具结果中间件">
  捆绑插件可以在执行后且运行时将结果反馈回 OpenClaw 之前，如果需要重写工具结果，可以使用 `api.registerAgentToolResultMiddleware(...)`。这是受信任的运行时中立接缝，用于诸如 tokenjuice 之类的异步输出缩减器。

捆绑插件必须为每个
目标运行时声明 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`。外部插件
无法注册此中间件；对于不需要 OpenClaw 前工具结果计时的
工作，请保留正常的 OpenClaw 插件钩子。旧的仅限 Pi 的嵌入式
扩展工厂注册路径已被移除。

</Accordion>

### Gateway(网关) 发现注册

`api.registerGatewayDiscoveryService(...)` 允许插件在本地设备发现传输（如 mDNS/Gateway(网关)）上通告活动的 Bonjour。当启用本地设备发现时，OpenClaw 会在 Gateway(网关) 启动期间调用该服务，传递当前的 Gateway(网关) 端口和非机密的 TXT 提示数据，并在 Gateway(网关) 关闭期间调用返回的 `stop` 处理程序。

```typescript
api.registerGatewayDiscoveryService({
  id: "my-discovery",
  async advertise(ctx) {
    const handle = await startMyAdvertiser({
      gatewayPort: ctx.gatewayPort,
      tls: ctx.gatewayTlsEnabled,
      displayName: ctx.machineDisplayName,
    });
    return { stop: () => handle.stop() };
  },
});
```

Gateway(网关) 设备发现插件不得将通告的 TXT 值视为机密或身份验证。设备发现仅是一个路由提示；Gateway(网关) 身份验证和 TLS 固定仍然拥有信任权。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两种顶级元数据：

- `commands`：注册者拥有的显式命令根目录
- `descriptors`：用于根 CLI 帮助、路由和延迟插件 CLI 注册的解析时命令描述符

如果您希望插件命令在常规根 CLI 路径中保持延迟加载，请提供 `descriptors`，覆盖该注册器暴露的每个顶层命令根。

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerMatrixCli } = await import("./src/cli.js");
    registerMatrixCli({ program });
  },
  {
    descriptors: [
      {
        name: "matrix",
        description: "Manage Matrix accounts, verification, devices, and profile state",
        hasSubcommands: true,
      },
    ],
  },
);
```

仅当您不需要根 CLI 延迟注册时，才单独使用 `commands`。该急切兼容路径仍受支持，但它不会安装描述符支持的占位符用于解析时延迟加载。

### CLI 后端注册

`api.registerCliBackend(...)` 允许插件拥有本地 AI CLI 后端（如 `codex-cli`）的默认配置。

- 后端 `id` 成为模型引用（如 `codex-cli/gpt-5`）中的提供商前缀。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的形状。
- 用户配置优先。OpenClaw 会在运行 OpenClaw 之前，将 `agents.defaults.cliBackends.<id>` 合并到插件默认配置之上。
- 当后端在合并后需要兼容性重写（例如标准化旧标志形状）时，请使用 `normalizeConfig`。

### 独占槽位

| 方法                                       | 注册内容                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次激活一个）。`assemble()` 回调接收 `availableTools` 和 `citationsMode`，以便引擎可以定制提示词补充。 |
| `api.registerMemoryCapability(capability)` | 统一内存能力                                                                                                        |
| `api.registerMemoryPromptSection(builder)` | 内存提示词部分构建器                                                                                                |
| `api.registerMemoryFlushPlan(resolver)`    | 内存刷新计划解析器                                                                                                  |
| `api.registerMemoryRuntime(runtime)`       | 内存运行时适配器                                                                                                    |

### 内存嵌入适配器

| 方法                                           | 注册内容                 |
| ---------------------------------------------- | ------------------------ |
| `api.registerMemoryEmbeddingProvider(adapter)` | 活动插件的内存嵌入适配器 |

- `registerMemoryCapability` 是首选的专用内存插件 API。
- `registerMemoryCapability` 也可以公开 `publicArtifacts.listArtifacts(...)`
  以便伴随插件可以通过 `openclaw/plugin-sdk/memory-host-core` 使用导出的内存构件，而无需直接访问特定
  内存插件的私有布局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是与旧版本兼容的专用内存插件 API。
- `registerMemoryEmbeddingProvider` 允许活动内存插件注册一个
  或多个嵌入适配器 ID（例如 `openai`、`gemini` 或自定义
  插件定义的 ID）。
- 用户配置（如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）将根据这些注册的适配器 ID 进行解析。

### 事件和生命周期

| 方法                                         | 功能               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期钩子 |
| `api.onConversationBindingResolved(handler)` | 对话绑定回调       |

有关示例、常用钩子名称和守卫语义，请参阅 [Plugin hooks](/zh/plugins/hooks)。

### 钩子决策语义

- `before_tool_call`：返回 `{ block: true }` 是终止性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `before_tool_call`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而不是覆盖。
- `before_install`：返回 `{ block: true }` 是终局性的。一旦任何处理程序设置了它，优先级较低的处理程序将被跳过。
- `before_install`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是终局性的。一旦任何处理程序声明了调度，较低优先级的处理程序和默认模型调度路径将被跳过。
- `message_sending`：返回 `{ cancel: true }` 是终局性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `message_sending`：返回 `{ cancel: false }` 被视为未做出决定（与省略 `cancel` 相同），而不是覆盖。
- `message_received`：当您需要入站线程/主题路由时，请使用类型化的 `threadId` 字段。保留 `metadata` 用于渠道特定的额外内容。
- `message_sending`：在回退到渠道特定的 `metadata` 之前，使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 来获取网关拥有的启动状态，而不是依赖内部的 `gateway:startup` 钩子。

### API 对象字段

| 字段                     | 类型                      | 描述                                                            |
| ------------------------ | ------------------------- | --------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                                         |
| `api.name`               | `string`                  | 显示名称                                                        |
| `api.version`            | `string?`                 | 插件版本（可选）                                                |
| `api.description`        | `string?`                 | 插件描述（可选）                                                |
| `api.source`             | `string`                  | 插件源路径                                                      |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                              |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时的活动内存运行时快照）                      |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置               |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助工具](/zh/plugins/sdk-runtime)                       |
| `api.logger`             | `PluginLogger`            | 范围限定记录器 (`debug`, `info`, `warn`, `error`)               |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是完整启动/设置之前的轻量级窗口 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                                      |

## 内部模块约定

在您的插件内部，使用本地桶文件（barrel files）进行内部导入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  切勿在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>` 导入您自己的插件。
  请通过 `./api.ts` 或 `./runtime-api.ts` 路由内部导入。
  SDK 路径仅作为外部契约。
</Warning>

Facade 加载的打包插件公共表面（`api.ts`, `runtime-api.ts`,
`index.ts`, `setup-entry.ts` 及类似的公共入口文件）在 OpenClaw 正在运行时首选活动的运行时配置快照。如果运行时快照尚不存在，则回退到磁盘上解析的配置文件。

当辅助工具专门针对特定提供商且尚不属于通用 SDK 子路径时，提供商插件可以公开一个窄范围的插件本地契约桶。打包示例：

- **Anthropic**：用于 Claude beta 标头和 `service_tier` 流辅助工具的
  公共 `api.ts` / `contract-api.ts` 接缝。
- **`@openclaw/openai-provider`**：`api.ts` 导出提供商构建器、
  默认模型辅助工具和实时提供商构建器。
- **`@openclaw/openrouter-provider`**：`api.ts` 导出提供商构建器
  以及新手引导/配置辅助工具。

<Warning>
  扩展生产代码也应避免 `openclaw/plugin-sdk/<other-plugin>`
  导入。如果一个辅助工具确实被共享，请将其提升到中立的 SDK 子路径，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  面向功能的表面，而不是将两个插件耦合在一起。
</Warning>

## 相关

<CardGroup cols={2}>
  <Card title="入口点" icon="door-open" href="/zh/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 选项。
  </Card>
  <Card title="运行时辅助函数" icon="gears" href="/zh/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空间参考。
  </Card>
  <Card title="设置和配置" icon="sliders" href="/zh/plugins/sdk-setup">
    打包、清单和配置架构。
  </Card>
  <Card title="测试" icon="vial" href="/zh/plugins/sdk-testing">
    测试工具和 Lint 规则。
  </Card>
  <Card title="SDK 迁移" icon="arrows-turn-right" href="/zh/plugins/sdk-migration">
    从已弃用的表面迁移。
  </Card>
  <Card title="插件内部机制" icon="diagram-project" href="/zh/plugins/architecture">
    深度架构和模型能力。
  </Card>
</CardGroup>
