---
summary: "Ollama配置官方外部 LanceDB 记忆插件，包括本地 Ollama 兼容的嵌入"
read_when:
  - You are configuring the memory-lancedb plugin
  - You want LanceDB-backed long-term memory with auto-recall or auto-capture
  - You are using local OpenAI-compatible embeddings such as Ollama
title: "Memory LanceDB"
sidebarTitle: "Memory LanceDB"
---

`memory-lancedb` 是一个官方外部记忆插件，用于将长期记忆存储在 LanceDB 中，并使用嵌入进行召回。它可以在模型轮次之前自动召回相关记忆，并在响应后捕获重要事实。

当您想要用于记忆的本地向量数据库，需要 OpenAI 兼容的嵌入端点，或者想要将记忆数据库保留在默认内置记忆存储之外时，请使用它。

## 安装

设置 `plugins.slots.memory = "memory-lancedb"` 之前，请先安装 `memory-lancedb`：

```bash
openclaw plugins install @openclaw/memory-lancedb
```

该插件已发布到 npm，并未打包到 OpenClaw 运行时镜像中。当没有其他插件拥有记忆插槽时，安装程序会写入插件条目并切换记忆插槽。

<Note>`memory-lancedb` 是一个活动记忆插件。通过使用 `plugins.slots.memory = "memory-lancedb"` 选择记忆插槽来启用它。诸如 `memory-wiki` 之类的伴随插件可以在其旁边运行，但只有一个插件拥有活动记忆插槽。</Note>

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

更改插件配置后，请重启 Gateway(网关)：

```bash
openclaw gateway restart
```

然后验证插件是否已加载：

```bash
openclaw plugins list
```

## 提供商支持的嵌入

`memory-lancedb` 可以使用与 `memory-core` 相同的记忆嵌入提供商适配器。设置 `embedding.provider` 并省略 `embedding.apiKey`，以使用提供商配置的身份验证配置文件、环境变量或 `models.providers.<provider>.apiKey`。

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

此路径适用于暴露嵌入凭据的提供商身份验证配置文件。例如，当 Copilot 配置文件/计划支持嵌入时，可以使用 GitHub Copilot：

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

OpenAI Codex / ChatGPT OAuth (OpenAIOAuth`openai-codex`OpenAIOpenAIOpenAIAPI) 不是 OpenAI Platform
embeddings 凭证。对于 OpenAI embeddings，请使用 OpenAI API 密钥身份验证配置文件，
`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`OAuthGitHubOllama。仅使用 OAuth 的用户可以使用
其他支持 embeddings 的提供商，例如 GitHub Copilot 或 Ollama。

## Ollama embeddings

对于 Ollama embeddings，首选捆绑的 Ollama embedding 提供商。它使用
原生 Ollama OllamaOllamaOllama`/api/embed`OllamaOllama 端点，并遵循与 [Ollama](/zh/providers/ollama) 文档中
Ollama 提供商相同的身份验证/基础 URL 规则。

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

对于非标准 embedding 模型，请设置 `dimensions`OpenClaw。OpenClaw 知道
`text-embedding-3-small` 和 `text-embedding-3-large` 的维度；
自定义模型需要在配置中提供该值，以便 LanceDB 可以创建向量列。

对于小型本地 embedding 模型，如果您从本地服务器看到上下文
长度错误，请降低 `recallMaxChars`。

## OpenAI-compatible providers

某些 OpenAI-compatible embedding 提供商会拒绝 OpenAI`encoding_format`
参数，而其他提供商会忽略它并始终返回 `number[]` 向量。
因此，`memory-lancedb` 会在 embedding 请求中省略 `encoding_format`，
并接受浮点数组响应或 base64 编码的 float32 响应。

如果您有一个没有捆绑提供商适配器的原始 OpenAI-compatible embeddings 端点，请省略 OpenAI`embedding.provider`（或将其保留为 `openai`）并
设置 `embedding.apiKey` 加上 `embedding.baseUrl`OpenAI。这保留了直接
的 OpenAI-compatible 客户端路径。

针对模型维度未内置的提供商，请设置 `embedding.dimensions`。例如，ZhiPu `embedding-3` 使用 `2048` 维度：

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

`memory-lancedb` 有两个独立的文本限制：

