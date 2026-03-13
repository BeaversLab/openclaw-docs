---
title: "记忆"
summary: "OpenClaw 记忆的工作原理（工作区文件 + 自动记忆刷新）"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# 记忆

OpenClaw 记忆是 **代理工作区中的纯 Markdown**。文件是
事实来源；模型仅“记住”写入磁盘的内容。

Memory search tools are provided by the active memory plugin (default:
`memory-core`). Disable memory plugins with `plugins.slots.memory = "none"`.

## Memory files (Markdown)

默认工作区布局使用两层内存：

- `memory/YYYY-MM-DD.md`
  - 每日日志（仅追加）。
  - 在会话开始时读取今天和昨天的记录。
- `MEMORY.md`（可选）
  - 经过整理的长期记忆。
  - **仅在主私有会话中加载**（绝不在群组上下文中）。

这些文件位于工作区（`agents.defaults.workspace`，默认
`~/.openclaw/workspace`）之下。有关完整布局，请参阅 [Agent workspace](/zh/en/concepts/agent-workspace)。

## 记忆工具

OpenClaw 为这些 Markdown 文件提供了两个面向代理的工具：

- `memory_search` — 对已索引片段的语义回忆。
- `memory_get` — 对特定 Markdown 文件/行范围的目标读取。

`memory_get` 现在在**文件不存在时能够优雅降级**（例如，在首次写入之前的每日日志）。内置管理器和 QMD 后端都返回 `{ text: "", path }` 而不是抛出 `ENOENT`，因此代理可以处理“尚未记录任何内容”并继续其工作流，而无需用 try/catch 逻辑包裹工具调用。

## 何时写入记忆

- 决策、偏好和持久化事实归入 `MEMORY.md`。
- 日常笔记和运行上下文会存入 `memory/YYYY-MM-DD.md`。
- 如果有人说“记住这个”，请把它写下来（不要保存在内存中）。
- 这一领域仍在不断演变。提醒模型存储记忆会有所帮助；它知道该怎么做。
- 如果你希望某些内容被记住，**请要求机器人将其写入**记忆。

## 自动内存刷新（压缩前 Ping）

当会话**接近自动压缩**时，OpenClaw 会触发一个**静默的、智能体的轮次**，提醒模型在上下文被压缩**之前**写入持久化内存。默认提示明确指出模型_可能会回复_，但通常 `NO_REPLY` 是正确的响应，因此用户永远不会看到此轮次。

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

详细信息：

- **软阈值**：当会话 token 估计值超过时触发刷新
  `contextWindow - reserveTokensFloor - softThresholdTokens`。
- **默认静音**：提示包含 `NO_REPLY`，因此不会传递任何内容。
- **两个提示**：一个用户提示加上一个系统提示追加提醒。
- **每个压缩周期一次刷新**（在 `sessions.json` 中跟踪）。
- **工作区必须可写**：如果会话在沙盒中运行，并且
  `workspaceAccess: "ro"` 或 `"none"`，则跳过刷新。

有关完整的压缩生命周期，请参阅
[会话管理 + 压缩](/zh/reference/session-management-compaction)。

## 向量内存搜索

OpenClaw 可以在 `MEMORY.md` 和 `memory/*.md` 上构建小型向量索引，以便语义查询即使措辞不同也能找到相关笔记。

默认值：

- 默认启用。
- 监视内存文件变更（防抖）。
- 在 `agents.defaults.memorySearch` 下配置内存搜索（非顶层
  `memorySearch`)。
- 默认使用远程嵌入。如果未设置 `memorySearch.provider`，OpenClaw 将自动选择：
  1. 如果配置了 `memorySearch.local.modelPath` 并且该文件存在，则 `local`。
  2. 如果可以解析 OpenAI 密钥，则 `openai`。
  3. 如果可以解析 Gemini 密钥，则 `gemini`。
  4. 如果可以解析 Voyage 密钥，则 `voyage`。
  5. 如果可以解析 Mistral 密钥，则 `mistral`。
  6. 否则，内存搜索将保持禁用状态，直到完成配置。
