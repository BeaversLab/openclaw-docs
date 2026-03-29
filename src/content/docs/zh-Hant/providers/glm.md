---
summary: "GLM 模型系列總覽 + 如何在 OpenClaw 中使用它"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLM 模型"
---

# GLM 模型

GLM 是一個透過 Z.AI 平台提供的 **模型系列**（不是公司）。在 OpenClaw 中，GLM
模型是透過 `zai` 提供者和類似 `zai/glm-5` 的模型 ID 存取的。

## CLI 設定

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

## 設定片段

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}
```

## 備註

- GLM 版本和可用性可能會有所變更；請查看 Z.AI 的文件以取得最新資訊。
- 範例模型 ID 包括 `glm-5`、`glm-4.7` 和 `glm-4.6`。
- 如需提供者詳細資訊，請參閱 [/providers/zai](/en/providers/zai)。
