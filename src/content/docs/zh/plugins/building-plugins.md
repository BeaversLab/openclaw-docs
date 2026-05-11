---
summary: "在几分钟内创建你的第一个 OpenClaw 插件"
title: "构建插件"
sidebarTitle: "入门指南"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

插件通过新功能扩展 OpenClaw：渠道、模型提供商、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 获取、Web 搜索、Agent 工具或它们的任意组合。

你无需将你的插件添加到 OpenClaw 仓库。发布到 [ClawHub](/zh/tools/clawhub) 或 npm，用户通过 `openclaw plugins install <package-name>` 安装。OpenClaw 会优先尝试 ClawHub，然后自动回退到 npm。

## 先决条件

- Node >= 22 和一个包管理器（npm 或 pnpm）
- 熟悉 TypeScript (ESM)
- 对于仓库内的插件：已克隆仓库并完成 `pnpm install`

## 哪种类型的插件？

<CardGroup cols={3}>
  <Card title="渠道插件" icon="messages-square" href="/zh/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到消息平台（Discord、IRC 等）
  </Card>
  <Card title="提供商插件" icon="cpu" href="/zh/plugins/sdk-provider-plugins">
    添加模型提供商（LLM、代理或自定义端点）
  </Card>
  <Card title="工具 / hook 插件" icon="wrench" href="/zh/plugins/hooks">
    注册 Agent 工具、事件 hook 或服务 —— 请继续往下看
  </Card>
</CardGroup>

对于在运行新手引导/设置时无法保证已安装的渠道插件，请使用 `createOptionalChannelSetupSurface(...)` 中的 `openclaw/plugin-sdk/channel-setup`。它会产生一个设置适配器 + 向导对，用于提示安装需求，并在安装插件之前对真实的配置写入采取封闭失败策略。

## 快速开始：工具插件

