---
summary: "在 OpenClaw 中使用 Xiaomi MiMo（mimo-v2-flash）"
read_when:
  - 想在 OpenClaw 中使用 Xiaomi MiMo 模型
  - 需要 XIAOMI_API_KEY 配置
title: "小米 MiMo"
---
# Xiaomi MiMo

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。它提供兼容 OpenAI 与 Anthropic 格式的 REST API，并使用 API key 认证。
在 [Xiaomi MiMo 控制台](https://platform.xiaomimimo.com/#/console/api-keys) 创建 API key。OpenClaw 使用 `xiaomi` provider 与 Xiaomi MiMo API key。

## 模型概览

- **mimo-v2-flash**：262144-token 上下文窗口，兼容 Anthropic Messages API。
- Base URL：`https://api.xiaomimimo.com/anthropic`
- 认证：`Bearer $XIAOMI_API_KEY`

## CLI 设置

```bash
openclaw onboard --auth-choice xiaomi-api-key
# 或非交互式
openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
```

## 配置片段

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
            maxTokens: 8192
          }
        ]
      }
    }
  }
}
```

## 说明

- 模型引用：`xiaomi/mimo-v2-flash`。
- 当设置了 `XIAOMI_API_KEY`（或存在认证 profile）时，provider 会自动注入。
- Provider 规则参见 [/concepts/model-providers](/zh/concepts/model-providers)。
