---
summary: "OpenProse：OpenClaw 中的 .prose 工作流、斜杠命令和状态"
read_when:
  - You want to run or write .prose workflows
  - You want to enable the OpenProse plugin
  - You need to understand state storage
title: "OpenProse"
---

# OpenProse

OpenProse 是一种可移植的、以 Markdown 为优先的工作流格式，用于编排 AI 会话。在 OpenClaw 中，它作为一个插件提供，用于安装 OpenProse 技能包以及一个 `/prose` 斜杠命令。程序存放在 `.prose` 文件中，并可以通过显式的控制流程生成多个子代理。

官方网站：[https://www.prose.md](https://www.prose.md)

## 功能

- 多代理研究 + 显式并行合成。
- 可重复的审批安全工作流（代码审查、事件分类、内容流水线）。
- 可重用的 `.prose` 程序，您可以在支持的代理运行时中运行。

## 安装 + 启用

捆绑的插件默认处于禁用状态。启用 OpenProse：

```bash
openclaw plugins enable open-prose
```

启用插件后重启 Gateway 网关。

开发/本地检出：`openclaw plugins install ./extensions/open-prose`

相关文档：[插件](/zh/en/tools/plugin)、[插件清单](/zh/en/plugins/manifest)、[技能](/zh/en/tools/skills)。

## 斜杠命令

OpenProse 将 `/prose` 注册为用户可调用的技能命令。它会路由到 OpenProse VM 指令，并在底层使用 OpenClaw 工具。

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

OpenProse 将状态保存在您工作区的 `.prose/` 下：

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
- **in-context**：临时的，适用于小型程序
- **sqlite**（实验性）：需要 `sqlite3` 二进制文件
- **postgres**（实验性）：需要 `psql` 和连接字符串

注意：

- sqlite/postgres 是可选加入且处于实验阶段的功能。
- postgres 凭据会流入子代理日志；请使用专用的、权限最低的数据库。

## 远程程序

`/prose run <handle/slug>` 解析为 `https://p.prose.md/<handle>/<slug>`。
直接 URL 将按原样获取。这使用 `web_fetch` 工具（或用于 POST 的 `exec`）。

## OpenClaw 运行时映射

OpenProse 程序映射到 OpenClaw 基元：

| OpenProse 概念         | OpenClaw 工具    |
| ------------------------- | ---------------- |
| 生成会话 / 任务工具 | `sessions_spawn` |
| 文件读/写           | `read` / `write` |
| 网络获取                 | `web_fetch`      |

如果您的工具允许列表屏蔽了这些工具，OpenProse 程序将会失败。请参阅 [技能配置](/zh/en/tools/skills-config)。

## 安全性 + 批准

将 `.prose` 文件视为代码。在运行前进行审查。使用 OpenClaw 工具允许列表和批准关卡来控制副作用。

对于确定性、需要批准的工作流，请与 [Lobster](/zh/en/tools/lobster) 进行比较。

import zh from '/components/footer/zh.mdx';

<zh />
