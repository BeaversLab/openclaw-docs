---
summary: "使用 Xiaomi MiMo (mimo-v2-flash) 與 OpenClaw"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。它提供與 OpenAI 和 Anthropic 格式相容的 REST API，並使用 API 金鑰進行驗證。請在 [Xiaomi MiMo console](https://platform.xiaomimimo.com/#/console/api-keys) 中建立您的 API 金鑰。OpenClaw 使用 `xiaomi` 提供者搭配 Xiaomi MiMo API 金鑰。

## 模型概覽

- **mimo-v2-flash**：262144 token 的上下文視窗，與 Anthropic Messages API 相容。
- Base URL：`https://api.xiaomimimo.com/anthropic`
- Authorization：`Bearer $XIAOMI_API_KEY`

## CLI 設定

```bash
openclaw onboard --auth-choice xiaomi-api-key
# or non-interactive
openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
```

## 設定片段

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

## 備註

- 模型參考：`xiaomi/mimo-v2-flash`。
- 當設定了 `XIAOMI_API_KEY`（或存在驗證設定檔）時，此提供者會自動注入。
- 請參閱 [/concepts/model-providers](/zh-Hant/concepts/model-providers) 以了解提供者規則。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
