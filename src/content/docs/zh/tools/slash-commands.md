---
summary: "斜杠命令：文本与原生、配置及支持的命令"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
title: "斜杠命令"
sidebarTitle: "斜杠命令"
---

命令由 Gateway(网关) 处理。大多数命令必须作为以 `/` 开头的**独立**消息发送。仅限主机使用的 bash 聊天命令使用 `! <cmd>`（以 `/bash <cmd>` 作为别名）。

当对话或线程绑定到 ACP 会话时，正常的后续文本将路由到该 ACP 接线器。Gateway(网关) 管理命令仍保持本地处理：`/acp ...` 始终到达 OpenClaw ACP 命令处理程序，而只要为该界面启用了命令处理，`/status` 和 `/unfocus` 就会保持本地处理。

有两个相关的系统：

<AccordionGroup>
  <Accordion title="Commands">
    独立的 `/...` 消息。
  </Accordion>
  <Accordion title="Directives">
    `/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。

    - 指令在模型看到消息之前会从消息中剥离。
    - 在正常聊天消息中（非仅指令消息），它们被视为“内联提示”，并且**不会**持久化会话设置。
    - 在仅指令消息中（消息仅包含指令），它们将持久化到会话并回复确认信息。
    - 指令仅应用于**经过授权的发件人**。如果设置了 `commands.allowFrom`，则它是唯一使用的允许列表；否则授权来自渠道允许列表/配对加上 `commands.useAccessGroups`。未经授权的发件人看到的指令将被视为纯文本。

  </Accordion>
  <Accordion title="Inline shortcuts">
    仅允许列入白名单/已授权的发送者：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。

    它们会立即运行，并在模型看到消息之前被剥离，剩余文本将继续正常流转。

  </Accordion>
</AccordionGroup>

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

<ParamField path="commands.text" type="boolean" default="true">
  启用聊天消息中的 `/...` 解析。在不支持原生指令的界面（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams）上，即使您将其设置为 `false`，文本指令仍然有效。
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  注册原生指令。自动模式：Discord/Telegram 为开启；Slack 为关闭（直到您添加斜杠指令）；对于不支持原生的提供商则忽略。设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以按提供商覆盖（布尔值或 `"auto"`）。`false` 会在启动时清除 Discord/Telegram 上先前注册的指令。Slack 指令在 Slack 应用中管理，不会自动删除。
</ParamField>
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  在支持时原生注册 **skill** 指令。自动模式：Discord/Telegram 为开启；Slack 为关闭（Slack 需要为每个 skill 创建斜杠指令）。设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以按提供商覆盖（布尔值或 `"auto"`）。
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  启用 `! <cmd>` 以运行主机 Shell 指令（`/bash <cmd>` 是别名；需要 `tools.elevated` 允许列表）。
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  控制 bash 在切换到后台模式之前等待的时间（`0` 立即后台运行）。
</ParamField>
<ParamField path="commands.config" type="boolean" default="false">
  启用 `/config`（读取/写入 `openclaw.json`）。
</ParamField>
<ParamField path="commands.mcp" type="boolean" default="false">
  启用 `/mcp`（读取/写入 OpenClaw 管理的 MCP 配置，位于 `mcp.servers` 下）。
</ParamField>
<ParamField path="commands.plugins" type="boolean" default="false">
  启用 `/plugins`（插件发现/状态以及安装 + 启用/禁用控制）。
</ParamField>
<ParamField path="commands.debug" type="boolean" default="false">
  启用 `/debug`（仅运行时覆盖）。
</ParamField>
<ParamField path="commands.restart" type="boolean" default="true">
  启用 `/restart` 以及网关重启工具操作。
</ParamField>
<ParamField path="commands.ownerAllowFrom" type="string[]">
  为仅限所有者的指令/工具界面设置显式所有者允许列表。与 `commands.allowFrom` 分开。
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  每个渠道：使仅限所有者的指令需要 **owner identity** 才能在该界面运行。当 `true` 时，发送者必须匹配已解析的所有者候选（例如 `commands.ownerAllowFrom` 中的条目或提供商原生的所有者元数据）或在内部消息渠道上持有内部 `operator.admin` 范围。渠道 `allowFrom` 中的通配符条目或空的/未解析的所有者候选列表是**不**充分的——仅限所有者的指令在该渠道上失败关闭。如果您希望仅限所有者的指令仅由 `ownerAllowFrom` 和标准指令允许列表控制，请保持关闭。
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制所有者 ID 在系统提示词中的显示方式。
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  可选设置 `commands.ownerDisplay="hash"` 时使用的 HMAC 密钥。
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  指提供商的指令授权允许列表。配置后，它是指令和指令的唯一授权源（渠道允许列表/配对和 `commands.useAccessGroups` 将被忽略）。使用 `"*"` 作为全局默认值；提供商特定的键会覆盖它。
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  当未设置 `commands.allowFrom` 时，强制执行指令的允许列表/策略。
</ParamField>

## 命令列表

当前权威来源：

- 核心内置命令来自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 dock 命令来自 `src/auto-reply/commands-registry.data.ts`
- 插件命令来自插件 `registerCommand()` 调用
- 网关上的实际可用性仍取决于配置标志、渠道表面以及已安装/启用的插件

### 核心内置命令

<AccordionGroup>
  <Accordion title="会话和运行">
    - `/new [model]` 启动一个新会话；`/reset` 是重置别名。
    - `/reset soft [message]` 保留当前记录，丢弃重用的 CLI 后端会话 ID，并在原地重新运行启动/系统提示加载。
    - `/compact [instructions]` 压缩会话上下文。请参阅[压缩](/zh/concepts/compaction)。
    - `/stop` 中止当前运行。
    - `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理线程绑定到期。
    - `/export-session [path]` 将当前会话导出为 HTML。别名：`/export`。
    - `/export-trajectory [path]` 为当前会话导出 JSONL [轨迹包](/zh/tools/trajectory)。别名：`/trajectory`。
  </Accordion>
  <Accordion title="Model and run controls">
    - `/think <level>` 设置思考级别。选项来自当前模型的提供商配置文件；常见的级别有 `off`、`minimal`、`low`、`medium` 和 `high`，而在支持的地方也可以使用自定义级别，如 `xhigh`、`adaptive`、`max` 或二进制的 `on`。别名：`/thinking`、`/t`。
    - `/verbose on|off|full` 切换详细输出。别名：`/v`。
    - `/trace on|off` 切换当前会话的插件跟踪输出。
    - `/fast [status|on|off]` 显示或设置快速模式。
    - `/reasoning [on|off|stream]` 切换推理可见性。别名：`/reason`。
    - `/elevated [on|off|ask|full]` 切换提升模式。别名：`/elev`。
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 显示或设置 exec 默认值。
    - `/model [name|#|status]` 显示或设置模型。
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出提供商或提供商的模型。
    - `/queue <mode>` 管理队列行为（`steer`、`interrupt`、`followup`、`collect`、`steer-backlog`）以及像 `debounce:2s cap:25 drop:summarize` 这样的选项。
  </Accordion>
  <Accordion title="设备发现和状态">
    - `/help` 显示简短的帮助摘要。
    - `/commands` 显示生成的命令目录。
    - `/tools [compact|verbose]` 显示当前代理立即可用的内容。
    - `/status` 显示执行/运行时状态，包括 `Execution`/`Runtime` 标签以及提供商的使用/配额（如果有）。
    - `/crestodian <request>` 从所有者私信运行 Crestodian 设置和修复助手。
    - `/tasks` 列出当前会话的活动/最近后台任务。
    - `/context [list|detail|json]` 解释如何组装上下文。
    - `/whoami` 显示您的发送者 ID。别名：`/id`。
    - `/usage off|tokens|full|cost` 控制每次响应的使用页脚或打印本地成本摘要。
  </Accordion>
  <Accordion title="Skills、允许列表、审批">
    - `/skill <name> [input]` 按名称运行 Skill。
    - `/allowlist [list|add|remove] ...` 管理允许列表条目。仅限文本。
    - `/approve <id> <decision>` 解决执行审批提示。
    - `/btw <question>` 提出一个附带问题而不更改未来的会话上下文。参见 [BTW](/zh/tools/btw)。
  </Accordion>
  <Accordion title="子代理和 ACP">
    - `/subagents list|kill|log|info|send|steer|spawn` 管理当前会话的子代理运行。
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 会话和运行时选项。
    - `/focus <target>` 将当前 Discord 线程或 Telegram 主题/对话绑定到会话目标。
    - `/unfocus` 移除当前绑定。
    - `/agents` 列出当前会话的线程绑定代理。
    - `/kill <id|#|all>` 中止一个或所有正在运行的子代理。
    - `/steer <id|#> <message>` 向正在运行的子代理发送引导。别名：`/tell`。
  </Accordion>
  <Accordion title="仅限所有者写入和管理员">
    - `/config show|get|set|unset` 读取或写入 `openclaw.json`。仅限所有者。需要 `commands.config: true`。
    - `/mcp show|get|set|unset` 读取或写入 OpenClaw 管理的 MCP 服务器配置，位于 `mcp.servers` 下。仅限所有者。需要 `commands.mcp: true`。
    - `/plugins list|inspect|show|get|install|enable|disable` 检查或更改插件状态。`/plugin` 是别名。写入操作仅限所有者。需要 `commands.plugins: true`。
    - `/debug show|set|unset|reset` 管理仅限运行时的配置覆盖。仅限所有者。需要 `commands.debug: true`。
    - `/restart` 在启用时重启 OpenClaw。默认值：已启用；设置 `commands.restart: false` 以禁用。
    - `/send on|off|inherit` 设置发送策略。仅限所有者。
  </Accordion>
  <Accordion title="语音、TTS、渠道控制">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` 控制 TTS。参见 [TTS](/zh/tools/tts)。
    - `/activation mention|always` 设置组激活模式。
    - `/bash <command>` 运行主机 Shell 命令。仅文本。别名：`! <command>`。需要 `commands.bash: true` 加上 `tools.elevated` 允许列表。
    - `!poll [sessionId]` 检查后台 bash 任务。
    - `!stop [sessionId]` 停止后台 bash 任务。
  </Accordion>
</AccordionGroup>

### 生成的停靠命令

停靠命令由支持原生命令的渠道插件生成。当前捆绑的集合：

- `/dock-discord` (别名: `/dock_discord`)
- `/dock-mattermost` (别名: `/dock_mattermost`)
- `/dock-slack` (别名: `/dock_slack`)
- `/dock-telegram` (别名: `/dock_telegram`)

### 捆绑的插件命令

捆绑的插件可以添加更多斜杠命令。此仓库中当前捆绑的命令：

- `/dreaming [on|off|status|help]` 切换内存梦境。参见 [Dreaming](/zh/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理设备配对/设置流程。请参阅 [配对](/zh/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 临时启用高风险电话节点命令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 语音配置。在 Discord 上，本机命令名称为 `/talkvoice`。
- `/card ...` 发送 LINE 富卡片预设。请参阅 [LINE](/zh/channels/line)。
- `/codex status|models|threads|resume|compact|review|account|mcp|skills` 检查并控制捆绑的 Codex 应用服务器线束。请参阅 [Codex 线束](/zh/plugins/codex-harness)。
- 仅限 QQBot 的命令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 动态技能命令

用户可调用的技能也会作为斜杠命令公开：

- `/skill <name> [input]` 始终作为通用入口点工作。
- 当技能/插件注册技能时，它们也可能作为直接命令出现，例如 `/prose`。
- 本机技能命令注册由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。

<AccordionGroup>
  <Accordion title="参数和解析器说明">
    - 命令接受在命令和参数之间使用可选的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
    - `/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）；如果没有匹配项，文本将被视为消息正文。
    - 有关完整的提供商使用细分，请使用 `openclaw status --usage`。
    - `/allowlist add|remove` 需要 `commands.config=true` 并遵守渠道 `configWrites`。
    - 在多账号渠道中，以配置为目标的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也遵守目标账号的 `configWrites`。
    - `/usage` 控制每次响应的使用页脚；`/usage cost` 从 OpenClaw 会话日志打印本地成本摘要。
    - `/restart` 默认启用；设置 `commands.restart: false` 可禁用它。
    - `/plugins install <spec>` 接受与 `openclaw plugins install` 相同的插件规范：本地路径/存档、npm 包或 `clawhub:<pkg>`。
    - `/plugins enable|disable` 更新插件配置并可能提示重启。
  </Accordion>
  <Accordion title="渠道特定行为">
    - Discord 专用的原生命令：`/vc join|leave|status` 控制语音频道（不作为文本提供）。`join` 需要一个公会和选定的语音/舞台频道。需要 `channels.discord.voice` 和原生命令。
    - Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）需要启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
    - ACP 命令参考和运行时行为：[ACP agents](/zh/tools/acp-agents)。
  </Accordion>
  <Accordion title="Verbose / trace / fast / reasoning safety">
    - `/verbose` 用于调试和额外的可见性；正常使用时请将其**关闭**。
    - `/trace` 比 `/verbose` 范围更窄：它仅显示插件拥有的跟踪/调试行，并关闭正常的详细工具闲聊。
    - `/fast on|off` 持久化会话覆盖。使用会话 UI `inherit` 选项将其清除并回退到配置默认值。
    - `/fast` 特定于提供商：OpenAI/OpenAI Codex 在原生响应端点上将其映射到 `service_tier=priority`，而直接公共 Anthropic 请求（包括发送到 `api.anthropic.com` 的 OAuth 认证流量）将其映射到 `service_tier=auto` 或 `standard_only`。参见 [OpenAI](/zh/providers/openai) 和 [Anthropic](/zh/providers/anthropic)。
    - 工具失败摘要仍会在相关时显示，但仅在 `/verbose` 为 `on` 或 `full` 时才包含详细的失败文本。
    - `/reasoning`、`/verbose` 和 `/trace` 在群组设置中存在风险：它们可能会暴露您无意暴露的内部推理、工具输出或插件诊断信息。建议保持关闭状态，尤其是在群组聊天中。
  </Accordion>
  <Accordion title="Model switching">
    - `/model` 立即持久化新会话模型。
    - 如果代理空闲，下次运行将立即使用它。
    - 如果运行已在进行中，OpenClaw 会将实时切换标记为待处理，并仅在干净的重试点重新启动到新模型。
    - 如果工具活动或回复输出已经开始，待处理的切换可能会保持排队状态，直到稍后的重试机会或下一轮用户操作。
    - 在本地 TUI 中，`/crestodian [request]` 从常规代理 TUI 返回到 Crestodian。这与消息渠道救援模式是分开的，不授予远程配置权限。
  </Accordion>
  <Accordion title="快速通道和内联快捷方式">
    - **快速通道：** 来自允许列表发送方的纯命令消息会被立即处理（绕过队列 + 模型）。
    - **群组提及限制：** 来自允许列表发送方的纯命令消息会绕过提及要求。
    - **内联快捷方式（仅限允许列表发送方）：** 某些命令在嵌入普通消息时也能生效，并且会在模型看到剩余文本之前被剔除。
      - 示例：`hey /status` 触发状态回复，剩余文本继续正常流程。
    - 目前支持：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
    - 未授权的纯命令消息将被静默忽略，内联 `/...` 标记将被视为纯文本。
  </Accordion>
  <Accordion title="Skill 命令和原生参数">
    - **Skill 命令：** `user-invocable` skills 作为斜杠命令公开。名称被清理为 `a-z0-9_`（最多 32 个字符）；冲突会附加数字后缀（例如 `_2`）。
      - `/skill <name> [input]` 按名称运行 skill（当原生命令限制阻止每个 skill 的命令时很有用）。
      - 默认情况下，skill 命令作为普通请求转发给模型。
      - Skills 可以选择声明 `command-dispatch: tool` 以将命令直接路由到工具（确定性，无模型）。
      - 示例：`/prose` (OpenProse 插件) — 参见 [OpenProse](/zh/prose)。
    - **原生命令参数：** Discord 对动态选项使用自动补全（并且在您省略必需参数时显示按钮菜单）。当命令支持选择项且您省略参数时，Telegram 和 Slack 会显示按钮菜单。动态选择是针对目标会话模型解析的，因此特定于模型的选项（例如 `/think` 级别）遵循该会话的 `/model` 覆盖设置。
  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` 回答的是一个运行时问题，而不是配置问题：即**该代理在此会话中当前可以使用的内容**。

- 默认的 `/tools` 是紧凑的，并针对快速扫描进行了优化。
- `/tools verbose` 会添加简短描述。
- 支持参数的原生命令界面会显示与 `compact|verbose` 相同的模式切换开关。
- 结果的作用域限定为会话，因此更改代理、渠道、线程、发送者授权或模型都可能会改变输出。
- `/tools` 包括在运行时实际可访问的工具，包括核心工具、已连接的插件工具和渠道拥有的工具。

对于配置文件和覆盖编辑，请使用控制 UI 工具面板或配置/目录界面，而不是将 `/tools` 视为静态目录。

## 使用界面（显示内容的位置）

- **提供商使用量/配额**（例如：“Claude 剩余 80%”）会在启用使用量跟踪时显示在当前模型提供商的 `/status` 中。OpenClaw 会将提供商窗口标准化为 `% left`；对于 MiniMax，仅剩余的百分比字段会在显示前反转，并且 `model_remains` 响应优先选择聊天模型条目加上带模型标签的计划标签。
- `/status` 中的 **令牌/缓存行** 当实时会话快照稀疏时，可以回退到最新的转录使用条目。现有的非零实时值仍然优先，并且当存储的总值缺失或较小时，转录回退还可以恢复活动的运行时模型标签加上更大的以提示为导向的总值。
- **执行与运行时：** `/status` 报告 `Execution` 作为有效的沙盒路径，并报告 `Runtime` 表示实际运行会话的对象：`OpenClaw Pi Default`、`OpenAI Codex`、CLI 后端或 ACP 后端。
- **每次响应的令牌/成本** 由 `/usage off|tokens|full` 控制（附加到正常回复）。
- `/model status` 关乎的是 **模型/认证/端点**，而不是使用情况。

## 模型选择 (`/model`)

`/model` 是作为指令实现的。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

说明：

- `/model` 和 `/model list` 会显示一个紧凑的、带编号的选择器（模型系列 + 可用提供商）。
- 在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，其中包含提供商和模型的下拉菜单以及一个提交步骤。
- `/model <#>` 从该选择器中进行选择（并在可能时优先使用当前提供商）。
- `/model status` 显示详细视图，包括配置的提供商端点 (`baseUrl`) 和 API 模式 (`api`)（如果有）。

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

