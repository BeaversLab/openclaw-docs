---
summary: "Slash commands: text vs native, config, and supported commands"
read_when:
  - 使用或配置聊天命令
  - 调试命令路由或权限
title: "Slash Commands"
---

# Slash commands

命令由 Gateway(网关) 处理。大多数命令必须作为以 `/` 开头的**独立**消息发送。
仅限主机的 bash 聊天命令使用 `! <cmd>`（以 `/bash <cmd>` 作为别名）。

有两个相关的系统：

- **命令（Commands）**：独立的 `/...` 消息。
- **指令（Directives）**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 在模型看到消息之前，指令会从消息中剥离。
  - 在正常的聊天消息中（非仅指令），它们被视为“内联提示”，并且**不**持久保存会话设置。
  - 在仅指令消息中（消息仅包含指令），它们会持久保存到会话并回复确认。
  - 指令仅适用于**经过授权的发送者**。如果设置了 `commands.allowFrom`，则它是唯一使用的允许列表；否则授权来自渠道允许列表/配对加上 `commands.useAccessGroups`。
未经授权的发送者将看到指令被视为纯文本。

还有一些**内联快捷方式**（仅限在允许列表/授权发送者）：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
它们会立即运行，在模型看到消息之前被剥离，剩余文本继续通过正常流程。

## Config

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
    restart: false,
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
    useAccessGroups: true,
  },
}
```

- `commands.text`（默认为 `true`）启用在聊天消息中解析 `/...`。
  - 在没有原生命令的表面（WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams）上，即使您将其设置为 `false`，文本命令仍然有效。
- `commands.native`（默认为 `"auto"`）注册原生命令。
  - 自动：对于 Discord/Telegram 为开启；对于 Slack 为关闭（直到您添加斜杠命令）；对于不支持原生的提供商则忽略。
  - 设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以针对每个提供商进行覆盖（布尔值或 `"auto"`）。
  - `false` 在启动时清除 Discord/Telegram 上先前注册的命令。Slack 命令在 Slack 应用程序中管理，不会被自动移除。
- `commands.nativeSkills`（默认为 `"auto"`）在支持时原生注册 **skill** 命令。
  - 自动：对于 Discord/Telegram 为开启；对于 Slack 为关闭（Slack 需要为每个 skill 创建一个斜杠命令）。
  - 设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以针对每个提供商进行覆盖（布尔值或 `"auto"`）。
- `commands.bash`（默认为 `false`）启用 `! <cmd>` 以运行主机 Shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 允许列表）。
- `commands.bashForegroundMs`（默认为 `2000`）控制 bash 在切换到后台模式之前等待的时间（`0` 立即进入后台）。
- `commands.config`（默认为 `false`）启用 `/config`（读取/写入 `openclaw.json`）。
- `commands.mcp`（默认为 `false`）启用 `/mcp`（读取/写入 OpenClaw 管理的 MCP 配置，位于 `mcp.servers` 下）。
- `commands.plugins`（默认为 `false`）启用 `/plugins`（插件发现/状态以及启用/禁用切换）。
- `commands.debug`（默认为 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.allowFrom` (可选) 为命令授权设置每个提供商的白名单。配置后，它是命令和指令的唯一授权来源（渠道白名单/配对和 `commands.useAccessGroups` 被忽略）。使用 `"*"` 作为全局默认值；特定于提供商的键会覆盖它。
- `commands.useAccessGroups` (默认为 `true`) 在未设置 `commands.allowFrom` 时强制执行命令的白名单/策略。

## 命令列表

文本 + 原生（启用时）：

- `/help`
- `/commands`
- `/skill <name> [input]` (按名称运行技能)
- `/status` (显示当前状态；包括当前模型提供商的使用情况/配额，如果可用)
- `/allowlist` (列出/添加/移除白名单条目)
- `/approve <id> allow-once|allow-always|deny` (解决执行批准提示)
- `/context [list|detail|json]` (解释“上下文”； `detail` 显示每个文件 + 每个 工具 + 每个技能 + 系统提示大小)
- `/btw <question>` (就当前会话询问一个临时的附带问题，而不改变未来的会话上下文；参见 [/tools/btw](/zh/tools/btw))
- `/export-session [path]` (别名： `/export`) (将当前会话导出为包含完整系统提示的 HTML)
- `/whoami` (显示您的发送者 ID；别名： `/id`)
- `/session idle <duration|off>` (管理专注线程绑定的非活动自动取消专注)
- `/session max-age <duration|off>` (管理专注线程绑定的硬性最大时长自动取消专注)
- `/subagents list|kill|log|info|send|steer|spawn` (检查、控制或为当前会话生成子代理运行)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (检查和控制 ACP 运行时会话)
- `/agents` (列出此会话的线程绑定代理)
- `/focus <target>` (Discord：将此线程或新线程绑定到会话/子代理目标)
- `/unfocus` (Discord：移除当前线程绑定)
- `/kill <id|#|all>`（立即中止此次会话中一个或所有正在运行的子代理；无确认消息）
- `/steer <id|#> <message>`（立即引导正在运行的子代理：尽可能在运行中引导，否则中止当前工作并根据引导消息重启）
- `/tell <id|#> <message>`（`/steer` 的别名）
- `/config show|get|set|unset`（将配置持久化到磁盘，仅限所有者；需要 `commands.config: true`）
- `/mcp show|get|set|unset`（管理 OpenClaw MCP 服务器配置，仅限所有者；需要 `commands.mcp: true`）
- `/plugins list|show|get|enable|disable`（检查已发现的插件并切换启用状态，写入操作仅限所有者；需要 `commands.plugins: true`）
- `/debug show|set|unset|reset`（运行时覆盖，仅限所有者；需要 `commands.debug: true`）
- `/usage off|tokens|full|cost`（每次回复的使用情况页脚或本地成本摘要）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio`（控制 TTS；参见 [/tts](/zh/tts))
  - Discord：原生命令为 `/voice`（Discord 占用了 `/tts`）；文本模式 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram`（别名：`/dock_telegram`）（将回复切换到 Telegram）
