---
summary: "web_search 的 Brave Search API 设置"
read_when:
  - You want to use Brave Search for web_search
  - You need a BRAVE_API_KEY or plan details
title: "Brave Search"
---

# Brave Search API

OpenClaw 支持 Brave Search API 作为 `web_search` 提供商。

## 获取 API 密钥

1. 在 [https://brave.com/search/api/](https://brave.com/search/api/) 创建 Brave 搜索 API 帐户
2. 在仪表板中，选择 **Search** 计划并生成 API 密钥。
3. 将密钥存储在配置中，或在 Gateway 网关 环境中设置 `BRAVE_API_KEY`。

## 配置示例

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave",
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5,
        timeoutSeconds: 30,
      },
    },
  },
}
```

## 工具参数

| 参数          | 描述                                                   |
| ------------- | ------------------------------------------------------ |
| `query`       | 搜索查询（必填）                                       |
| `count`       | 要返回的结果数量（1-10，默认：5）                      |
| `country`     | 两个字母的 ISO 国家代码（例如 "US"、"DE"）             |
| `language`    | 搜索结果的 ISO 639-1 语言代码（例如 "en"、"de"、"fr"） |
| `ui_lang`     | UI 元素的 ISO 语言代码                                 |
| `freshness`   | 时间筛选：`day` (24h)、`week`、`month` 或 `year`       |
| `date_after`  | 仅限在此日期之后发布的结果 (YYYY-MM-DD)                |
| `date_before` | 仅限在此日期之前发布的结果 (YYYY-MM-DD)                |

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

## 注意

- OpenClaw 使用 Brave **搜索**计划。如果您有旧版订阅（例如每月 2,000 次查询的原始免费计划），它仍然有效，但不包括 LLM 上下文或更高速率限制等新功能。
- 每个 Brave 计划均包含 **每月 5 美元的免费额度**（可续期）。Search 计划每 1,000 次请求收费 5 美元，因此该额度涵盖每月 1,000 次查询。请在 Brave 仪表板中设置您的使用限制，以避免意外费用。有关当前计划，请参阅 [Brave API 门户](https://brave.com/search/api/)。
- Search 计划包括 LLM Context 端点和 AI 推理权限。存储结果以训练或微调模型需要具有明确存储权限的计划。请参阅 Brave [服务条款](https://api-dashboard.search.brave.com/terms-of-service)。
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）。

有关完整的 web_search 配置，请参阅 [Web 工具](/en/tools/web)。

import zh from "/components/footer/zh.mdx";

<zh />
