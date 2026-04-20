---
summary: "Exec 批准、允许列表和沙箱逃逸提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Exec 批准"
---

# Exec approvals

Exec 批准是让**沙箱隔离**代理在真实主机（`gateway` 或 `node`）上运行命令的**配套应用 / 节点主机防护**。可以将其视为一种安全联锁：只有当策略 + 允许列表 + （可选）用户批准全部达成一致时，才允许执行命令。
Exec 批准是**除了**工具策略和提升门控之外的额外措施（除非将 elevated 设置为 `full`，这会跳过批准）。
有效策略是 `tools.exec.*` 和批准默认值中的**更严格**者；如果省略批准字段，则使用 `tools.exec` 值。
主机执行还使用该机器上的本地批准状态。主机本地
`ask: "always"` 中的 `~/.openclaw/exec-approvals.json` 会持续提示，即使
会话或配置默认值请求 `ask: "on-miss"`。
使用 `openclaw approvals get`、`openclaw approvals get --gateway` 或
`openclaw approvals get --node <id|name|ip>` 来检查请求的策略、
主机策略来源和有效结果。
对于本地机器，`openclaw exec-policy show` 暴露相同的合并视图，并且
`openclaw exec-policy set|preset` 可以一步将本地请求的策略与
本地主机批准文件同步。当本地范围请求 `host=node` 时，
`openclaw exec-policy show` 会在运行时将该范围报告为由节点管理，而不是
假装本地批准文件是有效的真实来源。

如果配套应用 UI **不可用**，任何需要提示的请求都将由**ask fallback**解决（默认：拒绝）。

原生聊天批准客户端还可以在待批准消息上暴露特定于渠道的功能。例如，Matrix 可以在批准提示上预设反应快捷方式（`✅` 允许一次，`❌` 拒绝，以及 `♾️` 在可用时始终允许），同时仍将 `/approve ...` 命令保留在消息中作为后备。

## 适用范围

Exec 审批在执行主机上本地强制执行：

- **网关主机** → 网关机器上的 `openclaw` 进程
- **node host** → 节点运行器（macOS 配套应用或无头节点主机）

信任模型说明：

- 经过 Gateway(网关) 身份验证的调用者是该 Gateway(网关) 的受信任操作员。
- 配对的节点将该受信任操作员的功能扩展到节点主机。
- Exec 审批降低了意外执行的风险，但不是每用户身份验证边界。
- 已批准的节点主机运行绑定规范执行上下文：规范 cwd、精确 argv、环境绑定（如果存在），以及适用的固定可执行文件路径。
- 对于 Shell 脚本和直接解释器/运行时文件调用，OpenClaw 也会尝试绑定一个具体的本地文件操作数。如果绑定文件在批准后但在执行前发生更改，则运行将被拒绝，而不是执行已更改的内容。
- 此文件绑定是有意为之的最佳尝试，并非每种解释器/运行时加载器路径的完整语义模型。如果批准模式无法识别要绑定的确切一个具体本地文件，它将拒绝创建支持批准的运行，而不是假装完全覆盖。

macOS 分割：

- **节点主机服务** 通过本地 macOS 将 `system.run` 转发给 **IPC 应用**。
- **macOS 应用** 在 UI 上下文中强制执行批准 + 执行命令。

## 设置和存储

批准存在于执行主机上的本地 JSON 文件中：

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

## 无批准“YOLO”模式

如果您希望主机执行无需批准提示即可运行，则必须打开**两个**策略层：

- OpenClaw 配置中请求的 exec 策略 (`tools.exec.*`)
- `~/.openclaw/exec-approvals.json` 中的本地审批策略

除非您明确收紧，否则这是现在的默认主机行为：

- `tools.exec.security`: 在 `gateway`/`node` 上为 `full`
- `tools.exec.ask`: `off`
- 主机 `askFallback`: `full`

重要区别：

