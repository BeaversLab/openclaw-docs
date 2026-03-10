---
summary: "Brave Search API web_search 配置"
read_when:
  - "You want to use Brave Search for web_search"
  - "You need a BRAVE_API_KEY or plan details"
title: "Brave 搜索"
---

# Brave Search API

OpenClaw 使用 Brave Search 作为 `web_search` 的默认提供商。

## Get an API key

1. 在 https://brave.com/search/api/ 创建 Brave Search API 账户
2. 在仪表板中，选择 **Data for Search** 计划并生成 API 密钥。
3. 将密钥存储在配置中（推荐）或在 Gateway 环境中设置 `BRAVE_API_KEY`。

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

## 注意事项

- Data for AI 计划与 `web_search` **不**兼容。
- Brave 提供免费套餐和付费计划；查看 Brave API 门户了解当前限制。

完整的 web_search 配置请参阅 [Web tools](/zh/tools/web)。
