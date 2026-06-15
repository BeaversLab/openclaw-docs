---
title: "斜杠命令"
sidebarTitle: "斜杠命令"
summary: "所有可用的斜杠命令、指令和内联快捷方式 —— 配置、路由和特定于表面的行为。"
read_when:
  - Using or configuring chat commands
  - Debugging command routing or permissions
  - Understanding how skill commands are registered
---

Gateway(网关) 处理以 Gateway(网关)`/` 开头的独立消息形式发送的命令。
仅限主机使用的 bash 命令使用 `! <cmd>`（以 `/bash <cmd>` 作为别名）。

当对话绑定到 ACP 会话时，普通文本会路由到 ACP
harness。Gateway(网关) 管理命令保持本地：Gateway(网关)`/acp ...`OpenClaw 始终到达
OpenClaw 命令处理程序，而 `/status` 加上 `/unfocus` 在为该表面启用
命令处理时始终保持本地状态。

## 三种命令类型

<CardGroup cols={3}>
  <Card title="Commands" icon="terminal">
    由 Gateway(网关) 处理的独立 `/...`Gateway(网关) 消息。必须作为消息中的 唯一内容发送。
  </Card>
  <Card title="Directives" icon="sliders">
    `/think`、`/fast`、`/verbose`、`/trace`、`/reasoning`、`/elevated`、 `/exec`、`/model`、`/queue` — 在模型看到之前从消息中剥离。 单独发送时持久化会话设置；与其他文本一起发送时充当内联提示。
  </Card>
  <Card title="Inline shortcuts" icon="bolt">
    `/help`、`/commands`、`/status`、`/whoami` — 立即运行，并在模型看到剩余文本之前被剥离。仅限授权发送者使用。
  </Card>
</CardGroup>

<AccordionGroup>
  <Accordion title="Directive behavior details">
    - 指令在模型看到消息之前从消息中剥离。 - 在**仅指令**消息（消息仅包含指令）中，它们会持久化到会话并回复确认。 - 在包含其他文本的**正常聊天**消息中，它们充当内联提示，并且**不**持久化会话设置。 - 指令仅适用于**授权发送者**。如果设置了 `commands.allowFrom`，它将作为唯一使用的允许列表；否则授权来自渠道允许列表/配对加上 `commands.useAccessGroups`。未经授权的发送者将看到指令被当作纯文本处理。
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
  启用聊天消息中的 `/...` 解析。在没有原生命令的界面（WhatsApp、WebChat、Signal、iMessage、Google Chat、Microsoft Teams）上，即使设置为 `false`，文本命令仍然有效。
</ParamField>

<ParamField path="commands.native" type='boolean | "auto"' default='"auto"'>
  注册原生命令。自动模式：Discord/Telegram 开启；Slack 关闭；对于不支持原生的提供程序则忽略。使用 `channels.<provider>.commands.native` 按渠道覆盖。在 Discord 上，`false` 会跳过斜杠命令注册；之前注册的命令可能会保持可见，直到被移除。
</ParamField>

<ParamField path="commands.nativeSkills" type='boolean | "auto"' default='"auto"'DiscordTelegramSlack>
  在受支持时原生注册技能命令。自动：Discord/Telegram 开启；Slack 关闭。使用
  `channels.<provider>.commands.nativeSkills` 覆盖。
</ParamField>

<ParamField path="commands.bash" type="boolean" default="false">
  启用 `! <cmd>` 以运行主机 Shell 命令（`/bash <cmd>` 别名）。需要
  `tools.elevated` 允许列表。
</ParamField>

<ParamField path="commands.bashForegroundMs" type="number" default="2000">
  bash 在切换到后台模式之前等待的时间（`0` 立即 后台运行）。
</ParamField>

<ParamField path="commands.config" type="boolean" default="false">
  启用 `/config`（读取/写入 `openclaw.json`）。仅限所有者。
</ParamField>

