---
summary: "APIImport map, registration API 参考, and SDK architecture"
title: "Plugin SDK 概述"
sidebarTitle: "Plugin SDK 概述"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

插件 SDK 是插件与核心之间的类型化契约。此页面是关于**导入什么**以及**可以注册什么**的参考。

<Note>本页面适用于在 OpenClaw 内部使用 `openclaw/plugin-sdk/*`OpenClawGateway(网关)OpenClaw 的插件作者。对于希望通过 Gateway 运行代理的外部应用、脚本、仪表板、CI 作业和 IDE 扩展，请改用 [OpenClaw App SDK](/zh/concepts/openclaw-sdk) 和 `@openclaw/sdk` 包。</Note>

<Tip>寻找操作指南？请从[构建插件](/zh/plugins/building-plugins)开始，渠道插件请使用[渠道插件](/zh/plugins/sdk-channel-plugins)，提供商插件请使用[提供商插件](/zh/plugins/sdk-provider-pluginsCLI)，本地 AI CLI 后端请使用[CLI 后端插件](/zh/plugins/cli-backend-pluginsCLI)，工具或生命周期挂钩插件请使用[插件挂钩](/zh/plugins/hooks)。</Tip>

## 导入约定

始终从特定的子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

Each subpath is a small, self-contained module. This keeps startup fast and
prevents circular dependency issues. For 渠道-specific entry/build helpers,
prefer `openclaw/plugin-sdk/channel-core`; keep `openclaw/plugin-sdk/core` for
the broader umbrella surface and shared helpers such as
`buildChannelConfigSchema`.

For 渠道 config, publish the 渠道-owned JSON Schema through
`openclaw.plugin.json#channelConfigs`. The `plugin-sdk/channel-config-schema`OpenClaw
subpath is for shared schema primitives and the generic builder. OpenClaw's
bundled plugins use `plugin-sdk/bundled-channel-config-schema` for retained
bundled-渠道 schemas. Deprecated compatibility exports remain on
`plugin-sdk/channel-config-schema-legacy`; neither bundled schema subpath is a
pattern for new plugins.

<Warning>
  不要导入提供商或渠道品牌的便利接缝（例如
  `openclaw/plugin-sdk/slack`、`.../discord`、`.../signal`、`.../whatsapp`）。
  捆绑插件在其自己的 `api.ts` /
  `runtime-api.ts` 桶内组合通用 SDK 子路径；核心使用者应使用那些插件本地的
  桶，或者当需求确实跨渠道时添加一个狭窄的通用 SDK 契约。

一小部分捆绑插件辅助接缝仍然出现在生成的导出映射中，
当它们有跟踪的所有者使用情况时。它们仅为了捆绑插件的维护而存在，
不建议作为新的第三方插件的导入路径。

`openclaw/plugin-sdk/discord` 和 `openclaw/plugin-sdk/telegram-account` 也作为已弃用的兼容外观保留，供跟踪的所有者使用。请勿
将这些导入路径复制到新插件中；请改用注入的运行时辅助程序和
通用渠道 SDK 子路径。

</Warning>

## 子路径参考

插件 SDK 暴露为一组按领域分组的狭窄子路径（插件入口、渠道、提供商、身份验证、运行时、功能、内存和保留的捆绑插件辅助程序）。有关完整目录（分组并链接），请参阅[插件 SDK 子路径](/zh/plugins/sdk-subpaths)。

编译器入口清单位于
`scripts/lib/plugin-sdk-entrypoints.json`；包导出是从
公共子集生成的，该子集减去了 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的仓库本地测试/内部子路径。
运行 `pnpm plugin-sdk:surface` 以审核公共导出计数。足够陈旧且未被捆绑扩展生产代码使用的已弃用公共
子路径在 `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` 中跟踪；广泛的
已弃用重新导出桶在 `scripts/lib/plugin-sdk-deprecated-barrel-subpaths.json` 中跟踪。

## 注册 API

`register(api)` 回调接收一个 `OpenClawPluginApi` 对象，其中包含以下
方法：

### 功能注册

