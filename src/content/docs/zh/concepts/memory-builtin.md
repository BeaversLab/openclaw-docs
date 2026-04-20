---
title: "Builtin Memory Engine"
summary: "The default SQLite-based memory backend with keyword, vector, and hybrid search"
read_when:
  - You want to understand the default memory backend
  - You want to configure embedding providers or hybrid search
---

# Builtin Memory Engine

The builtin engine is the default memory backend. It stores your memory index in
a per-agent SQLite database and needs no extra dependencies to get started.

## What it provides

- **Keyword search** via FTS5 full-text indexing (BM25 scoring).
- **Vector search** via embeddings from any supported 提供商.
- **Hybrid search** that combines both for best results.
- **CJK support** via trigram tokenization for Chinese, Japanese, and Korean.
- **sqlite-vec acceleration** for in-database vector queries (optional).

## 入门指南

If you have an API key for OpenAI, Gemini, Voyage, or Mistral, the builtin
engine auto-detects it and enables vector search. No config needed.

To set a 提供商 explicitly:

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

Without an embedding 提供商, only keyword search is available.

## Supported embedding providers

| Provider | ID        | Auto-detected | Notes                               |
| -------- | --------- | ------------- | ----------------------------------- |
| OpenAI   | `openai`  | Yes           | Default: `text-embedding-3-small`   |
| Gemini   | `gemini`  | Yes           | Supports multimodal (image + audio) |
| Voyage   | `voyage`  | Yes           |                                     |
| Mistral  | `mistral` | Yes           |                                     |
| Ollama   | `ollama`  | No            | Local, set explicitly               |
| Local    | `local`   | Yes (first)   | GGUF 模型, ~0.6 GB download         |

Auto-detection picks the first 提供商 whose API key can be resolved, in the
order shown. Set `memorySearch.provider` to override.

## How indexing works

OpenClaw indexes `MEMORY.md` and `memory/*.md` into chunks (~400 tokens with
80-token overlap) and stores them in a per-agent SQLite database.

- **Index location:** `~/.openclaw/memory/<agentId>.sqlite`
- **File watching:** changes to memory files trigger a debounced reindex (1.5s).
- **Auto-reindex:** when the embedding 提供商, 模型, or chunking config
  changes, the entire index is rebuilt automatically.
- **Reindex on demand:** `openclaw memory index --force`

<Info>您也可以使用 `memorySearch.extraPaths` 对工作区之外的 Markdown 文件进行索引。请参阅 [配置参考](/zh/reference/memory-config#additional-memory-paths)。</Info>

## 何时使用

对于大多数用户而言，内置引擎是正确的选择：

- 开箱即用，无需额外的依赖项。
- 能够很好地处理关键词和向量搜索。
- 支持所有嵌入提供商。
- 混合搜索结合了两种检索方法的优点。

如果您需要重排序、查询扩展，或者希望对工作区之外的目录进行索引，请考虑切换到 [QMD](/zh/concepts/memory-qmd)。

如果您需要具有自动用户建模的跨会话记忆，请考虑使用 [Honcho](/zh/concepts/memory-honcho)。

## 故障排除

**内存搜索已禁用？** 请检查 `openclaw memory status`。如果未检测到提供商，请明确设置一个或添加 API 密钥。

**结果过时？** 请运行 `openclaw memory index --force` 进行重建。在极少数边缘情况下，监视器可能会遗漏更改。

**sqlite-vec 未加载？** OpenClaw 会自动回退到进程内余弦相似度。请检查日志以获取具体的加载错误。

## 配置

有关嵌入提供商设置、混合搜索调整（权重、MMR、时间衰减）、批量索引、多模态内存、sqlite-vec、额外路径以及所有其他配置选项，请参阅
[内存配置参考](/zh/reference/memory-config)。
