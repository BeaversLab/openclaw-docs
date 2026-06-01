---
summary: "在几分钟内创建您的第一个 OpenClaw 插件"
title: "构建插件"
sidebarTitle: "入门指南"
doc-schema-version: 1
read_when:
  - You want to create a new OpenClaw plugin
  - You need a quick-start for plugin development
  - You are choosing between channel, provider, CLI backend, tool, or hook docs
---

插件在无需更改核心代码的情况下扩展 OpenClaw。插件可以添加消息传递渠道、模型提供商、本地 CLI 后端、代理工具、钩子、媒体提供商或其它由插件拥有的功能。

您无需将外部插件添加到 OpenClaw 代码库。将包发布到 [ClawHub](/zh/clawhub)，用户即可通过以下方式安装：

```bash
openclaw plugins install clawhub:<package-name>
```

在启动切换期间，裸包规范仍然从 npm 安装。当您需要 ClawHub 解析时，请使用 `clawhub:` 前缀。

## 要求

- 使用 Node 22.19 或更新版本，以及包管理器，例如 `npm` 或 `pnpm`。
- 熟悉 TypeScript ESM 模块。
- 对于代码库内捆绑插件工作，请克隆代码库并运行 `pnpm install`。
  源码检出插件开发仅支持 pnpm，因为 OpenClaw 从 `extensions/*` 工作区包加载捆绑插件。

## 选择插件形态

<CardGroup cols={2}>
  <Card title="渠道插件" icon="messages-square" href="/zh/plugins/sdk-channel-plugins">
    将 OpenClaw 连接到消息传递平台。
  </Card>
  <Card title="提供商插件" icon="cpu" href="/zh/plugins/sdk-provider-plugins">
    添加模型、媒体、搜索、获取、语音或实时提供商。
  </Card>
  <Card title="CLI 后端插件" icon="terminal" href="/zh/plugins/cli-backend-plugins">
    通过 CLI 模型回退运行本地 AI OpenClaw。
  </Card>
  <Card title="工具插件" icon="wrench" href="/zh/plugins/tool-plugins">
    注册代理工具。
  </Card>
</CardGroup>

## 快速开始

通过注册一个必需的代理工具来构建一个最小工具插件。这是最短的有用插件形态，并展示了包、清单、入口点和本地验证。

<Steps>
  <Step title="创建包元数据">
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

    已发布的外部插件应将运行时入口指向构建后的 JavaScript
    文件。有关完整的入口点契约，请参阅 [SDK 入口点](/zh/plugins/sdk-entrypoints)。

    每个插件都需要一个清单，即使它没有配置。运行时工具
    必须出现在 `contracts.tools`OpenClaw 中，以便 OpenClaw 可以在不
    急切加载每个插件运行时的情况下发现所有权。有意识地
    设置 `activation.onStartup`Gateway(网关)
    。此示例在 Gateway 启动时开始。

    有关每个清单字段，请参阅 [插件清单](/zh/plugins/manifest)。

  </Step>

  <Step title="注册工具">
    ```typescript index.ts
    import { Type } from "typebox";
    import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

    export default definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Adds a custom tool to OpenClaw",
      register(api) {
        api.registerTool({
          name: "my_tool",
          description: "Echo one input value",
          parameters: Type.Object({ input: Type.String() }),
          async execute(_id, params) {
            return {
              content: [{ type: "text", text: `Got: ${params.input}` }],
            };
          },
        });
      },
    });
    ```

    对于非渠道插件，请使用 `definePluginEntry`。渠道插件使用
    `defineChannelPluginEntry`。

  </Step>

  <Step title="测试运行时">
    对于已安装或外部插件，检查加载的运行时：

    ```bash
    openclaw plugins inspect my-plugin --runtime --json
    ```CLI

    如果插件注册了 CLI 命令，请运行该命令。例如，
    演示命令应该有一个执行证明，例如
    `openclaw demo-plugin ping`OpenClaw。

    对于此仓库中的捆绑插件，OpenClaw 从 `extensions/*` 工作区发现源代码检出
    插件包。运行最接近的针对性
    测试：

    ```bash
    pnpm test -- extensions/my-plugin/
    pnpm check
    ```

  </Step>

  <Step title="发布">
    发布前验证包：

    ```bash
    clawhub package publish your-org/your-plugin --dry-run
    clawhub package publish your-org/your-plugin
    ```ClawHub

    规范的 ClawHub 代码片段位于 `docs/snippets/plugin-publish/`。

  </Step>

  <Step title="Install"ClawHub>
    通过 ClawHub 安装已发布的软件包：

    ```bash
    openclaw plugins install clawhub:your-org/your-plugin
    ```

  </Step>
</Steps>

<a id="registering-agent-tools"></a>

## 注册工具

工具可以是必需的或可选的。必需的工具在插件启用时始终可用。可选工具需要用户选择加入。

