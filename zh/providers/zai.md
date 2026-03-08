---
title: "Z.AI"
summary: "在 OpenClaw 中使用 Z.AI（GLM 模型）"
read_when:
  - 想在 OpenClaw 中使用 Z.AI / GLM 模型
  - 需要简单的 ZAI_API_KEY 配置
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它为 GLM 提供 REST API，并使用 API key 认证。
请在 Z.AI 控制台创建 API key。OpenClaw 使用 `zai` provider 与 Z.AI API key。

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
  agents: { defaults: { model: { primary: "zai/glm-4.7" } } },
}
```

## 说明

- GLM 模型引用为 `zai/<model>`（例如：`zai/glm-4.7`）。
- 模型家族概览参见 [/providers/glm](/zh/providers/glm)。
- Z.AI 使用 Bearer token 认证。