- 本地模式使用 node-llama-cpp，可能需要 `pnpm approve-builds`。
- 使用 sqlite-vec（如果可用）来加速 SQLite 内部的向量搜索。
- `memorySearch.provider = "ollama"` 也支持本地/自托管
  Ollama 嵌入 (`/api/embeddings`)，但它不是自动选择的。

远程嵌入**需要**嵌入提供商的 API 密钥。OpenClaw 从身份验证配置文件、`models.providers.*.apiKey` 或环境变量中解析密钥。Codex OAuth 仅涵盖聊天/补全，并且**不**满足内存搜索的嵌入需求。对于 Gemini，请使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`。对于 Voyage，请使用 `VOYAGE_API_KEY` 或 `models.providers.voyage.apiKey`。对于 Mistral，请使用 `MISTRAL_API_KEY` 或 `models.providers.mistral.apiKey`。Ollama 通常不需要真实的 API 密钥（当本地策略需要时，像 `OLLAMA_API_KEY=ollama-local` 这样的占位符就足够了）。
使用自定义 OpenAI 兼容端点时，请设置 `memorySearch.remote.apiKey`（以及可选的 `memorySearch.remote.headers`）。

### QMD 后端（实验性）

设置 `memory.backend = "qmd"` 以将内置 SQLite 索引器替换为 [QMD](https://github.com/tobi/qmd)：一个本地优先的搜索伴生服务，结合了 BM25 + 向量 + 重排序。Markdown 仍然是事实来源；OpenClaw 调用 QMD 进行检索。要点：

**先决条件**

- 默认禁用。可按配置选择启用 (`memory.backend = "qmd"`)。
- 单独安装 QMD CLI (`bun install -g https://github.com/tobi/qmd` 或获取
  a release) and make sure the `qmd` binary is on the gateway’s `PATH`.
- QMD 需要一个允许扩展的 SQLite 版本（`brew install sqlite` 在
  macOS)。
- QMD 通过 Bun + `node-llama-cpp` 完全在本地运行，并自动下载 GGUF
  首次使用时从 HuggingFace 获取模型（无需单独的 Ollama 守护进程）。
- 网关在一个自包含的 XDG 主目录下运行 QMD
  `~/.openclaw/agents/<agentId>/qmd/` 通过设置 `XDG_CONFIG_HOME` 和
  `XDG_CACHE_HOME`。
- 操作系统支持：一旦安装了 Bun + SQLite，macOS 和 Linux 即可直接使用。
  已安装。Windows 最好通过 WSL2 支持。

**Sidecar 的运行方式**

- 网关在以下位置写入一个独立的 QMD 主目录：
  `~/.openclaw/agents/<agentId>/qmd/`（配置 + 缓存 + sqlite DB）。
- 集合通过 `qmd collection add` 从 `memory.qmd.paths` 创建
  （加上默认工作区内存文件），然后 `qmd update` + `qmd embed` 在
  启动时和可配置的间隔（`memory.qmd.update.interval`，
  默认 5 m）运行。
- 网关现在在启动时初始化 QMD 管理器，因此定期更新
  计时器在第一次 `memory_search` 调用之前就已启动。
- 启动刷新现在默认在后台运行，以便聊天启动不会
  被阻止；设置 `memory.qmd.update.waitForBootSync = true` 以保留先前的
  阻止行为。
- 搜索通过 `memory.qmd.searchMode` 运行（默认 `qmd search --json`；此外
  支持 `vsearch` 和 `query`）。如果所选模式拒绝您的 QMD 构建上的标志，OpenClaw 会使用 `qmd query` 重试。如果 QMD 失败或缺少二进制文件，OpenClaw 会自动回退到内置 SQLite 管理器，以便内存工具继续工作。
- OpenClaw 目前未公开 QMD 嵌入批次大小的调优；批处理行为是
  由 QMD 本身控制。
- **首次搜索可能会很慢**：QMD 可能会下载本地 GGUF 模型（重排序器/查询
  expansion) on the first `qmd query` run.
  - OpenClaw sets `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` automatically when it runs QMD.
  - If you want to pre-download models manually (and warm the same index OpenClaw
    uses), run a one-off query with the agent’s XDG dirs.

    OpenClaw 的 QMD 状态位于您的 **state dir** 下（默认为 `~/.openclaw`）。
    您可以通过导出 OpenClaw 使用的相同 XDG 变量，将 `qmd` 指向完全相同的索引：

    ```bash
    # Pick the same state dir OpenClaw uses
    STATE_DIR="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"

    export XDG_CONFIG_HOME="$STATE_DIR/agents/main/qmd/xdg-config"
    export XDG_CACHE_HOME="$STATE_DIR/agents/main/qmd/xdg-cache"

    # (Optional) force an index refresh + embeddings
    qmd update
    qmd embed

    # Warm up / trigger first-time model downloads
    qmd query "test" -c memory-root --json >/dev/null 2>&1
    ```

