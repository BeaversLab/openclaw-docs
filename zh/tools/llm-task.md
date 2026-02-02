> [!NOTE]
> 本页正在翻译中。

---
summary: "工作流中的仅 JSON LLM 任务（可选插件工具）"
read_when:
  - 你希望在工作流中加入仅 JSON 的 LLM 步骤
  - 你需要对 LLM 输出做 schema 校验以便自动化
---

# LLM Task

`llm-task` 是 **可选插件工具**，运行仅 JSON 的 LLM 任务并返回结构化输出（可选 JSON Schema 校验）。

它非常适合 Lobster 等工作流引擎：无需为每个工作流编写自定义 OpenClaw 代码，即可添加单个 LLM 步骤。

## 启用插件

1) 启用插件：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}
```

2) 将工具加入 allowlist（它以 `optional: true` 注册）：

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
          "defaultModel": "gpt-5.2",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.2"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}
```

`allowedModels` 是 `provider/model` 字符串 allowlist。若设置，列表外请求会被拒绝。

## 工具参数

- `prompt`（string，必填）
- `input`（any，可选）
- `schema`（object，可选 JSON Schema）
- `provider`（string，可选）
- `model`（string，可选）
- `authProfileId`（string，可选）
- `temperature`（number，可选）
- `maxTokens`（number，可选）
- `timeoutMs`（number，可选）

## 输出

返回 `details.json`，包含解析后的 JSON（若提供 `schema` 则会校验）。

## 示例：Lobster 工作流步骤

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
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

- 工具 **仅 JSON**，并指示模型只输出 JSON（无代码块、无评论）。
- 本次运行不向模型暴露任何工具。
- 除非使用 `schema` 校验，否则应将输出视为不可信。
- 在任何有副作用的步骤（发送、发布、exec）之前放置审批。
