---
summary: "通过 xAI 网络基于响应进行 Grok 网络搜索"
read_when:
  - You want to use Grok for web_search
  - You need an XAI_API_KEY for web search
title: "Grok 搜索"
---

OpenClaw 支持 Grok 作为 `web_search` 提供商，利用 xAI 网络基础响应生成由实时搜索结果和引用支持的 AI 综合答案。

同一个 `XAI_API_KEY` 也可以为内置的 `x_search` X（前身为 Twitter）帖子搜索工具提供支持。如果您将密钥存储在 `plugins.entries.xai.config.webSearch.apiKey` 下，OpenClaw 现在也会将其重用为捆绑的 xAI 模型提供商的备用选项。

对于帖子级别的 X 指标（如转发、回复、书签或浏览量），请优先使用 `x_search` 并提供确切的帖子 URL 或状态 ID，而不是广泛的搜索查询。

## 新手引导和配置

如果您在此过程中选择 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以显示一个单独的后续步骤，以使用相同的 `XAI_API_KEY` 启用 `x_search`。该后续步骤：

- 仅在您为 `web_search` 选择 Grok 后出现
- 不是一个单独的顶级网络搜索提供商选项
- 可以在同一流程中可选地设置 `x_search` 模型

如果您跳过此步骤，稍后可以在配置中启用或更改 `x_search`。

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

**环境替代方案：** 在 Gateway(网关) 环境中设置 `XAI_API_KEY`。
对于网关安装，请将其放入 `~/.openclaw/.env` 中。

## 工作原理

Grok 使用 xAI 网络基础响应来综合包含内联引用的答案，类似于 Gemini 的 Google Search 基础方法。

## 支持的参数

Grok 搜索支持 `query`。

为了保持 `web_search` 兼容性，接受 `count`，但 Grok 仍然返回一个带引用的综合答案，而不是 N 个结果的列表。

目前不支持特定于提供商的过滤器。

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Web Search 中的 x_search](/zh/tools/web#x_search) -- 通过 xAI 进行一流的 X 搜索
- [Gemini Search](/zh/tools/gemini-search) -- 通过 Google 基础获取 AI 综合答案
