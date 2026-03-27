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

<Warning>
  DuckDuckGo 是一个 **实验性的、非官方的** 集成，它从 DuckDuckGo 的 非 JavaScript 搜索页面获取结果 —
  而非官方 API。由于机器人验证页面 或 HTML 变更，可能会偶尔出现中断。
</Warning>

## 设置

不需要 API 密钥 — 只需将 DuckDuckGo 设置为您的提供商：

<Steps>
  <Step title="Configure">
    ```bash openclaw configure --section web # Select "duckduckgo" as the provider ```
  </Step>
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

插件级别的可选区域和 SafeSearch 设置：

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

| 参数         | 描述                                                  |
| ------------ | ----------------------------------------------------- |
| `query`      | 搜索查询（必填）                                      |
| `count`      | 要返回的结果数（1-10，默认：5）                       |
| `region`     | DuckDuckGo 区域代码（例如 `us-en`, `uk-en`, `de-de`） |
| `safeSearch` | SafeSearch 等级：`strict`、`moderate`（默认）或 `off` |

区域和 SafeSearch 也可以在插件配置中设置（见上文） — 工具
参数会逐次查询覆盖配置值。

## 注意事项

- **无需 API 密钥** — 开箱即用，零配置
- **实验性** — 从 DuckDuckGo 的非 JavaScript HTML
  搜索页面收集结果，而非官方 API 或 SDK
- **机器人验证风险** — 在大量或自动使用时，DuckDuckGo 可能会提供 CAPTCHA 或阻止请求
- **HTML 解析** — 结果取决于页面结构，该结构可能在未
  通知的情况下发生变化
- **自动检测顺序** — DuckDuckGo 在
  自动检测中排在最后（顺序 100），因此任何带有密钥的 API 支持提供商都具有优先权
- **SafeSearch 默认为适中**（moderate），如果未进行配置

<Tip>
  对于生产用途，请考虑 [Brave 搜索](/en/tools/brave-search)（提供免费层级）或 另一个 API
  支持的提供商。
</Tip>

## 相关

- [网络搜索概述](/en/tools/web) -- 所有提供商和自动检测
- [Brave 搜索](/en/tools/brave-search) -- 具有免费层级的结构化结果
- [Exa Search](/en/tools/exa-search) —— 带有内容提取功能的神经搜索

import zh from "/components/footer/zh.mdx";

<zh />
