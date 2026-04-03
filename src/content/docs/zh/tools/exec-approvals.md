---
summary: "执行审批、允许列表和沙箱逃逸提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "执行审批"
---

# Exec approvals

执行审批是让**沙箱隔离**代理在真实主机（`gateway` 或 `node`）上运行命令的**配套应用/节点主机护栏**。可以将其视为一种安全联锁装置：只有当策略 + 允许列表 + （可选）用户批准达成一致时，才允许执行命令。
执行审批是**除了**工具策略和提升门控之外的一项措施（除非将 elevated 设置为 `full`，这会跳过审批）。
有效的策略是 `tools.exec.*` 和审批默认值中的**更严格**者；如果省略了审批字段，则使用 `tools.exec` 值。

如果配套应用 UI **不可用**，任何需要提示的请求都将由**ask fallback**解决（默认：拒绝）。

## Where it applies

Exec approvals 在执行主机上本地执行：

- **网关主机** → 网关机器上的 `openclaw` 进程
- **node host** → 节点运行器（macOS 配套应用或无头节点主机）

信任模型说明：

- 经过 Gateway(网关) 网关 身份验证的调用者是该 Gateway(网关) 网关 的受信任操作员。
- 配对的节点将该受信任操作员能力扩展到节点主机。
- Exec approvals 可以降低意外执行的风险，但并非每用户身份验证边界。
- 批准的节点主机运行绑定规范执行上下文：规范 cwd、精确 argv、存在时的
  绑定环境，以及适用的固定可执行文件路径。
- 对于 shell 脚本和直接的解释器/运行时文件调用，OpenClaw 也会尝试绑定
  一个具体的本地文件操作数。如果绑定的文件在批准后但在执行前发生了更改，
  运行将被拒绝，而不是执行已更改的内容。
- 此文件绑定是尽力而为的，并非每个解释器/运行时加载器路径的完整语义模型。
  如果批准模式无法识别确切的一个具体本地文件进行绑定，它将拒绝创建支持批准的运行，而不是假装完全覆盖。

macOS 拆分：

- **节点主机服务** 通过本地 macOS 将 `system.run` 转发给 **IPC 应用**。
- **macOS 应用** 执行批准 + 在 UI 上下文中执行命令。

## 设置和存储

批准位于执行主机上的本地 JSON 文件中：

`~/.openclaw/exec-approvals.json`

架构示例：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 策略调整旋钮

### 安全性 (`exec.security`)

- **deny**：阻止所有主机执行请求。
- **allowlist**：仅允许列在允许列表中的命令。
- **full**：允许所有内容（相当于提升权限）。

### 询问 (`exec.ask`)

- **off**：从不提示。
- **on-miss**：仅当允许列表不匹配时提示。
- **always**：在每个命令上提示。

### 询问回退 (`askFallback`)

如果需要提示但无法访问 UI，则由回退决定：

- **deny**：阻止。
- **allowlist**：仅在允许列表匹配时允许。
- **full**：允许。

### 内联解释器评估硬化 (`tools.exec.strictInlineEval`)

当 `tools.exec.strictInlineEval=true` 时，即使解释器二进制文件本身在允许列表中，OpenClaw 也会将内联代码评估形式视为仅审批模式。

示例：

