---
title: "内存配置参考"
summary: "OpenClaw 内存搜索、嵌入提供商、QMD 后端、混合搜索和多模态内存的完整配置参考"
read_when:
  - You want to configure memory search providers or embedding models
  - You want to set up the QMD backend
  - You want to tune hybrid search, MMR, or temporal decay
  - You want to enable multimodal memory indexing
---

# 内存配置参考

本页面涵盖了 OpenClaw 内存搜索的完整配置项。有关概念概述（文件布局、内存工具、何时写入内存以及自动刷新），请参阅[内存](/zh/concepts/memory)。

## 内存搜索默认值

- 默认启用。
- 监视内存文件的变化（防抖动）。
- 在 `agents.defaults.memorySearch` 下配置内存搜索（而不是顶级
  `memorySearch`）。
- 默认使用远程嵌入。如果未设置 `memorySearch.provider`，OpenClaw 将自动选择：
  1. 如果配置了 `memorySearch.local.modelPath` 并且该文件存在，则使用 `local`。
  2. 如果可以解析 OpenAI 密钥，则使用 `openai`。
  3. 如果可以解析 Gemini 密钥，则使用 `gemini`。
  4. 如果可以解析 Voyage 密钥，则使用 `voyage`。
  5. 如果可以解析 Mistral 密钥，则使用 `mistral`。
  6. 否则，内存搜索将保持禁用状态，直到进行配置。
- 本地模式使用 node-llama-cpp，可能需要 `pnpm approve-builds`。
- 使用 sqlite-vec（如果可用）来加速 SQLite 内部的向量搜索。
- `memorySearch.provider = "ollama"` 也支持本地/自托管的
  Ollama 嵌入（`/api/embeddings`），但不会自动选择。

远程嵌入**需要**嵌入提供商的 API 密钥。OpenClaw
从身份验证配置文件、`models.providers.*.apiKey` 或环境变量中解析密钥。Codex OAuth 仅涵盖聊天/补全，并且**不**满足
内存搜索的嵌入需求。对于 Gemini，请使用 `GEMINI_API_KEY` 或
`models.providers.google.apiKey`。对于 Voyage，请使用 `VOYAGE_API_KEY` 或
`models.providers.voyage.apiKey`。对于 Mistral，请使用 `MISTRAL_API_KEY` 或
`models.providers.mistral.apiKey`。Ollama 通常不需要真正的 API
密钥（当本地策略需要时，像 `OLLAMA_API_KEY=ollama-local` 这样的占位符就足够了）。
当使用自定义 OpenAI 兼容端点时，
请设置 `memorySearch.remote.apiKey`（以及可选的 `memorySearch.remote.headers`）。

## QMD 后端（实验性）

