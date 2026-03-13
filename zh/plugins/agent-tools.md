---
summary: "在插件中编写代理工具（架构、可选工具、允许列表）"
read_when:
  - You want to add a new agent tool in a plugin
  - You need to make a tool opt-in via allowlists
title: "插件代理工具"
---

# 插件代理工具

OpenClaw 插件可以注册 **agent tools**（JSON‑schema 函数），这些工具会在 agent 运行期间暴露给 LLM。工具可以是 **required**（始终可用）或 **optional**（可选择加入）。

代理工具在主配置中的 `tools` 下配置，或者在特定代理的 `agents.list[].tools` 下配置。允许列表/拒绝列表策略控制代理可以调用哪些工具。

## 基本工具

```ts
import { Type } from "@sinclair/typebox";

export default function (api) {
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({
      input: Type.String(),
    }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });
}
```

## 可选工具（选择性加入）

可选工具**永不**自动启用。用户必须将其添加到代理允许列表中。

```ts
export default function (api) {
  api.registerTool(
    {
      name: "workflow_tool",
      description: "Run a local workflow",
      parameters: {
        type: "object",
        properties: {
          pipeline: { type: "string" },
        },
        required: ["pipeline"],
      },
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}
```

在 `agents.list[].tools.allow`（或全局 `tools.allow`）中启用可选工具：

```json5
{
  agents: {
    list: [
      {
        id: "main",
        tools: {
          allow: [
            "workflow_tool", // specific tool name
            "workflow", // plugin id (enables all tools from that plugin)
            "group:plugins", // all plugin tools
          ],
        },
      },
    ],
  },
}
```

其他影响工具可用性的配置选项：

- 仅命名插件工具的允许列表被视为插件选择加入；核心工具保持
  除非您还在允许列表中包含核心工具或组，否则将启用。
- `tools.profile` / `agents.list[].tools.profile`（基本允许列表）
- `tools.byProvider` / `agents.list[].tools.byProvider`（特定于提供商的允许/拒绝）
- `tools.sandbox.tools.*`（沙盒化时的沙盒工具策略）

## 规则 + 提示

- 工具名称**不得**与核心工具名称冲突；冲突的工具将被跳过。
- 允许列表中使用的插件ID不得与核心工具名称冲突。
- 对于触发副作用或需要额外权限的工具，请优先使用 `optional: true`
  二进制文件/凭据。

import zh from '/components/footer/zh.mdx';

<zh />
