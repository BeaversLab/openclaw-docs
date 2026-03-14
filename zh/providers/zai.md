---
summary: "在 OpenClaw 中使用 Z.AI (GLM 模型)"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它为 GLM 提供 REST API 并使用 API 密钥
进行身份验证。在 Z.AI 控制台中创建您的 API 密钥。OpenClaw 使用 `zai` 提供商
配合 Z.AI API 密钥。

## CLI 设置

```bash
openclaw onboard --auth-choice zai-api-key
# or non-interactive
openclaw onboard --zai-api-key "$ZAI_API_KEY"
```

## 配置片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

## 注意事项

- GLM 模型可以作为 `zai/<model>` 使用（例如：`zai/glm-5`）。
- `tool_stream` 默认为 Z.AI 工具调用流启用。设置
  `agents.defaults.models["zai/<model>"].params.tool_stream` 为 `false` 以禁用它。
- 有关模型系列的概述，请参阅 [/providers/glm](/zh/en/providers/glm)。
- Z.AI 使用您的 API 密钥进行 Bearer 身份验证。

import zh from '/components/footer/zh.mdx';

<zh />