- `python -c`
- `node -e`、`node --eval`、`node -p`
- `ruby -e`
- `perl -e`、`perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

这是针对不能清晰映射到一个稳定文件操作数的解释器加载程序的纵深防御。在严格模式下：

- 这些命令仍然需要显式批准；
- `allow-always` 不会自动为它们持久化新的允许列表条目。

## 允许列表 (每个代理)

允许列表是**针对每个代理**的。如果存在多个代理，请在 macOS 应用中切换您正在编辑的代理。模式是**不区分大小写的 glob 匹配**。
模式应解析为**二进制路径**（仅包含基本名称的条目将被忽略）。
传统的 `agents.default` 条目在加载时会迁移到 `agents.main`。

示例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每个允许列表条目跟踪：

- **id** 用于 UI 身份的稳定 UUID（可选）
- **last used** 时间戳
- **last used command**
- **last resolved path**

## 自动允许技能 CLI

启用 **Auto-allow skill CLIs** 后，已知技能引用的可执行文件将被视为在节点（macOS 节点或无头节点主机）上已加入允许列表。这通过 Gateway(网关) RPC 使用 `skills.bins` 来获取技能二进制文件列表。如果您需要严格的手动允许列表，请禁用此功能。

重要信任说明：

- 这是一个**隐式便利允许列表**，与手动路径允许列表条目分开。
- 它适用于 Gateway(网关) 和节点处于相同信任边界中的受信任操作员环境。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 启用，并仅使用手动路径允许列表条目。

## 安全二进制文件 (仅 stdin)

`tools.exec.safeBins` 定义了一小部分 **stdin-only** 二进制文件（例如 `cut`），
它们可以在允许列表模式下运行，而**无需**明确的允许列表条目。安全二进制文件会拒绝
位置文件参数和类似路径的标记，因此它们只能对传入流进行操作。
请将其视为流过滤器的窄快速路径，而不是通用信任列表。
请**勿**将解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins` 中。
如果命令可以评估代码、执行子命令或按设计读取文件，则首选明确的允许列表条目并保持批准提示启用。
自定义安全二进制文件必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式配置文件。
验证仅根据 argv 形状确定性进行（不检查主机文件系统是否存在），这可以
防止允许/拒绝差异导致的文件存在预言机行为。
默认安全二进制文件会拒绝面向文件的选项（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。
安全二进制文件还针对破坏 stdin-only 行为的选项执行显式逐二进制文件标记策略（例如 `sort -o/--output/--compress-program` 和 grep 递归标记）。
长选项在安全二进制文件模式下以“故障关闭”方式验证：未知标记和有歧义的
缩写将被拒绝。
按安全二进制文件配置文件拒绝的标记：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`：`--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`：`--argfile`、`--from-file`、`--library-path`、`--rawfile`、`--slurpfile`、`-L`、`-f`
- `sort`：`--compress-program`、`--files0-from`、`--output`、`--random-source`、`--temporary-directory`、`-T`、`-o`
- `wc`：`--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

对于仅 stdin 段，安全二进制文件还强制在执行时将 argv 标记视为**纯文本**（不进行通配符匹配，也不进行 `$VARS` 展开），因此无法使用 `*` 或 `$HOME/...` 等模式来窃取文件读取权限。
安全二进制文件还必须从受信任的二进制文件目录解析（系统默认值加上可选的 `tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会被自动信任。
默认受信任的安全二进制文件目录有意保持最少：`/bin`、`/usr/bin`。
如果您的安全二进制文件可执行文件位于包管理器/用户路径中（例如 `/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），请将其显式添加到 `tools.exec.safeBinTrustedDirs`。
在允许列表模式下，Shell 链接和重定向不会自动被允许。

当每个顶层段都满足允许列表（包括安全二进制文件或技能自动允许）时，允许 Shell 链接（`&&`、`||`、`;`）。在允许列表模式下，重定向仍然不受支持。在允许列表解析期间，会拒绝命令替换（`$()` / 反引号），包括在双引号内；如果您需要字面量 `$()` 文本，请使用单引号。
在 macOS 伴随应用批准中，包含 Shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `) `）的原始 Shell 文本将被视为允许列表匹配失败，除非 Shell 二进制文件本身在允许列表中。
对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的 env 覆盖将被减少到一个小型显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
对于允许列表模式下的“始终允许”决策，已知的调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将持久化内部可执行文件路径，而不是包装器路径。Shell 多路复用器（`busybox`、`toybox`）也会针对 Shell 小程序（`sh`、`ash` 等）进行解包，因此持久化的是内部可执行文件，而不是多路复用器二进制文件。如果包装器或多路复用器无法安全解包，则不会自动持久化允许列表条目。
如果您将解释器（如 `python3` 或 `node`）加入允许列表，请首选 `tools.exec.strictInlineEval=true`，以便内联评估仍需要显式批准。在严格模式下，`allow-always` 仍然可以持久化良性解释器/脚本调用，但内联评估载体不会自动持久化。

默认安全 bins：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果您选择加入，请为其非 stdin 工作流保留显式的允许列表条目。
对于安全二进制模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置参数形式将被拒绝，以防止文件操作数被作为模糊的位置参数走私。

### 安全 bin 与允许列表

