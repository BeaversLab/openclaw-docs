---
summary: "高级 Exec 批准：安全二进制文件、解释器绑定、批准转发、原生投递"
read_when:
  - Configuring safe bins or custom safe-bin profiles
  - Forwarding approvals to Slack/Discord/Telegram or other chat channels
  - Implementing a native approval client for a channel
title: "Exec 批准 — 高级"
---

高级执行审批主题：`safeBins` 快速路径、解释器/运行时绑定，以及向聊天渠道（包括原生投递）转发审批。有关核心策略和审批流程，请参阅 [Exec approvals](/zh/tools/exec-approvals)。

## 安全二进制文件（仅 stdin）

`tools.exec.safeBins` 定义了一小部分 **stdin-only**（仅标准输入）二进制文件（例如
`cut`），它们可以在 **没有** 明确允许列表条目的情况下在允许列表模式下运行。
安全二进制文件会拒绝位置文件参数和类似路径的标记，因此它们只能对传入流进行操作。
请将其视为流过滤器的狭窄快速路径，而不是通用信任列表。

<Warning>
请 **勿** 将解释器或运行时二进制文件（例如 `python3`、`node`、
`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins` 中。
如果命令可以设计为评估代码、执行子命令或读取文件，则首选明确的允许列表条目
并保持批准提示已启用。自定义安全二进制文件必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式配置文件。
</Warning>

默认安全二进制文件：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`、`uniq`、`head`、`tail`、`tr`、`wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果您选择加入，请为它们的非 stdin 工作流程保留明确的允许列表条目。
对于安全二进制模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；
位置参数模式形式会被拒绝，以防止文件操作数被作为模糊的位置参数混入。

### Argv 验证和拒绝的标志

验证仅根据 argv 形状确定性进行（不检查主机文件系统是否存在），这防止了通过允许/拒绝差异产生文件存在预言行为。默认安全二进制文件拒绝面向文件的选项；长选项以故障关闭方式验证（未知标志和模糊缩写会被拒绝）。

按安全二进制文件配置拒绝的标志：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`、`--from-file`、`--library-path`、`--rawfile`、`--slurpfile`、`-L`、`-f`
- `sort`: `--compress-program`、`--files0-from`、`--output`、`--random-source`、`--temporary-directory`、`-T`、`-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

对于仅 stdin 的片段，安全 Bin 还强制在执行时将 argv 标记视为**字面文本**（不进行 glob 展开，也不进行 `$VARS` 展开），因此无法使用 `*` 或 `$HOME/...` 等模式来窃取文件读取权限。

### 受信任的二进制目录

安全 Bin 必须从受信任的二进制目录解析（系统默认值加上可选的 `tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会自动受信任。默认的受信任目录故意设置为最少：`/bin`、`/usr/bin`。如果您的安全 Bin 可执行文件位于包管理器/用户路径（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`）中，请将其显式添加到 `tools.exec.safeBinTrustedDirs`。

### Shell 链接、包装器和多路复用器

当每个顶级段都满足允许列表（包括安全 bins 或技能自动允许）时，允许使用 Shell 链接（`&&`、`||`、`;`）。在允许列表模式下不支持重定向。在允许列表解析期间会拒绝命令替换（`$()` / 反引号），包括在双引号内；如果您需要字面 `$()` 文本，请使用单引号。

在 macOS 伴随应用批准中，包含 shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 shell 文本将被视为允许列表未命中，除非 shell 二进制文件本身在允许列表中。

对于 shell 封装器（`bash|sh|zsh ... -c/-lc`），请求范围的环境覆盖将减少为一小部分明确的允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。

对于允许列表模式下的 `allow-always` 决策，已知的调度封装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）会保留内部可执行文件路径而不是封装器路径。Shell 多路复用器（`busybox`、`toybox`）也会以相同方式为 shell 小程序（`sh`、`ash` 等）进行解包。如果无法安全地解封装器或多路复用器，则不会自动保留允许列表条目。