| 方法                                             | 注册内容               |
| ------------------------------------------------ | ---------------------- |
| `api.registerProvider(...)`                      | 文本推理 (LLM)         |
| `api.registerAgentHarness(...)`                  | 实验性低级代理执行器   |
| `api.registerCliBackend(...)`                    | 本地 CLI 推理后端      |
| `api.registerChannel(...)`                       | 消息渠道               |
| `api.registerEmbeddingProvider(...)`             | 可重用的向量嵌入提供商 |
| `api.registerSpeechProvider(...)`                | 文本转语音 / STT 合成  |
| `api.registerRealtimeTranscriptionProvider(...)` | 流式实时转录           |
| `api.registerRealtimeVoiceProvider(...)`         | 全双工实时语音会话     |
| `api.registerMediaUnderstandingProvider(...)`    | 图像/音频/视频分析     |
| `api.registerImageGenerationProvider(...)`       | 图像生成               |
| `api.registerMusicGenerationProvider(...)`       | 音乐生成               |
| `api.registerVideoGenerationProvider(...)`       | 视频生成               |
| `api.registerWebFetchProvider(...)`              | Web 获取/抓取提供商    |
| `api.registerWebSearchProvider(...)`             | Web 搜索               |

在 `api.registerEmbeddingProvider(...)` 中注册的嵌入提供商也必须在插件清单中的 `contracts.embeddingProviders` 中列出。这是用于可重用向量生成的通用嵌入界面。内存搜索可以使用此通用提供商界面。较旧的 `api.registerMemoryEmbeddingProvider(...)` 和 `contracts.memoryEmbeddingProviders` 接缝已弃用，仅作为现有内存特定提供商迁移时的兼容性保留。

### 工具和命令

对于具有固定工具名称的简单纯工具插件，请使用 [`defineToolPlugin`](/zh/plugins/tool-plugins)。对于混合插件或完全动态的工具注册，请直接使用 `api.registerTool(...)`。

| 方法                            | 注册内容                                |
| ------------------------------- | --------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理工具（必需或 `{ optional: true }`） |
| `api.registerCommand(def)`      | 自定义命令（绕过 LLM）                  |

当代理需要简短的、由命令拥有的路由提示时，插件命令可以设置 `agentPromptGuidance`。请保持该文本与命令本身相关；不要向核心提示构建器添加提供商或插件特定的策略。

指导条目可能是应用于每个提示表面的旧式字符串，或者是结构化条目：

```ts
agentPromptGuidance: ["Global command hint.", { text: "Only show this in the main OpenClaw prompt.", surfaces: ["openclaw_main"] }];
```

结构化的 `surfaces` 可以包括 `openclaw_main`、`codex_app_server`、`cli_backend`、`acp_backend` 或 `subagent`。`pi_main` 仍然是 `openclaw_main` 的已弃用别名。省略 `surfaces` 以进行有意的全界面指导。不要传递空的 `surfaces` 数组；它会被拒绝，以防止意外的作用域丢失变为全局提示文本。

原生 Codex 应用服务器开发者指令比其他提示界面更严格：只有明确限定范围为 `codex_app_server` 的指导才会提升到该更高优先级的通道。传统的字符串指导和无范围的结构化指导仍可用于非 Codex 提示界面，以保持兼容性。

### 基础设施

| 方法                                           | 注册内容                               |
| ---------------------------------------------- | -------------------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件钩子                               |
| `api.registerHttpRoute(params)`                | Gateway(网关) HTTP 端点                |
| `api.registerGatewayMethod(name, handler)`     | Gateway(网关) RPC 方法                 |
| `api.registerGatewayDiscoveryService(service)` | 本地 Gateway(网关) 发现通告器          |
| `api.registerCli(registrar, opts?)`            | CLI 子命令                             |
| `api.registerNodeCliFeature(registrar, opts?)` | CLI`openclaw nodes` 下的 Node 功能 CLI |
| `api.registerService(service)`                 | 后台服务                               |
| `api.registerInteractiveHandler(registration)` | 交互式处理器                           |
| `api.registerAgentToolResultMiddleware(...)`   | 运行时工具结果中间件                   |
| `api.registerMemoryPromptSupplement(builder)`  | 附加的记忆相邻提示部分                 |
| `api.registerMemoryCorpusSupplement(adapter)`  | 附加的记忆搜索/读取语料库              |

### 工作流插件的主机挂钩

