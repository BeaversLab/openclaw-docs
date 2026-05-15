---
summary: "Exa AI 搜索 -- 具有内容提取功能的神经搜索和关键词搜索"
read_when:
  - You want to use Exa for web_search
  - You need an EXA_API_KEY
  - You want neural search or content extraction
title: "Exa 搜索"
---

OpenClaw 支持 [Exa AI](OpenClawhttps://exa.ai/) 作为 `web_search` 提供商。Exa 提供神经、关键词和混合搜索模式，并内置内容提取（高亮、文本、摘要）。

## 获取 API 密钥

<Steps>
  <Step title="创建帐户">
    在 [exa.ai](https://exa.ai/) 注册并从您的仪表板生成 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway(网关) 环境中设置 `EXA_API_KEY`，或通过以下方式配置：

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
      exa: {
        config: {
          webSearch: {
            apiKey: "exa-...", // optional if EXA_API_KEY is set
            baseUrl: "https://api.exa.ai", // optional; OpenClaw appends /search
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "exa",
      },
    },
  },
}
```

**环境变量替代方案：** 在 Gateway(网关) 环境中设置 `EXA_API_KEY`。
对于网关安装，请将其放入 `~/.openclaw/.env` 中。

## Base URL override

当 Exa 搜索请求需要通过兼容的代理或备用 Exa 端点时，请设置 `plugins.entries.exa.config.webSearch.baseUrl`。OpenClaw 会在主机名前添加 `https://` 并在路径后附加 `/search` 来规范化裸主机，除非路径已以此结尾。解析后的端点包含在搜索缓存键中，因此来自不同 Exa 端点的结果不会共享。

## Tool parameters

<ParamField path="query" type="string" required>
  搜索查询。
</ParamField>

<ParamField path="count" type="number">
  要返回的结果数量（1–100）。
</ParamField>

<ParamField path="type" type="'auto' | 'neural' | 'fast' | 'deep' | 'deep-reasoning' | 'instant'">
  搜索模式。
</ParamField>

<ParamField path="freshness" type="'day' | 'week' | 'month' | 'year'">
  时间过滤器。
</ParamField>

<ParamField path="date_after" type="string">
  此日期之后的结果 (`YYYY-MM-DD`)。
</ParamField>

<ParamField path="date_before" type="string">
  此日期之前的结果 (`YYYY-MM-DD`)。
</ParamField>

<ParamField path="contents" type="object">
  内容提取选项（见下文）。
</ParamField>

### Content extraction

Exa 可以在返回搜索结果的同时返回提取的内容。传递一个 `contents` 对象以启用：

```javascript
await web_search({
  query: "transformer architecture explained",
  type: "neural",
  contents: {
    text: true, // full page text
    highlights: { numSentences: 3 }, // key sentences
    summary: true, // AI summary
  },
});
```

| Contents option | Type                                                                  | Description            |
| --------------- | --------------------------------------------------------------------- | ---------------------- |
| `text`          | `boolean \| { maxCharacters }`                                        | Extract full page text |
| `highlights`    | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | Extract key sentences  |
| `summary`       | `boolean \| { query }`                                                | AI-generated summary   |

### Search modes

| Mode             | 描述                     |
| ---------------- | ------------------------ |
| `auto`           | Exa 选择最佳模式（默认） |
| `neural`         | 基于语义/含义的搜索      |
| `fast`           | 快速关键词搜索           |
| `deep`           | 彻底的深度搜索           |
| `deep-reasoning` | 带有推理的深度搜索       |
| `instant`        | 最快的结果               |

## 注意事项

- 如果未提供 `contents` 选项，Exa 默认为 `{ highlights: true }`
  以便结果包含关键句子摘录
- 如果可用，结果会保留 Exa API 响应中的
  `highlightScores` 和 `summary` 字段
- 结果描述优先从高亮部分解析，然后是摘要，最后是
  全文 —— 以可用的为准
- `freshness` 和 `date_after`/`date_before` 不能组合使用 —— 使用一种
  时间过滤模式
- 每次查询最多可返回 100 个结果（取决于 Exa 搜索类型
  的限制）
- 结果默认缓存 15 分钟（可通过
  `cacheTtlMinutes` 配置）
- Exa 是官方 API 集成，提供结构化的 JSON 响应

## 相关内容

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Brave Search](/zh/tools/brave-search) -- 带有国家/语言过滤器的结构化结果
- [Perplexity Search](/zh/tools/perplexity-search) -- 带有域名过滤的结构化结果