**配置表面 (`memory.qmd.*`)**

- `command`（默认 `qmd`）：覆盖可执行文件路径。
- `searchMode` (默认为 `search`)：选择哪个 QMD 命令作为
  `memory_search` (`search`, `vsearch`, `query`).
- `includeDefaultMemory` (默认 `true`): 自动索引 `MEMORY.md` + `memory/**/*.md`。
- `paths[]`：添加额外的目录/文件（`path`，可选 `pattern`，可选
 稳定 `name`）。
- `sessions`: 选择启用会话 JSONL 索引（`enabled`，`retentionDays`，
  `exportDir`)。
- `update`：控制刷新节奏和维护执行：
  (`interval`, `debounceMs`, `onBoot`, `waitForBootSync`, `embedInterval`,
  `commandTimeoutMs`, `updateTimeoutMs`, `embedTimeoutMs`)。
- `limits`：限制召回载荷 (`maxResults`, `maxSnippetChars`,
  `maxInjectedChars`, `timeoutMs`).
- `scope`：与 [`session.sendPolicy`](/zh/en/gateway/configuration#session) 的架构相同。
  默认为仅限私信（`deny` 所有，`allow` 直接聊天）；放宽限制以在群组/频道中展示 QMD
  命中结果。
  - `match.keyPrefix` 匹配**标准化**会话密钥（小写，剥离所有前导 `agent:<id>:`）。示例：`discord:channel:`。
  - `match.rawKeyPrefix` 匹配**原始**会话密钥（小写），包括 `agent:<id>:`。示例：`agent:main:discord:`。
  - 遗留：`match.keyPrefix: "agent:..."` 仍被视为原始密钥前缀，
    但为清晰起见，首选 `rawKeyPrefix`。
- 当 `scope` 拒绝搜索时，OpenClaw 会记录一条包含派生内容的警告
  `channel`/`chatType` 以便更容易调试空结果。
- 源自工作区外部的片段显示为
  `qmd/<collection>/<relative-path>` 在 `memory_search` 结果中；`memory_get`
  理解该前缀并从配置的 QMD 集合根目录中读取。
- 当 `memory.qmd.sessions.enabled = true` 时，OpenClaw 会导出经过清理的会话
  转录（用户/助手轮次）到位于 `~/.openclaw/agents/<id>/qmd/sessions/` 的专用 QMD 集合中，以便 `memory_search` 可以在不触及内置 SQLite 索引的情况下调用最近的对话。
- `memory_search` 摘录现在包含一个 `Source: <path#line>` 页脚，当
  `memory.citations` 是 `auto`/`on`；设置 `memory.citations = "off"` 以将
  路径元数据保留在内部（代理仍然会收到 `memory_get` 的路径，但
  摘录文本会省略页脚，且系统提示会警告代理不要引用它）。

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
      rules: [
        { action: "allow", match: { chatType: "direct" } },
        // Normalized session-key prefix (strips `agent:<id>:`).
        { action: "deny", match: { keyPrefix: "discord:channel:" } },
        // Raw session-key prefix (includes `agent:<id>:`).
        { action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } },
      ]
    },
    paths: [
      { name: "docs", path: "~/notes", pattern: "**/*.md" }
    ]
  }
}
```

**引文与回退**

- 无论后端（`auto`/`on`/`off`）如何，`memory.citations` 均适用。
- 当 `qmd` 运行时，我们会标记 `status().backend = "qmd"` 以便诊断信息显示哪个
  engine served the results. If the QMD subprocess exits or JSON output can’t be
  parsed, the search manager logs a warning and returns the builtin provider
  (existing Markdown embeddings) until QMD recovers.

### 其他内存路径

如果您想索引默认工作区布局之外的 Markdown 文件，请添加显式路径：

```json5
agents: {
  defaults: {
    memorySearch: {
      extraPaths: ["../team-docs", "/srv/shared-notes/overview.md"]
    }
  }
}
```

备注：

- 路径可以是绝对路径或相对于工作区的路径。
- 目录会递归扫描 `.md` 文件。
- 默认情况下，仅对 Markdown 文件进行索引。
- 如果 `memorySearch.multimodal.enabled = true`，OpenClaw 也仅对 `extraPaths` 下的支持的图像/音频文件建立索引。默认内存根目录（`MEMORY.md`、`memory.md`、`memory/**/*.md`）保持仅限 Markdown。
- 符号链接会被忽略（文件或目录）。

### 多模态记忆文件（Gemini 图像 + 音频）

当使用 Gemini embedding 2 时，OpenClaw 可以索引来自 `memorySearch.extraPaths` 的图像和音频文件：

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      extraPaths: ["assets/reference", "voice-notes"],
      multimodal: {
        enabled: true,
        modalities: ["image", "audio"], // or ["all"]
        maxFileBytes: 10000000
      },
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

备注：

- 目前 `gemini-embedding-2-preview` 仅支持多模态记忆。
- 多模态索引仅适用于通过 `memorySearch.extraPaths` 发现的文件。
- 此阶段支持的模态：图像和音频。
- 在启用多模态内存时，`memorySearch.fallback` 必须保持 `"none"`。
- 在索引过程中，匹配的图像/音频文件字节会被上传到配置的 Gemini 嵌入端点。
- 支持的图像扩展名：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`。
- 支持的音频扩展名：`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`。
- 搜索查询仍然是文本，但 Gemini 可以将这些文本查询与已索引的图像/音频嵌入进行比较。
- `memory_get` 仍然只读取 Markdown；二进制文件可以搜索，但不会作为原始文件内容返回。

