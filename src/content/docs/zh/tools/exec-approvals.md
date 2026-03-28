---
summary: "执行审批、允许列表和沙箱逃逸提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "执行审批"
---

# Exec approvals

Exec approvals 是允许**沙箱隔离**代理在真实主机（`gateway` 或 `node`）上运行命令的**配套应用 / 节点主机防护机制**。可以将其视为一种安全互锁：只有当策略 + 允许列表 + （可选）用户批准达成一致时，才允许运行命令。Exec approvals 是**除了**工具策略和提升门控之外的额外措施（除非 elevated 设置为 `full`，这将跳过批准）。有效策略是 `tools.exec.*` 和批准默认值中的**更严格者**；如果省略了批准字段，则使用 `tools.exec` 值。

如果配套应用 UI **不可用**，任何需要提示的请求都将由**ask fallback**解决（默认：拒绝）。

## Where it applies

Exec approvals 在执行主机上本地执行：

- **gateway host** → 网关机器上的 `openclaw` 进程
- **node host** → 节点运行器（macOS 配套应用或无头节点主机）

信任模型说明：

- 经过 Gateway 网关 身份验证的调用者是该 Gateway 网关 的受信任操作员。
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

- **node host service** 通过本地 macOS 将 `system.run` 转发到 **IPC 应用**。
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

### 安全 (`exec.security`)

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

### 内联解释器 eval 强化 (`tools.exec.strictInlineEval`)

当设置 `tools.exec.strictInlineEval=true` 时，即使解释器二进制文件本身在允许列表中，OpenClaw 也会将内联代码评估形式视为仅限批准。

示例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

这是针对不能清晰映射到一个稳定文件操作数的解释器加载程序的纵深防御。在严格模式下：

- 这些命令仍然需要显式批准；
- `allow-always` 不会自动为它们持久化新的允许列表条目。

## 允许列表 (每个代理)

允许列表是**每个代理**独立的。如果存在多个代理，请在 macOS 应用中切换您正在编辑的代理。模式为**不区分大小写的 glob 匹配**。模式应解析为**二进制路径**（仅包含基本名称的条目将被忽略）。旧的 `agents.default` 条目在加载时会迁移到 `agents.main`。

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

启用“自动允许技能 CLI”后，已知技能引用的可执行文件在节点（macOS 节点或无头节点主机）上被视为已加入允许列表。这使用 Gateway RPC 上的 `skills.bins` 来获取技能二进制列表。如果您需要严格的手动允许列表，请禁用此功能。

重要信任说明：

- 这是一个**隐式便利允许列表**，与手动路径允许列表条目分开。
- 它适用于 Gateway 和节点处于相同信任边界中的受信任操作员环境。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 启用并仅使用手动路径允许列表条目。

## 安全二进制文件 (仅 stdin)

