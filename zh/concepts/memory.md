---
title: "Memory"
summary: "How OpenClaw memory works (workspace files + automatic memory flush)"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# Memory

OpenClaw memory is **plain Markdown in the agent workspace**. The files are the
source of truth; the 模型 only "remembers" what gets written to disk.

Memory search tools are provided by the active memory plugin (default:
`memory-core`). Disable memory plugins with `plugins.slots.memory = "none"`.

## Memory files (Markdown)

The default workspace layout uses two memory layers:

- `memory/YYYY-MM-DD.md`
  - Daily log (append-only).
  - Read today + yesterday at 会话 start.
- `MEMORY.md` (optional)
  - Curated long-term memory.
  - If both `MEMORY.md` and `memory.md` exist at the workspace root, OpenClaw only loads `MEMORY.md`.
  - Lowercase `memory.md` is only used as a fallback when `MEMORY.md` is absent.
  - **Only load in the main, private 会话** (never in group contexts).

These files live under the workspace (`agents.defaults.workspace`, default
`~/.openclaw/workspace`). See [Agent workspace](/zh/concepts/agent-workspace) for the full layout.

## Memory tools

OpenClaw exposes two agent-facing tools for these Markdown files:

- `memory_search` — semantic recall over indexed snippets.
- `memory_get` — targeted read of a specific Markdown file/line range.

`memory_get` now **degrades gracefully when a file doesn't exist** (for example,
today's daily log before the first write). Both the builtin manager and the QMD
backend return `{ text: "", path }` instead of throwing `ENOENT`, so agents can
handle "nothing recorded yet" and continue their workflow without wrapping the
工具 call in try/catch logic.

## When to write memory

- Decisions, preferences, and durable facts go to `MEMORY.md`.
- Day-to-day notes and running context go to `memory/YYYY-MM-DD.md`.
- If someone says "remember this," write it down (do not keep it in RAM).
- 此领域仍在不断演进。提醒模型存储记忆很有帮助；它会知道该怎么做。
- 如果您希望保留某些内容，**请要求机器人将其写入** 记忆。

## 自动记忆刷新（预压缩 ping）

当会话**接近自动压缩**时，OpenClaw 会触发一次**静默的、代理式的轮次**，提醒模型在上下文被压缩**之前**写入持久记忆。默认提示词明确说明模型*可以回复*，但通常 `NO_REPLY` 是正确的响应，因此用户永远不会看到此轮次。

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

- **软阈值**：当会话 token 估计值超过 `contextWindow - reserveTokensFloor - softThresholdTokens` 时触发刷新。
- 默认为**静默**：提示词包含 `NO_REPLY`，因此不会发送任何内容。
- **两个提示词**：一个用户提示词加上一个系统提示词会附加提醒信息。
- **每个压缩周期刷新一次**（在 `sessions.json` 中跟踪）。
- **工作区必须可写**：如果会话在 `workspaceAccess: "ro"` 或 `"none"` 中沙箱隔离运行，则会跳过刷新。

有关完整的压缩生命周期，请参阅[会话管理 + 压缩](/zh/reference/session-management-compaction)。

## 向量记忆搜索

OpenClaw 可以在 `MEMORY.md` 和 `memory/*.md` 上构建一个小型向量索引，以便语义查询即使在措辞不同时也能找到相关的笔记。

默认值：

- 默认启用。
- 监视记忆文件的更改（防抖动）。
- 在 `agents.defaults.memorySearch` 下配置记忆搜索（而不是顶层 `memorySearch`）。
- 默认使用远程嵌入。如果未设置 `memorySearch.provider`，OpenClaw 将自动选择：
  1. 如果配置了 `memorySearch.local.modelPath` 且该文件存在，则使用 `local`。
  2. 如果可以解析 OpenAI 密钥，则使用 `openai`。
  3. 如果可以解析 Gemini 密钥，则使用 `gemini`。
  4. 如果可以解析 Voyage 密钥，则使用 `voyage`。
  5. 如果可以解析 Mistral 密钥，则使用 `mistral`。
  6. 否则，记忆搜索将保持禁用状态，直到进行配置。
- 本地模式使用 node-llama-cpp，可能需要 `pnpm approve-builds`。
- 使用 sqlite-vec（如果可用）来加速 SQLite 内部的向量搜索。
- `memorySearch.provider = "ollama"` 也支持本地/自托管的
  Ollama 嵌入 (`/api/embeddings`)，但不会自动选择它。