### Gemini 嵌入（原生）

将提供程序设置为 `gemini` 以直接使用 Gemini 嵌入 API：

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

注意事项：

- `remote.baseUrl` 是可选的（默认为 Gemini API 基础 URL）。
- 如果需要，`remote.headers` 允许您添加额外的标头。
- 默认模型：`gemini-embedding-001`。
- `gemini-embedding-2-preview` 也受支持：8192 token 限制和可配置维度（768 / 1536 / 3072，默认 3072）。

#### Gemini Embedding 2（预览）

```json5
agents: {
  defaults: {
    memorySearch: {
      provider: "gemini",
      model: "gemini-embedding-2-preview",
      outputDimensionality: 3072,  // optional: 768, 1536, or 3072 (default)
      remote: {
        apiKey: "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

> **⚠️ 需要重新索引：** 从 `gemini-embedding-001` (768 维)
> 切换到 `gemini-embedding-2-preview` (3072 维) 会改变向量大小。如果您在 768、1536 和 3072 之间更改 `outputDimensionality`，情况也是如此。
> OpenClaw 在检测到模型或维度更改时会自动重新索引。

如果您想使用**自定义 OpenAI 兼容端点**（OpenRouter、vLLM 或代理），
您可以使用带有 OpenAI 提供商的 `remote` 配置：

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

回退方案：

- `memorySearch.fallback` 可以是 `openai`、`gemini`、`voyage`、`mistral`、`ollama`、`local` 或 `none`。
- 仅当主要的嵌入提供程序失败时，才使用回退提供程序。

批量索引 (OpenAI + Gemini + Voyage)：

- 默认禁用。设置 `agents.defaults.memorySearch.remote.batch.enabled = true` 以启用大型语料库索引（OpenAI、Gemini 和 Voyage）。
- 默认行为等待批处理完成；如有需要，请调整 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 设置 `remote.batch.concurrency` 以控制我们并行提交多少个批处理作业（默认：2）。
- 当使用 `memorySearch.provider = "openai"` 或 `"gemini"` 时，批量模式适用，并使用相应的 API 密钥。
- Gemini 批处理作业使用异步嵌入批量端点，并需要 Gemini Batch API 的可用性。

为什么 OpenAI 批处理既快速又便宜：

- 对于大量回填，OpenAI 通常是我们支持的最快选项，因为我们可以在单个批处理作业中提交许多嵌入请求，并让 OpenAI 异步处理它们。
- OpenAI 为 Batch API 工作负载提供折扣定价，因此大型索引运行通常比同步发送相同请求更便宜。
- 有关详细信息，请参阅 OpenAI Batch API 文档和定价：
  - [https://platform.openai.com/docs/api-reference/batch](https://platform.openai.com/docs/api-reference/batch)
  - [https://platform.openai.com/pricing](https://platform.openai.com/pricing)

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

- `memory_search` — 返回包含文件 + 行范围的代码片段。
- `memory_get` — 按路径读取记忆文件内容。

本地模式：

- 设置 `agents.defaults.memorySearch.provider = "local"`。
- 提供 `agents.defaults.memorySearch.local.modelPath`（GGUF 或 `hf:` URI）。
- 可选：设置 `agents.defaults.memorySearch.fallback = "none"` 以避免远程回退。

### 记忆工具的工作原理

- `memory_search` 从 `MEMORY.md` + `memory/**/*.md` 中语义搜索 Markdown 块（目标约 400 个 token，80 个 token 重叠）。它返回片段文本（限制约 700 个字符）、文件路径、行范围、分数、提供者/模型，以及我们是否从本地回退到远程嵌入。不返回完整的文件负载。
- `memory_get` 读取特定的内存 Markdown 文件（相对于工作区），可选择从起始行开始读取 N 行。`MEMORY.md` / `memory/` 之外的路径将被拒绝。
- 只有当 `memorySearch.enabled` 对代理解析为 true 时，这两个工具才会启用。

### 什么内容被索引（以及何时）

- 文件类型：仅限 Markdown（`MEMORY.md`，`memory/**/*.md`）。
- 索引存储：位于 `~/.openclaw/memory/<agentId>.sqlite` 的每个代理的 SQLite（可通过 `agents.defaults.memorySearch.store.path` 配置，支持 `{agentId}` 令牌）。
- 新鲜度：对 `MEMORY.md` + `memory/` 的监视器会将索引标记为脏（防抖 1.5 秒）。同步会在会话开始时、搜索时或按间隔进行调度，并异步运行。会话记录使用增量阈值来触发后台同步。
- 重新索引触发条件：索引存储了嵌入**提供商/模型 + 端点指纹 + 分块参数**。如果其中任何一项发生变化，OpenClaw 会自动重置并重新索引整个存储。

### 混合搜索 (BM25 + 向量)

启用后，OpenClaw 将结合：

- **向量相似度**（语义匹配，措辞可以不同）
- **BM25 关键词相关性**（精确令牌，如 ID、环境变量、代码符号）

如果您的平台上不可用全文搜索，OpenClaw 将回退到仅向量搜索。

#### 为什么要采用混合搜索？

向量搜索非常擅长“这意味着同一件事”：

- “Mac Studio 网关主机”与“运行网关的机器”
- “debounce file updates” vs “avoid indexing on every write”

但在精确、高信噪比的标记上可能较弱：

- ID (`a828e60`, `b3b9895a…`)
- 代码符号 (`memorySearch.query.hybrid`)
- 错误字符串（“sqlite-vec 不可用”）

BM25（全文）则相反：在精确匹配 token 方面表现出色，但在处理同义词转述方面较弱。
混合搜索是一种务实的折中方案：**结合使用两种检索信号**，这样无论对于“自然语言”查询还是“大海捞针”式的查询，都能获得良好的结果。

#### 我们如何合并结果（当前设计）

实现草图：

1. 从双方检索候选池：

- **向量**：按余弦相似度排名前 `maxResults * candidateMultiplier` 的结果。
- **BM25**：按 FTS5 BM25 排名的前 `maxResults * candidateMultiplier`（越低越好）。

2. 将 BM25 排名转换为大约在 0 到 1 之间的分数：

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. 通过块 ID 合并候选者并计算加权得分：

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

备注：

- 在配置解析中，`vectorWeight` + `textWeight` 会被归一化为 1.0，因此权重表现为百分比。
- 如果嵌入不可用（或提供者返回零向量），我们仍然运行 BM25 并返回关键字匹配。
- 如果无法创建 FTS5，我们保留仅向量搜索（不会硬性失败）。

这在“信息检索理论”上并不完美，但它简单、快速，并且往往能提高真实笔记的召回率/精确率。
如果我们以后想做得更复杂些，常见的下一步是在混合之前进行倒数排名融合 (RRF) 或分数归一化
(min/max 或 z-score)。

#### 后处理流水线

在合并向量和关键词得分后，两个可选的后处理阶段
会在结果列表到达代理之前对其进行细化：

```
Vector + Keyword → Weighted Merge → Temporal Decay → Sort → MMR → Top-K Results
```

这两个阶段**默认关闭**，可以独立启用。

#### MMR 重新排序（多样性）

当混合搜索返回结果时，多个块可能包含相似或重叠的内容。例如，搜索“家庭网络设置”可能会返回来自不同每日笔记的五个几乎相同的片段，这些片段都提到了相同的路由器配置。

**MMR（最大边际相关性）** 会对结果进行重新排序，以平衡相关性与多样性，
确保顶部结果涵盖查询的不同方面，而不是重复相同的信息。

工作原理：

1. 结果根据其原始相关性（向量 + BM25 加权分数）进行评分。
2. MMR 迭代选择最大化以下内容的结果：`λ × relevance − (1−λ) × max_similarity_to_selected`。
3. 结果之间的相似度是使用基于标记化内容的 Jaccard 文本相似度来衡量的。

`lambda` 参数控制权衡：

- `lambda = 1.0` → 纯相关性（无多样性惩罚）
- `lambda = 0.0` → 最大多样性（忽略相关性）
- 默认值：`0.7`（平衡，略偏向相关性）

**示例 — 查询：“家庭网络设置”**

鉴于这些记忆文件：

```
memory/2026-02-10.md  → "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  → "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  → "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     → "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

