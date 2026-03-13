---
summary: "执行审批、允许列表和沙箱逃逸提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "执行审批"
---

# Exec approvals

执行审批是用于允许沙箱代理在真实主机（`gateway` 或 `node`）上运行命令的**配套应用/节点主机防护栏**。可以将其视为一种安全互锁：只有当策略 + 允许列表 + （可选）用户批准达成一致时，才允许执行命令。
执行审批是**除了**工具策略和提升门控之外的额外措施（除非提升设置为 `full`，这会跳过审批）。
有效策略是 `tools.exec.*` 和审批默认值中**更严格**的一个；如果省略了审批字段，则使用 `tools.exec` 值。

如果配套应用 UI **不可用**，任何需要提示的请求都将由**ask fallback**解决（默认：拒绝）。

## Where it applies

Exec approvals 在执行主机上本地执行：

- **网关主机** → 网关机器上的 `openclaw` 进程
- **node host** → 节点运行器（macOS 配套应用或无头节点主机）

信任模型说明：

- 经过网关身份验证的调用者是该网关的受信任操作员。
- 配对的节点将该受信任操作员能力扩展到节点主机。
- Exec approvals 可以降低意外执行的风险，但并非每用户身份验证边界。
- 批准的节点主机运行绑定规范执行上下文：规范 cwd、精确 argv、env
  绑定（如果存在），以及固定的可执行路径（如果适用）。
- 对于 Shell 脚本和直接解释器/运行时文件调用，OpenClaw 还尝试绑定
  一个具体的本地文件操作数。如果绑定的文件在批准后但在执行前发生变化，
  运行将被拒绝，而不是执行已漂移的内容。
- 这种文件绑定是有意的尽力而为，而不是对每个
  解释器/运行时加载器路径的完整语义模型。如果批准模式无法准确识别一个具体的本地
  文件进行绑定，它将拒绝创建基于批准的运行，而不是假装完全覆盖。

macOS 拆分：

- **节点主机服务** 通过本地 IPC 将 `system.run` 转发给 **macOS 应用**。
- **macOS app** 强制执行批准并在 UI 上下文中执行命令。

## 设置和存储

批准存储在执行主机上的本地 JSON 文件中：

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

## 策略控制

### 安全 (`exec.security`)

- **deny**：阻止所有主机执行请求。
- **allowlist**：仅允许在允许列表中的命令。
- **full**：允许所有内容（等同于 elevated）。

### 询问 (`exec.ask`)

- **off**：从不提示。
- **on-miss**：仅当允许列表不匹配时提示。
- **always**：每次执行命令都提示。

### 询问回退 (`askFallback`)

如果需要提示但无法访问 UI，则由回退策略决定：

- **deny**：阻止。
- **allowlist**：仅在允许列表匹配时允许。
- **full**：允许。

## 允许列表（按代理）

允许列表是**针对每个代理**的。如果存在多个代理，请在 macOS 应用中切换正在编辑的代理。模式采用**不区分大小写的 glob 匹配**。
模式应解析为**二进制路径**（仅包含基本名称的条目将被忽略）。
旧的 `agents.default` 条目在加载时会被迁移到 `agents.main`。

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

当启用**自动允许技能 CLI** 时，已知技能引用的可执行文件被视为在节点（macOS 节点或无头节点主机）上的允许列表项。这通过网关 RPC 使用 `skills.bins` 来获取技能二进制列表。如果您需要严格的手动允许列表，请禁用此功能。

重要信任说明：

- 这是一个**隐式的便利允许列表**，与手动路径允许列表条目分开。
- 它适用于 Gateway 和节点处于同一信任边界的受信任操作员环境。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 并仅使用手动路径允许列表条目。

## 安全 Bin（仅 stdin）

`tools.exec.safeBins` 定义了一小部分 **stdin-only** 二进制文件（例如 `jq`），这些文件可以在没有显式允许列表条目的情况下在允许列表模式下运行。安全二进制文件会拒绝位置文件参数和类似路径的标记，因此它们只能操作传入的流。请将此视为流过滤器的狭窄快速路径，而不是通用信任列表。请勿将解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins` 中。如果某个命令可以评估代码、执行子命令或按设计读取文件，则首选显式允许列表条目并保持批准提示处于启用状态。自定义安全二进制文件必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式配置文件。验证仅根据 argv 形状确定（不进行主机文件系统存在性检查），这可以防止通过允许/拒绝差异产生文件存在预言机行为。对于默认安全二进制文件，面向文件的选项被拒绝（例如 `sort -o`、`sort --output`、`sort --files0-from`、`sort --compress-program`、`sort --random-source`、`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、`grep -f/--file`）。安全二进制文件还会对破坏 stdin-only 行为的选项（例如 `sort -o/--output/--compress-program` 和 grep 递归标志）执行显式的每个二进制文件标志策略。在安全二进制文件模式下，长选项的验证以故障关闭（fail-closed）方式进行：未知标志和歧义缩写将被拒绝。按安全二进制文件配置文件拒绝的标志：