远程嵌入 **必须** 提供嵌入提供商的 API 密钥。OpenClaw
从配置文件、`models.providers.*.apiKey` 或环境变量中解析密钥。Codex OAuth 仅涵盖聊天/补全，并 **不** 满足
内存搜索的嵌入需求。对于 Gemini，请使用 `GEMINI_API_KEY` 或
`models.providers.google.apiKey`。对于 Voyage，请使用 `VOYAGE_API_KEY` 或
`models.providers.voyage.apiKey`。对于 Mistral，请使用 `MISTRAL_API_KEY` 或
`models.providers.mistral.apiKey`。Ollama 通常不需要真实的 API
密钥（当本地策略需要时，像 `OLLAMA_API_KEY=ollama-local` 这样的占位符就足够了）。
使用自定义的 OpenAI 兼容端点时，
请设置 `memorySearch.remote.apiKey`（以及可选的 `memorySearch.remote.headers`）。

### QMD 后端（实验性）

设置 `memory.backend = "qmd"` 以将内置的 SQLite 索引器替换为
[QMD](https://github.com/tobi/qmd)：一个本地优先的搜索伴生服务，结合了
BM25 + 向量 + 重排序。Markdown 保持为单一事实来源；OpenClaw 外部调用 QMD
进行检索。关键点：

**先决条件**

- 默认禁用。需在每个配置中选择加入 (`memory.backend = "qmd"`)。
- 单独安装 QMD CLI (`bun install -g https://github.com/tobi/qmd` 或获取
  一个发布版本)，并确保 `qmd` 二进制文件位于网关的 `PATH` 中。
- QMD 需要一个允许加载扩展的 SQLite 构建（在
  macOS 上为 `brew install sqlite`）。
- QMD 通过 Bun + `node-llama-cpp` 完全在本地运行，并在首次使用时从 HuggingFace 自动下载 GGUF
  模型（无需单独运行 Ollama 守护进程）。
- 网关通过设置 `XDG_CONFIG_HOME` 和
  `XDG_CACHE_HOME`，在 `~/.openclaw/agents/<agentId>/qmd/` 下的自包含 XDG 主目录中运行 QMD。
- 操作系统支持：一旦安装了 macOS + SQLite，Linux 和 Bun 即可开箱即用。
  Windows 最好通过 WSL2 获得支持。

**伴生服务如何运行**

- 网关在 `~/.openclaw/agents/<agentId>/qmd/` 下写入一个自包含的 QMD 主目录（配置 + 缓存 + sqlite DB）。
- 集合通过 `qmd collection add` 从 `memory.qmd.paths` 创建（加上默认的工作区内存文件），然后 `qmd update` + `qmd embed` 在启动时和可配置的间隔（`memory.qmd.update.interval`，默认 5 m）运行。
- 网关现在会在启动时初始化 QMD 管理器，因此定期更新计时器甚至在第一次 `memory_search` 调用之前就已启动。
- 启动刷新现在默认在后台运行，因此不会阻塞聊天启动；设置 `memory.qmd.update.waitForBootSync = true` 以保留以前的阻塞行为。
- 搜索通过 `memory.qmd.searchMode` 运行（默认 `qmd search --json`；也支持 `vsearch` 和 `query`）。如果所选模式拒绝您的 QMD 构建上的标志，OpenClaw 会重试 `qmd query`。如果 QMD 失败或二进制文件丢失，OpenClaw 会自动回退到内置 SQLite 管理器，以便内存工具继续工作。
- OpenClaw 目前不公开 QMD 嵌入批次大小调整；批次行为由 QMD 本身控制。
- **首次搜索可能会很慢**：QMD 可能会在第一次 `qmd query` 运行时下载本地 GGUF 模型（重排序器/查询扩展）。
  - OpenClaw 在运行 QMD 时会自动设置 `XDG_CONFIG_HOME`/`XDG_CACHE_HOME`。
  - 如果您想手动预先下载模型（并预热 OpenClaw 使用的相同索引），请使用代理的 XDG 目录运行一次性查询。

    OpenClaw 的 QMD 状态位于您的 **状态目录** 下（默认为 `~/.openclaw`）。您可以通过导出与 OpenClaw 相同的 XDG 变量，将 `qmd` 指向完全相同的索引：

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

**配置界面 (`memory.qmd.*`)**

- `command`（默认 `qmd`）：覆盖可执行文件路径。
- `searchMode`（默认 `search`）：选择哪个 QMD 命令支持 `memory_search`（`search`、`vsearch`、`query`）。
- `includeDefaultMemory`（默认 `true`）：自动索引 `MEMORY.md` + `memory/**/*.md`。
- `paths[]`：添加额外的目录/文件（`path`，可选 `pattern`，可选
  稳定的 `name`）。
- `sessions`：选择启用会话 JSONL 索引（`enabled`，`retentionDays`，
  `exportDir`）。
- `update`：控制刷新节奏和维护执行：
  （`interval`，`debounceMs`，`onBoot`，`waitForBootSync`，`embedInterval`，
  `commandTimeoutMs`，`updateTimeoutMs`，`embedTimeoutMs`）。
- `limits`：限制召回负载（`maxResults`，`maxSnippetChars`，
  `maxInjectedChars`，`timeoutMs`）。
- `scope`：架构与 [`session.sendPolicy`](/zh/gateway/configuration#session) 相同。
  默认为仅限私信（`deny` all，`allow` direct chats）；可放宽限制以在群组/频道中显示 QMD
  命中结果。
  - `match.keyPrefix` 匹配**规范化**的会话键（小写，并去除所有
    前导 `agent:<id>:`）。示例：`discord:channel:`。
  - `match.rawKeyPrefix` 匹配**原始**会话键（小写），包括
    `agent:<id>:`。示例：`agent:main:discord:`。
  - 旧版：`match.keyPrefix: "agent:..."` 仍被视为原始键前缀，
    但为清晰起见，首选 `rawKeyPrefix`。
- 当 `scope` 拒绝搜索时，OpenClaw 会记录一条警告，其中包含推导出的
  `channel`/`chatType`，以便更轻松地调试空结果。
- 工作区之外的片段在 `memory_search` 结果中显示为 `qmd/<collection>/<relative-path>`；`memory_get`
  理解该前缀，并从已配置的 QMD 集合根目录进行读取。
- 当 `memory.qmd.sessions.enabled = true` 时，OpenClaw 会将经过净化的会话
  转录内容（用户/助手轮次）导出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的专用 QMD 集合中，以便 `memory_search` 能够
  在不触及内置 SQLite 索引的情况下回忆起最近的对话。
- 当 `memory.citations` 为 `auto`/`on` 时，`memory_search` 片段现在包含 `Source: <path#line>` 页脚；请设置 `memory.citations = "off"` 以保持
  路径元数据的内部性（代理仍会接收 `memory_get` 的路径，但片段文本会省略页脚，且系统提示
  会警告代理不要引用它）。

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

**引用与回退**

- 无论后端（`auto`/`on`/`off`）如何，`memory.citations` 均适用。
- 当 `qmd` 运行时，我们会标记 `status().backend = "qmd"`，以便诊断信息显示是哪个引擎提供了结果。如果 QMD 子进程退出或无法
  解析 JSON 输出，搜索管理器将记录警告并返回内置提供商
  （现有的 Markdown 嵌入），直到 QMD 恢复。

### 附加内存路径

如果您想要索引默认工作区布局之外的 Markdown 文件，请添加
显式路径：

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
- 目录将递归扫描 `.md` 文件。
- 默认情况下，仅索引 Markdown 文件。
- 如果 `memorySearch.multimodal.enabled = true`，OpenClaw 也会仅索引 `extraPaths` 下支持的图像/音频文件。默认内存根目录（`MEMORY.md`、 `memory.md`、 `memory/**/*.md`）仍保持仅限 Markdown。
- 符号链接（文件或目录）会被忽略。

### 多模态内存文件 (Gemini 图像 + 音频)

当使用 Gemini embedding 2 时，OpenClaw 可以从 `memorySearch.extraPaths` 索引图像和音频文件：

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

注意事项：

- 目前仅 `gemini-embedding-2-preview` 支持多模态记忆。
- 多模态索引仅适用于通过 `memorySearch.extraPaths` 发现的文件。
- 此阶段支持的模态：图像和音频。
- 启用多模态记忆时，`memorySearch.fallback` 必须保持 `"none"` 状态。
- 在索引期间，匹配的图像/音频文件字节会上传到配置的 Gemini 嵌入端点。
- 支持的图像扩展名：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`。
- 支持的音频扩展名：`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`。
- 搜索查询仍然是文本，但 Gemini 可以将这些文本查询与已索引的图像/音频嵌入进行比较。
- `memory_get` 仍然仅读取 Markdown；二进制文件可搜索但不会作为原始文件内容返回。

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

注意事项：

- `remote.baseUrl` 是可选的（默认为 Gemini API 基础 URL）。
- 如果需要，`remote.headers` 允许您添加额外的标头。
- 默认模型：`gemini-embedding-001`。
- 也支持 `gemini-embedding-2-preview`：8192 token 限制和可配置的维度（768 / 1536 / 3072，默认为 3072）。

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

> **⚠️ 需要重新索引：** 从 `gemini-embedding-001`（768 维）
> 切换到 `gemini-embedding-2-preview`（3072 维）会改变向量大小。如果您
> 在 768、1536 和 3072 之间更改 `outputDimensionality`，情况也是如此。
> OpenClaw 在检测到模型或维度更改时会自动重新索引。

如果您想使用**自定义 OpenAI 兼容端点**（OpenRouter、vLLM 或代理），
您可以将 `remote` 配置与 OpenAI 提供商一起使用：

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

如果您不想设置 API 密钥，请使用 `memorySearch.provider = "local"` 或设置
`memorySearch.fallback = "none"`。

回退：

- `memorySearch.fallback` 可以是 `openai`、`gemini`、`voyage`、`mistral`、`ollama`、`local` 或 `none`。
- 仅在主要嵌入提供商失败时才使用回退提供商。

批量索引 (OpenAI + Gemini + Voyage)：

- 默认禁用。设置 `agents.defaults.memorySearch.remote.batch.enabled = true` 以针对大型语料库索引（OpenAI、Gemini 和 Voyage）启用。
- 默认行为等待批处理完成；如果需要，可调整 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 设置 `remote.batch.concurrency` 以控制我们并行提交的批处理作业数量（默认：2）。
- 当 `memorySearch.provider = "openai"` 或 `"gemini"` 时应用批处理模式，并使用相应的 API 密钥。
- Gemini 批处理作业使用异步嵌入批处理端点，并要求 Gemini Batch API 可用。

为什么 OpenAI 批处理既快速又廉价：

- 对于大量回填，OpenAI 通常是我们支持的最快选项，因为我们可以在单个批处理作业中提交许多嵌入请求，并让 OpenAI 异步处理它们。
- OpenAI 为 Batch API 工作负载提供折扣价格，因此大型索引运行通常比同步发送相同请求更便宜。
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

- `memory_search` — 返回带有文件 + 行范围的片段。
- `memory_get` — 按路径读取内存文件内容。

本地模式：

- 设置 `agents.defaults.memorySearch.provider = "local"`。
- 提供 `agents.defaults.memorySearch.local.modelPath`（GGUF 或 `hf:` URI）。
- 可选：设置 `agents.defaults.memorySearch.fallback = "none"` 以避免远程回退。

### 内存工具如何工作

- `memory_search` 对来自 `MEMORY.md` + `memory/**/*.md` 的 Markdown 块（目标约 400 个 token，80 token 重叠）进行语义搜索。它返回片段文本（上限约 700 字符）、文件路径、行范围、分数、提供商/模型，以及我们是否从本地回退到远程嵌入。不返回完整的文件负载。
- `memory_get` 读取特定的内存 Markdown 文件（相对于工作区），可选择从起始行开始读取 N 行。拒绝 `MEMORY.md` / `memory/` 之外的路径。
- 仅当 `memorySearch.enabled` 对 Agent 解析为 true 时，这两个工具才会启用。

### 建立索引的内容（及时间）

- 文件类型：仅 Markdown (`MEMORY.md`, `memory/**/*.md`)。
- 索引存储：每个 Agent 的 SQLite 位于 `~/.openclaw/memory/<agentId>.sqlite`（可通过 `agents.defaults.memorySearch.store.path` 配置，支持 `{agentId}` token）。
- 新鲜度：对 `MEMORY.md` + `memory/` 的监视器会将索引标记为脏（防抖 1.5 秒）。同步安排在会话开始时、搜索时或按间隔进行，并异步运行。会话记录使用增量阈值来触发后台同步。
- 重建索引触发器：索引存储嵌入 **提供商/模型 + 端点指纹 + 分块参数**。如果其中任何一项发生变化，OpenClaw 会自动重置并重建整个存储的索引。

### 混合搜索 (BM25 + 向量)

启用后，OpenClaw 结合了：

- **向量相似度**（语义匹配，措辞可能不同）
- **BM25 关键词相关性**（精确 token，如 ID、环境变量、代码符号）

如果您的平台上无法使用全文搜索，OpenClaw 将回退到仅向量搜索。

#### 为什么采用混合搜索？

向量搜索擅长“意思相同”的情况：

- “Mac Studio gateway host” vs “the machine running the gateway”
- “debounce file updates” vs “avoid indexing on every write”

但对于精确的、高信号 token 可能较弱：

- ID (`a828e60`, `b3b9895a…`)
- 代码符号 (`memorySearch.query.hybrid`)
- 错误字符串 ("sqlite-vec unavailable")

BM25（全文检索）则恰恰相反：擅长精确匹配词元，但在意译查询上较弱。
混合搜索是一种务实的折中方案：**同时使用两种检索信号**，这样无论是针对“自然语言”查询还是“大海捞针”式的查询，都能获得良好的结果。

#### 我们如何合并结果（当前设计）

实现草图：

1. 从两侧检索候选池：

- **向量**：按余弦相似度取前 `maxResults * candidateMultiplier` 个。
- **BM25**：按 FTS5 BM25 排名（越低越好）取前 `maxResults * candidateMultiplier` 个。

2. 将 BM25 排名转换为 0..1 左右的分数：

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. 按分块 ID 合并候选结果并计算加权分数：

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

注意事项：

- `vectorWeight` + `textWeight` 在配置解析时会被归一化为 1.0，因此权重表现为百分比。
- 如果嵌入不可用（或者提供商返回零向量），我们仍然运行 BM25 并返回关键词匹配。
- 如果无法创建 FTS5，我们保持仅向量搜索（不会导致严重失败）。

这虽然不是“信息检索理论上完美”的方案，但它简单、快速，并且往往能提高真实笔记的召回率/准确率。
如果我们以后想要更复杂的方法，常见的下一步是倒数排名融合（RRF）或在混合前进行分数归一化（最小/最大值或 z-score）。

#### 后处理流水线

在合并向量和关键词分数后，有两个可选的后处理阶段
会在结果列表发送给代理之前对其进行优化：

```
Vector + Keyword → Weighted Merge → Temporal Decay → Sort → MMR → Top-K Results
```

这两个阶段默认都是**关闭的**，可以独立启用。

#### MMR 重排序（多样性）

当混合搜索返回结果时，多个分块可能包含相似或重叠的内容。
例如，搜索“家庭网络设置”可能会从不同的每日笔记中返回五个几乎相同的片段，
而这些笔记都提到了相同的路由器配置。

**MMR（最大边际相关性）** 会对结果进行重新排序，以平衡相关性与多样性，
确保顶部结果涵盖查询的不同方面，而不是重复相同的信息。

工作原理：

1. 结果根据其原始相关性（向量 + BM25 加权分数）进行评分。
2. MMR 迭代选择能使以下值最大化的结果：`λ × relevance − (1−λ) × max_similarity_to_selected`。
3. 结果之间的相似度是使用标记化内容上的 Jaccard 文本相似度来衡量的。

`lambda` 参数控制着这种权衡：

- `lambda = 1.0` → 纯相关性（无多样性惩罚）
- `lambda = 0.0` → 最大多样性（忽略相关性）
- 默认值：`0.7`（平衡，轻微的相关性偏差）

**示例 — 查询：“home network setup”**

给定这些记忆文件：

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

2 月 8 日的近似重复项被排除，代理获得了三条不同的信息。

**何时启用：** 如果您注意到 `memory_search` 返回冗余或近似重复的片段，
特别是对于经常在几天内重复类似信息的每日笔记。

#### 时间衰减（近期性提升）

使用每日笔记的代理随着时间的推移会积累数百个带日期的文件。如果没有衰减，
六个月前措辞得当的笔记可能会在排名上超过昨天关于同一主题的更新。

**时间衰减**根据每个结果的年龄对分数应用指数乘数，
因此近期的记忆自然排名更高，而旧的记忆会逐渐淡出：

```
decayedScore = score × e^(-λ × ageInDays)
```

其中 `λ = ln(2) / halfLifeDays`。

使用默认的 30 天半衰期：

- 今天的笔记：原始分数的 **100%**
- 7 天前：**~84%**
- 30 天前：**50%**
- 90 天前：**12.5%**
- 180 天前：**~1.6%**

**常青文件永不衰减：**

- `MEMORY.md`（根记忆文件）
- `memory/` 中的非日期文件（例如，`memory/projects.md`，`memory/network.md`）
- 这些文件包含持久的参考信息，应始终正常排名。

**带日期的每日文件** (`memory/YYYY-MM-DD.md`) 使用从文件名中提取的日期。
其他来源（例如，会话记录）回退到文件修改时间 (`mtime`)。

**示例 — 查询：“what's Rod's work schedule?”**

给定这些记忆文件（今天是 2 月 10 日）：

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

有衰减 (halfLife=30)：

```
1. memory/2026-02-10.md  (score: 0.82 × 1.00 = 0.82)  ← today, no decay
2. memory/2026-02-03.md  (score: 0.80 × 0.85 = 0.68)  ← 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 × 0.03 = 0.03)  ← 148 days, nearly gone
```

过时的 9 月笔记降到了底部，尽管它具有最好的原始语义匹配。

**何时启用：** 如果您的智能体拥有数月的每日笔记，并且您发现旧的、过时的信息排在近期上下文之前。对于重度依赖每日笔记的工作流，30 天的半衰期效果很好；如果您经常引用较旧的笔记，请增加该值（例如 90 天）。

#### 配置

这两个功能均在 `memorySearch.query.hybrid` 下进行配置：

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

- **仅 MMR** — 当您有许多相似笔记但时间早晚不重要时很有用。
- **仅时间衰减** — 当时间早晚很重要但您的结果已经具有多样性时很有用。
- **两者** — 推荐用于拥有大量长期每日笔记历史的智能体。

### 嵌入缓存

OpenClaw 可以在 SQLite 中缓存 **分块嵌入 (chunk embeddings)**，因此重新索引和频繁更新（尤其是会话记录）不会对未更改的文本重新进行嵌入。

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

您可以选择索引 **会话记录** 并通过 `memory_search` 展示它们。
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

注意事项：

- 会话索引默认为 **选择启用 (opt-in)**（默认关闭）。
- 会话更新会进行防抖处理，并在超过增量阈值后 **异步索引**（尽力而为）。
- `memory_search` 不会阻塞索引操作；在后台同步完成之前，结果可能会略有延迟。
- 结果仍仅包含片段；`memory_get` 仍仅限于内存文件。
- 会话索引是按智能体隔离的（仅索引该智能体的会话日志）。
- 会话日志存储在磁盘上 (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`)。任何拥有文件系统访问权限的进程/用户都可以读取它们，因此请将磁盘访问视为信任边界。为了更严格的隔离，请在不同的操作系统用户或主机下运行智能体。

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