`tools.exec.safeBins` 定义了一个小型 **仅限 stdin** 二进制文件列表（例如 `cut`），
这些文件可以在允许列表模式下运行，而**无需**明确的允许列表条目。安全二进制文件会拒绝
位置文件参数和类似路径的标记，因此它们只能对传入流进行操作。
请将其视为流过滤器的狭窄快速通道，而非通用信任列表。
请**勿**将解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins`。
如果命令旨在评估代码、执行子命令或读取文件，请优先使用明确的允许列表条目并保持批准提示处于启用状态。
自定义安全二进制文件必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式配置文件。
验证仅根据 argv 形状确定性进行（不检查主机文件系统是否存在），这
可以防止因允许/拒绝差异而产生的文件存在预言行为。
默认安全二进制文件会拒绝面向文件的选项（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。
安全二进制文件还会对破坏仅 stdin 行为的选项（例如 `sort -o/--output/--compress-program` 和 grep 递归标记）执行明确的针对特定二进制文件的标记策略。
在安全二进制文件模式下，长选项验证采用故障关闭原则：未知标记和歧义
缩写将被拒绝。
按安全二进制文件配置文件拒绝的标记：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`：`--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`：`--argfile`、`--from-file`、`--library-path`、`--rawfile`、`--slurpfile`、`-L`、`-f`
- `sort`：`--compress-program`、`--files0-from`、`--output`、`--random-source`、`--temporary-directory`、`-T`、`-o`
- `wc`：`--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

安全二进制文件还会在执行时强制将 argv 标记视为**字面文本**（对于仅 stdin 部分，不执行 globbing
和 `$VARS` 展开），因此无法使用 `*` 或 `$HOME/...` 等模式
来窃取文件读取。
安全二进制文件还必须从受信任的二进制目录解析（系统默认值加上可选的
`tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会自动受信任。
默认受信任的安全二进制目录有意做得极简：`/bin`、`/usr/bin`。
如果您的安全二进制可执行文件位于包管理器/用户路径中（例如
`/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），请将它们显式添加
to `tools.exec.safeBinTrustedDirs`。
在允许列表模式下，Shell 链接和重定向不会自动获得允许。

当每个顶层段都满足允许列表（包括安全二进制文件或技能自动允许）时，允许 Shell 链接（`&&`、`||`、`;`）。在允许列表模式下，重定向仍然不受支持。在允许列表解析期间会拒绝命令替换（`$()` / 反引号），包括在双引号内；如果您需要字面意义的 `$()` 文本，请使用单引号。
在 macOS 伴随应用审批中，包含 Shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`) 的原始 Shell 文本将被视为允许列表未命中，除非 Shell 二进制文件本身已被列入允许列表。
对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的环境覆盖项会缩减为一小部分明确的允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
对于允许列表模式下的“始终允许”决策，已知的调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将持久化内部可执行文件路径，而不是包装器路径。Shell 多路复用器（`busybox`、`toybox`）也会针对 Shell 小程序（`sh`、`ash` 等）进行解包，因此持久化的是内部可执行文件，而不是多路复用器二进制文件。如果无法安全地解包包装器或多路复用器，则不会自动持久化任何允许列表条目。
如果您将解释器（如 `python3` 或 `node`）列入允许列表，请优先使用 `tools.exec.strictInlineEval=true`，以便内联评估仍然需要显式批准。

默认安全 bins：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果您选择使用，请为其非 stdin 工作流保留显式的允许条目。
对于安全 bin 模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置参数形式将被拒绝，以防止文件操作数作为模糊的位置参数被偷运。

### 安全 bin 与允许列表

| 主题     | `tools.exec.safeBins`                   | 允许列表 (`exec-approvals.json`)              |
| -------- | --------------------------------------- | --------------------------------------------- |
| 目标     | 自动允许狭窄的 stdin 过滤器             | 显式信任特定的可执行文件                      |
| 匹配类型 | 可执行文件名称 + 安全 bin argv 策略     | 已解析的可执行文件路径 glob 模式              |
| 参数范围 | 受安全 bin 配置文件和字面量令牌规则限制 | 仅路径匹配；否则参数由您负责                  |
| 典型示例 | `head`, `tail`, `tr`, `wc`              | `jq`, `python3`, `node`, `ffmpeg`, 自定义 CLI |
| 最佳用途 | 管道中的低风险文本转换                  | 任何具有更广泛行为或副作用的工具              |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或每代理 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或每代理 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或每代理 `agents.list[].tools.exec.safeBinProfiles`）。每代理配置文件键会覆盖全局键。
- 允许列表条目位于主机本地 `~/.openclaw/exec-approvals.json` 下的 `agents.<id>.allowlist`（或通过控制 UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制文件出现在 `safeBins` 中但没有显式配置文件时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目构建为 `{}`（随后请审查并收紧）。解释器/运行时二进制文件不会自动构建。

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

如果您显式选择将 `jq` 加入 `safeBins`，OpenClaw 仍会在安全二进制模式 (safe-bin mode) 下拒绝 `env` 内置命令，因此 `jq -n env` 无法在没有显式允许列表路径或批准提示的情况下转储主机进程环境。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、每个代理的覆盖和允许列表。选择一个范围（Defaults 或某个代理），调整策略，添加/删除允许列表模式，然后点击 **Save**。UI 会显示每个模式的 **last used** 元数据，以便您保持列表整洁。

目标选择器选择 **Gateway(网关)**（本地批准）或 **Node**。节点必须通告 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果节点尚未通告执行批准，请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持网关或节点编辑（参见 [Approvals CLI](/zh/cli/approvals)）。

