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

- **node host service** 通过本地 macOS 将 `system.run` 转发给 **IPC 应用**。
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

## 允许列表（每个代理）

允许列表是**按代理** 的。如果存在多个代理，请在 macOS 应用中切换您正在编辑的代理。模式是 **case-insensitive glob matches**。
模式应解析为 **binary paths**（仅基名称条目将被忽略）。
传统的 `agents.default` 条目在加载时会迁移到 `agents.main`。

示例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每个允许列表条目跟踪：

- **id** 用于 UI 身份的稳定 UUID（可选）
- **上次使用时间** 时间戳
- **上次使用的命令**
- **上次解析的路径**

## 自动允许技能 CLI

当启用 **Auto-allow skill CLIs** 时，已知技能引用的可执行文件在节点（macOS 节点或无头节点主机）上被视为已列入允许列表。这通过 Gateway(网关) RPC 使用 `skills.bins` 来获取技能二进制文件列表。如果您需要严格的手动允许列表，请禁用此功能。

重要信任说明：

- 这是一个 **隐式的便利允许列表**，与手动路径允许列表条目分开。
- 它适用于受信任的操作员环境，其中 Gateway(网关) 和节点处于同一信任边界内。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 并仅使用手动路径允许列表条目。

## 安全二进制文件 (仅 stdin)

`tools.exec.safeBins` 定义了一小部分 **仅限 stdin** 的二进制文件（例如 `jq`），它们可以在白名单模式下运行，而**无需**显式的白名单条目。Safe bins 会拒绝位置文件参数和类似路径的标记，因此它们只能对传入的流进行操作。请将其视为流过滤器的狭窄快速路径，而不是通用的信任列表。请**勿**将解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins` 中。如果某个命令旨在评估代码、执行子命令或读取文件，请优先使用显式白名单条目并保持批准提示启用。自定义 safe bins 必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式配置文件。验证仅基于 argv 形状进行确定性判断（不进行主机文件系统存在性检查），这可以防止因允许/拒绝差异而产生的文件存在预言行为。面向文件的选项对于默认的 safe bins 是被拒绝的（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。Safe bins 还会针对破坏仅 stdin 行为的选项强制执行显式的每个二进制文件的标记策略（例如 `sort -o/--output/--compress-program` 和 grep 递归标记）。在 safe-bin 模式下，长选项以故障关闭（fail-closed）方式进行验证：未知标记和模棱两可的缩写将被拒绝。按 safe-bin 配置文件拒绝的标记：

{/* SAFE_BIN_DENIED_FLAGS:START */}

- `grep`: `--dereference-recursive`, `--directories`, `--exclude-from`, `--file`, `--recursive`, `-R`, `-d`, `-f`, `-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`
  {/* SAFE_BIN_DENIED_FLAGS:END */}

Safe bins 还强制在执行时将 argv 标记视为 **字面文本**（对于仅 stdin 的片段，不进行通配符
展开和 `$VARS` 展开），因此像 `*` 或 `$HOME/...` 这样的模式不能
用于窃取文件读取。
Safe bins 还必须从受信任的二进制目录解析（系统默认值加上可选的
`tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会自动受信。
默认受信任的 safe-bin 目录故意设计得极少：`/bin`, `/usr/bin`。
如果您的 safe-bin 可执行文件位于包管理器/用户路径中（例如
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`），请将它们显式添加到
`tools.exec.safeBinTrustedDirs` 中。
Shell 链接和重定向在允许列表模式下不会自动允许。

当每个顶层段都满足允许列表（包括安全二进制文件或技能自动允许）时，允许 Shell 链接（`&&`, `||`, `;`）。在允许列表模式下，重定向仍然不受支持。在允许列表解析期间，命令替换（`$()` / 反引号）会被拒绝，包括在双引号内；如果您需要字面意义的 `$()` 文本，请使用单引号。在 macOS 伴随应用批准中，包含 Shell 控制 or 扩展语法（`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) 的原始 Shell 文本将被视为允许列表未命中，除非 Shell 二进制文件本身在允许列表中。对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求作用域的环境变量覆盖将减少为一小组显式允许列表（`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`）。对于允许列表模式下的始终允许决策，已知的调度包装器（`env`, `nice`, `nohup`, `stdbuf`, `timeout`）将保留内部可执行文件路径而不是包装器路径。Shell 多路复用器（`busybox`, `toybox`）也会针对 Shell 小程序（`sh`, `ash` 等）进行解包，因此保留的是内部可执行文件而不是多路复用器二进制文件。如果无法安全地解包包装器或多路复用器，则不会自动保留任何允许列表条目。

默认安全 bins：`jq`、`cut`、`uniq`、`head`、`tail`、`tr`、`wc`。

`grep` 和 `sort` 不在默认列表中。如果你选择加入，请为它们的非 stdin 工作流保留明确的 allowlist 条目。
对于 safe-bin 模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置模式形式会被拒绝，以防止文件操作数作为模糊的位置参数被混入。

### 安全 bins 与 allowlist 的对比

| 主题     | `tools.exec.safeBins`                         | Allowlist (`exec-approvals.json`)       |
| -------- | --------------------------------------------- | --------------------------------------- |
| 目标     | 自动允许窄 stdin 过滤器                       | 显式信任特定的可执行文件                |
| 匹配类型 | 可执行文件名称 + safe-bin argv 策略           | 已解析的可执行文件路径 glob 模式        |
| 参数范围 | 受 safe-bin 配置文件和 literal-token 规则限制 | 仅路径匹配；参数方面由你自行负责        |
| 典型示例 | `jq`、`head`、`tail`、`wc`                    | `python3`、`node`、`ffmpeg`、自定义 CLI |
| 最佳用途 | 管道中的低风险文本转换                        | 任何具有更广泛行为或副作用的工具        |