{/* SAFE_BIN_DENIED_FLAGS:START */}

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`
{/* SAFE_BIN_DENIED_FLAGS:END */}

安全 bin 还强制在执行时将 argv 标记视为 **字面文本** (对于仅 stdin 段，不进行通配
和 `$VARS` 扩展)，因此 `*` 或 `$HOME/...` 等模式不能用于
走私文件读取。
安全 bin 还必须从受信任的二进制目录解析 (系统默认值加上可选的
`tools.exec.safeBinTrustedDirs`)。`PATH` 条目永远不会自动受信任。
默认受信任的安全 bin 目录故意最少化：`/bin`, `/usr/bin`。
如果您的安全 bin 可执行文件位于包管理器/用户路径中 (例如
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`)，请将其显式添加到
`tools.exec.safeBinTrustedDirs`。
在允许列表模式下，Shell 链接和重定向不会自动允许。

当每个顶层片段都满足允许列表（包括安全二进制文件或技能自动允许）时，允许 Shell 链接（`&&`、`||`、`;`）。在允许列表模式下，重定向仍然不受支持。在允许列表解析期间，命令替换（`$()` / 反引号）会被拒绝，包括在双引号内；如果您需要字面量的 `$()` 文本，请使用单引号。在 macOS 伴随应用批准中，包含 Shell 控制或扩展语法的原始 Shell 文本（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）将被视为允许列表未命中，除非 Shell 二进制文件本身在允许列表中。对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的环境变量覆盖会被缩减为一个小的显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。对于允许列表模式下的“始终允许”决策，已知的分发包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将持久化内部可执行文件路径而不是包装器路径。Shell 多路复用器（`busybox`、`toybox`）也会针对 Shell 小程序（`sh`、`ash` 等）进行解包，因此持久化的是内部可执行文件而不是多路复用器二进制文件。如果无法安全地解包包装器或多路复用器，则不会自动持久化任何允许列表条目。

默认安全 bins：`jq`、`cut`、`uniq`、`head`、`tail`、`tr`、`wc`。

`grep` 和 `sort` 不在默认列表中。如果你选择使用，请为它们的非 stdin 工作流保留显式的允许列表条目。
对于安全 bin 模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置参数模式形式将被拒绝，以防止文件操作数被伪装为模糊的位置参数。

### 安全二进制 与允许列表

| 主题            | `tools.exec.safeBins`                                  | 允许列表 (`exec-approvals.json`)                            |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 目标             | 自动允许狭窄的 stdin 过滤器                        | 显式信任特定的可执行文件                        |
| 匹配类型       | 可执行文件名称 + 安全 bin argv policy                 | 解析后的可执行文件路径 glob pattern                        |
| 参数作用域   | 受安全 bin 配置文件和字面量 token 规则限制 | 仅路径匹配；参数否则是你的责任 |
| 典型示例 | `jq`、`head`、`tail`、`wc`                             | `python3`、`node`、`ffmpeg`、自定义 CLIs                     |
| 最佳用途         | 管道中的低风险文本转换                  | 具有更广泛行为或副作用的任何工具               |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或每个代理的 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或每个代理的 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或每个代理的 `agents.list[].tools.exec.safeBinProfiles`）。每个代理的配置文件键会覆盖全局键。
- 允许条目驻留在 `agents.<id>.allowlist` 下的主机本地 `~/.openclaw/exec-approvals.json` 中（或通过 Control UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制文件在没有显式配置文件的情况下出现在 `safeBins` 中时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目搭建为 `{}`（事后请审查并收紧）。解释器/运行时二进制文件不会自动搭建。

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

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、每个代理的覆盖项以及允许列表。选择一个范围（Defaults 或某个代理），调整策略，添加/删除允许列表模式，然后点击 **Save**。UI 会显示每个模式的 **last used** 元数据，以便您保持列表整洁。

