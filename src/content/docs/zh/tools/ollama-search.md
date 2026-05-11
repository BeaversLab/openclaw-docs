---
summary: "通过本地 Ollama 主机或托管 Ollama API 进行 Ollama 网络搜索"
read_when:
  - You want to use Ollama for web_search
  - You want a key-free web_search provider
  - You want to use hosted Ollama Web Search with OLLAMA_API_KEY
  - You need Ollama Web Search setup guidance
title: "Ollama 网络搜索"
---

OpenClaw 支持 **Ollama Web Search** 作为一个内置的 `web_search` 提供商。它
使用 Ollama 的网络搜索 API，并返回包含标题、URL
和片段的结构化结果。

对于本地或自托管的 Ollama，此设置默认
不需要 API 密钥。它确实需要：

- 一个可从 OpenClaw 访问的 Ollama 主机
- `ollama signin`

对于直接托管搜索，请将 Ollama 提供商的基础 URL 设置为 `https://ollama.com`
并提供一个真实的 `OLLAMA_API_KEY`。

## 设置

<Steps>
  <Step title="启动 Ollama">
    确保已安装并正在运行 Ollama。
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
  plugins: {
    entries: {
      ollama: {
        config: {
          webSearch: {
            baseUrl: "http://ollama-host:11434",
          },
        },
      },
    },
  },
}
```

如果您已将 Ollama 配置为模型提供商，网络搜索提供商可以
改为重用该主机：

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

Ollama 模型提供商使用 `baseUrl` 作为规范键。网络搜索提供商也会遵从 `models.providers.ollama` 上的 `baseURL`，以兼容 OpenAI SDK 风格的配置示例。

如果未设置明确的 Ollama 基础 URL，OpenClaw 将使用 `http://127.0.0.1:11434`。

如果您的 Ollama 主机需要 bearer 认证，OpenClaw 将
重用 `models.providers.ollama.apiKey`（或匹配的 env-backed 提供商认证）
向该配置主机的请求。

直接托管的 Ollama Web Search：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

## 注意

- 此提供商不需要特定的网络搜索 API 密钥字段。
- 如果 Ollama 主机受认证保护，OpenClaw 将
  在存在时重用常规的 Ollama 提供商 API 密钥。
- 如果 `baseUrl` 是 `https://ollama.com`，OpenClaw 将
  直接调用 `https://ollama.com/api/web_search` 并将配置的 Ollama
  API 密钥作为 bearer 认证发送。
- 如果配置的主机不暴露网络搜索且设置了 `OLLAMA_API_KEY`，
  OpenClaw 可以回退到 `https://ollama.com/api/web_search`，而无需
  将该环境密钥发送到本地主机。
- 如果在设置期间 OpenClaw 无法访问或未登录，
  Ollama 会发出警告，但这不会阻止选择。
- 当未配置更高级别的凭据提供商时，运行时自动检测可以回退到 Ollama 网络搜索。
- 本地 Ollama 守护进程主机使用本地代理端点
  `/api/experimental/web_search`，该端点会对请求进行签名并转发到 Ollama 云。
- `https://ollama.com` 主机直接通过不记名 API 密钥身份验证
  使用公共托管端点 `/api/web_search`。

## 相关

- [Web Search overview](/zh/tools/web) -- 所有提供商和自动检测
- [Ollama](/zh/providers/ollama) -- Ollama 模型设置和云/本地模式
