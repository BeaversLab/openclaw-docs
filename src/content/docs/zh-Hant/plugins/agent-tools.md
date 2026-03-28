---
summary: "在插件中編寫代理工具（schemas、可選工具、允許列表）"
read_when:
  - You want to add a new agent tool in a plugin
  - You need to make a tool opt-in via allowlists
title: "插件代理工具"
---

# 插件代理工具

OpenClaw 插件可以註冊 **agent tools**（JSON-schema 函數），這些函數會在代理運行期間暴露給 LLM。工具可以是 **required**（始終可用）或 **optional**（選擇加入）。

代理工具在主設定中的 `tools` 下配置，或在單個代理的 `agents.list[].tools` 下配置。允許列表/拒絕列表策略控制代理可以呼叫哪些工具。

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

## 可選工具（選擇加入）

可選工具 **絕不會** 自動啟用。使用者必須將其新增到代理允許列表中。

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

在 `agents.list[].tools.allow`（或全域 `tools.allow`）中啟用可選工具：

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

- 僅命名插件工具的允許清單被視為插件選用；除非您也在允許清單中包含核心工具或群組，否則核心工具保持啟用狀態。
- `tools.profile` / `agents.list[].tools.profile` (基本允許清單)
- `tools.byProvider` / `agents.list[].tools.byProvider` (特定提供者的允許/拒絕)
- `tools.sandbox.tools.*` (沙箱工具策略，當處於沙箱中時)

## 規則 + 提示

- 工具名稱**不得**與核心工具名稱衝突；衝突的工具將被跳過。
- 允許清單中使用的 Plugin id 不得與核心工具名稱衝突。
- 對於觸發副作用或需要額外二進位檔案/憑證的工具，請優先使用 `optional: true`。