不使用 MMR — 前 3 个结果：

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/2026-02-08.md  (score: 0.89)  ← router + VLAN (near-duplicate!)
3. memory/network.md     (score: 0.85)  ← reference doc
```

使用 MMR (λ=0.7) — 前 3 个结果：

```
1. memory/2026-02-10.md  (score: 0.92)  ← router + VLAN
2. memory/network.md     (score: 0.85)  ← reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  ← AdGuard DNS (diverse!)
```

2月8日的近似重复项被移除，代理获得了三条不同的信息。

**何时启用：** 如果您注意到 `memory_search` 返回冗余或近乎重复的片段，尤其是当每日笔记通常在几天内重复相似信息时。

#### 时间衰减（最近性提升）

拥有每日笔记的 Agent 随着时间推移会积累数百个带日期的文件。如果没有衰减机制，六个月前措辞得当的笔记可能会在关于同一主题的排名中超过昨天的更新。

**时间衰减**根据每个结果的年代对分数应用指数乘数，因此最近的记忆自然排名更高，而旧的记忆会逐渐淡出：

```
decayedScore = score × e^(-λ × ageInDays)
```

其中 `λ = ln(2) / halfLifeDays`。

默认半衰期为 30 天时：

- 今天的笔记：原始分数的 **100%**
- 7 天前：**~84%**
- 30 天前：**50%**
- 90 天前：**12.5%**
- 180 天前：**~1.6%**

**常青文件永远不会衰减：**

- `MEMORY.md` (根内存文件)
- `memory/` 中无日期的文件（例如，`memory/projects.md`、`memory/network.md`）
- 这些包含持久的参考信息，应始终正常排名。

**带日期的每日文件**（`memory/YYYY-MM-DD.md`）使用从文件名中提取的日期。
其他来源（例如，会话记录）会回退到文件修改时间（`mtime`）。

**示例 — 查询：“Rod 的工作安排是什么？”**

假设有这些记忆文件（今天是2月10日）：

```
memory/2025-09-15.md  → "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  → "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  → "Rod started new team, standup moved to 14:15"        (7 days old)
```

无衰减：

```
1. memory/2025-09-15.md  (score: 0.91)  ← best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