主机挂钩是插件的 SDK 接缝，用于需要参与主机生命周期而不仅仅是添加提供商、渠道或工具的插件。它们是通用合约；计划模式可以使用它们，审批工作流、工作区策略守门、后台监视器、设置向导和 UI 伴侣插件也可以使用它们。

| 方法                                                                                 | 其拥有的合约                                                                                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `api.session.state.registerSessionExtension(...)`                                    | 插件拥有的、通过 Gateway(网关) 会话投射的 JSON 兼容会话状态                                                      |
| `api.session.workflow.enqueueNextTurnInjection(...)`                                 | 持久化的精确一次上下文，注入到一个会话的下一个代理轮次                                                           |
| `api.registerTrustedToolPolicy(...)`                                                 | 捆绑/可信的插件前工具策略，可以阻止或重写工具参数                                                                |
| `api.registerToolMetadata(...)`                                                      | 工具目录显示元数据，不更改工具实现                                                                               |
| `api.registerCommand(...)`                                                           | 有范围的插件命令；命令结果可以设置 `continueAgent: true`Discord；Discord 原生命令支持 `descriptionLocalizations` |
| `api.session.controls.registerControlUiDescriptor(...)`                              | 针对会话、工具、运行或设置表面的控制 UI 贡献描述符                                                               |
| `api.lifecycle.registerRuntimeLifecycle(...)`                                        | 针对插件拥有的运行时资源在重置/删除/重新加载路径上的清理回调                                                     |
| `api.agent.events.registerAgentEventSubscription(...)`                               | 针对工作流状态和监视器的经过清理的事件订阅                                                                       |
| `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`  | 每次运行的插件暂存状态，在终止的运行生命周期中清除                                                               |
| `api.session.workflow.registerSessionSchedulerJob(...)`                              | 针对插件拥有的调度器作业的清理元数据；不调度工作或创建任务记录                                                   |
| `api.session.workflow.sendSessionAttachment(...)`                                    | 仅限捆绑的主机中介文件附件传递到活动的直接出站会话路由                                                           |
| `api.session.workflow.scheduleSessionTurn(...)` / `unscheduleSessionTurnsByTag(...)` | 仅限捆绑的基于 Cron 的计划会话轮次以及基于标签的清理                                                             |
| `api.session.controls.registerSessionAction(...)`                                    | 客户端可通过 Gateway(网关) 调度的类型化会话操作                                                                  |

在新插件代码中使用分组命名空间：

- `api.session.state.registerSessionExtension(...)`
- `api.session.workflow.enqueueNextTurnInjection(...)`
- `api.session.workflow.registerSessionSchedulerJob(...)`
- `api.session.workflow.sendSessionAttachment(...)`
- `api.session.workflow.scheduleSessionTurn(...)`
- `api.session.workflow.unscheduleSessionTurnsByTag(...)`
- `api.session.controls.registerSessionAction(...)`
- `api.session.controls.registerControlUiDescriptor(...)`
- `api.agent.events.registerAgentEventSubscription(...)`
- `api.agent.events.emitAgentEvent(...)`
- `api.runContext.setRunContext(...)` / `getRunContext(...)` / `clearRunContext(...)`
- `api.lifecycle.registerRuntimeLifecycle(...)`

等效的扁平方法仍作为已弃用的兼容别名提供，以支持现有插件。请勿添加调用
`api.registerSessionExtension`、`api.enqueueNextTurnInjection`、
`api.registerControlUiDescriptor`、`api.registerRuntimeLifecycle`、
`api.registerAgentEventSubscription`、`api.emitAgentEvent`、
`api.setRunContext`、`api.getRunContext`、`api.clearRunContext`、
`api.registerSessionSchedulerJob`、`api.registerSessionAction`、
`api.sendSessionAttachment`、`api.scheduleSessionTurn` 或
`api.unscheduleSessionTurnsByTag` 的新插件代码。

`scheduleSessionTurn(...)`Gateway(网关) 是 Gateway(网关)
Cron 调度器之上的会话作用域便捷封装。Cron 负责计时并在轮次运行时创建后台任务记录；Plugin SDK 仅限制目标会话、插件拥有的命名和清理。当工作本身需要持久的多步骤任务流状态时，请在计划的轮次内使用 `api.runtime.tasks.managedFlows`。

这些契约有意划分了权限：