## 批准流程

当需要提示时，网关向操作员客户端广播 `exec.approval.requested`。Control UI 和 macOS 应用通过 `exec.approval.resolve` 解析它，然后网关将批准的请求转发给节点主机。

对于 `host=node`，批准请求包含规范的 `systemRunPlan` 有效载荷。网关在转发已批准的 `system.run` 请求时，使用该计划作为权威的 command/cwd/会话 上下文。

## 解释器/运行时命令

基于批准的解释器/运行时运行采用有意的保守策略：

- 确切的 argv/cwd/env 上下文始终是绑定的。
- 直接 Shell 脚本和直接运行时文件形式尽可能绑定到一个具体的本地文件快照。
- 在绑定之前，仍然解析为一个直接本地文件的常见包管理器包装器形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）将被解包。
- 如果 OpenClaw 无法为解释器/运行时命令准确识别一个具体的本地文件
  （例如包脚本、eval 形式、特定于运行时的加载器链或多文件歧义形式），
  将拒绝基于批准的执行，而不是声明其不具备的语义覆盖范围。
- 对于这些工作流，首选沙箱隔离、独立的主机边界，或显式受信任的
  允许列表/完整工作流，其中操作员接受更广泛的运行时语义。

当需要批准时，exec 工具会立即返回一个批准 ID。使用该 ID 来关联随后的系统事件（`Exec finished` / `Exec denied`）。如果在超时之前没有做出决定，
该请求将被视为批准超时，并作为拒绝原因被呈现。

确认对话框包括：

- 命令 + 参数
- 工作目录
- 代理 ID
- 解析的可执行文件路径
- 主机 + 策略元数据

操作：

- **允许一次** → 立即运行
- **始终允许** → 添加到允许列表 + 运行
- **拒绝** → 阻止

## 批准转发到聊天渠道

您可以将执行批准提示转发到任何聊天渠道（包括插件渠道），并使用 `/approve` 批准它们。
这使用正常的出站交付管道。

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

### 内置聊天批准客户端

Discord 和 Telegram 也可以作为具有特定渠道配置的显式执行批准客户端。

- Discord：`channels.discord.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

这些客户端是可选的。如果某个渠道未启用执行批准，OpenClaw 不会仅仅因为对话发生在那里就将该渠道视为批准界面。

共享行为：

- 只有配置好的批准者才能批准或拒绝
- 请求者不必是批准者
- 当启用渠道交付时，批准提示包括命令文本
- 如果没有操作员 UI 或配置的批准客户端可以接受该请求，提示将回退到 `askFallback`

Telegram 默认为审批者私信 (`target: "dm"`)。当您希望审批提示也显示在发起的 Telegram 聊天/话题中时，您可以切换到 `channel` 或 `both`。对于 Telegram 论坛话题，OpenClaw 会为审批提示和审批后的后续消息保留该话题。

参见：

- [Discord](/zh/channels/discord#exec-approvals-in-discord)
- [Telegram](/zh/channels/telegram#exec-approvals-in-telegram)

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
- 质询/响应 (nonce + HMAC 令牌 + 请求哈希) + 短 TTL。

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running` (仅当命令超过运行通知阈值时)
- `Exec finished`
- `Exec denied`

这些内容会在节点报告事件后发布到代理的会话中。
Gateway(网关) 托管的 exec 审批在命令完成时（以及可选地，当运行时间超过阈值时）会发出相同的生命周期事件。
审批门控的 exec 在这些消息中重用审批 id 作为 `runId`，以便于关联。

## 影响

- **full** 功能强大；尽可能首选允许列表。
- **ask** 让您随时了解情况，同时仍允许快速审批。
- 每个代理的允许列表可防止一个代理的审批泄露到其他代理。
- 审批仅适用于来自**授权发送方**的主机 exec 请求。未授权的发送方无法发出 `/exec`。
- `/exec security=full` 是面向授权操作员的会话级便利功能，设计上会跳过审批。
  若要硬性阻止主机 exec，请将审批安全设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

相关：

- [Exec 工具](/zh/tools/exec)
- [提权模式](/zh/tools/elevated)
- [Skills](/zh/tools/skills)
