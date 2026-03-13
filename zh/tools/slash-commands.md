---
summary: "斜杠命令：文本与原生、配置以及支持的命令"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "斜杠命令"
---

# 斜杠命令

命令由网关处理。大多数命令必须作为以 `/` 开头的**独立**消息发送。
仅限主机使用的 bash 聊天命令使用 `! <cmd>`（以 `/bash <cmd>` 作为别名）。

有两个相关的系统：

- **命令**：独立的 `/...` 消息。
- **指令**：`/think`、`/fast`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 在模型看到消息之前，会从消息中剥离指令。
  - 在普通聊天消息中（非仅指令），它们被视为“内联提示”，并且**不会**持久化会话设置。
  - 在仅指令消息中（消息仅包含指令），它们会持久化到会话并回复确认。
  - 指令仅适用于**授权发送者**。如果设置了 `commands.allowFrom`，则它是唯一使用的允许列表；否则，授权来自频道允许列表/配对以及 `commands.useAccessGroups`。
    未经授权的发送者看到的指令将被视为纯文本。

还有一些 **行内快捷方式**（仅限列入白名单/已授权的发送者）：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
它们会立即运行，并在模型看到消息之前被剥离，剩余文本会继续正常流程。

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

- `commands.text`（默认 `true`）启用在聊天消息中解析 `/...` 的功能。
  - 在没有原生命令的界面（WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams）上，即使您将此设置为 `false`，文本命令仍然有效。
- `commands.native`（默认 `"auto"`）注册原生命令。
  - Auto：Discord/Telegram 默认开启；Slack 默认关闭（直到您添加斜杠命令）；对于不支持原生功能的提供商则忽略。
  - 设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以针对每个提供商进行覆盖（布尔值或 `"auto"`）。
  - `false` 在启动时清除 Discord/Telegram 上先前注册的命令。Slack 命令在 Slack 应用中管理，不会自动移除。
- `commands.nativeSkills`（默认为 `"auto"`）在受支持时原生注册 **技能** 命令。
  - Auto：Discord/Telegram 默认开启；Slack 默认关闭（Slack 需要为每个技能创建一个斜杠命令）。
  - 设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以针对每个提供商进行覆盖（布尔值或 `"auto"`）。
