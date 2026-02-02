---
summary: "网页搜索 + 抓取工具（Brave Search API、Perplexity 直连/OpenRouter）"
read_when:
  - 你要启用 web_search 或 web_fetch
  - 你需要设置 Brave Search API key
  - 你想用 Perplexity Sonar 做网页搜索
title: "Web Tools"
---

# Web 工具

OpenClaw 提供两个轻量级 web 工具：

- `web_search` — 通过 Brave Search API（默认）或 Perplexity Sonar（直连或 OpenRouter）搜索网页。
- `web_fetch` — HTTP 抓取 + 可读抽取（HTML → markdown/text）。

这些 **不是** 浏览器自动化。对 JS 重站点或登录场景，请用
[浏览器工具](/zh/tools/browser)。

## 工作方式

- `web_search` 调用你配置的 provider 并返回结果。
  - **Brave**（默认）：返回结构化结果（标题、URL、摘要）。
  - **Perplexity**：返回带引用的 AI 综合答案（实时搜索）。
- 结果按 query 缓存 15 分钟（可配置）。
- `web_fetch` 执行普通 HTTP GET 并抽取可读内容（HTML → markdown/text）。**不** 执行 JavaScript。
- `web_fetch` 默认启用（除非显式禁用）。

## 选择搜索提供商

| Provider | 优点 | 缺点 | API Key |
|----------|------|------|---------|
| **Brave**（默认） | 快速、结构化结果、免费层 | 传统搜索结果 | `BRAVE_API_KEY` |
| **Perplexity** | AI 综合答案、引用、实时 | 需要 Perplexity 或 OpenRouter 访问 | `OPENROUTER_API_KEY` 或 `PERPLEXITY_API_KEY` |

Provider 详情见 [Brave Search 设置](/zh/brave-search) 与 [Perplexity Sonar](/zh/perplexity)。

在配置中设置 provider：

```json5
{
  tools: {
    web: {
      search: {
        provider: "brave"  // or "perplexity"
      }
    }
  }
}
```

示例：切换到 Perplexity Sonar（直连 API）：

```json5
{
  tools: {
    web: {
      search: {
        provider: "perplexity",
        perplexity: {
          apiKey: "pplx-...",
          baseUrl: "https://api.perplexity.ai",
          model: "perplexity/sonar-pro"
        }
      }
    }
  }
}
```

## 获取 Brave API key

1) 在 https://brave.com/search/api/ 创建 Brave Search API 账号
2) 在面板中选择 **Data for Search** 方案（不是 “Data for AI”）并生成 API key。
3) 运行 `openclaw configure --section web` 将 key 写入配置（推荐），或在环境中设置 `BRAVE_API_KEY`。

Brave 提供免费层与付费方案；当前额度与价格以 Brave API 门户为准。

### 需要在哪里设置 key（推荐）

**推荐：** 运行 `openclaw configure --section web`。它会把 key 写入
`~/.openclaw/openclaw.json` 的 `tools.web.search.apiKey`。

**环境变量：** 在 Gateway 进程环境中设置 `BRAVE_API_KEY`。对网关安装，可写入 `~/.openclaw/.env`（或服务环境）。见 [环境变量](/zh/help/faq#how-does-openclaw-load-environment-variables)。

## 使用 Perplexity（直连或 OpenRouter）

Perplexity Sonar 模型内置网页搜索能力，并返回带引用的 AI 综合答案。你可以通过 OpenRouter 使用（无需信用卡，支持加密货币/预付）。

### 获取 OpenRouter API key

1) 在 https://openrouter.ai/ 创建账号
2) 充值（支持加密货币、预付或信用卡）
3) 在账号设置中生成 API key