- `/dock-discord`（别名：`/dock_discord`）（将回复切换到 Discord）
- `/dock-slack`（别名：`/dock_slack`）（将回复切换到 Slack）
- `/activation mention|always`（仅限群组）
- `/send on|off|inherit`（仅限所有者）
- `/reset` 或 `/new [model]`（可选模型提示；其余部分将传递）
- `/think <off|minimal|low|medium|high|xhigh>`（由模型/提供商提供的动态选项；别名：`/thinking`、`/t`）
- `/fast status|on|off`（省略参数将显示当前有效的快速模式状态）
- `/verbose on|full|off`（别名：`/v`）
- `/reasoning on|off|stream` （别名：`/reason`；开启时，发送单独的消息并加上 `Reasoning:` 前缀；`stream` = 仅限 Telegram 草稿）
- `/elevated on|off|ask|full` （别名：`/elev`；`full` 跳过执行批准）
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` （发送 `/exec` 以显示当前设置）
- `/model <name>` （别名：`/models`；或 `/<alias>` 来自 `agents.defaults.models.*.alias`）
- `/queue <mode>` （加上诸如 `debounce:2s cap:25 drop:summarize` 的选项；发送 `/queue` 以查看当前设置）
- `/bash <command>` （仅限主机；`! <command>` 的别名；需要 `commands.bash: true` + `tools.elevated` 允许列表）

仅限文本：

- `/compact [instructions]` （参见 [/concepts/compaction](/zh/concepts/compaction)）
- `! <command>` （仅限主机；一次一个；对于长时间运行的任务，使用 `!poll` + `!stop`）
- `!poll` （检查输出 / 状态；接受可选 `sessionId`；`/bash poll` 也可以使用）
- `!stop` （停止正在运行的 bash 任务；接受可选 `sessionId`；`/bash stop` 也可以使用）

注意：

- 命令在命令和参数之间接受可选的 `:` （例如 `/think: high`，`/send: on`，`/help:`）。
- `/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）；如果未匹配，文本将被视为消息正文。
- 如需完整的提供商使用情况细分，请使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 并遵守渠道 `configWrites`。
- 在多账户频道中，针对配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也会遵循目标账户的 `configWrites`。
- `/usage` 控制每次响应的使用情况页脚；`/usage cost` 会从 OpenClaw 会话日志中打印本地的成本摘要。
- `/restart` 默认启用；设置 `commands.restart: false` 可将其禁用。
- Discord 专属原生命令：`/vc join|leave|status` 控制语音频道（需要 `channels.discord.voice` 和原生命令；不作为文本指令提供）。
- Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 命令参考和运行时行为：[ACP Agents](/zh/tools/acp-agents)。
- `/verbose` 旨在用于调试和增加可见性；正常使用时请保持其**关闭 (off)** 状态。
- `/fast on|off` 会持久化会话覆盖设置。使用会话 UI 的 `inherit` 选项来清除它并回退到配置默认值。
- 当相关时，工具失败摘要仍会显示，但仅在 `/verbose` 为 `on` 或 `full` 时才包含详细的失败文本。
- `/reasoning`（以及 `/verbose`）在群组设置中是有风险的：它们可能会泄露您无意暴露的内部推理或工具输出。建议将它们保持关闭状态，尤其是在群组聊天中。
- **快速通道 (Fast path)：** 来自白名单发送者的纯命令消息会立即处理（绕过队列 + 模型）。
- **群组提及限制 (Group mention gating)：** 来自白名单发送者的纯命令消息可绕过提及要求。
- **内联快捷方式（仅限白名单发送者）：** 某些命令在嵌入普通消息时也有效，并且会在模型看到剩余文本之前被剥离。
  - 示例：`hey /status` 会触发状态回复，其余文本会继续走正常流程。
