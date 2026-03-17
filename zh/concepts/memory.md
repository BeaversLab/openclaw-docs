---
title: "Memory"
summary: "How OpenClaw memory works (workspace files + automatic memory flush)"
read_when:
  - You want the memory file layout and workflow
  - You want to tune the automatic pre-compaction memory flush
---

# 记忆

OpenClaw 记忆是 **代理工作区中的纯 Markdown**。文件是
事实来源；模型仅“记住”写入磁盘的内容。

记忆搜索工具由活动的记忆插件提供（默认：
`memory-core`）。使用 `plugins.slots.memory = "none"` 禁用记忆插件。

## Memory files (Markdown)

默认工作区布局使用两层内存：

- `memory/YYYY-MM-DD.md`
  - 每日日志（仅追加）。
  - 在会话开始时读取今天 + 昨天的记录。
- `MEMORY.md` （可选）
  - 精选长期记忆。
  - 如果工作区根目录同时存在 `MEMORY.md` 和 `memory.md`，OpenClaw 仅加载 `MEMORY.md`。
  - 小写的 `memory.md` 仅在 `MEMORY.md` 不存在时用作回退。
  - **仅在主私人会话中加载**（绝不在群组上下文中加载）。

这些文件位于工作区下（`agents.defaults.workspace`，默认为
`~/.openclaw/workspace`）。有关完整布局，请参阅 [Agent workspace](/zh/concepts/agent-workspace)。

## Memory 工具

OpenClaw 为这些 Markdown 文件提供了两个面向代理的工具：

- `memory_search` — 对索引片段进行语义召回。
- `memory_get` — 针对特定 Markdown 文件/行范围的定向读取。

`memory_get` 现在**在文件不存在时会优雅降级**（例如，
首次写入前的每日日志）。内置管理器和 QMD
后端均返回 `{ text: "", path }` 而不是抛出 `ENOENT`，因此代理可以
处理“尚未记录任何内容”的情况并继续其工作流，而无需用 try/catch 逻辑包装
工具调用。

## 何时写入 Memory

- 决策、偏好和持久化事实放入 `MEMORY.md`。
- 日常笔记和运行上下文放入 `memory/YYYY-MM-DD.md`。
- 如果有人说“记住这个”，请将其写下来（不要将其保留在 RAM 中）。
- 此领域仍在发展中。提醒模型存储记忆会有所帮助；它知道该怎么做。
- 如果您希望某事被记住，**请要求机器人将其写入**记忆。

## 自动 memory 刷新（压缩前 ping）

当会话**接近自动压缩**时，OpenClaw 会触发一个**静默的
代理轮次**，提醒模型在上下文被压缩**之前**写入持久化记忆。默认提示明确说明模型*可能会回复*，
但通常 `NO_REPLY` 是正确的响应，以便用户永远不会看到此轮次。

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

- **软阈值**：当会话 token 估计值超过
  `contextWindow - reserveTokensFloor - softThresholdTokens` 时触发刷新。
- **默认为静默**：提示包含 `NO_REPLY`，因此不会发送任何内容。
- **两个提示词**：一个用户提示词加上一个系统提示词来附加提醒。
- **每个压缩周期执行一次刷新**（在 `sessions.json` 中跟踪）。
- **工作区必须是可写的**：如果会话在 `workspaceAccess: "ro"` 或 `"none"` 下以沙箱隔离方式运行，则跳过刷新。

有关完整的压缩生命周期，请参阅
[Session management + compaction](/zh/reference/session-management-compaction)。

## 向量记忆搜索

OpenClaw 可以在 `MEMORY.md` 和 `memory/*.md` 上构建一个小型向量索引，以便
即使措辞不同，语义查询也能找到相关的笔记。

默认设置：

- 默认启用。
- 监视记忆文件的更改（防抖动）。
- 在 `agents.defaults.memorySearch` 下配置记忆搜索（而非顶层
  `memorySearch`）。
- 默认使用远程嵌入。如果未设置 `memorySearch.provider`，OpenClaw 将自动选择：
  1. 如果配置了 `memorySearch.local.modelPath` 且文件存在，则使用 `local`。
  2. 如果可以解析 OpenAI 密钥，则使用 `openai`。
  3. 如果可以解析 Gemini 密钥，则使用 `gemini`。
  4. 如果可以解析 Voyage 密钥，则使用 `voyage`。
  5. 如果可以解析 Mistral 密钥，则使用 `mistral`。
  6. 否则，在配置之前记忆搜索将保持禁用状态。
