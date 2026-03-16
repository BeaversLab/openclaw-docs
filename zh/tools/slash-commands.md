---
summary: "斜杠命令：文本 vs 原生、配置及支持的命令"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "斜杠命令"
---

# 斜杠命令

命令由 Gateway(网关) 处理。大多数命令必须作为以 `/` 开头的**独立**消息发送。
仅限主机的 bash 聊天命令使用 `! <cmd>`（以 `/bash <cmd>` 作为别名）。

有两个相关的系统：

- **命令**：独立的 `/...` 消息。
- **指令**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 在模型看到消息之前，指令会从消息中剥离。
  - 在普通聊天消息（非仅指令）中，它们被视为“内联提示”并且**不会**持久化会话设置。"
  - 在仅指令消息（消息仅包含指令）中，它们会持久化到会话并回复确认信息。
  - 指令仅应用于**经过授权的发送者**。如果设置了 `commands.allowFrom`，它是唯一使用的
    允许列表；否则，授权来自渠道允许列表/配对加上 `commands.useAccessGroups`。
    未经授权的发送者将看到指令被视为纯文本。

还有几个**行内快捷方式**（仅限列入允许列表/经过授权的发送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它们会立即运行，并在模型看到消息之前被剥离，剩余文本继续通过正常流程。

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

- `commands.text`（默认 `true`）启用解析聊天消息中的 `/...`。
  - 在没有原生命令的界面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams），即使您将此选项设置为 `false`，文本命令仍然有效。
- `commands.native`（默认 `"auto"`）注册原生命令。
  - 自动：对于 Discord/Telegram 开启；对于 Slack 关闭（直到添加斜杠指令）；对于没有原生支持的提供商忽略。
  - 设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以按提供商（提供商标识）覆盖（布尔值或 `"auto"`）。
  - `false` 会在启动时清除 Discord/Telegram 上先前注册的命令。Slack 命令是在 Slack 应用中管理的，不会自动移除。
- `commands.nativeSkills`（默认为 `"auto"`）在受支持时原生注册 **skill** 命令。
  - 自动：对于 Discord/Telegram 开启；对于 Slack 关闭（Slack 需要为每个技能创建一个斜杠指令）。
  - 设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以按提供商覆盖（布尔值或 `"auto"`）。
- `commands.bash`（默认 `false`）允许 `! <cmd>` 运行主机 Shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 允许列表）。
- `commands.bashForegroundMs`（默认 `2000`）控制在切换到后台模式之前 bash 等待的时间（`0` 立即转入后台）。
- `commands.config`（默认 `false`）启用 `/config`（读取/写入 `openclaw.json`）。
- `commands.debug`（默认 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.allowFrom`（可选）为命令授权设置每个提供商的允许列表。配置后，它是
  命令和指令的唯一授权来源（渠道允许列表/配对和 `commands.useAccessGroups`
  会被忽略）。使用 `"*"` 作为全局默认值；特定于提供商的键会覆盖它。
- `commands.useAccessGroups`（默认 `true`）在未设置 `commands.allowFrom` 时对命令强制执行允许列表/策略。

## 命令列表

文本 + 原生（启用时）：

- `/help`
- `/commands`
- `/skill <name> [input]`（按名称运行技能）
- `/status`（显示当前状态；包括当前模型提供商的提供商使用/配额，如果可用）
- `/allowlist`（列出/添加/移除允许列表条目）
- `/approve <id> allow-once|allow-always|deny`（解决执行批准提示）
- `/context [list|detail|json]`（解释“上下文”；`detail` 显示每个文件 + 每个 工具 + 每项技能 + 系统提示词的大小）
- `/btw <question>`（针对当前 会话 提出一个临时的旁支问题，而不改变未来的 会话 上下文；参见 [/tools/btw](/en/tools/btw)）
- `/export-session [path]`（别名：`/export`）（将当前 会话 导出到包含完整系统提示词的 HTML）
- `/whoami`（显示您的发送者 ID；别名：`/id`）
- `/session idle <duration|off>`（管理已聚焦线程绑定的非活动自动取消聚焦）
- `/session max-age <duration|off>`（管理已聚焦线程绑定的硬性最长时效自动取消聚焦）
- `/subagents list|kill|log|info|send|steer|spawn`（检查、控制或为当前 会话 生成子代理运行）
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions`（检查和控制 ACP 运行时 会话）
- `/agents`（列出此 会话 的线程绑定代理）
- `/focus <target>`（Discord：将此线程或新线程绑定到 会话/子代理目标）
- `/unfocus`（Discord：移除当前线程绑定）
- `/kill <id|#|all>`（立即中止此 会话 的一个或所有正在运行的子代理；无确认消息）
- `/steer <id|#> <message>`（立即引导正在运行的子代理：尽可能在运行中引导，否则中止当前工作并根据引导消息重新启动）
- `/tell <id|#> <message>`（`/steer` 的别名）
- `/config show|get|set|unset`（将配置持久化到磁盘，仅所有者；需要 `commands.config: true`）
- `/debug show|set|unset|reset`（运行时覆盖，仅所有者；需要 `commands.debug: true`）
- `/usage off|tokens|full|cost`（每次响应的使用情况页脚或本地成本摘要）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio`（控制 TTS；参见 [/tts](/en/tts)）
  - Discord：原生命令为 `/voice`（Discord 保留了 `/tts`）；文本 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram` (别名: `/dock_telegram`) (将回复切换到 Telegram)
