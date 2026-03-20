---
summary: "Brave Search API setup for web_search"
read_when:
  - 您想要使用 Brave Search 进行 web_search
  - 您需要一个 BRAVE_API_KEY 或计划详情
title: "Brave Search"
---

# Brave Search API

OpenClaw 支持 Brave Search API 作为 `web_search` 提供商。

## 获取 API 密钥

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 创建一个 Brave Search API 账户
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

特定于提供商的 Brave 搜索设置现在位于 `plugins.entries.brave.config.webSearch.*` 下。
传统的 `tools.web.search.apiKey` 仍然通过兼容性垫片加载，但它不再是规范的配置路径。

## 工具参数

| 参数     | 描述                                                         |
| ------------- | ------------------------------------------------------------------- |
| `query`       | 搜索查询（必填）                                             |
| `count`       | 要返回的结果数量（1-10，默认：5）                      |
| `country`     | 2字母 ISO 国家代码（例如，“US”、“DE”）                        |
| `language`    | 搜索结果的 ISO 639-1 语言代码（例如，“en”、“de”、“fr”） |
| `ui_lang`     | UI 元素的 ISO 语言代码                                   |
| `freshness`   | 时间过滤器：`day`（24小时）、`week`、`month` 或 `year`                |
| `date_after`  | 仅限此日期之后发布的结果（YYYY-MM-DD）                 |
| `date_before` | 仅限此日期之前发布的结果（YYYY-MM-DD）                |

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

- OpenClaw 使用 Brave **Search** 计划。如果您拥有旧版订阅（例如每月 2,000 次查询的原始 Free 计划），它仍然有效，但不包括 LLM 上下文或更高速率限制等新功能。
- 每个 Brave 计划包括 **每月 5 美元的免费信用额度**（可续期）。Search 计划每 1,000 次请求费用为 5 美元，因此信用额度覆盖每月 1,000 次查询。请在 Brave 仪表板中设置您的使用限制以避免意外收费。有关当前计划，请参阅 [Brave API portal](https://brave.com/search/api/)。
- Search 计划包含 LLM 上下文端点和 AI 推理权限。存储结果以训练或微调模型需要具有明确存储权限的计划。请参阅 Brave [服务条款](https://api-dashboard.search.brave.com/terms-of-service)。
- 默认情况下，结果会缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。

有关完整的 web_search 配置，请参阅 [Web 工具](/zh/tools/web)。

import en from "/components/footer/en.mdx";

<en />