### SQLite 向量加速 (sqlite-vec)

当 sqlite-vec 扩展可用时，OpenClaw 会将嵌入存储在
SQLite 虚拟表 (`vec0`) 中，并在
数据库中执行向量距离查询。这可以在不将每个嵌入加载到 JS 的情况下保持快速搜索。

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

注意事项：

- `enabled` 默认为 true；当禁用时，搜索将回退到对存储的嵌入进行进程内
  余弦相似度计算。
- 如果 sqlite-vec 扩展缺失或加载失败，OpenClaw 会记录错误并继续使用 JS 回退方案（无向量表）。
- `extensionPath` 会覆盖捆绑的 sqlite-vec 路径（适用于自定义构建或非标准安装位置）。

### 本地嵌入自动下载

- 默认本地嵌入模型：`hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf`（约 0.6 GB）。
- 当 `memorySearch.provider = "local"` 时，`node-llama-cpp` 会解析 `modelPath`；如果缺少 GGUF 文件，它会**自动下载**到缓存（如果设置了 `local.modelCacheDir` 则下载到此处），然后加载它。下载支持断点续传。
- 原生构建要求：运行 `pnpm approve-builds`，选择 `node-llama-cpp`，然后 `pnpm rebuild node-llama-cpp`。
- 回退：如果本地设置失败且 `memorySearch.fallback = "openai"`，我们将自动切换到远程嵌入（除非被覆盖，否则为 `openai/text-embedding-3-small`）并记录原因。

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

注意：

- `remote.*` 优先于 `models.providers.openai.*`。
- `remote.headers` 与 OpenAI 标头合并；在键冲突时远程获胜。省略 `remote.headers` 以使用 OpenAI 默认值。

import zh from "/components/footer/zh.mdx";

<zh />
