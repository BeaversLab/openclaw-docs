---
summary: "OpenClaw 工具和插件概述：代理可以做什么以及如何扩展它"
read_when:
  - You want to understand what tools OpenClaw provides
  - You need to configure, allow, or deny tools
  - You are deciding between built-in tools, skills, and plugins
title: "工具和插件"
---

# 工具和插件

代理在生成文本之外所做的所有事情都通过 **工具** 完成。
工具是代理读取文件、运行命令、浏览网页、发送
消息以及与设备交互的方式。

## 工具、Skills 和插件

OpenClaw 有三个协同工作的层：

<Steps>
  <Step title="工具是代理调用的对象">
    工具是代理可以调用的类型化函数（例如 `exec`、`browser`、
    `web_search`、`message`）。OpenClaw 内置了一组 **内置工具**，
    插件可以注册其他工具。

    代理将工具视为发送到模型 API 的结构化函数定义。

  </Step>

  <Step title="Skills 教导代理何时以及如何操作">
    Skill 是注入到系统提示词中的 markdown 文件（`SKILL.md`）。
    Skills 为代理提供上下文、约束以及有效使用工具的逐步指导。
    Skills 驻留在您的工作区、共享文件夹中，或随插件一起提供。

    [Skills 参考](/zh/tools/skills) | [创建 Skills](/zh/tools/creating-skills)

  </Step>

  <Step title="插件将所有内容打包在一起">
    插件是一个可以注册任意功能组合的包：
    渠道、模型提供商、工具、skills、语音、图像生成等。
    有些插件是 **核心** 插件（随 OpenClaw 一起提供），其他是 **外部** 插件
    （由社区在 npm 上发布）。

    [安装和配置插件](/zh/tools/plugin) | [构建您自己的插件](/zh/plugins/building-plugins)

  </Step>
</Steps>

## 内置工具

这些工具随 OpenClaw 一起提供，无需安装任何插件即可使用：

| 工具                         | 功能                                     | 页面                              |
| ---------------------------- | ---------------------------------------- | --------------------------------- |
| `exec` / `process`           | 运行 shell 命令，管理后台进程            | [Exec](/zh/tools/exec)            |
| `browser`                    | 控制 Chromium 浏览器（导航、点击、截图） | [浏览器](/zh/tools/browser)       |
| `web_search` / `web_fetch`   | 搜索网络，获取页面内容                   | [网络](/zh/tools/web)             |
| `read` / `write` / `edit`    | 工作区中的文件 I/O                       |                                   |
| `apply_patch`                | 多块文件补丁                             | [应用补丁](/zh/tools/apply-patch) |
| `message`                    | 跨所有渠道发送消息                       | [代理发送](/zh/tools/agent-send)  |
| `canvas`                     | 驱动节点 Canvas（展示、评估、快照）      |                                   |
| `nodes`                      | 发现并定位已配对的设备                   |                                   |
| `cron` / `gateway`           | 管理计划任务，重启网关                   |                                   |
| `image` / `image_generate`   | 分析或生成图像                           |                                   |
| `sessions_*` / `agents_list` | 会话管理，子代理                         | [子代理](/zh/tools/subagents)     |

对于图像工作，使用 `image` 进行分析，使用 `image_generate` 进行生成或编辑。如果您针对 `openai/*`、`google/*`、`fal/*` 或其他非默认图像提供商，请先配置该提供商的 auth/API 密钥。

### 插件提供的工具

插件可以注册额外的工具。例如：

- [Lobster](/zh/tools/lobster) — 具有可恢复审批功能的类型化工作流运行时
- [LLM 任务](/zh/tools/llm-task) — 用于结构化输出的仅 JSON LLM 步骤
- [Diffs](/zh/tools/diffs) — 差异查看器和渲染器
- [OpenProse](/zh/prose) — 以 Markdown 为首的工作流编排

## 工具配置

### 允许和拒绝列表

通过配置中的 `tools.allow` / `tools.deny`
控制代理可以调用哪些工具。拒绝列表的优先级始终高于允许列表。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### 工具配置文件

`tools.profile` 在应用 `allow`/`deny` 之前设置了一个基础允许列表。
每 Agent 覆盖：`agents.list[].tools.profile`。

| 配置文件    | 包含内容                           |
| ----------- | ---------------------------------- |
| `full`      | 所有工具（默认）                   |
| `coding`    | 文件 I/O、运行时、会话、内存、图像 |
| `messaging` | 消息传递、会话列表/历史/发送/状态  |
| `minimal`   | 仅 `session_status`                |

### 工具组

在允许/拒绝列表中使用 `group:*` 简写形式：

| 组                 | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, bash, process                                                                                       |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, web_fetch                                                                                     |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:openclaw`   | 所有内置 OpenClaw 工具（不包括插件工具）                                                                  |

### 特定提供商的限制

使用 `tools.byProvider` 来限制特定提供商的工具，而无需
更改全局默认值：

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```

import zh from "/components/footer/zh.mdx";

<zh />
