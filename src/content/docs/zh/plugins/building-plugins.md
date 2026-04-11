---
title: "构建插件"
sidebarTitle: "入门指南"
summary: "在几分钟内创建你的第一个 OpenClaw 插件"
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are adding a new channel, provider, tool, or other capability to OpenClaw
---

# 构建插件

插件使用新功能扩展 OpenClaw：渠道、模型提供商、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、网页抓取、网页搜索、代理工具，或它们的任意组合。

您无需将插件添加到 OpenClaw 代码库中。发布到
[ClawHub](/en/tools/clawhub) 或 npm，用户即可使用
`openclaw plugins install <package-name>` 安装。OpenClaw 会优先尝试 ClawHub，
然后自动回退到 npm。

## 先决条件

- Node >= 22 和一个包管理器（npm 或 pnpm）
- 熟悉 TypeScript (ESM)
- 对于仓库内插件：仓库已克隆并完成 `pnpm install`

## 哪种类型的插件？

<CardGroup cols={3}>
  <Card title="Channel plugin" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到消息平台（Discord、IRC 等）
  </Card>
  <Card title="Provider plugin" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    添加模型提供商（LLM、代理或自定义端点）
  </Card>
  <Card title="Tool / hook plugin" icon="wrench">
    注册 Agent 工具、事件钩子或服务 — 继续阅读下方内容
  </Card>
</CardGroup>

如果渠道插件是可选的，并且在运行新手引导/设置时可能尚未安装，请使用 `createOptionalChannelSetupSurface(...)` 中的 `openclaw/plugin-sdk/channel-setup`。它会生成一个设置适配器和向导组合，用于提示安装要求，并在插件安装之前对真正的配置写入执行封闭式失败。

## 快速开始：工具插件

本演练将创建一个注册代理工具的最小插件。渠道和提供商插件有上面链接的专门指南。

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

    每个插件都需要一个清单，即使没有配置。请参阅
    [Manifest](/en/plugins/manifest) 了解完整的架构。标准的 ClawHub
    发布代码片段位于 `docs/snippets/plugin-publish/` 中。

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
    `defineChannelPluginEntry` —— 参见 [Channel Plugins](/en/plugins/sdk-channel-plugins)。
    有关完整的入口点选项，请参阅 [Entry Points](/en/plugins/sdk-entrypoints)。

  </Step>

  <Step title="测试和发布">

    **外部插件：** 使用 ClawHub 验证并发布，然后安装：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    openclaw plugins install clawhub:@myorg/openclaw-my-plugin
    ```

    对于像 `@myorg/openclaw-my-plugin` 这样的裸包规范，OpenClaw 也会在 npm 之前先检查 ClawHub。

    **仓库内插件：** 放置在捆绑插件工作区树下 — 自动发现。

    ```bash
    pnpm test -- <bundled-plugin-root>/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

单个插件可以通过 `api` 对象注册任意数量的功能：

