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

插件通过新功能扩展 OpenClaw：频道、模型提供商、语音、图像生成、网络搜索、代理工具或其任意组合。

您无需将插件添加到 OpenClaw 仓库中。发布到 [ClawHub](/en/tools/clawhub) 或 npm，用户使用 `openclaw plugins install <package-name>` 安装即可。OpenClaw 会先尝试 ClawHub，然后自动回退到 npm。

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

## 快速开始：工具插件

本演练将创建一个注册代理工具的最小化插件。频道和提供商插件有上方链接的专门指南。

<Steps>
  <Step title="Create the package and manifest">
    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-my-plugin",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"]
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
    [Manifest](/en/plugins/manifest) 了解完整的架构。

  </Step>

  <Step title="Write the entry point">

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

    `definePluginEntry` 用于非渠道插件。对于渠道，请使用
    `defineChannelPluginEntry` — 请参阅 [Channel Plugins](/en/plugins/sdk-channel-plugins)。
    如需完整的入口点选项，请参阅 [Entry Points](/en/plugins/sdk-entrypoints)。

  </Step>

  <Step title="Test and publish">

    **External plugins:** 发布到 [ClawHub](/en/tools/clawhub) 或 npm，然后安装：

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw 会先检查 ClawHub，然后回退到 npm。

    **In-repo plugins:** 放置在 `extensions/` 下 — 自动发现。

    ```bash
    pnpm test -- extensions/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

单个插件可以通过 `api` 对象注册任意数量的功能：

| 功能           | 注册方法                                      | 详细指南                                                                           |
| -------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| 文本推理 (LLM) | `api.registerProvider(...)`                   | [Provider Plugins](/en/plugins/sdk-provider-plugins)                               |
| CLI 推理后端   | `api.registerCliBackend(...)`                 | [CLI Backends](/en/gateway/cli-backends)                                           |
| 频道 / 消息    | `api.registerChannel(...)`                    | [Channel Plugins](/en/plugins/sdk-channel-plugins)                                 |
| 语音 (TTS/STT) | `api.registerSpeechProvider(...)`             | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒体理解       | `api.registerMediaUnderstandingProvider(...)` | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 图像生成       | `api.registerImageGenerationProvider(...)`    | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网络搜索       | `api.registerWebSearchProvider(...)`          | [Provider Plugins](/en/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| Agent 工具     | `api.registerTool(...)`                       | 下方                                                                               |
| 自定义命令     | `api.registerCommand(...)`                    | [Entry Points](/en/plugins/sdk-entrypoints)                                        |
| 事件钩子       | `api.registerHook(...)`                       | [Entry Points](/en/plugins/sdk-entrypoints)                                        |
| HTTP 路由      | `api.registerHttpRoute(...)`                  | [Internals](/en/plugins/architecture#gateway-http-routes)                          |
| CLI 子命令     | `api.registerCli(...)`                        | [Entry Points](/en/plugins/sdk-entrypoints)                                        |

有关完整的注册 API，请参阅 [SDK Overview](/en/plugins/sdk-overview#registration-api)。

需要注意的钩子守卫语义：

- `before_tool_call`: `{ block: true }` 是终局性的，并停止较低优先级的处理程序。
- `before_tool_call`: `{ block: false }` 被视为未做决定。
- `message_sending`: `{ cancel: true }` 是终局性的，并停止较低优先级的处理程序。
- `message_sending`: `{ cancel: false }` 被视为未做决定。

有关详细信息，请参阅 [SDK Overview hook decision semantics](/en/plugins/sdk-overview#hook-decision-semantics)。

## 注册 Agent 工具

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

- 工具名称不得与核心工具冲突（冲突项将被跳过）
- 对于具有副作用或额外二进制要求的工具，请使用 `optional: true`
- 用户可以通过将插件 ID 添加到 `tools.allow` 来启用插件中的所有工具

## 导入约定

始终从特定的 `openclaw/plugin-sdk/<subpath>` 路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";

// Wrong: monolithic root (deprecated, will be removed)
import { ... } from "openclaw/plugin-sdk";
```

有关完整的子路径参考，请参阅 [SDK 概述](/en/plugins/sdk-overview)。

在您的插件内部，请使用本地桶文件（`api.ts`、`runtime-api.ts`）进行
内部导入 —— 切勿通过其 SDK 路径导入您自己的插件。

## 提交前检查清单

<Check>**package.** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.** 清单已存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用特定的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而非 SDK 自身导入</Check>
<Check>测试通过 (`pnpm test -- extensions/my-plugin/`)</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## Beta 版本测试

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 发布标签，并通过 `Watch` > `Releases` 订阅。Beta 标签看起来像 `v2026.3.N-beta.1`。您也可以开启官方 OpenClaw X 账户 [@openclaw](https://x.com/openclaw) 的通知，以获取发布公告。
2. 在 beta 标签出现后，立即针对该标签测试您的插件。稳定版发布前的窗口通常只有几个小时。
3. 测试后，在 `plugin-forum` Discord 频道的插件主题帖中发布结果，说明 `all good` 或出现的问题。如果您还没有主题帖，请创建一个。
4. 如果出现问题，请创建或更新一个标题为 `Beta blocker: <plugin-name> - <summary>` 的 issue，并应用 `beta-blocker` 标签。将 issue 链接放入您的主题帖中。
5. 向 `main` 提交一个标题为 `fix(<plugin-id>): beta blocker - <summary>` 的 PR，并在 PR 和你的 Discord 线程中关联该 issue。贡献者无法标记 PR，因此标题是维护者和自动化工具在 PR 这边的信号。有 PR 的阻塞问题会被合并；没有 PR 的阻塞问题可能仍会发布。维护人员在 Beta 测试期间会关注这些线程。
6. 没有消息就是好消息。如果你错过了时间窗口，你的修复很可能会在下一个周期落地。

## 后续步骤

<CardGroup cols={2}>
  <Card title="渠道插件" icon="messages-square" href="/en/plugins/sdk-channel-plugins">
    构建消息渠道插件
  </Card>
  <Card title="提供商插件" icon="cpu" href="/en/plugins/sdk-provider-plugins">
    构建模型提供商插件
  </Card>
  <Card title="SDK 概览" icon="book-open" href="/en/plugins/sdk-overview">
    导入映射和注册 API 参考
  </Card>
  <Card title="运行时助手" icon="settings" href="/en/plugins/sdk-runtime">
    通过 api.runtime 进行 TTS、搜索、子代理操作
  </Card>
  <Card title="测试" icon="test-tubes" href="/en/plugins/sdk-testing">
    测试工具和模式
  </Card>
  <Card title="插件清单" icon="file-" href="/en/plugins/manifest">
    完整的清单架构参考
  </Card>
</CardGroup>
