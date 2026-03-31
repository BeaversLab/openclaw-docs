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
- `commands.allowFrom`（可选）为命令授权设置按提供商的允许列表。配置后，它是
  命令和指令的唯一授权来源（渠道允许列表/配对和 `commands.useAccessGroups`
  被忽略）。使用 `"*"` 作为全局默认值；特定于提供商的键会覆盖它。
- `commands.useAccessGroups`（默认为 `true`）在未设置 `commands.allowFrom` 时对命令执行允许列表/策略。

## 命令列表

文本 + 原生（启用时）：

- `/help`
- `/commands`
- `/tools [compact|verbose]`（显示当前代理现在可以使用的内容；`verbose` 添加描述）
- `/skill <name> [input]`（按名称运行技能）
- `/status`（显示当前状态；包括当前模型提供商的提供商使用/配额（如可用））
- `/allowlist`（列出/添加/移除允许列表条目）
- `/approve <id> allow-once|allow-always|deny`（解决执行批准提示）
- `/context [list|detail|json]`（解释“上下文”；`detail` 显示每个文件 + 每个工具 + 每个技能 + 系统提示词大小）
- `/btw <question>`（询问关于当前会话的临时附带问题，而不改变未来的会话上下文；参见 [/tools/btw](/en/tools/btw)）
- `/export-session [path]`（别名：`/export`）（将当前会话导出为包含完整系统提示词的 HTML）
- `/whoami`（显示您的发送者 ID；别名：`/id`）
- `/session idle <duration|off>`（管理聚焦线程绑定的非活动自动取消聚焦）
- `/session max-age <duration|off>`（管理聚焦线程绑定的硬性最大时间自动取消聚焦）
- `/subagents list|kill|log|info|send|steer|spawn`（检查、控制或为当前会话生成子代理运行）
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions`（检查和控制 ACP 运行时会话）
- `/agents`（列出此会话的线程绑定代理）
- `/focus <target>`（Discord：将此线程或新线程绑定到会话/子代理目标）
- `/unfocus`（Discord：移除当前线程绑定）
- `/kill <id|#|all>`（立即中止此会话的一个或所有正在运行的子代理；无确认消息）
- `/steer <id|#> <message>`（立即引导正在运行的子代理：尽可能在运行中，否则中止当前工作并在引导消息上重新开始）
- `/tell <id|#> <message>`（`/steer` 的别名）
- `/config show|get|set|unset` （将配置持久化到磁盘，仅所有者；需要 `commands.config: true`）
- `/mcp show|get|set|unset` （管理 OpenClaw MCP 服务器配置，仅所有者；需要 `commands.mcp: true`）
- `/plugins list|show|get|install|enable|disable` （检查已发现的插件，安装新插件以及切换启用状态；写入操作仅限所有者；需要 `commands.plugins: true`）
  - `/plugin` 是 `/plugins` 的别名。
  - `/plugin install <spec>` 接受与 `openclaw plugins install` 相同的插件规范：本地路径/归档、npm 包，或 `clawhub:<pkg>`。
  - 启用/禁用写入操作仍会回复重启提示。在受监控的前台网关上，OpenClaw 可能在写入后立即自动执行重启。
- `/debug show|set|unset|reset` （运行时覆盖，仅所有者；需要 `commands.debug: true`）
- `/usage off|tokens|full|cost` （每次响应的使用情况页脚或本地成本摘要）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` （控制 TTS；请参阅 [/tts](/en/tools/tts)）
  - Discord：原生命令是 `/voice` （Discord 保留了 `/tts`）；文本 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram` （别名：`/dock_telegram`）（将回复切换到 Telegram）
