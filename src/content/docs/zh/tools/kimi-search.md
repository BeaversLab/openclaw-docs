---
summary: "通过 Moonshot 网络搜索进行 Kimi 网络搜索"
read_when:
  - You want to use Kimi for web_search
  - You need a KIMI_API_KEY or MOONSHOT_API_KEY
title: "Kimi 搜索"
---

OpenClaw 支持 Kimi 作为 `web_search` 提供商，利用 Moonshot 网络搜索
生成带有引用的 AI 综合答案。

## 获取 API 密钥

<Steps>
  <Step title="Create a key">
    从 [Moonshot AI](https://platform.moonshot.cn/) 获取 API 密钥。
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
`openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 也可能会询问：

- Moonshot Moonshot 区域：
  - `https://api.moonshot.ai/v1`
  - `https://api.moonshot.cn/v1`
- 默认的 Kimi 网络搜索模型（默认为 `kimi-k2.6`）

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
            model: "kimi-k2.6",
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

如果您在聊天时使用中国 API 主机（`models.providers.moonshot.baseUrl`:
`https://api.moonshot.cn/v1`），OpenClaw 会在省略 `tools.web.search.kimi.baseUrl` 时复用该主机作为 Kimi
`web_search` 的主机，这样来自
[platform.moonshot.cn](https://platform.moonshot.cn/) 的密钥就不会
错误地访问国际端点（这通常会返回 HTTP 401）。当您需要
不同的搜索基础 URL 时，可以使用 `tools.web.search.kimi.baseUrl` 覆盖。

**环境替代方案：** 在 Gateway(网关) 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`。
对于 Gateway 安装，请将其放入 `~/.openclaw/.env` 中。

如果您省略 `baseUrl`，OpenClaw 默认为 `https://api.moonshot.ai/v1`。
如果您省略 `model`，OpenClaw 默认为 `kimi-k2.6`。

## 工作原理

Kimi 利用 Moonshot 网络搜索来综合带有行内引用的答案，
类似于 Gemini 和 Grok 的有根据的响应方法。

## 支持的参数

Kimi 搜索支持 `query`。

为了兼容共享 `web_search`，接受 `count`，但 Kimi 仍然
返回一个带有引用的综合答案，而不是 N 个结果的列表。

目前不支持特定于提供商的过滤器。

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Moonshot AI](/zh/providers/moonshot) -- Moonshot 模型 + Kimi Coding 提供商文档
- [Gemini Search](/zh/tools/gemini-search) -- 通过 Google grounding 生成的 AI 综合答案
- [Grok Search](/zh/tools/grok-search) -- 通过 xAI grounding 生成的 AI 综合答案
