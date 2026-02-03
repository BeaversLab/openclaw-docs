---
title: "斜杠命令"
summary: "斜杠命令：文本 vs 原生、配置与支持的命令"
read_when:
  - 使用或配置聊天命令
  - 排查命令路由或权限
---

# 斜杠命令

命令由 Gateway 处理。多数命令必须作为 **独立** 消息发送，并以 `/` 开头。
仅宿主机 bash 聊天命令使用 `! <cmd>`（`/bash <cmd>` 为别名）。

有两个相关系统：

- **Commands**：独立的 `/...` 消息。
- **Directives**：`/think`、`/verbose`、`/reasoning`、`/elevated`、`/exec`、`/model`、`/queue`。
  - 指令会在模型看到消息前被剥离。
  - 在普通聊天消息中（非仅指令），它们作为“行内提示”，**不会** 持久化会话设置。
  - 在仅指令消息中（消息只包含指令），它们会持久化到会话，并回复确认。
  - 指令仅对 **授权发送者** 生效（频道 allowlist/配对 + `commands.useAccessGroups`）。
    未授权发送者的指令会被当作普通文本。

还有少量 **行内快捷方式**（仅 allowlist/授权发送者）：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
它们会立即执行，在模型看到消息前被剥离，其余文本继续走正常流程。

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
    useAccessGroups: true,
  },
}
```

- `commands.text`（默认 `true`）启用聊天消息中的 `/...` 解析。
  - 在没有原生命令的渠道（WhatsApp/WebChat/Signal/iMessage/Google Chat/MS Teams），即使设为 `false` 文本命令仍可用。
- `commands.native`（默认 `"auto"`）注册原生命令。
  - Auto：Discord/Telegram 开启；Slack 关闭（直到你创建斜杠命令）；对不支持原生命令的 provider 忽略。
  - 可用 `channels.discord.commands.native`、`channels.telegram.commands.native` 或 `channels.slack.commands.native` 覆盖每个 provider（bool 或 `"auto"`）。
  - `false` 会在启动时清除 Discord/Telegram 上已注册的命令。Slack 命令在 Slack 应用中管理，不能自动移除。
- `commands.nativeSkills`（默认 `"auto"`）在支持的平台原生注册 **技能** 命令。
  - Auto：Discord/Telegram 开启；Slack 关闭（Slack 需为每个技能创建斜杠命令）。
  - 可用 `channels.discord.commands.nativeSkills`、`channels.telegram.commands.nativeSkills` 或 `channels.slack.commands.nativeSkills` 覆盖（bool 或 `"auto"`）。
- `commands.bash`（默认 `false`）启用 `! <cmd>` 执行宿主机 shell 命令（`/bash <cmd>` 为别名；需要 `tools.elevated` allowlist）。
- `commands.bashForegroundMs`（默认 `2000`）控制 bash 等待多长时间后切到后台（`0` 表示立即后台）。
- `commands.config`（默认 `false`）启用 `/config`（读写 `openclaw.json`）。
- `commands.debug`（默认 `false`）启用 `/debug`（仅运行时覆盖）。
- `commands.useAccessGroups`（默认 `true`）对命令执行 allowlist/策略。

## 命令列表

文本 + 原生（启用时）：

- `/help`
- `/commands`
- `/skill <name> [input]`（按名称运行技能）
- `/status`（显示当前状态；可用时包含当前模型 provider 的用量/配额）
- `/allowlist`（列出/新增/移除 allowlist）
- `/approve <id> allow-once|allow-always|deny`（处理 exec 审批提示）
- `/context [list|detail|json]`（解释“上下文”；`detail` 展示按文件/工具/技能/系统提示的大小）
- `/whoami`（显示发送者 id；别名：`/id`）
- `/subagents list|stop|log|info|send`（查看、停止、日志或发送子 agent 运行）
- `/config show|get|set|unset`（写入磁盘，owner-only；需 `commands.config: true`）
- `/debug show|set|unset|reset`（运行时覆盖，owner-only；需 `commands.debug: true`）
- `/usage off|tokens|full|cost`（每条回复的用量脚注或本地成本摘要）
- `/tts off|always|inbound|tagged|status|provider|limit|summary|audio`（控制 TTS；见 [/tts](/zh/tts)）
  - Discord：原生命令为 `/voice`（Discord 保留 `/tts`）；文本 `/tts` 仍可用。
- `/stop`
- `/restart`
- `/dock-telegram`（别名：`/dock_telegram`）（切换回复到 Telegram）
- `/dock-discord`（别名：`/dock_discord`）（切换回复到 Discord）
- `/dock-slack`（别名：`/dock_slack`）（切换回复到 Slack）
- `/activation mention|always`（仅群组）
- `/send on|off|inherit`（owner-only）
- `/reset` 或 `/new [model]`（可选模型提示；剩余文本继续处理）
- `/think <off|minimal|low|medium|high|xhigh>`（动态取决于模型/provider；别名：`/thinking`、`/t`）
- `/verbose on|full|off`（别名：`/v`）
- `/reasoning on|off|stream`（别名：`/reason`；开启时会发送 `Reasoning:` 前缀的单独消息；`stream` = 仅 Telegram 草稿）
- `/elevated on|off|ask|full`（别名：`/elev`；`full` 跳过 exec 审批）
- `/exec host=<sandbox|gateway|node> security=<deny|allowlist|full> ask=<off|on-miss|always> node=<id>`（发送 `/exec` 以查看当前设置）
- `/model <name>`（别名：`/models`；或 `/<alias>` 来自 `agents.defaults.models.*.alias`）
- `/queue <mode>`（可带选项如 `debounce:2s cap:25 drop:summarize`；发送 `/queue` 查看当前设置）
- `/bash <command>`（仅宿主机；`! <command>` 别名；需 `commands.bash: true` + `tools.elevated` allowlist）

仅文本：

- `/compact [instructions]`（见 [/concepts/compaction](/zh/concepts/compaction)）
- `! <command>`（仅宿主机；一次一个；长任务用 `!poll` + `!stop`）
- `!poll`（查看输出/状态；可选 `sessionId`；`/bash poll` 也可用）
- `!stop`（停止运行中的 bash 任务；可选 `sessionId`；`/bash stop` 也可用）

说明：

- 命令可在命令与参数之间使用可选的 `:`（如 `/think: high`、`/send: on`、`/help:`）。
- `/new <model>` 接受模型别名、`provider/model` 或 provider 名（模糊匹配）；若无匹配则把文本视为消息体。
- 若要查看完整 provider 用量拆解，使用 `openclaw status --usage`。
- `/allowlist add|remove` 需要 `commands.config=true` 并遵守频道 `configWrites`。
- `/usage` 控制每条回复的 usage 脚注；`/usage cost` 会从 OpenClaw 会话日志输出本地成本摘要。
- `/restart` 默认禁用；设置 `commands.restart: true` 启用。
- `/verbose` 仅用于调试与增强可见性；正常使用请 **保持关闭**。
- `/reasoning`（及 `/verbose`）在群组中有风险：可能暴露内部推理或工具输出。建议关闭，尤其在群聊中。
- **快速路径：** allowlist 发送者的仅命令消息会立即处理（绕过队列 + 模型）。
- **群组提及门控：** allowlist 发送者的仅命令消息会绕过提及要求。
- **行内快捷方式（仅 allowlist 发送者）：** 某些命令嵌入普通消息时也可生效，且会在模型看到之前剥离。
  - 示例：`hey /status` 会触发状态回复，其余文本继续正常流程。
- 当前支持：`/help`、`/commands`、`/status`、`/whoami`（`/id`）。
- 未授权的仅命令消息会被静默忽略，行内 `/...` 会当作普通文本。
- **技能命令：** `user-invocable` 技能会以斜杠命令形式暴露。名称会清理为 `a-z0-9_`（最长 32 字符）；冲突会追加数字后缀（如 `_2`）。
  - `/skill <name> [input]` 按名称运行技能（原生命令限制时很有用）。
  - 默认情况下，技能命令会作为普通请求转发给模型。
  - 技能可选声明 `command-dispatch: tool`，把命令直接路由到工具（确定性、无需模型）。
  - 示例：`/prose`（OpenProse 插件）— 见 [OpenProse](/zh/prose)。
- **原生命令参数：** Discord 使用自动补全动态选项（省略必需参数时也显示按钮菜单）。Telegram 与 Slack 在命令支持选项且你省略参数时显示按钮菜单。

## 使用面（哪里显示什么）

- **Provider 用量/配额**（如“Claude 80% left”）在启用用量跟踪时，会显示在 `/status` 中（当前模型 provider）。
- **每条回复 tokens/cost** 由 `/usage off|tokens|full` 控制（附加在正常回复后）。
- `/model status` 关注 **模型/认证/端点**，不是用量。

## 模型选择（`/model`）

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

说明：

- `/model` 与 `/model list` 显示紧凑编号选择器（模型家族 + 可用 providers）。
- `/model <#>` 从该选择器选择（尽可能优先当前 provider）。
- `/model status` 显示详细视图，包括已配置 provider 端点（`baseUrl`）与 API 模式（`api`）。