<Note>覆盖会立即应用于新的配置读取，但 **不会** 写入 `openclaw.json`。使用 `/debug reset` 清除所有覆盖并返回磁盘上的配置。</Note>

## 插件跟踪输出

`/trace` 允许您切换 **会话范围的插件跟踪/调试行**，而无需开启完整的详细模式。

示例：

```text
/trace
/trace on
/trace off
```

说明：

- 不带参数的 `/trace` 显示当前会话的跟踪状态。
- `/trace on` 为当前会话启用插件跟踪行。
- `/trace off` 再次将其禁用。
- 插件跟踪行可以出现在 `/status` 中，也可以在正常助手回复后作为后续诊断消息出现。
- `/trace` 不会取代 `/debug`；`/debug` 仍然管理仅运行时的配置覆盖。
- `/trace` 不会取代 `/verbose`；正常的详细工具/状态输出仍然属于 `/verbose`。

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

<Note>配置在写入前会经过验证；无效的更改将被拒绝。`/config` 更新会在重启后保留。</Note>

## MCP 更新

`/mcp` 在 `mcp.servers` 下写入由 OpenClaw 托管的 MCP 服务器定义。仅限所有者。默认禁用；通过 `commands.mcp: true` 启用。

示例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp` 将配置存储在 OpenClaw 配置中，而不是 Pi 拥有的项目设置中。运行时适配器决定哪些传输实际上是可执行的。</Note>

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

<Note>- `/plugins list` 和 `/plugins show` 使用针对当前工作区加上磁盘上配置的真实插件发现。 - `/plugins enable|disable` 仅更新插件配置；它不安装或卸载插件。 - 在启用/禁用更改后，重启网关以应用它们。</Note>

## 表面说明

<AccordionGroup>
  <Accordion title="每个表面的会话">
    - **文本命令** 在普通聊天会话中运行（私信共享 `main`，群组有自己的会话）。
    - **原生命令** 使用隔离会话：
      - Discord: `agent:<agentId>:discord:slash:<userId>`
      - Slack: `agent:<agentId>:slack:slash:<userId>` (前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置)
      - Telegram: `telegram:slash:<userId>` (通过 `CommandTargetSessionKey` 定位聊天会话)
    - **`/stop`** 以活动聊天会话为目标，以便它可以中止当前运行。
  </Accordion>
  <Accordion title="Slack 细节">
    `channels.slack.slashCommand` 仍支持用于单个 `/openclaw` 风格的命令。如果启用 `commands.native`，则必须为每个内置命令创建一个 Slack 斜杠命令（名称与 `/help` 相同）。Slack 的命令参数菜单以临时 Block Kit 按钮的形式提供。

    Slack 原生例外：注册 `/agentstatus`（而非 `/status`），因为 Slack 保留了 `/status`。文本 `/status` 在 Slack 消息中仍然有效。

  </Accordion>
</AccordionGroup>

## BTW 旁侧问题

`/btw` 是关于当前会话的快速**旁侧问题**。

与普通聊天不同：

- 它使用当前会话作为背景上下文，
- 它作为独立的**无工具**一次性调用运行，
- 它不会更改未来的会话上下文，
- 它不会写入转录历史记录，
- 它以实时旁侧结果的形式提供，而不是普通的助手消息。

这使得 `/btw` 在主任务继续进行时，如果您需要临时澄清，非常有用。

例如：

```text
/btw what are we doing right now?
```

有关完整行为和客户端 UX 详细信息，请参阅 [BTW Side Questions](/zh/tools/btw)。

## 相关

- [创建 Skills](/zh/tools/creating-skills)
- [Skills](/zh/tools/skills)
- [Skills 配置](/zh/tools/skills-config)
