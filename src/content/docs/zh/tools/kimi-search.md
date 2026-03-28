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
    从 [Moonshot AI](https://platform.moonshot.cn/) 获取 API 密钥。
  </Step>
  <Step title="Store the key">
    在 Gateway(网关) 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，或
    通过以下方式配置：

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
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // optional if KIMI_API_KEY or MOONSHOT_API_KEY is set
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

**环境变量替代方案：** 在
Gateway(网关) 环境中设置 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`。如果是网关安装，请将其放入 `~/.openclaw/.env` 中。

## 工作原理

Kimi 使用 Moonshot 网络搜索综合带有内联引用的答案，
类似于 Gemini 和 Grok 的有依据响应方法。

## 支持的参数

Kimi 搜索支持标准的 `query` 和 `count` 参数。
目前不支持特定于提供商的过滤器。

## 相关内容

- [网络搜索概述](/zh/tools/web) -- 所有提供商和自动检测
- [Gemini 搜索](/zh/tools/gemini-search) -- 通过 Google Grounding 生成的 AI 综合答案
- [Grok 搜索](/zh/tools/grok-search) -- 通过 xAI Grounding 生成的 AI 综合答案
