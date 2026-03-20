---
summary: "在 OpenClaw 中使用 Z.AI (GLM 模型)"
read_when:
  - 您想要在 OpenClaw 中使用 Z.AI / GLM 模型
  - 您需要簡單的 ZAI_API_KEY 設置
title: "Z.AI"
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它提供 GLM 的 REST API 並使用 API 金鑰
進行身份驗證。在 Z.AI 控制台中創建您的 API 金鑰。OpenClaw 使用 `zai` 提供者
搭配 Z.AI API 金鑰。

## CLI 設置

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

## 注意事項

- GLM 模型可作為 `zai/<model>` 使用（例如：`zai/glm-5`）。
- `tool_stream` 預設為 Z.AI 工具調用串流啟用。將
  `agents.defaults.models["zai/<model>"].params.tool_stream` 設置為 `false` 以停用它。
- 有關模型系列概述，請參閱 [/providers/glm](/zh-Hant/providers/glm)。
- Z.AI 使用您的 API 金鑰進行 Bearer 身份驗證。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
