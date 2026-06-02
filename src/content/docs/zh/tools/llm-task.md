---
summary: "LLM仅限 JSON 的 LLM 任务，用于工作流（可选插件工具）"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "LLMLLM 任务"
---

`llm-task`LLM 是一个**可选插件工具**，它运行仅限 JSON 的 LLM 任务并
返回结构化输出（可选择根据 JSON Schema 进行验证）。

这非常适用于像 Lobster 这样的工作流引擎：你可以添加单个 LLM 步骤
而无需为每个工作流编写自定义 OpenClaw 代码。

## 启用插件

1. 启用插件：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2. 允许使用可选工具：

```json
{
  "tools": {
    "alsoAllow": ["llm-task"]
  }
}
```

仅当您需要限制性白名单模式时，才使用 `tools.allow`。

## 配置（可选）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai",
          "defaultModel": "gpt-5.5",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai/gpt-5.5"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是 `provider/model` 字符串的白名单。如果设置，则任何
超出列表的请求都会被拒绝。

## 工具参数

- `prompt`（字符串，必需）
- `input`（任意，可选）
- `schema`（对象，可选 JSON Schema）
- `provider`（字符串，可选）
- `model`（字符串，可选）
- `thinking`（字符串，可选）
- `authProfileId`（字符串，可选）
- `temperature`（数字，可选）
- `maxTokens`（数字，可选）
- `timeoutMs`（数字，可选）

`thinking`OpenClaw 接受标准的 OpenClaw 推理预设，例如 `low` 或 `medium`。

## 输出

返回 `details.json`，其中包含已解析的 JSON（并在提供时根据
`schema` 进行验证）。

## 示例：Lobster 工作流步骤

### 重要限制

以下示例假设**独立的 Lobster CLI**在一个环境中运行，其中 LobsterCLI`openclaw.invoke` 已具有正确的网关 URL/身份验证上下文。

对于 OpenClaw 内部捆绑的**嵌入式** Lobster 运行器，此嵌套 CLI 模式**目前不可靠**：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{ ... }'
```

在嵌入式 Lobster 支持此流程的桥接之前，请选择以下任一方式：

- 直接在 Lobster 外部调用 `llm-task`Lobster 工具，或者
- 不依赖嵌套 Lobster`openclaw.invoke` 调用的 Lobster 步骤。

独立的 Lobster CLI 示例：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

## 安全说明

- 该工具是 **仅限 JSON** 的，并指示模型仅输出 JSON（不
  包含代码围栏，不包含注释）。
- 此次运行没有向模型暴露任何工具。
- 除非使用 `schema` 进行验证，否则请将输出视为不受信任。
- 在任何产生副作用的步骤（send、post、exec）之前放置审批环节。

## 相关内容

- [思考级别](/zh/tools/thinking)
- [子代理](/zh/tools/subagents)
- [斜杠命令](/zh/tools/slash-commands)
