---
summary: "Exec approvals、allowlists 和沙箱逃逸提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Exec Approvals"
---

# Exec approvals

Exec approvals 是允许沙箱化代理在真实主机（`gateway` 或 `node`）上运行命令的**配套应用 / 节点主机护栏**。您可以将其视为一种安全互锁装置：只有当策略 + allowlist + （可选）用户批准全部达成一致时，才允许执行命令。
Exec approvals 是**除了**工具策略和提升门控之外的安全措施（除非提升设置为 `full`，这将跳过批准）。
有效策略是 `tools.exec.*` 和批准默认值中**更严格**的那个；如果省略了批准字段，则使用 `tools.exec` 值。

如果配套应用 UI **不可用**，任何需要提示的请求都将由**ask fallback**解决（默认：拒绝）。

## Where it applies

Exec approvals 在执行主机上本地执行：

- **gateway host** → 网关机器上的 `openclaw` 进程
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

- **node host service** 通过本地 IPC 将 `system.run` 转发给 **macOS app**。
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

### 安全性 (`exec.security`)

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

允许列表是**按代理** 的。如果存在多个代理，请在 macOS app 中切换您正在编辑的代理。模式为**不区分大小写的 glob 匹配**。模式应解析为**二进制路径**（仅包含基本名称的条目将被忽略）。旧的 `agents.default` 条目在加载时会迁移到 `agents.main`。

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

当启用 **Auto-allow skill CLIs** 时，已知技能引用的可执行文件将在节点（macOS 节点或无头节点主机）上被视为已加入允许列表。这通过 Gateway RPC 使用 `skills.bins` 来获取技能 bin 列表。如果您需要严格的手动允许列表，请禁用此功能。

重要信任说明：

- 这是一个**隐式的便利允许列表**，与手动路径允许列表条目分开。
- 它适用于 Gateway 和节点处于同一信任边界的受信任操作员环境。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 并仅使用手动路径允许列表条目。

## 安全 Bin（仅 stdin）

`tools.exec.safeBins` 定义了一小部分 **仅限 stdin** 的二进制文件（例如 `jq`），它们可以在 **不** 包含显式允许列表条目的情况下以允许列表模式运行。安全二进制文件会拒绝位置文件参数和类似路径的令牌，因此它们只能对传入流进行操作。应将其视为流过滤器的狭窄快速路径，而不是通用信任列表。**切勿** 将解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins` 中。如果某个命令旨在执行代码评估、执行子命令或读取文件，请优先使用显式允许列表条目并保持批准提示处于启用状态。自定义安全二进制文件必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式配置文件。验证仅基于 argv 形状进行确定性检查（不进行主机文件系统存在性检查），这可以防止因允许/拒绝差异而产生文件存在预言行为。针对默认安全二进制文件，基于文件的选项会被拒绝（例如 `sort -o`、`sort --output`、`sort --files0-from`、`sort --compress-program`、`sort --random-source`、`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、`grep -f/--file`）。安全二进制文件还会对破坏仅 stdin 行为的选项执行显式的每二进制文件标志策略（例如 `sort -o/--output/--compress-program` 和 grep 递归标志）。在安全二进制模式下，长选项验证采用“默认拒绝”方式：未知标志和模糊缩写会被拒绝。按安全二进制配置文件拒绝的标志：

{/* SAFE_BIN_DENIED_FLAGS:START */}

- `grep`：`--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`：`--argfile`、`--from-file`、`--library-path`、`--rawfile`、`--slurpfile`、`-L`、`-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`
{/* SAFE_BIN_DENIED_FLAGS:END */}

Safe bins 还强制将 argv 标记在执行时视为**纯文本**（针对仅 stdin 的部分不进行 glob
和 `$VARS` 展开），因此像 `*` 或 `$HOME/...` 这样的模式不能被
用于窃取文件读取。
Safe bins 还必须从受信任的二进制目录解析（系统默认加上可选的
`tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会自动受信任。
默认受信任的 safe-bin 目录是有意保持极简的：`/bin`, `/usr/bin`。
如果您的 safe-bin 可执行文件位于包管理器/用户路径中（例如
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`），请将它们显式添加到
`tools.exec.safeBinTrustedDirs`。
在 allowlist 模式下，Shell 链接和重定向不会自动被允许。