- `/dock-discord` （别名：`/dock_discord`）（将回复切换到 Discord）
- `/dock-slack` （别名：`/dock_slack`）（将回复切换到 Slack）
- `/activation mention|always` （仅限群组）
- `/send on|off|inherit` （仅限所有者）
- `/reset` 或 `/new [model]` （可选模型提示；其余部分将透传）
- `/think <off|minimal|low|medium|high|xhigh>` （由模型/提供商提供的动态选择；别名：`/thinking`，`/t`）
- `/fast status|on|off` （省略参数会显示当前有效的快速模式状态）
- `/verbose on|full|off` （别名：`/v`）
- `/reasoning on|off|stream` (别名: `/reason`; 开启时，发送一条带有 `Reasoning:` 前缀的单独消息; `stream` = 仅限 Telegram 草稿)
- `/elevated on|off|ask|full` (别名: `/elev`; `full` 跳过执行批准)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (发送 `/exec` 以显示当前设置)
- `/model <name>` (别名: `/models`; 或从 `agents.defaults.models.*.alias` 中使用 `/<alias>`)
- `/queue <mode>` (加上选项如 `debounce:2s cap:25 drop:summarize`; 发送 `/queue` 查看当前设置)
- `/bash <command>` (仅限主机; `! <command>` 的别名; 需要 `commands.bash: true` + `tools.elevated` 允许列表)

仅限文本:

- `/compact [instructions]` (参见 [/concepts/compaction](/en/concepts/compaction))
- `! <command>` (仅限主机; 一次一个; 长时间运行的任务使用 `!poll` + `!stop`)
- `!poll` (检查输出 / 状态; 接受可选的 `sessionId`; `/bash poll` 也可以使用)
- `!stop` (停止正在运行的 bash 任务; 接受可选的 `sessionId`; `/bash stop` 也可以使用)

注意:

- 命令在命令和参数之间接受可选的 `:` (例如 `/think: high`, `/send: on`, `/help:`)。
- `/new <model>` 接受模型别名、`provider/model` 或提供商名称 (模糊匹配); 如果没有匹配，该文本将被视为消息正文。
- 如需完整的提供商使用细分，请使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 并遵守渠道 `configWrites`。
- 在多账号频道中，针对配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也会遵循目标账号的 `configWrites`。
- `/usage` 控制每次回复的使用情况页脚；`/usage cost` 会从 OpenClaw 会话日志中打印本地成本摘要。
- `/restart` 默认启用；设置 `commands.restart: false` 可将其禁用。
- Discord 专属的原生命令：`/vc join|leave|status` 控制语音频道（需要 `channels.discord.voice` 和原生命令；不可作为文本使用）。
- Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 命令参考和运行时行为：[ACP Agents](/en/tools/acp-agents)。
- `/verbose` 旨在用于调试和增加可见性；在正常使用中请保持 **关闭**。
- `/fast on|off` 会持久化会话覆盖设置。使用会话 UI 中的 `inherit` 选项将其清除，并回退到配置默认值。
- 相关时仍会显示工具失败摘要，但仅当 `/verbose` 为 `on` 或 `full` 时，才会包含详细的失败文本。
- `/reasoning`（以及 `/verbose`）在群组设置中具有风险：它们可能会泄露您无意暴露的内部推理或工具输出。建议保持关闭，尤其是在群聊中。
- **快速路径：** 来自白名单发送者的纯命令消息会被立即处理（绕过队列 + 模型）。
- **群组提及限制：** 来自白名单发送者的纯命令消息可绕过提及要求。
- **内联快捷方式（仅限白名单发送者）：** 某些命令在嵌入到普通消息中时也有效，并且会在模型看到剩余文本之前被剔除。
  - 示例：`hey /status` 会触发状态回复，而剩余的文本会继续通过正常流程处理。
- 目前包括：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未经授权的纯命令消息将被静默忽略，内联 `/...` 令牌将被视为纯文本。
- **Skills 命令：** `user-invocable` Skills 被暴露为斜杠命令。名称会被清洗为 `a-z0-9_`（最多 32 个字符）；冲突会加上数字后缀（例如 `_2`）。
  - `/skill <name> [input]` 按名称运行一个 Skill（当原生命令限制阻止每个 Skill 对应命令时很有用）。
  - 默认情况下，Skills 命令作为正常请求转发给模型。
  - Skills 可以选择性地声明 `command-dispatch: tool` 以将命令直接路由到工具（确定性，不经过模型）。
  - 示例：`/prose`（OpenProse 插件）——参见 [OpenProse](/en/prose)。
- **原生命令参数：** Discord 使用自动完成功能来提供动态选项（当您省略必需参数时还会显示按钮菜单）。当命令支持选项并且您省略了参数时，Telegram 和 Slack 会显示按钮菜单。

## `/tools`

`/tools` 回答的是运行时问题，而不是配置问题：**此 Agent 在此会话中此刻可以使用什么**。

