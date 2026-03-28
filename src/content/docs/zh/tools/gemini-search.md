---
summary: "使用 Google Search 接入功能的 Gemini 网络搜索"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY
  - You want Google Search grounding
title: "Gemini 搜索"
---

# Gemini 搜索

OpenClaw 支持具有内置 [Google Search 接入](https://ai.google.dev/gemini-api/docs/grounding) 功能的 Gemini 模型，该功能返回由实时 Google 搜索结果支持并带有引用的 AI 综合答案。

## 获取 API 密钥

<Steps>
  <Step title="Create a key">
    前往 [Google AI Studio](https://aistudio.google.com/apikey) 并创建一个
    API 密钥。
  </Step>
  <Step title="Store the key">
    在 Gateway(网关) 环境中设置 `GEMINI_API_KEY`，或通过以下方式配置：

    ```exec
    openclaw configure --section web
    ```

  </Step>
</Steps>

## 配置

```json5
{
  plugins: {
    entries: {
      google: {
        config: {
          webSearch: {
            apiKey: "AIza...", // optional if GEMINI_API_KEY is set
            model: "gemini-2.5-flash", // default
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "gemini",
      },
    },
  },
}
```

**环境替代方案：** 在 Gateway(网关) 环境中设置 `GEMINI_API_KEY`。
对于网关安装，请将其放入 `~/.openclaw/.env` 中。

## 工作原理

与返回链接列表和片段的传统搜索提供商不同，Gemini 使用 Google Search 接入功能生成带有行内引用的 AI 综合答案。结果既包括综合答案，也包括源 URL。

- 来自 Gemini 接入的引用 URL 会自动从 Google 重定向 URL 解析为直接 URL。
- 在返回最终引用 URL 之前，重定向解析使用 SSRF 防护路径（HEAD + 重定向检查 + http/https 验证）。
- 重定向解析使用严格的 SSRF 默认值，因此阻止重定向到私有/内部目标。

## 支持的参数

Gemini 搜索支持标准 `query` 和 `count` 参数。
不支持特定于提供商的过滤器，例如 `country`、`language`、`freshness` 和
`domain_filter`。

## 模型选择

默认模型为 `gemini-2.5-flash`（快速且经济高效）。任何支持接入功能的 Gemini
模型都可以通过 `plugins.entries.google.config.webSearch.model` 使用。

## 相关

- [网络搜索概述](/zh/tools/web) -- 所有提供商和自动检测
- [Brave 搜索](/zh/tools/brave-search) -- 带有片段的结构化结果
- [Perplexity Search](/zh/tools/perplexity-search) -- 结构化结果 + 内容提取
