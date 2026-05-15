---
summary: "API导入映射、注册 API 参考和 SDK 架构"
title: "插件 SDK 概览"
sidebarTitle: "插件 SDK 概览"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

插件 SDK 是插件与核心之间的类型化契约。此页面是关于**导入什么**以及**可以注册什么**的参考。

<Note>本页面适用于在 OpenClawGateway(网关)OpenClaw 内部使用 `openclaw/plugin-sdk/*` 的插件作者。对于希望通过 Gateway(网关) 运行代理的外部应用、脚本、仪表板、CI 作业和 IDE 扩展，请改用 [OpenClaw App SDK](/zh/concepts/openclaw-sdk) 和 `@openclaw/sdk` 包。</Note>

<Tip>改为寻找操作指南？请从 [构建插件](/zh/plugins/building-plugins) 开始，渠道插件请使用 [渠道插件](/zh/plugins/sdk-channel-plugins)，提供商插件请使用 [提供商插件](/zh/plugins/sdk-provider-pluginsCLI)，本地 AI CLI 后端请使用 [CLI 后端插件](/zh/plugins/cli-backend-pluginsCLI)，工具或生命周期钩子插件请使用 [插件钩子](/zh/plugins/hooks)。</Tip>

## 导入约定

始终从特定的子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每个子路径都是一个独立的小型模块。这可以保持快速启动并防止循环依赖问题。对于特定于渠道的入口/构建辅助工具，请首选 `openclaw/plugin-sdk/channel-core`；将 `openclaw/plugin-sdk/core` 用于更广泛的通用接口和共享辅助工具，例如 `buildChannelConfigSchema`。

对于渠道配置，请通过 `openclaw.plugin.json#channelConfigs` 发布渠道拥有的 JSON Schema。`plugin-sdk/channel-config-schema`OpenClaw 子路径用于共享的 Schema 原语和通用构建器。OpenClaw 的捆绑插件使用 `plugin-sdk/bundled-channel-config-schema` 来保留捆绑渠道 Schema。已弃用的兼容性导出仍保留在 `plugin-sdk/channel-config-schema-legacy` 上；这两个捆绑 Schema 子路径都不是新插件的模式。

<Warning>
  不要导入提供商或渠道品牌的便捷接缝（例如
  `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`）。
  捆绑插件在其自己的 `api.ts` /
  `runtime-api.ts` 桶中组合通用的 SDK 子路径；核心使用者应该使用那些插件本地的
  桶，或者当需求真正跨渠道时添加一个狭窄的通用 SDK 契约。

一小部分捆绑插件辅助接缝在它们有追踪的所有者使用时，仍然会出现在生成的导出
映射中。它们的存在仅用于捆绑插件的
维护，不建议作为新的第三方插件的导入路径。

`openclaw/plugin-sdk/discord` 和 `openclaw/plugin-sdk/telegram-account` 也作为
已弃用的兼容性外观保留，供追踪的所有者使用。请勿
将这些导入路径复制到新插件中；请改用注入的运行时辅助工具和
通用渠道 SDK 子路径。

</Warning>

## 子路径参考

插件 SDK 作为一组按区域（插件入口、渠道、提供商、身份验证、运行时、功能、内存和保留的
捆绑插件辅助工具）分组的狭窄子路径公开。有关完整的目录——已分组并链接——请参阅
[插件 SDK 子路径](/zh/plugins/sdk-subpaths)。

生成的 200 多个子路径列表位于 `scripts/lib/plugin-sdk-entrypoints.json` 中。

## 注册 API

`register(api)` 回调接收一个 `OpenClawPluginApi` 对象，其中包含以下
方法：

### 功能注册

| 方法                                             | 注册内容              |
| ------------------------------------------------ | --------------------- |
| `api.registerProvider(...)`                      | 文本推理 (LLM)        |
| `api.registerAgentHarness(...)`                  | 实验性低级代理执行器  |
| `api.registerCliBackend(...)`                    | 本地 CLI 推理后端     |
| `api.registerChannel(...)`                       | 消息渠道              |
| `api.registerSpeechProvider(...)`                | 文本转语音 / STT 合成 |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转录          |
| `api.registerRealtimeVoiceProvider(...)`         | 双工实时语音会话      |
| `api.registerMediaUnderstandingProvider(...)`    | 图像/音频/视频分析    |
| `api.registerImageGenerationProvider(...)`       | 图像生成              |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成              |
| `api.registerVideoGenerationProvider(...)`       | 视频生成              |
| `api.registerWebFetchProvider(...)`              | Web 获取 / 抓取提供商 |
| `api.registerWebSearchProvider(...)`             | Web 搜索              |

### 工具和命令

| 方法                            | 注册内容                                |
| ------------------------------- | --------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）                  |

