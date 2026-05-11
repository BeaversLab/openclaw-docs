---
summary: "高级执行批准：安全二进制文件、解释器绑定、批准转发、原生交付"
read_when:
  - Configuring safe bins or custom safe-bin profiles
  - Forwarding approvals to Slack/Discord/Telegram or other chat channels
  - Implementing a native approval client for a channel
title: "执行批准 — 高级"
---

高级执行批准主题：`safeBins` 快速路径、解释器/运行时
绑定，以及向聊天频道（包括原生交付）转发批准。
有关核心策略和批准流程，请参阅 [执行批准](/zh/tools/exec-approvals)。

## 安全二进制文件（仅 stdin）

`tools.exec.safeBins` 定义了一小部分 **仅 stdin** 二进制文件（例如
`cut`），它们可以在 **没有** 显式允许列表
条目的情况下在允许列表模式下运行。安全二进制文件拒绝位置文件参数和类似路径的标记，因此
它们只能对传入流进行操作。请将其视为流过滤器的狭窄快速路径，
而不是通用信任列表。

<Warning>
请**勿**将解释器或运行时二进制文件（例如 `python3`、`node`、
`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins` 中。如果命令可以评估代码、
执行子命令或按设计读取文件，请首选显式允许列表条目
并保持批准提示已启用。自定义安全二进制文件必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式
配置文件。
</Warning>

默认安全二进制文件：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`、`uniq`、`head`、`tail`、`tr`、`wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果您选择加入，请为其非 stdin 工作流保留显式
允许列表条目。对于安全二进制模式下的 `grep`，
请通过 `-e`/`--regexp` 提供模式；位置参数模式形式将被拒绝，
因此无法将文件操作数作为模糊的位置参数进行走私。

### Argv 验证和拒绝的标志

验证仅根据 argv 形状确定性进行（不检查主机文件系统是否存在），这防止了通过允许/拒绝差异产生文件存在预言行为。默认安全二进制文件拒绝面向文件的选项；长选项以故障关闭方式验证（未知标志和模糊缩写会被拒绝）。

按安全二进制文件配置拒绝的标志：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

对于仅 stdin 段，安全二进制文件还会强制在执行时将 argv 标记视为**纯文本**（无 glob 和无 `$VARS` 展开），因此不能使用 `*` 或 `$HOME/...` 等模式来走私文件读取。

### 受信任的二进制目录

安全二进制文件必须从受信任的二进制目录（系统默认值加上可选的 `tools.exec.safeBinTrustedDirs`）解析。`PATH` 条目永远不会被自动信任。默认受信任的目录是有意保持最低限度的：`/bin`, `/usr/bin`。如果您的安全二进制可执行文件位于包管理器/用户路径中（例如 `/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`），请将它们显式添加到 `tools.exec.safeBinTrustedDirs`。

### Shell 链接、包装器和多路复用器

当每个顶层段都满足允许列表（包括安全 bins 或技能自动允许）时，允许 Shell 链接（`&&`, `||`, `;`）。在允许列表模式下，重定向仍然不受支持。在允许列表解析期间，命令替换（`$()` / 反引号）会被拒绝，包括在双引号内；如果您需要字面意义的 `$()` 文本，请使用单引号。

