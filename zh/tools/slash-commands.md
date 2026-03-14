---
summary: "斜杠命令：文本与原生、配置及支持的命令"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "斜杠命令"
---

# 斜杠命令

命令由 Gateway 网关 处理。大多数命令必须作为以 `/` 开头的**独立**消息发送。
仅限主机使用的 bash 聊天命令使用 `! <cmd>`（别名 `/bash <cmd>`）。

有两个相关的系统：

- **命令**：独立的 `/...` 消息。
- **指令**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 指令会在模型看到消息之前从消息中剥离。
  - 在普通聊天消息中（非仅指令），它们被视为“内联提示”，**不会**持久化会话设置。
  - 在仅指令消息中（消息仅包含指令），它们会持久化到会话并回复确认。
  - 指令仅对**授权发送者**生效。如果设置了 `commands.allowFrom`，则将其作为唯一的
    允许列表；否则授权来自频道允许列表/配对加上 `commands.useAccessGroups`。
    未授权的发送者看到的指令将被视为纯文本。

此外还有一些**内联快捷方式**（仅限允许列表/授权发送者使用）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它们会立即运行，在模型看到消息之前被剥离，剩余文本将继续通过正常流程。

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

- `commands.text`（默认为 `true`）启用在聊天消息中解析 `/...` 的功能。
  - 在没有原生命令的表面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams），即使您将其设置为 `false`，文本命令仍然有效。
- `commands.native`（默认 `"auto"`）注册原生命令。
  - 自动：在 Discord/Telegram 上开启；在 Slack 上关闭（直到您添加斜杠命令）；对于不支持原生的提供商将被忽略。
  - 设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以覆盖每个提供商的设置（布尔值或 `"auto"`）。
  - `false` 会在启动时清除 Discord/Telegram 上先前注册的命令。Slack 命令在 Slack 应用中管理，不会自动删除。
- `commands.nativeSkills`（默认 `"auto"`）在受支持时原生注册 **skill** 命令。
  - 自动：在 Discord/Telegram 上开启；在 Slack 上关闭（Slack 需要为每个 skill 创建一个斜杠命令）。
  - 设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以覆盖每个提供商的设置（布尔值或 `"auto"`）。
- `commands.bash`（默认 `false`）启用 `! <cmd>` 以运行主机 shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 白名单）。
- `commands.bashForegroundMs`（默认 `2000`）控制 bash 在切换到后台模式之前等待的时间（`0` 立即进入后台）。
- `commands.config`（默认 `false`）启用 `/config`（读取/写入 `openclaw.json`）。
- `commands.debug`（默认 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.allowFrom` (可选) 为命令授权设置每个提供商的允许列表。配置后，它是
  命令和指令的唯一授权源（频道允许列表/配对以及 `commands.useAccessGroups`
  会被忽略）。使用 `"*"` 作为全局默认值；特定于提供商的键会覆盖它。
- `commands.useAccessGroups` (默认 `true`) 在未设置 `commands.allowFrom` 时对命令强制执行允许列表/策略。

## 命令列表

文本 + 原生（启用时）：

- `/help`
- `/commands`
- `/skill <name> [input]` (按名称运行技能)
- `/status` (显示当前状态；包括当前模型提供商的使用量/配额（如果可用）)
- `/allowlist` (列出/添加/移除允许列表条目)
- `/approve <id> allow-once|allow-always|deny` (解决执行批准提示)
- `/context [list|detail|json]` (解释“上下文”；`detail` 显示每个文件 + 每个工具 + 每个技能 + 系统提示的大小)
- `/export-session [path]` (别名：`/export`) (将当前会话连同完整系统提示一起导出为 HTML)
- `/whoami` (显示您的发送者 ID；别名：`/id`)
- `/session idle <duration|off>` (管理焦点线程绑定的非活动自动取消焦点)
- `/session max-age <duration|off>` (管理焦点线程绑定的硬性最长生存时间自动取消焦点)
- `/subagents list|kill|log|info|send|steer|spawn` (检查、控制或为当前会话生成子代理运行)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (检查和控制 ACP 运行时会话)
- `/agents` (列出此会话的线程绑定代理)
- `/focus <target>` (Discord：将此线程或新线程绑定到会话/子代理目标)
- `/unfocus` (Discord：移除当前线程绑定)
- `/kill <id|#|all>` (立即中止本次会话中一个或所有正在运行的子代理；无确认消息)
- `/steer <id|#> <message>` (立即引导正在运行的子代理：尽可能在运行中引导，否则中止当前工作并根据引导消息重新开始)
- `/tell <id|#> <message>` (`/steer` 的别名)
- `/config show|get|set|unset` (将配置持久化到磁盘，仅所有者；需要 `commands.config: true`)
- `/debug show|set|unset|reset` (运行时覆盖，仅所有者；需要 `commands.debug: true`)
- `/usage off|tokens|full|cost` (每次回复的使用页脚或本地成本摘要)
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` (控制 TTS；参见 [/tts](/zh/en/tts))
  - Discord：原生命令是 `/voice` (Discord 保留 `/tts`)；文本 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram` (别名：`/dock_telegram`) (切换回复到 Telegram)
