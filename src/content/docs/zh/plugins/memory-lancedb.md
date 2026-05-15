---
summary: "Ollama配置捆绑的 LanceDB 记忆插件，包括本地 Ollama 兼容的嵌入"
read_when:
  - You are configuring the bundled memory-lancedb plugin
  - You want LanceDB-backed long-term memory with auto-recall or auto-capture
  - You are using local OpenAI-compatible embeddings such as Ollama
title: "Memory LanceDB"
sidebarTitle: "Memory LanceDB"
---

`memory-lancedb` 是一个捆绑的记忆插件，它将长期记忆存储在 LanceDB 中，并使用嵌入进行召回。它可以在模型轮次之前自动召回相关记忆，并在响应后捕获重要事实。

当您想要用于记忆的本地向量数据库，需要 OpenAI 兼容的嵌入端点，或者想要将记忆数据库保留在默认内置记忆存储之外时，请使用它。

<Note>`memory-lancedb` 是一个活动记忆插件。通过使用 `plugins.slots.memory = "memory-lancedb"` 选择记忆槽来启用它。伴随插件（如 `memory-wiki`）可以在其旁边运行，但只有一个插件拥有活动记忆槽。</Note>

## 快速开始

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

更改插件配置后重启 Gateway(网关)：

```bash
openclaw gateway restart
```

然后验证插件是否已加载：

```bash
openclaw plugins list
```

## 提供商支持的嵌入

`memory-lancedb` 可以使用与 `memory-core` 相同的记忆嵌入提供商适配器。设置 `embedding.provider` 并省略 `embedding.apiKey` 以使用提供商配置的身份验证配置文件、环境变量或 `models.providers.<provider>.apiKey`。

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "openai",
            model: "text-embedding-3-small",
          },
          autoRecall: true,
        },
      },
    },
  },
}
```

此路径适用于公开嵌入凭据的提供商身份验证配置文件。例如，当 Copilot 配置文件/计划支持嵌入时，可以使用 GitHub Copilot：

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "github-copilot",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

OpenAI Codex / ChatGPT OAuth (OpenAIOAuth`openai-codex`OpenAIOpenAIOpenAIAPI) 不是 OpenAI Platform 嵌入凭据。对于 OpenAI 嵌入，请使用 OpenAI API 密钥身份验证配置文件、`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`OAuthGitHubOllama。仅使用 OAuth 的用户可以使用其他支持嵌入的提供商，例如 GitHub Copilot 或 Ollama。

## Ollama 嵌入

对于 Ollama 嵌入，首选内置的 Ollama 嵌入提供商。它使用原生的 Ollama OllamaOllamaOllama`/api/embed`OllamaOllama 端点，并遵循与 [Ollama](/zh/providers/ollama) 中记录的 Ollama 提供商相同的认证/基础 URL 规则。

```json5
{
  plugins: {
    slots: {
      memory: "memory-lancedb",
    },
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            provider: "ollama",
            baseUrl: "http://127.0.0.1:11434",
            model: "mxbai-embed-large",
            dimensions: 1024,
          },
          recallMaxChars: 400,
          autoRecall: true,
          autoCapture: false,
        },
      },
    },
  },
}
```

对于非标准嵌入模型，请设置 `dimensions`OpenClaw。OpenClaw 知道 `text-embedding-3-small` 和 `text-embedding-3-large` 的维度；自定义模型需要在配置中提供该值，以便 LanceDB 可以创建向量列。

对于小型本地嵌入模型，如果您看到来自本地服务器的上下文长度错误，请降低 `recallMaxChars`。

## OpenAI 兼容提供商

一些 OpenAI 兼容的嵌入提供商会拒绝 OpenAI`encoding_format` 参数，而另一些则会忽略它并始终返回 `number[]` 向量。因此，`memory-lancedb` 会在嵌入请求中省略 `encoding_format`，并接受浮点数组响应或 base64 编码的 float32 响应。

如果您有一个没有内置提供商适配器的原始 OpenAI 兼容嵌入端点，请省略 OpenAI`embedding.provider`（或将其保留为 `openai`）并设置 `embedding.apiKey` 加上 `embedding.baseUrl`OpenAI。这保留了直接的 OpenAI 兼容客户端路径。

对于模型维度未内置的提供商，请设置 `embedding.dimensions`。例如，ZhiPu `embedding-3` 使用 `2048` 维度：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          embedding: {
            apiKey: "${ZHIPU_API_KEY}",
            baseUrl: "https://open.bigmodel.cn/api/paas/v4",
            model: "embedding-3",
            dimensions: 2048,
          },
        },
      },
    },
  },
}
```

## 召回和捕获限制

`memory-lancedb` 有两个单独的文本限制：