当代理需要一个简短的、命令拥有的路由提示时，插件命令可以设置 `agentPromptGuidance`。保持该文本与命令本身相关；不要将提供商或插件特定的策略添加到核心提示构建器中。

### 基础设施

| 方法                                           | 注册内容                            |
| ---------------------------------------------- | ----------------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件钩子                            |
| `api.registerHttpRoute(params)`                | Gateway(网关) HTTP 端点             |
| `api.registerGatewayMethod(name, handler)`     | Gateway(网关) RPC 方法              |
| `api.registerGatewayDiscoveryService(service)` | 本地 Gateway(网关) 发现广播器       |
| `api.registerCli(registrar, opts?)`            | CLI 子命令                          |
| `api.registerNodeCliFeature(registrar, opts?)` | `openclaw nodes` 下的 Node 功能 CLI |
| `api.registerService(service)`                 | 后台服务                            |
| `api.registerInteractiveHandler(registration)` | 交互式处理程序                      |
| `api.registerAgentToolResultMiddleware(...)`   | 运行时工具结果中间件                |
| `api.registerMemoryPromptSupplement(builder)`  | 附加的内存相邻提示部分              |
| `api.registerMemoryCorpusSupplement(adapter)`  | 附加的内存搜索/读取语料库           |

### 工作流插件的主机钩子

主机钩子是插件的 SDK 接口，用于需要参与主机生命周期的插件，而不仅仅是添加提供商、渠道或工具。它们是通用契约；计划模式可以使用它们，审批工作流、工作区策略网关、后台监视器、设置向导和 UI 伴随插件也可以使用它们。

| 方法                                                                     | 它拥有的契约                                                                                                   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `api.registerSessionExtension(...)`                                      | 通过 Gateway(网关) 会话投影的插件拥有的、JSON 兼容的会话状态                                                   |
| `api.enqueueNextTurnInjection(...)`                                      | 注入到单个会话的下一个代理轮次中的持久且仅一次的上下文                                                         |
| `api.registerTrustedToolPolicy(...)`                                     | 捆绑/受信任的预插件工具策略，可以阻止或重写工具参数                                                            |
| `api.registerToolMetadata(...)`                                          | 工具目录显示元数据，无需更改工具实现                                                                           |
| `api.registerCommand(...)`                                               | 作用域插件命令；命令结果可以设置 `continueAgent: true`Discord；Discord 原生命令支持 `descriptionLocalizations` |
| `api.registerControlUiDescriptor(...)`                                   | 针对会话、工具、运行或设置表面的控制 UI 贡献描述符                                                             |
| `api.registerRuntimeLifecycle(...)`                                      | 在重置/删除/重新加载路径上，针对插件拥有的运行时资源的清理回调                                                 |
| `api.registerAgentEventSubscription(...)`                                | 针对工作流状态和监视器的经过清理的事件订阅                                                                     |
| `api.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)` | 每次运行的插件暂存状态，在终止运行生命周期时清除                                                               |
| `api.registerSessionSchedulerJob(...)`                                   | 具有确定性清理功能的插件拥有的会话调度器作业记录                                                               |

这些契约有意分离了权限：

- 外部插件可以拥有会话扩展、UI 描述符、命令、工具元数据、下一轮注入和普通钩子。
- 受信任的工具策略在普通的 `before_tool_call` 钩子之前运行，并且仅限捆绑，因为它们参与主机安全策略。
- 保留的命令所有权仅限捆绑。外部插件应使用其自己的命令名称或别名。
- `allowPromptInjection=false` 禁用了提示变异钩子，包括 `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution`、来自旧版 `before_agent_start` 的提示字段以及 `enqueueNextTurnInjection`。

非 Plan 消费者的示例：

| 插件原型            | 使用的钩子                                                                       |
| ------------------- | -------------------------------------------------------------------------------- |
| 审批工作流          | 会话扩展、命令继续、下一轮注入、UI 描述符                                        |
| 预算/工作区策略门控 | 受信任的工具策略、工具元数据、会话投影                                           |
| 后台生命周期监视器  | 运行时生命周期清理、代理事件订阅、会话调度器所有权/清理、心跳提示贡献、UI 描述符 |
| 设置或新手引导向导  | 会话扩展、作用域命令、控制 UI 描述符                                             |

<Note>保留的核心管理员命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、 `update.*`）始终保持 `operator.admin`，即使插件尝试分配 更窄的 Gateway(网关) 方法范围。对于 插件拥有的方法，首选插件特定的前缀。</Note>

<Accordion title="何时使用工具结果中间件">
  捆绑插件可以在需要在执行后且在运行时
  将结果反馈回模型之前重写工具结果时使用 `api.registerAgentToolResultMiddleware(...)`。这是受信任的、与运行时无关的
  接缝，适用于像 tokenjuice 这样的异步输出缩减器。

