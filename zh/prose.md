---
summary: "OpenProse：.prose 工作流、斜杠命令与 OpenClaw 中的状态"
read_when:
  - 想运行或编写 .prose 工作流
  - 想启用 OpenProse 插件
  - 需要了解状态存储
title: "OpenProse"
---

# OpenProse

OpenProse 是一种可移植、以 Markdown 为先的工作流格式，用于编排 AI 会话。在 OpenClaw 中，它以插件形式提供，安装 OpenProse skill 包并注册 `/prose` 斜杠命令。程序存放在 `.prose` 文件中，可通过显式控制流启动多个子代理。

官方站点：https://www.prose.md

## 能做什么

- 显式并行的多代理研究与综合。
- 可复用、审批安全的工作流（代码评审、事故分诊、内容流水线）。
- 可重复运行的 `.prose` 程序，适用于支持的代理运行时。

## 安装与启用

内置插件默认禁用。启用 OpenProse：

```bash
openclaw plugins enable open-prose
```

启用后重启 Gateway。

开发/本地检出：`openclaw plugins install ./extensions/open-prose`

相关文档：[插件](/zh/plugin)、[Plugin manifest](/zh/plugins/manifest)、[技能](/zh/tools/skills)。

## 斜杠命令

OpenProse 注册 `/prose` 作为用户可调用的 skill 命令。它会路由到 OpenProse VM 指令，并在底层使用 OpenClaw 工具。

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

OpenProse 在工作区的 `.prose/` 下保存状态：

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

用户级的持久化 agent 位于：

```
~/.prose/agents/
```

## 状态模式

OpenProse 支持多种状态后端：

- **filesystem**（默认）：`.prose/runs/...`
- **in-context**：短期，适用于小型程序
- **sqlite**（实验）：需要 `sqlite3` 二进制
- **postgres**（实验）：需要 `psql` 与连接字符串

说明：

- sqlite/postgres 为可选且实验性。
- postgres 凭据会进入子代理日志；请使用专用、最小权限的数据库。

## 远程程序

`/prose run <handle/slug>` 会解析到 `https://p.prose.md/<handle>/<slug>`。
直接 URL 会原样抓取。此过程使用 `web_fetch` 工具（或对 POST 使用 `exec`）。

## OpenClaw 运行时映射

OpenProse 程序映射到 OpenClaw 原语：

| OpenProse 概念            | OpenClaw 工具    |
| ------------------------- | ---------------- |
| Spawn session / Task tool | `sessions_spawn` |
| 文件读写                  | `read` / `write` |
| Web 抓取                  | `web_fetch`      |

如果你的工具 allowlist 阻止这些工具，OpenProse 程序将失败。参见 [技能配置](/zh/tools/skills-config)。

## 安全与审批

将 `.prose` 文件视为代码，在运行前审查。使用 OpenClaw 工具 allowlist 与审批门控来控制副作用。

如需确定性、审批门控的工作流，可参考 [Lobster](/zh/tools/lobster)。
