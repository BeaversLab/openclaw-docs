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
  <Step title="创建密钥">
    从 [Moonshot AI](https://platform.moonshot.cn/) 获取 APIMoonshot 密钥。
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

如果您在聊天时使用中国区 API 主机 (`models.providers.moonshot.baseUrl`:
`https://api.moonshot.cn/v1`)，当省略 `tools.web.search.kimi.baseUrl` 时，OpenClaw 将重用同一主机进行 Kimi
`web_search`，这样来自
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

OpenClaw 只有在 Moonshot 返回
原生网络搜索依据（grounding evidence）后，才认为 Kimi `web_search` 成功，例如可重放的 `$web_search` 工具
负载、`search_results` 或引用 URL。如果 Kimi 立即停止并返回
像“我无法浏览互联网”这样的纯聊天回答而没有依据，
OpenClaw 将返回结构化的 `kimi_web_search_ungrounded` 错误，而不是
将该文本包装为搜索结果。请重试查询，切换到结构化
提供商（如 Brave），或者当您已经
拥有目标 URL 时使用 `web_fetch` / 浏览器工具。

## 支持的参数

Kimi 搜索支持 `query`。

为了共享 `web_search` 兼容性，接受 `count`，但 Kimi 仍然
返回一个带有引用的合成答案，而不是 N 个结果的列表。

目前不支持提供商特定的过滤器。

## 相关

- [网络搜索概览](/zh/tools/web) -- 所有提供商和自动检测
- [Moonshot AI](Moonshot/en/providers/moonshotMoonshot) -- Moonshot 模型 + Kimi Coding 提供商文档
- [Gemini Search](/zh/tools/gemini-search) -- 通过 Google 依据生成的 AI 合成答案
- [Grok Search](/zh/tools/grok-search) -- 通过 xAI 依据生成的 AI 合成答案