<ParamField path="commands.mcp" type="boolean" default="false">
  启用 `/mcp`OpenClaw（读取/写入 OpenClaw 管理的位于 `mcp.servers` 下的 MCP 配置）。仅限所有者。
</ParamField>

<ParamField path="commands.plugins" type="boolean" default="false">
  启用 `/plugins`（插件发现/状态以及安装 + 启用/禁用）。写入操作仅限所有者。
</ParamField>

<ParamField path="commands.debug" type="boolean" default="false">
  启用 `/debug`（仅运行时配置覆盖）。仅限所有者。
</ParamField>

<ParamField path="commands.restart" type="boolean" default="true">
  启用 `/restart` 和网关重启工具动作。
</ParamField>

<ParamField path="commands.ownerAllowFrom" type="string[]">
  仅限所有者命令界面的显式所有者允许列表。与 `commands.allowFrom` 和私信配对访问分开。
</ParamField>

<ParamField path="channels.<channel>.commands.enforceOwnerForCommands" type="boolean" default="false">
  逐渠道：仅限所有者的命令需要所有者身份。当 `true` 时， 发送者必须匹配 `commands.ownerAllowFrom` 或持有内部 `operator.admin` 范围。通配符 `allowFrom` 条目是**不**充分的。
</ParamField>

<ParamField path="commands.ownerDisplay" type='"raw" | "hash"'>
  控制所有者 ID 在系统提示词中的显示方式。
</ParamField>

<ParamField path="commands.ownerDisplaySecret" type="string">
  当 `commands.ownerDisplay: "hash"` 时使用的 HMAC 密钥。
</ParamField>

<ParamField path="commands.allowFrom" type="object">
  用于命令授权的逐提供商白名单。配置后，它是命令和指令的 **唯一**授权来源。使用 `"*"` 作为 全局默认值；特定于提供商的键会覆盖它。
</ParamField>

<ParamField path="commands.useAccessGroups" type="boolean" default="true">
  当未设置 `commands.allowFrom` 时，对命令执行白名单/策略。
</ParamField>

## 命令列表

命令来自三个来源：

- **核心内置命令：** `src/auto-reply/commands-registry.shared.ts`
- **生成的 Dock 命令：** `src/auto-reply/commands-registry.data.ts`
- **插件命令：** 插件 `registerCommand()` 调用

可用性取决于配置标志、渠道界面以及已安装/已启用的
插件。

### 核心命令