捆绑插件必须为每个
目标运行时声明 `contracts.agentToolResultMiddleware`，例如 `["pi", "codex"]`OpenClaw。外部插件
无法注册此中间件；对于不需要
预模型工具结果计时的的工作，请保留正常的 OpenClaw 插件钩子。仅限 Pi 的旧版
嵌入式扩展工厂注册路径已被移除。

</Accordion>

### Gateway(网关) 设备发现注册

`api.registerGatewayDiscoveryService(...)`Gateway(网关)BonjourOpenClawGateway(网关)Gateway(网关) 允许插件在本地设备发现传输（如 mDNS/Bonjour）上
宣传活动的 Gateway(网关)。当启用本地设备发现时，OpenClaw 在
Gateway(网关) 启动期间调用该服务，传递当前
Gateway(网关) 端口和非机密 TXT 提示数据，并在 Gateway(网关) 关闭期间
调用返回的 `stop`Gateway(网关) 处理程序。

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

Gateway(网关) 设备发现插件不得将宣传的 TXT 值视为机密或
身份验证。设备发现是一个路由提示；Gateway(网关) 身份验证和 TLS 固定
仍然拥有信任。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两种命令元数据：

- `commands`：由注册者拥有的显式命令名称
- `descriptors`：用于 CLI 帮助、路由和延迟插件 CLI 注册的解析时命令描述符
- `parentPath`：用于嵌套命令组的可选父命令路径，例如 `["nodes"]`

对于双节点功能，首选 `api.registerNodeCliFeature(registrar, opts?)`。它是 `api.registerCli(..., { parentPath: ["nodes"] })` 的一个轻量级包装器，并将 `openclaw nodes canvas` 等命令标记为显式的插件拥有节点功能。

如果您希望插件命令在正常的根 CLI 路径中保持延迟加载，请提供 `descriptors`，覆盖该注册器公开的每个顶级命令根。

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

