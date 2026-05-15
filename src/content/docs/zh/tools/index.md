---
summary: "OpenClawOpenClaw 工具和插件概述：agent 可以做什么以及如何扩展它"
read_when:
  - You want to understand what tools OpenClaw provides
  - You need to configure, allow, or deny tools
  - You are deciding between built-in tools, skills, and plugins
title: "工具和插件"
---

智能体除了生成文本之外的所有操作都是通过**工具**完成的。
工具是智能体读取文件、运行命令、浏览网页、发送消息
以及与设备交互的方式。

## 工具、Skills 和插件

OpenClaw 具有三个协同工作的层级：

<Steps>
  <Step title="工具是 agent 调用的对象">
    工具是 agent 可以调用的类型化函数（例如 `exec`、`browser`、
    `web_search`、`message`OpenClawAPI）。OpenClaw 提供了一组**内置工具**，
    插件可以注册额外的工具。

    agent 将工具视为发送到模型 API 的结构化函数定义。

  </Step>

  <Step title="Skills 教导 agent 何时以及如何使用">
    Skill 是注入到系统提示词中的 markdown 文件（`SKILL.md`）。
    Skills 为 agent 提供了有效使用工具的上下文、约束和分步指导。Skills 存在于您的工作区中、共享文件夹中，
    或包含在插件中。

    [Skills 参考](/zh/tools/skills) | [创建 Skills](/zh/tools/creating-skills)

  </Step>

  <Step title="插件将所有内容打包在一起"OpenClawnpm>
    插件是一个可以注册任何功能组合的包：
    渠道、模型提供商、工具、Skills、语音、实时转录、
    实时语音、媒体理解、图像生成、视频生成、
    网络抓取、网络搜索等。有些插件是**核心**（随
    OpenClaw 一起提供），其他的则是**外部**（由社区在 npm 上发布）。

    [安装和配置插件](/zh/tools/plugin) | [构建您自己的插件](/zh/plugins/building-plugins)

  </Step>
</Steps>

## 内置工具

这些工具随 OpenClaw 一起提供，无需安装任何插件即可使用：

| 工具                                       | 功能                                      | 页面                                                          |
| ------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------- |
| `exec` / `process`                         | 运行 shell 命令，管理后台进程             | [Exec](/zh/tools/exec), [Exec 审批](/zh/tools/exec-approvals) |
| `code_execution`                           | 运行沙箱隔离的远程 Python 分析            | [代码执行](/zh/tools/code-execution)                          |
| `browser`                                  | 控制 Chromium 浏览器（导航、点击、截图）  | [浏览器](/zh/tools/browser)                                   |
| `web_search` / `x_search` / `web_fetch`    | 搜索网络、搜索 X 帖子、获取页面内容       | [Web](/zh/tools/web)、[Web Fetch](/zh/tools/web-fetch)        |
| `read` / `write` / `edit`                  | 工作区中的文件 I/O                        |                                                               |
| `apply_patch`                              | 多块文件补丁                              | [Apply Patch](/zh/tools/apply-patch)                          |
| `message`                                  | 跨所有渠道发送消息                        | [Agent Send](/zh/tools/agent-send)                            |
| `nodes`                                    | 发现并定位已配对的设备                    |                                                               |
| `cron` / `gateway`                         | 管理计划任务；检查、修补、重启或更新网关  |                                                               |
| `image` / `image_generate`                 | 分析或生成图像                            | [Image Generation](/zh/tools/image-generation)                |
| `music_generate`                           | 生成音乐曲目                              | [Music Generation](/zh/tools/music-generation)                |
| `video_generate`                           | 生成视频                                  | [Video Generation](/zh/tools/video-generation)                |
| `tts`                                      | 一次性文本转语音转换                      | [TTS](/zh/tools/tts)                                          |
| `sessions_*` / `subagents` / `agents_list` | 会话管理、状态和子代理编排                | [Sub-agents](/zh/tools/subagents)                             |
| `session_status`                           | 轻量级 `/status` 风格的回读和会话模型覆盖 | [Session Tools](/zh/concepts/session-tool)                    |

对于图像工作，请使用 `image` 进行分析，使用 `image_generate` 进行生成或编辑。如果您目标是 `openai/*`、`google/*`、`fal/*`API 或其他非默认图像提供商，请先配置该提供商的 auth/API 密钥。

对于音乐工作，请使用 `music_generate`。如果您目标是 `google/*`、`minimax/*`API 或其他非默认音乐提供商，请先配置该提供商的 auth/API 密钥。

对于视频工作，请使用 `video_generate`。如果您针对的是 `qwen/*` 或其他非默认视频提供商，请先配置该提供商的 auth/API 密钥。

对于工作流驱动的音频生成，当 ComfyUI 等插件注册 `music_generate` 时请使用它。这与 `tts` 不同，后者是文本转语音。

`session_status` 是会话组中的轻量级状态/回读工具。它回答有关当前会话的 `/status` 风格的问题，并可以选择设置每个会话的模型覆盖；`model=default` 清除该覆盖。像 `/status` 一样，它可以从最新的转录使用条目中回填稀疏的令牌/缓存计数器和活动运行时模型标签。

`gateway` 是仅限所有者用于网关操作的运行时工具：

- `config.schema.lookup` 用于在编辑之前获取单个路径范围的配置子树
- `config.get` 用于获取当前配置快照 + 哈希
- `config.patch` 用于带重启的部分配置更新
- `config.apply` 仅用于完整配置替换
- `update.run` 用于显式自我更新 + 重启