<AccordionGroup>
  <Accordion title="会话和运行">
    | 命令 | 描述 |
    | --- | --- |
    | `/new [model]` | 归档当前会话并启动一个新会话 |
    | `/reset [soft [message]]` | 原地重置当前会话。`soft`CLI 保留记录，丢弃重用的 CLI 后端会话 ID，并重新运行启动流程 |
    | `/compact [instructions]` | 压缩会话上下文。请参阅 [压缩](/zh/concepts/compaction) |
    | `/stop` | 中止当前运行 |
    | `/session idle <duration\|off>` | 管理线程绑定的空闲过期 |
    | `/session max-age <duration\|off>` | 管理线程绑定的最大存活时间过期 |
    | `/export-session [path]` | 将当前会话导出为 HTML。别名：`/export` |
    | `/export-trajectory [path]` | 导出当前会话的 JSONL 轨迹包。别名：`/trajectory` |

    <Note>
      控制界面会拦截输入的 `/new` 以创建并切换到新的
      仪表板会话，除非 `session.dmScope: "main"` 已配置
      且当前父级是代理的主会话 — 在这种情况下 `/new`
      会原地重置主会话。输入的 `/reset`Gateway(网关) 仍将运行 Gateway(网关) 的
      原地重置。
    </Note>

  </Accordion>

  <Accordion title="模型与运行控制">
    | 命令 | 描述 |
    | --- | --- |
    | `/think <level\|default>` | 设置思考级别或清除会话覆盖。别名：`/thinking`、`/t` |
    | `/verbose on\|off\|full` | 切换详细输出。别名：`/v` |
    | `/trace on\|off` | 切换当前会话的插件跟踪输出 |
    | `/fast [status\|on\|off\|default]` | 显示、设置或清除快速模式 |
    | `/reasoning [on\|off\|stream]` | 切换推理可见性。别名：`/reason` |
    | `/elevated [on\|off\|ask\|full]` | 切换提升模式。别名：`/elev` |
    | `/exec host=<auto\|sandbox\|gateway\|node> security=<deny\|allowlist\|full> ask=<off\|on-miss\|always> node=<id>` | 显示或设置 exec 默认值 |
    | `/model [name\|#\|status]` | 显示或设置模型 |
    | `/models [provider] [page] [limit=<n>\|all]` | 列出已配置/可认证的提供商或模型 |
    | `/queue <mode>` | 管理活动运行队列行为。参阅 [队列](/zh/concepts/queue) 和 [队列引导](/zh/concepts/queue-steering) |
    | `/steer <message>` | 向活动运行注入指导。别名：`/tell`。参阅 [引导](/zh/tools/steer) |

    <AccordionGroup>
      <Accordion title="verbose / trace / fast / reasoning safety">
        - `/verbose` 用于调试 — 正常使用时请保持 **关闭**。
        - `/trace` 仅显示插件拥有的跟踪/调试行；正常的详细闲聊保持关闭。
        - `/fast on|off` 会持久化会话覆盖设置；使用会话 UI 中的 `inherit` 选项来清除它。
        - `/fast`OpenAI 特定于提供商：OpenAI/Codex 将其映射到 `service_tier=priority`Anthropic；直接的 Anthropic 请求将其映射到 `service_tier=auto` 或 `standard_only`。
        - `/reasoning`、`/verbose` 和 `/trace` 在群组设置中有风险 — 它们可能会泄露内部推理或插件诊断信息。在群聊中请保持关闭。

      </Accordion>
      <Accordion title="模型切换详情">
        - `/model` 会立即将新模型持久化到会话中。
        - 如果代理处于空闲状态，下次运行将立即使用它。
        - 如果运行处于活动状态，切换将被标记为待处理，并在下一个干净的重试点应用。

      </Accordion>
    </AccordionGroup>

  </Accordion>

  <Accordion title="发现和状态">
    | 命令 | 描述 |
    | --- | --- |
    | `/help` | 显示简短的帮助摘要 |
    | `/commands` | 显示生成的命令目录 |
    | `/tools [compact\|verbose]` | 显示当前 Agent 现在可以使用的内容 |
    | `/status` | 显示执行/运行时状态、Gateway(网关) 和系统运行时间，以及提供商使用情况/配额 |
    | `/goal [status\|start\|pause\|resume\|complete\|block\|clear] ...` | 管理当前会话的持久 [goal](/zh/tools/goal) |
    | `/diagnostics [note]` | 仅限所有者的支持报告流程。每次都请求执行批准 |
    | `/crestodian <request>` | 从所有者私信运行 Crestodian 设置和修复助手 |
    | `/tasks` | 列出当前会话的活动/最近后台任务 |
    | `/context [list\|detail\|map\|json]` | 解释上下文是如何组装的 |
    | `/whoami` | 显示您的发送者 ID。别名：`/id` |
    | `/usage off\|tokens\|full\|cost` | 控制每次响应的使用页脚或打印本地成本摘要 |
  </Accordion>

  <Accordion title="Skills、允许列表、批准">
    | 命令 | 描述 |
    | --- | --- |
    | `/skill <name> [input]` | 按名称运行 Skill |
    | `/allowlist [list\|add\|remove] ...` | 管理允许列表条目。仅限文本 |
    | `/approve <id> <decision>` | 解决执行或插件批准提示 |
    | `/btw <question>` | 提一个附带问题而不更改会话上下文。别名：`/side`。参见 [BTW](/zh/tools/btw) |
  </Accordion>

  <Accordion title="子代理和 ACP">
    | 命令 | 描述 |
    | --- | --- |
    | `/subagents list\|log\|info` | 检查当前会话的子代理运行情况 |
    | `/acp spawn\|cancel\|steer\|close\|sessions\|status\|set-mode\|set\|cwd\|permissions\|timeout\|model\|reset-options\|doctor\|install\|help` | 管理 ACP 会话和运行时选项 |
    | `/focus <target>` | 将当前的 Discord 线程或 Telegram 主题绑定到会话目标 |
    | `/unfocus` | 移除当前的线程绑定 |
    | `/agents` | 列出当前会话的线程绑定代理 |
  </Accordion>

