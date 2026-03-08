---
summary: "OpenClaw 内存工作原理（工作区文件 + 自动内存刷新）"
read_when:
  - "您想了解内存文件布局和工作流程"
  - "您想调整自动压缩前的内存刷新"
---

# 内存

OpenClaw 内存是**代理工作区中的普通 Markdown 文件**。文件是唯一真实来源；模型只"记住"写入磁盘的内容。

内存搜索工具由活动的内存插件提供（默认：`memory-core`）。使用 `plugins.slots.memory = "none"` 禁用内存插件。

## 内存文件（Markdown）

默认工作区布局使用两个内存层：

- `memory/YYYY-MM-DD.md`
  - 每日日志（仅追加）。
  - 会话开始时读取今天和昨天的内容。
- `MEMORY.md`（可选）
  - 精选的长期记忆。
  - **仅在主私话会话中加载**（绝不在群组上下文中加载）。

这些文件位于工作区下（`agents.defaults.workspace`，默认 `~/clawd`）。完整布局请参阅[代理工作区](/zh/concepts/agent-workspace)。

## 何时写入内存

- 决策、偏好和持久性事实写入 `MEMORY.md`。
- 日常笔记和运行上下文写入 `memory/YYYY-MM-DD.md`。
- 如果有人说"记住这个"，请将其写下来（不要仅保存在 RAM 中）。
- 此功能仍在发展中。提醒模型存储记忆很有帮助；它知道该怎么做。
- 如果您希望某些内容被记住，**请让机器人将其写入**内存。

## 自动内存刷新（压缩前通知）

当会话**接近自动压缩**时，OpenClaw 会触发一个**静默的代理回合**，提醒模型在上下文被压缩**之前**写入持久性记忆。默认提示明确说明模型_可以回复_，但通常 `NO_REPLY` 是正确的响应，因此用户永远不会看到这个回合。