如果你将解释器（如 `python3` 或 `node`）加入允许列表，请首选
`tools.exec.strictInlineEval=true`，这样内联 eval 仍然需要明确的
批准。在严格模式下，`allow-always` 仍然可以持久化良性
的解释器/脚本调用，但 inline-eval 载体不会自动持久化。

### 安全二进制文件与允许列表

| 主题     | `tools.exec.safeBins`                  | 允许列表 (`exec-approvals.json`)                                   |
| -------- | -------------------------------------- | ------------------------------------------------------------------ |
| 目标     | 自动允许狭窄的 stdin 过滤器            | 显式信任特定可执行文件                                             |
| 匹配类型 | 可执行文件名称 + 安全二进制 argv 策略  | 已解析的可执行文件路径 glob，或针对 PATH 调用命令的裸命令名称 glob |
| 参数范围 | 受安全二进制配置文件和字面标记规则限制 | 默认按路径匹配；可选的 `argPattern` 可以限制已解析的 argv          |
| 典型示例 | `head`、`tail`、`tr`、`wc`             | `jq`、`python3`、`node`、`ffmpeg`、自定义 CLI                      |
| 最佳用途 | 管道中的低风险文本转换                 | 具有更广泛行为或副作用的任何工具                                   |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或每个代理的 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或每个代理的 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或每个代理的 `agents.list[].tools.exec.safeBinProfiles`）。每个代理的配置文件键会覆盖全局键。
- 允许列表条目位于主机本地的 `~/.openclaw/exec-approvals.json` 下的 `agents.<id>.allowlist` 中（或通过 Control UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制文件在没有显式配置文件的情况下出现在 `safeBins` 中时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目搭建为 `{}`（之后请审查并收紧）。解释器/运行时二进制文件不会自动搭建。

自定义配置文件示例：

```json5
{
  tools: {
    exec: {
      safeBins: ["jq", "myfilter"],
      safeBinProfiles: {
        myfilter: {
          minPositional: 0,
          maxPositional: 0,
          allowedValueFlags: ["-n", "--limit"],
          deniedFlags: ["-f", "--file", "-c", "--command"],
        },
      },
    },
  },
}
```

如果你明确选择将 `jq` 加入 `safeBins`OpenClaw，OpenClaw 仍会在安全二进制
模式下拒绝 `env` 内置命令，因此 `jq -n env` 无法在没有显式允许列表路径
或批准提示的情况下转储主机进程环境。

## 解释器/运行时命令

基于批准的解释器/运行时运行是刻意保守的：

- 精确的 argv/cwd/env 上下文始终是绑定的。
- 直接 shell 脚本和直接运行时文件形式会尽力绑定到一个具体的本地文件快照。
- 仍解析为一个直接本地文件的常见包管理器包装器形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）会在绑定之前被解包。
- 如果 OpenClaw 无法为解释器/运行时命令确定一个具体的本地文件（例如包脚本、eval 形式、特定于运行时的加载器链或歧义的多文件形式），将拒绝基于批准的执行，而不是声称其不具备的语义覆盖范围。
- 对于这些工作流，首选沙箱隔离、独立的主机边界，或显式受信任的允许列表/完整工作流，其中操作员接受更广泛的运行时语义。

当需要审批时，exec 工具会立即返回一个审批 ID。使用该 ID 来关联后续已批准运行的系统事件（`Exec finished` 以及配置时的 `Exec running`）。
如果在超时之前没有收到决定，该请求将被视为审批超时，并作为最终拒绝呈现，而不是代理唤醒系统事件。

### 后续交付行为

批准的异步 exec 完成后，OpenClaw 会向同一会话发送后续 `agent` 回合。

