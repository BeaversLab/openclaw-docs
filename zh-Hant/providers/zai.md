---
summary: "在 OpenClaw 中使用 Z.AI（GLM 模型）"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

# Z.AI

Z.AI 是 **GLM** 模型的 API 平台。它为 GLM 提供 REST API，并使用 API 密钥进行身份验证。请在 Z.AI 控制台中创建您的 API 密钥。OpenClaw 使用 `zai` 提供程序以及 Z.AI API 密钥。

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
- `tool_stream` 預設為啟用狀態，用於 Z.AI 工具調用串流。將 `agents.defaults.models["zai/<model>"].params.tool_stream` 設定為 `false` 可將其停用。
- 請參閱 [/providers/glm](/zh-Hant/providers/glm) 以了解模型系列概覽。
- Z.AI 使用 Bearer 身份驗證以及您的 API 密鑰。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