本演练将创建一个注册了 Agent 工具的最小化插件。渠道和提供商插件有专门指南，链接见上文。

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
      "configSchema": {
        "type": "object",
        "additionalProperties": false
      }
    }
    ```
    </CodeGroup>

    每个插件都需要一个清单，即使没有配置也是如此。请参阅
    [Manifest](/zh/plugins/manifest) 以获取完整的架构。规范的 ClawHub
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
    `defineChannelPluginEntry` — 请参阅 [渠道插件](/zh/plugins/sdk-channel-plugins)。
    有关完整的入口点选项，请参阅 [入口点](/zh/plugins/sdk-entrypoints)。

  </Step>

  <Step title="测试和发布">

    **外部插件：** 使用 ClawHub 验证并发布，然后安装：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    OpenClaw 也会在 ClawHub 之前检查 npm，查找像
    `@myorg/openclaw-my-plugin` 这样的裸包规范。

    **仓库内插件：** 放置在捆绑插件工作区树下 — 会自动发现。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

单个插件可以通过 `api` 对象注册任意数量的功能：

| 功能            | 注册方法                                         | 详细指南                                                                     |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 文本推断 (LLM)  | `api.registerProvider(...)`                      | [提供商插件](/zh/plugins/sdk-provider-plugins)                               |
| CLI 推断后端    | `api.registerCliBackend(...)`                    | [CLI 后端](/zh/gateway/cli-backends)                                         |
| 渠道 / 消息传递 | `api.registerChannel(...)`                       | [渠道插件](/zh/plugins/sdk-channel-plugins)                                  |
| 语音 (TTS/STT)  | `api.registerSpeechProvider(...)`                | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时转录        | `api.registerRealtimeTranscriptionProvider(...)` | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时语音        | `api.registerRealtimeVoiceProvider(...)`         | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒体理解        | `api.registerMediaUnderstandingProvider(...)`    | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 图像生成        | `api.registerImageGenerationProvider(...)`       | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音乐生成        | `api.registerMusicGenerationProvider(...)`       | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 视频生成        | `api.registerVideoGenerationProvider(...)`       | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Web 获取        | `api.registerWebFetchProvider(...)`              | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Web 搜索        | `api.registerWebSearchProvider(...)`             | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 工具结果中间件  | `api.registerAgentToolResultMiddleware(...)`     | [SDK 概述](/zh/plugins/sdk-overview#registration-api)                        |
| Agent 工具      | `api.registerTool(...)`                          | 下方                                                                         |
| 自定义命令      | `api.registerCommand(...)`                       | [入口点](/zh/plugins/sdk-entrypoints)                                        |
| 插件钩子        | `api.on(...)`                                    | [插件钩子](/zh/plugins/hooks)                                                |
| 内部事件钩子    | `api.registerHook(...)`                          | [入口点](/zh/plugins/sdk-entrypoints)                                        |
| HTTP 路由       | `api.registerHttpRoute(...)`                     | [内部机制](/zh/plugins/architecture-internals#gateway-http-routes)           |
| CLI 子命令      | `api.registerCli(...)`                           | [入口点](/zh/plugins/sdk-entrypoints)                                        |

有关完整的注册 API，请参阅 [SDK 概述](/zh/plugins/sdk-overview#registration-api)。

当打包插件需要在模型看到输出之前对工具结果进行异步重写时，可以使用 `api.registerAgentToolResultMiddleware(...)`。在 `contracts.agentToolResultMiddleware` 中声明目标运行时，例如 `["pi", "codex"]`。这是一个受信任的打包插件接缝；除非 OpenClaw 针对此功能制定明确的信任策略，否则外部插件应优先使用常规 OpenClaw 插件钩子。

如果您的插件注册了自定义网关 RPC 方法，请将它们保持在特定于插件的前缀上。核心管理员命名空间（`config.*`，`exec.approvals.*`，`wizard.*`，`update.*`）保留不变，并且始终解析为 `operator.admin`，即使插件请求的是更窄的范围。

需要记住的 Hook guard 语义：

- `before_tool_call`：`{ block: true }` 是终止性的，会停止较低优先级的处理程序。
- `before_tool_call`：`{ block: false }` 被视为不做决定。
- `before_tool_call`：`{ requireApproval: true }` 暂停代理执行，并通过执行批准覆盖层、Telegram 按钮、Discord 交互或任何渠道上的 `/approve` 命令提示用户批准。
- `before_install`：`{ block: true }` 是终结性的，并停止较低优先级的处理程序。
- `before_install`：`{ block: false }` 被视为不做决定。
- `message_sending`：`{ cancel: true }` 是终结性的，并停止较低优先级的处理程序。
- `message_sending`：`{ cancel: false }` 被视为不做决定。
- `message_received`：当需要入站线程/主题路由时，优先使用类型化的 `threadId` 字段。保留 `metadata` 用于渠道特定的额外内容。
- `message_sending`：优先使用类型化的 `replyToId` / `threadId` 路由字段，而不是渠道特定的元数据键。

`/approve` 命令通过有界回退处理执行和插件批准：当找不到执行批准 ID 时，OpenClaw 会通过插件批准重试相同的 ID。插件批准转发可以通过配置中的 `approvals.plugin` 独立配置。

如果自定义批准管道需要检测相同的有限回退情况，请优先使用 `openclaw/plugin-sdk/error-runtime` 中的 `isApprovalNotFoundError`，而不是手动匹配批准过期字符串。

有关示例和钩子参考，请参阅 [Plugin hooks](/zh/plugins/hooks)。

## 注册代理工具

工具是 LLM 可以调用的类型化函数。它们可以是必需的（始终可用）或可选的（用户选择加入）：

```typescript
register(api) {
  // Required tool — always available
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({ input: Type.String() }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });

  // Optional tool — user must add to allowlist
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

用户在配置中启用可选工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名称不得与核心工具冲突（冲突将被跳过）
- 具有格式错误的注册对象（包括缺少 `parameters`）的工具将被跳过，并在插件诊断中报告，而不会中断代理运行
- 对于具有副作用或额外二进制要求的工具，请使用 `optional: true`
- 用户可以通过将插件 ID 添加到 `tools.allow` 来启用插件中的所有工具

## 导入约定

