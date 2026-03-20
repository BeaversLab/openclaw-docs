---
summary: "設定 Moonshot K2 與 Kimi Coding（分別的供應商 + 金鑰）"
read_when:
  - 您想要設定 Moonshot K2 (Moonshot Open Platform) 與 Kimi Coding
  - 您需要了解不同的端點、金鑰與模型參考
  - 您想要複製貼上任一供應商的設定
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot 提供與 OpenAI 相容的 Kimi API 端點。設定
供應商並將預設模型設為 `moonshot/kimi-k2.5`，或使用
搭配 `kimi-coding/k2p5` 的 Kimi Coding。

目前的 Kimi K2 模型 ID：

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

注意：Moonshot 與 Kimi Coding 是分開的供應商。金鑰互不相通，端點不同，且模型參考也不同（Moonshot 使用 `moonshot/...`，Kimi Coding 使用 `kimi-coding/...`）。

## 設定片段 (Moonshot API)

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

## 備註

- Moonshot 模型參考使用 `moonshot/<modelId>`。Kimi Coding 模型參考使用 `kimi-coding/<modelId>`。
- 如需要，可在 `models.providers` 中覆寫價格與上下文中繼資料。
- 如果 Moonshot 對模型發布不同的上下文限制，請相應調整
  `contextWindow`。
- 國際端點請使用 `https://api.moonshot.ai/v1`，中國端點請使用 `https://api.moonshot.cn/v1`。

## 原生思考模式 (Moonshot)

Moonshot Kimi 支援二元原生思考：

- `thinking: { type: "enabled" }`
- `thinking: { type: "disabled" }`

透過 `agents.defaults.models.<provider/model>.params` 針對每個模型進行設定：

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

OpenClaw 也會為 Moonshot 對應執行時期的 `/think` 層級：

- `/think off` -> `thinking.type=disabled`
- 任何非關閉的思考層級 -> `thinking.type=enabled`

啟用 Moonshot 思考時，`tool_choice` 必須為 `auto` 或 `none`。OpenClaw 會將不相容的 `tool_choice` 值正規化為 `auto` 以保持相容性。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