设置 `memory.backend = "qmd"` 以将内置的 SQLite 索引器替换为
[QMD](https://github.com/tobi/qmd)：一个本地优先的搜索 sidecar，它结合了
BM25 + 向量 + 重排序。Markdown 仍然是单一事实来源；OpenClaw 外壳
程序调用 QMD 进行检索。要点：

### 先决条件

- 默认情况下禁用。需按配置选择加入 (`memory.backend = "qmd"`)。
- 单独安装 QMD CLI（`bun install -g https://github.com/tobi/qmd` 或获取
  一个发行版）并确保 `qmd` 二进制文件位于网关的 `PATH` 上。
- QMD 需要一个允许扩展的 SQLite 构建（在 macOS 上
  为 `brew install sqlite`）。
- QMD 通过 Bun + `node-llama-cpp` 完全在本地运行，并在首次使用时自动从 HuggingFace 下载 GGUF
  模型（无需单独的 Ollama 守护进程）。
- 网关通过设置 `XDG_CONFIG_HOME` 和
  `XDG_CACHE_HOME`，在 `~/.openclaw/agents/<agentId>/qmd/` 下的自包含 XDG 主目录中
  运行 QMD。
- 操作系统支持：一旦安装了 macOS + SQLite，Linux 和 Bun 即可直接开箱即用。
  Windows 最好通过 WSL2 获得支持。

### Sidecar 如何运行

- 网关在 `~/.openclaw/agents/<agentId>/qmd/` 下写入一个自包含的 QMD 主目录
  （配置 + 缓存 + sqlite 数据库）。
- 集合通过 `qmd collection add` 从 `memory.qmd.paths` 创建（加上默认工作区内存文件），然后 `qmd update` + `qmd embed` 在启动时和可配置的间隔（`memory.qmd.update.interval`，默认 5 m）运行。
- 网关现在在启动时初始化 QMD 管理器，因此即使在进行第一次 `memory_search` 调用之前，定期更新计时器也已启动。
- 启动刷新现在默认在后台运行，因此不会阻塞聊天启动；设置 `memory.qmd.update.waitForBootSync = true` 以保持之前的阻塞行为。
- 搜索通过 `memory.qmd.searchMode` 运行（默认 `qmd search --json`；也支持 `vsearch` 和 `query`）。如果所选模式在您的 QMD 构建上拒绝标志，OpenClaw 将使用 `qmd query` 重试。如果 QMD 失败或二进制文件丢失，OpenClaw 将自动回退到内置 SQLite 管理器，以便内存工具继续工作。
- OpenClaw 目前不公开 QMD 嵌入批量大小调整；批量行为由 QMD 本身控制。
- **首次搜索可能会很慢**：在第一次 `qmd query` 运行时，QMD 可能会下载本地 GGUF 模型（重排序器/查询扩展）。
  - 当 OpenClaw 运行 QMD 时，会自动设置 `XDG_CONFIG_HOME`/`XDG_CACHE_HOME`。
  - 如果您想手动预下载模型（并预热 OpenClaw 使用的相同索引），请使用代理的 XDG 目录运行一次性查询。

    OpenClaw 的 QMD 状态位于您的 **state dir** 下（默认为 `~/.openclaw`）。您可以通过导出与 OpenClaw 使用的相同 XDG 变量，将 `qmd` 指向完全相同的索引：

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

### Config surface (`memory.qmd.*`)

- `command`（默认 `qmd`）：覆盖可执行文件路径。
- `searchMode`（默认 `search`）：选择哪个 QMD 命令支持 `memory_search`（`search`、`vsearch`、`query`）。
- `includeDefaultMemory`（默认 `true`）：自动索引 `MEMORY.md` + `memory/**/*.md`。
- `paths[]`：添加额外的目录/文件（`path`，可选 `pattern`，可选
  稳定 `name`）。
- `sessions`：选择加入会话 JSONL 索引（`enabled`，`retentionDays`，
  `exportDir`）。
- `update`：控制刷新节奏和维护执行：
  （`interval`，`debounceMs`，`onBoot`，`waitForBootSync`，`embedInterval`，
  `commandTimeoutMs`，`updateTimeoutMs`，`embedTimeoutMs`）。
- `limits`：限制召回负载（`maxResults`，`maxSnippetChars`，
  `maxInjectedChars`，`timeoutMs`）。
- `scope`：与 [`session.sendPolicy`](/zh/gateway/configuration-reference#session) 具有相同的架构。
  默认为仅私信（`deny` 所有，`allow` 直接聊天）；放宽限制以在群组/频道中显示 QMD
  命中。
  - `match.keyPrefix` 匹配 **规范化** 的会话密钥（小写，去掉任何
    前导 `agent:<id>:`）。示例：`discord:channel:`。
  - `match.rawKeyPrefix` 匹配 **原始** 会话密钥（小写），包括
    `agent:<id>:`。示例：`agent:main:discord:`。
  - 旧版：`match.keyPrefix: "agent:..."` 仍被视为原始密钥前缀，
    但为清晰起见，首选 `rawKeyPrefix`。
- 当 `scope` 拒绝搜索时，OpenClaw 会记录一条警告，其中包含派生的
  `channel`/`chatType`，以便更轻松地调试空结果。
- 源自工作区之外的代码片段会在 `memory_search` 结果中显示为
  `qmd/<collection>/<relative-path>`；`memory_get`
  能识别该前缀，并从已配置的 QMD 集合根目录进行读取。
- 当 `memory.qmd.sessions.enabled = true` 时，OpenClaw 会将经过净化的会话
  转录（用户/助手对话轮次）导出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的专用 QMD 集合中，以便 `memory_search` 可以在不触及内置 SQLite 索引的情况下
  回顾最近的对话。
- 当 `memory.citations` 为 `auto`/`on` 时，`memory_search` 代码片段现在包含 `Source: <path#line>` 页脚；
  设置 `memory.citations = "off"` 可将路径元数据保留在内部（代理仍会收到用于
  `memory_get` 的路径，但片段文本会省略页脚，且系统提示
  会警告代理不要引用它）。

### QMD 示例

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

### 引用与回退

- 无论使用何种后端（`auto`/`on`/`off`），`memory.citations` 均适用。
- 当 `qmd` 运行时，我们会标记 `status().backend = "qmd"`，以便诊断信息显示
  是哪个引擎提供了结果。如果 QMD 子进程退出或无法解析 JSON 输出，
  搜索管理器将记录警告并返回内置提供商（现有的 Markdown 嵌入），
  直到 QMD 恢复。

## 其他内存路径

如果要索引默认工作区布局之外的 Markdown 文件，请添加
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

注意事项：

- 路径可以是绝对路径，也可以是相对于工作区的路径。
- 目录会被递归扫描以查找 `.md` 文件。
- 默认情况下，仅索引 Markdown 文件。
- 如果 `memorySearch.multimodal.enabled = true`，OpenClaw 也会仅对 `extraPaths` 下支持的图像/音频文件进行索引。默认内存根目录（`MEMORY.md`、 `memory.md`、 `memory/**/*.md`）保持为仅限 Markdown。
- 符号链接（文件或目录）会被忽略。

## 多模态内存文件（Gemini 图像 + 音频）

OpenClaw 可以在使用 Gemini embedding 2 时，从 `memorySearch.extraPaths` 索引图像和音频文件：

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

- 目前多模态存储仅支持 `gemini-embedding-2-preview`。
- 多模态索引仅适用于通过 `memorySearch.extraPaths` 发现的文件。
- 此阶段支持的模态：图像和音频。
- 启用多模态存储时，`memorySearch.fallback` 必须保持为 `"none"`。
- 匹配的图像/音频文件字节将在索引期间上传到配置的 Gemini embedding 端点。
- 支持的图像扩展名：`.jpg`、`.jpeg`、`.png`、`.webp`、`.gif`、`.heic`、`.heif`。
- 支持的音频扩展名：`.mp3`、`.wav`、`.ogg`、`.opus`、`.m4a`、`.aac`、`.flac`。
- 搜索查询仍为文本，但 Gemini 可以将这些文本查询与索引的图像/音频嵌入进行比较。
- `memory_get` 仍然仅读取 Markdown；二进制文件可搜索，但不会作为原始文件内容返回。

## Gemini 嵌入（原生）

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
- `gemini-embedding-2-preview` 也受支持：8192 令牌限制和可配置维度（768 / 1536 / 3072，默认为 3072）。

### Gemini Embedding 2（预览版）

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

> **需要重新索引：** 从 `gemini-embedding-001`（768 维）
> 切换到 `gemini-embedding-2-preview`（3072 维）会改变向量大小。如果您在 768、1536 和 3072 之间更改 `outputDimensionality` 也是如此。
> OpenClaw 在检测到模型或维度更改时会自动重新索引。

## 自定义 OpenAI 兼容端点

如果您想使用自定义的 OpenAI 兼容端点（OpenRouter、vLLM 或代理），
您可以使用 `remote` 配置与 OpenAI 提供商：

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

### 回退

- `memorySearch.fallback` 可以是 `openai`、`gemini`、`voyage`、`mistral`、`ollama`、`local` 或 `none`。
- 仅当主要嵌入提供商失败时才会使用回退提供商。

### 批量索引（OpenAI + Gemini + Voyage）

- 默认禁用。设置 `agents.defaults.memorySearch.remote.batch.enabled = true` 以针对大规模语料库索引（OpenAI、Gemini 和 Voyage）启用。
- 默认行为会等待批次完成；如有需要，请调整 `remote.batch.wait`、`remote.batch.pollIntervalMs` 和 `remote.batch.timeoutMinutes`。
- 设置 `remote.batch.concurrency` 以控制我们并行提交多少个批处理作业（默认：2）。
- 当使用 `memorySearch.provider = "openai"` 或 `"gemini"` 时，批量模式生效，并使用相应的 API 密钥。
- Gemini 批处理作业使用异步嵌入批量端点，并要求 Gemini Batch API 可用。

为什么 OpenAI 批处理快速且便宜：

- 对于大规模回填，OpenAI 通常是我们支持的最快选项，因为我们可以在单个批处理作业中提交许多嵌入请求，并让 OpenAI 异步处理它们。
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

## 记忆工具如何工作

- `memory_search` 对来自 `MEMORY.md` + `memory/**/*.md` 的 Markdown 块（目标约 400 个 token，80 个 token 重叠）进行语义搜索。它返回片段文本（限制约 700 个字符）、文件路径、行范围、评分、提供商/模型，以及我们是否从本地回退到了远程嵌入。不返回完整的文件内容。
- `memory_get` 读取特定的内存 Markdown 文件（相对于工作区），可选择从起始行开始读取 N 行。拒绝 `MEMORY.md` / `memory/` 之外的路径。
- 只有当 `memorySearch.enabled` 对该代理解析为 true 时，这两个工具才会启用。

## 索引内容与时机

- 文件类型：仅限 Markdown（`MEMORY.md`、`memory/**/*.md`）。
- 索引存储：位于 `~/.openclaw/memory/<agentId>.sqlite` 的每个代理 SQLite 数据库（可通过 `agents.defaults.memorySearch.store.path` 配置，支持 `{agentId}` token）。
- 新鲜度：对 `MEMORY.md` + `memory/` 的监视器会将索引标记为脏（防抖 1.5 秒）。同步在会话开始、搜索或按间隔安排，并异步运行。会话记录使用增量阈值来触发后台同步。
- 重建索引触发器：索引存储嵌入 **提供商/模型 + 端点指纹 + 分块参数**。如果其中任何一项发生变化，OpenClaw 会自动重置并重新索引整个存储。

## 混合搜索 (BM25 + 向量)

启用后，OpenClaw 结合了：

- **向量相似度**（语义匹配，措辞可以不同）
- **BM25 关键词相关性**（精确的 token，如 ID、环境变量、代码符号）

如果您平台上的全文搜索不可用，OpenClaw 将回退到仅向量搜索。

### 为何采用混合搜索

向量搜索非常擅长处理“意思相同”的情况：

- "Mac Studio 网关主机" vs "运行网关的机器"
- "文件更新防抖" vs "避免在每次写入时进行索引"

但在精确、高信噪比的 token 方面可能较弱：

- ID (`a828e60`、`b3b9895a...`)
- 代码符号 (`memorySearch.query.hybrid`)
- 错误字符串（"sqlite-vec unavailable"）

BM25（全文）则相反：在精确匹配 Token 方面表现强，在处理同义转述时较弱。
混合搜索是实用的折中方案：**同时使用两种检索信号**，这样无论是“自然语言”查询还是“大海捞针”式的查询，都能获得良好的结果。

### 我们如何合并结果（当前的设计）

实现草图：

1. 从两侧检索候选池：

- **向量**：按余弦相似度取前 `maxResults * candidateMultiplier` 个结果。
- **BM25**：按 FTS5 BM25 排名（越低越好）取前 `maxResults * candidateMultiplier` 个结果。

2. 将 BM25 排名转换为 0..1 左右的分数：

- `textScore = 1 / (1 + max(0, bm25Rank))`

3. 按块 ID 合并候选集并计算加权分数：

- `finalScore = vectorWeight * vectorScore + textWeight * textScore`

注意：

- `vectorWeight` + `textWeight` 在配置解析时会被归一化为 1.0，因此权重的表现类似于百分比。
- 如果嵌入不可用（或者提供商返回零向量），我们仍然运行 BM25 并返回关键词匹配项。
- 如果无法创建 FTS5，我们保持仅向量搜索（不会硬性失败）。

这虽然算不上“信息检索理论上的完美”，但它简单、快速，并且往往能提高真实笔记的召回率/准确率。
如果以后想做得更花哨，常见的下一步是在混合之前采用倒数排名融合（RRF）或分数归一化
（最小/最大值或 z-score）。

### 后处理流水线

在合并向量和关键词分数后，两个可选的后处理阶段
会在结果列表到达 Agent 之前对其进行细化：

```
Vector + Keyword -> Weighted Merge -> Temporal Decay -> Sort -> MMR -> Top-K Results
```

这两个阶段**默认关闭**，可以独立启用。

### MMR 重排序（多样性）

当混合搜索返回结果时，多个块可能包含相似或重叠的内容。
例如，搜索“家庭网络设置”可能会返回五个几乎相同的片段，
它们来自不同的每日笔记，但都提到了相同的路由器配置。

**MMR（最大边际相关性）**会对结果进行重新排序，以平衡相关性和多样性，
确保热门结果覆盖查询的不同方面，而不是重复相同的信息。

工作原理：

1. 结果根据其原始相关性（向量 + BM25 加权分数）进行评分。
2. MMR 迭代选择能最大化以下值的结果：`lambda x relevance - (1-lambda) x max_similarity_to_selected`。
3. 结果之间的相似度是通过对分词后的内容使用 Jaccard 文本相似度来衡量的。

`lambda` 参数控制这种权衡：

- `lambda = 1.0` -- 纯相关性（无多样性惩罚）
- `lambda = 0.0` -- 最大多样性（忽略相关性）
- 默认值：`0.7`（平衡，略偏向相关性）

**示例 -- 查询："home network setup"**

给定这些记忆文件：

```
memory/2026-02-10.md  -> "Configured Omada router, set VLAN 10 for IoT devices"
memory/2026-02-08.md  -> "Configured Omada router, moved IoT to VLAN 10"
memory/2026-02-05.md  -> "Set up AdGuard DNS on 192.168.10.2"
memory/network.md     -> "Router: Omada ER605, AdGuard: 192.168.10.2, VLAN 10: IoT"
```

不使用 MMR -- 前 3 个结果：

```
1. memory/2026-02-10.md  (score: 0.92)  <- router + VLAN
2. memory/2026-02-08.md  (score: 0.89)  <- router + VLAN (near-duplicate!)
3. memory/network.md     (score: 0.85)  <- reference doc
```

使用 MMR (lambda=0.7) -- 前 3 个结果：

```
1. memory/2026-02-10.md  (score: 0.92)  <- router + VLAN
2. memory/network.md     (score: 0.85)  <- reference doc (diverse!)
3. memory/2026-02-05.md  (score: 0.78)  <- AdGuard DNS (diverse!)
```

2 月 8 日的近似重复条目被剔除，Agent 获得了三条不同的信息。

**何时启用：** 如果您注意到 `memory_search` 返回了冗余或近似重复的片段，尤其是对于那些经常在几天内重复类似信息的每日笔记时。

### 时间衰减（近期性提升）

拥有每日笔记的 Agent 随着时间推移会积累数百个带日期的文件。如果没有衰减，六个月前措辞得当的笔记可能会在排名上压过昨天关于同一主题的更新。

**时间衰减**根据每个结果的年龄对分数应用指数乘数，从而使近期的记忆自然排名更高，而旧的记忆则逐渐淡出：

```
decayedScore = score x e^(-lambda x ageInDays)
```

其中 `lambda = ln(2) / halfLifeDays`。

使用默认的 30 天半衰期：

- 今天的笔记：原始分数的 **100%**
- 7 天前：**~84%**
- 30 天前：**50%**
- 90 天前：**12.5%**
- 180 天前：**~1.6%**

**常青文件永远不会衰减：**

- `MEMORY.md`（根记忆文件）
- `memory/` 中不带日期的文件（例如 `memory/projects.md`、`memory/network.md`）
- 这些包含持久的参考信息，应始终正常排名。

**带日期的每日文件**（`memory/YYYY-MM-DD.md`）使用从文件名提取的日期。其他来源（例如会话记录）则回退到文件修改时间（`mtime`）。

**示例 -- 查询："what's Rod's work schedule?"**

给定这些记忆文件（今天是 2 月 10 日）：

```
memory/2025-09-15.md  -> "Rod works Mon-Fri, standup at 10am, pairing at 2pm"  (148 days old)
memory/2026-02-10.md  -> "Rod has standup at 14:15, 1:1 with Zeb at 14:45"    (today)
memory/2026-02-03.md  -> "Rod started new team, standup moved to 14:15"        (7 days old)
```

不使用衰减：

```
1. memory/2025-09-15.md  (score: 0.91)  <- best semantic match, but stale!
2. memory/2026-02-10.md  (score: 0.82)
3. memory/2026-02-03.md  (score: 0.80)
```

使用衰减（halfLife=30）：

```
1. memory/2026-02-10.md  (score: 0.82 x 1.00 = 0.82)  <- today, no decay
2. memory/2026-02-03.md  (score: 0.80 x 0.85 = 0.68)  <- 7 days, mild decay
3. memory/2025-09-15.md  (score: 0.91 x 0.03 = 0.03)  <- 148 days, nearly gone
```

过时的 9 月份笔记降到了底部，尽管它具有最好的原始语义匹配。

**何时启用：** 如果您的智能体拥有数月的每日笔记，并且您发现旧的、过时的信息排名高于近期上下文。对于重度使用每日笔记的工作流，30 天的半衰期效果良好；如果您经常引用较旧的笔记，请增加该值（例如 90 天）。

### 混合搜索配置

这两个功能均在 `memorySearch.query.hybrid` 下配置：

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

- **仅 MMR** -- 当您有许多相似的笔记且新旧程度无关时很有用。
- **仅时间衰减** -- 当近期相关性很重要但您的结果已经足够多样化时很有用。
- **两者皆用** -- 推荐用于拥有大量长期运行的每日笔记历史的智能体。

## 嵌入缓存

OpenClaw 可以在 SQLite 中缓存 **分块嵌入（chunk embeddings）**，以便重新索引和频繁更新（尤其是会话记录）时不会对未更改的文本重新进行嵌入。

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

## 会话记忆搜索（实验性）

您可以选择性地索引 **会话记录** 并通过 `memory_search` 展示它们。
这受控于一个实验性标志。

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

- 会话索引是 **可选加入（opt-in）** 的（默认关闭）。
- 会话更新是防抖动的，一旦超过增量阈值，就会 **异步索引**（尽力而为）。
- `memory_search` 永远不会阻塞索引；在后台同步完成之前，结果可能会稍微有些过时。
- 结果仍然仅包含片段；`memory_get` 仍仅限于记忆文件。
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

## SQLite 向量加速 (sqlite-vec)

当 sqlite-vec 扩展可用时，OpenClaw 会将嵌入存储在
SQLite 虚拟表 (`vec0`) 中，并在
数据库内执行向量距离查询。这使得搜索速度很快，而无需将每个嵌入都加载到 JS 中。

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
- 如果缺少 sqlite-vec 扩展或加载失败，OpenClaw 会记录错误并继续使用 JS 后备方案（无向量表）。
- `extensionPath` 会覆盖捆绑的 sqlite-vec 路径（适用于自定义构建或非标准安装位置）。

## 本地嵌入模型自动下载

- 默认本地嵌入模型：`hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf` (~0.6 GB)。
- 当 `memorySearch.provider = "local"` 时，`node-llama-cpp` 会解析 `modelPath`；如果 GGUF 文件丢失，它会 **自动下载** 到缓存（如果设置了 `local.modelCacheDir` 则下载到该位置），然后加载它。下载会在重试时恢复。
- 原生构建要求：运行 `pnpm approve-builds`，选择 `node-llama-cpp`，然后执行 `pnpm rebuild node-llama-cpp`。
- 后备方案：如果本地设置失败且 `memorySearch.fallback = "openai"`，我们会自动切换到远程嵌入（除非被覆盖，否则为 `openai/text-embedding-3-small`）并记录原因。

## 自定义 OpenAI 兼容端点示例

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
- `remote.headers` 与 OpenAI 标头合并；发生键冲突时，远程端优先。省略 `remote.headers` 以使用 OpenAI 默认值。
