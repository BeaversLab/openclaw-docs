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

  <Step title="Skills 教授代理何时以及如何">
    Skills 是一个 Markdown 文件 (`SKILL.md`)，被注入到系统提示词中。
    Skills 为代理提供上下文、约束和分步指导，以有效地使用工具。Skills 存在于您的工作区、共享文件夹中，或打包在插件内。

    [Skills 参考](/en/tools/skills) | [创建 Skills](/en/tools/creating-skills)

  </Step>

  <Step title="Plugins 将所有内容打包在一起">
    Plugin 是一个可以注册任何能力组合的包：渠道、模型提供商、工具、Skills、语音、实时转录、实时语音、媒体理解、图像生成、视频生成、Web 获取、Web 搜索等。一些插件是 **核心**（随 OpenClaw 一起提供），另一些是 **外部**（由社区发布在 npm 上）。

    [安装和配置插件](/en/tools/plugin) | [构建您自己的插件](/en/plugins/building-plugins)

  </Step>
</Steps>

## 内置工具

这些工具随 OpenClaw 一起提供，无需安装任何插件即可使用：

| 工具                                       | 功能                                      | 页面                                   |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------- |
| `exec` / `process`                         | 运行 shell 命令，管理后台进程             | [Exec](/en/tools/exec)                 |
| `code_execution`                           | 运行沙箱隔离的远程 Python 分析            | [代码执行](/en/tools/code-execution)   |
| `browser`                                  | 控制 Chromium 浏览器（导航、点击、截图）  | [浏览器](/en/tools/browser)            |
| `web_search` / `x_search` / `web_fetch`    | 搜索网络、搜索 X 帖子、获取页面内容       | [Web](/en/tools/web)                   |
| `read` / `write` / `edit`                  | 工作区中的文件 I/O                        |                                        |
| `apply_patch`                              | 多块文件补丁                              | [应用补丁](/en/tools/apply-patch)      |
| `message`                                  | 跨所有渠道发送消息                        | [代理发送](/en/tools/agent-send)       |
| `canvas`                                   | 驱动节点 Canvas（演示、评估、快照）       |                                        |
| `nodes`                                    | 发现并定位配对的设备                      |                                        |
| `cron` / `gateway`                         | 管理定时任务；检查、修补、重启或更新网关  |                                        |
| `image` / `image_generate`                 | 分析或生成图像                            | [图像生成](/en/tools/image-generation) |
| `music_generate`                           | 生成音乐曲目                              | [音乐生成](/en/tools/music-generation) |
| `video_generate`                           | 生成视频                                  | [视频生成](/en/tools/video-generation) |
| `tts`                                      | 一次性文本转语音转换                      | [TTS](/en/tools/tts)                   |
| `sessions_*` / `subagents` / `agents_list` | 会话管理、状态和子代理编排                | [子代理](/en/tools/subagents)          |
| `session_status`                           | 轻量级 `/status` 风格的回放和会话模型覆盖 | [会话工具](/en/concepts/session-tool)  |

对于图像处理，使用 `image` 进行分析，使用 `image_generate` 进行生成或编辑。如果您的目标是 `openai/*`、`google/*`、`fal/*` 或其他非默认图像提供商，请先配置该提供商的 auth/API 密钥。

对于音乐处理，使用 `music_generate`。如果您的目标是 `google/*`、`minimax/*` 或其他非默认音乐提供商，请先配置该提供商的 auth/API 密钥。

对于视频处理，使用 `video_generate`。如果您的目标是 `qwen/*` 或其他非默认视频提供商，请先配置该提供商的 auth/API 密钥。

对于工作流驱动的音频生成，当 ComfyUI 等插件注册时，使用 `music_generate`。这与 `tts` 是分开的，后者是文本转语音。

`session_status` 是会话组中的轻量级状态/回读工具。它回答有关当前会话的 `/status` 风格的问题，并可以选择设置每个会话的模型覆盖；`model=default` 清除该覆盖。与 `/status` 类似，它可以从最新的转录使用条目中回填稀疏的令牌/缓存计数器和活动运行时模型标签。

`gateway` 是用于网关操作的仅限所有者的运行时工具：

- 在编辑之前，针对一个路径范围的配置子树使用 `config.schema.lookup`
- 使用 `config.get` 获取当前配置快照 + 哈希值
- 使用 `config.patch` 进行带重启的部分配置更新
- 仅当需要完整配置替换时才使用 `config.apply`
- 使用 `update.run` 进行显式自更新 + 重启

对于部分更改，建议先使用 `config.schema.lookup` 然后使用 `config.patch`。仅当您有意替换整个配置时才使用 `config.apply`。该工具还拒绝更改 `tools.exec.ask` 或 `tools.exec.security`；传统的 `tools.bash.*` 别名会规范化为相同的受保护执行路径。

### 插件提供的工具

插件可以注册额外的工具。一些示例：

- [Lobster](/en/tools/lobster) — 具有可恢复审批的类型化工作流运行时
- [LLM Task](/en/tools/llm-task) — 用于结构化输出的仅 JSON LLM 步骤
- [Music Generation](/en/tools/music-generation) — 具有工作流支持提供者的共享 `music_generate` 工具
- [Diffs](/en/tools/diffs) — 差异查看器和渲染器
- [OpenProse](/en/prose) — 以 markdown 为首的工作流编排

## 工具配置

### 允许和拒绝列表

通过配置中的 `tools.allow` / `tools.deny` 控制代理可以调用哪些工具。
拒绝始终优先于允许。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

### 工具配置文件

`tools.profile` 在应用 `allow`/`deny` 之前设置基本允许列表。
每代理覆盖：`agents.list[].tools.profile`。

| 配置文件    | 包含内容                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 无限制（与未设置相同）                                                                                                                            |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | 仅 `session_status`                                                                                                                               |

### 工具组

在允许/拒绝列表中使用 `group:*` 简写形式：

| 组                 | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, process, code_execution（接受 `bash` 作为 `exec` 的别名）                                           |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list                                                                                               |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | 所有内置 OpenClaw 工具（不包括插件工具）                                                                  |

`sessions_history` 返回一个有界的、经过安全过滤的回顾视图。它会从助手文本中剥离思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>` 和被截断的工具调用块）、降级的工具调用脚手架、泄露的 ASCII/全角模型控制令牌以及格式错误的 MiniMax 工具调用 XML，然后应用编辑/截断和可能的超大行占位符，而不是作为原始记录转储。

### 特定于提供商的限制

使用 `tools.byProvider` 来限制特定提供商的工具，而无需更改全局默认值：

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
