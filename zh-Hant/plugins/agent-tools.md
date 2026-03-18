---
summary: "在插件中撰寫代理工具（schemas、選用工具、允許清單）"
read_when:
  - You want to add a new agent tool in a plugin
  - You need to make a tool opt-in via allowlists
title: "Plugin Agent Tools"
---

# Plugin agent tools

OpenClaw 外掛程式可以註冊 **agent tools**（JSON-schema 函數），這些工具會在代理程式執行期間暴露給 LLM。工具可以是 **required**（始終可用）或 **optional**（選用/加入）。

Agent tools 是在主設定檔的 `tools` 下設定，或在個別代理程式的 `agents.list[].tools` 下設定。允許清單/拒絕清單原則會控制代理程式可以呼叫哪些工具。

## Basic tool

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

## Optional tool (opt‑in)

選用工具 **永不** 會自動啟用。使用者必須將它們加入到代理程式的允許清單中。

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

在 `agents.list[].tools.allow` 中啟用選用工具（或全域 `tools.allow`）：

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

其他影響工具可用性的設定選項：

- 僅列出外掛程式工具的允許清單會被視為外掛程式選用項；核心工具會保持啟用，除非您在允許清單中同時包含核心工具或群組。
- `tools.profile` / `agents.list[].tools.profile` (base allowlist)
- `tools.byProvider` / `agents.list[].tools.byProvider` (provider‑specific allow/deny)
- `tools.sandbox.tools.*` (sandbox tool policy when sandboxed)

## Rules + tips

- 工具名稱 **不得** 與核心工具名稱衝突；有衝突的工具會被跳過。
- 允許清單中使用的外掛程式 ID 不得與核心工具名稱衝突。
- 對於會觸發副作用或需要額外二進位檔/憑證的工具，建議使用 `optional: true`。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