<Accordion title="仅限所有者写入和管理">
  | 命令 | 需要 | 描述 | | --- | --- | --- | | `/config show\|get\|set\|unset` | `commands.config: true` | 读取或写入 `openclaw.json`。仅限所有者 | | `/mcp show\|get\|set\|unset` | `commands.mcp: true` | 读取或写入 OpenClaw 管理的 MCP 服务器配置。仅限所有者 | | `/plugins list\|inspect\|show\|get\|install\|enable\|disable` | `commands.plugins: true` |
  检查或修改插件状态。写入仅限所有者。别名：`/plugin` | | `/debug show\|set\|unset\|reset` | `commands.debug: true` | 仅运行时配置覆盖。仅限所有者 | | `/restart` | `commands.restart: true`（默认） | 重启 OpenClaw | | `/send on\|off\|inherit` | owner | 设置发送策略 |
</Accordion>

  <Accordion title="语音、TTS、渠道控制">
    | 命令 | 描述 |
    | --- | --- |
    | `/tts on\|off\|status\|chat\|latest\|provider\|limit\|summary\|audio\|help` | 控制 TTS。参见 [TTS](/zh/tools/tts) |
    | `/activation mention\|always` | 设置群组激活模式 |
    | `/bash <command>` | 运行主机 Shell 命令。别名：`! <command>`。需要 `commands.bash: true` |
    | `!poll [sessionId]` | 检查后台 bash 任务 |
    | `!stop [sessionId]` | 停止后台 bash 任务 |
  </Accordion>
</AccordionGroup>

### Dock 命令

Dock 命令将活动会话的回复路由切换到另一个链接渠道。有关设置和故障排除，请参阅[渠道对接](/zh/concepts/channel-docking)。

由支持原生命令的渠道插件生成：

- `/dock-discord`（别名：`/dock_discord`）
- `/dock-mattermost`（别名：`/dock_mattermost`）
- `/dock-slack`（别名：`/dock_slack`）
- `/dock-telegram`（别名：`/dock_telegram`）

Dock 命令需要 `session.identityLinks`。源发送者和目标对等方必须在同一个身份组中。

### 捆绑插件命令

| 命令                                                                                         | 描述                                                                     |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `/dreaming [on\|off\|status\|help]`                                                          | 切换记忆梦境。请参阅[梦境](/zh/concepts/dreaming)                        |
| `/pair [qr\|status\|pending\|approve\|cleanup\|notify]`                                      | 管理设备配对。请参阅[配对](/zh/channels/pairing)                         |
| `/phone status\|arm ...\|disarm`                                                             | 临时启用高风险电话节点命令                                               |
| `/voice status\|list\|set <voiceId>`                                                         | 管理 Talk 语音配置。Discord 原生名称：Discord`/talkvoice`                |
| `/card ...`                                                                                  | 发送 LINE 富卡片预设。请参阅[LINE](/zh/channels/line)                    |
| `/codex status\|models\|threads\|resume\|compact\|review\|diagnostics\|account\|mcp\|skills` | 控制 Codex 应用服务器线束。请参阅[Codex 线束](/zh/plugins/codex-harness) |

