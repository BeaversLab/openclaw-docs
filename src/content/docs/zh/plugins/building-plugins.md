---
summary: "OpenClaw在几分钟内创建您的第一个 OpenClaw 插件"
title: "构建插件"
sidebarTitle: "入门指南"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

插件通过新功能扩展 OpenClaw：渠道、模型提供商、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 获取、Web 搜索、Agent 工具或它们的任意组合。

您无需将插件添加到 OpenClaw 仓库中。发布到
[ClawHub](/zh/clawhub) 并使用
`openclaw plugins install clawhub:<package-name>` 安装即可。在发布切换期间，裸包规范仍会从
npm 安装。

## 先决条件

- Node >= 22 和一个包管理器（npm 或 pnpm）
- 熟悉 TypeScript (ESM)
- 对于代码库内的插件：代码库已克隆且 `pnpm install`OpenClaw 完成。源码检出插件开发仅支持 pnpm，因为 OpenClaw 从 `extensions/*` 工作区包加载打包的插件。

## 哪种类型的插件？

<CardGroup cols={3}>
  <Card title="频道插件" icon="messages-square" href="/zh/plugins/sdk-channel-plugins" OpenClawDiscord>
    将 OpenClaw 连接到消息平台（Discord、IRC 等）
  </Card>
  <Card title="提供商插件" icon="cpu" href="/zh/plugins/sdk-provider-plugins" LLM>
    添加模型提供商（LLM、代理或自定义端点）
  </Card>
  <Card title="CLICLI 后端插件" icon="terminal" href="/zh/plugins/cli-backend-plugins" CLIOpenClaw>
    将本地 AI CLI 映射到 OpenClaw 的文本回退运行器
  </Card>
  <Card title="工具 / hook 插件" icon="wrench" href="/zh/plugins/hooks">
    注册代理工具、事件钩子或服务 - 继续阅读下文
  </Card>
</CardGroup>

对于无法保证在新手引导/设置运行时已安装的渠道插件，请使用 `createOptionalChannelSetupSurface(...)` 中的 `openclaw/plugin-sdk/channel-setup`。它会生成一个设置适配器和向导对，用于通告安装需求，并在插件安装前对真实的配置写入执行“失败关闭”策略。

## 快速开始：工具插件

本演练将创建一个注册代理工具的最小插件。渠道和提供商插件有专门的指南，链接见上方。"

