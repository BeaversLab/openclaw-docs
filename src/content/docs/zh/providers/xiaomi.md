---
summary: "在 OpenClaw 中使用 Xiaomi MiMo 模型"
read_when:
  - You want Xiaomi MiMo models in OpenClaw
  - You need XIAOMI_API_KEY setup
title: "Xiaomi MiMo"
---

# Xiaomi MiMo

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 使用与 OpenAI 兼容的 Xiaomi 端点以及 API 密钥身份验证。在 [Xiaomi MiMo 控制台](https://platform.xiaomimimo.com/#/console/api-keys) 中创建您的 API 密钥，然后使用该密钥配置捆绑的 `xiaomi` 提供商。

## 模型概览

- **mimo-v2-flash**：默认文本模型，262144-token 上下文窗口
- **mimo-v2-pro**：推理文本模型，1048576-token 上下文窗口
- **mimo-v2-omni**：推理多模态模型，支持文本和图像输入，262144-token 上下文窗口
- Base URL: `https://api.xiaomimimo.com/v1`
- API: `openai-completions`
- Authorization: `Bearer $XIAOMI_API_KEY`

## CLI 设置

```bash
openclaw onboard --auth-choice xiaomi-api-key
# or non-interactive
openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
```

## 配置代码片段

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

## 备注

- 默认模型参考：`xiaomi/mimo-v2-flash`。
- 其他内置模型：`xiaomi/mimo-v2-pro`、`xiaomi/mimo-v2-omni`。
- 当设置了 `XIAOMI_API_KEY`（或存在身份验证配置文件）时，提供商会自动注入。
- 有关提供商规则，请参阅 [/concepts/模型-providers](/en/concepts/model-providers)。