- 外部插件可以拥有会话扩展、UI 描述符、命令、工具元数据、下一轮次注入和普通钩子。
- 受信任工具策略在普通 `before_tool_call` 挂钩之前运行，并且仅限打包使用，因为它们参与主机安全策略。
- 保留的命令所有权仅限于捆绑包。外部插件应使用自己的命令名称或别名。
- `allowPromptInjection=false` 禁用提示词变异钩子，包括
  `agent_turn_prepare`、`before_prompt_build`、`heartbeat_prompt_contribution`、
  来自旧版 `before_agent_start` 的提示词字段，以及
  `enqueueNextTurnInjection`。

非 Plan 使用者的示例：

| 插件原型            | 使用的挂钩                                                                           |
| ------------------- | ------------------------------------------------------------------------------------ |
| 审批工作流          | 会话扩展、命令继续、下一轮注入、UI 描述符                                            |
| 预算/工作区策略闸门 | 可信工具策略、工具元数据、会话投影                                                   |
| 后台生命周期监控器  | 运行时生命周期清理、智能体事件订阅、会话调度器所有权/清理、心跳提示词贡献、UI 描述符 |
| 设置或新手引导向导  | 会话扩展、作用域命令、控制 UI 描述符                                                 |

<Note>保留的核心管理员命名空间（`config.*`、`exec.approvals.*`、`wizard.*`、 `update.*`）始终保持 `operator.admin`，即使插件尝试分配 更窄的 Gateway 方法范围。建议为插件拥有的方法 使用插件特定的前缀。</Note>

<Accordion title="何时使用工具结果中间件">
  捆绑插件可以在需要在执行后重写工具结果并在运行时
  将该结果反馈给模型之前使用 `api.registerAgentToolResultMiddleware(...)`。这是受信任的与运行时无关的
  接缝，用于异步输出缩减器（如 tokenjuice）。

捆绑插件必须为每个
目标运行时声明 `contracts.agentToolResultMiddleware`，例如 `["openclaw", "codex"]`OpenClaw。外部插件
无法注册此中间件；对于不需要模型前工具结果计时的工作，请保留正常的 OpenClaw 插件钩子。旧的仅限嵌入式运行程序
的扩展工厂注册路径已被移除。

</Accordion>

### Gateway(网关) 发现注册

`api.registerGatewayDiscoveryService(...)`Gateway(网关)BonjourOpenClawGateway(网关)Gateway(网关) 允许插件在本地发现传输（如 mDNS/Bonjour）上通告活动的
Gateway(网关)。OpenClaw 在启用本地发现期间 Gateway(网关) 启动时调用
该服务，传递当前 Gateway(网关) 端口和非机密 TXT 提示数据，并在 Gateway(网关) 关闭期间调用返回的
`stop`Gateway(网关) 处理程序。

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

Gateway(网关) 发现插件不得将通告的 TXT 值视为机密或身份验证信息。发现只是一种路由提示；Gateway(网关) 身份验证和 TLS 固定仍然拥有信任权。

### CLI 注册元数据

`api.registerCli(registrar, opts?)` 接受两种命令元数据：

- `commands`：注册者拥有的显式命令名称
- `descriptors`CLICLI：用于 CLI 帮助、
  路由和延迟插件 CLI 注册的解析时命令描述符
- `parentPath`：用于嵌套命令组的可选父命令路径，例如
  `["nodes"]`

对于配对节点功能，首选
`api.registerNodeCliFeature(registrar, opts?)`。它是 `api.registerCli(..., { parentPath: ["nodes"] })` 的一个小包装器，使诸如
`openclaw nodes canvas` 之类的命令成为显式的插件拥有节点功能。

如果您希望插件命令在正常的根 CLI 路径中保持延迟加载，
请提供 `descriptors`，覆盖该注册器暴露的每个顶级命令根。

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

嵌套命令接收解析后的父命令作为 `program`：

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

仅当您不需要延迟根 CLI 注册时，才单独使用 `commands`。
该急切兼容性路径仍然受支持，但它不会安装
基于描述符的占位符以用于解析时延迟加载。

### CLI 后端注册

`api.registerCliBackend(...)` 允许插件拥有本地
AI CLI 后端（例如 `claude-cli` 或 `my-cli`）的默认配置。