- 默认的 `/tools` 是紧凑的，并针对快速浏览进行了优化。
- `/tools verbose` 会添加简短描述。
- 支持参数的原生命令界面会像 `compact|verbose` 一样公开相同的模式切换。
- 结果是会话作用域的，因此更改 Agent、渠道、线程、发送者授权或模型可能会改变输出。
- `/tools` 包括在运行时实际可访问的工具，包括核心工具、已连接的插件工具和渠道拥有的工具。

对于配置文件和覆盖编辑，请使用控制 UI 工具面板或配置/目录界面，而不是将 `/tools` 视为静态目录。

## 使用界面（在哪里显示什么）

- **提供商使用量/配额**（例如：“Claude 剩余 80%”）会在启用使用量跟踪时显示在 `/status` 中，针对当前模型提供商。
- **每次响应的令牌/成本**由 `/usage off|tokens|full` 控制（附加到正常回复中）。
- `/model status` 关乎**模型/认证/端点**，而非使用量。

## 模型选择 (`/model`)

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

- `/model` 和 `/model list` 会显示一个紧凑的、带编号的选择器（模型系列 + 可用提供商）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，其中包含提供商和模型下拉菜单以及一个提交步骤。
- `/model <#>` 会从该选择器中进行选择（并在可能的情况下首选当前提供商）。
- `/model status` 会显示详细视图，包括已配置的提供商端点 (`baseUrl`) 和 API 模式 (`api`)（如果可用）。

## 调试覆盖

`/debug` 允许您设置**仅运行时**的配置覆盖（内存中，而非磁盘）。仅限所有者。默认禁用；通过 `commands.debug: true` 启用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

说明：

- 覆盖会立即应用于新的配置读取，但**不会**写入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆盖并返回磁盘上的配置。

## 配置更新

`/config` 会写入您的磁盘配置 (`openclaw.json`)。仅限所有者。默认禁用；通过 `commands.config: true` 启用。

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
- `/config` 更新在重启后依然有效。

## MCP 更新

`/mcp` 会将 OpenClaw 托管的 MCP 服务器定义写入 `mcp.servers` 下。仅限所有者。默认禁用；通过 `commands.mcp: true` 启用。

示例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

说明：

- `/mcp` 将配置存储在 OpenClaw 配置中，而非 Pi 拥有的项目设置中。
- 运行时适配器决定哪些传输方式实际上是可执行的。

## 插件更新

`/plugins` 允许操作员检查已发现的插件并在配置中切换启用状态。只读流程可以使用 `/plugin` 作为别名。默认禁用；通过 `commands.plugins: true` 启用。

示例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

注意事项：

- `/plugins list` 和 `/plugins show` 针对当前工作区以及磁盘配置使用真实的插件发现机制。
- `/plugins enable|disable` 仅更新插件配置；它不安装或卸载插件。
- 在启用/禁用更改后，重启网关以应用它们。

## 界面说明

- **文本命令** 在普通聊天会话中运行（私信共享 `main`，群组有自己的会话）。
- **原生命令** 使用隔离的会话：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
  - Telegram：`telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 定位聊天会话）
- **`/stop`** 以当前活动的聊天会话为目标，以便它可以中止当前的运行。
- **Slack：** 仍然支持对单个 `/openclaw` 样式的命令使用 `channels.slack.slashCommand`。如果启用 `commands.native`，则必须为每个内置命令创建一个 Slack 斜杠命令（名称与 `/help` 相同）。Slack 的命令参数菜单以临时 Block Kit 按钮的形式提供。
  - Slack 原生例外：注册 `/agentstatus`（而非 `/status`），因为 Slack 保留了 `/status`。文本 `/status` 在 Slack 消息中仍然有效。

## 顺便说一句（BTW）附加问题

`/btw` 是关于当前会话的一个快速**附加问题**。

与普通聊天不同：

- 它使用当前会话作为背景上下文，
- 它作为一次单独的**无工具**一次性调用运行，
- 它不会更改未来的会话上下文，
- 它不会写入转录记录历史，
- 它作为实时侧边结果提供，而不是普通的助手消息。

这使得 `/btw` 在你需要进行临时澄清，同时主任务继续进行时非常有用。

示例：

```text
/btw what are we doing right now?
```

有关完整的行为和客户端 UX 详细信息，请参阅 [BTW Side Questions](/en/tools/btw)。