当每个顶层段都满足允许列表（包括安全 bins 或技能自动允许）时，允许 Shell 链接（`&&`、`||`、`;`）。在允许列表模式下，不支持重定向。
在允许列表解析期间会拒绝命令替换（`$()` / 反引号），包括在双引号内；如果需要字面量 `$()` 文本，请使用单引号。
在 macOS 伴随应用审批中，包含 Shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`)的原始 Shell 文本将被视为允许列表未命中，除非 Shell 二进制文件本身在允许列表中。
对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求范围的 env 覆盖将缩减为一小组显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
对于允许列表模式下的“始终允许”决策，已知的调度包装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将持久化内部可执行文件路径，而不是包装器路径。Shell 多路复用器（`busybox`、`toybox`）也会针对 Shell 小程序（`sh`、`ash` 等）进行解包，以便持久化内部可执行文件而不是多路复用器二进制文件。如果无法安全地解包包装器或多路复用器，则不会自动持久化任何允许列表条目。

默认安全 bins：`jq`、`cut`、`uniq`、`head`、`tail`、`tr`、`wc`。

`grep` 和 `sort` 不在默认列表中。如果您选择加入，请为它们的非 stdin 工作流程保留显式允许列表条目。
对于安全二进制模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置参数形式将被拒绝，以防止文件操作数作为模糊的位置参数被混入。

### 安全二进制 与允许列表

| 主题            | `tools.exec.safeBins`                                  | 允许列表 (`exec-approvals.json`)                            |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 目标             | 自动允许窄 stdin 过滤器                        | 显式信任特定的可执行文件                        |
| 匹配类型       | 可执行文件名称 + 安全二进制 argv 策略                 | 已解析的可执行文件路径 glob 模式                        |
| 参数范围   | 受安全二进制配置文件和字面标记规则限制 | 仅路径匹配；否则参数由您负责 |
| 典型示例 | `jq`, `head`, `tail`, `wc`                             | `python3`, `node`, `ffmpeg`, 自定义 CLIs                     |
| 最佳用途         | 管道中的低风险文本转换                  | 具有更广泛行为或副作用的任何工具               |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或每代理 `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或每代理 `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或每代理 `agents.list[].tools.exec.safeBinProfiles`）。每代理配置文件键会覆盖全局键。
- 允许列表条目位于 `agents.<id>.allowlist` 下的主机本地 `~/.openclaw/exec-approvals.json` 中（或通过 Control UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制文件在 `safeBins` 中出现但没有显式配置文件时，`openclaw security audit` 会使用 `tools.exec.safe_bins_interpreter_unprofiled` 发出警告。
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

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、每个代理的覆盖项以及允许列表。选择一个范围（Defaults 或某个代理），调整策略，添加/删除允许列表模式，然后点击 **Save**。UI 会显示每个模式的 **last used** 元数据，以便您保持列表整洁。

目标选择器选择 **Gateway**（本地批准）或 **Node**。节点必须通告 `system.execApprovals.get/set`（macOS 应用程序或无头节点主机）。如果节点尚未通告执行批准，请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持网关或节点编辑（请参阅 [Approvals CLI](/zh/en/cli/approvals)）。

## 批准流程

当需要提示时，网关会向操作员客户端广播 `exec.approval.requested`。Control UI 和 macOS 应用程序通过 `exec.approval.resolve` 解析它，然后网关将批准的请求转发给节点主机。

对于 `host=node`，批准请求包含一个规范的 `systemRunPlan` 有效载荷。网关在转发批准的 `system.run` 请求时，将该计划用作权威的 command/cwd/session 上下文。

## 解释器/运行时命令

基于批准的解释器/运行时运行是有意保守的：

- 精确的 argv/cwd/env 上下文始终是绑定的。
- 直接 Shell 脚本和直接运行时文件形式尽最大努力绑定到一个具体本地
  文件快照。
- 如果 OpenClaw 无法为解释器/运行时命令精确识别出一个具体本地文件
  （例如包脚本、eval 形式、运行时特定的加载器链或歧义的多文件形式），将拒绝基于批准的执行，而不是声称其不具备的语义覆盖。
- 对于这些工作流程，首选沙盒机制、独立的主机边界或操作员接受更广泛运行时语义的明确受信任
  许可列表/完整工作流程。

当需要批准时，exec 工具会立即返回一个批准 ID。使用该 ID 关联后续的系统事件 (`Exec finished` / `Exec denied`)。如果在超时前未收到决定，该请求将被视为批准超时，并作为拒绝原因显示出来。

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

您可以将 exec 批准提示转发到任何聊天频道（包括插件频道），并通过 `/approve` 进行批准。这使用正常的出站交付管道。

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
- 如果没有操作员 UI 或配置的批准客户端可以接受请求，提示将回退到 `askFallback`

Telegram 默认为批准者私信 (DM) (`target: "dm"`)。当您希望批准提示也出现在发起的 Telegram 聊天/话题中时，可以切换到 `channel` 或 `both`。对于 Telegram 论坛话题，OpenClaw 会保留批准提示和批准后后续回复的话题。

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
- 相同 UID 对等体检查。
- 质询/响应（nonce + HMAC 令牌 + 请求哈希）+ 短 TTL。

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running`（仅当命令超过运行通知阈值时）
- `Exec finished`
- `Exec denied`

这些消息在节点报告事件后发送到代理的会话。
网关主机 exec 批准在命令完成时（以及可选地，当运行时间超过阈值时）会发出相同的生命周期事件。
需要批准的 exec 在这些消息中重用批准 id 作为 `runId` 以便轻松关联。

## 影响

- **full** 功能强大；尽可能优先使用允许列表。
- **ask** 让您保持知情，同时仍允许快速批准。
- 按代理设置的允许列表可防止一个代理的批准泄露到其他代理。
- 批准仅适用于来自**授权发送者**的主机 exec 请求。未授权的发送者无法发出 `/exec`。
- `/exec security=full` 是授权操作员的会话级便利功能，设计上跳过批准。
  要硬阻断主机 exec，请将批准安全性设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

相关：

- [Exec 工具](/zh/en/tools/exec)
- [提升模式](/zh/en/tools/elevated)
- [技能](/zh/en/tools/skills)