在 macOS 伴随应用审批中，包含 shell 控制或扩展语法（`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) 的原始 shell 文本将被视为允许列表未命中，除非 shell 二进制文件本身已被列入允许列表。

对于 shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围内的环境覆盖变量会减少为一小部分明确的允许列表（`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`）。

对于允许列表模式下的 `allow-always` 决定，已知的分发包装器（`env`, `nice`, `nohup`, `stdbuf`, `timeout`）会保留内部可执行文件路径而不是包装器路径。Shell 多路复用器（`busybox`, `toybox`）会以相同的方式为 shell 小程序（`sh`, `ash` 等）解包。如果包装器或多路复用器无法安全解包，则不会自动保留任何允许列表条目。

如果您将 `python3` 或 `node` 等解释器加入允许列表，请优先使用 `tools.exec.strictInlineEval=true`，以便内联求值仍需显式批准。在严格模式下，`allow-always` 仍可持久化良性解释器/脚本调用，但不会自动持久化内联求值载体。

### 安全二进制文件与允许列表

| 主题     | `tools.exec.safeBins`                  | 允许列表 (`exec-approvals.json`)                                   |
| -------- | -------------------------------------- | ------------------------------------------------------------------ |
| 目标     | 自动允许狭窄的 stdin 过滤器            | 显式信任特定可执行文件                                             |
| 匹配类型 | 可执行文件名称 + 安全二进制 argv 策略  | 已解析的可执行文件路径 glob，或针对 PATH 调用命令的裸命令名称 glob |
| 参数范围 | 受安全二进制配置文件和字面标记规则限制 | 仅路径匹配；参数否则由您自行负责                                   |
| 典型示例 | `head`、`tail`、`tr`、`wc`             | `jq`、`python3`、`node`、`ffmpeg`、自定义 CLI                      |
| 最佳用途 | 管道中的低风险文本转换                 | 具有更广泛行为或副作用的任何工具                                   |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或特定于代理的 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或特定于代理的 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或特定于代理的 `agents.list[].tools.exec.safeBinProfiles`）。特定于代理的配置文件键会覆盖全局键。
- 允许列表条目驻留在 `agents.<id>.allowlist` 下的主机本地 `~/.openclaw/exec-approvals.json` 中（或通过控制 UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制文件出现在 `safeBins` 中而没有显式配置文件时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目搭建为 `{}`（稍后请进行审查和收紧）。解释器/运行时 bin 不会自动搭建。

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

如果您明确选择将 `jq` 加入 `safeBins`，OpenClaw 仍然会在安全 bin 模式下拒绝 `env` 内置命令，因此 `jq -n env` 无法在没有显式允许列表路径或批准提示的情况下转储主机进程环境。

## 解释器/运行时命令

基于批准的解释器/运行时运行是刻意保守的：

- 精确的 argv/cwd/env 上下文始终是绑定的。
- 直接 shell 脚本和直接运行时文件形式会尽力绑定到一个具体的本地文件快照。
- 仍然解析为一个直接本地文件的常见包管理器包装器形式（例如 `pnpm exec`、`pnpm node`、`npm exec`、`npx`）会在绑定之前被解包。
- 如果 OpenClaw 无法为解释器/运行时命令确定一个具体的本地文件（例如包脚本、eval 形式、特定于运行时的加载器链或歧义的多文件形式），将拒绝基于批准的执行，而不是声称其不具备的语义覆盖范围。
- 对于这些工作流，首选沙箱隔离、独立的主机边界，或显式受信任的允许列表/完整工作流，其中操作员接受更广泛的运行时语义。

当需要批准时，exec 工具会立即返回一个批准 ID。使用该 ID 关联后续系统事件（`Exec finished` / `Exec denied`）。如果在超时之前没有做出决定，该请求将被视为批准超时，并作为拒绝原因显示出来。

### 后续交付行为

批准的异步 exec 完成后，OpenClaw 会向同一会话发送后续 `agent` 轮次。

- 如果存在有效的外部交付目标（可交付渠道加上目标 `to`），后续交付将使用该渠道。
- 在仅网络聊天或没有外部目标的内部会话流程中，后续投递保持仅限会话（`deliver: false`）。
- 如果调用方明确要求严格的外部投递但无法解析外部渠道，该请求将失败并返回 `INVALID_REQUEST`。
- 如果启用了 `bestEffortDeliver` 且无法解析外部渠道，投递将降级为仅限会话，而不是失败。

## 审批转发到聊天渠道

您可以将执行审批提示转发到任何聊天渠道（包括插件渠道），并使用 `/approve` 批准它们。这使用正常的出站投递管道。

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

`/approve` 命令同时处理执行审批和插件审批。如果 ID 与待处理的执行审批不匹配，它会自动检查插件审批。

### 插件审批转发

插件审批转发使用与执行审批相同的投递管道，但在 `approvals.plugin` 下有其独立的配置。启用或禁用一个不会影响另一个。

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

支持共享交互式回复的渠道会为执行审批和插件审批渲染相同的审批按钮。没有共享交互式 UI 的渠道会回退到带有 `/approve`
说明的纯文本。

### 在任何渠道上进行同聊审批

当执行或插件审批请求来自可投递的聊天表面时，默认情况下，同一个聊天现在可以使用 `/approve` 进行批准。这适用于诸如 Slack、Matrix 和
Microsoft Teams 等渠道，以及现有的 Web UI 和终端 UI 流程。

此共享文本命令路径使用该对话的正常渠道身份验证模型。如果发起聊天的渠道已经可以发送命令并接收回复，则审批请求不再需要单独的本地投递适配器来保持待处理状态。

Discord 和 Telegram 也支持同渠道 `/approve`，但即使禁用了原生审批传递，这些渠道仍使用其解析的审批人列表进行授权。

对于 Telegram 和其他直接调用 Gateway(网关) 的原生审批客户端，此回退机制有意限制为“未找到审批”失败。真正的 exec 审批拒绝/错误不会作为插件审批静默重试。

### 原生审批传递

某些渠道也可以充当原生审批客户端。原生客户端在共享的同渠道 `/approve` 流程之上，增加了审批人私信、原始聊天分发以及特定渠道的交互式审批 UX。

当可使用原生审批卡片/按钮时，该原生 UI 是面向代理的主要路径。除非工具结果指示聊天审批不可用或手动审批是仅剩的路径，否则代理不应重复输出纯聊天 `/approve` 命令。

通用模型：

- host exec policy 仍然决定是否需要 exec 审批
- `approvals.exec` 控制将审批提示转发到其他聊天目标
- `channels.<channel>.execApprovals` 控制该渠道是否充当原生审批客户端

当以下所有条件都满足时，原生审批客户端将自动启用“私信优先”传递：

- 该渠道支持原生审批传递
- 可以从显式 `execApprovals.approvers` 或该渠道记录的回退源中解析审批人
- `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"`

