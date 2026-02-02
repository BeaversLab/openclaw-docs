---
summary: "OpenClaw memory 工作方式（工作区文件 + 自动 memory flush）"
read_when:
  - 想了解 memory 文件布局与工作流程
  - 想调整自动预压缩的 memory flush
title: "记忆（Memory）"
---
# 记忆（Memory）

OpenClaw 的 memory 是**agent 工作区中的纯 Markdown**。文件是事实来源；模型只会“记住”写入磁盘的内容。

Memory 搜索工具由激活的 memory 插件提供（默认：`memory-core`）。使用 `plugins.slots.memory = "none"` 禁用 memory 插件。

## Memory 文件（Markdown）

默认工作区布局包含两层 memory：

- `memory/YYYY-MM-DD.md`
  - 每日日志（只追加）。
  - 会话开始时读取今天 + 昨天。
- `MEMORY.md`（可选）
  - 精选的长期记忆。
  - **仅在主私聊会话中加载**（绝不在群上下文中加载）。

这些文件位于工作区（`agents.defaults.workspace`，默认 `~/.openclaw/workspace`）。完整布局参见 [Agent workspace](/zh/concepts/agent-workspace)。

## 何时写入 memory

- 决策、偏好与持久事实写入 `MEMORY.md`。
- 日常记录与运行上下文写入 `memory/YYYY-MM-DD.md`。
- 有人说“记住这个”，就写下来（不要只放在 RAM）。
- 这部分仍在演进；提醒模型存储记忆会有帮助。
- 如果你希望某事保留下来，**请让 bot 把它写进 memory**。

## 自动 memory flush（预压缩 ping）

当会话**接近自动压缩**时，OpenClaw 会触发一次**静默、具备 agent 性的回合**，提醒模型在压缩前写入持久记忆。默认提示明确写道模型*可以回复*，但通常 `NO_REPLY` 才是正确响应，这样用户不会看到该回合。

