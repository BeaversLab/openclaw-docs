---
summary: "默认的基于 SQLite 的内存后端，支持关键词、向量和混合搜索"
title: "内置内存引擎"
read_when:
  - You want to understand the default memory backend
  - You want to configure embedding providers or hybrid search
---

内置引擎是默认的内存后端。它将你的内存索引存储在每个代理专用的 SQLite 数据库中，无需额外的依赖即可开始使用。

## 功能特性

- 通过 FTS5 全文索引（BM25 评分）实现的**关键词搜索**。
- 通过任何支持的提供商的嵌入向量实现的**向量搜索**。
- 结合两者以获得最佳结果的**混合搜索**。
- 通过针对中文、日文和韩文的三元组分词实现的**中日韩 (CJK) 支持**。
- 用于数据库内向量查询的 **sqlite-vec 加速**（可选）。

## 入门指南

如果你拥有 API、Gemini、Voyage 或 Mistral 的 API 密钥，内置引擎会自动检测并启用向量搜索。无需配置。

要显式设置提供商：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
      },
    },
  },
}
```

如果没有嵌入提供商，则仅提供关键词搜索。

要强制使用内置本地嵌入提供商，请在 OpenClaw 旁边安装可选的 `node-llama-cpp` 运行时包，然后将 `local.modelPath` 指向 GGUF 文件：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "local",
        fallback: "none",
        local: {
          modelPath: "~/.node-llama-cpp/models/embeddinggemma-300m-qat-Q8_0.gguf",
        },
      },
    },
  },
}
```

## Supported embedding providers

| Provider | ID        | Auto-detected | Notes                               |
| -------- | --------- | ------------- | ----------------------------------- |
| OpenAI   | `openai`  | Yes           | 默认：`text-embedding-3-small`      |
| Gemini   | `gemini`  | Yes           | Supports multimodal (image + audio) |
| Voyage   | `voyage`  | Yes           |                                     |
| Mistral  | `mistral` | Yes           |                                     |
| Ollama   | `ollama`  | No            | Local, set explicitly               |
| Local    | `local`   | Yes (first)   | 可选的 `node-llama-cpp` 运行时      |

自动检测会按显示顺序，选取第一个可解析 API 密钥的提供商。设置 `memorySearch.provider` 以覆盖。

## How indexing works

OpenClaw 将 `MEMORY.md` 和 `memory/*.md` 索引为分块（约 400 个 token，具有 80 个 token 的重叠）并将它们存储在每个代理专用的 SQLite 数据库中。

- **索引位置：** `~/.openclaw/memory/<agentId>.sqlite`
- **存储维护：** SQLite WAL 附属文件受定期和关闭检查点限制。
- **文件监视：** 内存文件的更改会触发防抖重新索引（1.5 秒）。
- **自动重新索引：** 当嵌入提供商、模型或分块配置发生更改时，整个索引会自动重建。
- **按需重新索引：** `openclaw memory index --force`

<Info>您还可以使用 `memorySearch.extraPaths` 对工作区之外的 Markdown 文件进行索引。请参阅 [配置参考](/zh/reference/memory-config#additional-memory-paths)。</Info>

## 何时使用

对于大多数用户而言，内置引擎是正确的选择：

- 开箱即用，无需额外依赖。
- 能够很好地处理关键字和向量搜索。
- 支持所有嵌入提供商。
- 混合搜索结合了两种检索方法的优势。

如果您需要重排序（reranking）、查询扩展，或者想要索引工作区之外的目录，请考虑切换到 [QMD](/zh/concepts/memory-qmd)。

如果您需要具有自动用户建模的跨会话记忆，请考虑使用 [Honcho](/zh/concepts/memory-honcho)。

## 故障排除

**记忆搜索已禁用？** 检查 `openclaw memory status`。如果未检测到提供商，
请显式设置一个或添加 API 密钥。

**未检测到本地提供商？** 确认本地路径存在并运行：

```bash
openclaw memory status --deep --agent main
openclaw memory index --force --agent main
```

独立的 CLI 命令和 Gateway(网关) 使用相同的 `local` 提供商 ID。
如果提供商设置为 `auto`，则仅当 `memorySearch.local.modelPath` 指向现有的本地文件时，才会优先考虑本地嵌入。

**结果过时？** 运行 `openclaw memory index --force` 以进行重建。监视程序
在极少数边缘情况下可能会遗漏更改。

**sqlite-vec 未加载？** OpenClaw 会自动回退到进程内余弦相似度
计算。请检查日志以获取具体的加载错误。

## 配置

有关嵌入提供商设置、混合搜索调整（权重、MMR、时间
衰减）、批量索引、多模态记忆、sqlite-vec、额外路径以及所有
其他配置选项，请参阅
[记忆配置参考](/zh/reference/memory-config)。

## 相关

- [记忆概述](/zh/concepts/memory)
- [记忆搜索](/zh/concepts/memory-search)
- [活动记忆](/zh/concepts/active-memory)
