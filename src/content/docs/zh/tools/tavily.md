---
summary: "Tavily 搜索和提取工具"
read_when:
  - You want Tavily-backed web search
  - You need a Tavily API key
  - You want Tavily as a web_search provider
  - You want content extraction from URLs
title: "Tavily"
---

OpenClaw 可以通过两种方式使用 **Tavily**：

- 作为 `web_search` 提供商
- 作为显式插件工具：`tavily_search` 和 `tavily_extract`

Tavily 是专为 AI 应用设计的搜索 API，返回经优化供 LLM 消费的结构化结果。它支持可配置的搜索深度、主题
过滤、域名过滤、AI 生成的答案摘要以及从 URL（包括 JavaScript 渲染的页面）中提取内容。

## 获取 API 密钥

1. 在 [tavily.com](https://tavily.com/) 创建一个 Tavily 账户。
2. 在仪表板中生成 API 密钥。
3. 将其存储在配置中或在网关环境中设置 `TAVILY_API_KEY`。

## 配置 Tavily 搜索

```json5
{
  plugins: {
    entries: {
      tavily: {
        enabled: true,
        config: {
          webSearch: {
            apiKey: "tvly-...", // optional if TAVILY_API_KEY is set
            baseUrl: "https://api.tavily.com",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "tavily",
      },
    },
  },
}
```

注意：

- 在 `openclaw configure --section web` 中选择 Tavily 会自动
  启用捆绑的 Tavily 插件。
- 将 Tavily 配置存储在 `plugins.entries.tavily.config.webSearch.*` 下。
- 与 Tavily 配合使用的 `web_search` 支持 `query` 和 `count`（最多 20 个结果）。
- 对于 Tavily 特有的控制，如 `search_depth`、`topic`、`include_answer`
  或域名过滤，请使用 `tavily_search`。

## Tavily 插件工具

### `tavily_search`

当您想要 Tavily 特有的搜索控制而不是通用的
`web_search` 时，请使用此工具。

| 参数              | 描述                                                   |
| ----------------- | ------------------------------------------------------ |
| `query`           | 搜索查询字符串（请保持在 400 个字符以内）              |
| `search_depth`    | `basic`（默认，平衡）或 `advanced`（相关性最高，较慢） |
| `topic`           | `general`（默认）、`news`（实时更新）或 `finance`      |
| `max_results`     | 结果数量，1-20（默认：5）                              |
| `include_answer`  | 包含 AI 生成的答案摘要（默认：false）                  |
| `time_range`      | 按时间过滤：`day`、`week`、`month` 或 `year`           |
| `include_domains` | 限制结果的域名数组                                     |
| `exclude_domains` | 从结果中排除的域名数组                                 |

**搜索深度：**

| 深度       | 速度 | 相关性 | 最适用于             |
| ---------- | ---- | ------ | -------------------- |
| `basic`    | 更快 | 高     | 通用查询（默认）     |
| `advanced` | 较慢 | 最高   | 精度、特定事实、研究 |

### `tavily_extract`

使用此工具从一个或多个 URL 提取干净的内容。处理
JavaScript 渲染的页面，并支持针对目标提取的
查询导向分块。

| 参数                | 描述                                                   |
| ------------------- | ------------------------------------------------------ |
| `urls`              | 要提取的 URL 数组（每个请求 1-20 个）                  |
| `query`             | 根据与此查询的相关性重新排序提取的分块                 |
| `extract_depth`     | `basic`（默认，快速）或 `advanced`（针对重度 JS 页面） |
| `chunks_per_source` | 每个 URL 的分块数，1-5（需要 `query`）                 |
| `include_images`    | 在结果中包含图片 URL（默认：false）                    |

**提取深度：**

| 深度       | 何时使用                      |
| ---------- | ----------------------------- |
| `basic`    | 简单页面 - 先尝试此项         |
| `advanced` | JS 渲染的 SPA、动态内容、表格 |

提示：

- 每个请求最多 20 个 URL。将较大的列表分批处理为多次调用。
- 使用 `query` + `chunks_per_source` 以仅获取相关内容而非完整页面。
- 先尝试 `basic`；如果内容缺失或不完整，则回退到 `advanced`。

## 选择正确的工具

| 需求                        | 工具             |
| --------------------------- | ---------------- |
| 快速网络搜索，无特殊选项    | `web_search`     |
| 有深度的搜索、主题、AI 回答 | `tavily_search`  |
| 从特定 URL 提取内容         | `tavily_extract` |

## 相关

- [Web Search overview](/zh/tools/web) -- 所有提供商和自动检测
- [Firecrawl](/zh/tools/firecrawl) -- 搜索 + 抓取及内容提取
- [Exa Search](/zh/tools/exa-search) -- 神经搜索及内容提取
