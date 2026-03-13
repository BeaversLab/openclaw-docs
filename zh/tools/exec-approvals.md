---
summary: "Exec 审批、允许列表和沙箱逃逸提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Exec 审批"
---

# Exec 审批

Exec approvals 是用于允许沙盒化代理在真实主机（`gateway` 或 `node`）上运行命令的 **companion app / node host guardrail**。你可以将其想象为一个安全联锁装置：只有当策略 + 允许列表 + （可选）用户批准达成一致时，才允许执行命令。Exec approvals 是 **对** 工具策略和提升门控的 **额外补充**（除非 elevated 设置为 `full`，这会跳过批准）。有效的策略是 `tools.exec.*` 和批准默认值中的 **更严格** 者如果省略了批准字段，则使用 `tools.exec` 值。

如果 companion app UI **不可用**，任何需要提示的请求都将由 **ask fallback**（默认：拒绝）解决。

## 适用范围

Exec 批准在执行主机上本地强制执行：

- **gateway host** → 网关机器上的 `openclaw` 进程
- **node host** → node 运行器（macOS 伴侣应用或无头节点主机）

信任模型说明：

- 经过网关身份验证的调用者是该网关的受信任操作员。
- 配对的节点将该受信任操作员的能力扩展到节点主机上。
- Exec 批准降低了意外执行的风险，但并非每用户身份验证边界。
- 批准的节点主机运行绑定规范执行上下文：规范 cwd、精确 argv、env
  绑定（如果存在），以及固定的可执行文件路径（如果适用）。
- 对于 shell 脚本和直接解释器/运行时文件调用，OpenClaw 还会尝试绑定
  一个具体的本地文件操作数。如果该绑定的文件在批准后但在执行前发生变化，
  则拒绝运行，而不是执行已漂移的内容。
- 此文件绑定是有意的尽力而为，而不是每个
  解释器/运行时加载器路径的完整语义模型。如果批准模式无法准确识别一个具体的本地
  文件进行绑定，它将拒绝创建一个经批准的运行，而不是假装完全覆盖。

macOS 拆分：

- **node host service** 通过本地 IPC 将 `system.run` 转发给 **macOS app**。
- **macOS app** 在 UI 上下文中执行批准 + 执行命令。

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

### Security (`exec.security`)

- **deny**: 阻止所有主机执行请求。
- **allowlist**: 仅允许白名单中的命令。
- **full**: 允许所有内容（相当于 elevated）。

### Ask (`exec.ask`)

- **off**: 从不提示。
- **on-miss**: 仅在白名单不匹配时提示。
- **always**: 对每个命令都提示。

### Ask fallback (`askFallback`)

如果需要提示但无法访问 UI，则由 fallback 决定：

- **deny**: 阻止。
- **allowlist**: 仅在白名单匹配时允许。
- **full**: 允许。

## Allowlist (per agent)

允许列表是**针对每个代理的**。如果存在多个代理，请在 macOS 应用中切换您正在编辑的代理。模式是**不区分大小写的 glob 匹配**。模式应解析为**二进制路径**（仅包含基本名称的条目将被忽略）。传统的 `agents.default` 条目在加载时会迁移到 `agents.main`。

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

启用 **Auto-allow skill CLIs** 后，已知技能引用的可执行文件将被视为在节点（macOS 节点或无头节点主机）上已列入允许列表。这通过 `skills.bins` 使用 Gateway RPC 来获取技能二进制文件列表。如果您需要严格的手动允许列表，请禁用此功能。

重要的信任说明：

- 这是一个 **隐式便利允许列表**，与手动路径允许列表条目分开。
- 它适用于 Gateway 和节点处于同一信任边界的受信任操作员环境。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 并仅使用手动路径允许列表条目。

## Safe bins (stdin-only)