始终从专用的 `openclaw/plugin-sdk/<subpath>` 路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

有关完整的子路径参考，请参阅 [SDK 概述](/zh/plugins/sdk-overview)。

在你的插件中，请使用本地桶文件（`api.ts`，`runtime-api.ts`）进行
内部导入 —— 切勿通过其 SDK 路径导入你自己的插件。

对于提供商插件，除非接口真正通用，否则请将特定于提供商的辅助程序保留在这些包根桶文件中。当前捆绑的示例包括：

- Anthropic：Claude 流封装器和 `service_tier` / beta 辅助程序
- OpenAI：提供商构建器、默认模型辅助程序、实时提供商
- OpenRouter：提供商构建器加上新手引导/配置辅助程序

如果一个辅助程序仅在一个捆绑的提供商包中有用，请将其保留在该包根接口中，而不是将其提升到 `openclaw/plugin-sdk/*` 中。

一些生成的 `openclaw/plugin-sdk/<bundled-id>` 辅助接缝仍然存在，
用于捆绑插件的维护和兼容性，例如
`plugin-sdk/feishu-setup` 或 `plugin-sdk/zalo-setup`。请将这些视为保留的
接口，而不是新第三方插件的默认模式。

## 提交前检查清单

<Check>**package.** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.** 清单文件存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用明确的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而不是 SDK 自身导入</Check>
<Check>测试通过 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## Beta 版本测试

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 发布标签，并通过 `Watch` > `Releases` 订阅。Beta 标签看起来像 `v2026.3.N-beta.1`。您也可以开启官方 OpenClaw X 账户 [@openclaw](https://x.com/openclaw) 的通知，以获取发布公告。
2. 在 Beta 标签出现后，尽快针对该标签测试您的插件。稳定版发布前的窗口期通常只有几个小时。
3. 使用 `all good` 或遇到的问题进行测试后，在 `plugin-forum` Discord 频道中您的插件主题帖下发布消息。如果您还没有主题帖，请创建一个。
4. 如果出现问题，请打开或更新一个标题为 `Beta blocker: <plugin-name> - <summary>` 的 issue，并应用 `beta-blocker` 标签。将 issue 链接放在您的主题帖中。
5. 向 `main` 开启一个标题为 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，并在 PR 和你的 Discord 线程中链接该 issue。贡献者无法标记 PR，因此标题是维护者和自动化程序在 PR 一侧的信号。带有 PR 的阻碍性问题会被合并；没有 PR 的阻碍性问题可能仍会发布。维护者在 Beta 测试期间会关注这些线程。
6. 沉默即通过。如果你错过了窗口，你的修复很可能在下一个周期落地。

## 下一步

<CardGroup cols={2}>
  <Card title="渠道插件" icon="messages-square" href="/zh/plugins/sdk-channel-plugins">
    构建消息渠道插件
  </Card>
  <Card title="提供商插件" icon="cpu" href="/zh/plugins/sdk-provider-plugins">
    构建模型提供商插件
  </Card>
  <Card title="SDK 概述" icon="book-open" href="/zh/plugins/sdk-overview">
    导入映射和注册 API 参考
  </Card>
  <Card title="运行时辅助" icon="settings" href="/zh/plugins/sdk-runtime">
    通过 api.runtime 进行 TTS、搜索、子代理
  </Card>
  <Card title="Testing" icon="test-tubes" href="/zh/plugins/sdk-testing">
    测试工具与模式
  </Card>
  <Card title="Plugin Manifest" icon="file-" href="/zh/plugins/manifest">
    完整的清单架构参考
  </Card>
</CardGroup>

## 相关

- [Plugin Architecture](/zh/plugins/architecture) — 内部架构深度剖析
- [SDK Overview](/zh/plugins/sdk-overview) — 插件 SDK 参考
- [Manifest](/zh/plugins/manifest) — 插件清单格式
- [Channel Plugins](/zh/plugins/sdk-channel-plugins) — 构建渠道插件
- [Provider Plugins](/zh/plugins/sdk-provider-plugins) — 构建提供商插件
