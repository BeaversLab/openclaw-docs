---
summary: "面向工作流的纯 JSON LLM 任务（可选插件工具）"
read_when:
  - You want a JSON-only LLM step inside workflows
  - You need schema-validated LLM output for automation
title: "LLM 任务"
---

# LLM Task

`llm-task` 是一个**可选的插件工具**，用于运行纯 JSON LLM 任务并
返回结构化输出（可选择根据 JSON Schema 进行验证）。

这非常适合像 Lobster 这样工作流引擎：您可以添加单个 LLM 步骤，
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

2. 将该工具列入白名单（它注册于 `optional: true`）：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

## 配置（可选）

```json
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.4",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是 `provider/model` 字符串的白名单。如果设置，则列表之外的任何请求
都会被拒绝。

## 工具参数

- `prompt`（字符串，必填）
- `input`（任意类型，可选）
- `schema`（对象，可选的 JSON Schema）
- `provider`（字符串，可选）
- `model`（字符串，可选）
- `thinking`（字符串，可选）
- `authProfileId`（字符串，可选）
- `temperature`（数字，可选）
- `maxTokens`（数字，可选）
- `timeoutMs`（数字，可选）

`thinking` 接受标准的 OpenClaw 推理预设，例如 `low` 或 `medium`。

## 输出

返回包含解析后的 JSON 的 `details.json`（并在提供时
对照 `schema` 进行验证）。

## 示例：Lobster 工作流步骤

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

- 该工具是 **仅 JSON** 的，并指示模型仅输出 JSON（无
  代码块，无评论）。
- 在此次运行中，没有向模型公开任何工具。
- 除非使用 `schema` 进行验证，否则请将输出视为不受信任的内容。
- 在任何产生副作用的步骤（发送、发布、执行）之前放置审批流程。
