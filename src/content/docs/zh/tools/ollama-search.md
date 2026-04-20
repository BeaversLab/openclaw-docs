---
summary: "通过您配置的 Ollama 主机进行 Ollama Web Search"
read_when:
  - You want to use Ollama for web_search
  - You want a key-free web_search provider
  - You need Ollama Web Search setup guidance
title: "Ollama Web Search"
---

# Ollama Web Search

OpenClaw 支持 **Ollama Web Search** 作为捆绑的 `web_search` 提供商。
它使用 Ollama 的实验性 web-search API 并返回带有标题、URL 和片段的结构化结果。

与 Ollama 模型提供商不同，此设置默认情况下不需要 API 密钥。它确实需要：

- 一个 OpenClaw 可以访问的 Ollama 主机
- `ollama signin`

## 设置

<Steps>
  <Step title="启动 Ollama">
    确保 Ollama 已安装并正在运行。
  </Step>
  <Step title="登录">
    运行：

    ```bash
    ollama signin
    ```

  </Step>
  <Step title="选择 Ollama Web Search">
    运行：

    ```bash
    openclaw configure --section web
    ```

    然后选择 **Ollama Web Search** 作为提供商。

  </Step>
</Steps>

如果您已经在模型中使用 Ollama，Ollama Web Search 将重用同一配置的主机。

## 配置

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

可选的 Ollama 主机覆盖：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
      },
    },
  },
}
```

如果未设置显式的 Ollama 基础 URL，OpenClaw 将使用 `http://127.0.0.1:11434`。

如果您的 Ollama 主机需要 bearer 身份验证，OpenClaw 也会重用
`models.providers.ollama.apiKey`（或匹配的 env-backed 提供商身份验证）
用于 web-search 请求。

## 注意

- 此提供商不需要特定于 web-search 的 API 密钥字段。
- 如果 Ollama 主机受身份验证保护，当存在时，OpenClaw 将重用常规的 Ollama
  提供商 API 密钥。
- 如果在设置期间 Ollama 无法访问或未登录，OpenClaw 会发出警告，但
  它不会阻止选择。
- 当未配置更高优先级的凭据提供商时，运行时自动检测可以回退到 Ollama Web Search。
- 该提供商使用 Ollama 的实验性 `/api/experimental/web_search`
  端点。

## 相关

- [Web Search 概述](/zh/tools/web) -- 所有提供商和自动检测
- [Ollama](/zh/providers/ollama) -- Ollama 模型设置和云/本地模式