配置位置：

- `safeBins` 来自配置（`tools.exec.safeBins` 或 per-agent `agents.list[].tools.exec.safeBins`）。
- `safeBinTrustedDirs` 来自配置（`tools.exec.safeBinTrustedDirs` 或 per-agent `agents.list[].tools.exec.safeBinTrustedDirs`）。
- `safeBinProfiles` 来自配置（`tools.exec.safeBinProfiles` 或 per-agent `agents.list[].tools.exec.safeBinProfiles`）。Per-agent 配置文件键会覆盖全局键。
- 允许列表条目位于 `~/.openclaw/exec-approvals.json` 下的主机本地 `agents.<id>.allowlist` 中（或通过 Control UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制文件在没有显式配置文件的情况下出现在 `safeBins` 中时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目搭建为 `{}`（请随后审查并收紧）。解释器/运行时二进制文件不会自动搭建。

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

## Control UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、每个代理的覆盖项和允许列表。选择一个范围（Defaults 或某个代理），调整策略，添加/删除允许列表模式，然后点击 **Save**。UI 会显示每个模式的 **last used** 元数据，以便您保持列表整洁。

目标选择器选择 **Gateway(网关)**（本地审批）或一个 **Node**。节点必须通告 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。
如果一个节点尚未通告 exec 审批，请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI: `openclaw approvals` 支持网关或节点编辑（请参阅 [批准 CLI](/zh/cli/approvals)）。

## 批准流程

当需要提示时，网关会向操作员客户端广播 `exec.approval.requested`。控制 UI 和 macOS 应用通过 `exec.approval.resolve` 解析它，然后网关将批准的请求转发到节点主机。

对于 `host=node`，批准请求包含规范化的 `systemRunPlan` 有效载荷。在转发已批准的 `system.run` 请求时，网关使用该计划作为权威的 command/cwd/会话 上下文。

## 解释器/运行时命令

基于批准的解释器/运行时运行有意采用保守策略：

- 始终绑定确切的 argv/cwd/env 上下文。
- 直接 Shell 脚本和直接运行时文件形式尽可能绑定到一个具体的本地文件快照。
- 仍然解析为一个直接本地文件的常见包管理器包装器形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）在绑定之前会被解包。
- 如果 OpenClaw 无法为解释器/运行时命令准确识别一个具体的本地文件
  （例如包脚本、eval 形式、特定于运行时的加载链或模糊的多文件
  形式），将拒绝基于批准的执行，而不是声明其不具备的语义覆盖。
- 对于这些工作流，建议优先使用沙箱隔离、独立的主机边界，或明确的受信
  允许列表/完整工作流，其中操作员接受更广泛的运行时语义。

当需要审批时，exec 工具会立即返回一个审批 ID。使用该 ID 来
关联后续的系统事件 (`Exec finished` / `Exec denied`)。如果在超时前
未收到决定，该请求将被视为审批超时，并作为拒绝原因显示。

确认对话框包括：

- command + args（命令 + 参数）
- cwd（当前工作目录）
- agent id（代理 ID）
- resolved executable path（解析的可执行文件路径）
- host + policy metadata（主机 + 策略元数据）

操作：

- **允许一次** → 立即运行
- **始终允许** → 添加到允许列表并运行
- **拒绝** → 阻止

## 审批转发到聊天频道

您可以将执行审批提示转发到任何聊天渠道（包括插件渠道），并使用 `/approve` 进行审批。这使用常规的出站传递管道。

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

Discord 和 Telegram 也可以作为显式的执行审批客户端，并使用特定于渠道的配置。

- Discord: `channels.discord.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

这些客户端是可选的。如果某个渠道未启用执行审批，仅因为对话发生在该渠道，OpenClaw 不会将其视为审批界面。

共享行为：

- 只有配置好的审批者才能批准或拒绝
- 请求者无需是审批者
- 当启用渠道投递时，批准提示包含命令文本
- 如果没有操作员 UI 或配置的批准客户端可以接受该请求，提示将回退到 `askFallback`

Telegram 默认为批准人私信（`target: "dm"`）。当您希望批准提示也出现在原始 Telegram 聊天/主题中时，您可以切换到 `channel` 或 `both`。对于 Telegram 论坛主题，OpenClaw 会保留批准提示和批准后后续回复的主题。

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

安全注意事项：

- Unix 套接字模式 `0600`，令牌存储在 `exec-approvals.json` 中。
- Same-UID 对等检查。
- Challenge/response (nonce + HMAC 令牌 + 请求哈希) + 短 TTL。

## 系统事件

Exec 生命周期以系统消息形式展示：

- `Exec running` (仅当命令超过运行通知阈值时)
- `Exec finished`
- `Exec denied`

在节点报告事件后，这些消息会被发送到代理的会话。
Gateway(网关)-host exec 批准在命令完成时（以及可选地当运行时间超过阈值时）发出相同的生命周期事件。
受批准控制的 exec 会在这些消息中重用批准 id 作为 `runId` 以便于关联。

## 影响

- **full** 模式功能强大；如果可能，优先使用允许列表。
- **ask** 模式让您保持知情，同时仍允许快速批准。
- Per-agent allowlists prevent one agent’s approvals from leaking into others.
- Approvals only apply to host exec requests from **authorized senders**. Unauthorized senders cannot issue `/exec`.
- `/exec security=full` is a 会话-level convenience for authorized operators and skips approvals by design.
  To hard-block host exec, set approvals security to `deny` or deny the `exec` 工具 via 工具 policy.

Related:

- [Exec 工具](/zh/tools/exec)
- [Elevated mode](/zh/tools/elevated)
- [Skills](/zh/tools/skills)

import zh from '/components/footer/zh.mdx';

<zh />
