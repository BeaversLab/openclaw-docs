---
summary: "DuckDuckGo 网络搜索 -- 免密钥备用提供商（实验性，基于 HTML）"
read_when:
  - You want a web search provider that requires no API key
  - You want to use DuckDuckGo for web_search
  - You need a zero-config search fallback
title: "DuckDuckGo 搜索"
---

OpenClaw 支持 DuckDuckGo 作为 **免密钥** `web_search` 提供商。不需要 OpenClaw 密钥或帐户。

<Warning>DuckDuckGo 是一个**实验性、非官方**的集成，它从 DuckDuckGo 的非 JavaScript 搜索页面获取结果——并非官方 API。请预期 偶尔会出现由机器人验证页面或 HTML 更改导致的故障。</Warning>

## 设置

无需 API 密钥——只需将 DuckDuckGo 设置为您的提供商：

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

<ParamField path="query" type="string" required>
  搜索查询。
</ParamField>

<ParamField path="count" type="number" default="5">
  要返回的结果数 (1-10)。
</ParamField>

<ParamField path="region" type="string">
  DuckDuckGo 区域代码（例如 `us-en`、`uk-en`、`de-de`）。
</ParamField>

<ParamField path="safeSearch" type="'strict' | 'moderate' | 'off'" default="moderate">
  安全搜索级别。
</ParamField>

Region 和 SafeSearch 也可以在插件配置中设置（见上文）——工具
参数会按查询覆盖配置值。

## 注意事项

- **无 API 密钥**——开箱即用，零配置
- **实验性**——从 DuckDuckGo 的非 JavaScript HTML
  搜索页面收集结果，而非官方 API 或 SDK
- **机器人挑战风险**——在频繁或自动使用时，DuckDuckGo 可能会提供 CAPTCHA 验证或阻止请求
- **HTML 解析**——结果取决于页面结构，该结构可能会在
  无通知的情况下发生变化
- **自动检测顺序**——DuckDuckGo 是自动检测中的第一个免密钥后备
  （顺序 100）。已配置密钥的 API 支持的提供商
  优先运行，然后是 Ollama Web Search（顺序 110），接着是 SearXNG（顺序 200）
- **安全搜索默认为中等级别**（如果未配置）

<Tip>对于生产环境，请考虑使用 [Brave Search](/zh/tools/brave-search)（提供免费层）或其他 API 支持的提供商。</Tip>

## 相关

- [网络搜索概述](/zh/tools/web) -- 所有提供商和自动检测
- [Brave Search](/zh/tools/brave-search) -- 提供免费层级的结构化结果
- [Exa Search](/zh/tools/exa-search) -- 带有内容提取功能的神经搜索