设置 `enabled: false` 以明确禁用原生审批客户端。设置 `enabled: true` 以在解析出审批人时强制启用它。公开的原始聊天传递通过 `channels.<channel>.execApprovals.target` 保持显式。

常见问题：[为什么聊天审批有两个 exec 审批配置？](/zh/help/faq-first-run#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord: `channels.discord.execApprovals.*`
- Slack: `channels.slack.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

这些原生审批客户端在共享的同渠道 `/approve` 流程和共享审批按钮之上，增加了私信路由和可选的渠道分发。

共享行为：

- Slack、Matrix、Microsoft Teams 和类似的可投递聊天使用普通渠道身份验证模型进行同聊天 `/approve`
- 当原生审批客户端自动启用时，默认的原生投递目标是审批人私信
- 对于 Discord 和 Telegram，只有已解析的审批人才能批准或拒绝
- Discord 审批人可以是显式的 (`execApprovals.approvers`) 也可以从 `commands.ownerAllowFrom` 推断
- Telegram 审批人可以是显式的 (`execApprovals.approvers`) 也可以从现有所有者配置推断 (`allowFrom`，加上支持私信的 `defaultTo`)
- Slack 审批人可以是显式的 (`execApprovals.approvers`) 也可以从 `commands.ownerAllowFrom` 推断
- Slack 原生按钮保留审批 ID 类型，因此 `plugin:` ID 可以解析插件审批，而无需第二层 Slack 本地回退
- Matrix 原生私信/渠道路由和反应快捷方式处理执行和插件审批；插件授权仍来自 `channels.matrix.dm.allowFrom`
- 请求者不必是审批人
- 当源聊天已经支持命令和回复时，可以直接通过 `/approve` 进行批准
- 原生 Discord 审批按钮按审批 ID 类型路由：`plugin:` ID 直接进入插件审批，其他所有内容进入执行审批
- 原生 Telegram 审批按钮遵循与 `/approve` 相同的有界执行到插件回退机制
- 当原生 `target` 启用源聊天投递时，审批提示包含命令文本
- 待处理的执行审批默认在 30 分钟后过期
- 如果没有操作员 UI 或配置的审批客户端可以接受请求，提示将回退到 `askFallback`

Telegram 默认为审批人私信 (`target: "dm"`)。当您希望审批提示也出现在源 Telegram 聊天/主题中时，您可以切换到 `channel` 或 `both`。对于 Telegram 论坛主题，OpenClaw 会保留审批提示和批准后后续跟进的主题。

参见：

- [Discord](/zh/channels/discord)
- [Telegram](/zh/channels/telegram)

### macOS IPC flow

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全说明：

- Unix socket 模式 `0600`，令牌存储在 `exec-approvals.json` 中。
- Same-UID 对等检查。
- Challenge/response（nonce + HMAC 令牌 + 请求哈希）+ 短 TTL。

## 相关

- [Exec approvals](/zh/tools/exec-approvals) — 核心策略和批准流程
- [Exec 工具](/zh/tools/exec)
- [提升模式](/zh/tools/elevated)
- [Skills](/zh/tools/skills) — 基于 Skills 的自动允许行为