- 后端 `id` 成为模型引用（如 `my-cli/gpt-5`）中的提供商前缀。
- 后端 `config` 使用与 `agents.defaults.cliBackends.<id>` 相同的形状。
- 用户配置仍然优先。OpenClaw 会在运行
  CLI 之前将 `agents.defaults.cliBackends.<id>` 合并到
  插件默认值之上。
- 当后端在合并后需要兼容性重写时
  （例如标准化旧标志形状），请使用 `normalizeConfig`。
- 对于属于 CLI 方言的请求范围 argv 重写
  （例如将 OpenClaw 思考级别映射到原生工作量
  标志），请使用 `resolveExecutionArgs`。

有关端到端的创作指南，请参阅 [CLI 后端插件](/zh/plugins/cli-backend-plugins)。

### 独占槽位

| 方法                                       | 注册内容                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次激活一个）。`assemble()` 回调接收 `availableTools` 和 `citationsMode`，以便引擎可以定制提示词添加。 |
| `api.registerMemoryCapability(capability)` | 统一记忆功能                                                                                                        |
| `api.registerMemoryPromptSection(builder)` | 记忆提示部分构建器                                                                                                  |
| `api.registerMemoryFlushPlan(resolver)`    | 记忆刷新计划解析器                                                                                                  |
| `api.registerMemoryRuntime(runtime)`       | 记忆运行时适配器                                                                                                    |

### 已弃用的内存嵌入适配器

| 方法                                           | 注册内容                 |
| ---------------------------------------------- | ------------------------ |
| `api.registerMemoryEmbeddingProvider(adapter)` | 活动插件的记忆嵌入适配器 |

- `registerMemoryCapability` 是首选的专用内存插件 API。
- `registerMemoryCapability` 也可以暴露 `publicArtifacts.listArtifacts(...)`，
  以便配套插件可以通过 `openclaw/plugin-sdk/memory-host-core` 使用导出的内存构件，
  而无需直接访问特定内存插件的私有布局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是旧版兼容的专用内存插件 API。
- `MemoryFlushPlan.model` 可以将刷新轮次固定到确切的 `provider/model`
  引用（例如 `ollama/qwen3:8b`），而无需继承活动的后备
  链。
- `registerMemoryEmbeddingProvider` 已弃用。新的嵌入提供商
  应使用 `api.registerEmbeddingProvider(...)` 和
  `contracts.embeddingProviders`。
- 现有的特定于内存的提供商在迁移窗口内继续工作，但插件检查会将此报告为
  非捆绑插件的兼容性债务。

### 事件和生命周期

| 方法                                         | 功能               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 类型化生命周期挂钩 |
| `api.onConversationBindingResolved(handler)` | 会话绑定回调       |

有关示例、常用挂钩名称和保护
语义，请参阅 [插件挂钩](/zh/plugins/hooks)。

### 挂钩决策语义

- `before_tool_call`：返回 `{ block: true }` 是终止性的。一旦任何处理程序设置了它，将跳过低优先级的处理程序。
- `before_tool_call`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而不是覆盖。
- `before_install`：返回 `{ block: true }` 是终止性的。一旦任何处理程序设置了它，将跳过低优先级的处理程序。
- `before_install`：返回 `{ block: false }` 被视为未做决定（与省略 `block` 相同），而不是覆盖。
- `reply_dispatch`：返回 `{ handled: true, ... }` 是终止性的。一旦任何处理程序声明了调度，将跳过低优先级的处理程序和默认模型调度路径。
- `message_sending`：返回 `{ cancel: true }` 是终止性的。一旦任何处理程序设置了它，将跳过低优先级的处理程序。
- `message_sending`：返回 `{ cancel: false }` 被视为未做决定（与省略 `cancel` 相同），而不是覆盖。
- `message_received`：当需要入站线程/主题路由时，请使用类型化的 `threadId` 字段。保留 `metadata` 用于渠道特定的额外内容。
- `message_sending`：在回退到渠道特定的 `metadata` 之前，请使用类型化的 `replyToId` / `threadId` 路由字段。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 来处理网关拥有的启动状态，而不是依赖内部的 `gateway:startup` 钩子。
- `cron_changed`：观察网关拥有的 cron 生命周期变化。在同步外部唤醒调度程序时使用 `event.job?.state?.nextRunAtMs` 和 `ctx.getCron?.()`，并将 OpenClaw 作为到期检查和执行的单一真实来源。

