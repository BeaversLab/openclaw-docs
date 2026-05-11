---
summary: "使用 Google Search 接入功能的 Gemini 网络搜索"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY
  - You want Google Search grounding
title: "Gemini 搜索"
---

OpenClaw 支持具有内置 [Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) 的 Gemini 模型，该功能返回由实时 Google 搜索结果支持并包含引用的 AI 综合答案。

## 获取 API 密钥

<Steps>
  <Step title="Create a key">
    前往 [Google AI Studio](https://aistudio.google.com/apikey) 并创建一个
    API 密钥。
  </Step>
  <Step title="Store the key">
    在 Gateway(网关) 环境中设置 `GEMINI_API_KEY`，或通过以下方式配置：

    ```bash
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

**环境变量替代方案：** 在 Gateway(网关) 环境中设置 `GEMINI_API_KEY`。
如果是网关安装，请将其放入 `~/.openclaw/.env` 中。

## 工作原理

与传统搜索提供商返回链接列表和片段不同，Gemini 使用 Google Search grounding 生成带有行内引用的 AI 综合答案。结果既包含综合答案，也包含源 URL。

- 来自 Gemini grounding 的引用 URL 会自动从 Google 重定向 URL 解析为直接 URL。
- 重定向解析在返回最终引用 URL 之前，会使用 SSRF 防护路径（HEAD + 重定向检查 + http/https 验证）。
- 重定向解析使用严格的 SSRF 默认设置，因此会阻止指向私有/内部目标的重定向。

## 支持的参数

Gemini 搜索支持 `query`。

为了兼容共享的 `web_search`，接受 `count`，但 Gemini grounding 仍然返回一个带有引用的综合答案，而不是 N 个结果的列表。

不支持特定于提供商的过滤器，如 `country`、`language`、`freshness` 和 `domain_filter`。

## 模型选择

默认模型为 `gemini-2.5-flash`（快速且具有成本效益）。任何支持 grounding 的 Gemini 模型都可以通过 `plugins.entries.google.config.webSearch.model` 使用。

## 相关内容

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Brave Search](/zh/tools/brave-search) -- 带有摘要的结构化结果
- [Perplexity Search](/zh/tools/perplexity-search) -- 结构化结果 + 内容提取
