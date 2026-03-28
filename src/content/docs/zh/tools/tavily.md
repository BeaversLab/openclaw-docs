---
summary: "Tavily 搜索和提取工具"
read_when:
  - You want Tavily-backed web search
  - You need a Tavily API key
  - You want Tavily as a web_search provider
  - You want content extraction from URLs
title: "Tavily"
---

# Tavily

OpenClaw 可以通过两种方式使用 **Tavily**：

- 作为 `web_search` 提供商
- 作为显式插件工具：`tavily_search` 和 `tavily_extract`

Tavily 是专为 AI 应用程序设计的搜索 API，返回针对 LLM 消费优化的结构化结果。它支持可配置的搜索深度、主题过滤、域过滤器、AI 生成的答案摘要以及从 URL 提取内容（包括 JavaScript 渲染的页面）。

## 获取 API 密钥

1. 在 [tavily.com](https://tavily.com/) 创建一个 Tavily 账户。
2. 在控制台中生成 API 密钥。
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

- 在新手引导或 `openclaw configure --section web` 中选择 Tavily 会自动
  启用捆绑的 Tavily 插件。
- 在 `plugins.entries.tavily.config.webSearch.*` 下存储 Tavily 配置。
- 配合 Tavily 的 `web_search` 支持 `query` 和 `count`（最多 20 个结果）。
- 对于 Tavily 特定的控制（如 `search_depth`、`topic`、`include_answer`
  或域过滤器），请使用 `tavily_search`。

## Tavily 插件工具

### `tavily_search`

当您想要 Tavily 特定的搜索控制而不是通用的
`web_search` 时，请使用此工具。

| 参数              | 描述                                                   |
| ----------------- | ------------------------------------------------------ |
| `query`           | 搜索查询字符串（请保持在 400 个字符以内）              |
| `search_depth`    | `basic`（默认，平衡）或 `advanced`（最高相关性，较慢） |
| `topic`           | `general`（默认）、`news`（实时更新）或 `finance`      |
| `max_results`     | 结果数量，1-20（默认：5）                              |
| `include_answer`  | 包含 AI 生成的答案摘要（默认：false）                  |
| `time_range`      | 按时间筛选：`day`、`week`、`month` 或 `year`           |
| `include_domains` | 用于限制结果范围的域名数组                             |
| `exclude_domains` | 要从结果中排除的域名数组                               |

**搜索深度：**

| 深度       | 速度 | 相关性 | 最适用于               |
| ---------- | ---- | ------ | ---------------------- |
| `basic`    | 较快 | 高     | 通用查询（默认）       |
| `advanced` | 较慢 | 最高   | 精确度、具体事实、研究 |

### `tavily_extract`

使用此工具从一个或多个 URL 中提取干净的内容。处理 JavaScript 渲染的页面，并支持针对特定提取的查询导向分块。

| 参数                | 描述                                                     |
| ------------------- | -------------------------------------------------------- |
| `urls`              | 要提取的 URL 数组（每个请求 1-20 个）                    |
| `query`             | 根据与此查询的相关性重新排序提取的分块                   |
| `extract_depth`     | `basic`（默认，快速）或 `advanced`（适用于 JS 重的页面） |
| `chunks_per_source` | 每个 URL 的分块数，1-5（需要 `query`）                   |
| `include_images`    | 在结果中包含图像 URL（默认：false）                      |

**提取深度：**

| 深度       | 何时使用                      |
| ---------- | ----------------------------- |
| `basic`    | 简单页面 - 先尝试此项         |
| `advanced` | JS 渲染的 SPA、动态内容、表格 |

提示：

- 每个请求最多 20 个 URL。将较大的列表分批处理为多次调用。
- 使用 `query` + `chunks_per_source` 仅获取相关内容，而不是完整页面。
- 先尝试 `basic`；如果内容缺失或不完整，则回退到 `advanced`。

## 选择正确的工具

| 需求                          | 工具             |
| ----------------------------- | ---------------- |
| 快速网络搜索，无特殊选项      | `web_search`     |
| 带有深度、主题、AI 答案的搜索 | `tavily_search`  |
| 从特定 URL 提取内容           | `tavily_extract` |

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商及自动检测
- [Firecrawl](/zh/tools/firecrawl) -- 带有内容提取的搜索 + 抓取
- [Exa Search](/zh/tools/exa-search) -- 带有内容提取的神经搜索
