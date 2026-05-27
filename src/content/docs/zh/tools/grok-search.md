---
summary: "通过 xAI 网络接地响应进行 Grok 网络搜索"
read_when:
  - You want to use Grok for web_search
  - You want to use xAI OAuth or an XAI_API_KEY for web search
title: "Grok 搜索"
---

OpenClaw 支持将 Grok 作为 OpenClaw`web_search` 提供商，利用 xAI 网络接地响应生成由实时搜索结果和引用支持的 AI 合成答案。

Grok 网络搜索优先使用您现有的 xAI OAuth 登录（如果可用）。如果不存在 OAuth 个人资料，同一个 xAI API 密钥也可以为内置的 `x_search` 工具（用于 X（前 Twitter）帖子搜索）和 `code_execution` 工具提供支持。如果您将密钥存储在 `plugins.entries.xai.config.webSearch.apiKey`OpenClaw 下，OpenClaw 还会将其作为捆绑的 xAI 模型提供商的后备方案进行复用。

对于帖子级别的 X 指标（如转发、回复、书签或浏览量），请优先使用
`x_search` 并配合精确的帖子 URL 或状态 ID，而不是使用宽泛的搜索
查询。

## 新手引导和配置

如果您在此过程中选择 **Grok**：

- `openclaw onboard`
- `openclaw configure --section web`

OpenClaw 可以使用现有的 xAI OAuth 配置文件，而无需提示输入单独的
网络搜索密钥。如果 OAuth 不可用，它将回退到 xAI API 密钥设置。
OpenClaw 还可以显示一个单独的后续步骤，以便使用
相同的 xAI 凭证启用 `x_search`。该后续步骤：

- 仅在您选择 Grok 作为 `web_search` 后才会出现
- 不是一个单独的顶级网络搜索提供商选项
- 可以选择在同一流程中设置 `x_search` 模型

如果您跳过此步骤，稍后可以在配置中启用或更改 `x_search`。

## 登录或获取 API 密钥

<Steps>
  <Step title="使用 xAI OAuth">
    如果您在新手引导或模型认证期间已通过 xAI 登录，请选择
    Grok 作为 `web_search` 提供商。无需单独的 API 密钥：

    ```bash
    openclaw onboard --auth-choice xai-oauth
    openclaw config set tools.web.search.provider grok
    ```

  </Step>
  <Step title="使用 API 密钥后备方案">
    当 API 不可用，或者您
    故意想要使用基于密钥的网络搜索配置时，从 [xAI](https://console.x.ai/) 获取 OAuth 密钥。
  </Step>
  <Step title="存储密钥">
    在 Gateway(网关) 环境中设置 `XAI_API_KEY`Gateway(网关)，或通过以下方式配置：

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
            apiKey: "xai-...", // optional if xAI OAuth or XAI_API_KEY is available
            baseUrl: "https://api.x.ai/v1", // optional Responses API proxy/base URL override
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

**凭证备选方案：** 在 Gateway(网关) 环境中使用 `openclaw models auth login
--提供商 xai --method oauth`, set `Gateway(网关)XAI_API_KEY` 登录，
或存储 `plugins.entries.xai.config.webSearch.apiKey`。对于 gateway 安装，
请将环境变量放入 `~/.openclaw/.env` 中。

## 工作原理

Grok 使用 xAI 基于网络的响应来合成带有行内引用的答案，类似于 Gemini 的 Google Search 接地方法。

## 支持的参数

Grok 搜索支持 `query`。

`count` 被接受以实现共享 `web_search` 兼容性，但 Grok 仍会返回一个包含引用的合成答案，而不是 N 个结果的列表。

目前不支持特定于提供商的过滤器。

Grok 使用特定于提供商的 60 秒默认超时，因为 xAI Responses 的网络落地搜索可能比共享 `web_search` 默认值运行更长时间。设置 `tools.web.search.timeoutSeconds` 可覆盖它。

## 基础 URL 覆盖

当 Grok 网络搜索应通过操作员代理或 xAI 兼容的 Responses 端点路由时，设置 `plugins.entries.xai.config.webSearch.baseUrl`OpenClaw。OpenClaw 在去除尾部斜杠后发布到 `<baseUrl>/responses`。`x_search` 使用相同的 `webSearch.baseUrl` 回退，除非设置了 `plugins.entries.xai.config.xSearch.baseUrl`。

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Web Search 中的 x_search](/zh/tools/web#x_search) -- 通过 xAI 进行一流的 X 搜索
- [Gemini Search](/zh/tools/gemini-search) -- 通过 Google 落地技术获取 AI 合成的答案