```typescript
register(api) {
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

每个通过 `api.registerTool(...)` 注册的工具也必须在插件清单中声明：

```json
{
  "contracts": {
    "tools": ["workflow_tool"]
  },
  "toolMetadata": {
    "workflow_tool": {
      "optional": true
    }
  }
}
```

用户通过 `tools.allow` 选择加入：

```json5
{
  tools: { allow: ["workflow_tool"] }, // or ["my-plugin"] for all tools from one plugin
}
```

可选工具控制是否向模型暴露工具。当工具或钩子应该在模型选择之后、操作运行之前请求批准时，请使用[插件权限请求](/zh/plugins/plugin-permission-requests)。

将可选工具用于副作用、非常规二进制文件或默认情况下不应暴露的功能。工具名称不得与核心工具冲突；冲突项将被跳过并在插件诊断中报告。格式错误的注册（包括没有 `parameters` 的工具描述符）也会被跳过并以相同方式报告。已注册的工具是模型在策略和允许列表检查通过后可以调用的类型化函数。

工具工厂接收运行时提供的上下文对象。当工具需要记录、显示或适应当前轮次的活跃模型时，请使用 `ctx.activeModel`。该对象可以包含 `provider`、`modelId` 和 `modelRef`OpenClaw。应将其视为信息性运行时元数据，而不是针对本地操作员、已安装的插件代码或修改后的 OpenClaw 运行时的安全边界。敏感的本地工具仍应要求显式的插件或操作员选择加入，并在活跃模型元数据缺失或不适用时以封闭模式失败。

清单声明所有权和发现；执行仍然调用实时的已注册工具实现。保持 `toolMetadata.<tool>.optional: true` 与 `api.registerTool(..., { optional: true })`OpenClaw 一致，以便 OpenClaw 可以避免加载该插件运行时，直到该工具被明确加入允许列表。

## 导入约定

从特定的 SDK 子路径导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
```

不要从已弃用的根桶文件导入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk";
```

在插件包内，使用本地桶文件（如 `api.ts` 和 `runtime-api.ts`）进行内部导入。不要通过 SDK 路径导入您自己的插件。特定于提供商的辅助工具应保留在提供商包中，除非接口确实是通用的。

自定义 Gateway(网关) RPC 方法是一个高级入口点。请将它们放在特定于插件的前缀上；核心管理命名空间（如 `config.*`、`exec.approvals.*`、`operator.admin.*`、`wizard.*` 和 `update.*`）保持保留状态，并解析为 `operator.admin`。`openclaw/plugin-sdk/gateway-method-runtime` 桥接器保留用于声明 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的插件 HTTP 路由。

有关完整的导入映射，请参阅 [Plugin SDK overview](/zh/plugins/sdk-overview)。

## 提交前检查清单

<Check>**package.** 具有正确的 `openclaw` 元数据</Check>
<Check>**openclaw.plugin.** 清单存在且有效</Check>
<Check>入口点使用 `defineChannelPluginEntry` 或 `definePluginEntry`</Check>
<Check>所有导入都使用专用的 `plugin-sdk/<subpath>` 路径</Check>
<Check>内部导入使用本地模块，而不是 SDK 自导入</Check>
<Check>测试通过 (`pnpm test -- <bundled-plugin-root>/my-plugin/`)</Check>
<Check>`pnpm check` 通过（仓库内插件）</Check>

## 针对 Beta 版本进行测试

1. 关注 [openclaw/openclaw](https://github.com/openclaw/openclaw/releases) 上的 GitHub 发布标签，并通过 `Watch` > `Releases` 订阅。Beta 标签看起来像 `v2026.3.N-beta.1`。您还可以为官方 OpenClaw X 账户 [@openclaw](https://x.com/openclaw) 开启通知，以获取发布公告。
2. Beta 标签出现后，请立即针对该标签测试您的插件。稳定版之前的窗口通常只有几个小时。
3. 在 `plugin-forum` Discord 频道中您插件的主题下发布测试结果，注明 `all good` 或遇到的问题。如果您还没有主题，请创建一个。
4. 如果有损坏，请打开或更新标题为 `Beta blocker: <plugin-name> - <summary>` 的问题，并应用 `beta-blocker` 标签。将问题链接放入您的主题中。
5. 向 `main` 提交一个 PR，标题为 `fix(<plugin-id>): beta blocker - <summary>`，并在 PR 和你的 Discord 线程中都关联该 issue。贡献者无法标记 PR，因此标题是维护者和自动化工具在 PR 一侧的信号。带有 PR 的阻碍问题会被合并；没有 PR 的阻碍问题可能仍会发布。维护者在测试版期间会关注这些线程。
6. 没有消息就是好消息。如果你错过了窗口，你的修复很可能在下一个周期落地。

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
  <Card title="SDK 概述" icon="book-open" href="/zh/plugins/sdk-overview">
    导入映射和注册 API 参考
  </Card>
  <Card title="运行时辅助工具" icon="settings" href="/zh/plugins/sdk-runtime">
    通过 api.runtime 使用 TTS、搜索、子代理
  </Card>
  <Card title="测试" icon="test-tubes" href="/zh/plugins/sdk-testing">
    测试工具和模式
  </Card>
  <Card title="插件清单" icon="file-" href="/zh/plugins/manifest">
    完整的清单架构参考
  </Card>
</CardGroup>

## 相关

- [插件钩子](/zh/plugins/hooks)
- [插件架构](/zh/plugins/architecture)