- `commands.bash`（默认 `false`）启用 `! <cmd>` 以运行主机 shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 允许列表）。
- `commands.bashForegroundMs`（默认 `2000`）控制在切换到后台模式之前 bash 等待的时间（`0` 立即进入后台）。
- `commands.config`（默认 `false`）启用 `/config`（读/写 `openclaw.json`）。
- `commands.debug`（默认 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.allowFrom`（可选）为命令授权设置每个提供者的允许列表。配置后，它是
  命令和指令的唯一授权来源（频道允许列表/配对和 `commands.useAccessGroups`
  被忽略）。使用 `"*"` 作为全局默认值；特定于提供商的键会覆盖它。
- `commands.useAccessGroups`（默认为 `true`）在未设置 `commands.allowFrom` 时对命令强制执行允许列表/策略。

## 命令列表

文本 + 原生（启用时）：

- `/help`
- `/commands`
- `/skill <name> [input]`（按名称运行技能）
- `/status`（显示当前状态；如果可用，包括当前模型提供商的使用情况/配额）
- `/allowlist`（列出/添加/删除允许列表条目）
- `/approve <id> allow-once|allow-always|deny`（解决执行批准提示）
- `/context [list|detail|json]`（解释“上下文”；`detail` 显示每个文件 + 每个工具 + 每个技能 + 系统提示的大小）
- `/export-session [path]` (别名： `/export`) (将当前会话连同完整的系统提示词导出为 HTML)
- `/whoami` (显示您的发送者 ID；别名： `/id`)
- `/session idle <duration|off>` (管理聚焦线程绑定的非活动自动取消聚焦)
- `/session max-age <duration|off>` (管理聚焦线程绑定的硬性最大期限自动取消聚焦)
- `/subagents list|kill|log|info|send|steer|spawn` (检查、控制或为当前会话生成子代理运行)
- `/acp spawn|cancel|steer|close|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|sessions` (检查和控制 ACP 运行时会话)
- `/agents` (列出此会话的线程绑定代理)
- `/focus <target>` (Discord：将此线程或新线程绑定到会话/子代理目标)
- `/unfocus` (Discord：移除当前线程绑定)
- `/kill <id|#|all>` （立即中止本次会话中的一个或所有正在运行的子代理；无确认消息）
- `/steer <id|#> <message>` （立即引导正在运行的子代理：尽可能在运行中引导，否则中止当前工作并根据引导消息重新启动）
- `/tell <id|#> <message>` （`/steer` 的别名）
- `/config show|get|set|unset` （将配置持久化到磁盘，仅限所有者；需要 `commands.config: true`）
- `/debug show|set|unset|reset` （运行时覆盖，仅限所有者；需要 `commands.debug: true`）
- `/usage off|tokens|full|cost` （每次响应的使用情况页脚或本地成本摘要）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio` （控制 TTS；参见 [/tts](/zh/en/tts)）
  - Discord：原生命令是 `/voice`（Discord 保留了 `/tts`）；文本 `/tts` 仍然有效。
- `/stop`
- `/restart`
- `/dock-telegram` （别名：`/dock_telegram`）（将回复切换到 Telegram）
- `/dock-discord` （别名：`/dock_discord`）（将回复切换到 Discord）
- `/dock-slack` （别名：`/dock_slack`）（将回复切换到 Slack）
- `/activation mention|always` （仅限群组）
- `/send on|off|inherit` （仅限所有者）
- `/reset` 或 `/new [model]` （可选模型提示；其余部分将透传）
- `/think <off|minimal|low|medium|high|xhigh>` （由模型/提供商动态选择；别名：`/thinking`、`/t`）
- `/fast status|on|off` （省略参数可显示当前有效的快速模式状态）
- `/verbose on|full|off` （别名：`/v`）
- `/reasoning on|off|stream` （别名：`/reason`；开启时，发送一条前缀为 `Reasoning:` 的单独消息；`stream` = 仅限 Telegram 草稿）
- `/elevated on|off|ask|full` （别名：`/elev`；`full` 跳过执行审批）
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` （发送 `/exec` 以显示当前内容）
- `/model <name>` （别名：`/models`；或来自 `agents.defaults.models.*.alias` 的 `/<alias>`）
- `/queue <mode>` （加上如 `debounce:2s cap:25 drop:summarize` 的选项；发送 `/queue` 查看当前设置）
- `/bash <command>` （仅限主机；`! <command>` 的别名；需要 `commands.bash: true` + `tools.elevated` 允许列表）

纯文本：

- `/compact [instructions]` （参见 [/concepts/compaction](/zh/en/concepts/compaction)）
- `! <command>` （仅限主机；一次一个；对于长时间运行的任务，使用 `!poll` + `!stop`）
- `!poll` （检查输出 / 状态；接受可选的 `sessionId`；`/bash poll` 也可以使用）
- `!stop`（停止正在运行的 bash 作业；接受可选的 `sessionId`；`/bash stop` 也可以使用）

注意：

- 命令接受在命令和参数之间加入可选的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）；如果未匹配，则该文本将被视为消息正文。
- 如需完整的提供商使用细分，请使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 并遵守频道 `configWrites`。
- 在多账户频道中，针对配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也会遵守目标账户的 `configWrites`。
- `/usage` 控制每次响应的使用页脚；`/usage cost` 从 OpenClaw 会话日志打印本地成本摘要。
- `/restart` 默认处于启用状态；设置 `commands.restart: false` 可将其禁用。
- Discord 专用原生命令：`/vc join|leave|status` 控制语音频道（需要 `channels.discord.voice` 和原生命令；不适用于文本）。
- Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
- ACP 命令参考和运行时行为：[ACP 代理](/zh/en/tools/acp-agents)。
- `/verbose` 旨在用于调试和额外的可见性；在正常使用中请将其保持为**关闭 (off)**。
- `/fast on|off` 会持久化会话覆盖设置。使用会话 UI 中的 `inherit` 选项将其清除，并回退到配置默认值。
- 相关的工具失败摘要仍会在适当的时候显示，但只有当 `/verbose` 为 `on` 或 `full` 时，才会包含详细的失败文本。
- `/reasoning`（和 `/verbose`）在群组设置中有风险：它们可能会暴露您无意公开的内部推理或工具输出。建议将其保持关闭，尤其是在群组聊天中。
- **快速路径：** 来自白名单发送方的纯命令消息会被立即处理（绕过队列 + 模型）。
- **群组提及限制：** 来自白名单发送方的纯命令消息可绕过提及要求。
- **内联快捷方式（仅限白名单发送方）：** 某些命令在嵌入到普通消息中时也有效，并且会在模型看到剩余文本之前被剥离。
  - 示例：`hey /status` 会触发状态回复，而剩余文本会继续通过正常流程处理。
