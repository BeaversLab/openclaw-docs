---
summary: "在 OpenClaw 中使用 Xiaomi MiMo 模型"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 使用 Xiaomi
OpenAI 兼容的端点进行 API 密钥认证。在
[API MiMo 控制台](https://platform.xiaomimimo.com/#/console/api-keys) 中创建您的 Xiaomi 密钥，然后使用该密钥配置
内置的 `xiaomi` 提供商。

## 内置目录

- Base URL: `https://api.xiaomimimo.com/v1`
- API: `openai-completions`
- Authorization: `Bearer $XIAOMI_API_KEY`

| Model ref              | Input       | Context   | Max output | Notes                        |
| ---------------------- | ----------- | --------- | ---------- | ---------------------------- |
| `xiaomi/mimo-v2-flash` | text        | 262,144   | 8,192      | Default 模型                 |
| `xiaomi/mimo-v2-pro`   | text        | 1,048,576 | 32,000     | Reasoning-enabled            |
| `xiaomi/mimo-v2-omni`  | text, image | 262,144   | 32,000     | Reasoning-enabled multimodal |

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
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
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
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

## Notes

- Default 模型 ref: `xiaomi/mimo-v2-flash`。
- Additional built-in models: `xiaomi/mimo-v2-pro`, `xiaomi/mimo-v2-omni`。
- 当设置了 `XIAOMI_API_KEY` 时（或存在身份验证配置文件），提供商会自动注入。
- 有关提供商规则，请参阅 [/concepts/模型-providers](/en/concepts/model-providers)。
