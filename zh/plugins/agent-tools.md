---
summary: "在插件中编写代理工具（schema、可选工具、allowlist）"
read_when:
  - 想在插件中新增代理工具
  - 需要通过 allowlist 让工具成为可选项
title: "插件 Agent 工具"
---
# 插件代理工具

OpenClaw 插件可以注册 **代理工具**（JSON‑schema 函数），在代理运行期间暴露给 LLM。工具可为 **必需**（始终可用）或 **可选**（需显式启用）。

代理工具在主配置的 `tools` 下配置，或在 `agents.list[].tools` 中按代理配置。allowlist/denylist 策略控制代理可调用哪些工具。

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

## 可选工具（opt‑in）

可选工具 **不会** 自动启用。用户必须将其加入代理 allowlist。

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
            "workflow_tool",  // 指定工具名
            "workflow",       // 插件 id（启用该插件所有工具）
            "group:plugins"   // 所有插件工具
          ]
        }
      }
    ]
  }
}
```

其他会影响工具可用性的配置：
- 仅列出插件工具的 allowlist 会被视为插件 opt‑in；除非你在 allowlist 中也包含 core 工具或 group，否则 core 工具仍保持启用。
- `tools.profile` / `agents.list[].tools.profile`（基础 allowlist）
- `tools.byProvider` / `agents.list[].tools.byProvider`（按 provider 的 allow/deny）
- `tools.sandbox.tools.*`（沙盒时的工具策略）

## 规则与提示

- 工具名 **不得** 与 core 工具名冲突；冲突的工具会被跳过。
- allowlist 中使用的插件 id 不得与 core 工具名冲突。
- 对会触发副作用或需要额外二进制/凭据的工具，优先使用 `optional: true`。
