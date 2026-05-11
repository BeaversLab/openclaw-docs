---
summary: "OpenClaw 工具和插件概述：代理可以做什么以及如何扩展它"
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
  <Step title="工具是智能体调用的对象">
    工具是智能体可以调用的类型化函数（例如 `exec`、`browser`、
    `web_search`、`message`）。OpenClaw 提供了一组**内置工具**，
    插件可以注册额外的工具。

    智能体将工具视为发送到 API API 的结构化函数定义。

  </Step>

  <Step title="Skills 教导智能体何时以及如何操作">
    Skill 是注入到系统提示词中的 markdown 文件（`SKILL.md`）。
    Skills 为智能体提供上下文、约束以及有效使用工具的
    分步指导。Skills 位于您的工作区、共享文件夹中，
    或随插件一起提供。

    [Skills 参考](/zh/tools/skills) | [创建 Skills](/zh/tools/creating-skills)

  </Step>

  <Step title="插件将所有内容打包在一起">
    插件是一个可以注册任何功能组合的包：
    渠道、模型提供商、工具、Skills、语音、实时转录、
    实时语音、媒体理解、图像生成、视频生成、
    网络获取、网络搜索等。一些插件是**核心**的（随 OpenClaw 提供），
    其他是**外部**的（由社区在 npm 上发布）。

    [安装和配置插件](/zh/tools/plugin) | [构建您自己的插件](/zh/plugins/building-plugins)

  </Step>
</Steps>

## 内置工具

这些工具随 OpenClaw 一起提供，无需安装任何插件即可使用：

| 工具                                       | 功能                                     | 页面                                                         |
| ------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| `exec` / `process`                         | 运行 shell 命令，管理后台进程            | [执行](/zh/tools/exec)、[执行批准](/zh/tools/exec-approvals) |
| `code_execution`                           | 运行沙箱隔离的远程 Python 分析           | [代码执行](/zh/tools/code-execution)                         |
| `browser`                                  | 控制 Chromium 浏览器（导航、点击、截图） | [浏览器](/zh/tools/browser)                                  |
| `web_search` / `x_search` / `web_fetch`    | 搜索网络、搜索 X 帖子、获取页面内容      | [网络](/zh/tools/web), [网络获取](/zh/tools/web-fetch)       |
| `read` / `write` / `edit`                  | 工作区中的文件 I/O                       |                                                              |
| `apply_patch`                              | 多块文件补丁                             | [应用补丁](/zh/tools/apply-patch)                            |
| `message`                                  | 跨所有渠道发送消息                       | [代理发送](/zh/tools/agent-send)                             |
| `canvas`                                   | 驱动节点 Canvas（演示、评估、快照）      |                                                              |
| `nodes`                                    | 发现并定位配对设备                       |                                                              |
| `cron` / `gateway`                         | 管理计划任务；检查、修补、重启或更新网关 |                                                              |
| `image` / `image_generate`                 | 分析或生成图像                           | [图像生成](/zh/tools/image-generation)                       |
| `music_generate`                           | 生成音乐曲目                             | [音乐生成](/zh/tools/music-generation)                       |
| `video_generate`                           | 生成视频                                 | [视频生成](/zh/tools/video-generation)                       |
| `tts`                                      | 一次性文本转语音转换                     | [TTS](/zh/tools/tts)                                         |
| `sessions_*` / `subagents` / `agents_list` | 会话管理、状态和子代理编排               | [子代理](/zh/tools/subagents)                                |
| `session_status`                           | 轻量级 `/status` 风格回读和会话模型覆盖  | [会话工具](/zh/concepts/session-tool)                        |

对于图像工作，请使用 `image` 进行分析，使用 `image_generate` 进行生成或编辑。如果您针对的是 `openai/*`、`google/*`、`fal/*` 或其他非默认图像提供商，请先配置该提供商的 auth/API 密钥。

对于音乐工作，请使用 `music_generate`。如果您针对的是 `google/*`、`minimax/*` 或其他非默认音乐提供商，请先配置该提供商的 auth/API 密钥。

对于视频工作，请使用 `video_generate`。如果您针对的是 `qwen/*` 或其他非默认视频提供商，请先配置该提供商的 auth/API 密钥。

对于工作流驱动的音频生成，当 ComfyUI 等插件注册它时，请使用 `music_generate`。这与 `tts` 不同，后者是文本转语音。

`session_status` 是会话组中轻量级状态/回读工具。它回答有关当前会话的 `/status` 风格问题，并可以选择设置每个会话的模型覆盖；`model=default` 清除该覆盖。与 `/status` 类似，它可以从最新的转录使用条目中回填稀疏的令牌/缓存计数器和活动运行时模型标签。