| 主题     | `tools.exec.safeBins`                   | 允许列表 (`exec-approvals.json`)              |
| -------- | --------------------------------------- | --------------------------------------------- |
| 目标     | 自动允许狭窄的 stdin 过滤器             | 显式信任特定的可执行文件                      |
| 匹配类型 | 可执行文件名称 + 安全 bin argv 策略     | 已解析的可执行文件路径 glob 模式              |
| 参数范围 | 受安全 bin 配置文件和字面量令牌规则限制 | 仅路径匹配；否则参数由您负责                  |
| 典型示例 | `head`, `tail`, `tr`, `wc`              | `jq`, `python3`, `node`, `ffmpeg`, 自定义 CLI |
| 最佳用途 | 管道中的低风险文本转换                  | 任何具有更广泛行为或副作用的工具              |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或每个代理的 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或每个代理的 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或每个代理的 `agents.list[].tools.exec.safeBinProfiles`）。每个代理的配置文件键会覆盖全局键。
- 允许列表条目位于 `agents.<id>.allowlist` 下的主机本地 `~/.openclaw/exec-approvals.json` 中（或通过控制 UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制文件出现在没有显式配置文件的 `safeBins` 中时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目搭建为 `{}`（随后请审查并收紧）。解释器/运行时二进制文件不会自动搭建。

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

如果您显式选择将 `jq` 加入 `safeBins`，OpenClaw 仍会在 safe-bin
模式下拒绝 `env` 内置命令，因此 `jq -n env` 无法在没有明确的允许列表路径
或批准提示的情况下转储主机进程环境。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、每个代理的覆盖和允许列表。选择一个范围（Defaults 或某个代理），调整策略，添加/删除允许列表模式，然后点击 **Save**。UI 会显示每个模式的 **last used** 元数据，以便您保持列表整洁。

目标选择器选择 **Gateway(网关)**（本地批准）或一个 **Node（节点）**。节点
必须通告 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。
如果节点尚未通告 exec approvals，请直接编辑其本地
`~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持 gateway 或 node 编辑（请参阅 [Approvals CLI](/en/cli/approvals)）。

## 批准流程

当需要提示时，gateway 会向操作员客户端广播 `exec.approval.requested`。
Control UI 和 macOS 应用通过 `exec.approval.resolve` 对其进行解析，然后 gateway 将
批准的请求转发到节点主机。

对于 `host=node`，批准请求包含一个规范 `systemRunPlan` 负载。当转发批准的 `system.run`
请求时，gateway 将该计划用作权威的 command/cwd/会话 上下文。

## 解释器/运行时命令

基于批准的解释器/运行时运行采用有意的保守策略：

- 确切的 argv/cwd/env 上下文始终是绑定的。
- 直接 Shell 脚本和直接运行时文件形式尽可能绑定到一个具体的本地文件快照。
- 仍然解析为一个直接本地文件的常见包管理器包装器形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）在绑定之前会被解包。
- 如果 OpenClaw 无法为解释器/运行时命令准确识别一个具体的本地文件
  （例如包脚本、eval 形式、特定于运行时的加载器链或多文件歧义形式），
  将拒绝基于批准的执行，而不是声明其不具备的语义覆盖范围。
- 对于这些工作流，首选沙箱隔离、独立的主机边界，或显式受信任的
  允许列表/完整工作流，其中操作员接受更广泛的运行时语义。

当需要批准时，exec 工具会立即返回一个批准 ID。使用该 ID
关联后续系统事件（`Exec finished` / `Exec denied`）。如果在超时前
没有做出决定，该请求将被视为批准超时，并作为拒绝原因被呈现。

### 后续交付行为

在批准的异步 exec 完成后，OpenClaw 会向同一会话发送一个后续 `agent` 轮次。

- 如果存在有效的外部交付目标（可交付渠道加上目标 `to`），后续交付将使用该渠道。
- 在没有外部目标的仅 webchat 或内部会话流程中，后续交付保持仅为会话（`deliver: false`）。
- 如果调用方明确请求严格的外部传递，但没有可解析的外部渠道，则该请求将失败，返回 `INVALID_REQUEST`。
- 如果启用了 `bestEffortDeliver` 且无法解析外部渠道，传递将被降级为仅限会话，而不会失败。

确认对话框包括：

- 命令 + 参数
- 当前工作目录
- 代理 ID
- 解析的可执行文件路径
- 主机 + 策略元数据

操作：

- **允许一次** → 立即运行
- **始终允许** → 添加到允许列表 + 运行
- **拒绝** → 阻止

## 批准转发到聊天渠道

您可以将执行批准提示转发到任何聊天渠道（包括插件渠道），并使用 `/approve` 进行批准。这使用常规的出站传递管道。

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

`/approve` 命令处理执行批准和插件批准。如果 ID 不匹配待处理的执行批准，它会自动检查插件批准。

### 插件批准转发

插件批准转发使用与执行批准相同的传递管道，但在 `approvals.plugin` 下有其独立的配置。启用或禁用一个不会影响另一个。

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

配置结构与 `approvals.exec` 相同：`enabled`、`mode`、`agentFilter`、
`sessionFilter` 和 `targets` 的工作方式相同。

支持共享交互式回复的渠道会为执行批准和插件批准渲染相同的批准按钮。没有共享交互式 UI 的渠道将回退到带有 `/approve`
说明的纯文本。

### 任何渠道上的同聊天批准

当执行或插件批准请求源自可传递的聊天界面时，默认情况下，同一聊天现在可以使用 `/approve` 批准它。除了现有的 Web UI 和终端 UI 流程外，这还适用于 Slack、Matrix 和
Microsoft Teams 等渠道。

此共享文本命令路径使用该对话的正常渠道身份验证模型。如果发起聊天的渠道已经可以发送命令并接收回复，则批准请求不再需要单独的原生传递适配器来保持待处理状态。

Discord 和 Telegram 也支持同频道 `/approve`，但即使在禁用原生审批传递时，这些渠道仍使用其解析的审批者列表进行授权。

### 原生审批传递

Discord、Slack 和 Telegram 也可以作为具有特定渠道配置的原生审批传递适配器。

- Discord：`channels.discord.execApprovals.*`
- Slack：使用与 `channel: "slack"` 共享的 `approvals.exec.targets`，并在启用交互功能时呈现 Block Kit 审批按钮
- Telegram：`channels.telegram.execApprovals.*`

这些原生传递适配器是可选加入的。它们在共享的同频道 `/approve` 流程和共享审批按钮的基础上，增加了私信路由和渠道分发。

共享行为：

- Slack、Matrix、Microsoft Teams 和类似的可传递聊天渠道使用正常的渠道授权模型
  进行同频道 `/approve`
- 对于 Discord 和 Telegram，只有解析的审批者可以批准或拒绝
- Discord 和 Telegram 的审批者可以是显式的 (`execApprovals.approvers`) 或从现有的所有者配置推断 (`allowFrom`，加上支持情况下的直接消息 `defaultTo`)
- 请求者不需要是审批者
- 当发起聊天已经支持命令和回复时，该聊天可以直接通过 `/approve` 进行批准
- 启用渠道传递时，审批提示包含命令文本
- 待处理的执行审批默认在 30 分钟后过期
- 如果没有操作员界面或配置的审批客户端可以接受请求，提示将回退到 `askFallback`

Telegram 默认为审批者私信 (`target: "dm"`)。当您希望审批提示也出现在发起的 Telegram 聊天/话题中时，您可以切换到 `channel` 或 `both`。对于 Telegram 论坛
话题，OpenClaw 会保留审批提示和审批后跟进的话题。

参见：

- [Discord](/en/channels/discord)
- [Telegram](/en/channels/telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全说明：

- Unix socket 模式 `0600`，令牌存储在 `exec-approvals.json` 中。
- Same-UID 对等检查。
- 挑战/响应（nonce + HMAC 令牌 + 请求哈希）+ 短 TTL。

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running`（仅当命令超过运行通知阈值时）
- `Exec finished`
- `Exec denied`

