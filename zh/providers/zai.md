---
summary: "在 OpenClaw 中使用 Z.AI (GLM 模型)"
read_when:
  - "你想要在 OpenClaw 中使用 Z.AI / GLM 模型"
  - "你需要简单的 ZAI_API_KEY 设置"
title: "Z.AI"
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它提供 GLM 的 REST API 并使用 API 密钥进行身份验证。在 Z.AI 控制台中创建你的 API 密钥。OpenClaw 使用 `zai` 提供商配合 Z.AI API 密钥。

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

## 注意事项

- GLM 模型以 `zai/<model>` 形式提供（例如：`zai/glm-4.7`）。
- 模型系列概述请参阅 [/providers/glm](/zh/providers/glm)。
- Z.AI 使用你的 API 密钥进行 Bearer 身份验证。
