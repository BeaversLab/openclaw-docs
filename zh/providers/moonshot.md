---
title: "Moonshot AI"
summary: "配置 Moonshot K2 vs Kimi Code（独立 provider + key）"
read_when:
  - 想配置 Moonshot K2（Moonshot Open Platform）或 Kimi Code
  - 需要了解不同端点、key 与模型引用
  - 想直接复制任一 provider 的配置
---

# Moonshot AI（Kimi）

Moonshot 提供 OpenAI 兼容端点的 Kimi API。配置 provider 并将默认模型设置为 `moonshot/kimi-k2.5`，
或使用 `kimi-code/kimi-for-coding` 的 Kimi Code。

当前 Kimi K2 模型 ID：
{/_ moonshot-kimi-k2-ids:start _/}

- `kimi-k2.5`
- `kimi-k2-0905-preview`
- `kimi-k2-turbo-preview`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
  {/_ moonshot-kimi-k2-ids:end _/}

```bash
openclaw onboard --auth-choice moonshot-api-key
```

Kimi Code：

```bash
openclaw onboard --auth-choice kimi-code-api-key
```

注意：Moonshot 与 Kimi Code 是独立 provider。Key 不可互换，端点不同，模型引用也不同（Moonshot 使用 `moonshot/...`，Kimi Code 使用 `kimi-code/...`）。

## 配置片段（Moonshot API）

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

## Kimi Code

```json5
{
  env: { KIMICODE_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "kimi-code/kimi-for-coding" },
      models: {
        "kimi-code/kimi-for-coding": { alias: "Kimi Code" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      "kimi-code": {
        baseUrl: "https://api.kimi.com/coding/v1",
        apiKey: "${KIMICODE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-for-coding",
            name: "Kimi For Coding",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32768,
            headers: { "User-Agent": "KimiCLI/0.77" },
            compat: { supportsDeveloperRole: false },
          },
        ],
      },
    },
  },
}
```

## 说明

- Moonshot 模型引用使用 `moonshot/<modelId>`；Kimi Code 模型引用使用 `kimi-code/<modelId>`。
- 如有需要，可在 `models.providers` 中覆盖定价与上下文元数据。
- 若 Moonshot 对模型发布了不同的上下文上限，请相应调整 `contextWindow`。
- 若需要中国区端点，请使用 `https://api.moonshot.cn/v1`。