| 功能            | 注册方法                                         | 详细指南                                                                           |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 文本推理 (LLM)  | `api.registerProvider(...)`                      | [Provider Plugins](/en/plugins/sdk-provider-plugins)                               |
| CLI 推理后端    | `api.registerCliBackend(...)`                    | [CLI Backends](/en/gateway/cli-backends)                                           |
| 渠道 / 消息传递 | `api.registerChannel(...)`                       | [Channel Plugins](/en/plugins/sdk-channel-plugins)                                 |
| 语音 (TTS/STT)  | `api.registerSpeechProvider(...)`                | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时转录        | `api.registerRealtimeTranscriptionProvider(...)` | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 实时语音        | `api.registerRealtimeVoiceProvider(...)`         | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒体理解        | `api.registerMediaUnderstandingProvider(...)`    | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 图像生成        | `api.registerImageGenerationProvider(...)`       | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 音乐生成        | `api.registerMusicGenerationProvider(...)`       | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 视频生成        | `api.registerVideoGenerationProvider(...)`       | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网页获取        | `api.registerWebFetchProvider(...)`              | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网络搜索        | `api.registerWebSearchProvider(...)`             | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Agent 工具      | `api.registerTool(...)`                          | 如下                                                                               |
| 自定义命令      | `api.registerCommand(...)`                       | [Entry Points](/en/plugins/sdk-entrypoints)                                        |
| 事件钩子        | `api.registerHook(...)`                          | [Entry Points](/en/plugins/sdk-entrypoints)                                        |
| HTTP 路由       | `api.registerHttpRoute(...)`                     | [Internals](/en/plugins/architecture#gateway-http-routes)                          |
| CLI 子命令      | `api.registerCli(...)`                           | [Entry Points](/en/plugins/sdk-entrypoints)                                        |

有关完整的注册 API，请参阅 [SDK Overview](/en/plugins/sdk-overview#registration-api)。

如果您的插件注册了自定义网关 RPC 方法，请将它们保持在特定于插件的前缀上。核心管理员命名空间（`config.*`、
`exec.approvals.*`、`wizard.*`、`update.*`）保留不变，并且总是解析为
`operator.admin`，即使插件请求了更窄的范围。

需要记住的 Hook guard 语义：

- `before_tool_call`：`{ block: true }` 是终态的，并停止较低优先级的处理程序。
- `before_tool_call`：`{ block: false }` 被视为未做决定。
- `before_tool_call`：`{ requireApproval: true }` 暂停 agent 执行并通过 exec approval 覆盖层、Telegram 按钮、Discord 交互或任何渠道上的 `/approve` 命令提示用户批准。
- `before_install`：`{ block: true }` 是终态的，并停止较低优先级的处理程序。
- `before_install`：`{ block: false }` 被视为未做决定。
- `message_sending`：`{ cancel: true }` 是终态的，并停止较低优先级的处理程序。
- `message_sending`：`{ cancel: false }` 被视为未做决定。

`/approve` 命令通过有界回退处理 exec 和 plugin 批准：当找不到 exec 批准 id 时，OpenClaw 会通过 plugin 批准重试该 id。Plugin 批准转发可以通过 config 中的 `approvals.plugin` 独立配置。

如果自定义批准管道需要检测同样的有界回退情况，请优先使用 `openclaw/plugin-sdk/error-runtime` 中的 `isApprovalNotFoundError`，而不是手动匹配批准过期字符串。

有关详细信息，请参阅 [SDK Overview hook decision semantics](/en/plugins/sdk-overview#hook-decision-semantics)。

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

用户可以在 config 中启用可选工具：

```json5
{
  tools: { allow: ["workflow_tool"] },
}
```

- 工具名称不得与核心工具冲突（冲突会被跳过）
- 对于具有副作用或额外二进制要求的工具，请使用 `optional: true`
- 用户可以通过将插件 id 添加到 `tools.allow` 来启用插件中的所有工具

## 导入约定

始终从特定的 `openclaw/plugin-sdk/<subpath>` 路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

有关完整的子路径参考，请参阅 [SDK Overview](/en/plugins/sdk-overview)。

在你的插件内部，对于内部导入，请使用本地 barrel 文件（`api.ts`，`runtime-api.ts`）——永远不要通过其 SDK 路径导入你自己的插件。

对于提供商插件，除非连接点确实是通用的，否则将特定于提供商的辅助函数保留在这些包根目录的 barrel 中。当前捆绑的示例：

- Anthropic：Claude 流包装器和 `service_tier` / beta 辅助函数
- OpenAI：提供商 构建器、默认模型辅助函数、实时提供商
- OpenRouter：提供商 构建器以及 新手引导/config 辅助函数

如果辅助函数仅在一个捆绑的提供商包中有用，请将其保留在该包根目录的连接点处，而不是将其提升到 `openclaw/plugin-sdk/*` 中。

一些生成的 `openclaw/plugin-sdk/<bundled-id>` 辅助连接点仍然存在，用于捆绑插件的维护和兼容性，例如 `plugin-sdk/feishu-setup` 或 `plugin-sdk/zalo-setup`。将这些视为保留的接口，而不是新第三方插件的默认模式。

## 提交前检查清单

<Check>**package.** 拥有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.** 清单存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用聚焦的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而不是 SDK 自导入</Check>
<Check>测试通过 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## Beta 版本测试

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 发布标签，并通过 `Watch` > `Releases` 订阅。Beta 标签看起来像 `v2026.3.N-beta.1`。您也可以为官方 OpenClaw X 账号 [@openclaw](https://x.com/openclaw) 开启通知，以获取发布公告。
2. 在 Beta 标签出现后，立即针对该标签测试您的插件。稳定版发布前的窗口期通常只有几个小时。
3. 在 `plugin-forum` Discord 渠道中您的插件主题帖下发布测试结果，说明是 `all good` 还是出现了什么问题。如果您还没有主题帖，请创建一个。
4. 如果有问题，请打开或更新一个标题为 `Beta blocker: <plugin-name> - <summary>` 的 issue，并应用 `beta-blocker` 标签。将 issue 链接放入您的主题帖中。
5. 向 `main` 提交一个标题为 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，并在 PR 和您的 Discord 主题帖中链接该 issue。贡献者无法标记 PR，因此标题是维护者和自动化工具在 PR 端的信号。带有 PR 的阻断性问题会被合并；没有 PR 的阻断性问题可能仍会发布。维护者会在 Beta 测试期间关注这些主题帖。
6. 没有消息就是好消息。如果您错过了窗口期，您的修复很可能会在下一个周期落地。

## 后续步骤

<CardGroup cols={2}>
  <Card title="渠道插件" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    构建消息渠道插件
  </Card>
  <Card title="Provider Plugins" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    构建模型提供商插件
  </Card>
  <Card title="SDK Overview" icon="book-open" href="/en/plugins/sdk-overview">
    导入映射和注册 API 参考
  </Card>
  <Card title="Runtime Helpers" icon="settings" href="/en/plugins/sdk-runtime">
    通过 api.runtime 进行 TTS、搜索、子代理操作
  </Card>
  <Card title="Testing" icon="test-tubes" href="/en/plugins/sdk-testing">
    测试工具和模式
  </Card>
  <Card title="Plugin Manifest" icon="file-" href="/en/plugins/manifest">
    完整清单架构参考
  </Card>
</CardGroup>

## 相关

- [插件架构](/en/plugins/architecture) — 内部架构深入探讨
- [SDK 概述](/en/plugins/sdk-overview) — 插件 SDK 参考
- [清单](/en/plugins/manifest) — 插件清单格式
- [渠道插件](/en/plugins/sdk-channel-plugins) — 构建渠道插件
- [提供商插件](/en/plugins/sdk-provider-plugins) — 构建提供商插件
