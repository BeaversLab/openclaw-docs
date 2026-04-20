---
title: "QMD Memory Engine"
summary: "本地优先的搜索侧车，具备 BM25、向量、重排序和查询扩展功能"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

# QMD 内存引擎

[QMD](https://github.com/tobi/qmd) 是一个本地优先的搜索伴生服务，与 OpenClaw 并行运行。它将 BM25、向量搜索和重排序结合在单个二进制文件中，并且可以索引工作区内存文件之外的内容。

## 相比内置功能的增强

- **重排序和查询扩展** 以提高召回率。
- **索引额外的目录** -- 项目文档、团队笔记、磁盘上的任何内容。
- **索引会话记录** -- 回顾之前的对话。
- **完全本地化** -- 通过 Bun + node-llama-cpp 运行，自动下载 GGUF 模型。
- **自动回退** -- 如果 QMD 不可用，OpenClaw 将无缝回退到
  内置引擎。

## 入门指南

### 先决条件

- 安装 QMD：`npm install -g @tobilu/qmd` 或 `bun install -g @tobilu/qmd`
- 允许扩展的 SQLite 构建版本（macOS 上的 `brew install sqlite`）。
- QMD 必须位于网关的 `PATH` 上。
- macOS 和 Linux 可直接开箱即用。Windows 最好通过 WSL2 支持。

### 启用

```json5
{
  memory: {
    backend: "qmd",
  },
}
```

OpenClaw 会在 `~/.openclaw/agents/<agentId>/qmd/` 下创建一个独立的 QMD 主目录，并自动管理侧车的生命周期——集合、更新和嵌入运行均会为您处理。它首选当前的 QMD 集合和 MCP 查询形态，但在需要时仍会回退到旧的 `--mask` 集合标志和较旧的 MCP 工具名称。

## 侧边车的工作原理

- OpenClaw 会根据您的工作区内存文件和任何配置的 `memory.qmd.paths` 创建集合，然后在启动时及定期（默认每 5 分钟）运行 `qmd update` + `qmd embed`。
- 默认的工作区集合跟踪 `MEMORY.md` 加上 `memory/`
  树。小写的 `memory.md` 保留为引导回退，而不是单独的 QMD
  集合。
- 引导刷新在后台运行，因此不会阻塞聊天启动。
- 搜索使用配置的 `searchMode`（默认：`search`；也支持
  `vsearch` 和 `query`）。如果模式失败，OpenClaw 会使用 `qmd query` 重试。
- 如果 QMD 完全失败，OpenClaw 将回退到内置的 SQLite 引擎。

<Info>第一次搜索可能会很慢——QMD 会在第一次 `qmd query` 运行时自动下载 GGUF 模型（约 2 GB）用于 重排序和查询扩展。</Info>

## 模型覆盖

QMD 模型环境变量从网关进程原样传递，因此您可以在不添加新的 OpenClaw 配置的情况下全局调整 QMD：

```bash
export QMD_EMBED_MODEL="hf:Qwen/Qwen3-Embedding-0.6B-GGUF/Qwen3-Embedding-0.6B-Q8_0.gguf"
export QMD_RERANK_MODEL="/absolute/path/to/reranker.gguf"
export QMD_GENERATE_MODEL="/absolute/path/to/generator.gguf"
```

更改嵌入模型后，请重新运行嵌入，以便索引与新的向量空间匹配。

## 索引额外路径

将 QMD 指向其他目录以使其可搜索：

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

来自额外路径的片段作为 `qmd/<collection>/<relative-path>` 出现在
搜索结果中。`memory_get` 理解此前缀并从正确的
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

记录作为清理后的用户/助手对话轮次导出到 `~/.openclaw/agents/<id>/qmd/sessions/` 下专用的 QMD
集合中。

## 搜索范围

默认情况下，QMD 搜索结果显示在直接和渠道会话中
（而非群组）。配置 `memory.qmd.scope` 以更改此项：

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

当范围拒绝搜索时，OpenClaw 会记录包含衍生渠道和
聊天类型的警告，以便更容易调试空结果。

## 引用

当 `memory.citations` 为 `auto` 或 `on` 时，搜索片段包含一个
`Source: <path#line>` 页脚。设置 `memory.citations = "off"` 以省略页脚，
同时在内部仍将路径传递给代理。

## 何时使用

当您需要以下功能时，请选择 QMD：

- 重排序以获得更高质量的结果。
- 搜索工作区之外的项目文档或笔记。
- 回顾过去的会话对话。
- 完全本地搜索，无需 API 密钥。

对于较简单的设置，[内置引擎](/zh/concepts/memory-builtin) 在
没有额外依赖的情况下也能很好地工作。

## 故障排除

**找不到 QMD？** 确保二进制文件位于网关的 `PATH` 上。如果 OpenClaw
作为服务运行，请创建符号链接：
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`。

**首次搜索非常慢？** QMD 在首次使用时会下载 GGUF 模型。使用与 OpenClaw
相同的 XDG 目录，通过 `qmd query "test"` 进行预热。

**搜索超时？** 增加 `memory.qmd.limits.timeoutMs`（默认：4000ms）。
对于较慢的硬件，设置为 `120000`。

**群聊中的结果为空？** 检查 `memory.qmd.scope` —— 默认
仅允许直接和渠道会话。

**工作区可见的临时仓库导致 `ENAMETOOLONG` 或索引损坏？**
QMD 遍历目前遵循底层 QMD 扫描器的行为，而不是
OpenClaw 的内置符号链接规则。将临时的 monorepo 检出保留在
`.tmp/` 等隐藏目录下，或位于索引的 QMD 根目录之外，直到 QMD 公开
循环安全遍历或显式排除控制。

## 配置

有关完整的配置界面（`memory.qmd.*`）、搜索模式、更新间隔、
范围规则以及所有其他选项，请参阅
[内存配置参考](/zh/reference/memory-config)。