对于部分更改，首选 `config.schema.lookup` 然后 `config.patch`。仅当您有意替换整个配置时才使用 `config.apply`。有关更广泛的配置文档，请阅读 [Configuration](/zh/gateway/configuration) 和 [Configuration reference](/zh/gateway/configuration-reference)。该工具还拒绝更改 `tools.exec.ask` 或 `tools.exec.security`；旧的 `tools.bash.*` 别名会标准化为相同的受保护执行路径。

### 插件提供的工具

插件可以注册其他工具。一些示例：

- [Canvas](/zh/plugins/reference/canvas) — 用于节点 Canvas 控制和 A2UI 渲染的实验性捆绑插件
- [Diffs](/zh/tools/diffs) — 差异查看器和渲染器
- [LLM Task](LLM/en/tools/llm-taskLLM) — 仅 JSON 的 LLM 步骤，用于结构化输出
- [Lobster](Lobster/en/tools/lobster) — 具有可恢复审批功能的类型化工作流运行时
- [Music Generation](/zh/tools/music-generation) — 具有工作流支持提供者的共享 `music_generate` 工具
- [OpenProse](OpenProse/en/prose) — 以 markdown 为先的工作流编排
- [Tokenjuice](/zh/tools/tokenjuice) — 紧凑且带噪声的 `exec` 和 `bash` 工具结果

插件工具仍使用 `api.registerTool(...)` 编写，并在插件清单的 `contracts.tools`OpenClaw 列表中声明。OpenClaw 在发现期间捕获已验证的工具描述符，并按插件源和契约进行缓存，以便后续工具规划可以跳过插件运行时加载。工具执行仍会加载所属插件并调用实时注册的实现。

## 工具配置

### 允许和拒绝列表

通过配置中的 `tools.allow` / `tools.deny` 控制代理可以调用哪些工具。拒绝始终优先于允许。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

当显式允许列表解析为没有可调用工具时，OpenClaw 会以封闭失败（fail closed）方式处理。例如，OpenClaw`tools.allow: ["query_db"]` 仅在已加载的插件实际注册 `query_db` 时才有效。如果没有内置、插件或捆绑的 MCP 工具匹配允许列表，运行将在模型调用之前停止，而不是作为可能产生工具结果幻觉的仅文本运行继续。

### 工具配置文件

`tools.profile` 在应用 `allow`/`deny` 之前设置基本允许列表。
每代理覆盖：`agents.list[].tools.profile`。

| 配置文件    | 包含内容                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 所有核心和可选插件工具；用于更广泛的命令/控制访问的无限制基线                                                                                     |
| `coding`    | `group:fs`、`group:runtime`、`group:web`、`group:sessions`、`group:memory`、`cron`、`image`、`image_generate`、`music_generate`、`video_generate` |
| `messaging` | `group:messaging`、`sessions_list`、`sessions_history`、`sessions_send`、`session_status`                                                         |
| `minimal`   | 仅限 `session_status`                                                                                                                             |

<Note>对于专注于渠道的代理，`tools.profile: "messaging"` 的范围故意设计得很窄。它排除了更广泛的命令/控制工具，例如文件系统、运行时、浏览器、画布、节点、cron 和网关控制。使用 `tools.profile: "full"` 作为更广泛的命令/控制访问的无限制基准，然后根据需要使用 `tools.allow` / `tools.deny` 修剪访问权限。</Note>

`coding` 包含轻量级 Web 工具（`web_search`、`web_fetch`、`x_search`）
但不包含完整的浏览器控制工具。浏览器自动化可以驱动真实会话和已登录的配置文件，因此请通过 `tools.alsoAllow: ["browser"]` 或特定于代理的
`agents.list[].tools.alsoAllow: ["browser"]` 明确添加它。

<Note>在限制性配置文件（`messaging`、`minimal`）下配置 `tools.exec` 或 `tools.fs` 不会隐式扩大配置文件的允许列表。当您希望限制性配置文件使用这些配置的部分时，请添加显式的 `tools.alsoAllow` 条目（例如，针对 exec 的 `["exec", "process"]`，或针对 fs 的 `["read", "write", "edit"]`）。当存在配置部分但没有匹配的 `alsoAllow` 授权时，OpenClaw 会记录启动警告。</Note>

`coding` 和 `messaging` 配置文件还允许在插件键 `bundle-mcp` 下使用已配置的捆绑 MCP 工具。当你希望配置文件保留其正常的内置工具但隐藏所有已配置的 MCP 工具时，请添加 `tools.deny: ["bundle-mcp"]`。`minimal` 配置文件不包含捆绑 MCP 工具。

示例（默认情况下具有最广泛的工具范围）：

```json5
{
  tools: {
    profile: "full",
  },
}
```

### 工具组

在允许/拒绝列表中使用 `group:*` 简写形式：

| 组                 | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, process, code_execution（`bash` 被接受为 `exec` 的别名）                                            |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas（当启用捆绑的 Canvas 插件时）                                                             |
| `group:automation` | heartbeat_respond, cron, gateway                                                                          |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list, update_plan                                                                                  |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | 所有内置 OpenClaw 工具（不包括插件工具）                                                                  |

`sessions_history` 返回一个有界的、经过安全过滤的召回视图。它会从助手文本中剥离思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`MiniMax 和截断的工具调用块）、降级的工具调用脚手架、泄漏的 ASCII/全角模型控制令牌以及格式错误的 MiniMax 工具调用 XML，然后应用编辑/截断和可能的超大行占位符，而不是作为原始转储记录。

### 特定于提供商的限制

使用 `tools.byProvider` 来限制特定提供商的工具，而
无需更改全局默认设置：

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
