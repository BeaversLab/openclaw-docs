---
summary: "Brave Search API 设置，用于 web_search"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave Search"
---

# Brave Search API

OpenClaw 支持 Brave Search API 作为 `web_search` 提供商。

## 获取 API 密钥

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 创建 Brave Search API 账户
2. 在仪表板中，选择 **Search** 计划并生成一个 API 密钥。
3. 将密钥存储在配置中，或在 Gateway(网关) 环境中设置 `BRAVE_API_KEY`。

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

提供商特定的 Brave 搜索设置现在位于 `plugins.entries.brave.config.webSearch.*` 下。
传统的 `tools.web.search.apiKey` 仍然通过兼容性垫片加载，但它不再是标准的配置路径。

`webSearch.mode` 控制 Brave 传输方式：

- `web`（默认）：正常的 Brave 网页搜索，包含标题、URL 和摘要
- `llm-context`：Brave LLM Context API，包含预提取的文本块和用于增强生成的来源

## 工具参数

| 参数          | 描述                                                    |
| ------------- | ------------------------------------------------------- |
| `query`       | 搜索查询（必填）                                        |
| `count`       | 要返回的结果数量（1-10，默认值：5）                     |
| `country`     | 两位字母的 ISO 国家代码（例如，“US”、“DE”）             |
| `language`    | 搜索结果的 ISO 639-1 语言代码（例如，“en”、“de”、“fr”） |
| `search_lang` | Brave 搜索语言代码（例如 `en`、`en-gb`、`zh-hans`）     |
| `ui_lang`     | UI 元素的 ISO 语言代码                                  |
| `freshness`   | 时间过滤器：`day`（24小时）、`week`、`month` 或 `year`  |
| `date_after`  | 仅限此日期之后发布的结果（YYYY-MM-DD）                  |
| `date_before` | 仅限此日期之前发布的结果（YYYY-MM-DD）                  |

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

- OpenClaw 使用 Brave **Search** 计划。如果您拥有旧版订阅（例如每月 2,000 次查询的原始 Free 计划），它仍然有效，但不包括 LLM Context 或更高的速率限制等新功能。
- 每个 Brave 计划都包含 **每月 5 美元的免费额度**（自动续期）。Search 计划每 1,000 次请求收费 5 美元，因此该额度涵盖每月 1,000 次查询。请在 Brave 仪表板中设置您的使用限制，以避免意外收费。有关当前计划，请参阅 [Brave API portal](https://brave.com/search/api/)。
- Search 计划包括 LLM Context 端点和 AI 推理权限。存储结果以训练或微调模型需要具有明确存储权限的计划。请参阅 Brave [Terms of Service](https://api-dashboard.search.brave.com/terms-of-service)。
- `llm-context` 模式返回增强生成的来源条目，而不是正常的网页搜索摘要形状。
- `llm-context` 模式不支持 `ui_lang`、`freshness`、`date_after` 或 `date_before`。
- `ui_lang` 必须包含一个区域子标签，例如 `en-US`。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Perplexity Search](/zh/tools/perplexity-search) -- 带有域名过滤的结构化结果
- [Exa Search](/zh/tools/exa-search) -- 带有内容提取的神经搜索
