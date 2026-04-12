---
summary: "斜杠命令：文本与原生、配置以及支持的命令"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "斜杠命令"
---

# 斜杠命令

命令由 Gateway(网关) 处理。大多数命令必须作为以 `/` 开头的**独立**消息发送。
仅限主机的 bash 聊天命令使用 `! <cmd>`（其中 `/bash <cmd>` 作为别名）。

有两个相关的系统：

- **命令**：独立的 `/...` 消息。
- **指令**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 在模型看到消息之前，指令会从消息中剥离。
  - 在普通聊天消息（非仅指令）中，它们被视为“内联提示”并且**不会**持久化会话设置。"
  - 在仅指令消息（消息仅包含指令）中，它们会持久化到会话并回复确认信息。
  - 指令仅对**授权发送者**生效。如果设置了 `commands.allowFrom`，它将是唯一使用的
    白名单；否则授权来自渠道白名单/配对以及 `commands.useAccessGroups`。
    未授权的发送者会将指令视为纯文本。

还有一些**内联快捷方式**（仅限白名单/授权发送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它们会立即运行，在模型看到消息之前被剥离，剩余文本继续通过正常流程。

## 配置

```json5
{
  commands: {
    native: "auto",
    nativeSkills: "auto",
    text: true,
    bash: false,
    bashForegroundMs: 2000,
    config: false,
    mcp: false,
    plugins: false,
    debug: false,
    restart: true,
    ownerAllowFrom: ["discord:123456789012345678"],
    ownerDisplay: "raw",
    ownerDisplaySecret: "${OWNER_ID_HASH_SECRET}",
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

- `commands.text`（默认为 `true`）启用在聊天消息中解析 `/...`。
  - 在没有原生命令的表面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams），即使将其设置为 `false`，文本命令仍然有效。
- `commands.native`（默认为 `"auto"`）注册原生命令。
  - 自动：对于 Discord/Telegram 开启；对于 Slack 关闭（直到添加斜杠指令）；对于没有原生支持的提供商忽略。
  - 设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以覆盖每个提供商的设置（布尔值或 `"auto"`）。
  - `false` 在启动时清除 Discord/Telegram 上先前注册的命令。Slack 命令在 Slack 应用中管理，不会自动移除。
- `commands.nativeSkills`（默认为 `"auto"`）在支持时原生注册 **skill** 命令。
  - 自动：对于 Discord/Telegram 开启；对于 Slack 关闭（Slack 需要为每个技能创建一个斜杠指令）。
  - 设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以按提供商覆盖（布尔值或 `"auto"`）。
- `commands.bash`（默认为 `false`）启用 `! <cmd>` 以运行主机 shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 允许列表）。
- `commands.bashForegroundMs`（默认为 `2000`）控制 bash 在切换到后台模式之前等待的时间（`0` 立即进入后台）。
- `commands.config`（默认为 `false`）启用 `/config`（读取/写入 `openclaw.json`）。
- `commands.mcp`（默认为 `false`）启用 `/mcp`（读取/写入 OpenClaw 管理的 `mcp.servers` 下的 MCP 配置）。
- `commands.plugins`（默认 `false`）启用 `/plugins`（插件发现/状态以及安装 + 启用/禁用控制）。
- `commands.debug`（默认为 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.restart`（默认为 `true`）启用 `/restart` 以及网关重启工具操作。
- `commands.ownerAllowFrom`（可选）设置仅限所有者的命令/工具表面的显式所有者允许列表。这与 `commands.allowFrom` 分开。
- `commands.ownerDisplay` 控制所有者 ID 在系统提示词中的显示方式：`raw` 或 `hash`。
- `commands.ownerDisplaySecret` 可选设置当 `commands.ownerDisplay="hash"` 时使用的 HMAC 密钥。
- `commands.allowFrom`（可选）为命令授权设置按提供商划分的允许列表。配置后，它是
  命令和指令的唯一授权来源（渠道允许列表/配对和 `commands.useAccessGroups`
  被忽略）。使用 `"*"` 作为全局默认值；特定提供商的键会覆盖它。
- 当未设置 `commands.allowFrom` 时，`commands.useAccessGroups`（默认为 `true`）对命令强制执行允许列表/策略。

## 命令列表

当前的唯一真实来源：

- 核心内置命令来自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 dock 命令来自 `src/auto-reply/commands-registry.data.ts`
- 插件命令来自插件 `registerCommand()` 调用
- 网关上的实际可用性仍取决于配置标志、渠道表面和已安装/启用的插件

### 核心内置命令

目前可用的内置命令：

