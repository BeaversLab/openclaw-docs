---
summary: "通过 OpenClaw 使用 Xiaomi MiMo (mimo-v2-flash)"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。它提供兼容 OpenAI 和 Anthropic 格式的 REST API，并使用 API 密钥进行身份验证。在 [Xiaomi MiMo console](https://platform.xiaomimimo.com/#/console/api-keys) 中创建您的 API 密钥。OpenClaw 使用带有 Xiaomi MiMo API 密钥的 `xiaomi` 提供商。

## 模型概述

- **mimo-v2-flash**：262144 令牌上下文窗口，兼容 Anthropic Messages API。
- Base URL: `https://api.xiaomimimo.com/anthropic`
- Authorization: `Bearer $XIAOMI_API_KEY`

## CLI setup

```bash
openclaw onboard --auth-choice xiaomi-api-key
# or non-interactive
openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
```

## Config snippet

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/anthropic",
        api: "anthropic-messages",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

## Notes

- Model ref: `xiaomi/mimo-v2-flash`.
- The 提供商 is injected automatically when `XIAOMI_API_KEY` is set (or an auth profile exists).
- See [/concepts/模型-providers](/zh/concepts/model-providers) for 提供商 rules.

import en from "/components/footer/en.mdx";

<en />
