---
summary: "GLM 模型系列概览 + 在 OpenClaw 中的使用方法"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLM 模型"
---

# GLM 模型

GLM 是一个通过 Z.AI 平台提供的 **模型系列**（而非公司）。在 OpenClaw 中，GLM 模型通过 `zai` 提供商访问，模型 ID 例如 `zai/glm-5`。

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
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

`zai-api-key` 允许 OpenClaw 从密钥中检测匹配的 Z.AI 端点，并自动应用正确的基础 URL。当您想要强制使用特定的 Coding Plan 或通用 API 表面时，请使用显式区域选项。

## 当前捆绑的 GLM 模型

OpenClaw 目前使用这些 GLM 引用初始化捆绑的 `zai` 提供商：

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

- GLM 的版本和可用性可能会发生变化；请查阅 Z.AI 的文档以获取最新信息。
- 默认的捆绑模型引用是 `zai/glm-5`。
- 有关提供商的详细信息，请参阅 [/providers/zai](/en/providers/zai)。
