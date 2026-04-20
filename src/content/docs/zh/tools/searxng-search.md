---
summary: "SearXNG 网络搜索 -- 自托管、无需密钥的元搜索提供商"
read_when:
  - You want a self-hosted web search provider
  - You want to use SearXNG for web_search
  - You need a privacy-focused or air-gapped search option
title: "SearXNG 搜索"
---

# SearXNG 搜索

OpenClaw 支持 [SearXNG](https://docs.searxng.org/) 作为一种 **自托管、
无需密钥** 的 `web_search` 提供商。SearXNG 是一个开源元搜索引擎，
可聚合来自 Google、Bing、DuckDuckGo 和其他来源的结果。

优势：

- **免费且无限** -- 无需 API 密钥或商业订阅
- **隐私 / 物理隔离** -- 查询永远不会离开您的网络
- **适用于任何地方** —— 商业搜索 API 没有地区限制

## 安装

<Steps>
  <Step title="运行 SearXNG 实例">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    或者使用您有权访问的任何现有 SearXNG 部署。请参阅
    [SearXNG 文档](https://docs.searxng.org/) 了解生产环境设置。

  </Step>
  <Step title="配置">
    ```bash
    openclaw configure --section web
    # Select "searxng" as the provider
    ```

    或者设置环境变量并让自动检测找到它：

    ```bash
    export SEARXNG_BASE_URL="http://localhost:8888"
    ```

  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "searxng",
      },
    },
  },
}
```

SearXNG 实例的插件级设置：

```json5
{
  plugins: {
    entries: {
      searxng: {
        config: {
          webSearch: {
            baseUrl: "http://localhost:8888",
            categories: "general,news", // optional
            language: "en", // optional
          },
        },
      },
    },
  },
}
```

`baseUrl` 字段也接受 SecretRef 对象。

传输规则：

- `https://` 适用于公共或私有 SearXNG 主机
- `http://` 仅接受受信任的专用网络或环回主机
- 公共 SearXNG 主机必须使用 `https://`

## 环境变量

设置 `SEARXNG_BASE_URL` 作为配置的替代方案：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

当设置了 `SEARXNG_BASE_URL` 且未配置显式提供商时，自动检测
会自动选择 SearXNG（优先级最低 -- 任何带有密钥的
API 支持的提供商会优先）。

## 插件配置参考

| 字段         | 描述                                                |
| ------------ | --------------------------------------------------- |
| `baseUrl`    | SearXNG 实例的基本 URL（必需）                      |
| `categories` | 逗号分隔的类别，例如 `general`、`news` 或 `science` |
| `language`   | 结果的语言代码，例如 `en`、`de` 或 `fr`             |

## 注意

- **JSON API** -- 使用 SearXNG 原生的 `format=json` 端点，而非 HTML 抓取
- **无需 API 密钥** -- 可直接使用任何 SearXNG 实例
- **基本 URL 验证** -- `baseUrl` 必须是有效的 `http://` 或 `https://`
  URL；公共主机必须使用 `https://`
- **自动检测顺序** -- 在
  自动检测中，SearXNG 最后被检查（顺序 200）。配置了密钥的 API 支持的提供商首先运行，然后
  是 DuckDuckGo（顺序 100），接着是 Ollama Web Search（顺序 110）
- **自托管** -- 您控制实例、查询和上游搜索引擎
- **类别**在未配置时默认为 `general`

<Tip>要使 SearXNG JSON API 正常工作，请确保您的 SearXNG 实例在其 `search.formats` 下的 `settings.yml` 中启用了 `json` 格式。</Tip>

## 相关

- [Web Search 概览](/zh/tools/web) -- 所有提供商和自动检测
- [DuckDuckGo 搜索](/zh/tools/duckduckgo-search) -- 另一个无需密钥的备选方案
- [Brave 搜索](/zh/tools/brave-search) -- 带有免费层的结构化结果