- 目前包括：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授权的纯命令消息会被静默忽略，行内的 `/...` 标记会被视为纯文本。
- **Skill 命令：** `user-invocable` Skills 会作为斜杠命令暴露。名称会被清洗为 `a-z0-9_`（最多 32 个字符）；冲突的名称会加上数字后缀（例如 `_2`）。
  - `/skill <name> [input]` 按名称运行 Skill（当原生命令限制导致无法为每个 Skill 设置命令时很有用）。
  - 默认情况下，Skill 命令会作为普通请求转发给模型。
  - Skills 可以选择性地声明 `command-dispatch: tool`，以将命令直接路由到工具（确定性的，不涉及模型）。
  - 示例：`/prose`（OpenProse 插件）——参见 [OpenProse](/zh/prose)。
- **原生命令参数：** Discord 对动态选项使用自动补全（当您省略必需参数时，还会显示按钮菜单）。Telegram 和 Slack 在命令支持选项且您省略该参数时，会显示按钮菜单。

## 使用界面（显示位置）

- **提供商使用量/配额**（例如：“Claude 剩余 80%”）会在启用使用量跟踪时，显示在当前模型提供商的 `/status` 中。
- **单次回复的 Token/费用** 由 `/usage off|tokens|full` 控制（附加在正常回复后）。
- `/model status` 关乎**模型/认证/端点**，而非使用量。

## 模型选择（`/model`）

`/model` 被实现为一个指令。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.2
/model opus@anthropic:default
/model status
```

说明：

- `/model` 和 `/model list` 会显示一个紧凑的带编号选择器（模型系列 + 可用提供商）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，包含提供商和模型下拉菜单以及一个提交步骤。
- `/model <#>` 从该选择器中进行选择（并在可能的情况下优先选择当前提供商）。
- `/model status` 显示详细视图，包括配置的提供商端点（`baseUrl`）和 API 模式（`api`）（如果有）。

## 调试覆盖

`/debug` 允许您设置**仅运行时**配置覆盖（内存，而非磁盘）。仅限所有者。默认禁用；通过 `commands.debug: true` 启用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

备注：

- 覆盖会立即应用于新的配置读取，但**不会**写入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆盖并返回磁盘上的配置。

## 配置更新

`/config` 会写入您磁盘上的配置（`openclaw.json`）。仅限所有者。默认禁用；通过 `commands.config: true` 启用。

示例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

备注：

- 配置在写入前会经过验证；无效的更改将被拒绝。
- `/config` 更新在重启后仍然保留。

## MCP 更新

`/mcp` 将 OpenClaw 托管的 MCP 服务器定义写入 `mcp.servers` 下。仅限所有者。默认禁用；通过 `commands.mcp: true` 启用。

示例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

备注：

- `/mcp` 将配置存储在 OpenClaw 配置中，而不是 Pi 拥有的项目设置中。
- 运行时适配器决定哪些传输实际上是可执行的。

## 插件更新

`/plugins` 允许操作员检查发现的插件并在配置中切换启用状态。只读流程可以使用 `/plugin` 作为别名。默认禁用；通过 `commands.plugins: true` 启用。

示例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

备注：

- `/plugins list` 和 `/plugins show` 使用针对当前工作区加上磁盘配置的真实插件发现。
- `/plugins enable|disable` 仅更新插件配置；它不安装或卸载插件。
- 启用/禁用更改后，重启网关以应用它们。

## 表面说明

- **文本命令** 在普通聊天会话中运行（私信共享 `main`，群组有自己的会话）。
- **Native commands** 使用隔离会话：
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (prefix configurable via `channels.slack.slashCommand.sessionPrefix`)
  - Telegram: `telegram:slash:<userId>` (targets the chat 会话 via `CommandTargetSessionKey`)
- **`/stop`** targets the active chat 会话 so it can abort the current run.
- **Slack:** `channels.slack.slashCommand` is still supported for a single `/openclaw`-style command. If you enable `commands.native`, you must create one Slack slash command per built-in command (same names as `/help`). Command argument menus for Slack are delivered as ephemeral Block Kit buttons.
  - Slack native exception: register `/agentstatus` (not `/status`) because Slack reserves `/status`. Text `/status` still works in Slack messages.

## BTW side questions

`/btw` is a quick **side question** about the current 会话.

Unlike normal chat:

- it uses the current 会话 as background context,
- it runs as a separate **工具-less** one-shot call,
- it does not change future 会话 context,
- it is not written to transcript history,
- it is delivered as a live side result instead of a normal assistant message.

That makes `/btw` useful when you want a temporary clarification while the main
task keeps going.

Example:

```text
/btw what are we doing right now?
```

See [BTW Side Questions](/zh/tools/btw) for the full behavior and client UX
details.

import en from "/components/footer/en.mdx";

<en />