## Debug 覆盖

`/debug` 允许设置 **仅运行时** 配置覆盖（内存，不写磁盘）。仅 owner。默认禁用，需 `commands.debug: true`。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug set channels.whatsapp.allowFrom=["+1555","+4477"]
/debug unset messages.responsePrefix
/debug reset
```

说明：

- 覆盖会立即生效，但 **不会** 写入 `openclaw.json`。
- 使用 `/debug reset` 清除所有覆盖并恢复磁盘配置。

## 配置更新

`/config` 写入磁盘配置（`openclaw.json`）。仅 owner。默认禁用，需 `commands.config: true`。

示例：

```
/config show
/config show messages.responsePrefix
/config get messages.responsePrefix
/config set messages.responsePrefix="[openclaw]"
/config unset messages.responsePrefix
```

说明：

- 配置在写入前会校验；无效变更会被拒绝。
- `/config` 的更新会跨重启持久化。

## 使用面说明

- **文本命令** 运行在正常聊天会话中（私聊共享 `main`，群聊拥有独立会话）。
- **原生命令** 使用隔离会话：
  - Discord：`agent:<agentId>:discord:slash:<userId>`
  - Slack：`agent:<agentId>:slack:slash:<userId>`（前缀可通过 `channels.slack.slashCommand.sessionPrefix` 配置）
  - Telegram：`telegram:slash:<userId>`（通过 `CommandTargetSessionKey` 绑定到聊天会话）
- **`/stop`** 作用于当前聊天会话，用于中止运行。
- **Slack：** 仍支持 `channels.slack.slashCommand`（单一 `/openclaw` 风格命令）。若启用 `commands.native`，需为每个内置命令创建 Slack 斜杠命令（名称与 `/help` 等一致）。Slack 的命令参数菜单通过 ephemeral Block Kit 按钮呈现。
