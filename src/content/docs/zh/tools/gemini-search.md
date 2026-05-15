---
summary: "使用 Google Search 接入功能的 Gemini 网络搜索"
read_when:
  - You want to use Gemini for web_search
  - You need a GEMINI_API_KEY or models.providers.google.apiKey
  - You want Google Search grounding
title: "Gemini 搜索"
---

OpenClaw 支持具有内置
[Google Search grounding](https://ai.google.dev/gemini-api/docs/grounding) 的 Gemini 模型，
该功能会返回由 Google 实时搜索结果支持并包含引用的 AI 综合答案。

## 获取 API 密钥

<Steps>
  <Step title="Create a key">
    前往 [Google AI Studio](https://aistudio.google.com/apikey) 并创建一个
    API 密钥。
  </Step>
  <Step title="Store the key">
    在 Gateway(网关) 环境中设置 `GEMINI_API_KEY`，重用
    `models.providers.google.apiKey`，或通过以下方式配置专用的 web-search 密钥：

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
            apiKey: "AIza...", // optional if GEMINI_API_KEY or models.providers.google.apiKey is set
            baseUrl: "https://generativelanguage.googleapis.com/v1beta", // optional; falls back to models.providers.google.baseUrl
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

**凭证优先级：** Gemini 网络搜索首先使用
`plugins.entries.google.config.webSearch.apiKey`，然后是 `GEMINI_API_KEY`，
接着是 `models.providers.google.apiKey`。对于基础 URL，专用的
`plugins.entries.google.config.webSearch.baseUrl` 优先于
`models.providers.google.baseUrl`。

对于网关安装，请将环境密钥放入 `~/.openclaw/.env` 中。

## 工作原理

与传统返回链接和片段列表的搜索提供商不同，Gemini 使用 Google Search grounding 生成带有内联引用的 AI 综合答案。结果既包括综合答案，也包括源 URL。

- 来自 Gemini grounding 的引用 URL 会自动从 Google
  重定向 URL 解析为直接 URL。
- 重定向解析使用 SSRF 防护路径（HEAD + 重定向检查 +
  http/https 验证），然后返回最终的引用 URL。
- 重定向解析使用严格的 SSRF 默认设置，因此
  指向私有/内部目标的重定向会被阻止。

## 支持的参数

Gemini 搜索支持 `query`、`freshness`、`date_after` 和 `date_before`。

为了共享 `web_search` 的兼容性，接受 `count`，但 Gemini 搜索依据
仍然返回一个带引用的合成答案，而不是 N 个结果的
列表。

`freshness` 接受 `day`、`week`、`month`、`year` 以及共享快捷键
`pd`、`pw`、`pm` 和 `py`。OpenClaw 会将这些值，或显式的
`date_after`/`date_before` 范围，转换为 Gemini Google Search 接地支持的
`timeRangeFilter`。不支持 `country`、`language` 和 `domain_filter`。

## 模型选择

默认模型是 `gemini-2.5-flash`（快速且具有成本效益）。任何支持归因的 Gemini 模型都可以通过 `plugins.entries.google.config.webSearch.model` 使用。

## 基础 URL 覆盖

当 Gemini 网络搜索必须通过操作员代理或自定义兼容 Gemini 的端点路由时，设置 `plugins.entries.google.config.webSearch.baseUrl`。如果未设置，Gemini 网络搜索将重用 `models.providers.google.baseUrl`。纯 `https://generativelanguage.googleapis.com` 值将被标准化为 `https://generativelanguage.googleapis.com/v1beta`；自定义代理路径在去除尾部斜杠后将按原样保留。

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Brave Search](/zh/tools/brave-search) -- 带有摘要的结构化结果
- [Perplexity Search](/zh/tools/perplexity-search) -- 结构化结果 + 内容提取