`tools.exec.safeBins` 定义了一个小型 **仅 stdin** 二进制文件列表（例如 `jq`），这些文件可以在允许列表模式下运行，而**无需**明确的允许列表条目。安全二进制文件拒绝位置文件参数和类似路径的标记，因此它们只能对传入的流进行操作。应将其视为流过滤器的窄速路径，而不是通用信任列表。请**勿**将解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins` 中。如果某个命令可以评估代码、执行子命令或按设计读取文件，则优先使用明确的允许列表条目并保持批准提示处于启用状态。自定义安全二进制文件必须在 `tools.exec.safeBinProfiles.<bin>` 中定义明确的配置文件。验证仅基于 argv 形状进行确定性验证（不检查主机文件系统是否存在），这可以防止因允许/拒绝差异而产生的文件存在预言行为。默认安全二进制文件拒绝面向文件的选项（例如 `sort -o`、`sort --output`、`sort --files0-from`、`sort --compress-program`、`sort --random-source`、`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、`grep -f/--file`）。安全二进制文件还会针对破坏仅 stdin 行为的选项（例如 `sort -o/--output/--compress-program` 和 grep 递归标志）执行明确的每二进制文件标志策略。在安全二进制文件模式下，长选项以故障关闭方式进行验证：未知标志和歧义缩写将被拒绝。按安全二进制文件配置文件拒绝的标志：

{/* SAFE_BIN_DENIED_FLAGS:START */}

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`
{/* SAFE_BIN_DENIED_FLAGS:END */}

Safe bins 还会强制将仅 stdin 段在执行时的 argv 标记视为**纯文本**（不进行 glob
展开，也不进行 `$VARS` 展开），因此像 `*` 或 `$HOME/...` 这样的模式无法
用于窃取文件读取。
Safe bins 还必须从受信任的二进制目录解析（系统默认值加上可选的
`tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会被自动信任。
默认的受信任 safe-bin 目录是有意精简的：`/bin`、`/usr/bin`。
如果您的 safe-bin 可执行文件位于包管理器/用户路径中（例如
`/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），请将它们显式添加到
`tools.exec.safeBinTrustedDirs` 中。
在 allowlist 模式下，Shell 链接和重定向不会被自动允许。

当每个顶层段都满足允许列表（包括安全二进制文件或技能自动允许）时，允许 Shell 链接（`&&`、`||`、`;`）。在允许列表模式下，重定向仍然不受支持。在允许列表解析期间会拒绝命令替换（`$()` / 反引号），包括在双引号内部；如果您需要字面量 `$()` 文本，请使用单引号。在 macOS 伴随应用审批中，包含 Shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）的原始 Shell 文本将被视为允许列表未命中，除非 Shell 二进制文件本身在允许列表中。对于 Shell 封装器（`bash|sh|zsh ... -c/-lc`），请求作用域的环境变量覆盖会缩减为一个小的显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。对于允许列表模式下的“始终允许”决策，已知的调度封装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将持久化内部可执行文件路径而不是封装器路径。Shell 多路复用器（`busybox`、`toybox`）也会针对 Shell 小程序（`sh`、`ash` 等）进行解包，因此持久化的是内部可执行文件而不是多路复用器二进制文件。如果封装器或多路复用器无法安全解包，则不会自动持久化任何允许列表条目。

默认安全二进制文件：`jq`、`cut`、`uniq`、`head`、`tail`、`tr`、`wc`。

`grep` 和 `sort` 不在默认列表中。如果您选择加入，请为其非 stdin 工作流保留显式的允许条目。
对于安全二进制文件模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置参数模式形式将被拒绝，以防止文件操作数被作为歧义的位置参数混入。

### 安全二进制文件与允许列表

| 主题             | `tools.exec.safeBins`                                  | 允许列表 (`exec-approvals.json`)                          |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 目标             | 自动允许狭窄的 stdin 过滤器                            | 显式信任特定的可执行文件                                      |
| 匹配类型         | 可执行文件名 + 安全箱 argv 策略                        | 已解析的可执行文件路径 glob 模式                             |
| 参数范围         | 受安全箱配置文件和字面量标记规则限制                   | 仅匹配路径；参数在其他方面由您负责                            |
| 典型示例         | `jq`, `head`, `tail`, `wc`                             | `python3`, `node`, `ffmpeg`, 自定义 CLI                     |
| 最佳用途         | 管道中的低风险文本转换                                 | 具有更广泛行为或副作用的任何工具                              |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或每代理 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或每代理 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或每代理 `agents.list[].tools.exec.safeBinProfiles`）。每代理配置文件键会覆盖全局键。
- 允许列表条目位于 `agents.<id>.allowlist` 下的主机本地 `~/.openclaw/exec-approvals.json` 中（或通过控制 UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制文件出现在 `safeBins` 中但没有显式配置文件时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目构建为 `{}`（随后进行审查和收紧）。解释器/运行时二进制文件不会自动构建。

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

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、每个代理的覆盖设置和允许列表。选择一个范围（默认值或某个代理），调整策略，添加/删除允许列表模式，然后点击 **Save**。UI 会显示每个模式的 **last used** 元数据，以便您保持列表整洁。

目标选择器选择 **Gateway**（本地审批）或 **Node**。节点必须通告 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果节点尚未通告执行审批，请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持网关或节点编辑（参见 [Approvals CLI](/zh/en/cli/approvals)）。

## 审批流程

当需要提示时，网关会向操作员客户端广播 `exec.approval.requested`。Control UI 和 macOS 应用通过 `exec.approval.resolve` 解析它，然后网关将批准的请求转发给节点主机。

对于 `host=node`，审批请求包含一个规范的 `systemRunPlan` 负载。网关在转发已批准的 `system.run`
请求时，将该计划用作权威的 command/cwd/session 上下文。

## 解释器/运行时命令

基于审批的解释器/运行时运行是有意保持保守的：

- 精确的 argv/cwd/env 上下文始终是绑定的。
- 直接 Shell 脚本和直接运行时文件形式尽最大努力绑定到一个具体的本地
  文件快照。
- 如果 OpenClaw 无法为解释器/运行时命令准确识别一个具体的本地文件
  （例如 package scripts、eval forms、特定运行时的加载链或模糊的多文件
  forms），基于批准的执行将被拒绝，而不是声称其不具备的语义覆盖范围。
- 对于这些工作流，首选沙箱隔离、独立的主机边界或操作员接受更广泛运行时语义的显式受信任
  allowlist/完整工作流。

当需要批准时，exec 工具会立即返回一个批准 id。使用该 id 来
关联后续的系统事件（`Exec finished` / `Exec denied`）。如果在超时之前
未收到决定，该请求将被视为批准超时，并作为拒绝原因呈现。

确认对话框包括：

- command + args
- cwd
- agent id
- 解析的可执行文件路径
- 主机 + 策略元数据

操作：

- **允许一次** → 立即运行
- **始终允许** → 添加到允许列表 + 运行
- **拒绝** → 阻止

## 将审批转发到聊天频道

您可以将执行审批提示转发到任何聊天频道（包括插件频道），并使用 `/approve` 进行批准。这使用常规的出站交付管道。

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

### 内置聊天审批客户端

Discord 和 Telegram 也可以通过特定频道的配置充当显式的执行审批客户端。

- Discord: `channels.discord.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

