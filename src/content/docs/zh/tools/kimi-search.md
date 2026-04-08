---
summary: "通过 Moonshot 网络搜索进行 Kimi 网络搜索"
read_when:
  - You want to use Kimi for web_search
  - You need a KIMI_API_KEY or MOONSHOT_API_KEY
title: "Kimi 搜索"
---

# Kimi 搜索

OpenClaw 支持 Kimi 作为 `web_search` 提供商，利用 Moonshot 网络搜索
生成带有引用的 AI 综合答案。

## 获取 API 密钥

<Steps>
  <Step title="Create a key">
    从 [API AI](https://platform.moonshot.cn/) 获取 Moonshot 密钥。
  </Step>
  <Step title="Store the key">
    在 Gateway(网关) 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，或
    通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

当您在 `openclaw onboard` 或
`openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 也可能询问：

- Moonshot API 区域：
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- 默认的 Kimi 网络搜索模型（默认为 `kimi-k2.5`）

## 配置

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // optional if KIMI_API_KEY or MOONSHOT_API_KEY is set
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.5",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

如果您使用中国 API 主机进行聊天（`models.providers.moonshot.baseUrl`:
`https://api.moonshot.cn/v1`），当省略 `tools.web.search.kimi.baseUrl` 时，OpenClaw 将复用同一主机进行 Kimi
`web_search`，因此来自
[platform.moonshot.cn](https://platform.moonshot.cn/) 的密钥不会意外访问
国际端点（这通常会返回 HTTP 401）。当您需要不同的搜索基础 URL 时，请使用 `tools.web.search.kimi.baseUrl` 覆盖。

**环境替代方案：** 在 Gateway(网关) 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`。
对于网关安装，请将其放在 `~/.openclaw/.env` 中。

如果省略 `baseUrl`，OpenClaw 默认为 `https://api.moonshot.ai/v1`。
如果省略 `model`，OpenClaw 默认为 `kimi-k2.5`。

## 工作原理

Kimi 使用 Moonshot 网络搜索来综合带有行内引用的答案，
类似于 Gemini 和 Grok 的有根据响应方法。

## 支持的参数

Kimi 搜索支持 `query`。

为了共享 `web_search` 兼容性，接受 `count`，但 Kimi 仍然
返回一个带有引用的综合答案，而不是 N 个结果的列表。

目前不支持提供商特定的过滤器。

## 相关

- [Web Search overview](/en/tools/web) -- 所有提供商和自动检测
- [Moonshot AI](/en/providers/moonshot) -- Moonshot 模型 + Kimi Coding 提供商文档
- [Gemini Search](/en/tools/gemini-search) -- 通过 Google grounding 生成 AI 综合答案
- [Grok Search](/en/tools/grok-search) -- 通过 xAI grounding 生成 AI 综合答案