这由 `agents.defaults.compaction.memoryFlush` 控制：

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
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store.",
        },
      },
    },
  },
}
```

详情：

- **软阈值**：当会话 token 估算超过 `contextWindow - reserveTokensFloor - softThresholdTokens` 时触发刷新。
- **默认静默**：提示包含 `NO_REPLY`，因此不会发送任何内容。
- **两个提示**：用户提示和系统提示都会附加提醒。
- **每个压缩周期刷新一次**（在 `sessions.json` 中跟踪）。
- **工作区必须可写**：如果会话在沙箱中运行，启用了 `workspaceAccess: "ro"` 或 `"none"`，则跳过刷新。

完整的压缩生命周期，请参阅[会话管理 + 压缩](/zh/reference/session-management-compaction)。

## 向量内存搜索

OpenClaw 可以在 `MEMORY.md` 和 `memory/*.md` 上构建小型向量索引，以便语义查询即使在措辞不同时也能找到相关笔记。

默认设置：

- 默认启用。
- 监视内存文件的更改（防抖）。
- 默认使用远程嵌入。如果未设置 `memorySearch.provider`，OpenClaw 会自动选择：
  1. 如果配置了 `memorySearch.local.modelPath` 且文件存在，则使用 `local`。
  2. 如果可以解析 OpenAI 密钥，则使用 `openai`。
  3. 如果可以解析 Gemini 密钥，则使用 `gemini`。
  4. 否则，内存搜索将保持禁用状态，直到配置完成。
- 本地模式使用 node-llama-cpp，可能需要 `pnpm approve-builds`。
- 使用 sqlite-vec（如果可用）加速 SQLite 内部的向量搜索。

远程嵌入**需要**嵌入提供商的 API 密钥。OpenClaw 从认证配置文件、`models.providers.*.apiKey` 或环境变量解析密钥。Codex OAuth 仅涵盖聊天/补全，**不**满足内存搜索的嵌入需求。对于 Gemini，请使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`。使用自定义 OpenAI 兼容端点时，请设置 `memorySearch.remote.apiKey`（和可选的 `memorySearch.remote.headers`）。

### QMD 后端（实验性）

设置 `memory.backend = "qmd"` 将内置 SQLite 索引器替换为 [QMD](https://github.com/tobi/qmd)：一个本地优先的搜索辅助服务，结合了 BM25 + 向量 + 重排序。Markdown 仍然是唯一真实来源；OpenClaw 将检索任务外包给 QMD。要点：

**前提条件**

- 默认禁用。需要逐个配置选择加入（`memory.backend = "qmd"`）。
- 单独安装 QMD CLI（`bun install -g github.com/tobi/qmd` 或获取发布版本），并确保 `qmd` 二进制文件在网关的 `PATH` 上。
- QMD 需要一个允许扩展的 SQLite 构建（macOS 上为 `brew install sqlite`）。
- QMD 通过 Bun + `node-llama-cpp` 完全在本地运行，并在首次使用时从 HuggingFace 自动下载 GGUF 模型（无需单独的 Ollama 守护进程）。
- 网关通过设置 `XDG_CONFIG_HOME` 和 `XDG_CACHE_HOME`，在 `~/.openclaw/agents/<agentId>/qmd/` 下以自包含的 XDG 主目录运行 QMD。
- 操作系统支持：安装 Bun + SQLite 后，macOS 和 Linux 可以直接使用。Windows 最好通过 WSL2 支持。

**辅助服务运行方式**

- 网关在 `~/.openclaw/agents/<agentId>/qmd/` 下写入自包含的 QMD 主目录（配置 + 缓存 + sqlite DB）。
- 集合从 `memory.qmd.paths`（加上默认工作区内存文件）重写为 `index.yml`，然后在启动时和可配置的间隔（`memory.qmd.update.interval`，默认 5 分钟）运行 `qmd update` + `qmd embed`。
- 搜索通过 `qmd query --json` 运行。如果 QMD 失败或二进制文件缺失，OpenClaw 会自动回退到内置 SQLite 管理器，因此内存工具可以继续工作。
- **首次搜索可能会很慢**：在第一次 `qmd query` 运行时，QMD 可能会下载本地 GGUF 模型（重排序器/查询扩展）。
  - OpenClaw 在运行 QMD 时自动设置 `XDG_CONFIG_HOME`/`XDG_CACHE_HOME`。
  - 如果您想手动预下载模型（并预热 OpenClaw 使用的相同索引），请使用代理的 XDG 目录运行一次性查询。

    OpenClaw 的 QMD 状态位于您的**状态目录**下（默认为 `~/.openclaw`）。
    您可以通过导出与 OpenClaw 相同的 XDG 变量，将 `qmd` 指向完全相同的索引：

    ```bash
    # Pick the same state dir OpenClaw uses
    STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"
    if [ -d "$HOME/.moltbot" ] && [ ! -d "$HOME/.openclaw" ] \
      && [ -z "${OPENCLAW_STATE_DIR:-}" ]; then
      STATE_DIR="$HOME/.moltbot"
    fi

    export XDG_CONFIG_HOME="$STATE_DIR/agents/main/qmd/xdg-config"
    export XDG_CACHE_HOME="$STATE_DIR/agents/main/qmd/xdg-cache"

    # (Optional) force an index refresh + embeddings
    qmd update
    qmd embed

    # Warm up / trigger first-time model downloads
    qmd query "test" -c memory-root --json >/dev/null 2>&1
    ```

**配置界面（`memory.qmd.*`）**

- `command`（默认 `qmd`）：覆盖可执行文件路径。
- `includeDefaultMemory`（默认 `true`）：自动索引 `MEMORY.md` + `memory/**/*.md`。
- `paths[]`：添加额外的目录/文件（`path`、可选 `pattern`、可选稳定 `name`）。
- `sessions`：选择加入会话 JSONL 索引（`enabled`、`retentionDays`、`exportDir`）。
- `update`：控制刷新节奏（`interval`、`debounceMs`、`onBoot`、`embedInterval`）。
- `limits`：限制召回负载（`maxResults`、`maxSnippetChars`、`maxInjectedChars`、`timeoutMs`）。
- `scope`：与 [`session.sendPolicy`](/zh/gateway/configuration#session) 相同的架构。默认为仅私聊（`deny` 全部、`allow` 直接聊天）；放宽它以在群组/频道中显示 QMD 命中。
- 来自工作区外的片段在 `memory_search` 结果中显示为 `qmd/<collection>/<relative-path>`；`memory_get` 理解该前缀并从配置的 QMD 集合根读取。
- 当 `memory.qmd.sessions.enabled = true` 时，OpenClaw 将清理后的会话记录（用户/助手回合）导出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的专用 QMD 集合，因此 `memory_search` 可以在不触及内置 SQLite 索引的情况下调出最近的对话。
- 当 `memory.citations` 为 `auto`/`on` 时，`memory_search` 片段现在包括 `Source: <path#line>` 页脚；设置 `memory.citations = "off"` 以保持路径元数据内部（代理仍会收到 `memory_get` 的路径，但片段文本省略页脚，系统提示会警告代理不要引用它）。

**示例**

```json5
memory: {
  backend: "qmd",
  citations: "auto",
  qmd: {
    includeDefaultMemory: true,
    update: { interval: "5m", debounceMs: 15000 },
    limits: { maxResults: 6, timeoutMs: 4000 },
    scope: {
      default: "deny",
      rules: [{ action: "allow", match: { chatType: "direct" } }]
    },
    paths: [
      { name: "docs", path: "~/notes", pattern: "**/*.md" }
    ]
  }
}
```