- 如果存在有效的外部交付目标（可交付渠道加上目标 `to`），后续交付将使用该渠道。
- 在没有外部目标的仅网络聊天或内部会话流程中，后续交付保持仅会话模式（`deliver: false`）。
- 如果调用方明确要求严格的外部交付但没有可解析的外部渠道，请求将失败并返回 `INVALID_REQUEST`。
- 如果启用了 `bestEffortDeliver` 且无法解析外部渠道，交付将被降级为仅会话模式，而不是失败。

## 审批转发到聊天渠道

您可以将 exec 审批提示转发到任何聊天渠道（包括插件渠道），并使用 `/approve` 进行批准。这使用正常的出站交付管道。

配置：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "session", // "session" | "targets" | "both"
      agentFilter: ["main"],
      sessionFilter: ["discord"], // substring or regex
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

在聊天中回复：

```
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

`/approve` 命令同时处理 exec 审批和插件审批。如果该 ID 不匹配待处理的 exec 审批，它会自动检查插件审批。

### 插件审批转发

插件审批转发使用与执行审批相同的投递管道，但在 `approvals.plugin` 下拥有自己的独立配置。启用或禁用其中一个不会影响另一个。有关插件编写行为、请求字段和决策语义，请参阅 [Plugin permission requests](/zh/plugins/plugin-permission-requests)。

```json5
{
  approvals: {
    plugin: {
      enabled: true,
      mode: "targets",
      agentFilter: ["main"],
      targets: [
        { channel: "slack", to: "U12345678" },
        { channel: "telegram", to: "123456789" },
      ],
    },
  },
}
```

配置形状与 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、
`sessionFilter` 和 `targets` 的工作方式相同。

支持共享交互式回复的渠道会为 exec 批准和插件批准渲染相同的批准按钮。不支持共享交互式 UI 的渠道会回退到纯文本，并附带 `/approve` 指令。插件批准请求可能会限制可用的决策。批准界面会使用请求中声明的决策集，并且 Gateway(网关) 会拒绝提交未被提供的决策的尝试。

### 在任何渠道上进行同聊审批

当 exec 或插件批准请求源自可发送消息的聊天界面时，默认情况下，该聊天现在可以使用 `/approve` 对其进行批准。除了现有的 Web UI 和终端 UI 流程外，这还适用于 Slack、Matrix 和 Microsoft Teams 等渠道。

此共享文本命令路径使用该对话的正常渠道身份验证模型。如果发起聊天的渠道已经可以发送命令并接收回复，则审批请求不再需要单独的本地投递适配器来保持待处理状态。

Discord 和 Telegram 也支持同聊天 `/approve`，但即使禁用了原生批准传递，这些渠道仍使用其解析的批准者列表进行授权。

对于 Telegram 和其他直接调用 Gateway(网关) 的原生审批客户端，此回退机制有意限制为“未找到审批”失败。真正的 exec 审批拒绝/错误不会作为插件审批静默重试。

### 原生审批传递

某些渠道也可以充当原生批准客户端。除了共享的同聊天 `/approve` 流程之外，原生客户端还增加了批准者私信、原始聊天扩散以及特定渠道的交互式批准 UX。

当提供原生批准卡片/按钮时，该原生 UI 是面向代理的主要路径。除非工具结果表明聊天批准不可用或手动批准是唯一剩余的路径，否则代理不应重复输出纯聊天 `/approve` 指令。

如果配置了原生批准客户端，但发起渠道没有活跃的原生运行时，OpenClaw 会保持本地确定性 `/approve` 提示可见。如果原生运行时处于活跃状态并尝试传递，但没有目标接收到卡片，OpenClaw 会发送一条带有确切 `/approve <id> <decision>` 指令的同聊天回退通知，以便仍可解决该请求。

通用模型：

- 主机 exec 策略仍然决定是否需要 exec 审批
- `approvals.exec` 控制将批准提示转发到其他聊天目标
- `channels.<channel>.execApprovals` 控制是否启用 Discord、Slack、Telegram 和类似的特定于渠道的原生客户端
- 当请求来自 Slack 且 Slack 插件批准者进行解析时，Slack 插件批准可以使用 Slack 的原生批准客户端；即使 Slack 批准已禁用，`approvals.plugin` 也可以将插件批准路由到 Slack 会话或目标
- WhatsApp 和 Signal 反应审批投递受 `approvals.exec` 和 `approvals.plugin` 限制；它们没有 `channels.<channel>.execApprovals` 块

当满足以下所有条件时，原生批准客户端会自动启用优先私信交付：

- 渠道支持原生批准交付
- 审批人可以从显式 `execApprovals.approvers` 或所有者身份（例如 `commands.ownerAllowFrom`）中解析
- `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"`

