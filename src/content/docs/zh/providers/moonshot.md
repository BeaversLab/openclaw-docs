---
summary: "配置 Moonshot K2 与 Kimi Coding（独立的提供商 + 密钥）"
read_when:
  - You want Moonshot K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

# Moonshot AI (Kimi)

Moonshot 提供具有 OpenAI 兼容终端节点的 Kimi API。配置提供商并将默认模型设置为 `moonshot/kimi-k2.5`，或使用 `kimi/kimi-code` 进行 Kimi Coding。

当前的 Kimi K2 模型 ID：

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

注意：Moonshot 和 Kimi Coding 是独立的提供商。密钥不可互换，终端节点不同，且模型引用也不同（Moonshot 使用 `moonshot/...`，Kimi Coding 使用 `kimi/...`）。

Kimi 网页搜索也使用 Moonshot 插件：

```bash
openclaw configure --section web
```

在网页搜索部分选择 **Kimi** 以存储
`plugins.entries.moonshot.config.webSearch.*`。

## 配置代码片段（Moonshot API）

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

## Kimi 网页搜索

OpenClaw 也内置 **Kimi** 作为 `web_search` 提供商，由 Moonshot 网页
搜索提供支持。

交互式设置可能会提示输入：

- Moonshot API 区域：
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- 默认的 Kimi 网页搜索模型（默认为 `kimi-k2.5`）

配置位于 `plugins.entries.moonshot.config.webSearch` 下：

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

## 注

- Moonshot 模型引用使用 `moonshot/<modelId>`。Kimi Coding 模型引用使用 `kimi/<modelId>`。
- 当前的 Kimi Coding 默认模型引用是 `kimi/kimi-code`。旧版 `kimi/k2p5` 仍作为兼容模型 ID 被接受。
- Kimi 网页搜索使用 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，默认为 `https://api.moonshot.ai/v1` 且模型为 `kimi-k2.5`。
- 原生 Moonshot 终端节点（`https://api.moonshot.ai/v1` 和
  `https://api.moonshot.cn/v1`）在共享的 `openai-completions` 传输上宣告了流式使用兼容性。OpenClaw 现在根据终端节点
  能力进行相应匹配，因此针对相同原生 Moonshot 主机的兼容自定义提供商 ID
  会继承相同的流式使用行为。
- 如需，请在 `models.providers` 中覆盖定价和上下文元数据。
- 如果 Moonshot 为模型发布了不同的上下文限制，请相应地调整 `contextWindow`。
- 请使用 `https://api.moonshot.ai/v1` 连接国际端点，使用 `https://api.moonshot.cn/v1` 连接中国端点。
- 新手引导选项：
  - `moonshot-api-key` 用于 `https://api.moonshot.ai/v1`
  - `moonshot-api-key-cn` 用于 `https://api.moonshot.cn/v1`

## 原生思考模式 (Moonshot)

Moonshot Kimi 支持二元原生思考：

- `thinking: { type: "enabled" }`
- `thinking: { type: "disabled" }`

通过 `agents.defaults.models.<provider/model>.params` 为每个模型进行配置：

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

OpenClaw 还为 Moonshot 映射运行时 `/think` 级别：

- `/think off` -> `thinking.type=disabled`
- 任何非关闭的思考级别 -> `thinking.type=enabled`

当启用 Moonshot 思考时，`tool_choice` 必须为 `auto` 或 `none`。OpenClaw 会将不兼容的 `tool_choice` 值规范化为 `auto` 以确保兼容性。
