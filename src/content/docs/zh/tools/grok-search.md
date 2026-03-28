---
summary: "通过 xAI 网络基于响应进行 Grok 网络搜索"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Grok 搜索"
---

# Grok 搜索

OpenClaw 支持 Grok 作为 `web_search` 提供商，利用 xAI 网络基于响应生成由实时搜索结果和引用支持的 AI 综合答案。

## 获取 API 密钥

<Steps>
  <Step title="Create a key">
    从 [xAI](https://console.x.ai/) 获取 API 密钥。
  </Step>
  <Step title="Store the key">
    在 Gateway(网关) 环境中设置 `XAI_API_KEY`，或通过以下方式配置：

    ```exec
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
对于 Gateway 安装，请将其放入 `~/.openclaw/.env` 中。

## 工作原理

Grok 利用 xAI 网络基于响应来综合带有内联引用的答案，类似于 Gemini 的 Google 搜索基于方法。

## 支持的参数

Grok 搜索支持标准的 `query` 和 `count` 参数。
目前不支持特定于提供商的筛选器。

## 相关

- [Web Search overview](/zh/tools/web) -- 所有提供商和自动检测
- [Gemini Search](/zh/tools/gemini-search) -- 通过 Google 基于技术生成的 AI 综合答案
