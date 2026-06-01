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
  启用在聊天消息中解析 `/...`。在不支持原生命令的表面上（WhatsApp/WebChat/Signal/iMessage/Google Chat/Microsoft Teams），即使您将其设置为 `false`，文本命令仍然有效。
</ParamField>
<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  注册原生命令。自动：对于 Discord/Telegram 开启；对于 Slack 关闭（直到您添加斜杠命令）；对于不支持原生的提供商被忽略。设置 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 以覆盖每个提供商（布尔值或 `"auto"`）。在 Discord 上，`false` 会在启动期间跳过斜杠命令注册和清理；之前注册的命令可能仍然可见，直到您从 Discord 应用中将其删除。Slack 命令在 Slack 应用中进行管理，并且不会被自动删除。
</ParamField>
在 Discord 上，原生命令规范可能包含 `descriptionLocalizations`，OpenClawDiscord 会将其作为 Discord `description_localizations` 发布，并将其包含在协调比较中。
<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'>
  受支持时原生注册 **skill** 命令。自动：对于 Discord/Telegram 开启；对于 Slack 关闭（Slack 需要为每个技能创建一个斜杠命令）。设置 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 以覆盖每个提供商（布尔值或 `"auto"`）。
</ParamField>
<ParamField path="commands.bash" type="boolean" default="false">
  启用 `! <cmd>` 以运行主机 shell 命令（`/bash <cmd>` 是别名；需要 `tools.elevated` 允许列表）。
</ParamField>
<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  控制 bash 在切换到后台模式之前等待的时间（`0` 立即进入后台）。
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
  为仅所有者命令表面和所有者门控渠道操作设置显式的所有者允许列表。这是可以批准危险操作并运行 `/diagnostics`、`/export-trajectory` 和 `/config` 等命令的人工操作员帐户。它与 `commands.allowFrom` 和 私信 配对访问是分开的。
</ParamField>
<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  每个渠道：使仅所有者命令在该表面上运行时需要 **owner identity**。当 `true` 时，发送者必须匹配已解析的所有者候选项（例如 `commands.ownerAllowFrom` 中的条目或提供商原生的所有者元数据），或者在内部消息渠道上拥有内部 `operator.admin` 范围。渠道 `allowFrom` 中的通配符条目或空/未解析的所有者候选项列表是**不**充分的 —— 仅所有者命令在该渠道上将关闭并失败。如果您希望仅所有者命令仅由 `ownerAllowFrom` 和标准命令允许列表进行门控，请保持关闭。
</ParamField>
<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制所有者 ID 在系统提示中的显示方式。
</ParamField>
<ParamField path="commands.ownerDisplaySecret" type="string">
  可选地设置使用 `commands.ownerDisplay="hash"` 时使用的 HMAC 密钥。
</ParamField>
<ParamField path="commands.allowFrom" type="object">
  用于命令授权的每个提供商允许列表。配置后，它是命令和指令的唯一授权源（渠道允许列表/配对和 `commands.useAccessGroups` 将被忽略）。使用 `"*"` 作为全局默认值；特定于提供商的键将覆盖它。
</ParamField>
<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  当未设置 `commands.allowFrom` 时，对命令强制执行允许列表/策略。
</ParamField>

## 命令列表

当前权威来源：

- 核心内置命令来自 `src/auto-reply/commands-registry.shared.ts`
- 生成的 Dock 命令来自 `src/auto-reply/commands-registry.data.ts`
- 插件命令来自插件 `registerCommand()` 调用
- 网关上的实际可用性仍取决于配置标志、渠道表面以及已安装/启用的插件

### 核心内置命令

