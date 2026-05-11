---
summary: "OpenProse：OpenClaw 中的 .prose 工作流、斜杠命令和状态"
read_when:
  - You want to run or write .prose workflows
  - You want to enable the OpenProse plugin
  - You need to understand state storage
title: "OpenProse"
---

OpenProse 是一种可移植的、优先使用 Markdown 的工作流格式，用于编排 AI 会话。在 OpenClaw 中，它作为一个插件提供，安装了 OpenProse Skills 包以及 `/prose` 斜杠命令。程序存放在 `.prose` 文件中，并可以通过显式控制流生成多个子代理。

官方网站：[https://www.prose.md](https://www.prose.md)

## 它能做什么

- 具有显式并行的多代理研究与综合。
- 可重复的、审批安全的工作流（代码审查、事件分类、内容流水线）。
- 可跨支持的代理运行时运行的 `.prose` 可重用程序。

## 安装 + 启用

捆绑的插件默认情况下是禁用的。启用 OpenProse：

```bash
openclaw plugins enable open-prose
```

启用插件后，请重启 Gateway(网关)。

Dev/本地检出：`openclaw plugins install ./path/to/local/open-prose-plugin`

相关文档：[Plugins](/zh/tools/plugin)、[Plugin manifest](/zh/plugins/manifest)、[Skills](/zh/tools/skills)。

## 斜杠命令

OpenProse 将 `/prose` 注册为用户可调用的 skill 命令。它路由到 OpenProse VM 指令，并在底层使用 OpenClaw 工具。

常用命令：

```
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

## 示例：一个简单的 `.prose` 文件

```prose
# Research + synthesis with two agents running in parallel.

input topic: "What should we research?"

agent researcher:
  model: sonnet
  prompt: "You research thoroughly and cite sources."

agent writer:
  model: opus
  prompt: "You write a concise summary."

parallel:
  findings = session: researcher
    prompt: "Research {topic}."
  draft = session: writer
    prompt: "Summarize {topic}."

session "Merge the findings + draft into a final answer."
context: { findings, draft }
```

## 文件位置

OpenProse 将状态保存在工作区的 `.prose/` 下：

```
.prose/
├── .env
├── runs/
│   └── {YYYYMMDD}-{HHMMSS}-{random}/
│       ├── program.prose
│       ├── state.md
│       ├── bindings/
│       └── agents/
└── agents/
```

用户级持久代理位于：

```
~/.prose/agents/
```

## 状态模式

OpenProse 支持多种状态后端：

- **filesystem**（默认）：`.prose/runs/...`
- **in-context**：暂时的，用于小型程序
- **sqlite**（实验性）：需要 `sqlite3` 二进制文件
- **postgres**（实验性）：需要 `psql` 和连接字符串

注意事项：

- sqlite/postgres 是可选加入且为实验性的。
- postgres 凭据会流入子代理日志；请使用专用的、权限最小的数据库。

## 远程程序

`/prose run <handle/slug>` 解析为 `https://p.prose.md/<handle>/<slug>`。
直接 URL 按原样获取。这使用 `web_fetch` 工具（或用于 POST 的 `exec`）。

## OpenClaw 运行时映射

OpenProse 程序映射到 OpenClaw 基元：

| OpenProse 概念         | OpenClaw 工具    |
| ---------------------- | ---------------- |
| Spawn 会话 / Task 工具 | `sessions_spawn` |
| 文件读/写              | `read` / `write` |
| Web 获取               | `web_fetch`      |

如果您的工具允许列表阻止了这些工具，OpenProse 程序将无法运行。请参阅 [Skills 配置](/zh/tools/skills-config)。

## 安全 + 批准

将 `.prose` 文件视为代码。运行前请先审查。使用 OpenClaw 工具允许列表和批准关卡来控制副作用。

对于确定性的、需要批准的工作流，请与 [Lobster](/zh/tools/lobster) 进行比较。

## 相关

- [文本转语音](/zh/tools/tts)
- [Markdown 格式](/zh/concepts/markdown-formatting)