**引用和回退**

- 无论后端如何（`auto`/`on`/`off`），`memory.citations` 都适用。
- 当 `qmd` 运行时，我们标记 `status().backend = "qmd"`，以便诊断显示哪个引擎提供了结果。如果 QMD 子进程退出或无法解析 JSON 输出，搜索管理器会记录警告并返回内置提供商（现有的 Markdown 嵌入），直到 QMD 恢复。

### 额外的内存路径

如果您想在默认工作区布局之外索引 Markdown 文件，请添加显式路径：

```json5
agents: {
  defaults: {
    memorySearch: {
      extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"]
    }
  }
}
```

说明：

- 路径可以是绝对路径或相对于工作区的路径。
- 递归扫描目录以查找 `.md` 文件。
- 仅索引 Markdown 文件。
- 忽略符号链接（文件或目录）。

### Gemini 嵌入（原生）

将提供商设置为 `gemini` 以直接使用 Gemini 嵌入 API：

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

说明：

- `remote.baseUrl` 是可选的（默认为 Gemini API 基本 URL）。
- `remote.headers` 允许您在需要时添加额外的标头。
- 默认模型：`gemini-embedding-001`。

如果您想使用**自定义 OpenAI 兼容端点**（OpenRouter、vLLM 或代理），您可以将 `remote` 配置与 OpenAI 提供商一起使用：

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

如果您不想设置 API 密钥，请使用 `memorySearch.provider = "local"` 或设置 `memorySearch.fallback = "none"`。

回退：

- `memorySearch.fallback` 可以是 `openai`、`gemini`、`local` 或 `none`。
- 仅当主嵌入提供商失败时才使用回退提供商。

批量索引（OpenAI + Gemini）：

- OpenAI 和 Gemini 嵌入默认启用。设置 `agents.defaults.memorySearch.remote.batch.enabled = false` 以禁用。
- 默认行为等待批量完成；如需要，请调整 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 设置 `remote.batch.concurrency` 以控制我们并行提交多少个批量作业（默认：2）。
- 当 `memorySearch.provider = "openai"` 或 `"gemini"` 时应用批量模式，并使用相应的 API 密钥。
- Gemini 批量作业使用异步嵌入批量端点，并需要 Gemini Batch API 可用性。

为什么 OpenAI 批处理快速且便宜：

- 对于大型回填，OpenAI 通常是我们支持的最快选项，因为我们可以在单个批量作业中提交许多嵌入请求，并让 OpenAI 异步处理它们。
- OpenAI 为 Batch API 工作负载提供折扣定价，因此大型索引运行通常比同步发送相同请求更便宜。
- 有关详细信息，请参阅 OpenAI Batch API 文档和定价：
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

- `memory_search` — 返回带有文件 + 行范围的片段。
- `memory_get` — 按路径读取内存文件内容。

本地模式：

- 设置 `agents.defaults.memorySearch.provider = "local"`。
- 提供 `agents.defaults.memorySearch.local.modelPath`（GGUF 或 `hf:` URI）。
- 可选：设置 `agents.defaults.memorySearch.fallback = "none"` 以避免远程回退。

### 内存工具如何工作

- `memory_search` 语义搜索来自 `MEMORY.md` + `memory/**/*.md` 的 Markdown 块（目标约 400 个 token，80 个 token 重叠）。它返回片段文本（最多约 700 个字符）、文件路径、行范围、分数、提供商/模型，以及我们是否从本地 → 远程嵌入回退。不返回完整的文件负载。
- `memory_get` 读取特定的内存 Markdown 文件（相对于工作区），可选择从起始行开始读取 N 行。`MEMORY.md` / `memory/` 之外的路径将被拒绝。
- 仅当 `memorySearch.enabled` 对代理解析为 true 时，这两个工具才会启用。

### 索引的内容（以及何时）

- 文件类型：仅 Markdown（`MEMORY.md`、`memory/**/*.md`）。
- 索引存储：每个代理的 SQLite 位于 `~/.openclaw/memory/<agentId>.sqlite`（通过 `agents.defaults.memorySearch.store.path` 可配置，支持 `{agentId}` token）。
- 新鲜度：`MEMORY.md` + `memory/` 上的监视器标记索引为脏（防抖 1.5 秒）。同步在会话开始、搜索时或按间隔安排并异步运行。会话记录使用增量阈值来触发后台同步。
- 重新索引触发器：索引存储嵌入 **提供商/模型 + 端点指纹 + 分块参数**。如果其中任何一个发生变化，OpenClaw 会自动重置并重新索引整个存储。