<AccordionGroup>
  <Accordion title="Sessions and runs">
    - `/new [model]` 归档当前会话并启动一个新的会话；`/reset` 就地清除当前会话。它们互不为别名。
    - 控制界面会拦截输入的 `/new` 以创建并切换到新的仪表板会话，但当配置了 `session.dmScope: "main"` 且当前父级是 agent 的主会话时除外；在这种情况下，`/new` 会就地重置主会话。输入 `/reset`Gateway(网关) 仍将执行 Gateway(网关) 的就地重置。
    - `/reset soft [message]`CLI 保留当前记录，丢弃复用的 CLI 后端会话 ID，并就地重新运行启动/系统提示加载。
    - `/compact [instructions]` 压缩会话上下文。请参阅 [压缩](/zh/concepts/compaction)。
    - `/stop` 中止当前运行。
    - `/session idle <duration|off>` 和 `/session max-age <duration|off>` 管理线程绑定到期。
    - `/export-session [path]` 将当前会话导出为 HTML。别名：`/export`。
    - `/export-trajectory [path]` 请求执行批准，然后导出当前会话的 JSONL [轨迹包](/zh/tools/trajectoryOpenClaw)。当您需要单个 OpenClaw 会话的提示、工具和记录时间轴时，请使用它。在群组聊天中，批准提示和导出结果将私下发送给所有者。别名：`/trajectory`。

  </Accordion>
  <Accordion title="模型和运行控制">
    - `/think <level|default>` 设置思考级别或清除会话覆盖。选项来自当前模型的提供商配置文件；常见级别包括 `off`、`minimal`、`low`、`medium` 和 `high`，其中仅在支持的情况下包含自定义级别如 `xhigh`、`adaptive`、`max` 或二进制 `on`。别名：`/thinking`、`/t`。
    - `/verbose on|off|full` 切换详细输出。经过授权的外部渠道发送者可以持久化会话覆盖；内部 gateway/webchat 客户端需要 `operator.admin`。别名：`/v`。
    - `/trace on|off` 切换当前会话的插件跟踪输出。
    - `/fast [status|on|off|default]` 显示、设置或清除快速模式。
    - `/reasoning [on|off|stream]` 切换推理可见性。别名：`/reason`。
    - `/elevated [on|off|ask|full]` 切换提升模式。别名：`/elev`。
    - `/exec host=<auto|sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>` 显示或设置 exec 默认值。
    - `/model [name|#|status]` 显示或设置模型。
    - `/models [provider] [page] [limit=<n>|size=<n>|all]` 列出已配置/可授权访问的提供商或某个提供商的模型；添加 `all` 以浏览该提供商的完整目录。`agents.defaults.models` 中的 `provider/*` 条目使得 `/model` 和 `/models` 仅显示那些提供商的已发现模型。
    - `/queue <mode>` 管理活动运行队列行为（`steer`、`followup`、`collect`、`interrupt`）以及 `debounce:0.5s cap:25 drop:summarize` 等选项；`/queue default` 或 `/queue reset` 清除会话覆盖。运行中的提示词默认在没有队列指令的情况下进行引导。请参阅 [Command queue](/zh/concepts/queue) 和 [Steering queue](/zh/concepts/queue-steering)。
    - `/steer <message>` 向当前会话的活动运行注入指导，独立于 `/queue` 模式。如果引导不可用或会话空闲，`<message>` 将作为普通提示词继续。别名：`/tell`。请参阅 [Steer](/zh/tools/steer)。

  </Accordion>
  <Accordion title="设备发现 and status">
    - `/help` 显示简短的帮助摘要。
    - `/commands` 显示生成的命令目录。
    - `/tools [compact|verbose]` 显示当前代理当前可以使用的内容。
    - `/status`Gateway(网关) 显示执行/运行时状态、Gateway(网关) 和系统正常运行时间，以及提供商的使用情况/配额（如果可用）。
    - `/diagnostics [note]`Gateway(网关) 是仅限所有者的 Gateway(网关) 错误和 Codex 挂载运行的支持报告流程。每次运行 `openclaw gateway diagnostics export --json`OpenAIOpenAIOpenClaw 之前，它都会询问明确的执行批准；请勿使用“允许所有”规则批准诊断。批准后，它会发送一份可粘贴的报告，其中包含本地捆绑包路径、清单摘要、隐私说明和相关的会话 ID。在群聊中，批准提示和报告将私下发送给所有者。当活动会话使用 OpenAI Codex 挂载时，同样的批准也会将相关的 Codex 反馈发送到 OpenAI 服务器，完成的回复将列出 OpenClaw 会话 ID、Codex 线程 ID 和 `codex resume <thread-id>` 命令。请参阅 [Diagnostics Export](/zh/gateway/diagnostics)。
    - `/crestodian <request>` 从所有者私信运行 Crestodian 设置和修复助手。
    - `/tasks` 列出当前会话的活动/近期后台任务。
    - `/context [list|detail|map|json]` 解释上下文的组装方式。`map` 发送当前会话上下文的树状图图像。
    - `/whoami` 显示您的发送者 ID。别名：`/id`。
    - `/usage off|tokens|full|cost` 控制每次响应的使用页脚或打印本地成本摘要。

  </Accordion>
  <Accordion title="Skills, allowlists, approvals">
    - `/skill <name> [input]` 按名称运行 Skill。
    - `/allowlist [list|add|remove] ...` 管理允许列表条目。仅限文本。
    - `/approve <id> <decision>` 解析 exec 或插件批准提示。
    - `/btw <question>` 提出一个附带问题，而不更改未来的会话上下文。别名：`/side`。参见 [BTW](/zh/tools/btw)。

  </Accordion>
  <Accordion title="Subagents and ACP">
    - `/subagents list|log|info` 检查当前会话的子代理运行。
    - `/acp spawn|cancel|steer|close|sessions|status|set-mode|set|cwd|permissions|timeout|model|reset-options|doctor|install|help` 管理 ACP 会话和运行时选项。
    - `/focus <target>` 将当前的 Discord 线程或 Telegram 主题/对话绑定到会话目标。
    - `/unfocus` 移除当前绑定。
    - `/agents` 列出当前会话的线程绑定代理。

  </Accordion>
  <Accordion title="Owner-only writes and admin">
    - `/config show|get|set|unset` 读取或写入 `openclaw.json`。仅限所有者。需要 `commands.config: true`。
    - `/mcp show|get|set|unset` 读取或写入 OpenClaw 管理的位于 `mcp.servers` 下的 MCP 服务器配置。仅限所有者。需要 `commands.mcp: true`。
    - `/plugins list|inspect|show|get|install|enable|disable` 检查或变更插件状态。`/plugin` 是别名。写入操作仅限所有者。需要 `commands.plugins: true`。
    - `/debug show|set|unset|reset` 管理仅运行时的配置覆盖。仅限所有者。需要 `commands.debug: true`。
    - `/restart` 在启用时重启 OpenClaw。默认值：启用；设置 `commands.restart: false` 以禁用它。
    - `/send on|off|inherit` 设置发送策略。仅限所有者。

  </Accordion>
  <Accordion title="语音、TTS、渠道控制">
    - `/tts on|off|status|chat|latest|provider|limit|summary|audio|help` 控制 TTS。请参阅 [TTS](/zh/tools/tts)。
    - `/activation mention|always` 设置群组激活模式。
    - `/bash <command>` 运行主机 shell 命令。仅文本。别名：`! <command>`。需要 `commands.bash: true` 和 `tools.elevated` 白名单。
    - `!poll [sessionId]` 检查后台 bash 任务。
    - `!stop [sessionId]` 停止后台 bash 任务。

  </Accordion>