### 配置 Perplexity 搜索

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "perplexity",
        perplexity: {
          // API key (optional if OPENROUTER_API_KEY or PERPLEXITY_API_KEY is set)
          apiKey: "sk-or-v1-...",
          // Base URL (key-aware default if omitted)
          baseUrl: "https://openrouter.ai/api/v1",
          // Model (defaults to perplexity/sonar-pro)
          model: "perplexity/sonar-pro"
        }
      }
    }
  }
}
```

**环境变量：** 在 Gateway 环境中设置 `OPENROUTER_API_KEY` 或 `PERPLEXITY_API_KEY`。
对网关安装，写入 `~/.openclaw/.env`。

若未设置 base URL，OpenClaw 会按 API key 来源选择默认值：

- `PERPLEXITY_API_KEY` 或 `pplx-...` → `https://api.perplexity.ai`
- `OPENROUTER_API_KEY` 或 `sk-or-...` → `https://openrouter.ai/api/v1`
- 未知 key 格式 → OpenRouter（安全回退）

### 可用的 Perplexity 模型

| Model | Description | Best for |
|-------|-------------|----------|
| `perplexity/sonar` | Fast Q&A with web search | Quick lookups |
| `perplexity/sonar-pro` (default) | Multi-step reasoning with web search | Complex questions |
| `perplexity/sonar-reasoning-pro` | Chain-of-thought analysis | Deep research |

## web_search

使用已配置 provider 搜索网页。

### 要求

- `tools.web.search.enabled` 不能为 `false`（默认启用）
- 需要所选 provider 的 API key：
  - **Brave**：`BRAVE_API_KEY` 或 `tools.web.search.apiKey`
  - **Perplexity**：`OPENROUTER_API_KEY`、`PERPLEXITY_API_KEY` 或 `tools.web.search.perplexity.apiKey`

### 配置

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        apiKey: "BRAVE_API_KEY_HERE", // optional if BRAVE_API_KEY is set
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15
      }
    }
  }
}
```

### 工具参数

- `query`（必填）
- `count`（1–10；默认来自配置）
- `country`（可选）：2 字母国家代码，用于地区化结果（如 "DE"、"US"、"ALL"）。省略时 Brave 使用默认区域。
- `search_lang`（可选）：搜索结果语言的 ISO 代码（如 "de"、"en"、"fr"）
- `ui_lang`（可选）：UI 元素的 ISO 语言代码
- `freshness`（可选，仅 Brave）：按发现时间过滤（`pd`、`pw`、`pm`、`py` 或 `YYYY-MM-DDtoYYYY-MM-DD`）

**示例：**

```javascript
// German-specific search
await web_search({
  query: "TV online schauen",
  count: 10,
  country: "DE",
  search_lang: "de"
});

// French search with French UI
await web_search({
  query: "actualités",
  country: "FR",
  search_lang: "fr",
  ui_lang: "fr"
});

// Recent results (past week)
await web_search({
  query: "TMBG interview",
  freshness: "pw"
});
```

## web_fetch

抓取 URL 并抽取可读内容。

### 要求

- `tools.web.fetch.enabled` 不能为 `false`（默认启用）
- 可选 Firecrawl 兜底：设置 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY`。

### 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true,
        maxChars: 50000,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        readability: true,
        firecrawl: {
          enabled: true,
          apiKey: "FIRECRAWL_API_KEY_HERE", // optional if FIRECRAWL_API_KEY is set
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 86400000, // ms (1 day)
          timeoutSeconds: 60
        }
      }
    }
  }
}
```

### 工具参数

- `url`（必填，仅 http/https）
- `extractMode`（`markdown` | `text`）
- `maxChars`（截断长页面）

说明：
- `web_fetch` 先用 Readability（主内容抽取），再用 Firecrawl（若配置）。若两者都失败，工具返回错误。
- Firecrawl 请求默认使用反机器人模式并缓存结果。
- `web_fetch` 默认发送类似 Chrome 的 User-Agent 与 `Accept-Language`；需要时可覆盖 `userAgent`。
- `web_fetch` 会阻断私有/内部主机名并重新检查重定向（由 `maxRedirects` 限制）。
- `web_fetch` 为尽力抽取；部分站点仍需浏览器工具。
- key 设置与服务细节见 [Firecrawl](/zh/tools/firecrawl)。
- 响应默认缓存 15 分钟，以减少重复抓取。
- 若使用工具 profile/allowlist，加入 `web_search`/`web_fetch` 或 `group:web`。
- 如果缺少 Brave key，`web_search` 会返回简短的设置提示并附文档链接。
