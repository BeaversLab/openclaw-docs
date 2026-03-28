---
summary: "在 OpenClaw 中使用 Z.AI (GLM 模型)"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它提供 GLM 的 REST API，並使用 API 金鑰
進行身份驗證。在 Z.AI 控制台中建立您的 API 金鑰。OpenClaw 使用 `zai` 提供者
搭配 Z.AI API 金鑰。

## CLI 設定

```exec
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

- GLM 模型可作為 `zai/<model>` 使用 (範例：`zai/glm-5`)。
- 針對 Z.AI 工具呼叫串流，預設已啟用 `tool_stream`。設定
  `agents.defaults.models["zai/<model>"].params.tool_stream` 為 `false` 即可停用它。
- 請參閱 [/providers/glm](/zh-Hant/providers/glm) 以了解模型系列概覽。
- Z.AI 使用您的 API 金鑰進行 Bearer 身份驗證。