仅限 QQBot：`/bot-ping`、`/bot-version`、`/bot-help`、`/bot-upgrade`、`/bot-logs`

### Skills 命令

用户可调用的技能以斜杠命令的形式公开：

- `/skill <name> [input]` 始终作为通用入口点工作。
- 技能可以注册为直接命令（例如，针对 OpenProse 的 `/prose`OpenProse）。
- 原生技能命令注册由 `commands.nativeSkills` 和
  `channels.<provider>.commands.nativeSkills` 控制。
- 名称被清理为 `a-z0-9_`（最多 32 个字符）；冲突将获得数字后缀。

<AccordionGroup>
  <Accordion title="Skill command dispatch">
    默认情况下，Skills 命令会作为普通请求路由到模型。

    Skills 可以声明 `command-dispatch: tool` 以直接路由到工具
    （确定性的，不涉及模型）。示例：`/prose` (OpenProse 插件)
    — 参见 [OpenProse](/zh/prose)。

  </Accordion>
  <Accordion title="Native command arguments">
    当缺少必需的参数时，Discord 会使用自动补全功能来显示动态选项和按钮菜单。Telegram 和 Slack 会为带有选择的命令显示按钮菜单。动态选择是针对目标会话模型解析的，因此特定于模型的选项（如 `/think` 级别）会遵循会话的 `/model` 覆盖设置。
  </Accordion>
</AccordionGroup>

## `/tools` — 代理当前可用的内容

`/tools` 回答了一个运行时问题：**此代理在此对话中此时此刻可以使用什么** — 而不是静态的配置目录。

```text
/tools         # compact view
/tools verbose # with short descriptions
```

结果的作用域限定于会话。更改代理、渠道、线程、发送者授权或模型可能会改变输出。如需编辑配置文件和覆盖设置，请使用控制 UI 工具面板或配置界面。

## `/model` — 模型选择

```text
/model             # show model picker
/model list        # same
/model 3           # select by number from picker
/model openai/gpt-5.4
/model opus@anthropic:default
/model status      # detailed view with endpoint and API mode
```

在 Discord 上，`/model` 和 `/models` 会打开一个交互式选择器，其中包含提供商和模型下拉菜单。该选择器遵循 `agents.defaults.models`，包括
`provider/*` 条目。

## `/config` — 磁盘配置写入

<Note>仅限所有者。默认禁用 — 通过 `commands.config: true` 启用。</Note>

```text
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

配置在写入前会经过验证。无效的更改将被拒绝。`/config`
更新在重启后依然保留。

## `/mcp` — MCP 服务器配置

<Note>仅限所有者。默认禁用 — 通过 `commands.mcp: true` 启用。</Note>

```text
/mcp show
/mcp show context7
/mcp set context7={"command":"uvx","args":["context7-mcp"]}
/mcp unset context7
```

`/mcp` 将配置存储在 OpenClaw 配置中，而不是 embedded-agent 项目设置中。

## `/debug` — 仅运行时覆盖

<Note>仅限所有者。默认禁用 — 通过 `commands.debug: true` 启用。 覆盖项会立即应用于新的配置读取，但**不会**写入磁盘。</Note>

```text
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

## `/plugins` — 插件管理

<Note>写入操作仅限所有者。默认禁用 — 通过 `commands.plugins: true` 启用。</Note>

```text
/plugins
/plugins list
/plugin show context7
/plugins enable context7
/plugins disable context7
/plugins install ./path/to/plugin
```

`/plugins enable|disable` 更新插件配置并为新的智能体回合热重载 Gateway(网关) 插件运行时。`/plugins install` 会自动重启受管理的 Gateway，因为插件源模块发生了更改。

## `/trace` — 插件跟踪输出

```text
/trace          # show current trace state
/trace on
/trace off
```