启用衰减（halfLife=30）：

```
1. memory/2026-02-10.md  (score: 0.82 × 1.00 = 0.82)  ← today, no decay
2. memory/2026-02-03.md  (score: 0.80 × 0.85 = 0.68)  ← 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 × 0.03 = 0.03)  ← 148 days, nearly gone
```

尽管拥有最佳的原始语义匹配，那篇过时的九月笔记仍落到了底部。

**何时启用：** 如果您的智能体拥有数月的每日笔记，并且发现陈旧信息的排名高于近期上下文。30天的半衰期适用于重度使用每日笔记的工作流；如果您频繁引用旧笔记，则增加该值（例如 90 天）。

#### 配置

这两个功能都在 `memorySearch.query.hybrid` 下进行配置：

```json5
agents: {
  defaults: {
    memorySearch: {
      query: {
        hybrid: {
          enabled: true,
          vectorWeight: 0.7,
          textWeight: 0.3,
          candidateMultiplier: 4,
          // Diversity: reduce redundant results
          mmr: {
            enabled: true,    // default: false
            lambda: 0.7       // 0 = max diversity, 1 = max relevance
          },
          // Recency: boost newer memories
          temporalDecay: {
            enabled: true,    // default: false
            halfLifeDays: 30  // score halves every 30 days
          }
        }
      }
    }
  }
}
```