</AccordionGroup>

### 生成的停靠命令

Dock 命令将当前会话的回复路由切换到另一个关联渠道。有关设置、示例和故障排除，请参阅 [渠道对接 (Channel docking)](/zh/concepts/channel-docking)。

Dock 命令由支持原生命令的渠道插件生成。当前捆绑的集合包括：

- `/dock-discord`（别名：`/dock_discord`）
- `/dock-mattermost`（别名：`/dock_mattermost`）
- `/dock-slack`（别名：`/dock_slack`）
- `/dock-telegram`（别名：`/dock_telegram`）

在直接聊天中使用对接命令可以将当前会话的回复路由切换到另一个关联渠道。代理保持相同的会话上下文，但该会话的未来回复将发送到选定的渠道对等端。

Dock 命令需要 `session.identityLinks`。源发送者和目标对等端必须位于同一身份组中，例如 `["telegram:123", "discord:456"]`。如果 ID 为 `123` 的 Telegram 用户发送 `/dock_discord`，OpenClaw 会在活动会话上存储 `lastChannel: "discord"` 和 `lastTo: "456"`。如果发送者未关联到 Discord 对等端，该命令将回复设置提示，而不是转入正常聊天。

对接仅更改活动会话路由。它不会创建渠道账户、授予访问权限、绕过渠道白名单或将对话记录历史移动到另一个会话。使用 `/dock-telegram`、`/dock-slack`、`/dock-mattermost` 或其他生成的 dock 命令再次切换路由。

### 打包的插件命令

打包的插件可以添加更多斜杠命令。此仓库中当前的打包命令包括：

- `/dreaming [on|off|status|help]` 切换记忆梦境。请参阅 [梦境 (Dreaming)](/zh/concepts/dreaming)。
- `/pair [qr|status|pending|approve|cleanup|notify]` 管理设备配对/设置流程。请参阅 [配对](/zh/channels/pairing)。
- `/phone status|arm <camera|screen|writes|all> [duration]|disarm` 临时启用高风险手机节点命令。
- `/voice status|list [limit]|set <voiceId|name>` 管理 Talk 语音配置。在 Discord 上，原生命令名称为 `/talkvoice`。
- `/card ...` 发送 LINE 富卡片预设。请参阅 [LINE](/zh/channels/line)。
- `/codex status|models|threads|resume|compact|review|diagnostics|account|mcp|skills` 检查并控制捆绑的 Codex 应用服务器线束。请参阅 [Codex 线束](/zh/plugins/codex-harness)。
- 仅限 QQBot 的命令：
  - `/bot-ping`
  - `/bot-version`
  - `/bot-help`
  - `/bot-upgrade`
  - `/bot-logs`

