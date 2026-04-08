---
summary: "設定 Moonshot K2 與 Kimi Coding（分別的供應商 + 金鑰）"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot 提供與 OpenAI 相容端點的 Kimi API。設定
供應商並將預設模型設為 `moonshot/kimi-k2.5`，或搭配 `kimi/kimi-code` 使用
Kimi Coding。

目前的 Kimi K2 模型 ID：

[//]: # "moonshot-kimi-k2-ids:start"

- `kimi-k2.5`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
- `kimi-k2-turbo`

[//]: # "moonshot-kimi-k2-ids:end"

```bash
openclaw onboard --auth-choice moonshot-api-key
# or
openclaw onboard --auth-choice moonshot-api-key-cn
```

Kimi Coding：

```bash
openclaw onboard --auth-choice kimi-code-api-key
```

註：Moonshot 和 Kimi Coding 是分開的供應商。金鑰無法互通，端點不同，且模型參考也不同（Moonshot 使用 `moonshot/...`，Kimi Coding 使用 `kimi/...`）。

Kimi 網路搜尋也使用 Moonshot 外掛：

```bash
openclaw configure --section web
```

在網路搜尋區段選擇 **Kimi** 以儲存
`plugins.entries.moonshot.config.webSearch.*`。

## 設定程式碼片段 (Moonshot API)

```json5
{
  env: { MOONSHOT_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "moonshot/kimi-k2.5" },
      models: {
        // moonshot-kimi-k2-aliases:start
        "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
        "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
        "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
        "moonshot/kimi-k2-turbo": { alias: "Kimi K2 Turbo" },
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
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-thinking",
            name: "Kimi K2 Thinking",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-thinking-turbo",
            name: "Kimi K2 Thinking Turbo",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 262144,
          },
          {
            id: "kimi-k2-turbo",
            name: "Kimi K2 Turbo",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 16384,
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
      model: { primary: "kimi/kimi-code" },
      models: {
        "kimi/kimi-code": { alias: "Kimi" },
      },
    },
  },
}
```

## Kimi 網路搜尋

OpenClaw 也內建 **Kimi** 作為 `web_search` 供應商，由 Moonshot 網路
搜尋提供支援。

互動式設定可以提示輸入：

- Moonshot API 區域：
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- 預設 Kimi 網路搜尋模型（預設為 `kimi-k2.5`）

設定位於 `plugins.entries.moonshot.config.webSearch` 之下：

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // or use KIMI_API_KEY / MOONSHOT_API_KEY
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.5",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

## 註

- Moonshot 模型參考使用 `moonshot/<modelId>`。Kimi Coding 模型參考使用 `kimi/<modelId>`。
- 目前 Kimi Coding 預設模型參考為 `kimi/kimi-code`。舊版 `kimi/k2p5` 作為相容性模型 ID 仍可接受。
- Kimi 網路搜尋使用 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，並預設為 `https://api.moonshot.ai/v1` 搭配模型 `kimi-k2.5`。
- 原生 Moonshot 端點（`https://api.moonshot.ai/v1` 和
  `https://api.moonshot.cn/v1`）在共用的 `openai-completions` 傳輸上宣稱支援串流使用量相容性。OpenClaw 現在依據端點
  能力來判斷，因此針對相同原生 Moonshot 主機的相容自訂供應商 ID 會繼承相同的串流使用量行為。
- 如有需要，請在 `models.providers` 中覆蓋定價和上下文中繼資料。
- 如果 Moonshot 發布了針對某個模型的不同上下文限制，請相應地調整 `contextWindow`。
- 使用 `https://api.moonshot.ai/v1` 作為國際端點，使用 `https://api.moonshot.cn/v1` 作為中國端點。
- 入門選擇：
  - `moonshot-api-key` 用於 `https://api.moonshot.ai/v1`
  - `moonshot-api-key-cn` 用於 `https://api.moonshot.cn/v1`

## 原生思考模式 (Moonshot)

Moonshot Kimi 支援二元原生思考：

- `thinking: { type: "enabled" }`
- `thinking: { type: "disabled" }`

透過 `agents.defaults.models.<provider/model>.params` 針對每個模型進行配置：

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

OpenClaw 也會映射 Moonshot 的執行時 `/think` 層級：

- `/think off` -> `thinking.type=disabled`
- 任何非關閉的思考層級 -> `thinking.type=enabled`

啟用 Moonshot 思考時，`tool_choice` 必須是 `auto` 或 `none`。為了相容性，OpenClaw 會將不相容的 `tool_choice` 值正規化為 `auto`。