<Steps>
  <Step title="创建包和清单">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "compat": {
          "pluginApi": ">=2026.3.24-beta.2",
          "minGatewayVersion": "2026.3.24-beta.2"
        },
        "build": {
          "openclawVersion": "2026.3.24-beta.2",
          "pluginSdkVersion": "2026.3.24-beta.2"
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "my-plugin",
      "name": "My Plugin",
      "description": "Adds a custom tool to OpenClaw",
      "contracts": {
        "tools": ["my_tool"]
      },
      "activation": {
        "onStartup": true
      },
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    每个插件都需要一个清单，即使没有配置也是如此。运行时注册的工具
    必须在 `contracts.tools` 中列出，以便 OpenClaw 可以发现所属
    插件而无需加载每个插件的运行时。插件还应有意
    声明 `activation.onStartup`。此示例将其设置为 `true`。请参阅
    [清单](/zh/plugins/manifest) 了解完整架构。规范的 ClawHub
    发布片段位于 `docs/snippets/plugin-publish/` 中。

  </Step>

  <Step title="编写入口点">

    ```typescript
    // index.ts
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
    import { Type } from "@sinclair/typebox";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Do a thing",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return { content: [{ type: "text", text: `Got: ${params.input}` }] };
          },
        });
      },
    });
    ```

    `definePluginEntry` 适用于非渠道插件。对于渠道，请使用
    `defineChannelPluginEntry` - 请参阅[渠道插件](/zh/plugins/sdk-channel-plugins)。
    有关完整的入口点选项，请参阅[入口点](/zh/plugins/sdk-entrypoints)。

  </Step>

  <Step title="测试和发布">

    **外部插件：** 使用 ClawHub 验证并发布，然后安装：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    诸如 `@myorg/openclaw-my-plugin` 之类的裸包规范会在启动切换期间从 npm 安装。当您需要 ClawHub 解析时，请使用 `clawhub:`。

    **仓库内插件：** 放置在捆绑插件工作区树下 - 自动发现。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

单个插件可以通过 `api` 对象注册任意数量的功能：

| 功能            | 注册方法                                         | 详细指南                                                                     |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 文本推理 (LLM)  | `api.registerProvider(...)`                      | [提供商插件](/zh/plugins/sdk-provider-plugins)                               |
| CLI 推理后端    | `api.registerCliBackend(...)`                    | [CLI 后端插件](/zh/plugins/cli-backend-plugins)                              |
| 频道 / 消息传递 | `api.registerChannel(...)`                       | [渠道插件](/zh/plugins/sdk-channel-plugins)                                  |
| 语音 (TTS/STT)  | `api.registerSpeechProvider(...)`                | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时转录        | `api.registerRealtimeTranscriptionProvider(...)` | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时语音        | `api.registerRealtimeVoiceProvider(...)`         | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒体理解        | `api.registerMediaUnderstandingProvider(...)`    | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 图像生成        | `api.registerImageGenerationProvider(...)`       | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音乐生成        | `api.registerMusicGenerationProvider(...)`       | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 视频生成        | `api.registerVideoGenerationProvider(...)`       | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网页抓取        | `api.registerWebFetchProvider(...)`              | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网络搜索        | `api.registerWebSearchProvider(...)`             | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 工具结果中间件  | `api.registerAgentToolResultMiddleware(...)`     | [SDK 概述](/zh/plugins/sdk-overview#registration-api)                        |
| Agent 工具      | `api.registerTool(...)`                          | 下方                                                                         |
| 自定义命令      | `api.registerCommand(...)`                       | [入口点](/zh/plugins/sdk-entrypoints)                                        |
| 插件钩子        | `api.on(...)`                                    | [插件钩子](/zh/plugins/hooks)                                                |
| 内部事件钩子    | `api.registerHook(...)`                          | [入口点](/zh/plugins/sdk-entrypoints)                                        |
| HTTP 路由       | `api.registerHttpRoute(...)`                     | [内部机制](/zh/plugins/architecture-internals#gateway-http-routes)           |
| CLI 子命令      | `api.registerCli(...)`                           | [入口点](/zh/plugins/sdk-entrypoints)                                        |

有关完整的注册 API，请参阅 [SDK 概述](/zh/plugins/sdk-overview#registration-api)。

打包插件可以在模型看到输出之前，需要在异步工具结果重写时使用 `api.registerAgentToolResultMiddleware(...)`。在 `contracts.agentToolResultMiddleware` 中声明目标运行时，例如 `["pi", "codex"]`OpenClawOpenClaw。这是一个受信任的打包插件接缝；外部插件应首选常规 OpenClaw 插件钩子，除非 OpenClaw 为此功能制定了明确的信任策略。

如果您的插件注册了自定义网关 RPC 方法，请将它们保留在特定于插件的前缀上。核心管理命名空间（RPC`config.*`、`exec.approvals.*`、`wizard.*`、`update.*`）保留，并且始终解析为 `operator.admin`，即使插件请求了更窄的范围。

请记住钩子保护语义：

- `before_tool_call`：`{ block: true }` 是终端的，并停止较低优先级的处理程序。
- `before_tool_call`：`{ block: false }` 被视为未做决定。
- `before_tool_call`：`{ requireApproval: true }`TelegramDiscord 暂停代理执行，并通过执行批准覆盖层、Telegram 按钮、Discord 交互或任何渠道上的 `/approve` 命令提示用户批准。
- `before_install`：`{ block: true }` 是终端的，并停止较低优先级的处理程序。
- `before_install`：`{ block: false }` 被视为未做决定。
- `message_sending`：`{ cancel: true }` 是终端的，并停止较低优先级的处理程序。
- `message_sending`：`{ cancel: false }` 被视为未做决定。
- `message_received`：当您需要入站线程/主题路由时，首选类型化的 `threadId` 字段。保留 `metadata` 用于特定于渠道的额外内容。
- `message_sending`: 优先使用类型化的 `replyToId` / `threadId` 路由字段，而非特定于渠道的元数据键。

`/approve`OpenClaw 命令通过有界回退处理 exec 和插件审批：当找不到 exec 审批 ID 时，OpenClaw 会通过插件审批重试相同的 ID。插件审批转发可以通过配置中的 `approvals.plugin` 单独配置。

如果自定义审批管道需要检测同样的有界回退情况，请优先使用 `openclaw/plugin-sdk/error-runtime` 中的 `isApprovalNotFoundError`，而不是手动匹配审批到期字符串。

有关示例和钩子参考，请参阅 [插件钩子](/zh/plugins/hooks)。

## 注册 agent 工具

工具是 LLM 可以调用的类型化函数。它们可以是必需的（始终可用）或可选的（用户选择加入）：

```typescript
register(api) {
  // Required tool - always available
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // Optional tool - user must add to allowlist
  api.registerTool(
    {
      name: "workflow_tool",
      description: "Run a workflow",
      parameters: Type.Object({ pipeline: Type.String() }),
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

工具工厂接收运行时提供的上下文对象。当工具需要为当前轮次的活跃模型进行记录、显示或适应时，请使用
`ctx.activeModel`。该对象可以包含 `provider`、`modelId` 和
`modelRef`。请将其视为信息性运行时元数据，而不是针对本地操作员、已安装的插件代码或修改后的
OpenClaw 运行时的安全边界。对于敏感的本地工具，请保留显式的插件或操作员选择加入，并在活跃模型元数据缺失或不适用时默认失败（关闭）。

使用 `api.registerTool(...)` 注册的每个工具也必须在插件清单中声明：

```json
{
  "contracts": {
    "tools": ["my_tool", "workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

OpenClaw 会捕获并缓存已注册工具的有效描述符，因此插件无需在清单中重复 `description` 或架构数据。清单合约仅声明所有权和发现；执行仍会调用实时注册的工具实现。
为使用 `api.registerTool(..., { optional: true })` 注册的工具设置 `toolMetadata.<tool>.optional: true`，以便 OpenClaw 可以避免加载该插件运行时，直到该工具被明确列入允许列表。

用户在配置中启用可选工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名称不得与核心工具冲突（冲突将被跳过）
- 注册对象格式错误的工具（包括缺少 `parameters`）将被跳过，并在插件诊断中报告，而不是中断代理运行
- 对于具有副作用或额外二进制要求的工具，请使用 `optional: true`
- 用户可以通过将插件 ID 添加到 `tools.allow` 来启用插件中的所有工具

## 注册 CLI 命令

插件可以使用 `api.registerCli` 添加根 `openclaw` 命令组。为每个顶级命令根提供 `descriptors`OpenClaw，以便 OpenClaw 可以显示和路由该命令，而无需急切加载每个插件运行时。

```typescript
register(api) {
  api.registerCli(
    ({ program }) => {
      const demo = program
        .command("demo-plugin")
        .description("Run demo plugin commands");

      demo
        .command("ping")
        .description("Check that the plugin CLI is executable")
        .action(() => {
          console.log("demo-plugin:pong");
        });
    },
    {
      descriptors: [
        {
          name: "demo-plugin",
          description: "Run demo plugin commands",
          hasSubcommands: true,
        },
      ],
    },
  );
}
```

安装后，验证运行时注册并执行命令：

```bash
openclaw plugins inspect demo-plugin --runtime --json
openclaw demo-plugin ping
```

## 导入约定

始终从专注的 `openclaw/plugin-sdk/<subpath>` 路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

有关完整的子路径参考，请参阅 [SDK 概述](/zh/plugins/sdk-overview)。

在插件内部，使用本地桶文件（`api.ts`、`runtime-api.ts`）进行内部导入——切勿通过其 SDK 路径导入自己的插件。

对于提供商插件，请将提供商特定的辅助函数保留在这些包根桶文件中，除非该接口确实是通用的。当前捆绑的示例：

- Anthropic：Claude 流包装器和 Anthropic`service_tier` / beta 辅助函数
- OpenAI：提供商构建器、默认模型辅助函数、实时提供商
- OpenRouter：提供商构建器以及新手引导/配置辅助函数

如果辅助函数仅在一个捆绑的提供商包中有用，请将其保留在该包根接口中，而不是将其提升到 `openclaw/plugin-sdk/*` 中。

一些生成的 `openclaw/plugin-sdk/<bundled-id>` 辅助接口仍然存在，用于捆绑插件的维护（当它们有跟踪的所有者使用情况时）。请将这些视为保留的接口，而不是新的第三方插件的默认模式。

## 提交前检查清单

<Check>**package.** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.** 清单存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入使用专注的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而非 SDK 自导入</Check>
<Check>测试通过 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## Beta 版本测试

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 发布标签，并通过 `Watch` > `Releases` 订阅。Beta 标签看起来像 `v2026.3.N-beta.1`。您也可以开启官方 OpenClaw X 账号 [@openclaw](https://x.com/openclaw) 的通知，以获取发布公告。
2. Beta 标签一出现，请立即针对该标签测试您的插件。稳定版发布前的窗口期通常只有几个小时。
3. 在 `plugin-forum` Discord 频道的插件主题帖中发布测试结果，注明 `all good` 或遇到的问题。如果您还没有主题帖，请创建一个。
4. 如果出现问题，请创建或更新标题为 `Beta blocker: <plugin-name> - <summary>` 的问题，并应用 `beta-blocker` 标签。将问题链接发布在您的主题帖中。
5. 向 `main` 提交一个标题为 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，并在 PR 和您的 Discord 主题帖中链接该问题。贡献者无法给 PR 打标签，因此标题是给维护者和自动化工具的信号。带有 PR 的阻碍性问题会被合并；没有 PR 的阻碍性问题可能会随版本发布。维护者会在 Beta 测试期间关注这些主题帖。
6. 没有消息意味着一切正常。如果您错过了窗口期，您的修复可能会在下一个周期落地。

## 后续步骤

<CardGroup cols={2}>
  <Card title="渠道插件" icon="messages-square" href="/zh/plugins/sdk-channel-plugins">
    构建消息渠道插件
  </Card>
  <Card title="提供商插件" icon="cpu" href="/zh/plugins/sdk-provider-plugins">
    构建模型提供商插件
  </Card>
  <Card title="CLI 后端插件" icon="terminal" href="/zh/plugins/cli-backend-plugins">
    注册本地 AI CLI 后端
  </Card>
  <Card title="SDK 概述" icon="book-open" href="/zh/plugins/sdk-overview" API>
    导入映射和注册 API 参考
  </Card>
  <Card title="运行时辅助工具" icon="settings" href="/zh/plugins/sdk-runtime">
    通过 api.runtime 进行 TTS、搜索、子代理
  </Card>
  <Card title="测试" icon="test-tubes" href="/zh/plugins/sdk-testing">
    测试工具和模式
  </Card>
  <Card title="插件清单" icon="file-" href="/zh/plugins/manifest">
    完整清单架构参考
  </Card>
</CardGroup>

## 相关

- [插件架构](/zh/plugins/architecture) - 内部架构深入解析
- [SDK 概述](/zh/plugins/sdk-overview) - 插件 SDK 参考
- [清单](/zh/plugins/manifest) - 插件清单格式
- [渠道插件](/zh/plugins/sdk-channel-plugins) - 构建渠道插件
- [提供商插件](/zh/plugins/sdk-provider-plugins) - 构建提供商插件