- `tools.exec.host=auto` 选择 exec 的运行位置：如果可用则在沙箱中，否则在网关中。
- YOLO 选择主机 exec 的审批方式：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw 不会在配置的主机执行策略之上添加单独的启发式命令混淆批准关卡。
- `auto` 不会使网关路由成为从沙箱隔离会话进行的自由覆盖。允许从 `auto` 发出每次调用 `host=node` 请求，并且仅当没有活动的沙箱运行时时，才允许从 `auto` 进行 `host=gateway`。如果您想要一个稳定的非自动默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。

如果您想要更保守的设置，请将任一层重新收紧为 `allowlist` / `on-miss`
或 `deny`。

持久化网关主机“从不提示”设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
openclaw gateway restart
```

然后设置主机审批文件以匹配：

```bash
openclaw approvals set --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

在当前计算机上使用相同网关主机策略的本地快捷方式：

```bash
openclaw exec-policy preset yolo
```

该本地快捷方式会同时更新：

- 本地 `tools.exec.host/security/ask`
- 本地 `~/.openclaw/exec-approvals.json` 默认值

它被有意限制为仅限本地。如果您需要远程更改网关主机或节点主机的审批，请继续使用 `openclaw approvals set --gateway` 或
`openclaw approvals set --node <id|name|ip>`。

对于节点主机，请改为在该节点上应用相同的审批文件：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

重要的仅限本地限制：

- `openclaw exec-policy` 不同步节点审批
- `openclaw exec-policy set --host node` 被拒绝
- 节点 exec 审批在运行时从节点获取，因此针对节点的更新必须使用 `openclaw approvals --node ...`

仅限会话的快捷方式：

- `/exec security=full ask=off` 仅更改当前会话。
- `/elevated full` 是一种应急快捷方式，也会跳过该会话的 exec 批准。

如果主机批准文件比配置更严格，则更严格的主机策略仍然优先。

## 策略旋钮

### 安全性 (`exec.security`)

- **deny**：阻止所有主机 exec 请求。
- **allowlist**：仅允许列入允许列表的命令。
- **full**：允许所有内容（等同于 elevated）。

### 询问 (`exec.ask`)

- **off**：从不提示。
- **on-miss**：仅在允许列表不匹配时提示。
- **always**：对每个命令都提示。
- 当有效的询问模式为 `always` 时，`allow-always` 持久信任不会抑制提示

### 询问回退 (`askFallback`)

如果需要提示但无法访问 UI，则由回退决定：

- **deny**：阻止。
- **allowlist**：仅在允许列表匹配时允许。
- **full**：允许。

### 内联解释器评估强化 (`tools.exec.strictInlineEval`)

当 `tools.exec.strictInlineEval=true` 时，即使解释器二进制文件本身在允许列表中，OpenClaw 也会将内联代码评估形式视为仅批准。

示例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

这是一种针对无法清晰映射到一个稳定文件操作数的解释器加载程序的纵深防御措施。在严格模式下：

- 这些命令仍需要明确的批准；
- `allow-always` 不会为它们自动持久化新的允许列表条目。

## 允许列表（每个代理）

允许列表是**每个代理** 独有的。如果存在多个代理，请在 macOS 应用中切换您正在编辑的代理。模式是**不区分大小写的 glob 匹配**。
模式应解析为**二进制路径**（仅包含基本名称的条目将被忽略）。
旧版 `agents.default` 条目在加载时会迁移到 `agents.main`。
Shell 链（如 `echo ok && pwd`）仍然需要每个顶级段都满足允许列表规则。

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

当启用**自动允许技能 CLI** 时，已知技能引用的可执行文件在节点（macOS 节点或无头节点主机）上被视为已加入允许列表。这通过 Gateway(网关) RPC 使用 `skills.bins` 来获取技能二进制列表。如果您需要严格的手动允许列表，请禁用此功能。

重要信任说明：

- 这是一个**隐式便利允许列表**，与手动路径允许列表条目分开。
- 它适用于受信任的操作员环境，其中 Gateway(网关) 和节点位于同一信任边界内。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 并仅使用手动路径允许列表条目。