设置 `enabled: false` 以显式禁用原生审批客户端。设置 `enabled: true` 以在解析出审批人时强制启用它。公共原始聊天投递通过 `channels.<channel>.execApprovals.target` 保持显式。

常见问题：[Why are there two exec approval configs for chat approvals?](/zh/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`
- WhatsApp：使用 `approvals.exec` 和 `approvals.plugin` 将审批提示路由到 WhatsApp
- Signal：使用 `approvals.exec` 和 `approvals.plugin` 将审批提示路由到 Signal

这些原生审批客户端在共享的 same-chat `/approve` 流程和共享审批按钮的基础上，增加了私信路由和可选的渠道扩散。

共享行为：

- Slack、Matrix、Microsoft Teams 和类似的可投递聊天使用标准的渠道授权模型来处理 same-chat `/approve`
- 当原生审批客户端自动启用时，默认的原生投递目标是审批者的私信
- 对于 Discord 和 Telegram，只有已解析的审批者可以批准或拒绝
- Discord 审批者可以是显式的 (`execApprovals.approvers`) 或从 `commands.ownerAllowFrom` 推断得出
- Telegram 审批者可以是显式的 (`execApprovals.approvers`) 或从 `commands.ownerAllowFrom` 推断得出
- Slack 审批者可以是显式的 (`execApprovals.approvers`) 或从 `commands.ownerAllowFrom` 推断得出
- Slack 插件审批私信使用来自 `allowFrom` 和账户默认路由的 Slack 插件审批者，而不是 Slack exec 审批者
- Slack 原生按钮保留审批 id 类型，因此 `plugin:` id 可以解析插件审批，而无需第二个 Slack 本地回退层
- WhatsApp 表情符号审批仅在匹配的顶级转发系列已启用并路由到 WhatsApp 时处理 exec 和插件提示；仅目标的 WhatsApp 转发保留在共享转发路径上，除非它匹配相同的原生来源目标
- Signal 反应批准仅在匹配的顶级转发系列已启用并路由到 Signal 时，才处理 exec 和插件提示。直接同聊天 Signal exec 批准可以在没有明确批准人的情况下抑制本地 `/approve` 后备选项；Signal 反应解决仍然需要来自 `channels.signal.allowFrom` 或 `defaultTo` 的明确 Signal 批准人。
- Matrix 原生 私信/渠道 路由和反应快捷方式处理 exec 和插件批准；插件授权仍然来自 `channels.matrix.dm.allowFrom`
- Matrix 原生提示在第一个提示事件上包含 `com.openclaw.approval` 自定义事件内容，因此支持 OpenClaw 的 Matrix 客户端可以读取结构化的批准状态，而标准客户端则保留纯文本 `/approve` 后备选项
- 请求者不需要是批准人
- 当原始聊天已经支持命令和回复时，它可以使用 `/approve` 直接批准
- 原生 Discord 批准按钮按批准 ID 类型路由：`plugin:` ID 直接进入插件批准，其他所有内容进入 exec 批准
- 原生 Telegram 批准按钮遵循与 `/approve` 相同的有界 exec 到插件后备逻辑
- 当原生 `target` 启用原始聊天传送时，批准提示包含命令文本
- 待处理的 exec 批准默认在 30 分钟后过期
- 如果没有操作员 UI 或配置的批准客户端可以接受该请求，提示将回退到 `askFallback`

敏感的仅限所有者的群组命令（如 `/diagnostics` 和 `/export-trajectory`）使用私有所有者路由来发送审批提示和最终结果。OpenClaw 首先尝试在所有者运行命令的同一界面上使用私有路由。如果该界面没有私有所有者路由，它将回退到 `commands.ownerAllowFrom` 中的第一个可用所有者路由，因此当 Discord 是配置的主要私有界面时，Telegram 群组命令仍可将审批和结果发送到所有者的 Telegram 私信。群组聊天只会收到简短的确认。

Telegram 默认使用审批者私信（`target: "dm"`）。当您希望审批提示也出现在发起的 Telegram 聊天/主题中时，您可以切换到 `channel` 或 `both`。对于 Telegram 论坛主题，OpenClaw 会为审批提示和审批后的后续跟进保留该主题。

参见：

- [Discord](/zh/channels/discord)
- [Telegram](/zh/channels/telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全说明：

- Unix 套接字模式 `0600`，令牌存储在 `exec-approvals.json` 中。
- 相同 UID 对等方检查。
- 挑战/响应（nonce + HMAC 令牌 + 请求哈希）+ 短 TTL。

## 常见问题

### 何时会在审批目标上使用 `accountId` 和 `threadId`？

当渠道配置了多个身份且审批提示必须通过一个特定帐户发出时，请使用 `accountId`。当目标支持主题或线程且提示应保留在该线程内而不是顶级聊天中时，请使用 `threadId`。

一个具体的 Telegram 案例是包含论坛主题和两个 Telegram 机器人账户的运营超级群组。`to` 值指定了超级群组，`accountId` 选择了机器人账户，而 `threadId` 选择了论坛主题：

```json5
{
  approvals: {
    exec: {
      enabled: true,
      mode: "targets",
      targets: [
        {
          channel: "telegram",
          to: "-1001234567890",
          accountId: "ops-bot",
          threadId: "77",
        },
      ],
    },
  },
  channels: {
    telegram: {
      accounts: {
        default: {
          name: "Primary bot",
          botToken: "env:TELEGRAM_PRIMARY_BOT_TOKEN",
        },
        "ops-bot": {
          name: "Operations bot",
          botToken: "env:TELEGRAM_OPS_BOT_TOKEN",
        },
      },
    },
  },
}
```

通过该设置，转发的执行审批会由 `ops-bot` Telegram 账户发布到聊天 `-1001234567890` 的主题 `77` 中。没有 `accountId` 的目标使用渠道的默认账户，而没有 `threadId` 的目标则发布到顶级目标位置。

### 当审批被发送到会话时，该会话中的任何人都可以批准它们吗？

不。会话传递仅控制提示出现的位置。它本身并不授权该聊天中的每个参与者进行批准。

对于通用同聊天 `/approve`，发送者必须已在该渠道会话中获得命令授权。如果渠道公开了明确的审批批准者，这些批准者即使在该会话中未获得其他命令授权，也可以授权 `/approve` 操作。

某些渠道更严格。Discord、Telegram、Matrix、Slack 原生审批私信以及类似的原生审批客户端使用其解析的批准者列表进行审批授权。例如，Telegram 论坛主题审批提示可能对该主题中的每个人都可见，但只有从 `channels.telegram.execApprovals.approvers` 或 `commands.ownerAllowFrom` 解析出的 Telegram 用户 ID 才能批准或拒绝它。

## 相关

- [执行审批](/zh/tools/exec-approvals) — 核心策略和审批流程
- [Exec 工具](/zh/tools/exec)
- [提权模式](/zh/tools/elevated)
- [Skills](/zh/tools/skills) — 由 Skills 支持的自动允许行为