### 动态技能命令

用户可调用的技能也会作为斜杠命令公开：

- `/skill <name> [input]` 始终作为通用入口点工作。
- 当技能/插件注册时，技能也可能显示为直接命令，例如 `/prose`。
- 原生技能命令注册由 `commands.nativeSkills` 和 `channels.<provider>.commands.nativeSkills` 控制。
- 命令规范可以为支持本地化描述的原生界面（包括 Discord）提供 `descriptionLocalizations`。

<AccordionGroup>
  <Accordion title="Argument and parser notes">
    - 命令接受在命令和参数之间使用可选的 `:`（例如 `/think: high`、`/send: on`、`/help:`）。
    - `/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）；如果没有匹配项，该文本将被视为消息正文。
    - 如需完整的提供商使用细分，请使用 `openclaw status --usage`。
    - `/allowlist add|remove` 需要 `commands.config=true` 并尊重渠道 `configWrites`。
    - 在多账户渠道中，针对配置的 `/allowlist --account <id>` 和 `/config set channels.<provider>.accounts.<id>...` 也会尊重目标账户的 `configWrites`。
    - `/usage` 控制每次响应的使用情况页脚；`/usage cost`OpenClaw 会从 OpenClaw 会话日志中打印本地成本摘要。
    - `/restart` 默认启用；设置 `commands.restart: false` 可将其禁用。
    - `/plugins install <spec>` 接受与 `openclaw plugins install`npm 相同的插件规范：本地路径/存档、npm 包、`git:<repo>` 或 `clawhub:<pkg>`。由于插件源模块发生了更改，受管 Gateway 会自动重启。
    - `/plugins enable|disable`Gateway(网关) 会更新插件配置并在新的智能体轮次中触发 Gateway 插件重新加载。

  </Accordion>
  <Accordion title="Channel-specific behavior">
    - Discord 专属原生命令：`/vc join|leave|status` 控制语音渠道（不提供文本形式）。`join` 需要一个服务器以及选定的语音/舞台渠道。需要 `channels.discord.voice` 和原生命令。
    - Discord 线程绑定命令（`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age`）要求启用有效的线程绑定（`session.threadBindings.enabled` 和/或 `channels.discord.threadBindings.enabled`）。
    - ACP 命令参考和运行时行为：[ACP agents](/zh/tools/acp-agents)。

  </Accordion>
  <Accordion title="Verbose / trace / fast / reasoning safety">
    - `/verbose` 旨在用于调试和增加可见性；在正常使用中请将其保持**关闭**。
    - `/trace` 比 `/verbose` 更窄：它仅显示插件拥有的跟踪/调试行，并保持正常的详细工具对话关闭。
    - `/fast on|off` 会持久化会话覆盖。使用会话 UI `inherit` 选项将其清除并回退到配置默认值。
    - `/fast` 特定于提供商：OpenAI/OpenAI Codex 将其在原生 Responses 端点上映射为 `service_tier=priority`，而直接公开的 Anthropic 请求（包括发送到 `api.anthropic.com` 的 OAuth 认证流量）将其映射为 `service_tier=auto` 或 `standard_only`。参见 [OpenAI](/zh/providers/openai) 和 [Anthropic](/zh/providers/anthropic)。
    - 工具失败摘要仍会在相关时显示，但仅在启用 `/verbose full` 时才包含详细的失败文本。
    - `/reasoning`、`/verbose` 和 `/trace` 在群组设置中存在风险：它们可能会暴露内部推理、工具输出或您无意暴露的插件诊断信息。建议将其保持关闭，尤其是在群组聊天中。

  </Accordion>
  <Accordion title="模型切换">
    - `/model`OpenClawTUI 会立即持久化新的会话模型。
    - 如果代理处于空闲状态，下一次运行将立即使用该模型。
    - 如果运行已在进行中，OpenClaw 会将实时切换标记为待处理，并仅在干净的 重试点时重启到新模型。
    - 如果工具活动或回复输出已经开始，待处理的切换可能会保持排队状态，直到稍后的重试机会或下一次用户回合。
    - 在本地 TUI 中，`/crestodian [request]`TUI 会从常规代理 TUI 返回到 Crestodian。这与消息渠道救援模式是分开的，并且不授予远程配置权限。

  </Accordion>
  <Accordion title="快速路径和内联快捷方式">
    - **快速路径：** 来自白名单发送方的仅命令消息会被立即处理（绕过队列 + 模型）。
    - **群组提及门控：** 来自白名单发送方的仅命令消息会绕过提及要求。
    - **内联快捷方式（仅限白名单发送方）：** 某些命令在嵌入到普通消息中时也有效，并且在模型看到剩余文本之前会被剥离。
      - 示例：`hey /status` 触发状态回复，而剩余文本会继续通过常规流程。
    - 目前支持：`/help`、`/commands`、`/status`、`/whoami` (`/id`)。
    - 未授权的仅命令消息将被静默忽略，而内联 `/...` 标记将被视为纯文本。

  </Accordion>
  <Accordion title="Skill commands and native arguments">
    - **Skill commands:** `user-invocable` skills are exposed as slash commands. Names are sanitized to `a-z0-9_` (max 32 chars); collisions get numeric suffixes (e.g. `_2`).
      - `/skill <name> [input]` runs a skill by name (useful when native command limits prevent per-skill commands).
      - By default, skill commands are forwarded to the 模型 as a normal request.
      - Skills may optionally declare `command-dispatch: tool` to route the command directly to a 工具 (deterministic, no 模型).
      - Example: `/prose` (OpenProse plugin) — see [OpenProse](/zh/prose).
    - **Native command arguments:** Discord uses autocomplete for dynamic options (and button menus when you omit required args). Telegram and Slack show a button menu when a command supports choices and you omit the arg. Dynamic choices are resolved against the target 会话 模型, so 模型-specific options such as `/think` levels follow that 会话's `/model` override.

  </Accordion>
</AccordionGroup>

## `/tools`

`/tools` 回答的是一个运行时问题，而不是配置问题：**该智能体此时在此会话中可以使用什么**。

- 默认的 `/tools` 是紧凑的，并经过优化以便快速浏览。
- `/tools verbose` 添加简短描述。
- 支持参数的原生命令界面会暴露与 `compact|verbose` 相同的模式切换开关。
- 结果的作用域限定为 会话，因此更改 agent、渠道、thread、发送者授权或模型可能会改变输出。
- `/tools` 包含在运行时实际可访问的工具，包括核心工具、已连接的插件工具和渠道拥有的工具。

对于个人资料和覆盖设置的编辑，请使用控制 UI 工具面板或配置/目录界面，而不要将 `/tools` 视为静态目录。

## Usage surfaces (what shows where)

- **提供商使用量/配额**（例如：“Claude 剩余 80%”）会在启用使用量跟踪时显示在 `/status`OpenClaw 中，针对当前模型提供商。OpenClaw 将提供商窗口标准化为 `% left`MiniMax；对于 MiniMax，仅剩百分比字段会在显示前反转，而 `model_remains` 响应优先使用聊天模型条目加上带模型标签的计划标签。
- 当实时会话快照稀疏时，`/status` 中的 **Token/cache lines** 可以回退到最新的记录使用量条目。现有的非零实时值仍然优先，并且当存储的总数缺失或较小时，记录回退还可以恢复活动的运行时模型标签以及更大的面向提示的总数。
- **执行 vs 运行时：** `/status` 报告有效沙箱路径的 `Execution` 和实际运行会话的对象的 `Runtime`：`OpenClaw Default`、`OpenAI Codex`CLI、CLI 后端或 ACP 后端。
- **每次响应的 token/成本** 由 `/usage off|tokens|full` 控制（附加到正常回复中）。
- `/model status` 关乎 **模型/认证/端点**，而非使用量。

## 模型选择 (`/model`)

`/model` 被实现为一个指令。

示例：

```
/model
/model list
/model 3
/model openai/gpt-5.4
/model opus@anthropic:default
/model status
```

注意：

- `/model` 和 `/model list` 显示一个紧凑的、带编号的选择器（模型系列 + 可用提供商）。
- 在 Discord 上，Discord`/model` 和 `/models` 会打开一个交互式选择器，包含提供商和模型下拉菜单以及一个提交步骤。该选择器遵循 `agents.defaults.models`，包括 `provider/*`Discord 条目，因此提供商范围的发现可以将选择器保持在 Discord 的 25 选项组件限制之下。
- `/model <#>` 从该选择器中进行选择（并在可能时优先使用当前提供商）。
- `/model status` 显示详细视图，包括已配置的提供商端点（`baseUrl`API）和 API 模式（`api`）（如果可用）。

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

<Note>覆盖项立即应用于新的配置读取，但**不会**写入 `openclaw.json`。使用 `/debug reset` 清除所有覆盖项并返回磁盘上的配置。</Note>

## 插件跟踪输出

`/trace` 允许您切换**会话范围的插件跟踪/调试行**，而无需开启完整的详细模式。

示例：

```text
/trace
/trace on
/trace off
```

注意：

- 不带参数的 `/trace` 显示当前会话跟踪状态。
- `/trace on` 为当前会话启用插件跟踪行。
- `/trace off` 再次禁用它们。
- 插件跟踪行可以出现在 `/status` 中，也可以在正常助手回复之后作为后续诊断消息出现。
- `/trace` 不会替代 `/debug`；`/debug` 仍然管理仅运行时的配置覆盖项。
- `/trace` 不会替代 `/verbose`；正常的详细工具/状态输出仍然属于 `/verbose`。

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

<Note>配置在写入前会进行验证；无效的更改将被拒绝。`/config` 的更新在重启后仍然有效。</Note>

## MCP 更新

`/mcp`OpenClaw 将 OpenClaw 管理的 MCP 服务器定义写入 `mcp.servers` 下。仅限所有者。默认禁用；通过 `commands.mcp: true` 启用。

示例：

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

<Note>`/mcp`OpenClaw 将配置存储在 OpenClaw 配置中，而不是嵌入代理的项目设置中。运行时适配器决定哪些传输实际上是可执行的。</Note>

## 插件更新

`/plugins` 允许操作员检查已发现的插件并在配置中切换启用状态。只读流程可以使用 `/plugin` 作为别名。默认情况下禁用；使用 `commands.plugins: true` 启用。

示例：

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
```

<Note>
- `/plugins list` 和 `/plugins show` 针对当前工作区以及磁盘上的配置使用真实的插件发现机制。
- `/plugins install` 从 ClawHub、npm、git、本地目录和归档文件进行安装。
- `/plugins enable|disable` 仅更新插件配置；它不安装或卸载插件。
- 启用和禁用更改会为新的代理轮次热重载 Gateway(网关) 插件运行时表面；安装会自动重启受管 Gateway，因为插件源模块已更改。

</Note>

## 表面说明

<AccordionGroup>
  <Accordion title="每个表面的会话">
    - **文本命令** 在正常聊天会话中运行（ 共享 `main`，群组有自己的会话）。
    - **原生命令** 使用隔离的会话：
      - Discord：`agent:<agentId>:discord:slash:<userId>`
      - Slack：`agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
      - Telegram：`telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 定位聊天会话）
    - **`/stop`** 定位活动的聊天会话，以便它可以中止当前运行。

  </Accordion>
  <Accordion title="SlackSlack specifics">
    `channels.slack.slashCommand` 仍支持单个 `/openclaw` 风格的命令。如果启用了 `commands.native`Slack，则必须为每个内置命令创建一个 Slack 斜杠命令（名称与 `/help`SlackSlack 相同）。Slack 的命令参数菜单将以临时的 Block Kit 按钮形式提供。

    Slack 原生例外：注册 `/agentstatus`（而非 `/status`Slack），因为 Slack 保留了 `/status`。文本 `/status`Slack 在 Slack 消息中仍然有效。

  </Accordion>
</AccordionGroup>

## BTW 侧边问题

`/btw` 是关于当前会话的快速**附带问题**。`/side` 是其别名。

与普通聊天不同：

- 它使用当前会话作为背景上下文，
- 在 Codex 线程会话中，它作为临时的 Codex 侧边线程运行，并具有
  当前的 Codex 权限和原生工具表面，
- 在非 Codex 会话中，它保持较旧的直接一次性侧边调用行为，
- 它不会改变未来的会话上下文，
- 它不会被写入历史记录，
- 它作为实时侧边结果交付，而不是普通的助手消息。

这使得 `/btw` 在主任务继续进行时，当你需要临时澄清时非常有用。

示例：

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

有关完整的行为和客户端 UX 详细信息，请参阅 [BTW Side Questions](/zh/tools/btw)。

## 相关

- [Creating skills](/zh/tools/creating-skills)
- [Skills](/zh/tools/skills)
- [Skills config](/zh/tools/skills-config)
