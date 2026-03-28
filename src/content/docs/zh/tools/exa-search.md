---
summary: "Exa AI 搜索 -- 具有内容提取功能的神经搜索和关键词搜索"
read_when:
  - You want to use Exa for web_search
  - You need an EXA_API_KEY
  - You want neural search or content extraction
title: "Exa 搜索"
---

# Exa 搜索

OpenClaw 支持 [Exa AI](https://exa.ai/) 作为 `web_search` 提供商。Exa 提供
神经、关键词和混合搜索模式，并内置内容
提取（高亮、文本、摘要）。

## 获取 API 密钥

<Steps>
  <Step title="创建账户">
    在 [exa.ai](https://exa.ai/) 注册并从您的
    仪表板生成 API 密钥。
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

## 工具参数

| 参数          | 描述                                                                      |
| ------------- | ------------------------------------------------------------------------- |
| `query`       | 搜索查询（必填）                                                          |
| `count`       | 返回的结果数量（1-100）                                                   |
| `type`        | 搜索模式：`auto`、`neural`、`fast`、`deep`、`deep-reasoning` 或 `instant` |
| `freshness`   | 时间筛选器：`day`、`week`、`month` 或 `year`                              |
| `date_after`  | 此日期之后的结果（YYYY-MM-DD）                                            |
| `date_before` | 此日期之前的结果（YYYY-MM-DD）                                            |
| `contents`    | 内容提取选项（见下文）                                                    |

### 内容提取

Exa 可以在搜索结果的同时返回提取的内容。传递一个 `contents`
对象以启用：

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

| 内容选项     | 类型                                                                  | 描述             |
| ------------ | --------------------------------------------------------------------- | ---------------- |
| `text`       | `boolean \| { maxCharacters }`                                        | 提取完整页面文本 |
| `highlights` | `boolean \| { maxCharacters, query, numSentences, highlightsPerUrl }` | 提取关键句子     |
| `summary`    | `boolean \| { query }`                                                | AI 生成的摘要    |

### 搜索模式

| 模式             | 描述                     |
| ---------------- | ------------------------ |
| `auto`           | Exa 选择最佳模式（默认） |
| `neural`         | 语义/基于含义的搜索      |
| `fast`           | 快速关键词搜索           |
| `deep`           | 彻底的深度搜索           |
| `deep-reasoning` | 带推理的深度搜索         |
| `instant`        | 最快结果                 |

## 注意事项

- 如果未提供 `contents` 选项，Exa 默认为 `{ highlights: true }`
  以便结果包含关键句子摘录
- 结果在可用时保留 Exa API 响应中的
  `highlightScores` 和 `summary` 字段
- 结果描述首先从高亮中解析，然后是摘要，接着是
  全文 — 以可用者为准
- `freshness` 和 `date_after`/`date_before` 无法组合使用 — 使用一种
  时间过滤模式
- 每个查询最多可返回 100 个结果（取决于 Exa 搜索类型
  的限制）
- 结果默认缓存 15 分钟（可通过
  `cacheTtlMinutes` 配置）
- Exa 是带有结构化 JSON 响应的官方 API 集成

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Brave 搜索](/zh/tools/brave-search) -- 带有国家/语言过滤器的结构化结果
- [Perplexity 搜索](/zh/tools/perplexity-search) -- 带有域名过滤器的结构化结果
