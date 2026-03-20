---
summary: "配置 Moonshot K2 与 Kimi Coding（单独的提供商 + 密钥）"
read_when:
  - 您需要 Moonshot K2 (Moonshot 开放平台) 与 Kimi Coding 的设置
  - 您需要了解不同的端点、密钥和模型引用
  - 您想要复制/粘贴任一提供商的配置
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot 提供带有 OpenAI 兼容端点的 Kimi API。配置提供商并将默认模型设置为 `moonshot/kimi-k2.5`，或者使用带有 `kimi-coding/k2p5` 的 Kimi Coding。

当前的 Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-ids:start"

- `kimi-k2.5`
- `kimi-k2-0905-preview`
- `kimi-k2-turbo-preview`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`

[//]: # "moonshot-kimi-k2-ids:end"

```bash
openclaw onboard --auth-choice moonshot-api-key
```

Kimi Coding：

```bash
openclaw onboard --auth-choice kimi-code-api-key
```

注意：Moonshot 和 Kimi Coding 是不同的提供商。密钥不互通，端点不同，模型引用也不同（Moonshot 使用 `moonshot/...`，Kimi Coding 使用 `kimi-coding/...`）。

## 配置片段 (Moonshot API)

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: {
        // moonshot-kimi-k2-aliases:start
        "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
        "moonshot/kimi-k2-0905-preview": { alias: "Kimi K2" },
        "moonshot/kimi-k2-turbo-preview": { alias: "Kimi K2 Turbo" },
        "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
        "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
        // moonshot-kimi-k2-aliases:end
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      moonshot: {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: "${MOONSHOT_API_KEY}",
        api: "openai-completions",
        models: [
          // moonshot-kimi-k2-models:start
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-0905-preview",
            name: "Kimi K2 0905 Preview",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-turbo-preview",
            name: "Kimi K2 Turbo",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-thinking",
            name: "Kimi K2 Thinking",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: "kimi-k2-thinking-turbo",
            name: "Kimi K2 Thinking Turbo",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          // moonshot-kimi-k2-models:end
        ],
      },
    },
  },
}
```

## Kimi Coding

```json5
{
  env: { KIMI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-coding/k2p5" },
      models: {
        "kimi-coding/k2p5": { alias: "Kimi K2.5" },
      },
    },
  },
}
```

## 注意

- Moonshot 模型引用使用 `moonshot/<modelId>`。Kimi Coding 模型引用使用 `kimi-coding/<modelId>`。
- 如需要，请在 `models.providers` 中覆盖定价和上下文元数据。
- 如果 Moonshot 为某个模型发布了不同的上下文限制，请相应地调整 `contextWindow`。
- 使用 `https://api.moonshot.ai/v1` 作为国际端点，使用 `https://api.moonshot.cn/v1` 作为中国端点。

## 原生思考模式

Moonshot Kimi 支持二元原生思考：

- `thinking: { type: "enabled" }`
- `thinking: { type: "disabled" }`

通过 `agents.defaults.models.<provider/model>.params` 为每个模型配置它：

```json5
{
  agents: {
    defaults: {
      models: {
        "moonshot/kimi-k2.5": {
          params: {
            thinking: { type: "disabled" },
          },
        },
      },
    },
  },
}
```

OpenClaw 还映射了 Moonshot 的运行时 `/think` 级别：

- `/think off` -> `thinking.type=disabled`
- 任何非关闭的思考级别 -> `thinking.type=enabled`

当启用 Moonshot 思考时，`tool_choice` 必须是 `auto` 或 `none`。OpenClaw 会将不兼容的 `tool_choice` 值规范化为 `auto` 以确保兼容性。

import zh from "/components/footer/zh.mdx";

<zh />
