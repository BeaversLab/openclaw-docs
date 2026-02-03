---
title: "GLM 模型"
summary: "GLM 模型家族概览 + 在 OpenClaw 中的使用方式"
read_when:
  - 想在 OpenClaw 中使用 GLM 模型
  - 需要模型命名约定与配置方式
---
# GLM 模型

GLM 是一个 **模型家族**（不是公司），通过 Z.AI 平台提供。在 OpenClaw 中，GLM 模型通过 `zai` provider 与类似 `zai/glm-4.7` 的模型 ID 访问。

## CLI 设置

```bash
openclaw onboard --auth-choice zai-api-key
```

## 配置片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-4.7" } } }
}
```

## 说明

- GLM 版本与可用性可能变化；请查看 Z.AI 文档获取最新信息。
- 示例模型 ID 包括 `glm-4.7` 与 `glm-4.6`。
- Provider 细节参见 [/providers/zai](/zh/providers/zai)。