- `/new [model]` 开始新会话；`/reset` 是重置别名。
- `/compact [instructions]` 压缩会话上下文。参见 [/concepts/compaction](/en/concepts/compaction)。
- `/stop` 中止当前运行。
- `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理线程绑定过期。
- `/think <off|minimal|low|medium|high|xhigh>` 设置思考级别。别名：`/thinking`、`/t`。
- `/verbose on|off|full` 切换详细输出。别名：`/v`。
- `/fast [status|on|off]` 显示或设置快速模式。
- `/reasoning [on|off|stream]` 切换推理可见性。别名：`/reason`。
- `/elevated [on|off|ask|full]` 切换提升模式。别名：`/elev`。
- `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 显示或设置 exec 默认值。
- `/model [name|#|status]` 显示或设置模型。
- `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出提供商或提供商的模型。
- `/queue <mode>` 管理队列行为（`steer`、`interrupt`、`followup`、`collect`、`steer-backlog`）以及 `debounce:2s cap:25 drop:summarize` 等选项。
- `/help` 显示简短帮助摘要。
- `/commands` 显示生成的命令目录。
- `/tools [compact|verbose]` 显示当前代理此刻可用的内容。
- `/status` 显示运行时状态，包括可用的提供商使用量/配额。
- `/tasks` 列出当前会话的活动/近期后台任务。
- `/context [list|detail|json]` 解释上下文是如何组装的。
- `/export-session [path]` 将当前会话导出为 HTML。别名：`/export`。
- `/whoami` 显示您的发送者 ID。别名：`/id`。
- `/skill <name> [input]` 按名称运行技能。
- `/allowlist [list|add|remove] ...` 管理允许列表条目。仅限文本模式。
- `/approve <id> <decision>` 解决执行批准提示。
- `/btw <question>` 提出一个附带问题，而不改变未来的会话上下文。参见 [/tools/btw](/en/tools/btw)。
- `/subagents list|kill|log|info|send|steer|spawn` 管理当前会话的子代理运行。
- `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 会话和运行时选项。
- `/focus <target>` 将当前 Discord 线程或 Telegram 主题/对话绑定到会话目标。
- `/unfocus` 移除当前绑定。
- `/agents` 列出当前会话的线程绑定代理。
- `/kill <id|#|all>` 中止一个或所有正在运行的子代理。
- `/steer <id|#> <message>` 将指令发送给正在运行的子代理。别名：`/tell`。
- `/config show|get|set|unset` 读取或写入 `openclaw.json`。仅限所有者。需要 `commands.config: true`。
- `/mcp show|get|set|unset` 读取或写入 OpenClaw 管理的位于 `mcp.servers` 下的 MCP 服务器配置。仅限所有者。需要 `commands.mcp: true`。
- `/plugins list|inspect|show|get|install|enable|disable` 检查或修改插件状态。`/plugin` 是一个别名。写入操作仅限所有者。需要 `commands.plugins: true`。
- `/debug show|set|unset|reset` 管理仅限运行时的配置覆盖。仅限所有者。需要 `commands.debug: true`。
- `/usage off|tokens|full|cost` 控制每次响应的使用情况页脚或打印本地成本摘要。
- `/tts on|off|status|provider|limit|summary|audio|help` 控制 TTS。参见 [/tools/tts](/en/tools/tts)。
- `/restart` 在启用时重启 OpenClaw。默认：已启用；设置 `commands.restart: false` 以禁用它。
- `/activation mention|always` 设置组激活模式。
- `/send on|off|inherit` 设置发送策略。仅限所有者。
- `/bash <command>` 运行主机 shell 命令。仅限文本。别名：`! <command>`。需要 `commands.bash: true` 加上 `tools.elevated` 允许列表。
- `!poll [sessionId]` 检查后台 bash 任务。
- `!stop [sessionId]` 停止后台 bash 任务。

### 生成的 Dock 命令

Dock 命令是从支持 native-command 的渠道插件生成的。当前捆绑的集合包括：

- `/dock-discord` (别名: `/dock_discord`)
- `/dock-mattermost` (别名: `/dock_mattermost`)
- `/dock-slack` (别名: `/dock_slack`)
- `/dock-telegram` (别名: `/dock_telegram`)

### 捆绑的插件命令

捆绑的插件可以添加更多斜杠命令。此仓库中当前的捆绑命令包括：