`gateway` 是用于网关操作的仅限所有者运行时工具：

- `config.schema.lookup` 用于在编辑之前获取一个路径范围的配置子树
- `config.get` 用于获取当前配置快照 + 哈希
- `config.patch` 用于通过重启进行部分配置更新
- `config.apply` 仅用于完整配置替换
- `update.run` 用于显式自更新 + 重启

对于部分更改，首选 `config.schema.lookup` 然后 `config.patch`。仅当您有意替换整个配置时才使用
`config.apply`。
有关更广泛的配置文档，请阅读 [Configuration](/zh/gateway/configuration) 和
[Configuration reference](/zh/gateway/configuration-reference)。
该工具还拒绝更改 `tools.exec.ask` 或 `tools.exec.security`；
传统的 `tools.bash.*` 别名会规范化为相同的受保护执行路径。

### 插件提供的工具

插件可以注册额外的工具。一些示例：

- [Diffs](/zh/tools/diffs) — 差异查看器和渲染器
- [LLM Task](/zh/tools/llm-task) — 用于结构化输出的纯 JSON LLM 步骤
- [Lobster](/zh/tools/lobster) — 具有可恢复审批的类型化工作流运行时
- [Music Generation](/zh/tools/music-generation) — 具有工作流支持的提供商的共享 `music_generate` 工具
- [OpenProse](/zh/prose) — 以 markdown 为首的工作流编排
- [Tokenjuice](/zh/tools/tokenjuice) — 紧凑的嘈杂 `exec` 和 `bash` 工具结果

## 工具配置

### 允许和拒绝列表

通过配置中的 `tools.allow` / `tools.deny` 控制代理可以调用哪些工具。
拒绝列表总是优先于允许列表。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

当显式的允许列表解析为无可调用工具时，OpenClaw 将失败关闭。
例如，只有当加载的插件实际注册了 `query_db` 时，
`tools.allow: ["query_db"]` 才有效。如果没有内置、插件或捆绑的 MCP 工具匹配
允许列表，运行将在模型调用之前停止，而不是继续作为可能会
产生幻觉工具结果的纯文本运行。

### 工具配置文件

`tools.profile` 在应用 `allow`/`deny` 之前设置基本允许列表。
每代理覆盖：`agents.list[].tools.profile`。

| 配置文件    | 包含内容                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 无限制（与未设置相同）                                                                                                                            |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | 仅限 `session_status`                                                                                                                             |

`coding` 包含轻量级 Web 工具（`web_search`、`web_fetch`、`x_search`），但不包含完整的浏览器控制工具。浏览器自动化可以驱动真实会话和已登录配置文件，因此请使用 `tools.alsoAllow: ["browser"]` 或逐代理 `agents.list[].tools.alsoAllow: ["browser"]` 显式添加它。

`coding` 和 `messaging` 配置文件还允许在插件键 `bundle-mcp` 下使用已配置的捆绑 MCP 工具。当您希望配置文件保留其正常的内置工具但隐藏所有已配置的 MCP 工具时，请添加 `tools.deny: ["bundle-mcp"]`。`minimal` 配置文件不包含捆绑 MCP 工具。

### 工具组

在允许/拒绝列表中使用 `group:*` 简写：

| 组                 | 工具                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec、process、code_execution（`bash` 被接受为 `exec` 的别名）                                            |
| `group:fs`         | read、write、edit、apply_patch                                                                            |
| `group:sessions`   | sessions_list、sessions_history、sessions_send、sessions_spawn、sessions_yield、subagents、session_status |
| `group:memory`     | memory_search、memory_get                                                                                 |
| `group:web`        | web_search、x_search、web_fetch                                                                           |
| `group:ui`         | browser、canvas                                                                                           |
| `group:automation` | cron、gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list                                                                                               |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | 所有内置 OpenClaw 工具（不包括插件工具）                                                                  |

`sessions_history` 返回一个有界的、经过安全过滤的召回视图。它会从助手文本中剥离思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、
`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
`<function_calls>...</function_calls>` 以及截断的工具调用块）、降级的工具调用脚手架、泄露的 ASCII/全角 模型控制令牌以及格式错误的 MiniMax 工具调用 XML，然后应用编辑/截断和可能的超大行占位符，而不是作为原始转储副本。

### 提供商特定限制

使用 `tools.byProvider` 限制特定提供商的工具，而无需更改全局默认值：

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