- 本地模式使用 node-llama-cpp，并且可能需要 `pnpm approve-builds`。
- 使用 sqlite-vec（如果可用）来加速 SQLite 内部的向量搜索。
- `memorySearch.provider = "ollama"` 也支持本地/自托管的
  Ollama 嵌入（`/api/embeddings`），但不会被自动选择。

远程嵌入**需要**嵌入提供商的 API 密钥。OpenClaw 从身份验证配置文件、`models.providers.*.apiKey` 或环境变量中解析密钥。Codex OAuth 仅涵盖聊天/补全，并**不**满足内存搜索的嵌入需求。对于 Gemini，请使用 `GEMINI_API_KEY` 或 `models.providers.google.apiKey`。对于 Voyage，请使用 `VOYAGE_API_KEY` 或 `models.providers.voyage.apiKey`。对于 Mistral，请使用 `MISTRAL_API_KEY` 或 `models.providers.mistral.apiKey`。Ollama 通常不需要真实的 API 密钥（当本地策略需要时，像 `OLLAMA_API_KEY=ollama-local` 这样的占位符就足够了）。
当使用自定义的 OpenAI 兼容端点时，请设置 `memorySearch.remote.apiKey`（以及可选的 `memorySearch.remote.headers`）。

### QMD 后端（实验性）

