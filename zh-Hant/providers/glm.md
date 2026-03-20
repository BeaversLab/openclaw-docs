---
summary: "GLM 模型系列概覽 + 如何在 OpenClaw 中使用"
read_when:
  - 您想要在 OpenClaw 中使用 GLM 模型
  - 您需要了解模型命名慣例和設定
title: "GLM 模型"
---

# GLM 模型

GLM 是透過 Z.AI 平台提供的**模型系列**（並非公司）。在 OpenClaw 中，GLM 模型是透過 `zai` 提供者和類似 `zai/glm-5` 的模型 ID 來存取的。

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

## 註解

- GLM 版本和可用性可能會變更；請查看 Z.AI 文件以取得最新資訊。
- 模型 ID 範例包括 `glm-5`、`glm-4.7` 和 `glm-4.6`。
- 如需提供者詳細資訊，請參閱 [/providers/zai](/zh-Hant/providers/zai)。

import en from "/components/footer/en.mdx";

<en />
