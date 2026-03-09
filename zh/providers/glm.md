---
summary: "GLM 模型系列概述 + 在 OpenClaw 中使用的方法"
read_when:
  - "You want GLM models in OpenClaw"
  - "You need the model naming convention and setup"
title: "GLM 模型"
---

# GLM 模型

GLM 是通过 Z.AI 平台提供的**模型系列**（而非公司）。在 OpenClaw 中，GLM 模型通过 `zai` 提供商和 `zai/glm-4.7` 等模型 ID 访问。

## CLI setup

```bash
openclaw onboard --auth-choice zai-api-key
```

## 配置片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-4.7" } } },
}
```

## 注意事项

- GLM 版本和可用性可能会变化；查看 Z.AI 文档了解最新信息。
- 示例模型 ID 包括 `glm-4.7` 和 `glm-4.6`。
- 有关提供商详情，请参阅 [/providers/zai](/zh/providers/zai)。
