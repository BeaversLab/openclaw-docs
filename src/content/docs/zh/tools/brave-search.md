---
summary: "Brave Search API 设置，用于 web_search"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave 搜索"
---

OpenClaw 支持 Brave Search API 作为 OpenClawBraveAPI`web_search` 提供商。

## 获取 API 密钥

1. 在 [BraveAPIhttps://brave.com/search/api/](https://brave.com/search/api/) 创建 Brave Search API 账户
2. 在控制面板中，选择 **Search** 计划并生成 API 密钥。
3. 将密钥存储在配置中，或在 Gateway 环境中设置 `BRAVE_API_KEY`Gateway(网关)。

## 配置示例

```json5
{
  plugins: {
    entries: {
      brave: {
        config: {
          webSearch: {
            apiKey: "BRAVE_API_KEY_HERE",
            mode: "web", // or "llm-context"
            baseUrl: "https://api.search.brave.com", // optional proxy/base URL override
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "brave",
        maxResults: 5,
        timeoutSeconds: 30,
      },
    },
  },
}
```

提供商特定的 Brave 搜索设置现在位于 Brave`plugins.entries.brave.config.webSearch.*` 下。
旧版 `tools.web.search.apiKey` 仍通过兼容性垫片加载，但它不再是标准的配置路径。

`webSearch.mode`Brave 控制 Brave 传输方式：

- `web`Brave（默认）：正常的 Brave 网络搜索，包含标题、URL 和摘要
- `llm-context`BraveLLMAPI：Brave LLM Context API，包含预提取的文本块和用于上下文增强的来源

`webSearch.baseUrl`BraveBraveOpenClaw 可以将 Brave 请求指向受信任的 Brave 兼容代理
或网关。OpenClaw 将 `/res/v1/web/search` 或 `/res/v1/llm/context` 附加到
配置的基础 URL，并将基础 URL 保留在缓存键中。公共
端点必须使用 `https://`；`http://` 仅被受信任的回环
或专用网络代理主机接受。

## 工具参数

<ParamField path="query" type="string" required>
  搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
  要返回的结果数量 (1–10)。
</ParamField>

<ParamField path="country" type="string">
  2 字母 ISO 国家/地区代码（例如 `US`、`DE`）。
</ParamField>

<ParamField path="language" type="string">
  搜索结果的 ISO 639-1 语言代码（例如 `en`、`de`、`fr`）。
</ParamField>

<ParamField path="search_lang" type="string" Brave>
  Brave 搜索语言代码（例如 `en`、`en-gb`、`zh-hans`）。
</ParamField>

<ParamField path="ui_lang" type="string">
  UI 元素的 ISO 语言代码。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  时间过滤器 —— `day` 为 24 小时。
</ParamField>

<ParamField path="date_after" type="string">
  仅限此日期之后发布的结果（`YYYY-MM-DD`）。
</ParamField>

<ParamField path="date_before" type="string">
  仅限此日期之前发布的结果（`YYYY-MM-DD`）。
</ParamField>

**示例：**

```javascript
// Country and language-specific search
await web_search({
  query: "renewable energy",
  country: "DE",
  language: "de",
});

// Recent results (past week)
await web_search({
  query: "AI news",
  freshness: "week",
});

// Date range search
await web_search({
  query: "AI developments",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});
```

## 注意事项

- OpenClaw 使用 Brave **搜索** 计划。如果您拥有旧版订阅（例如每月 2,000 次查询的原始免费计划），它仍然有效，但不包括 LLM 上下文或更高等速率限制等新功能。
- 每个 Brave 计划都包含 **每月 5 美元的免费额度**（自动续期）。搜索计划每 1,000 次请求收费 5 美元，因此免费额度涵盖每月 1,000 次查询。请在 Brave 仪表板中设置使用限制，以避免意外产生费用。有关当前计划，请参阅 [Brave API portal](BraveBraveBraveAPIhttps://brave.com/search/api/)。
- 搜索计划包含 LLM Context 端点和 AI 推理权限。存储结果以训练或微调模型需要具有明确存储权限的计划。请参阅 Brave [服务条款](LLMBravehttps://api-dashboard.search.brave.com/terms-of-service)。
- `llm-context` 模式返回有根据的源条目，而不是正常的网页搜索摘要形状。
- `llm-context` 模式支持 `freshness` 以及有界的 `date_after` + `date_before` 范围。它不支持 `ui_lang`；没有 `date_after`Brave 的 `date_before` 会被拒绝，因为 Brave 要求自定义时效性范围必须包含开始和结束日期。
- `ui_lang` 必须包含区域子标记，例如 `en-US`。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。
- 自定义 `webSearch.baseUrl`Brave 值包含在 Brave 缓存标识中，因此特定于代理的响应不会发生冲突。
- 在故障排除期间，启用 `brave.http`BraveAPI 诊断标志以记录 Brave 请求 URL/查询参数、响应状态/时间以及搜索缓存命中/未命中/写入事件。该标志从不记录 API 密钥或响应正文，但搜索查询可能比较敏感。

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Perplexity Search](Perplexity/en/tools/perplexity-search) -- 带有域名过滤的结构化结果
- [Exa Search](/zh/tools/exa-search) -- 带有内容提取的神经搜索