- `/dreaming [on|off|status|help]` 切换记忆做梦。参见 [Dreaming](/en/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理设备配对/设置流程。参见 [Pairing](/en/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 临时启用高风险手机节点命令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 语音配置。在 Discord 上，本机命令名称为 `/talkvoice`。
- `/card ...` 发送 LINE 富卡片预设。参见 [LINE](/en/channels/line)。
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` 检查和控制内置的 Codex 应用服务器绑定工具。参见 [Codex Harness](/en/plugins/codex-harness)。
- 仅限 QQBot 的命令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 动态技能命令

用户可调用的技能也会作为斜杠命令暴露出来：

- `/skill <name> [input]` 始终作为通用入口工作。
- 当技能/插件注册它们时，技能也可能作为直接命令出现，例如 `/prose`。
- 原生技能命令注册由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。

注意：

- 命令接受在命令和参数之间的可选 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）；如果没有匹配，文本将被视为消息正文。
- 有关完整的提供商使用细分，请使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 并尊重渠道 `configWrites`。
- 在多账户频道中，针对配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也会遵守目标账户的 `configWrites`。
- `/usage` 控制每次回复的使用情况页脚；`/usage cost` 打印来自 OpenClaw 会话日志的本地成本摘要。
- `/restart` 默认启用；设置 `commands.restart: false` 以禁用它。
- `/plugins install <spec>` 接受与 `openclaw plugins install` 相同的插件规格：本地路径/归档、npm 包或 `clawhub:<pkg>`。
- `/plugins enable|disable` 更新插件配置并可能会提示重启。
- Discord 专属的原生命令：`/vc join|leave|status` 控制语音频道（需要 `channels.discord.voice` 和原生命令；不可用作文本）。
- Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 命令参考和运行时行为：[ACP Agents](/en/tools/acp-agents)。
- `/verbose` 旨在用于调试和额外可见性；正常使用时请保持 **关闭**。
- `/fast on|off` 持久化会话覆盖设置。使用会话 UI 的 `inherit` 选项来清除它并回退到配置默认值。
- `/fast` 取决于提供商：OpenAI/OpenAI Codex 将其映射到原生 Responses 端点上的 `service_tier=priority`，而直接公共 Anthropic 请求（包括发送到 `api.anthropic.com` 的 OAuth 验证流量）将其映射到 `service_tier=auto` 或 `standard_only`。参见 [OpenAI](/en/providers/openai) 和 [Anthropic](/en/providers/anthropic)。
- 在相关时仍会显示工具失败摘要，但仅当 `/verbose` 为 `on` 或 `full` 时才包含详细的失败文本。
- `/reasoning`（以及 `/verbose`）在群组环境中是有风险的：它们可能会泄露您不打算暴露的内部推理或工具输出。建议关闭它们，尤其是在群聊中。
- `/model` 会立即持久化新的会话模型。
- 如果代理处于空闲状态，下一次运行将立即使用它。
- 如果运行已经开始，OpenClaw 会将实时切换标记为挂起，并仅在干净的重试点重启到新模型。
- 如果工具活动或回复输出已经开始，挂起的切换可以保持排队状态，直到稍后的重试机会或下一个用户轮次。
- **快速路径：** 来自白名单发送者的纯命令消息会被立即处理（绕过队列 + 模型）。
- **群组提及门控：** 来自白名单发送者的纯命令消息绕过提及要求。
- **内联快捷方式（仅限白名单发送者）：** 某些命令在嵌入普通消息时也有效，并且会在模型看到剩余文本之前被剥离。
  - 例如：`hey /status` 触发状态回复，剩余文本继续正常流程。
- 目前包括：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未经授权的纯命令消息将被静默忽略，内联 `/...` 标记将被视为纯文本。
- **Skill 命令：** `user-invocable` Skills 作为斜杠命令公开。名称被清理为 `a-z0-9_`（最多 32 个字符）；冲突会添加数字后缀（例如 `_2`）。
  - `/skill <name> [input]` 按名称运行一个 Skill（当原生命令限制阻止 per-skill 命令时很有用）。
  - 默认情况下，Skill 命令作为普通请求转发给模型。
  - Skills 可以选择性地声明 `command-dispatch: tool` 以将命令直接路由到工具（确定性，无模型）。
  - 示例：`/prose` (OpenProse 插件) — 请参阅 [OpenProse](/en/prose)。
- **原生命令参数：** Discord 使用自动填充来处理动态选项（当您省略必填参数时，还会显示按钮菜单）。当命令支持选项并且您省略参数时，Telegram 和 Slack 会显示按钮菜单。

## `/tools`

`/tools` 回答的是一个运行时问题，而不是配置问题：**该代理当前在此会话中可以使用什么**。

- 默认的 `/tools` 是紧凑的，并针对快速浏览进行了优化。
- `/tools verbose` 添加简短描述。
- 支持参数的原生命令界面会暴露与 `compact|verbose` 相同的模式切换。
- 结果是基于会话范围的，因此更改代理、渠道、线程、发送者授权或模型都可以改变输出。
- `/tools` 包括在运行时实际可访问的工具，包括核心工具、已连接的插件工具和渠道拥有的工具。

对于配置文件和覆盖编辑，请使用控制 UI 工具面板或配置/目录界面，而不要将 `/tools` 视为静态目录。

## 使用界面（哪里显示什么）

- **提供商使用量/配额**（例如：“Claude 剩余 80%”）会在启用使用量跟踪时显示在 `/status` 中，针对当前模型提供商。OpenClaw 将提供商窗口标准化为 `% left`；对于 MiniMax，仅剩余百分比的字段在显示前会反转，并且 `model_remains` 响应优先选择聊天模型条目加上带模型标签的计划标签。
- 当实时会话快照稀疏时，`/status` 中的 **Token/缓存行** 可以回退到最新的转录使用条目。现有的非零实时值仍然优先，并且当存储的总数缺失或较小时，转录回退也可以恢复活动的运行时模型标签加上更大的面向提示词的总数。
- **每次响应的 Token/成本** 由 `/usage off|tokens|full` 控制（附加到正常回复中）。
- `/model status` 关乎 **模型/认证/端点**，而非使用量。

## 模型选择 (`/model`)

`/model` 被实现为一条指令。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

备注：

- `/model` 和 `/model list` 显示一个紧凑的、带编号的选择器（模型系列 + 可用的提供商）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，其中包含提供商和模型下拉菜单以及提交步骤。
- `/model <#>` 从该选择器中进行选择（并在可能时优先使用当前提供商）。
- `/model status` 显示详细视图，包括配置的提供商端点（`baseUrl`）和 API 模式（`api`）（如果可用）。

## 调试覆盖

`/debug` 允许您设置 **仅运行时** 配置覆盖（内存中，而非磁盘）。仅限所有者。默认禁用；通过 `commands.debug: true` 启用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

说明：

- 覆盖会立即应用于新的配置读取，但 **不会** 写入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆盖并返回磁盘上的配置。

## 配置更新

`/config` 会写入您的磁盘配置（`openclaw.json`）。仅限所有者。默认禁用；通过 `commands.config: true` 启用。

示例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

说明：

- 配置在写入前会进行验证；无效的更改将被拒绝。
- `/config` 更新会在重启后保留。

## MCP 更新

`/mcp` 在 `mcp.servers` 下写入 OpenClaw 托管的 MCP 服务器定义。仅限所有者。默认禁用；通过 `commands.mcp: true` 启用。

示例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

说明：

- `/mcp` 将配置存储在 OpenClaw 配置中，而不是 Pi 拥有的项目设置中。
- 运行时适配器决定哪些传输实际上是可执行的。

## 插件更新

`/plugins` 允许操作员检查已发现的插件并切换配置中的启用状态。只读流程可以使用 `/plugin` 作为别名。默认禁用；通过 `commands.plugins: true` 启用。

示例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

说明：

- `/plugins list` 和 `/plugins show` 针对当前工作区以及磁盘上的配置使用真实的插件发现机制。
- `/plugins enable|disable` 仅更新插件配置；它不安装或卸载插件。
- 在启用/禁用更改后，重启网关以应用它们。

## 界面说明

- **文本命令**在正常的聊天会话中运行（私信共享 `main`，群组有自己的会话）。
- **原生命令**使用隔离的会话：
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` （前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
  - Telegram: `telegram:slash:<userId>` （通过 `CommandTargetSessionKey` 定位聊天会话）
- **`/stop`** 针对活动的聊天会话，以便它可以中止当前的运行。
- **Slack：** `channels.slack.slashCommand` 仍支持用于单个 `/openclaw` 样式的命令。如果您启用 `commands.native`，则必须为每个内置命令创建一个 Slack 斜杠命令（名称与 `/help` 相同）。Slack 的命令参数菜单作为临时 Block Kit 按钮提供。
  - Slack 原生例外：注册 `/agentstatus` （而不是 `/status`），因为 Slack 保留了 `/status`。文本 `/status` 在 Slack 消息中仍然有效。

## BTW 旁侧问题

`/btw` 是关于当前会话的一个快速**旁侧问题**。

与正常聊天不同：

- 它使用当前会话作为背景上下文，
- 它作为一个单独的**无工具**一次性调用运行，
- 它不会改变未来的会话上下文，
- 它不会被写入转录历史记录，
- 它作为一个实时的旁侧结果交付，而不是正常的助手消息。

这使得 `/btw` 在您想要临时澄清而主要任务继续进行时非常有用。

示例：

```text
/btw what are we doing right now?
```

有关完整行为和客户端 UX 详细信息，请参阅 [BTW Side Questions](/en/tools/btw)。
