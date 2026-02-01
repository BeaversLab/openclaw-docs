---
summary: "用于 web_search 的 Brave Search API 配置"
read_when:
  - 你想用 Brave Search 作为 web_search
  - 你需要 BRAVE_API_KEY 或套餐信息
---

# Brave Search API

OpenClaw 使用 Brave Search 作为 `web_search` 的默认 provider。

## 获取 API key

1) 在 https://brave.com/search/api/ 创建 Brave Search API 账号
2) 在控制台选择 **Data for Search** 套餐并生成 API key
3) 将 key 写入配置（推荐）或在 Gateway 环境中设置 `BRAVE_API_KEY`

## 配置示例

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave",
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5,
        timeoutSeconds: 30
      }
    }
  }
}
```

## 备注

- Data for AI 套餐**不兼容** `web_search`。
- Brave 提供免费层与付费套餐；当前限制请查看 Brave API 控制台。

参见 [Web tools](/zh/tools/web) 了解完整 web_search 配置。