该行为由 `agents.defaults.compaction.memoryFlush` 控制：

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  }
}
```

细节：
- **软阈值**：当会话 token 估计超过 `contextWindow - reserveTokensFloor - softThresholdTokens` 时触发。
- **默认静默**：提示包含 `NO_REPLY`，因此不会对用户可见。
- **双提示**：用户提示 + system prompt 共同附加提醒。
- **每个压缩周期仅一次 flush**（在 `sessions.json` 中追踪）。
- **工作区必须可写**：若会话在 sandbox 中且 `workspaceAccess: "ro"` 或 `"none"`，则跳过 flush。

完整压缩生命周期参见
[Session management + compaction](/zh/reference/session-management-compaction)。

## Vector memory search

OpenClaw 可为 `MEMORY.md` 与 `memory/*.md`（以及你额外选择的目录/文件）构建小型向量索引，使语义查询能在措辞不同的情况下找到相关笔记。

默认：
- 默认启用。
- 监控 memory 文件变化（去抖）。
- 默认使用远程 embeddings。若未设置 `memorySearch.provider`，OpenClaw 会自动选择：
  1. 若配置了 `memorySearch.local.modelPath` 且文件存在，则使用 `local`。
  2. 若可解析 OpenAI key，则使用 `openai`。
  3. 若可解析 Gemini key，则使用 `gemini`。
  4. 否则 memory search 保持禁用直至配置。
- 本地模式使用 node-llama-cpp，可能需要 `pnpm approve-builds`。
- 可用时使用 sqlite-vec 来加速 SQLite 内部向量搜索。

远程 embeddings **必须**提供 embedding provider 的 API key。OpenClaw 从 auth profiles、`models.providers.*.apiKey` 或环境变量中解析。Codex OAuth 仅覆盖 chat/completions，**不**满足 memory search 的 embeddings。Gemini 使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`。使用自定义 OpenAI 兼容端点时，设置 `memorySearch.remote.apiKey`（以及可选 `memorySearch.remote.headers`）。

### 额外 memory 路径

若需索引默认工作区布局之外的 Markdown，添加显式路径：

```json5
agents: {
  defaults: {
    memorySearch: {
      extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"]
    }
  }
}
```

注：
- 路径可为绝对或工作区相对路径。
- 目录将递归扫描 `.md` 文件。
- 仅索引 Markdown 文件。
- 忽略 symlink（文件或目录）。

### Gemini embeddings（原生）

将 provider 设为 `gemini` 可直接使用 Gemini embeddings API：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-001",
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

注：
- `remote.baseUrl` 可选（默认 Gemini API base URL）。
- `remote.headers` 可添加额外 headers。
- 默认模型：`gemini-embedding-001`。

若要使用**自定义 OpenAI 兼容端点**（OpenRouter、vLLM 或代理），可使用 OpenAI provider 的 `remote` 配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_OPENAI_COMPAT_API_KEY",
        headers: { "X-Custom-Header": "value" }
      }
    }
  }
}
```

若不想设置 API key，请使用 `memorySearch.provider = "local"` 或设置 `memorySearch.fallback = "none"`。

Fallbacks：
- `memorySearch.fallback` 可为 `openai`、`gemini`、`local` 或 `none`。
- 仅当主 embedding provider 失败时才使用 fallback provider。

批量索引（OpenAI + Gemini）：
- OpenAI 与 Gemini embeddings 默认启用批量。设置 `agents.defaults.memorySearch.remote.batch.enabled = false` 关闭。
- 默认行为等待批处理完成；可调 `remote.batch.wait`、`remote.batch.pollIntervalMs`、`remote.batch.timeoutMinutes`。
- 通过 `remote.batch.concurrency` 控制并行提交的批处理数量（默认：2）。
- 当 `memorySearch.provider = "openai"` 或 `"gemini"` 时启用批量，并使用相应 API key。
- Gemini 批处理使用 async embeddings batch 端点，需 Gemini Batch API 可用。

为什么 OpenAI 批量又快又便宜：
- 对大规模回填，OpenAI 通常是我们支持的最快选项，因为可以提交大量 embedding 请求到单个批处理作业，由 OpenAI 异步处理。
- OpenAI 对 Batch API 工作负载提供折扣定价，因此大规模索引通常比同步请求更便宜。
- 详情参见 OpenAI Batch API 文档与价格：
  - https://platform.openai.com/docs/api-reference/batch
  - https://platform.openai.com/pricing

配置示例：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      fallback: "openai",
      remote: {
        batch: { enabled: true, concurrency: 2 }
      },
      sync: { watch: true }
    }
  }
}
```

工具：
- `memory_search` — 返回带文件 + 行范围的片段。
- `memory_get` — 按路径读取 memory 文件内容。

本地模式：
- 设置 `agents.defaults.memorySearch.provider = "local"`。
- 提供 `agents.defaults.memorySearch.local.modelPath`（GGUF 或 `hf:` URI）。
- 可选：设置 `agents.defaults.memorySearch.fallback = "none"` 以避免远程兜底。

### memory 工具如何工作

- `memory_search` 会对 `MEMORY.md` + `memory/**/*.md` 的 Markdown chunk（目标 ~400 token，80-token 重叠）做语义搜索。返回片段文本（上限 ~700 字符）、文件路径、行范围、分数、provider/model，以及是否从本地 → 远程 embeddings 发生 fallback。不返回完整文件内容。
- `memory_get` 读取指定 memory Markdown 文件（工作区相对路径），可指定起始行与 N 行数。仅当路径显式列在 `memorySearch.extraPaths` 中时才允许 `MEMORY.md` / `memory/` 之外的路径。
- 两个工具仅在 `memorySearch.enabled` 对该 agent 解析为 true 时启用。

### 索引内容（与时机）

- 文件类型：仅 Markdown（`MEMORY.md`、`memory/**/*.md`，以及 `memorySearch.extraPaths` 下的 `.md` 文件）。
- 索引存储：每个 agent 的 SQLite 位于 `~/.openclaw/memory/<agentId>.sqlite`（可通过 `agents.defaults.memorySearch.store.path` 配置，支持 `{agentId}` token）。
- 新鲜度：监控 `MEMORY.md`、`memory/` 与 `memorySearch.extraPaths`，将索引标记为 dirty（1.5s 去抖）。同步在会话开始、搜索时或按间隔调度并异步执行。会话转录用 delta 阈值触发后台同步。
- 重新索引触发：索引存储 embedding **provider/model + endpoint 指纹 + 分块参数**。任一变化时，OpenClaw 会自动重置并重建全量索引。

### Hybrid search（BM25 + 向量）

启用时，OpenClaw 结合：
- **向量相似度**（语义匹配，可不同措辞）
- **BM25 关键词相关性**（精确 token 如 ID、env vars、代码符号）

若平台不可用全文搜索，OpenClaw 会退回到仅向量搜索。

#### 为什么混合？

向量搜索擅长“意思相同”：
- “Mac Studio gateway host” vs “the machine running the gateway”
- “debounce file updates” vs “avoid indexing on every write”

但对精确、高信号 token 较弱：
- IDs（`a828e60`、`b3b9895a…`）
- 代码符号（`memorySearch.query.hybrid`）
- 错误字符串（“sqlite-vec unavailable”）

BM25（全文）相反：精确 token 很强，对改写较弱。
混合搜索是务实折中：**同时使用两种检索信号**，让“自然语言”与“针尖”查询都获得好结果。

#### 我们如何合并结果（当前设计）

实现草图：

1) 从两侧取候选池：
- **Vector**：按余弦相似度取 top `maxResults * candidateMultiplier`。
- **BM25**：按 FTS5 BM25 rank（越低越好）取 top `maxResults * candidateMultiplier`。

2) 将 BM25 rank 转为 0..1-ish 分数：
- `textScore = 1 / (1 + max(0, bm25Rank))`

3) 按 chunk id 去重合并候选并计算加权分数：
- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

注：
- `vectorWeight` + `textWeight` 在配置解析时会归一到 1.0，因此权重可视作百分比。
- 若 embeddings 不可用（或 provider 返回零向量），我们仍运行 BM25 并返回关键词匹配。
- 若 FTS5 无法创建，则保持仅向量搜索（无硬失败）。

这并非 “IR-theory perfect”，但简单、快速，并倾向于提升真实笔记上的召回/精度。
若要更复杂，常见下一步是 Reciprocal Rank Fusion (RRF) 或在混合前做分数归一化（min/max 或 z-score）。

配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      query: {
        hybrid: {
          enabled: true,
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateMultiplier: 4
        }
      }
    }
  }
}
```

