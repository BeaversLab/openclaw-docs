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

你无需将插件添加到 OpenClaw 仓库中。发布到
[ClawHub](/zh/tools/clawhub) 或 npm，用户即可使用
`openclaw plugins install <package-name>` 安装。OpenClaw 会首先尝试 ClawHub，并自动回退到 npm。

## 先决条件

- Node >= 22 和一个包管理器（npm 或 pnpm）
- 熟悉 TypeScript (ESM)
- 对于仓库内插件：已克隆仓库并完成 `pnpm install`

## 哪种类型的插件？

<CardGroup cols={3}>
  <Card title="Channel plugin" icon="messages-square" href="/zh/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到消息平台（Discord、IRC 等）
  </Card>
  <Card title="Provider plugin" icon="cpu" href="/zh/plugins/sdk-provider-plugins">
    添加模型提供商（LLM、代理或自定义端点）
  </Card>
  <Card title="Tool / hook plugin" icon="wrench">
    注册代理工具、事件钩子或服务 —— 继续阅读下方内容
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

    每个插件都需要一个清单，即使没有配置。请参阅
    [Manifest](/zh/plugins/manifest) 了解完整架构。

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

    `definePluginEntry` 用于非渠道插件。对于渠道，请使用
    `defineChannelPluginEntry` — 参见 [渠道插件](/zh/plugins/sdk-channel-plugins)。
    有关完整的入口点选项，请参阅 [入口点](/zh/plugins/sdk-entrypoints)。

  </Step>

  <Step title="测试并发布">

    **外部插件：** 发布到 [ClawHub](/zh/tools/clawhub) 或 npm，然后安装：

    ```bash
    openclaw plugins install @myorg/openclaw-my-plugin
    ```

    OpenClaw 会首先检查 ClawHub，然后回退到 npm。

    **仓库内插件：** 放置于 `extensions/` 之下 — 会自动被发现。

    ```bash
    pnpm test -- extensions/my-plugin/
    ```

  </Step>
</Steps>

## 插件功能

单个插件可以通过 `api` 对象注册任意数量的功能：

| 功能            | 注册方法                                      | 详细指南                                                                     |
| --------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| 文本推理 (LLM)  | `api.registerProvider(...)`                   | [提供商插件](/zh/plugins/sdk-provider-plugins)                               |
| 渠道 / 消息传递 | `api.registerChannel(...)`                    | [渠道插件](/zh/plugins/sdk-channel-plugins)                                  |
| 语音 (TTS/STT)  | `api.registerSpeechProvider(...)`             | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 媒体理解        | `api.registerMediaUnderstandingProvider(...)` | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 图像生成        | `api.registerImageGenerationProvider(...)`    | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 网络搜索        | `api.registerWebSearchProvider(...)`          | [提供商插件](/zh/plugins/sdk-provider-plugins#step-5-add-extra-capabilities) |
| 代理工具        | `api.registerTool(...)`                       | 下方                                                                         |
| 自定义命令      | `api.registerCommand(...)`                    | [入口点](/zh/plugins/sdk-entrypoints)                                        |
| 事件钩子        | `api.registerHook(...)`                       | [入口点](/zh/plugins/sdk-entrypoints)                                        |
| HTTP 路由       | `api.registerHttpRoute(...)`                  | [内部原理](/zh/plugins/architecture#gateway-http-routes)                     |
| CLI 子命令      | `api.registerCli(...)`                        | [入口点](/zh/plugins/sdk-entrypoints)                                        |

有关完整的注册 API，请参阅 [SDK 概览](/zh/plugins/sdk-overview#registration-api)。

需要记住的钩子守卫语义：

- `before_tool_call`: `{ block: true }` 是终止的，并停止低优先级的处理程序。
- `before_tool_call`: `{ block: false }` 被视为未作决定。
- `message_sending`: `{ cancel: true }` 是终止的，并停止低优先级的处理程序。
- `message_sending` `{ cancel: false }` 被视为未作决定。

有关详细信息，请参阅 [SDK Overview hook decision semantics](/zh/plugins/sdk-overview#hook-decision-semantics)。

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

有关完整的子路径参考，请参阅 [SDK Overview](/zh/plugins/sdk-overview)。

在插件内部，使用本地桶文件（`api.ts`、`runtime-api.ts`）进行内部导入——切勿通过其 SDK 路径导入您自己的插件。

## 提交前检查清单

<Check>**package.** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.** 清单存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用特定的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而不是 SDK 自导入</Check>
<Check>测试通过 (`pnpm test -- extensions/my-plugin/`)</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## 后续步骤

<CardGroup cols={2}>
  <Card title="渠道插件" icon="messages-square" href="/zh/plugins/sdk-channel-plugins">
    构建消息渠道插件
  </Card>
  <Card title="Provider Plugins" icon="cpu" href="/zh/plugins/sdk-provider-plugins">
    构建模型提供商插件
  </Card>
  <Card title="SDK Overview" icon="book-open" href="/zh/plugins/sdk-overview">
    导入映射和注册API参考
  </Card>
  <Card title="Runtime Helpers" icon="settings" href="/zh/plugins/sdk-runtime">
    通过 api.runtime 进行 TTS、搜索、子代理
  </Card>
  <Card title="Testing" icon="test-tubes" href="/zh/plugins/sdk-testing">
    测试工具和模式
  </Card>
  <Card title="Plugin Manifest" icon="file-json" href="/zh/plugins/manifest">
    完整清单架构参考
  </Card>
</CardGroup>

import zh from "/components/footer/zh.mdx";

<zh />