| 设置              | 默认值 | 范围      | 应用于                          |
| ----------------- | ------ | --------- | ------------------------------- |
| `recallMaxChars`  | `1000` | 100-10000 | 发送到嵌入 API 以进行召回的文本 |
| `captureMaxChars` | `500`  | 100-10000 | 符合捕获条件的助手消息长度      |

`recallMaxChars` 控制自动召回、`memory_recall` 工具、`memory_forget` 查询路径以及 `openclaw ltm search`。自动召回优先使用本轮对话中最新的用户消息，仅当没有用户消息时才回退到完整提示词。这可以将渠道元数据和大块提示词内容排除在嵌入请求之外。

`captureMaxChars` 控制响应是否足够短以被视为适合自动捕获。它不限制召回查询的嵌入。

## 命令

当 `memory-lancedb` 是活动的内存插件时，它会注册 `ltm` CLI 命名空间：

```bash
openclaw ltm list
openclaw ltm search "project preferences"
openclaw ltm stats
```

该插件还扩展了 `openclaw memory`，增加了一个非向量 `query` 子命令，该命令直接针对 LanceDB 表运行：

```bash
openclaw memory query --cols id,text,createdAt --limit 20
openclaw memory query --filter "category = 'preference'" --order-by createdAt:desc
```

- `--cols <columns>`：逗号分隔的列允许列表（默认为 `id`、`text`、`importance`、`category`、`createdAt`）。
- `--filter <condition>`：SQL 风格的 WHERE 子句；限制为 200 个字符，且仅限于字母数字、比较运算符、引号、括号和一小部分安全标点符号。
- `--limit <n>`：正整数；默认为 `10`。
- `--order-by <column>:<asc|desc>`：在过滤器之后应用的内存排序；排序列会自动包含在投影中。

代理还可以从活动的内存插件获取 LanceDB 内存工具：

- `memory_recall` 用于基于 LanceDB 的召回
- `memory_store` 用于保存重要事实、偏好、决策和实体
- `memory_forget` 用于移除匹配的记忆

## 存储

默认情况下，LanceDB 数据位于 `~/.openclaw/memory/lancedb` 之下。使用 `dbPath` 覆盖路径：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "~/.openclaw/memory/lancedb",
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

`storageOptions` 接受用于 LanceDB 存储后端的字符串键/值对，并支持 `${ENV_VAR}` 展开：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        enabled: true,
        config: {
          dbPath: "s3://memory-bucket/openclaw",
          storageOptions: {
            access_key: "${AWS_ACCESS_KEY_ID}",
            secret_key: "${AWS_SECRET_ACCESS_KEY}",
            endpoint: "${AWS_ENDPOINT_URL}",
          },
          embedding: {
            apiKey: "${OPENAI_API_KEY}",
            model: "text-embedding-3-small",
          },
        },
      },
    },
  },
}
```

## 运行时依赖

`memory-lancedb` 依赖于原生的 `@lancedb/lancedb` 包。打包的 OpenClaw 将该包视为插件包的一部分。Gateway(网关) 启动不会修复插件依赖关系；如果依赖项缺失，请重新安装或更新插件包并重启 Gateway(网关)。

如果旧版本安装记录在插件加载期间缺少 `dist/package.json` 或缺少 `@lancedb/lancedb` 的错误，请升级 OpenClaw 并重启 Gateway(网关)。

如果插件记录显示 LanceDB 在 `darwin-x64` 上不可用，请在该计算机上使用默认内存后端，将 Gateway(网关) 移至受支持的平台，或禁用 `memory-lancedb`。

## 故障排除

### 输入长度超过上下文长度

这通常意味着嵌入模型拒绝了召回查询：

```text
memory-lancedb: recall failed: Error: 400 the input length exceeds the context length
```

设置较低的 `recallMaxChars`，然后重启 Gateway(网关)：

```json5
{
  plugins: {
    entries: {
      "memory-lancedb": {
        config: {
          recallMaxChars: 400,
        },
      },
    },
  },
}
```

对于 Ollama，还要验证嵌入服务器是否可从 Gateway(网关) 主机访问：

```bash
curl http://127.0.0.1:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"mxbai-embed-large","input":"hello"}'
```

### 不支持的嵌入模型

如果没有 `dimensions`，则仅已知内置 OpenAI 嵌入维度。对于本地或自定义嵌入模型，请将 `embedding.dimensions` 设置为该模型报告的向量大小。

### 插件已加载但未显示记忆

检查 `plugins.slots.memory` 是否指向 `memory-lancedb`，然后运行：

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

如果禁用了 `autoCapture`，插件将召回现有记忆，但不会自动存储新记忆。如果您希望自动捕获，请使用 `memory_store` 工具或启用 `autoCapture`。

## 相关

- [内存概述](/zh/concepts/memory)
- [主动内存](/zh/concepts/active-memory)
- [内存搜索](/zh/concepts/memory-search)
- [内存 Wiki](/zh/plugins/memory-wiki)
- [Ollama](/zh/providers/ollama)