- `/dock-discord` (别名：`/dock_discord`) (切换回复到 Discord)
- `/dock-slack` (别名：`/dock_slack`) (切换回复到 Slack)
- `/activation mention|always` (仅限群组)
- `/send on|off|inherit` (仅限所有者)
- `/reset` 或 `/new [model]` (可选模型提示；其余部分将透传)
- `/think <off|minimal|low|medium|high|xhigh>` (按模型/提供商提供动态选项；别名：`/thinking`、`/t`)
- `/fast status|on|off` (省略参数将显示当前有效的快速模式状态)
- `/verbose on|full|off` (别名：`/v`)
- `/reasoning on|off|stream` (别名：`/reason`；开启时，发送一条以 `Reasoning:` 为前缀的单独消息；`stream` = 仅限 Telegram 草稿)
- `/elevated on|off|ask|full` （别名：`/elev`；`full` 跳过执行审批）
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` （发送 `/exec` 以显示当前状态）
- `/model <name>` （别名：`/models`；或从 `agents.defaults.models.*.alias` 使用 `/<alias>`）
- `/queue <mode>` （加上诸如 `debounce:2s cap:25 drop:summarize` 之类的选项；发送 `/queue` 查看当前设置）
- `/bash <command>` （仅限主机；`! <command>` 的别名；需要 `commands.bash: true` + `tools.elevated` 允许列表）

纯文本：

- `/compact [instructions]` （参见 [/concepts/compaction](/zh/en/concepts/compaction)）
- `! <command>` （仅限主机；一次一个；对于长时间运行的任务，请使用 `!poll` + `!stop`）
- `!poll` （检查输出/状态；接受可选的 `sessionId`；`/bash poll` 也可以使用）
- `!stop` （停止正在运行的 bash 任务；接受可选的 `sessionId`；`/bash stop` 也可以使用）

注意：

- 命令接受命令和参数之间的可选 `:` （例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型别名、`provider/model` 或提供者名称（模糊匹配）；如果没有匹配项，该文本将被视为消息正文。
- 有关完整的提供者使用细分，请使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 并遵守频道 `configWrites`。
- 在多账户频道中，针对配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也遵守目标账户的 `configWrites`。
- `/usage` 控制每次回复的使用情况页脚；`/usage cost` 从 OpenClaw 会话日志中打印本地成本摘要。
- `/restart` 默认启用；设置 `commands.restart: false` 以禁用它。
- 仅限 Discord 的原生命令：`/vc join|leave|status` 控制语音频道（需要 `channels.discord.voice` 和原生命令；不作为文本提供）。
- Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 命令参考和运行时行为：[ACP 代理](/zh/en/tools/acp-agents)。
- `/verbose` 旨在用于调试和额外的可见性；在正常使用中请保持其 **关闭** 状态。
- `/fast on|off` 持久化会话覆盖。使用会话 UI 的 `inherit` 选项来清除它并回退到配置默认值。
- 工具故障摘要仍然在相关时显示，但只有在 `/verbose` 为 `on` 或 `full` 时才会包含详细的故障文本。
- `/reasoning`（以及 `/verbose`）在群组设置中有风险：它们可能会暴露您不打算公开的内部推理或工具输出。建议保持关闭，尤其是在群聊中。
- **快速路径：** 来自白名单发送方的纯命令消息会被立即处理（绕过队列 + 模型）。
- **群组提及限制：** 来自白名单发送方的纯命令消息可绕过提及要求。
- **内联快捷方式（仅限白名单发送方）：** 某些命令在嵌入到普通消息中时也有效，并且会在模型看到剩余文本之前被剥离。
  - 示例：`hey /status` 触发状态回复，剩余文本继续正常流程。
- 当前包括：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授权的纯命令消息将被静默忽略，内联 `/...` 标记将被视为纯文本。
- **技能命令：** `user-invocable` 技能作为斜杠命令公开。名称被清理为 `a-z0-9_`（最多 32 个字符）；冲突将获得数字后缀（例如 `_2`）。
  - `/skill <name> [input]` 按名称运行技能（当原生命令限制阻止每个技能的命令时很有用）。
  - 默认情况下，技能命令作为普通请求转发给模型。
  - 技能可以选择性地声明 `command-dispatch: tool` 以将命令直接路由到工具（确定性的，无模型）。
  - 示例：`/prose`（OpenProse 插件）——参见 [OpenProse](/zh/en/prose)。
- **原生命令参数：** Discord 使用自动补全功能来处理动态选项（当您省略必需参数时还会显示按钮菜单）。当命令支持选项且您省略了参数时，Telegram 和 Slack 会显示按钮菜单。

## 使用场景（显示位置）

- **提供商使用/配额**（例如：“Claude 剩余 80%”）在启用使用跟踪时，显示在当前模型提供商的 `/status` 中。
- **每次响应的令牌/成本** 由 `/usage off|tokens|full` 控制（附加到正常回复）。
- `/model status` 关乎 **模型/身份验证/端点**，而非使用情况。

## 模型选择 (`/model`)

`/model` 作为指令实现。

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

- `/model` 和 `/model list` 显示一个紧凑的、带编号的选择器（模型系列 + 可用提供商）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，包含提供商和模型下拉菜单以及提交步骤。
- `/model <#>` 从该选择器中进行选择（并在可能时优先使用当前提供商）。
- `/model status` 显示详细视图，包括配置的提供商端点 (`baseUrl`) 和 API 模式 (`api`)（如果可用）。

