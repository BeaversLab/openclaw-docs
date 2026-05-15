---
summary: "SearXNG 网络搜索 -- 自托管、无密钥的元搜索提供商"
read_when:
  - You want a self-hosted web search provider
  - You want to use SearXNG for web_search
  - You need a privacy-focused or air-gapped search option
title: "SearXNG 搜索"
---

OpenClaw 支持 [SearXNG](OpenClawhttps://docs.searxng.org/) 作为 **自托管、无密钥** 的 `web_search` 提供商。SearXNG 是一个开源元搜索引擎，聚合了来自 Google、Bing、DuckDuckGo 和其他来源的结果。

优势：

- **免费且无限** -- 不需要 API 密钥或商业订阅
- **隐私 / 物理隔离** -- 查询绝不会离开您的网络
- **随处可用** -- 商业搜索 API 没有地区限制

## 设置

<Steps>
  <Step title="运行 SearXNG 实例">
    ```bash
    docker run -d -p 8888:8080 searxng/searxng
    ```

    或者使用您有权访问的任何现有 SearXNG 部署。有关生产环境设置，请参阅 [SearXNG 文档](https://docs.searxng.org/)。

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
- `http://` 仅对受信任的专用网络或环回主机接受
- 公共 SearXNG 主机必须使用 `https://`
- 私有/内部主机使用自托管网络守护；公共 `https://` 主机保持在严格的网络搜索守护下，无法重定向到私有地址

## 环境变量

设置 `SEARXNG_BASE_URL` 作为配置的替代方案：

```bash
export SEARXNG_BASE_URL="http://localhost:8888"
```

当设置了 `SEARXNG_BASE_URL`API 且未配置显式提供商时，自动检测会自动选择 SearXNG（优先级最低 -- 任何有密钥的 API 支持的提供商会优先获胜）。

## 插件配置参考

| 字段         | 描述                                                |
| ------------ | --------------------------------------------------- |
| `baseUrl`    | 您的 SearXNG 实例的基础 URL（必填）                 |
| `categories` | 逗号分隔的类别，例如 `general`、`news` 或 `science` |
| `language`   | 结果的语言代码，例如 `en`、`de` 或 `fr`             |

## 注意事项

- **JSON API** -- 使用 SearXNG 原生的 API`format=json` 端点，而非 HTML 抓取
- **图片结果 URL** -- 当 SearXNG 返回直接图片 URL 时，图片类别的结果会包含 `img_src`
- **无需 API 密钥** -- 开箱即用，适用于任何 SearXNG 实例
- **基础 URL 验证** -- `baseUrl` 必须是有效的 `http://` 或 `https://` URL；公共主机必须使用 `https://`
- **网络防护** -- 私有/内部 SearXNG 端点可选择加入专用网络访问；公共 `https://` SearXNG 端点则保持严格的 SSRF 保护
- **自动检测顺序** -- 在自动检测中，SearXNG 的检查顺序排在最后（顺序 200）。配置了密钥的 API 支持提供商优先运行，然后是 DuckDuckGo（顺序 100），接着是 Ollama Web Search（顺序 110）
- **自托管** -- 您控制实例、查询和上游搜索引擎
- 未配置时，**类别** 默认为 `general`
- **类别回退** -- 如果非 `general`OpenClaw 类别的请求成功但返回零结果，OpenClaw 会使用 `general` 重试一次相同查询，然后再返回空结果集

<Tip>要使 SearXNG JSON API 正常工作，请确保您的 SearXNG 实例在其 `settings.yml` 下的 `search.formats` 中启用了 API`json` 格式。</Tip>

## 相关内容

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [DuckDuckGo 搜索](/zh/tools/duckduckgo-search) -- 另一个无需密钥的回退选项
- [Brave 搜索](Brave/en/tools/brave-search) -- 提供免费层级的结构化结果