- `/dock-discord` (别名: `/dock_discord`) (将回复切换到 Discord)
- `/dock-slack` (别名: `/dock_slack`) (将回复切换到 Slack)
- `/activation mention|always` (仅限群组)
- `/send on|off|inherit` (仅限所有者)
- `/reset` 或 `/new [model]` (可选模型提示；其余部分将传递)
- `/think <off|minimal|low|medium|high|xhigh>` (由模型/提供商动态选择；别名: `/thinking`, `/t`)
- `/fast status|on|off` (省略该参数可显示当前有效的快速模式状态)
- `/verbose on|full|off` (别名: `/v`)
- `/reasoning on|off|stream` (别名: `/reason`；开启时，发送一条以 `Reasoning:` 为前缀的单独消息；`stream` = 仅 Telegram 草稿)
- `/elevated on|off|ask|full` (别名: `/elev`；`full` 跳过执行审批)
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` (发送 `/exec` 以显示当前值)
- `/model <name>` (别名: `/models`；或者从 `agents.defaults.models.*.alias` 执行 `/<alias>`)
- `/queue <mode>` (加上像 `debounce:2s cap:25 drop:summarize` 这样的选项；发送 `/queue` 以查看当前设置)
- `/bash <command>` (仅限主机；`! <command>` 的别名；需要 `commands.bash: true` + `tools.elevated` 白名单)

纯文本:

- `/compact [instructions]` (参见 [/concepts/compaction](/en/concepts/compaction))
- `! <command>` (仅限主机；一次一个；长时间运行的任务请使用 `!poll` + `!stop`)
- `!poll` (检查输出/状态；接受可选的 `sessionId`；`/bash poll` 也可以使用)
- `!stop`（停止正在运行的 bash 任务；接受可选的 `sessionId`；`/bash stop` 也可以使用）

备注：

- 命令接受在命令和参数之间加入可选的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）；如果没有匹配项，该文本将被视为消息正文。
- 如需完整的提供商使用明细，请使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 并遵守渠道 `configWrites`。
- 在多账户渠道中，针对配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也遵守目标账户的 `configWrites`。
- `/usage` 控制每次响应的使用页脚；`/usage cost` 从 OpenClaw 会话日志中打印本地成本摘要。
- `/restart` 默认已启用；设置 `commands.restart: false` 可将其禁用。
- Discord 专属的原生命令：`/vc join|leave|status` 控制语音频道（需要 `channels.discord.voice` 和原生命令；不以文本形式提供）。
- Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 命令参考和运行时行为：[ACP Agents](/en/tools/acp-agents)。
- `/verbose` 旨在用于调试和额外的可见性；在正常使用中请将其保持**关闭**状态。
- `/fast on|off` 会持久保存会话覆盖设置。使用会话 UI 的 `inherit` 选项可将其清除并回退到配置默认值。
- 当相关时，仍会显示工具失败摘要，但仅当 `/verbose` 为 `on` 或 `full` 时，才会包含详细的失败文本。
- `/reasoning`（以及 `/verbose`）在群组设置中是有风险的：它们可能会暴露您无意公开的内部推理或工具输出。建议将它们关闭，尤其是在群组聊天中。
- **快速路径：** 来自允许列表发送者的纯命令消息会立即处理（绕过队列 + 模型）。
- **群组提及限制：** 来自允许列表发送者的纯命令消息可绕过提及要求。
- **内联快捷方式（仅限允许列表发送者）：** 某些命令在嵌入到普通消息中时也有效，并且会在模型看到剩余文本之前被剥离。
  - 示例：`hey /status` 会触发状态回复，而剩余文本将继续正常流程。
- 目前支持：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未经授权的纯命令消息将被静默忽略，而内联 `/...` 标记将被视为纯文本。
- **Skills 命令：** `user-invocable` skills 被公开为斜杠命令。名称被净化为 `a-z0-9_`（最多 32 个字符）；冲突将获得数字后缀（例如 `_2`）。
  - `/skill <name> [input]` 按名称运行一个 skill（当原生命令限制阻止每个 skill 命令时很有用）。
  - 默认情况下，skills 命令将作为普通请求转发给模型。
  - Skills 可以选择声明 `command-dispatch: tool` 以将命令直接路由到工具（确定性，无模型）。
  - 示例：`/prose`（OpenProse 插件）——参见 [OpenProse](/en/prose)。
- **原生命令参数：** Discord 对动态选项使用自动补全（并在您省略必需参数时显示按钮菜单）。当命令支持选项且您省略参数时，Telegram 和 Slack 会显示按钮菜单。

## 使用场景（哪里显示什么）

- 当启用使用情况跟踪时，**提供商使用量/配额**（例如：“Claude 剩余 80%”）会显示在 `/status` 中，针对当前的模型提供商。
- **每次响应的令牌/成本** 由 `/usage off|tokens|full` 控制（附加到正常回复中）。
- `/model status` 关乎 **模型/认证/端点**，而非使用情况。

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

备注：

- `/model` 和 `/model list` 显示一个紧凑的、带编号的选择器（模型系列 + 可用的提供商）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，包含提供商和模型下拉菜单以及一个提交步骤。
- `/model <#>` 从该选择器中进行选择（并在可能时优先选择当前的提供商）。
- `/model status` 显示详细视图，包括已配置的提供商端点 (`baseUrl`) 和 API 模式 (`api`)（如果可用）。

## 调试覆盖

`/debug` 允许您设置 **仅限运行时** 的配置覆盖（内存中，而非磁盘）。仅限所有者。默认禁用；可通过 `commands.debug: true` 启用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

备注：

- 覆盖会立即应用于新的配置读取，但 **不会** 写入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆盖并返回磁盘上的配置。

## 配置更新

`/config` 会写入您的磁盘配置 (`openclaw.json`)。仅限所有者。默认禁用；可通过 `commands.config: true` 启用。

示例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

备注：

- 配置在写入前会进行验证；无效的更改将被拒绝。
- `/config` 更新在重启后依然有效。

## 界面备注

- **文本命令** 在普通聊天会话中运行（私信共享 `main`，群组拥有自己的会话）。
- **原生命令** 使用隔离的会话：
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置)
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

See [BTW Side Questions](/en/tools/btw) for the full behavior and client UX
details.

import zh from "/components/footer/zh.mdx";

<zh />