### Embedding 缓存

OpenClaw 可将**chunk embeddings** 缓存到 SQLite，使重建索引与频繁更新（尤其是会话转录）不会重复嵌入未变更文本。

配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      cache: {
        enabled: true,
        maxEntries: 50000
      }
    }
  }
}
```

### Session memory search（实验）

你可以选择性索引**会话转录**并通过 `memory_search` 暴露。该功能受实验 flag 保护。

```json5
agents: {
  defaults: {
    memorySearch: {
      experimental: { sessionMemory: true },
      sources: ["memory", "sessions"]
    }
  }
}
```

注：
- 会话索引为**可选**（默认关闭）。
- 会话更新去抖后**异步索引**，在跨过 delta 阈值后执行（best-effort）。
- `memory_search` 不会阻塞等待索引；结果可能在后台同步完成前略旧。
- 仍仅返回片段；`memory_get` 仍仅限 memory 文件。
- 会话索引按 agent 隔离（仅索引该 agent 的会话日志）。
- 会话日志保存在磁盘（`~/.openclaw/agents/<agentId>/sessions/*.jsonl`）。任何有文件系统访问的进程/用户都可读取，因此把磁盘访问视为信任边界。需要更强隔离时，用不同 OS 用户或主机运行 agent。

Delta 阈值（默认值）：

```json5
agents: {
  defaults: {
    memorySearch: {
      sync: {
        sessions: {
          deltaBytes: 100000,   // ~100 KB
          deltaMessages: 50     // JSONL lines
        }
      }
    }
  }
}
```

### SQLite 向量加速（sqlite-vec）

当 sqlite-vec 扩展可用时，OpenClaw 会将 embeddings 存在 SQLite 虚拟表（`vec0`）中，并在数据库内执行向量距离查询。这让搜索更快，无需将所有 embeddings 加载到 JS。

配置（可选）：

```json5
agents: {
  defaults: {
    memorySearch: {
      store: {
        vector: {
          enabled: true,
          extensionPath: "/path/to/sqlite-vec"
        }
      }
    }
  }
}
```

注：
- `enabled` 默认 true；关闭时搜索退回到进程内的余弦相似度。
- 若 sqlite-vec 扩展缺失或加载失败，OpenClaw 记录错误并继续使用 JS 兜底（无向量表）。
- `extensionPath` 可覆盖内置 sqlite-vec 路径（用于自定义构建或非标准安装位置）。

### 本地 embedding 自动下载

- 默认本地 embedding 模型：`hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf`（约 0.6 GB）。
- 当 `memorySearch.provider = "local"` 时，`node-llama-cpp` 解析 `modelPath`；若 GGUF 缺失，将**自动下载**到缓存（或 `local.modelCacheDir` 指定位置），然后加载。下载可断点续传。
- 原生构建要求：运行 `pnpm approve-builds`，选择 `node-llama-cpp`，再执行 `pnpm rebuild node-llama-cpp`。
- 兜底：若本地配置失败且 `memorySearch.fallback = "openai"`，会自动切换到远程 embeddings（默认 `openai/text-embedding-3-small`，除非覆盖）并记录原因。

### 自定义 OpenAI 兼容端点示例

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "openai",
      model: "text-embedding-3-small",
      remote: {
        baseUrl: "https://api.example.com/v1/",
        apiKey: "YOUR_REMOTE_API_KEY",
        headers: {
          "X-Organization": "org-id",
          "X-Project": "project-id"
        }
      }
    }
  }
}
```

注：
- `remote.*` 优先于 `models.providers.openai.*`。
- `remote.headers` 与 OpenAI headers 合并；冲突时 remote 优先。省略 `remote.headers` 则使用 OpenAI 默认值。