`/trace` 在不启用完整详细模式的情况下，显示会话范围的插件跟踪/调试行。它不替代 `/debug`（运行时覆盖）或 `/verbose`（正常工具输出）。

## `/btw` — 旁置问题

`/btw` 是关于当前会话上下文的快速旁置问题。别名：`/side`。

```text
/btw what are we doing right now?
/side what changed while the main run continued?
```

与普通消息不同：

- 使用当前会话作为背景上下文。
- 在 Codex harness 会话中，作为临时 Codex 侧边线程运行。
- **不会**更改未来的会话上下文。
- 不会写入到对话记录历史中。

有关完整行为，请参阅 [BTW side questions](/zh/tools/btw)。

## Surface notes

<AccordionGroup>
  <Accordion title="Session scoping per surface">
    - **Text commands:** 在正常聊天会话中运行（私信共享 `main`Discord，群组拥有各自的会话）。
    - **Native Discord commands:** `agent:<agentId>:discord:slash:<userId>`Slack
    - **Native Slack commands:** `agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix`Telegram 配置）
    - **Native Telegram commands:** `telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 定位聊天会话）
    - **`/stop`** 定位活动聊天会话以中止当前运行。

  </Accordion>
  <Accordion title="SlackSlack specifics">
    `channels.slack.slashCommand` 支持单个 `/openclaw` 风格的命令。
    使用 `commands.native: true`Slack，为每个内置命令创建一个 Slack 斜杠命令。
    注册 `/agentstatus`（而非 `/status`Slack），因为 Slack 保留了 `/status`。
    文本 `/status`Slack 在 Slack 消息中仍然有效。
  </Accordion>
  <Accordion title="Fast path and inline shortcuts">
    - 来自白名单发送者的纯命令消息会被立即处理（绕过队列 + 模型）。
    - 内联快捷方式（`/help`、`/commands`、`/status`、`/whoami`）也可以嵌入在普通消息中工作，并在模型看到剩余文本之前被剥离。
    - 未授权的纯命令消息将被静默忽略；内联 `/...` 标记将被视为纯文本。

  </Accordion>
  <Accordion title="参数说明">
    - 命令接受命令和参数之间的可选 `:`（`/think: high`，`/send: on`）。
    - `/new <model>` 接受模型别名、`provider/model` 或提供商名称（模糊匹配）；如果无匹配，文本将被视为消息正文。
    - `/allowlist add|remove` 需要 `commands.config: true` 并遵守渠道 `configWrites`。

  </Accordion>
</AccordionGroup>

## 提供商使用情况和状态

- **提供商使用/配额**（例如，“Claude 剩余 80%”）在启用使用跟踪时会显示在 `/status` 中，针对当前模型提供商。
- 当实时会话快照稀疏时，`/status` 中的 **Token/缓存行** 可以回退到最新的转录本使用条目。
- **执行与运行时：** `/status` 报告有效沙箱路径的 `Execution` 以及谁正在运行会话的 `Runtime`：`OpenClaw Default`、`OpenAI Codex`CLI、CLI 后端或 ACP 后端。
- **每次响应的 Token/成本：** 由 `/usage off|tokens|full` 控制。
- `/model status` 关乎模型/身份验证/端点，而非使用情况。

## 相关

<CardGroup cols={2}>
  <Card title="Skills" href="/zh/tools/skills" icon="puzzle-piece">
    Skills 斜杠命令的注册和拦截方式。
  </Card>
  <Card title="创建 Skills" href="/zh/tools/creating-skills" icon="hammer">
    构建一个注册自身斜杠命令的 Skill。
  </Card>
  <Card title="BTW" href="/zh/tools/btw" icon="comments">
    不改变会话上下文的旁注问题。
  </Card>
  <Card title="Steer" href="/zh/tools/steer" icon="compass">
    使用 `/steer` 在运行中引导代理。
  </Card>
</CardGroup>