### 混合搜索（BM25 + 向量）

启用后，OpenClaw 结合：

- **向量相似度**（语义匹配，措辞可以不同）
- **BM25 关键词相关性**（精确的 token，如 ID、环境变量、代码符号）

如果您的平台上无法使用全文搜索，OpenClaw 会回退到仅向量搜索。

#### 为什么选择混合？

向量搜索擅长”意思相同”：

- “Mac Studio 网关主机” vs “运行网关的机器”
- “防抖文件更新” vs “避免在每次写入时索引”

但在精确、高信号的 token 上可能较弱：

- ID（`a828e60`、`b3b9895a…`）
- 代码符号（`memorySearch.query.hybrid`）
- 错误字符串（”sqlite-vec 不可用”）

BM25（全文）则相反：在精确 token 上很强，在改写上较弱。混合搜索是实用的中间立场：**同时使用两种检索信号**，这样您既可以获得”自然语言”查询的好结果，也可以获得”大海捞针”查询的好结果。

#### 我们如何合并结果（当前设计）

实现草图：

1. 从双方检索候选池：

- **向量**：按余弦相似度排名前 `maxResults * candidateMultiplier`。
- **BM25**：按 FTS5 BM25 排名排名前 `maxResults * candidateMultiplier`（越低越好）。

2. 将 BM25 排名转换为 0..1 左右的分数：

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. 按块 ID 合并候选并计算加权分数：

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

说明：

- `vectorWeight` + `textWeight` 在配置解析中归一化为 1.0，因此权重表现为百分比。
- 如果嵌入不可用（或提供商返回零向量），我们仍然运行 BM25 并返回关键字匹配。
- 如果无法创建 FTS5，我们保持仅向量搜索（不会硬失败）。

这并不是”IR 理论上的完美”，但它简单、快速，并且往往能提高真实笔记的召回率/精度。
如果我们想以后更高级，常见的下一步是在混合之前进行倒数排名融合（RRF）或分数归一化（最小/最大或 z 分数）。

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

### 嵌入缓存

OpenClaw 可以在 SQLite 中缓存**块嵌入**，以便重新索引和频繁更新（尤其是会话记录）不会重新嵌入未更改的文本。

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

### 会话内存搜索（实验性）

您可以选择索引**会话记录**并通过 `memory_search` 显示它们。这是一个实验性标志。

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

说明：

- 会话索引是**可选的**（默认关闭）。
- 会话更新经过防抖处理，并在超过增量阈值后**异步索引**（尽力而为）。
- `memory_search` 从不阻塞索引；在后台同步完成之前，结果可能略有滞后。
- 结果仍然仅包括片段；`memory_get` 仍限于内存文件。
- 会话索引按代理隔离（仅索引该代理的会话日志）。
- 会话日志位于磁盘上（`~/.openclaw/agents/<agentId>/sessions/*.jsonl`）。任何具有文件系统访问权限的进程/用户都可以读取它们，因此将磁盘访问视为信任边界。对于更严格的隔离，请在单独的操作系统用户或主机下运行代理。

增量阈值（显示默认值）：

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

当 sqlite-vec 扩展可用时，OpenClaw 将嵌入存储在 SQLite 虚拟表（`vec0`）中，并在数据库中执行向量距离查询。这使搜索保持快速，而无需将每个嵌入加载到 JS 中。

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

说明：

- `enabled` 默认为 true；禁用时，搜索回退到对存储嵌入的进程内余弦相似度。
- 如果 sqlite-vec 扩展缺失或加载失败，OpenClaw 会记录错误并继续使用 JS 回退（无向量表）。
- `extensionPath` 覆盖捆绑的 sqlite-vec 路径（对于自定义构建或非标准安装位置很有用）。

### 本地嵌入自动下载

- 默认本地嵌入模型：`hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf`（约 0.6 GB）。
- 当 `memorySearch.provider = "local"` 时，`node-llama-cpp` 解析 `modelPath`；如果 GGUF 缺失，它会**自动下载**到缓存（或 `local.modelCacheDir`（如果设置）），然后加载它。下载会在重试时恢复。
- 本机构建要求：运行 `pnpm approve-builds`，选择 `node-llama-cpp`，然后 `pnpm rebuild node-llama-cpp`。
- 回退：如果本地设置失败且 `memorySearch.fallback = "openai"`，我们会自动切换到远程嵌入（`openai/text-embedding-3-small`（除非被覆盖））并记录原因。

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

说明：

- `remote.*` 优先于 `models.providers.openai.*`。
- `remote.headers` 与 OpenAI 标头合并；远程在键冲突时获胜。省略 `remote.headers` 以使用 OpenAI 默认值。