| 设置              | 默认值 | 范围      | 应用于                       |
| ----------------- | ------ | --------- | ---------------------------- |
| `recallMaxChars`  | `1000` | 100-10000 | 发送到召回用嵌入 API 的文本  |
| `captureMaxChars` | `500`  | 100-10000 | 符合自动捕获条件的消息长度   |
| `customTriggers`  | `[]`   | 0-50      | 使自动捕获考虑消息的字面短语 |

`recallMaxChars` 控制自动召回、`memory_recall` 工具、`memory_forget` 查询路径和 `openclaw ltm search`。自动召回优先使用来自本轮的最新用户消息，仅在没有可用用户消息时才回退到完整提示。这可以将渠道元数据和大型提示块排除在嵌入请求之外。

`captureMaxChars` 控制响应是否足够短以被考虑进行自动捕获。它不限制召回查询嵌入。

`customTriggers` 允许您添加字面自动捕获短语，而无需编写正则表达式。内置触发器包括常见的英语、捷克语、中文、日语和韩语记忆短语。

## 命令

当 `memory-lancedb` 是活动内存插件时，它会注册 `ltm` CLI 命名空间：

```bash
openclaw ltm list
openclaw ltm search "project preferences"
openclaw ltm stats
```

该插件还扩展了 `openclaw memory`，增加了一个非向量 `query` 子命令，该子命令直接对 LanceDB 表运行：

```bash
openclaw memory query --cols id,text,createdAt --limit 20
openclaw memory query --filter "category = 'preference'" --order-by createdAt:desc
```

- `--cols <columns>`：逗号分隔的列允许列表（默认为 `id`、`text`、`importance`、`category`、`createdAt`）。
- `--filter <condition>`：SQL 风格的 WHERE 子句；限制为 200 个字符，且仅限于字母数字、比较运算符、引号、括号和一小部分安全标点符号。
- `--limit <n>`：正整数；默认值为 `10`。
- `--order-by <column>:<asc|desc>`：在筛选后应用的内存排序；排序列会自动包含在投影中。

代理还可以从活动的内存插件获取 LanceDB 记忆工具：

- `memory_recall` 用于 LanceDB 支持的召回
- `memory_store` 用于保存重要事实、偏好、决策和实体
- `memory_forget` 用于移除匹配的记忆

## 存储

默认情况下，LanceDB 数据存储在 `~/.openclaw/memory/lancedb` 下。使用
`dbPath` 覆盖路径：

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

`storageOptions` 接受 LanceDB 存储后端的字符串键/值对，并
支持 `${ENV_VAR}` 扩展：

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

`memory-lancedb` 依赖于原生的 `@lancedb/lancedb` 包。打包的
OpenClaw 将该包视为插件包的一部分。Gateway(网关) 启动
不会修复插件依赖项；如果缺少依赖项，请重新安装或
更新插件包并重启 Gateway(网关)。

如果旧版本安装记录了缺少 `dist/package.json` 或缺少
`@lancedb/lancedb` 的错误，请升级 OpenClaw 并重启
Gateway(网关)。

如果插件记录显示 LanceDB 在 `darwin-x64` 上不可用，请在该计算机上使用默认
内存后端，将 Gateway(网关) 移至受支持的平台，或
禁用 `memory-lancedb`。

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

对于 Ollama，还要验证嵌入服务器可从 Gateway(网关) 主机访问：

```bash
curl http://127.0.0.1:11434/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"mxbai-embed-large","input":"hello"}'
```

### 不支持的嵌入模型

如果没有 `dimensions`，则仅已知内置的 OpenAI 嵌入维度。
对于本地或自定义嵌入模型，请将 `embedding.dimensions` 设置为该模型报告的向量
大小。

### 插件已加载但未显示任何记忆

检查 `plugins.slots.memory` 是否指向 `memory-lancedb`，然后运行：

```bash
openclaw ltm stats
openclaw ltm search "recent preference"
```

如果 `autoCapture` 被禁用，插件将回显现有记忆，但
不会自动存储新记忆。如果需要自动捕获，请使用 `memory_store` 工具或启用
`autoCapture`。

## 相关

- [记忆概述](/zh/concepts/memory)
- [活跃记忆](/zh/concepts/active-memory)
- [记忆搜索](/zh/concepts/memory-search)
- [记忆 Wiki](/zh/plugins/memory-wiki)
- [Ollama](/zh/providers/ollama)
