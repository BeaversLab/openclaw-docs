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

## 注意事项

- GLM 的版本和可用性可能会发生变化；请查阅 Z.AI 的文档以获取最新信息。
- 示例模型 ID 包括 `glm-5`、`glm-4.7` 和 `glm-4.6`。
- 有关提供商的详细信息，请参阅 [/providers/zai](/en/providers/zai)。

import zh from "/components/footer/zh.mdx";

<zh />
