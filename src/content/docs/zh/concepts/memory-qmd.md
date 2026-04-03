---
title: "QMD 内存引擎"
summary: "本地优先的搜索侧边车，具有 BM25、向量、重排序和查询扩展功能"
read_when:
  - You want to set up QMD as your memory backend
  - You want advanced memory features like reranking or extra indexed paths
---

# QMD 内存引擎

[QMD](https://github.com/tobi/qmd) 是一个与 OpenClaw 一起运行的本地优先搜索侧边车。它将 BM25、向量搜索和重排序结合在单个二进制文件中，并且可以索引您工作区内存文件之外的内容。

## 相比内置功能的增强

- **重排序和查询扩展** 以提高召回率。
- **索引额外的目录** -- 项目文档、团队笔记、磁盘上的任何内容。
- **索引会话记录** -- 回顾之前的对话。
- **完全本地化** -- 通过 Bun + node-llama-cpp 运行，自动下载 GGUF 模型。
- **自动回退** -- 如果 QMD 不可用，OpenClaw 将无缝回退到
  内置引擎。

## 入门指南

### 先决条件

- 安装 QMD：`bun install -g @tobilu/qmd`
- 允许扩展的 SQLite 构建（在 macOS 上为 `brew install sqlite`）。
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

OpenClaw 在 `~/.openclaw/agents/<agentId>/qmd/` 下创建一个独立的 QMD 主目录，并自动
管理侧边车的生命周期 -- 集合、更新和嵌入运行均会自动处理。

## 侧边车的工作原理

- OpenClaw 根据您的工作区内存文件和任何配置的 `memory.qmd.paths` 创建集合，然后在启动
  时以及定期（默认每 5 分钟）运行 `qmd update` + `qmd embed`。
- 启动刷新在后台运行，因此不会阻塞聊天启动。
- 搜索使用配置的 `searchMode`（默认：`search`；也支持
  `vsearch` 和 `query`）。如果某种模式失败，OpenClaw 将使用 `qmd query` 重试。
- 如果 QMD 完全失败，OpenClaw 将回退到内置 SQLite 引擎。

<Info>第一次搜索可能会很慢 -- QMD 会在第一次 `qmd query` 运行时 自动下载 GGUF 模型（约 2 GB）以进行重排序和查询扩展。</Info>

## 索引额外的路径

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

来自额外路径的摘录会以 `qmd/<collection>/<relative-path>` 形式出现在
搜索结果中。`memory_get` 能识别此前缀，并从正确的
集合根目录进行读取。

## 索引会话转录

启用会话索引以回溯之前的对话：

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

转录内容将作为经过净化的用户/助手轮次导出到
`~/.openclaw/agents/<id>/qmd/sessions/` 下专用的 QMD 集合中。

## 搜索范围

默认情况下，QMD 搜索结果仅显示在私信（私信）会话中（而非群组或
渠道）。配置 `memory.qmd.scope` 可更改此设置：

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

当范围拒绝搜索时，OpenClaw 会记录一条包含推断出的渠道和
聊天类型的警告，以便于调试空结果问题。

## 引用

当 `memory.citations` 为 `auto` 或 `on` 时，搜索摘录将包含
一个 `Source: <path#line>` 页脚。设置 `memory.citations = "off"` 可在内部仍向代理传递路径的同时
省略该页脚。

## 使用场景

在以下情况选择 QMD：

- 重排以获得更高质量的结果。
- 搜索工作区之外的项目文档或笔记。
- 回溯过去的会话对话。
- 完全本地搜索，无需 API 密钥。

对于较简单的设置，[内置引擎](/en/concepts/memory-builtin) 在没有
额外依赖的情况下也能很好地工作。

## 故障排除

**找不到 QMD？** 请确保二进制文件位于网关的 `PATH` 中。如果 OpenClaw
作为服务运行，请创建一个符号链接：
`sudo ln -s ~/.bun/bin/qmd /usr/local/bin/qmd`。

**首次搜索很慢？** QMD 会在首次使用时下载 GGUF 模型。使用与 OpenClaw 相同的 XDG 目录
通过 `qmd query "test"` 进行预热。

**搜索超时？** 增加 `memory.qmd.limits.timeoutMs`（默认：4000ms）。
对于较慢的硬件，请设置为 `120000`。

**群聊中结果为空？** 检查 `memory.qmd.scope` —— 默认设置
仅允许私信（私信）会话。

**工作区可见的临时仓库导致 `ENAMETOOLONG` 或索引损坏？**
QMD 遍历目前遵循底层 QMD 扫描器的行为，而不是 OpenClaw 的内置符号链接规则。请将临时的 monorepo 检出放在 `.tmp/` 等隐藏目录下，或放在已索引的 QMD 根目录之外，直到 QMD 揭示支持循环安全的遍历或显式排除控制。

## 配置

有关完整的配置界面（`memory.qmd.*`）、搜索模式、更新间隔、
作用域规则以及所有其他选项，请参阅
[Memory configuration reference](/en/reference/memory-config)。