## 调试覆盖

`/debug` 允许您设置 **仅运行时** 的配置覆盖（内存，而非磁盘）。仅限所有者。默认禁用；通过 `commands.debug: true` 启用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

备注：

- 覆盖立即应用于新的配置读取，但**不**会写入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆盖并返回到磁盘上的配置。

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

注意：

- 配置在写入前会进行验证；无效的更改将被拒绝。
- `/config` 的更新在重启后依然保留。

## 界面说明

- **文本命令** 在普通聊天会话中运行（私信共享 `main`，群组有自己的会话）。
- **原生命令** 使用隔离的会话：
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
  - Telegram: `telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 定位聊天会话）
- **`/stop`** 定位活动聊天会话，以便它可以中止当前运行。
- **Slack:** `channels.slack.slashCommand` 仍然支持用于单个 `/openclaw` 样式的命令。如果您启用 `commands.native`，则必须为每个内置命令创建一个 Slack 斜杠命令（名称与 `/help` 相同）。Slack 的命令参数菜单以临时 Block Kit 按钮形式提供。
  - Slack 原生例外：注册 `/agentstatus`（而非 `/status`），因为 Slack 保留了 `/status`。Slack 消息中的文本 `/status` 仍然有效。

import zh from '/components/footer/zh.mdx';

<zh />