## 安全二进制文件（仅 stdin）

`tools.exec.safeBins` 定义了一小部分 **stdin-only** 二进制文件（例如 `cut`），
这些文件可以在允许列表（allowlist）模式下运行，而**无需**明确的允许列表条目。安全二进制文件拒绝
位置文件参数和类似路径的标记，因此它们只能对传入流进行操作。
请将其视为用于流过滤器的狭窄快速路径，而非通用信任列表。
请**勿**将解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins`。
如果某个命令在设计上可以评估代码、执行子命令或读取文件，则首选明确的允许列表条目，并保持批准提示处于启用状态。
自定义安全二进制文件必须在 `tools.exec.safeBinProfiles.<bin>` 中定义显式配置文件。
验证仅根据 argv 形状确定性进行（不进行主机文件系统存在性检查），这
可以防止因允许/拒绝差异而产生的文件存在预言行为。
默认安全二进制文件拒绝面向文件的选项（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。
安全二进制文件还对破坏 stdin-only 行为的选项执行显式的针对每个二进制文件的标志策略（例如 `sort -o/--output/--compress-program` 和 grep 递归标志）。
在安全二进制文件模式下，长选项验证采用故障关闭（fail-closed）方式：未知标志和模糊
缩写将被拒绝。
按安全二进制文件配置文件拒绝的标志：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`：`--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

Safe bins 还会强制 argv 令牌在执行时被视为**字面文本**（对于仅 stdin 的片段，不进行通配符
扩展和 `$VARS` 扩展），因此无法使用 `*` 或 `$HOME/...` 等模式
来窃取文件读取。
Safe bins 还必须从受信任的二进制目录解析（系统默认值加上可选的
`tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会被自动信任。
默认受信任的 safe-bin 目录是有意保持最少的：`/bin`, `/usr/bin`。
如果您的 safe-bin 可执行文件位于包管理器/用户路径中（例如
`/opt/homebrew/bin`, `/usr/local/bin`, `/opt/local/bin`, `/snap/bin`），请将它们显式
添加到 `tools.exec.safeBinTrustedDirs` 中。
Shell 链接和重定向在允许列表模式下不会自动允许。