这些消息在节点报告事件后发送到代理的会话。
Gateway(网关) 托管的 exec 批准在命令完成时（以及可选地当运行时间超过阈值时）会发出相同的生命周期事件。
批准门控的 exec 在这些消息中重用批准 ID 作为 `runId` 以便轻松关联。

## 拒绝批准的行为

当异步 exec 批准被拒绝时，OpenClaw 会阻止代理重用会话中同一命令的早期运行输出。拒绝原因会附带明确的指导，即没有可用的命令输出，从而阻止代理声称有新输出或使用先前成功运行的陈旧结果重复被拒绝的命令。

## 影响

- **full** 很强大；请尽可能使用允许列表（allowlists）。
- **ask** 让您随时了解情况，同时仍然允许快速批准。
- 每个代理的允许列表可防止一个代理的批准泄漏到其他代理。
- 批准仅适用于来自**授权发送者**的主机 exec 请求。未经授权的发送者无法发出 `/exec`。
- `/exec security=full` 是授权操作员的会话级便利功能，设计上会跳过批准。
  要硬阻止主机 exec，请将批准安全性设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

相关：

- [Exec 工具](/en/tools/exec)
- [提升模式](/en/tools/elevated)
- [Skills](/en/tools/skills)

## 相关

- [Exec](/en/tools/exec) — Shell 命令执行工具
- [沙箱隔离](/en/gateway/sandboxing) — 沙箱模式和工作区访问
- [安全性](/en/gateway/security) — 安全模型和加固
- [沙箱 vs 工具策略 vs 提升](/en/gateway/sandbox-vs-tool-policy-vs-elevated) — 何时使用每种方法
