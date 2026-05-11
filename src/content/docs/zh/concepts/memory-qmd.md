---
summary: "本地优先的搜索伴侣，具有 BM25、向量、重排序和查询扩展功能"
title: "QMD 记忆引擎"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

[QMD](https://github.com/tobi/qmd) 是一个本地优先的搜索伴侣，与 OpenClaw 并行运行。它将 BM25、向量搜索和重排序结合在单个二进制文件中，并且可以索引您工作区记忆文件之外的内容。

## 相比内置功能的增强

- **重排序和查询扩展**以实现更好的召回率。
- **索引额外目录**——项目文档、团队笔记、磁盘上的任何内容。
- **索引会话记录**——回顾之前的对话。
- **完全本地化**——使用可选的 node-llama-cpp 运行时包运行，并自动下载 GGUF 模型。
- **自动回退**——如果 QMD 不可用，OpenClaw 将无缝回退到内置引擎。

## 入门指南

### 先决条件

- 安装 QMD：`npm install -g @tobilu/qmd` 或 `bun install -g @tobilu/qmd`
- 支持扩展的 SQLite 构建（在 macOS 上为 `brew install sqlite`）。
- QMD 必须位于网关的 `PATH` 上。
- macOS 和 Linux 可直接开箱即用。Windows 最好通过 WSL2 使用。

### 启用

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw 在 `~/.openclaw/agents/<agentId>/qmd/` 下创建一个独立的 QMD 主目录，并自动管理伴侣的生命周期——集合、更新和嵌入运行均会为您处理。它首选当前的 QMD 集合和 MCP 查询形状，但在需要时仍会回退到备用集合模式标志和较旧的 MCP 工具名称。当同名的旧 QMD 集合仍然存在时，启动时的协调还会将过时的托管集合重新创建为其规范模式。

## 伴侣的工作原理

- OpenClaw 根据您的工作区记忆文件和任何已配置的 `memory.qmd.paths` 创建集合，然后在启动时和定期（默认每 5 分钟）运行 `qmd update`。语义模式也会运行 `qmd embed`。
- 默认工作区集合跟踪 `MEMORY.md` 以及 `memory/` 树。小写的 `memory.md` 不会作为根记忆文件被索引。
- 启动刷新在后台运行，因此不会阻塞聊天启动。
- 搜索使用配置的 `searchMode`（默认：`search`；也支持
  `vsearch` 和 `query`）。`search` 仅支持 BM25，因此 OpenClaw 会跳过该模式下的语义
  向量就绪探针和嵌入维护。如果某种模式失败，OpenClaw 将使用 `qmd query` 重试。
- 对于声明支持多集合过滤器的 QMD 版本，OpenClaw 会将
  同源集合归组到一次 QMD 搜索调用中。较旧的 QMD 版本
  则保持兼容的逐集合回退机制。
- 如果 QMD 完全失败，OpenClaw 将回退到内置的 SQLite 引擎。

<Info>首次搜索可能会较慢 —— QMD 会在首次 `qmd query` 运行时 自动下载用于重排序和查询扩展的 GGUF 模型（约 2 GB）。</Info>

## 搜索性能与兼容性

OpenClaw 保持 QMD 搜索路径与当前和较旧的 QMD 安装兼容。

启动时，OpenClaw 会针对每个管理器检查一次已安装的 QMD 帮助文本。如果
该二进制文件声明支持多集合过滤器，OpenClaw 将使用一条命令搜索所有
同源集合：

```bash
qmd search "router notes" --json -n 10 -c memory-root-main -c memory-dir-main
```

这避免了为每个持久化内存集合启动一个 QMD 子进程。
会话记录集合保留在其自己的源组中，因此混合的
`memory` + `sessions` 搜索仍然能为结果去重器提供来自两个
源的输入。

较旧的 QMD 版本仅接受一个集合过滤器。当 OpenClaw 检测到
这些版本之一时，它将保持兼容性路径，在合并和去重结果之前
分别搜索每个集合。

要手动检查已安装的协议，请运行：

```bash
qmd --help | grep -i collection
```

当前的 QMD 帮助显示集合过滤器可以针对一个或多个集合。
较旧的帮助通常描述单个集合。

## 模型覆盖

QMD 模型环境变量从网关进程原样传递，因此您可以在不添加新的 OpenClaw 配置的情况下全局调整 QMD：

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

更改嵌入模型后，请重新运行嵌入，以便索引与新的向量空间匹配。

## 索引额外路径

将 QMD 指向其他目录以使其可被搜索：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      paths: [{ name: "docs", path: "~/notes", pattern: "**/*.md" }],
    },
  },
}
```

来自额外路径的片段在搜索结果中显示为 `qmd/<collection>/<relative-path>`。
`memory_get` 能识别此前缀，并从正确的
集合根目录读取。

## 索引会话记录

启用会话索引以回忆之前的对话：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      sessions: { enabled: true },
    },
  },
}
```

