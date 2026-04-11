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
# Generic API-key setup with endpoint auto-detection
openclaw onboard --auth-choice zai-api-key

# Coding Plan Global, recommended for Coding Plan users
openclaw onboard --auth-choice zai-coding-global

# Coding Plan CN (China region), recommended for Coding Plan users
openclaw onboard --auth-choice zai-coding-cn

# General API
openclaw onboard --auth-choice zai-global

# General API CN (China region)
openclaw onboard --auth-choice zai-cn
```

## 配置片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

`zai-api-key` 允许 OpenClaw 从密钥中检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。当您想要强制使用特定的 Coding Plan 或通用 API 接口时，请使用明确的区域性选项。

## 捆绑的 GLM 目录

OpenClaw 目前使用以下内容初始化捆绑的 `zai` 提供商：

- `glm-5.1`
- `glm-5`
- `glm-5-turbo`
- `glm-5v-turbo`
- `glm-4.7`
- `glm-4.7-flash`
- `glm-4.7-flashx`
- `glm-4.6`
- `glm-4.6v`
- `glm-4.5`
- `glm-4.5-air`
- `glm-4.5-flash`
- `glm-4.5v`

## 注意事项

- GLM 模型可用作 `zai/<model>`（示例：`zai/glm-5`）。
- 默认捆绑的模型引用：`zai/glm-5.1`
- 未知的 `glm-5*` ID 仍然在捆绑提供商路径上向前解析，方法是当 ID 匹配当前的 GLM-5 系列形状时，从 `glm-4.7` 模板合成提供商拥有的元数据。
- 对于 Z.AI 工具调用流式传输，默认启用 `tool_stream`。将 `agents.defaults.models["zai/<model>"].params.tool_stream` 设置为 `false` 以禁用它。
- 有关模型系列的概述，请参阅 [/providers/glm](/en/providers/glm)。
- Z.AI 使用您的 API 密钥进行 Bearer 身份验证。
