---
summary: "通过 xAI 网络基于响应进行 Grok 网络搜索"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Grok 搜索"
---

# Grok 搜索

OpenClaw 支持 Grok 作为 `web_search` 提供商，利用 xAI 网络基于响应生成由实时搜索结果和引用支持的 AI 综合答案。

同一个 `XAI_API_KEY` 也可以为内置的 X（前身为 Twitter）帖子搜索 `x_search` 工具提供支持。如果您将密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，OpenClaw 现在也会将其作为捆绑的 xAI 模型提供商的回退方案重用。

对于帖子级别的 X 指标，例如转发、回复、书签或浏览量，请结合确切的帖子 URL 或状态 ID 使用 `x_search`，而不是使用广泛的搜索查询。

## 获取 API 密钥

<Steps>
  <Step title="创建密钥">
    从 [xAI](https://console.x.ai/) 获取 API 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway(网关) 环境中设置 `XAI_API_KEY`，或通过以下方式配置：

    ```bash
    openclaw configure --section web
    ```

  </Step>
</Steps>

## 配置

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...", // optional if XAI_API_KEY is set
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "grok",
      },
    },
  },
}
```

**环境变量替代方案：** 在 Gateway(网关) 环境中设置 `XAI_API_KEY`。
对于 Gateway(网关) 安装，请将其放入 `~/.openclaw/.env` 中。

## 工作原理

Grok 使用 xAI 基于网络的响应来综合包含内联引用的答案，类似于 Gemini 的 Google Search 基于网络的方法。

## 支持的参数

Grok 搜索支持标准的 `query` 和 `count` 参数。
目前不支持特定于提供商的筛选器。

## 相关

- [Web Search 概述](/en/tools/web) -- 所有提供商和自动检测
- [Web Search 中的 x_search](/en/tools/web#x_search) -- 通过 xAI 进行的一流 X 搜索
- [Gemini Search](/en/tools/gemini-search) -- 通过 Google grounding 获取 AI 综合答案