您可以独立启用任一功能：

- **仅 MMR** — 当您有许多相似的笔记但时间不重要时很有用。
- **仅时间衰减** — 当时间相关性很重要但结果已经足够多样时很有用。
- **两者** — 推荐用于拥有大量、长期运行的每日笔记历史的代理。

### 嵌入缓存

OpenClaw 可以在 SQLite 中缓存 **chunk embeddings**，这样重新索引和频繁更新（尤其是会话记录）就不会重新嵌入未更改的文本。

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

### 会话记忆搜索（实验性）

您可以选择为 **会话记录** 建立索引并通过 `memory_search` 进行检索。
此功能位于实验性标志之后。

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

注意：

- 会话索引是**可选的**（默认关闭）。
- 会话更新经过防抖处理，并在跨越增量阈值后**异步索引**（尽力而为）。
- `memory_search` 不会在索引时阻塞；在后台同步完成之前，结果可能会略微滞后。
- 结果仍仅包含片段；`memory_get` 仍仅限于内存文件。
- 会话索引是按代理隔离的（仅索引该代理的会话日志）。
- 会话日志驻留在磁盘上 (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`)。任何具有文件系统访问权限的进程/用户都可以读取它们，因此应将磁盘访问视为信任边界。为了实现更严格的隔离，请在单独的操作系统用户或主机下运行代理。

Delta 阈值（显示默认值）：

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

### SQLite 向量加速 (sqlite-vec)

当 sqlite-vec 扩展可用时，OpenClaw 将嵌入向量存储在
SQLite 虚拟表 (`vec0`) 中，并在数据库中执行向量距离查询。
这样可以保持搜索速度，而无需将所有嵌入向量加载到 JS 中。

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

笔记：

- `enabled` 默认为 true；禁用时，搜索将回退到进程内模式
  基于存储嵌入的余弦相似度。
- 如果 sqlite-vec 扩展缺失或加载失败，OpenClaw 会记录
错误并继续使用 JS 回退方案（无向量表）。
- `extensionPath` 覆盖内置的 sqlite-vec 路径（适用于自定义构建
  或非标准安装位置）。

### 本地嵌入自动下载

- 默认本地嵌入模型：`hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf`（约 0.6 GB）。
- 当 `memorySearch.provider = "local"` 时，`node-llama-cpp` 会解析 `modelPath`；如果缺少 GGUF 文件，它会 **自动下载** 到缓存（如果设置了 `local.modelCacheDir` 则下载到该路径），然后加载它。下载会在重试时恢复。
- 原生构建要求：运行 `pnpm approve-builds`，选择 `node-llama-cpp`，然后 `pnpm rebuild node-llama-cpp`。
- 后备方案：如果本地设置失败且 `memorySearch.fallback = "openai"`，我们将自动切换到远程嵌入（除非被覆盖，否则为 `openai/text-embedding-3-small`）并记录原因。

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

备注：

- `remote.*` 优先于 `models.providers.openai.*`。
- `remote.headers` 与 OpenAI 头合并；键冲突时远程优先。省略 `remote.headers` 以使用 OpenAI 默认值。

import zh from '/components/footer/zh.mdx';

<zh />