目标选择器选择 **Gateway**（本地审批）或 **Node**。节点必须通告 `system.execApprovals.get/set`（macOS 应用程序或无头节点主机）。如果节点尚未通告执行审批，请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持网关或节点编辑（请参阅 [Approvals CLI](/en/cli/approvals)）。

## 批准流程

当需要提示时，网关会向操作员客户端广播 `exec.approval.requested`。Control UI 和 macOS 应用程序通过 `exec.approval.resolve` 解析它，然后网关将批准的请求转发给节点主机。

对于 `host=node`，审批请求包含规范 `systemRunPlan` 有效负载。在转发批准的 `system.run` 请求时，网关将该计划用作权威命令/cwd/会话上下文。

## 解释器/运行时命令

基于批准的解释器/运行时运行是有意保守的：

- 精确的 argv/cwd/env 上下文始终是绑定的。
- 直接 Shell 脚本和直接运行时文件形式尽最大努力绑定到一个具体本地
  文件快照。
- 如果 OpenClaw 无法为解释器/运行时命令精确识别出一个具体本地文件
  （例如包脚本、eval 形式、运行时特定的加载器链或歧义的多文件形式），将拒绝基于批准的执行，而不是声称其不具备的语义覆盖。
- 对于这些工作流程，首选沙盒机制、独立的主机边界或操作员接受更广泛运行时语义的明确受信任
  许可列表/完整工作流程。

当需要批准时，exec 工具会立即返回一个批准 id。使用该 id 关联后续的系统事件（`Exec finished` / `Exec denied`）。如果在超时之前没有做出决定，该请求将被视为批准超时，并作为拒绝原因呈现。

确认对话框包括：

- command + args (命令 + 参数)
- cwd (当前工作目录)
- agent id (代理 ID)
- resolved executable path (解析的可执行文件路径)
- host + policy metadata (主机 + 策略元数据)

操作：

- **Allow once (允许一次)** → 立即运行
- **Always allow (始终允许)** → 添加到许可列表 + 运行
- **Deny (拒绝)** → 阻止

## 转发批准到聊天频道

您可以将 exec 批准提示转发到任何聊天频道（包括插件频道），并使用 `/approve` 进行批准。这使用常规的出站交付管道。

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

Discord 和 Telegram 也可以充当具有特定频道配置的显式 exec 批准客户端。

- Discord: `channels.discord.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

这些客户端是可选加入的。如果某个频道未启用 exec 批准功能，OpenClaw 不会仅因为对话发生在该频道而将其视为批准界面。

共享行为：

- 只有配置的批准者可以批准或拒绝
- 请求者不需要是批准者
- 启用频道交付时，批准提示包含命令文本
- 如果没有操作员 UI 或配置的批准客户端可以接受该请求，提示将回退到 `askFallback`

Telegram 默认为批准者的私信（`target: "dm"`）。当您希望批准提示也出现在发起的 Telegram 聊天/主题中时，可以切换到 `channel` 或 `both`。对于 Telegram 论坛主题，OpenClaw 会保留批准提示和批准后后续消息的主题。

参见：

- [Discord](/en/channels/discord#exec-approvals-in-discord)
- [Telegram](/en/channels/telegram#exec-approvals-in-telegram)

### macOS IPC 流程

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + approvals + system.run)
```

安全说明：

- Unix socket 模式 `0600`，令牌存储在 `exec-approvals.json` 中。
- 相同 UID 对等体检查。
- 质询/响应（nonce + HMAC 令牌 + 请求哈希）+ 短 TTL。

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running`（仅当命令超过运行通知阈值时）
- `Exec finished`
- `Exec denied`

这些在节点报告事件后发布到代理的会话中。网关主机 exec 批准在命令完成时（以及可选地，当运行时间超过阈值时）发出相同的生命周期事件。需要批准的 exec 在这些消息中重用批准 id 作为 `runId`，以便于关联。

## 影响

- **full** 功能强大；尽可能优先使用允许列表。
- **ask** 让您保持知情，同时仍允许快速批准。
- 按代理设置的允许列表可防止一个代理的批准泄露到其他代理。
- 批准仅适用于来自**授权发送者**的主机 exec 请求。未经授权的发送者无法发出 `/exec`。
- `/exec security=full` 是授权操作员的会话级便利功能，设计上会跳过批准。
  若要硬性阻止主机执行，请将审批安全性设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

相关：

- [Exec 工具](/en/tools/exec)
- [提升模式](/en/tools/elevated)
- [技能](/en/tools/skills)

import zh from '/components/footer/zh.mdx';

<zh />