### API 对象字段

| 字段                     | 类型                      | 描述                                                              |
| ------------------------ | ------------------------- | ----------------------------------------------------------------- |
| `api.id`                 | `string`                  | 插件 ID                                                           |
| `api.name`               | `string`                  | 显示名称                                                          |
| `api.version`            | `string?`                 | 插件版本（可选）                                                  |
| `api.description`        | `string?`                 | 插件描述（可选）                                                  |
| `api.source`             | `string`                  | 插件源路径                                                        |
| `api.rootDir`            | `string?`                 | 插件根目录（可选）                                                |
| `api.config`             | `OpenClawConfig`          | 当前配置快照（可用时为活动内存运行时快照）                        |
| `api.pluginConfig`       | `Record<string, unknown>` | 来自 `plugins.entries.<id>.config` 的插件特定配置                 |
| `api.runtime`            | `PluginRuntime`           | [运行时辅助函数](/zh/plugins/sdk-runtime)                         |
| `api.logger`             | `PluginLogger`            | 作用域日志记录器（`debug`、`info`、`warn`、`error`）              |
| `api.registrationMode`   | `PluginRegistrationMode`  | 当前加载模式；`"setup-runtime"` 是轻量级的预完整条目启动/设置窗口 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相对于插件根目录的路径                                        |

## 内部模块约定

在你的插件中，使用本地 barrel 文件进行内部导入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  切勿在生产代码中通过 `openclaw/plugin-sdk/<your-plugin>` 导入你自己的插件。
  请通过 `./api.ts` 或 `./runtime-api.ts` 路由内部导入。
  SDK 路径仅作为外部契约。
</Warning>

Facade 加载的捆绑插件公共表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 和类似的公共入口文件）在 OpenClaw
已经运行时，首选活动的运行时配置快照。如果运行时快照尚不存在，它们将回退到磁盘上已解析的配置文件。
打包的捆绑插件 Facade 应通过 OpenClaw 的插件 Facade 加载器加载；
从 `dist/extensions/...` 直接导入会绕过清单和运行时 sidecar 检查，而打包安装使用这些检查来处理插件拥有的代码。

当辅助工具故意特定于提供商且尚不属于通用 SDK 子路径时，提供商插件可以公开狭窄的插件本地契约 barrel。捆绑示例：

- **Anthropic**：用于 Claude
  beta-header 和 `service_tier` 流辅助工具的公共 `api.ts` / `contract-api.ts` 接缝。
- **`@openclaw/openai-provider`**：`api.ts` 导出提供商构建器、
  默认模型辅助工具和实时提供商构建器。
- **`@openclaw/openrouter-provider`**：`api.ts` 导出提供商构建器
  以及新手引导/配置辅助工具。

<Warning>
  Extension production code should also avoid `openclaw/plugin-sdk/<other-plugin>`
  imports. If a helper is truly shared, promote it to a neutral SDK subpath
  such as `openclaw/plugin-sdk/speech`, `.../provider-model-shared`, or another
  capability-oriented surface instead of coupling two plugins together.
</Warning>

## 相关

<CardGroup cols={2}>
  <Card title="入口点" icon="door-open" href="/zh/plugins/sdk-entrypoints">
    `definePluginEntry` 和 `defineChannelPluginEntry` 选项。
  </Card>
  <Card title="运行时辅助工具" icon="gears" href="/zh/plugins/sdk-runtime">
    完整的 `api.runtime` 命名空间参考。
  </Card>
  <Card title="设置与配置" icon="sliders" href="/zh/plugins/sdk-setup">
    打包、清单和配置架构。
  </Card>
  <Card title="测试" icon="vial" href="/zh/plugins/sdk-testing">
    测试实用程序和 Lint 规则。
  </Card>
  <Card title="SDK 迁移" icon="arrows-turn-right" href="/zh/plugins/sdk-migration">
    从已弃用的接口迁移。
  </Card>
  <Card title="插件内部机制" icon="diagram-project" href="/zh/plugins/architecture">
    深度架构和能力模型。
  </Card>
</CardGroup>
