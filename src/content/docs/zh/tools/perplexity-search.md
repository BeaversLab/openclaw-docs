---
summary: "Perplexity Search API 和 Sonar/OpenRouter 与 web_search 的兼容性"
read_when:
  - You want to use Perplexity Search for web search
  - You need PERPLEXITY_API_KEY or OPENROUTER_API_KEY setup
title: "Perplexity Search"
---

# Perplexity Search API

OpenClaw 支持 Perplexity Search API 作为 `web_search` 提供商。
它返回包含 `title`、`url` 和 `snippet` 字段的结构化结果。

为了兼容性，OpenClaw 还支持传统的 Perplexity Sonar/OpenRouter 配置。
如果您使用 `OPENROUTER_API_KEY`，`plugins.entries.perplexity.config.webSearch.apiKey` 中的 `sk-or-...` 密钥，或者设置了 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model`，提供商将切换到聊天补全路径，并返回带有引用的 AI 综合答案，而不是结构化的 Search API 结果。

## 获取 Perplexity API 密钥

1. 在 [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) 创建一个 Perplexity 账户
2. 在控制台中生成 API 密钥
3. 将密钥存储在配置中，或在 Gateway(网关) 环境中设置 `PERPLEXITY_API_KEY`。

## OpenRouter 兼容性

如果您之前已经使用 OpenRouter 进行 Perplexity Sonar 搜索，请保留 `provider: "perplexity"` 并在 Gateway(网关) 环境中设置 `OPENROUTER_API_KEY`，或者在 `plugins.entries.perplexity.config.webSearch.apiKey` 中存储 `sk-or-...` 密钥。

可选兼容性控制：

- `plugins.entries.perplexity.config.webSearch.baseUrl`
- `plugins.entries.perplexity.config.webSearch.model`

## 配置示例

### 原生 Perplexity Search API

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "pplx-...",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

### OpenRouter / Sonar 兼容性

```json5
{
  plugins: {
    entries: {
      perplexity: {
        config: {
          webSearch: {
            apiKey: "<openrouter-api-key>",
            baseUrl: "https://openrouter.ai/api/v1",
            model: "perplexity/sonar-pro",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "perplexity",
      },
    },
  },
}
```

## 在哪里设置密钥

**通过配置：** 运行 `openclaw configure --section web`。它将密钥存储在
`plugins.entries.perplexity.config.webSearch.apiKey` 下的 `~/.openclaw/openclaw.json` 中。
该字段也接受 SecretRef 对象。

**通过环境变量：** 在 Gateway(网关) 进程环境中设置 `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`。
对于网关安装，将其放入
`~/.openclaw/.env`（或您的服务环境）中。参见 [Env vars](/en/help/faq#env-vars-and-env-loading)。

如果配置了 `provider: "perplexity"` 且 Perplexity 密钥 SecretRef 未解析且没有环境变量回退，启动/重新加载将快速失败。

## 工具参数

这些参数适用于原生 Perplexity Search API 路径。

| 参数                  | 描述                                                   |
| --------------------- | ------------------------------------------------------ |
| `query`               | 搜索查询（必填）                                       |
| `count`               | 要返回的结果数量（1-10，默认值：5）                    |
| `country`             | 两个字母的 ISO 国家代码（例如“US”、“DE”）              |
| `language`            | ISO 639-1 语言代码（例如“en”、“de”、“fr”）             |
| `freshness`           | 时间过滤器：`day`（24小时）、`week`、`month` 或 `year` |
| `date_after`          | 仅限在此日期之后发布的结果（YYYY-MM-DD）               |
| `date_before`         | 仅限在此日期之前发布的结果（YYYY-MM-DD）               |
| `domain_filter`       | 域名允许列表/拒绝列表数组（最多 20 个）                |
| `max_tokens`          | 总内容预算（默认值：25000，最大值：1000000）           |
| `max_tokens_per_page` | 每页 token 限制（默认值：2048）                        |

对于旧的 Sonar/OpenRouter 兼容性路径，仅支持 `query` 和 `freshness`。Search API 专用过滤器（如 `country`、`language`、`date_after`、`date_before`、`domain_filter`、`max_tokens` 和 `max_tokens_per_page`）将返回明确的错误。

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

// Domain filtering (allowlist)
await web_search({
  query: "climate research",
  domain_filter: ["nature.com", "science.org", ".edu"],
});

// Domain filtering (denylist - prefix with -)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});

// More content extraction
await web_search({
  query: "detailed AI research",
  max_tokens: 50000,
  max_tokens_per_page: 4096,
});
```

### 域名过滤规则

- 每个过滤器最多 20 个域名
- 不能在同一请求中混合使用允许列表和拒绝列表
- 拒绝列表条目使用 `-` 前缀（例如 `["-reddit.com"]`）

## 注意

- Perplexity Search API 返回结构化的网络搜索结果（`title`、`url`、`snippet`）
- OpenRouter 或显式的 `plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 会将 Perplexity 切换回 Sonar 聊天补全以实现兼容性
- 结果默认缓存 15 分钟（可通过 `cacheTtlMinutes` 配置）

## 相关

- [Web Search overview](/en/tools/web) -- 所有提供商及自动检测
- [Perplexity Search API docs](https://docs.perplexity.ai/docs/search/quickstart) -- 官方 Perplexity 文档
- [Brave Search](/en/tools/brave-search) -- 带有国家/语言过滤器的结构化结果
- [Exa Search](/en/tools/exa-search) -- 带有内容提取的神经搜索
