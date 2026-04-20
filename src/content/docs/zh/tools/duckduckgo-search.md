---
summary: "DuckDuckGo 网络搜索 -- 免密钥备用提供商（实验性，基于 HTML）"
read_when:
  - You want a web search provider that requires no API key
  - You want to use DuckDuckGo for web_search
  - You need a zero-config search fallback
title: "DuckDuckGo 搜索"
---

# DuckDuckGo 搜索

OpenClaw 支持 DuckDuckGo 作为 **免密钥** 的 `web_search` 提供商。无需 API 密钥或账户。

<Warning>DuckDuckGo 是一个 **实验性的、非官方的** 集成，它从 DuckDuckGo 的非 JavaScript 搜索页面中提取结果 —— 而非官方 API。请预期因机器人挑战页面或 HTML 变更而导致的偶尔中断。</Warning>

## 设置

不需要 API 密钥 — 只需将 DuckDuckGo 设置为您的提供商：

<Steps>
  <Step title="配置">```bash openclaw configure --section web # Select "duckduckgo" as the provider ```</Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "duckduckgo",
      },
    },
  },
}
```

用于区域和 SafeSearch 的可选插件级设置：

```json5
{
  plugins: {
    entries: {
      duckduckgo: {
        config: {
          webSearch: {
            region: "us-en", // DuckDuckGo region code
            safeSearch: "moderate", // "strict", "moderate", or "off"
          },
        },
      },
    },
  },
}
```

## 工具参数

| 参数         | 描述                                                    |
| ------------ | ------------------------------------------------------- |
| `query`      | 搜索查询（必需）                                        |
| `count`      | 返回结果数（1-10，默认：5）                             |
| `region`     | DuckDuckGo 区域代码（例如 `us-en`, `uk-en`, `de-de`）   |
| `safeSearch` | SafeSearch 级别：`strict`, `moderate`（默认），或 `off` |

区域和 SafeSearch 也可以在插件配置中设置（见上文）——工具参数会在每次查询时覆盖配置值。

## 注意事项

- **无 API 密钥** —— 开箱即用，零配置
- **实验性功能** —— 从 DuckDuckGo 的非 JavaScript HTML 搜索页面收集结果，而非官方 API 或 SDK
- **机器人验证风险** —— 在重度使用或自动化使用时，DuckDuckGo 可能会显示 CAPTCHA 验证码或阻止请求
- **HTML 解析** —— 结果取决于页面结构，该结构可能在不另行通知的情况下发生变化
- **自动检测顺序** —— DuckDuckGo 是自动检测中的第一个免密钥备选方案（顺序 100）。配置了密钥的 API 支持的提供商优先运行，然后是 Ollama Web Search（顺序 110），最后是 SearXNG（顺序 200）
- **SafeSearch 默认为适度** 未配置时

<Tip>对于生产环境，请考虑使用 [Brave Search](/zh/tools/brave-search)（提供免费层）或其他 API 支持的提供商。</Tip>

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Brave Search](/zh/tools/brave-search) -- 带有免费层的结构化结果
- [Exa Search](/zh/tools/exa-search) -- 带有内容提取的神经搜索