当每个顶层段都满足允许列表（包括安全 bins 或技能自动允许）时，允许 Shell 链接（`&&`、`||`、`;`）。重定向在允许列表模式下仍然不受支持。在允许列表解析期间会拒绝命令替换（`$()` / 反引号），包括在双引号内；如果您需要字面意义的 `$()` 文本，请使用单引号。
在 macOS 伴随应用审批中，包含 Shell 控制或扩展语法（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`) 的原始 Shell 文本将被视为允许列表未命中，除非 Shell 二进制文件本身在允许列表中。
对于 Shell 封装器（`bash|sh|zsh ... -c/-lc`），请求范围的 env 覆盖被缩减为一个小的显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
对于允许列表模式中的“始终允许”决定，已知的调度封装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将持久化内部可执行文件路径而不是封装器路径。Shell 多路复用器（`busybox`、`toybox`）也会针对 Shell 小程序（`sh`、`ash` 等）进行解包，因此持久化的是内部可执行文件而不是多路复用器二进制文件。如果无法安全地解包封装器或多路复用器，则不会自动持久化允许列表条目。
如果您将 `python3` 或 `node` 等解释器添加到允许列表，请首选 `tools.exec.strictInlineEval=true`，这样内联评估仍然需要显式审批。在严格模式下，`allow-always` 仍然可以持久化良性的解释器/脚本调用，但不会自动持久化内联评估载体。

默认安全二进制文件：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`，`uniq`，`head`，`tail`，`tr`，`wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果您选择启用，请为它们的非 stdin 工作流程保留明确的允许条目。
对于安全二进制文件模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置参数模式形式将被拒绝，以防止文件操作数被作为模糊的位置参数混入。

### 安全二进制文件与允许列表对比

| 主题     | `tools.exec.safeBins`                        | 允许列表 (`exec-approvals.json`)              |
| -------- | -------------------------------------------- | --------------------------------------------- |
| 目标     | 自动允许窄 stdin 过滤器                      | 显式信任特定的可执行文件                      |
| 匹配类型 | 可执行文件名称 + 安全二进制文件 argv 策略    | 已解析的可执行文件路径 glob 模式              |
| 参数范围 | 受安全二进制文件配置文件和字面量标记规则限制 | 仅路径匹配；否则参数由您自己负责              |
| 典型示例 | `head`，`tail`，`tr`，`wc`                   | `jq`，`python3`，`node`，`ffmpeg`，自定义 CLI |
| 最佳用途 | 管道中的低风险文本转换                       | 具有更广泛行为或副作用的任何工具              |

配置位置：

- `safeBins` 来自配置 (`tools.exec.safeBins` 或每代理 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 来自配置 (`tools.exec.safeBinTrustedDirs` 或每代理 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 来自配置 (`tools.exec.safeBinProfiles` 或每代理 `agents.list[].tools.exec.safeBinProfiles`)。每代理配置文件键覆盖全局键。
- 允许列表条目位于主机本地 `~/.openclaw/exec-approvals.json` 下的 `agents.<id>.allowlist` 中（或通过控制 UI / `openclaw approvals allowlist ...`）。
- 当解释器/运行时二进制文件在没有显式配置文件的情况下出现在 `safeBins` 中时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目构建为 `{}`（请随后审查并收紧）。解释器/运行时二进制文件不会被自动构建。

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

如果您显式选择 `jq` 加入 `safeBins`，OpenClaw 仍会在安全二进制文件模式下拒绝 `env` 内置命令，因此 `jq -n env` 无法在没有显式允许列表路径或批准提示的情况下转储主机进程环境。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、每个代理的覆盖设置和允许列表。选择一个范围（Defaults 或代理），调整策略，添加/删除允许列表模式，然后点击 **Save**。UI 会显示每个模式的 **last used** 元数据，以便您可以保持列表整洁。

目标选择器选择 **Gateway(网关)**（本地批准）或 **Node**。节点必须通告 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果节点尚未通告执行批准，请直接编辑其本地 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持网关或节点编辑（请参阅 [Approvals CLI](/zh/cli/approvals)）。

## 批准流程

当需要提示时，网关会向操作员客户端广播 `exec.approval.requested`。Control UI 和 macOS 应用通过 `exec.approval.resolve` 解析它，然后网关将批准的请求转发到节点主机。

对于 `host=node`，批准请求包含一个规范的 `systemRunPlan` 有效负载。当转发批准的 `system.run` 请求时，网关将该计划用作权威的命令/cwd/会话 上下文。

这对于异步批准延迟很重要：

- 节点执行路径会预先准备一个规范计划
- 批准记录存储该计划及其绑定元数据
- 一旦获得批准，最终转发的 `system.run` 调用将重用存储的计划，
  而不是信任后续调用者的编辑
- 如果调用者在创建批准请求后更改了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，网关会将转发的运行作为批准不匹配而拒绝。

## 解释器/运行时命令

基于批准的解释器/运行时运行是有意保守的：

- 确切的 argv/cwd/env 上下文始终是绑定的。
- 直接 Shell 脚本和直接运行时文件形式会尽力绑定到一个具体的本地
  文件快照。
- 仍然解析为一个直接本地文件的常见包管理器包装器形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）会在绑定之前被解包。
- 如果 OpenClaw 无法为解释器/运行时命令准确识别一个具体的本地文件
  （例如包脚本、eval 形式、特定于运行时的加载器链或歧义的多文件
  形式），则拒绝基于批准的执行，而不是声明其不具备的语义覆盖范围。
- 对于这些工作流，首选沙箱隔离、独立的主机边界，或显式的受信任
  允许列表/完整工作流，其中操作员接受更广泛的运行时语义。

当需要批准时，exec 工具会立即返回一个批准 ID。使用该 ID 关联
后续的系统事件（`Exec finished` / `Exec denied`）。如果超时前未收到决定，
则该请求将被视为批准超时，并作为拒绝原因呈现。

### 后续交付行为

在批准的异步 exec 完成后，OpenClaw 向同一会话发送后续 `agent` 回合。

- 如果存在有效的外部交付目标（可交付渠道加上目标 `to`），则后续交付使用该渠道。
- 在没有外部目标的仅 Web 聊天或内部会话流程中，后续交付仅限于会话（`deliver: false`）。
- 如果调用者在没有可解析的外部渠道的情况下显式请求严格的外部交付，则请求将失败，错误为 `INVALID_REQUEST`。
- 如果启用了 `bestEffortDeliver` 且无法解析任何外部渠道，传递将降级为仅限会话，而不是失败。

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

您可以将执行批准提示转发到任何聊天渠道（包括插件渠道），并使用 `/approve` 进行批准。这使用正常的出站传递管道。

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

`/approve` 命令同时处理执行批准和插件批准。如果 ID 与待处理的执行批准不匹配，它会自动检查插件批准。

### 插件批准转发

插件批准转发使用与执行批准相同的传递管道，但在 `approvals.plugin` 下有其自己的独立配置。启用或禁用一个不会影响另一个。

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

支持共享交互式回复的渠道会为执行批准和插件批准呈现相同的批准按钮。没有共享交互式 UI 的渠道会回退到带有 `/approve`
说明的纯文本。

### 在任何渠道上进行同渠道批准

当执行或插件批准请求源自可传递的聊天界面时，默认情况下，同一聊天现在可以使用 `/approve` 进行批准。除了现有的 Web UI 和终端 UI 流程外，这适用于 Slack、Matrix 和
Microsoft Teams 等渠道。

此共享文本命令路径对该会话使用正常的渠道身份验证模型。如果发起的聊天已经可以发送命令并接收回复，则批准请求不再需要单独的本地传递适配器来保持待处理状态。

Discord 和 Telegram 也支持同频道 `/approve`，但即使禁用了原生审批传递，这些频道仍使用其已解析的审批人列表进行授权。

对于直接调用 Gateway(网关) 的 Telegram 和其他原生审批客户端，此回退有针对性地限于“未找到审批”的失败情况。真正的执行审批拒绝/错误不会作为插件审批静默重试。

### 原生审批传递

某些渠道也可以充当原生审批客户端。原生客户端在共享的同频道 `/approve` 流程之上，增加了审批人私信、原始聊天分发和特定于渠道的交互式审批 UX。

当可以使用原生审批卡片/按钮时，该原生 UI 是面向代理的主要路径。除非工具结果表明聊天审批不可用或手动审批是唯一剩余的路径，否则代理不应重复输出纯聊天 `/approve` 命令。

通用模型：

- 主机执行策略仍然决定是否需要执行审批
- `approvals.exec` 控制是否将审批提示转发到其他聊天目标
- `channels.<channel>.execApprovals` 控制该渠道是否充当原生审批客户端

当以下所有条件均满足时，原生审批客户端会自动启用私信优先传递：

- 该渠道支持原生审批传递
- 可以从显式的 `execApprovals.approvers` 或该渠道记录的回退源中解析审批人
- `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"`