嵌套命令将解析后的父命令作为 `program` 接收：

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerNodesCanvasCommands } = await import("./src/cli.js");
    registerNodesCanvasCommands(program);
  },
  {
    parentPath: ["nodes"],
    descriptors: [
      {
        name: "canvas",
        description: "Capture or render canvas content from a paired node",
        hasSubcommands: true,
      },
    ],
  },
);
```

仅在不需要延迟根 CLI 注册时才单独使用 `commands`。该急切兼容路径仍然受支持，但它不会安装描述符支持的占位符以用于解析时延迟加载。

### CLI 后端注册

`api.registerCliBackend(...)` 允许插件拥有本地 AI CLI 后端（例如 `codex-cli`）的默认配置。

- 后端 `id` 成为模型引用（如 `codex-cli/gpt-5`）中的提供商前缀。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的形状。
- 用户配置仍然优先。OpenClaw 在运行 CLI 之前，将 `agents.defaults.cliBackends.<id>` 合并到插件默认配置之上。
- 当后端在合并后需要兼容性重写时（例如标准化旧标志形状），请使用 `normalizeConfig`。
- 对于属于 CLI 方言的请求范围 argv 重写（例如将 OpenClaw 思考级别映射到原生努力标志），请使用 `resolveExecutionArgs`。

有关端到端创作指南，请参阅 [CLI 后端插件](/zh/plugins/cli-backend-plugins)。

### 独占插槽

| 方法                                       | 注册内容                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次激活一个）。`assemble()` 回调接收 `availableTools` 和 `citationsMode`，以便引擎可以定制提示词补充内容。 |
| `api.registerMemoryCapability(capability)` | 统一内存能力                                                                                                            |
| `api.registerMemoryPromptSection(builder)` | 内存提示词部分构建器                                                                                                    |
| `api.registerMemoryFlushPlan(resolver)`    | 内存刷新计划解析器                                                                                                      |
| `api.registerMemoryRuntime(runtime)`       | 内存运行时适配器                                                                                                        |

### 内存嵌入适配器

| 方法                                           | 注册内容                     |
| ---------------------------------------------- | ---------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 用于活动插件的内存嵌入适配器 |

- `registerMemoryCapability`API 是首选的独占内存插件 API。
- `registerMemoryCapability` 也可以公开 `publicArtifacts.listArtifacts(...)`
  以便配套插件可以通过 `openclaw/plugin-sdk/memory-host-core` 使用导出的内存工件，而无需访问特定
  内存插件的私有布局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是兼容旧版的独占内存插件 API。
- `MemoryFlushPlan.model` 可以将刷新轮次固定到精确的 `provider/model`
  引用，例如 `ollama/qwen3:8b`，而无需继承活动的后备
  链。
- `registerMemoryEmbeddingProvider` 允许活动内存插件注册一个
  或多个嵌入适配器 ID（例如 `openai`、`gemini` 或自定义
  插件定义的 ID）。
- 用户配置（如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）将根据这些已注册
  的适配器 ID 进行解析。

### 事件和生命周期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期挂钩 |
| `api.onConversationBindingResolved(handler)` | 会话绑定回调       |

有关示例、常用挂钩名称和保护语义，请参阅[插件挂钩](/zh/plugins/hooks)。

### 挂钩决策语义

- `before_tool_call`：返回 `{ block: true }` 是终止性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `before_tool_call`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而不是覆盖。
- `before_install`：返回 `{ block: true }` 是终局性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `before_install`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是终局性的。一旦任何处理程序声明了分发，较低优先级的处理程序和默认模型分发路径将被跳过。
- `message_sending`：返回 `{ cancel: true }` 是终局性的。一旦任何处理程序设置了它，较低优先级的处理程序将被跳过。
- `message_sending`：返回 `{ cancel: false }` 被视为未做决定（与省略 `cancel` 相同），而不是覆盖。
- `message_received`：当您需要入站线程/主题路由时，请使用类型化的 `threadId` 字段。保留 `metadata` 用于渠道特定的附加项。
- `message_sending`：在回退到渠道特定的 `metadata` 之前，使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 处理网关拥有的启动状态，而不是依赖内部的 `gateway:startup` 钩子。
- `cron_changed`：观察网关拥有的 cron 生命周期变更。在同步外部唤醒调度器时使用 `event.job?.state?.nextRunAtMs` 和 `ctx.getCron?.()`，并将 OpenClaw 作为到期检查和执行的真实来源。

### API 对象字段

| 字段                     | 类型                      | 描述                                                                      |
| ------------------------ | ------------------------- | ------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                                                   |
| `api.name`               | `string`                  | 显示名称                                                                  |
| `api.version`            | `string?`                 | 插件版本（可选）                                                          |
| `api.description`        | `string?`                 | 插件描述（可选）                                                          |
| `api.source`             | `string`                  | 插件源路径                                                                |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                                        |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时为活动的内存运行时快照）                              |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置                         |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助工具](/zh/plugins/sdk-runtime)                                 |
| `api.logger`             | `PluginLogger`            | 作用域日志记录器（`debug`、`info`、`warn`、`error`）                      |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是完整的入口启动/设置窗口之前的轻量级阶段 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                                                |

## 内部模块约定

在您的插件中，使用本地桶文件（barrel files）进行内部导入：

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
  SDK 路径仅用于外部契约。
</Warning>

Facade 加载的捆绑插件公开表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 和类似的公开入口文件）在 OpenClaw 正在运行时优先使用活动运行时配置快照。如果尚未存在运行时快照，它们将回退到磁盘上已解析的配置文件。
打包的捆绑插件 Facade 应通过 OpenClaw 的插件 Facade 加载器加载；从 `dist/extensions/...` 直接导入会绕过清单和运行时 Sidecar 检查，而这些检查是打包安装用于插件自有代码的。

当辅助工具有意特定于提供商且尚不属于通用 SDK 子路径时，提供商插件可以暴露一个狭窄的插件本地合约汇总。捆绑示例：

- \*\*Anthropic：用于 Claude beta-header 和 `service_tier` 流辅助工具的公开 `api.ts` / `contract-api.ts` 接缝。
- \*\*`@openclaw/openai-provider`：`api.ts` 导出提供商构建器、默认模型辅助工具和实时提供商构建器。
- \*\*`@openclaw/openrouter-provider`：`api.ts` 导出提供商构建器以及新手引导/配置辅助工具。

<Warning>
  扩展生产代码还应避免 `openclaw/plugin-sdk/<other-plugin>`
  导入。如果辅助工具确实是共享的，请将其提升到中立的 SDK 子路径（例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他面向功能的表面），而不是将两个插件耦合在一起。
</Warning>

## 相关

<CardGroup cols={2}>
  <Card title="Entry points" icon="door-open" href="/zh/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 选项。
  </Card>
  <Card title="Runtime helpers" icon="gears" href="/zh/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空间参考。
  </Card>
  <Card title="设置和配置" icon="sliders" href="/zh/plugins/sdk-setup">
    打包、清单和配置架构。
  </Card>
  <Card title="测试" icon="vial" href="/zh/plugins/sdk-testing">
    测试工具和 Lint 规则。
  </Card>
  <Card title="SDK 迁移" icon="arrows-turn-right" href="/zh/plugins/sdk-migration">
    从已弃用的接口迁移。
  </Card>
  <Card title="插件内部机制" icon="diagram-project" href="/zh/plugins/architecture">
    深度架构和功能模型。
  </Card>
</CardGroup>