这些客户端是可选启用的。如果某个频道未启用执行审批，OpenClaw 不会仅仅因为对话发生在该频道，就将该频道视为审批界面。

共享行为：

- 只有配置好的批准者才能批准或拒绝
- 请求者不需要是批准者
- 启用频道投递时，批准提示将包含命令文本
- 如果没有操作员 UI 或配置的批准客户端可以接受请求，提示将回退到 `askFallback`

Telegram 默认为批准者的私信 (`target: "dm"`)。当您希望批准提示也出现在发起请求的 Telegram 聊天/话题中时，可以切换到 `channel` 或 `both`。对于 Telegram 论坛话题，OpenClaw 会为批准提示和批准后的后续消息保留该话题。

参见：

- [Discord](/zh/en/channels/discord#exec-approvals-in-discord)
- [Telegram](/zh/en/channels/telegram#exec-approvals-in-telegram)

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

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running`（仅当命令超过运行通知阈值时）
- `Exec finished`
- `Exec denied`

这些消息在节点报告事件后发布到代理的会话中。
网关主机的 exec 批准在命令完成时（以及可选地在运行时间超过阈值时）发出相同的生命周期事件。
受批准控制的 exec 在这些消息中重用批准 ID 作为 `runId` 以便于关联。

## 影响

- **full** 功能强大；尽可能首选允许列表。
- **ask** 让您保持知情，同时仍允许快速审批。
- 按代理的允许列表可防止一个代理的审批泄露到其他代理。
- 审批仅适用于来自**授权发送者**的主机 exec 请求。未经授权的发送者无法发出 `/exec`。
- `/exec security=full` 是为授权操作员提供的会话级便利，按设计跳过审批。
  若要硬性阻止主机 exec，请将审批安全性设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

相关：

- [Exec 工具](/zh/en/tools/exec)
- [提升模式](/zh/en/tools/elevated)
- [技能](/zh/en/tools/skills)

import zh from '/components/footer/zh.mdx';

<zh />