设置 `memory.backend = "qmd"` 以将内置的 SQLite 索引器交换为 [QMD](https://github.com/tobi/qmd)：一个本地优先的搜索辅助进程，结合了 BM25 + 向量 + 重排序。Markdown 仍然是事实的来源；OpenClaw 调用 QMD 进行检索。关键点：

**先决条件**

- 默认情况下禁用。需在每个配置中选择加入 (`memory.backend = "qmd"`)。
- 单独安装 QMD CLI (`bun install -g https://github.com/tobi/qmd` 或获取发布版本)，并确保 `qmd` 二进制文件位于网关的 `PATH` 上。
- QMD 需要一个允许扩展的 SQLite 构建（macOS 上为 `brew install sqlite`）。
- QMD 通过 Bun + `node-llama-cpp` 完全在本地运行，并在首次使用时从 HuggingFace 自动下载 GGUF 模型（不需要单独的 Ollama 守护进程）。
- 通过设置 `XDG_CONFIG_HOME` 和 `XDG_CACHE_HOME`，网关在 `~/.openclaw/agents/<agentId>/qmd/` 下的自包含 XDG 主目录中运行 QMD。
- 操作系统支持：一旦安装了 Bun + SQLite，macOS 和 Linux 即可直接工作。Windows 最好通过 WSL2 获得支持。

**辅助进程如何运行**

- 网关在 `~/.openclaw/agents/<agentId>/qmd/` 下写入一个自包含的 QMD 主目录（配置 + 缓存 + sqlite DB）。
- 集合是通过 `qmd collection add` 从 `memory.qmd.paths`（以及默认的工作区记忆文件）创建的，然后在启动时和可配置的间隔（`memory.qmd.update.interval`，默认 5 m）运行 `qmd update` + `qmd embed`。
- 网关现在在启动时初始化 QMD 管理器，因此即使在第一次 `memory_search` 调用之前，周期性更新计时器也已准备就绪。
- 启动刷新现在默认在后台运行，因此不会阻止聊天启动；设置 `memory.qmd.update.waitForBootSync = true` 以保持以前的阻止行为。
- 搜索通过 `memory.qmd.searchMode` 运行（默认 `qmd search --json`；也支持 `vsearch` 和 `query`）。如果所选模式在你的 QMD 构建上拒绝标志，OpenClaw 将使用 `qmd query` 重试。如果 QMD 失败或二进制文件丢失，OpenClaw 会自动回退到内置 SQLite 管理器，以便记忆工具继续工作。
- OpenClaw 目前不公开 QMD 嵌入批量大小调整；批量行为由 QMD 本身控制。
- **首次搜索可能会很慢**：QMD 可能会在第一次 `qmd query` 运行时下载本地 GGUF 模型（重排序器/查询扩展）。
  - OpenClaw 在运行 QMD 时会自动设置 `XDG_CONFIG_HOME`/`XDG_CACHE_HOME`。
  - 如果你想手动预下载模型（并预热 OpenClaw 使用的相同索引），请使用代理的 XDG 目录运行一次性查询。

    OpenClaw 的 QMD 状态位于你的 **状态目录** 下（默认为 `~/.openclaw`）。你可以通过导出 OpenClaw 使用的相同 XDG 变量，将 `qmd` 指向完全相同的索引：

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

**配置面 (`memory.qmd.*`)**

- `command`（默认 `qmd`）：覆盖可执行文件路径。
- `searchMode`（默认 `search`）：选择哪个 QMD 命令支持 `memory_search`（`search`，`vsearch`，`query`）。
- `includeDefaultMemory`（默认 `true`）：自动索引 `MEMORY.md` + `memory/**/*.md`。
- `paths[]`：添加额外的目录/文件（`path`，可选 `pattern`，可选
  稳定 `name`）。
- `sessions`：选择加入会话 JSONL 索引（`enabled`，`retentionDays`，
  `exportDir`）。
- `update`：控制刷新频率和维护执行：
  (`interval`，`debounceMs`，`onBoot`，`waitForBootSync`，`embedInterval`，
  `commandTimeoutMs`，`updateTimeoutMs`，`embedTimeoutMs`)。
- `limits`：限制检索负载（`maxResults`，`maxSnippetChars`，
  `maxInjectedChars`，`timeoutMs`）。
- `scope`：模式与 [`session.sendPolicy`](/zh/gateway/configuration#session) 相同。
  默认为仅私信（`deny` all，`allow` direct chats）；放宽限制以在群组/频道中显示 QMD 命中结果。
  - `match.keyPrefix` 匹配 **标准化** 的会话键（小写，去除任何
    前导 `agent:<id>:`）。示例：`discord:channel:`。
  - `match.rawKeyPrefix` 匹配 **原始** 会话键（小写），包括
    `agent:<id>:`。示例：`agent:main:discord:`。
  - 旧版：`match.keyPrefix: "agent:..."` 仍被视为原始键前缀，
    但为了清晰起见，优先使用 `rawKeyPrefix`。
- 当 `scope` 拒绝搜索时，OpenClaw 会记录一条警告，其中包含派生的
  `channel`/`chatType`，以便更容易调试空结果。
- 源自工作区外的片段在 `memory_search` 结果中显示为
  `qmd/<collection>/<relative-path>`；`memory_get`
  能识别此前缀，并从配置的 QMD 集合根目录读取。
- 当 `memory.qmd.sessions.enabled = true` 时，OpenClaw 会将清理过的会话
  转录（用户/助手对话轮次）导出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的专用 QMD 集合中，以便 `memory_search` 能够在不触及内置 SQLite 索引的情况下回顾最近的对话。
- 当 `memory.citations` 为 `auto`/`on` 时，`memory_search` 片段现在会包含一个 `Source: <path#line>` 页脚；设置 `memory.citations = "off"` 可将路径元数据保留在内部（`memory_get` 仍然会接收该路径，但片段文本会省略页脚，且系统提示会警告代理不要引用它）。

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
- 当 `qmd` 运行时，我们会标记 `status().backend = "qmd"`，以便诊断信息显示哪个引擎提供了结果。如果 QMD 子进程退出或无法解析 JSON 输出，搜索管理器将记录警告并返回内置提供商（现有的 Markdown 嵌入），直到 QMD 恢复。

### 额外的记忆路径

如果想要索引默认工作区布局之外的 Markdown 文件，请添加
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
- 目录会被递归扫描以查找 `.md` 文件。
- 默认情况下，仅索引 Markdown 文件。
- 如果 `memorySearch.multimodal.enabled = true`，OpenClaw 还将仅索引 `extraPaths` 下支持的图像/音频文件。默认记忆根目录（`MEMORY.md`、`memory.md`、`memory/**/*.md`）仍仅限 Markdown。
- 符号链接（文件或目录）会被忽略。

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

- 多模态内存目前仅支持 `gemini-embedding-2-preview`。
- 多模态索引仅适用于通过 `memorySearch.extraPaths` 发现的文件。
- 此阶段支持的模态：图像和音频。
- 启用多模态内存时，`memorySearch.fallback` 必须保持 `"none"`。
- 在索引期间，匹配的图像/音频文件字节会上传到已配置的 Gemini embedding 端点。
- 支持的图像扩展名：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`。
- 支持的音频扩展名：`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`。
- 搜索查询仍然基于文本，但 Gemini 可以将这些文本查询与已索引的图像/音频嵌入进行比较。
- `memory_get` 仍然只读取 Markdown；二进制文件可搜索，但不会作为原始文件内容返回。

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

备注：

- `remote.baseUrl` 是可选的（默认为 Gemini API 基本 URL）。
- `remote.headers` 允许您根据需要添加额外的请求头。
- 默认模型：`gemini-embedding-001`。
- `gemini-embedding-2-preview` 也受支持：8192 token 限制和可配置的维度（768 / 1536 / 3072，默认为 3072）。

#### Gemini Embedding 2（预览版）

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
> 切换到 `gemini-embedding-2-preview`（3072 维）会改变向量大小。如果您将 `outputDimensionality` 在 768、1536 和 3072 之间更改，情况也是如此。
> 当检测到模型或维度更改时，OpenClaw 将自动重新索引。

如果您想使用**自定义 OpenAI 兼容端点**（OpenRouter、vLLM 或代理），
可以使用 `remote` 配置和 OpenAI 提供商：

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

回退（Fallbacks）：

- `memorySearch.fallback` 可以是 `openai`、`gemini`、`voyage`、`mistral`、`ollama`、`local` 或 `none`。
- 回退提供商仅在主要嵌入提供商失败时使用。

批量索引（OpenAI + Gemini + Voyage）：

- 默认禁用。设置 `agents.defaults.memorySearch.remote.batch.enabled = true` 以启用大规模语料库索引（OpenAI、Gemini 和 Voyage）。
- 默认行为等待批量完成；如有需要，请调整 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 设置 `remote.batch.concurrency` 以控制我们并行提交多少个批量作业（默认：2）。
- 当 `memorySearch.provider = "openai"` 或 `"gemini"` 时应用批量模式，并使用相应的 API 密钥。
- Gemini 批量作业使用异步嵌入批量端点，并要求 Gemini Batch API 可用。

为什么 OpenAI 批量处理快速且便宜：

- 对于大规模回填，OpenAI 通常是我们支持的最快选项，因为我们可以在单个批量作业中提交许多嵌入请求，并让 OpenAI 异步处理它们。
- OpenAI 为 Batch API 工作负载提供折扣价格，因此大规模索引运行通常比同步发送相同请求更便宜。
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

- `memory_search` 从 `MEMORY.md` + `memory/**/*.md` 语义搜索 Markdown 块（目标约 400 个 token，80 个 token 重叠）。它返回片段文本（限制约 700 字符）、文件路径、行范围、分数、提供商/模型，以及我们是否从本地回退到远程嵌入。不返回完整的文件负载。
- `memory_get` 读取特定的内存 Markdown 文件（相对于工作区），可选从起始行开始读取 N 行。`MEMORY.md` / `memory/` 之外的路径将被拒绝。
- 只有当 `memorySearch.enabled` 对该代理解析为 true 时，这两个工具才会启用。

### 索引内容（及时间）

- 文件类型：仅 Markdown（`MEMORY.md`，`memory/**/*.md`）。
- 索引存储：位于 `~/.openclaw/memory/<agentId>.sqlite` 的每个代理 SQLite（可通过 `agents.defaults.memorySearch.store.path` 配置，支持 `{agentId}` token）。
- 新鲜度：对 `MEMORY.md` + `memory/` 的监视器会将索引标记为脏（去抖动 1.5 秒）。同步计划在会话开始、搜索或定时间隔时进行，并异步运行。会话记录使用增量阈值来触发后台同步。
- 重新索引触发器：索引存储嵌入提供商/模型 + 端点指纹 + 分块参数。如果其中任何一个发生变化，OpenClaw 会自动重置并重新索引整个存储。

### 混合搜索（BM25 + 向量）

启用后，OpenClaw 结合使用：

- **向量相似度**（语义匹配，措辞可以不同）
- **BM25 关键词相关性**（精确 token，如 ID、环境变量、代码符号）

如果您的平台上无法使用全文搜索，OpenClaw 将回退到仅向量搜索。

#### 为什么使用混合搜索？

向量搜索非常擅长处理“这意味着同一件事”：

- “Mac Studio 网关主机”与“运行网关的机器”
- “文件更新去抖动”与“避免每次写入时都进行索引”

但它可能对精确的、高信号的 token 表现较弱：

- ID（`a828e60`，`b3b9895a…`）
- 代码符号（`memorySearch.query.hybrid`）
- 错误字符串（"sqlite-vec unavailable"）

BM25（全文检索）则相反：擅长精确匹配词元，但在处理同义转述时较弱。混合检索是折中的务实方案：**同时使用两种检索信号**，这样无论对于“自然语言”查询还是“大海捞针”式的查询，都能获得良好的结果。

#### 我们如何合并结果（当前的设计）

实现草图：

1. 从两侧检索候选池：

- **向量**：按余弦相似度排名的前 `maxResults * candidateMultiplier` 个结果。
- **BM25**：按 FTS5 BM25 排名（越低越好）的前 `maxResults * candidateMultiplier` 个结果。

2. 将 BM25 排名转换为 0 到 1 左右的分数：

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. 通过块 ID 合并候选并计算加权分数：

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

说明：

- 在配置解析中，`vectorWeight` + `textWeight` 会被归一化为 1.0，因此权重表现为百分比。
- 如果嵌入不可用（或者提供商返回零向量），我们仍然运行 BM25 并返回关键字匹配。
- 如果无法创建 FTS5，我们保留仅向量搜索（不会发生严重故障）。

这并非“信息检索（IR）理论上的完美”，但它简单、快速，并且倾向于提高实际笔记的召回率/精确率。如果我们以后想做得更花哨，常见的下一步是在混合之前进行倒数排名融合（RRF）或分数归一化（最小/最大值或 z-score）。

#### 后处理流水线

在合并向量和关键字分数之后，两个可选的后处理阶段会
在结果列表到达代理之前对其进行细化：

```
Vector + Keyword → Weighted Merge → Temporal Decay → Sort → MMR → Top-K Results
```

这两个阶段默认均为**关闭**，可以独立启用。

#### MMR 重排序（多样性）

当混合检索返回结果时，多个块可能包含相似或重叠的内容。例如，搜索“家庭网络设置”可能会返回五个几乎相同的片段，它们来自不同的每日笔记，但都提到了相同的路由器配置。

**MMR（最大边际相关性）**会对结果进行重新排序，以平衡相关性和多样性，确保顶部结果涵盖查询的不同方面，而不是重复相同的信息。

工作原理：

1. 结果根据其原始相关性（向量 + BM25 加权分数）进行评分。
2. MMR 迭代选择能使以下值最大化的结果：`λ × relevance − (1−λ) × max_similarity_to_selected`。
3. 结果之间的相似度是通过对分词后的内容使用 Jaccard 文本相似度来测量的。

`lambda` 参数控制这种权衡：

- `lambda = 1.0` → 纯相关性（无多样性惩罚）
- `lambda = 0.0` → 最大多样性（忽略相关性）
- 默认值：`0.7`（平衡，轻微的相关性偏向）

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

2月8日的近乎重复条目被剔除，Agent 获得了三条不同的信息。

**何时启用：** 如果您注意到 `memory_search` 返回冗余或近乎重复的片段，
尤其是在跨越多天重复相似信息的每日笔记中。

#### 时间衰减（近时性提升）

使用每日笔记的 Agent 随着时间推移会积累数百个带日期的文件。如果没有衰减，
六个月前措辞得当的笔记可能会在同主题的昨天更新之上排名更高。

**时间衰减** 会根据每个结果的年限对分数应用指数乘数，
因此最近的记忆自然排名更高，而旧的记忆会逐渐淡出：

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

**常青文件永远不会衰减：**

- `MEMORY.md`（根记忆文件）
- `memory/` 中的非日期文件（例如 `memory/projects.md`，`memory/network.md`）
- 这些文件包含持久的参考信息，应始终保持正常排名。

**带日期的每日文件** (`memory/YYYY-MM-DD.md`) 使用从文件名提取的日期。
其他来源（例如会话记录）回退到文件修改时间 (`mtime`)。

**示例 — 查询：“what's Rod's work schedule?”**

给定这些记忆文件（今天是 2月10日）：

```
memory/2025-09-15.md  → "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  → "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  → "Rod started new team, standup moved to 14:15"        (7 days old)
```

不使用衰减：

```
1. memory/2025-09-15.md  (score: 0.91)  ← best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

使用衰减 (halfLife=30)：

```
1. memory/2026-02-10.md  (score: 0.82 × 1.00 = 0.82)  ← today, no decay
2. memory/2026-02-03.md  (score: 0.80 × 0.85 = 0.68)  ← 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 × 0.03 = 0.03)  ← 148 days, nearly gone
```

尽管陈旧的 9 月笔记具有最佳的原生语义匹配，但它降至底部。

**何时启用：** 如果您的代理拥有数月的每日笔记，并且您发现旧的、过时的信息在排名上超过了近期的上下文。30 天的半衰期适用于重度依赖每日笔记的工作流程；如果您经常引用较旧的笔记，可以增加该值（例如 90 天）。

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

- **仅 MMR** — 当您有许多相似的笔记但时间新旧不重要时很有用。
- **仅时间衰减** — 当时间新旧很重要但您的搜索结果已经足够多样化时很有用。
- **两者都启用** — 推荐用于拥有大量、长期运行的每日笔记历史记录的代理。

### 嵌入缓存

OpenClaw 可以在 SQLite 中缓存 **块嵌入（chunk embeddings）**，因此重新索引和频繁更新（尤其是会话记录）不会重新嵌入未更改的文本。

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

您可以选择性地索引 **会话记录** 并通过 `memory_search` 展示它们。
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

- 会话索引是 **选择性加入（opt-in）** 的（默认关闭）。
- 会话更新会进行防抖处理，并在超过增量阈值后 **异步索引**（尽力而为）。
- `memory_search` 永远不会阻塞索引；在后台同步完成之前，结果可能会稍微有些过时。
- 结果仍然仅包含片段；`memory_get` 仍仅限于内存文件。
- 会话索引是按代理隔离的（仅索引该代理的会话日志）。
- 会话日志存储在磁盘上 (`~/.openclaw/agents/<agentId>/sessions/*.jsonl`)。任何具有文件系统访问权限的进程/用户都可以读取它们，因此请将磁盘访问视为信任边界。为了更严格的隔离，请在不同的操作系统用户或主机下运行代理。

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
SQLite 虚拟表 (`vec0`) 中，并在数据库中执行向量距离查询。
这可以在不将每个嵌入加载到 JS 的情况下保持快速搜索。

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

- `enabled` 默认为 true；禁用时，搜索将回退到对存储的嵌入进行进程内
  余弦相似度计算。
- 如果 sqlite-vec 扩展缺失或加载失败，OpenClaw 会记录错误并继续使用 JS 回退方案（无向量表）。
- `extensionPath` 会覆盖内置的 sqlite-vec 路径（适用于自定义构建或非标准安装位置）。

### 本地嵌入模型自动下载

- 默认本地嵌入模型：`hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf`（约 0.6 GB）。
- 当 `memorySearch.provider = "local"` 时，`node-llama-cpp` 会解析 `modelPath`；如果 GGUF 文件缺失，它将**自动下载**到缓存（或如果设置了 `local.modelCacheDir` 则下载到该路径），然后加载它。重试时会恢复下载。
- 原生构建要求：运行 `pnpm approve-builds`，选择 `node-llama-cpp`，然后 `pnpm rebuild node-llama-cpp`。
- 回退方案：如果本地设置失败且 `memorySearch.fallback = "openai"`，我们会自动切换到远程嵌入（除非被覆盖，否则为 `openai/text-embedding-3-small`）并记录原因。

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

- `remote.*` 的优先级高于 `models.providers.openai.*`。
- `remote.headers` 会与 OpenAI 的请求头合并；发生键冲突时，远程设置优先。省略 `remote.headers` 以使用 OpenAI 的默认设置。

import zh from "/components/footer/zh.mdx";

<zh />