- 目前包括：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授权的纯命令消息将被静默忽略，而内联的 `/...` 标记将被视为纯文本。
- **技能命令：** `user-invocable` 技能作为斜杠命令公开。名称会被净化为 `a-z0-9_`（最多 32 个字符）；冲突会加上数字后缀（例如 `_2`）。
  - `/skill <name> [input]` 按名称运行技能（当原生命令限制阻止针对每个技能的命令时很有用）。
  - 默认情况下，技能命令作为普通请求转发给模型。
  - 技能可以选择性地声明 `command-dispatch: tool` 以将命令直接路由到工具（确定性的，不涉及模型）。
  - 示例：`/prose` （OpenProse 插件）— 请参阅 [OpenProse](/zh/en/prose)。
- **原生命令参数：** Discord 使用自动补全功能来处理动态选项（当您省略必需参数时还会显示按钮菜单）。当命令支持选项且您省略了参数时，Telegram 和 Slack 会显示按钮菜单。

## 使用场景（显示位置）

- **提供商使用量/配额**（例如：“Claude 剩余 80%”）在启用使用量跟踪时，会显示在 `/status` 中，针对当前模型提供商。
- **每次响应的 token/成本** 由 `/usage off|tokens|full` 控制（附加到正常回复中）。
- `/model status` 关乎 **模型/身份/端点**，而非使用量。

## 模型选择 (`/model`)

`/model` 被实现为一条指令。

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
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，包含提供商和模型下拉菜单以及一个提交步骤。
- `/model <#>` 从该选择器中进行选择（并在可能的情况下优先选择当前提供商）。
- `/model status` 显示详细视图，包括已配置的提供商端点 (`baseUrl`) 和 API 模式 (`api`)（如果可用）。

## 调试覆盖

`/debug` 允许您设置 **仅运行时** 的配置覆盖（内存中，非磁盘）。仅限所有者。默认禁用；通过 `commands.debug: true` 启用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

备注：

- 覆盖设置会立即应用于新的配置读取，但 **不会** 写入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆盖设置并返回磁盘上的配置。

## 配置更新

`/config` 会写入您的磁盘配置 (`openclaw.json`)。仅限所有者使用。默认禁用；可通过 `commands.config: true` 启用。

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
- `/config` 的更新在重启后依然有效。

## 界面说明

- **文本命令** 在正常的聊天会话中运行（DM 共享 `main`，群组有自己的会话）。
- **原生命令** 使用隔离的会话：
  - Discord: `agent:<agentId>:discord:slash:<userId>`
  - Slack: `agent:<agentId>:slack:slash:<userId>` (前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置)
  - Telegram: `telegram:slash:<userId>` (通过 `CommandTargetSessionKey` 定位聊天会话)
- **`/stop`** 定位到活动的聊天会话，因此它可以中止当前的运行。
- **Slack:** `channels.slack.slashCommand` 仍然支持单一的 `/openclaw` 风格命令。如果启用 `commands.native`，您必须为每个内置命令创建一个 Slack 斜杠命令（名称与 `/help` 相同）。Slack 的命令参数菜单以临时 Block Kit 按钮的形式提供。
  - Slack 原生例外：注册 `/agentstatus` (而不是 `/status`)，因为 Slack 保留了 `/status`。文本 `/status` 在 Slack 消息中仍然有效。

import zh from '/components/footer/zh.mdx';

<zh />
