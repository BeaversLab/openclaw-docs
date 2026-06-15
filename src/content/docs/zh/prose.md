---
title: "OpenProseOpenProse"
sidebarTitle: "OpenProseOpenProse"
summary: "OpenProseOpenClawOpenProse 是一种以 Markdown 为优先的多代理 AI 会话工作流格式。在 OpenClaw 中，它作为一个插件提供，包含 /prose 斜杠命令和技能包。"
read_when:
  - You want to run or write .prose workflow files
  - You want to enable the OpenProse plugin
  - You need to understand how OpenProse maps to OpenClaw primitives
---

OpenProse 是一种可移植的、以 Markdown 为优先的工作流格式，用于编排 AI 会话。在 OpenClaw 中，它作为插件提供，安装 OpenProse 技能包和 OpenProseOpenClawOpenProse`/prose` 斜杠命令。程序存放在 `.prose` 文件中，可以通过显式控制流生成多个子代理。

<CardGroup cols={3}>
  <Card title="Install" icon="download" href="#install"OpenProseGateway(网关)>
    启用 OpenProse 插件并重启 Gateway(网关)。
  </Card>
  <Card title="Run a program" icon="play" href="#slash-command">
    使用 `/prose run` 执行 `.prose` 文件或远程程序。
  </Card>
  <Card title="Write programs" icon="pencil" href="#example">
    编写包含并行和串行步骤的多代理工作流。
  </Card>
</CardGroup>

## 安装

<Steps>
  <Step title="Enable the plugin"OpenProse>
    默认情况下禁用捆绑插件。启用 OpenProse：

    ```bash
    openclaw plugins enable open-prose
    ```

  </Step>
  <Step title="Gateway(网关)Restart the Gateway">
    ```bash
    openclaw gateway restart
    ```
  </Step>
  <Step title="Verify">
    ```bash
    openclaw plugins list | grep prose
    ```

    您应该看到 `open-prose` 已启用。`/prose` 技能命令现在
    在聊天中可用。

  </Step>
</Steps>

对于本地检出：`openclaw plugins install ./path/to/local/open-prose-plugin`

## 斜杠命令

OpenProse 将 OpenProse`/prose` 注册为用户可调用的技能命令：

```text
/prose help
/prose run <file.prose>
/prose run <handle/slug>
/prose run <https://example.com/file.prose>
/prose compile <file.prose>
/prose examples
/prose update
```

`/prose run <handle/slug>` 解析为 `https://p.prose.md/<handle>/<slug>`。
直接 URL 将使用 `web_fetch` 工具按原样获取。

## 功能

- 具有显式并行的多智能体研究与合成。
- 可重复、审批安全的工作流（代码审查、事件分类、内容流水线）。
- 可重用的 `.prose` 程序，您可以在支持的智能体运行时中运行它们。

## 示例：并行研究与合成

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

## OpenClaw 运行时映射

OpenProse 程序映射到 OpenClaw 基元：

| OpenProse 概念      | OpenClaw 工具    |
| ------------------- | ---------------- |
| 生成会话 / 任务工具 | `sessions_spawn` |
| 文件读取 / 写入     | `read` / `write` |
| Web 获取            | `web_fetch`      |

<Warning>如果您的工具允许列表阻止了 `sessions_spawn`、`read`、`write` 或 `web_fetch`OpenProse，OpenProse 程序将会失败。请检查您的 [工具允许列表配置](/zh/gateway/config-tools)。</Warning>

## 文件位置

OpenProse 将状态保存在您工作区的 OpenProse`.prose/` 下：

```text
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

用户级别的持久化智能体位于：

```text
~/.prose/agents/
```

## 状态后端

<AccordionGroup>
  <Accordion title="文件系统（默认）">
    状态被写入工作区的 `.prose/runs/...` 中。不需要
    额外的依赖项。
  </Accordion>
  <Accordion title="上下文中">
    保持在上下文窗口中的瞬时状态。适用于小型、
    短命的程序。
  </Accordion>
  <Accordion title="sqlite（实验性）">
    需要 `PATH` 上的 `sqlite3` 二进制文件。
  </Accordion>
  <Accordion title="postgres (experimental)">
    需要 `psql` 和连接字符串。

    <Warning>
      Postgres 凭据会流入子代理日志。请使用专用的、权限最低的数据库。
    </Warning>

  </Accordion>
</AccordionGroup>

## 安全性

请将 `.prose` 文件视为代码。在运行前进行审查。使用 OpenClaw 工具允许列表和审批门控来控制副作用。对于确定性、基于审批门控的工作流，请与 [Lobster](/zh/tools/lobster) 进行比较。

## 相关

<CardGroup cols={2}>
  <Card title="Skills reference" href="/zh/tools/skills" icon="puzzle-piece">
    OpenProse 的技能包如何加载以及适用哪些门控。
  </Card>
  <Card title="Subagents" href="/zh/tools/subagents" icon="users">
    OpenClaw 的原生多代理协调层。
  </Card>
  <Card title="Text-to-speech" href="/zh/tools/tts" icon="volume-high">
    为您的工作流添加音频输出。
  </Card>
  <Card title="Slash commands" href="/zh/tools/slash-commands" icon="terminal">
    所有可用的聊天命令，包括 /prose。
  </Card>
</CardGroup>

官方网站：[https://www.prose.md](https://www.prose.md)