设置 `enabled: false` 以显式禁用原生审批客户端。设置 `enabled: true` 以在解析出审批人时强制启用它。公共原始聊天传递通过 `channels.<channel>.execApprovals.target` 保持显式。

常见问题：[为什么聊天审批有两个执行审批配置？](/zh/help/faq#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord: `channels.discord.execApprovals.*`
- Slack: `channels.slack.execApprovals.*`
- Telegram: `channels.telegram.execApprovals.*`

这些原生审批客户端在共享的同频道 `/approve` 流程和共享审批按钮之上，增加了私信路由和可选的频道分发。

共享行为：

- Slack、Matrix、Microsoft Teams 和类似的可传递聊天使用正常的渠道身份验证模型，用于同一聊天中的 `/approve`
- 当原生审批客户端自动启用时，默认的原生传递目标是审批人私信
- 对于 Discord 和 Telegram，只有已解析的审批人可以批准或拒绝
- Discord 审批人可以是显式的 (`execApprovals.approvers`) 或从 `commands.ownerAllowFrom` 推断得出
- Telegram 审批人可以是显式的 (`execApprovals.approvers`) 或从现有的所有者配置 (`allowFrom`，以及支持时的直接消息 `defaultTo`) 推断得出
- Slack 审批人可以是显式的 (`execApprovals.approvers`) 或从 `commands.ownerAllowFrom` 推断得出
- Slack 原生按钮保留审批 id 类型，因此 `plugin:` id 可以解析插件审批，而无需第二层 Slack 本地回退层
- Matrix 原生私信/渠道路由和反应快捷键处理执行审批和插件审批；插件授权仍来自 `channels.matrix.dm.allowFrom`
- 请求者不需要是审批人
- 当该聊天已支持命令和回复时，发起聊天可以直接使用 `/approve` 进行批准
- 原生 Discord 审批按钮按审批 id 类型路由：`plugin:` id 直接进入插件审批，其他所有内容进入执行审批
- 原生 Telegram 审批按钮遵循与 `/approve` 相同的有界执行到插件回退机制
- 当原生 `target` 启用发起聊天传递时，审批提示包含命令文本
- 待处理的执行审批默认在 30 分钟后过期
- 如果没有操作员 UI 或配置的审批客户端可以接受请求，提示将回退到 `askFallback`

Telegram 默认为审批人私信 (`target: "dm"`)。当您希望审批提示也出现在发起的 Telegram 聊天/主题中时，您可以切换到 `channel` 或 `both`。对于 Telegram 论坛主题，OpenClaw 会为审批提示和批准后的后续跟进保留主题。

参考：

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

- Unix socket 模式 `0600`，token 存储在 `exec-approvals.json` 中。
- 相同 UID 对等检查。
- 挑战/响应（nonce + HMAC token + 请求哈希）+ 短 TTL。

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running`（仅当命令超过运行通知阈值时）
- `Exec finished`
- `Exec denied`

这些消息在节点报告事件后发布到代理的会话中。
Gateway(网关) 承载的 exec 批准在命令完成时（以及可选地在运行时间超过阈值时）会发出相同的生命周期事件。
需要批准的 exec 会在这些消息中复用批准 ID 作为 `runId`，以便于关联。

## 拒绝批准的行为

当异步 exec 批准被拒绝时，OpenClaw 会阻止代理重用会话中同一命令的任何早期运行的输出。拒绝原因会附带明确的指导信息，即没有可用的命令输出，这可以阻止代理声称有新输出或使用先前成功运行的过时结果重复执行被拒绝的命令。

## 影响

- **full** 模式功能强大；请尽可能使用允许列表。
- **ask** 模式让您随时了解情况，同时仍允许快速批准。
- 每个代理的允许列表可防止一个代理的批准泄漏到其他代理。
- 批准仅适用于来自**授权发送者**的主机 exec 请求。未经授权的发送者无法发出 `/exec`。
- `/exec security=full` 是面向授权操作员的会话级便利功能，旨在跳过批准。
  若要彻底阻止主机 exec，请将批准安全性设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

相关：

- [Exec 工具](/zh/tools/exec)
- [提升模式](/zh/tools/elevated)
- [Skills](/zh/tools/skills)

## 相关

- [Exec](/zh/tools/exec) — shell 命令执行工具
- [沙箱隔离](/zh/gateway/sandboxing) — 沙箱模式和工作区访问
- [安全性](/zh/gateway/security) — 安全模型和加固
- [沙箱 vs 工具策略 vs 提权](/zh/gateway/sandbox-vs-tool-policy-vs-elevated) — 何时使用每种方式
