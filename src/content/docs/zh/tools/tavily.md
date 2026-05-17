---
summary: "Tavily 搜索和提取工具"
read_when:
  - You want Tavily-backed web search
  - You need a Tavily API key
  - You want Tavily as a web_search provider
  - You want content extraction from URLs
title: "Tavily"
---

[Tavily](https://tavily.com) 是专为 AI 应用程序设计的搜索 APIOpenClaw。OpenClaw 通过两种方式提供它：

- 作为通用搜索工具的 `web_search` 提供商
- 作为显式插件工具：`tavily_search` 和 `tavily_extract`

Tavily 返回针对 LLM 消费优化的结构化结果，具有可配置的搜索深度、主题过滤、域名过滤、AI 生成的答案摘要以及从 URL 提取内容（包括 JavaScript 渲染的页面）。

| 属性     | 值                                |
| -------- | --------------------------------- |
| 插件 ID  | `tavily`                          |
| 身份验证 | `TAVILY_API_KEY` 或配置 `apiKey`  |
| 基础 URL | `https://api.tavily.com`（默认）  |
| 捆绑工具 | `tavily_search`、`tavily_extract` |

## 入门指南

<Steps>
  <Step title="获取 APIAPI 密钥">
    在 [tavily.com](https://tavily.com) 创建一个 Tavily 账户，然后在控制台中生成一个 APIAPI 密钥。
  </Step>
  <Step title="配置插件和提供商">
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
  </Step>
  <Step title="验证搜索运行">
    从任何代理触发 `web_search`，或直接调用 `tavily_search`。
  </Step>
</Steps>

<Tip>在新手引导或 `openclaw configure --section web` 中选择 Tavily 会自动启用内置的 Tavily 插件。</Tip>

## 工具参考

### `tavily_search`

当您想要 Tavily 特定的搜索控件而不是通用的 `web_search` 时，请使用此选项。

| 参数              | 类型       | 约束 / 默认                         | 描述                                    |
| ----------------- | ---------- | ----------------------------------- | --------------------------------------- |
| `query`           | string     | 必需                                | 搜索查询字符串。请保持在400个字符以内。 |
| `search_depth`    | 枚举       | `basic`（默认），`advanced`         | `advanced` 较慢但相关性更高。           |
| `topic`           | 枚举       | `general` (默认), `news`, `finance` | 按主题系列筛选。                        |
| `max_results`     | 整数       | 1-20                                | 结果数量。                              |
| `include_answer`  | 布尔值     | 默认 `false`                        | 包含 Tavily AI 生成的答案摘要。         |
| `time_range`      | enum       | `day`, `week`, `month`, `year`      | 按时间筛选结果。                        |
| `include_domains` | 字符串数组 | （无）                              | 仅包含来自这些域的结果。                |
| `exclude_domains` | 字符串数组 | （无）                              | 排除来自这些域的结果。                  |

搜索深度权衡：

| 深度       | 速度 | 相关性 | 最适合               |
| ---------- | ---- | ------ | -------------------- |
| `basic`    | 更快 | 高     | 通用查询（默认）。   |
| `advanced` | 较慢 | 最高   | 精准研究和事实核查。 |

### `tavily_extract`

使用此功能从一个或多个 URL 中提取干净的内容。处理 JavaScript 渲染的页面，并支持基于查询的分块，以便进行有针对性的提取。

| 参数                | 类型       | 约束 / 默认                 | 描述                                                                     |
| ------------------- | ---------- | --------------------------- | ------------------------------------------------------------------------ |
| `urls`              | 字符串数组 | 必需，1-20                  | 要从中提取内容的 URL。                                                   |
| `query`             | 字符串     | （可选）                    | 根据与此查询的相关性对提取的块进行重新排序。                             |
| `extract_depth`     | 枚举       | `basic`（默认），`advanced` | 对重度依赖 JavaScript 的页面、单页应用（SPA）或动态表格使用 `advanced`。 |
| `chunks_per_source` | 整数       | 1-5；**需要 `query`**       | 每个 URL 返回的块。如果未设置 `query` 则会报错。                         |
| `include_images`    | 布尔值     | 默认 `false`                | 在结果中包含图片 URL。                                                   |

提取深度权衡：

| 深度       | 何时使用                                   |
| ---------- | ------------------------------------------ |
| `basic`    | 简单页面。请先尝试此选项。                 |
| `advanced` | JS 渲染的单页应用（SPA）、动态内容、表格。 |

<Tip>将较大的 URL 列表分批处理为多个 `tavily_extract` 调用（每个请求最多 20 个）。使用 `query` 加上 `chunks_per_source` 以仅获取相关内容，而非完整页面。</Tip>

## 选择合适的工具

| 需要                           | 工具             |
| ------------------------------ | ---------------- |
| 快速网络搜索，无特殊选项       | `web_search`     |
| 具有深度、主题和 AI 回答的搜索 | `tavily_search`  |
| 从特定 URL 提取内容            | `tavily_extract` |

<Note>以 Tavily 为提供商的通用 `web_search` 工具支持 `query` 和 `count`（最多 20 个结果）。如需 Tavily 特定的控制（`search_depth`、`topic`、`include_answer`、域名过滤器、时间范围），请改用 `tavily_search`。</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="APIAPI 密钥解析顺序"API>
    Tavily 客户端按以下顺序查找其 API 密钥：

    1. `plugins.entries.tavily.config.webSearch.apiKey`（通过 SecretRefs 解析）。
    2. 来自网关环境的 `TAVILY_API_KEY`。

    如果两者都不存在，`tavily_extract` 会引发设置错误。

  </Accordion>

<Accordion title="自定义基础 URL">如果您通过代理访问 Tavily，请覆盖 `plugins.entries.tavily.config.webSearch.baseUrl`。默认值为 `https://api.tavily.com`。</Accordion>

  <Accordion title="`chunks_per_source` 需要 `query`">
    如果没有 `query`，`tavily_extract` 将拒绝传递 `chunks_per_source` 的调用。Tavily 会根据查询相关性对分块进行排序，因此在没有该参数的情况下，此参数毫无意义。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="Web Search 概述" href="/zh/tools/web" icon="magnifying-glass">
    所有提供商和自动检测规则。
  </Card>
  <Card title="FirecrawlFirecrawl" href="/zh/tools/firecrawl" icon="fire">
    搜索与抓取，支持内容提取。
  </Card>
  <Card title="Exa Search" href="/zh/tools/exa-search" icon="binoculars">
    具有内容提取功能的神经搜索。
  </Card>
  <Card title="Configuration" href="/zh/gateway/configuration" icon="gear">
    插件条目和工具路由的完整配置架构。
  </Card>
</CardGroup>
