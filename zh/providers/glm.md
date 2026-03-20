---
summary: "GLM 模型系列概述 + 如何在 OpenClaw 中使用它"
read_when:
  - 您需要在 OpenClaw 中使用 GLM 模型
  - 您需要模型命名约定和设置
title: "GLM 模型"
---

# GLM 模型

GLM 是一个通过 Z.AI 平台可用的**模型系列**（而非公司）。在 OpenClaw 中，GLM
模型通过 `zai` 提供商和模型 ID（如 `zai/glm-5`）进行访问。

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

## Config snippet

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

## Notes

- GLM 的版本和可用性可能会发生变化；请查阅 Z.AI 文档以获取最新信息。
- 示例模型 ID 包括 `glm-5`、`glm-4.7` 和 `glm-4.6`。
- 有关提供商详细信息，请参阅 [/providers/zai](/zh/providers/zai)。

import en from "/components/footer/en.mdx";

<en />