记录作为经过清理的用户/助手对话导出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下的专用 QMD 集合中。

## 搜索范围

默认情况下，QMD 搜索结果会在直接和渠道会话中展示（不包括群组）。配置 `memory.qmd.scope` 以更改此设置：

```json5
{
  memory: {
    qmd: {
      scope: {
        default: "deny",
        rules: [{ action: "allow", match: { chatType: "direct" } }],
      },
    },
  },
}
```

当范围拒绝搜索时，OpenClaw 会记录包含衍生渠道和聊天类型的警告，以便更容易调试空结果。

## 引用

当 `memory.citations` 为 `auto` 或 `on` 时，搜索片段包含一个 `Source: <path#line>` 页脚。设置 `memory.citations = "off"` 可以省略页脚，同时在内部仍将路径传递给代理。

## 何时使用

在需要以下情况时选择 QMD：

- 重排序以获得更高质量的结果。
- 搜索工作区之外的项目文档或笔记。
- 回忆过去的会话对话。
- 完全本地搜索，无需 API 密钥。

对于较简单的设置，[内置引擎](/zh/concepts/memory-builtin) 运行良好，且没有额外的依赖项。

## 故障排除

**找不到 QMD？** 确保二进制文件位于网关的 `PATH` 上。如果 OpenClaw 作为服务运行，请创建符号链接：
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`。

如果 `qmd --version` 在您的 shell 中工作，但 OpenClaw 仍报告 `spawn qmd ENOENT`，则网关进程的 `PATH` 可能与您的交互式 shell 不同。显式固定二进制文件：

```json5
{
  memory: {
    backend: "qmd",
    qmd: {
      command: "/absolute/path/to/qmd",
    },
  },
}
```

在安装 QMD 的环境中使用 `command -v qmd`，然后使用 `openclaw memory status --deep` 重新检查。

**第一次搜索非常慢？** QMD 在首次使用时会下载 GGUF 模型。使用 OpenClaw 使用的相同 XDG 目录通过 `qmd query "test"` 进行预热。

**搜索期间有许多 QMD 子进程？** 如果可能，请更新 QMD。仅当安装的 QMD 声明支持多个 `-c` 过滤器时，OpenClaw 才会对同源多集合搜索使用一个进程；否则，它将保留较旧的每个集合的回退以确保正确性。

**仅限 BM25 的 QMD 仍在尝试构建 llama.cpp？** 请设置
`memory.qmd.searchMode = "search"`。OpenClaw 会将该模式视为仅限词汇模式，
不会运行 QMD 向量状态探测或嵌入维护，并将语义就绪检查留给
`vsearch` 或 `query` 设置。

**搜索超时？** 请增加 `memory.qmd.limits.timeoutMs`（默认：4000ms）。
对于较慢的硬件，请设置为 `120000`。

**群聊中结果为空？** 请检查 `memory.qmd.scope` —— 默认设置仅
允许直接会话和渠道会话。

**根内存搜索突然变得太宽泛？** 请重启网关或等待
下一次启动时的协调。当检测到同名冲突时，OpenClaw 会将过时的托管集合
重新创建为规范的 `MEMORY.md` 和 `memory/` 模式。

**工作区可见的临时仓库导致 `ENAMETOOLONG` 或索引损坏？**
QMD 遍历目前遵循底层 QMD 扫描器的行为，而不是
OpenClaw 的内置符号链接规则。请将临时的 monorepo 检出保留在
如 `.tmp/` 等隐藏目录下，或位于已建立索引的 QMD 根目录之外，直到 QMD 公开
循环安全遍历或显式排除控制。

## 配置

有关完整的配置项（`memory.qmd.*`）、搜索模式、更新间隔、
范围规则以及所有其他设置，请参阅
[Memory configuration reference](/zh/reference/memory-config)。

## 相关

- [Memory overview](/zh/concepts/memory)
- [Builtin memory engine](/zh/concepts/memory-builtin)
- [Honcho memory](/zh/concepts/memory-honcho)
