---
summary: "Exec 审批、允许列表和沙箱逃逸提示"
read_when:
  - Configuring exec approvals or allowlists
  - Implementing exec approval UX in the macOS app
  - Reviewing sandbox escape prompts and implications
title: "Exec 审批"
---

# Exec approvals

Exec 审批是允许沙箱隔离的代理在真实主机（`gateway` 或 `node`）上运行命令的**配套应用 / 节点主机护栏**。可以将其视为安全互锁：
只有当策略 + 允许列表 + （可选）用户审批达成一致时，才允许运行命令。
Exec 审批是工具策略和提升门控的**补充**（除非将 elevated 设置为 `full`，这会跳过审批）。
有效策略是 `tools.exec.*` 和审批默认值中的**更严格者**；如果省略了审批字段，则使用 `tools.exec` 值。
主机执行还使用该机器上的本地审批状态。即使在会话或配置默认值请求 `ask: "on-miss"` 时，主机本地的
`ask: "always"`（在 `~/.openclaw/exec-approvals.json` 中）仍会不断提示。
使用 `openclaw approvals get`、`openclaw approvals get --gateway` 或
`openclaw approvals get --node <id|name|ip>` 来检查请求的策略、
主机策略源和有效结果。

如果配套应用 UI **不可用**，任何需要提示的请求都将由**ask fallback**解决（默认：拒绝）。

原生聊天审批客户端还可以在待审批消息上暴露特定于渠道的便利功能。例如，Matrix 可以在审批提示上预设反应快捷方式（`✅` 允许一次，`❌` 拒绝，以及 `♾️` 在可用时始终允许），同时仍保留消息中的 `/approve ...` 命令作为备用。

## 适用范围

Exec 审批在执行主机上本地强制执行：

- **gateway host** → 网关机器上的 `openclaw` 进程
- **node host** → 节点运行器（macOS 配套应用或无头节点主机）

信任模型说明：

- 经过 Gateway(网关) 身份验证的调用者是该 Gateway(网关) 的受信任操作员。
- 配对的节点将该受信任操作员的功能扩展到节点主机。
- Exec 审批降低了意外执行的风险，但不是每用户身份验证边界。
- 已批准的节点主机运行绑定规范执行上下文：规范 cwd、精确 argv、环境绑定（如果存在），以及适用的固定可执行文件路径。
- 对于 Shell 脚本和直接解释器/运行时文件调用，OpenClaw 也会尝试绑定一个具体的本地文件操作数。如果绑定文件在批准后但在执行前发生更改，则运行将被拒绝，而不是执行已更改的内容。
- 此文件绑定是有意为之的最佳尝试，并非每种解释器/运行时加载器路径的完整语义模型。如果批准模式无法识别要绑定的确切一个具体本地文件，它将拒绝创建支持批准的运行，而不是假装完全覆盖。

macOS 分割：

- **节点主机服务** 通过本地 macOS 将 `system.run` 转发到 **IPC 应用**。
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

- OpenClaw 配置中请求的执行策略 (`tools.exec.*`)
- `~/.openclaw/exec-approvals.json` 中的主机本地批准策略

除非您明确收紧，否则这是现在的默认主机行为：

- `tools.exec.security`: `gateway`/`node` 上设为 `full`
- `tools.exec.ask`: `off`
- 主机 `askFallback`: `full`

重要区别：

- `tools.exec.host=auto` 选择执行运行的位置：如果可用则使用沙箱，否则使用网关。
- YOLO 选择主机执行的批准方式：`security=full` 加上 `ask=off`。
- 在 YOLO 模式下，OpenClaw 不会在配置的主机执行策略之上添加单独的启发式命令混淆批准关卡。
- `auto` 并不会使网关路由成为从沙箱隔离会话进行的自由覆盖操作。允许从 `auto` 发出单次 `host=node` 请求，并且仅当未激活沙箱运行时时，才允许从 `auto` 进行 `host=gateway`。如果您希望有一个稳定的非自动默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。

如果您希望采用更保守的设置，请将任一层收紧回 `allowlist` / `on-miss` 或 `deny`。

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

对于节点主机，改为在该节点上应用相同的审批文件：

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

仅限会话的快捷方式：

- `/exec security=full ask=off` 仅更改当前会话。
- `/elevated full` 是一种应急快捷方式，也会跳过该会话的 exec 审批。

如果主机审批文件保持比配置更严格，则更严格的主机策略仍然优先。

## 策略控制

### 安全性 (`exec.security`)

- **deny**：阻止所有主机 exec 请求。
- **allowlist**：仅允许列入白名单的命令。
- **full**：允许所有内容（等同于提权）。

### 询问 (`exec.ask`)

- **off**：从不提示。
- **on-miss**：仅在白名单不匹配时提示。
- **always**：在每个命令上提示。
- 当有效的询问模式为 `always` 时，`allow-always` 持久信任不会抑制提示

### 询问回退 (`askFallback`)

如果需要提示但无法访问 UI，则由回退决定：

- **deny**：阻止。
- **allowlist**：仅当白名单匹配时允许。
- **full**：允许。

### 内联解释器评估硬化 (`tools.exec.strictInlineEval`)

当 `tools.exec.strictInlineEval=true` 时，即使解释器二进制文件本身在白名单中，OpenClaw 也将内联代码评估形式视为仅限审批。

示例：

- `python -c`
- `node -e`，`node --eval`，`node -p`
- `ruby -e`
- `perl -e`，`perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

对于不能清晰地映射到一个稳定文件操作数的解释器加载器，这是一种深度防御。在严格模式下：

- 这些命令仍然需要显式批准；
- `allow-always` 不会自动为它们持久化新的允许列表条目。

## 允许列表（每个 Agent）

允许列表是**每个 Agent**的。如果存在多个 Agent，请在 macOS 应用中切换您正在编辑的 Agent。模式为**不区分大小写的 glob 匹配**。
模式应解析为**二进制路径**（仅包含基本名称的条目将被忽略）。
旧的 `agents.default` 条目在加载时会迁移到 `agents.main`。
诸如 `echo ok && pwd` 之类的 Shell 链仍然需要每个顶级段都满足允许列表规则。

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

启用**自动允许技能 CLI**后，已知技能引用的可执行文件在节点（macOS 节点或无头节点主机）上被视为已加入允许列表。这通过 Gateway(网关) RPC 使用 `skills.bins` 来获取技能二进制列表。如果您需要严格的手动允许列表，请禁用此功能。

重要信任说明：

- 这是一个**隐式的便捷允许列表**，与手动路径允许列表条目分开。
- 它适用于受信任的操作员环境，其中 Gateway(网关) 和节点处于同一信任边界内。
- 如果您需要严格的显式信任，请保持 `autoAllowSkills: false` 并仅使用手动路径允许列表条目。

## 安全二进制文件（仅 stdin）

`tools.exec.safeBins` 定义了一小部分 **仅限 stdin** 的二进制文件（例如 `cut`），
它们可以在允许列表模式下运行，而**无需**明确的允许列表条目。安全二进制文件会拒绝
位置文件参数和类似路径的标记，因此它们只能对传入流进行操作。
请将其视为流过滤器的狭义快速路径，而不是通用信任列表。
请**勿**将解释器或运行时二进制文件（例如 `python3`、`node`、`ruby`、`bash`、`sh`、`zsh`）添加到 `safeBins` 中。
如果某个命令按设计可以评估代码、执行子命令或读取文件，则优先使用明确的允许列表条目并保持批准提示启用。
自定义安全二进制文件必须在 `tools.exec.safeBinProfiles.<bin>` 中定义明确的配置文件。
验证仅根据 argv 形状确定（不检查主机文件系统是否存在），这可以防止
根据允许/拒绝差异产生的文件存在预言行为。
针对默认安全二进制文件，会拒绝面向文件的选项（例如 `sort -o`、`sort --output`、
`sort --files0-from`、`sort --compress-program`、`sort --random-source`、
`sort --temporary-directory`/`-T`、`wc --files0-from`、`jq -f/--from-file`、
`grep -f/--file`）。
安全二进制文件还会针对破坏仅 stdin 行为的选项执行明确的针对每个二进制文件的标记策略
（例如 `sort -o/--output/--compress-program` 和 grep 递归标记）。
在安全二进制文件模式下，长选项以故障关闭方式验证：未知标记和有歧义的
缩写将被拒绝。
按安全二进制文件配置文件拒绝的标记：

[//]: # "SAFE_BIN_DENIED_FLAGS:START"

- `grep`：`--dereference-recursive`、`--directories`、`--exclude-from`、`--file`、`--recursive`、`-R`、`-d`、`-f`、`-r`
- `jq`: `--argfile`, `--from-file`, `--library-path`, `--rawfile`, `--slurpfile`, `-L`, `-f`
- `sort`: `--compress-program`, `--files0-from`, `--output`, `--random-source`, `--temporary-directory`, `-T`, `-o`
- `wc`: `--files0-from`

[//]: # "SAFE_BIN_DENIED_FLAGS:END"

对于仅 stdin 段，安全 bin 还强制在执行时将 argv 标记视为**字面文本**（不进行 globbing
且不进行 `$VARS` 展开），因此无法使用像 `*` 或 `$HOME/...` 这样的模式来
走私文件读取。
安全 bin 还必须从受信任的二进制目录解析（系统默认值加上可选的
`tools.exec.safeBinTrustedDirs`）。`PATH` 条目永远不会自动受信。
默认的受信任安全 bin 目录有意保持最少：`/bin`、`/usr/bin`。
如果您的安全 bin 可执行文件位于包管理器/用户路径中（例如
`/opt/homebrew/bin`、`/usr/local/bin`、`/opt/local/bin`、`/snap/bin`），请将它们明确
添加到 `tools.exec.safeBinTrustedDirs`。
在允许列表模式下，Shell 链接和重定向不会自动允许。

当每个顶层段都满足允许列表（包括 safe bins 或 skill auto-allow）时，允许 Shell 链接（`&&`、`||`、`;`）。在允许列表模式下，重定向仍然不受支持。
在允许列表解析期间，会拒绝命令替换（`$()` / 反引号），包括在双引号内；如果您需要字面量的 `$()` 文本，请使用单引号。
在 macOS 伴随应用审批中，包含 Shell 控制或扩展语法的原始 Shell 文本（`&&`、`||`、`;`、`|`、`` ` ``, `$`, `<`, `>`, `(`, `)`）将被视为允许列表未命中，除非 Shell 二进制文件本身在允许列表中。
对于 Shell 封装器（`bash|sh|zsh ... -c/-lc`），请求范围的 env 覆盖将被缩减为一小组显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
对于允许列表模式下的“始终允许”决策，已知的调度封装器（`env`、`nice`、`nohup`、`stdbuf`、`timeout`）将保留内部可执行文件路径，而不是封装器路径。对于 Shell 小程序（`sh`、`ash` 等），Shell 多路复用器（`busybox`、`toybox`）也会被解包，因此会保留内部可执行文件，而不是多路复用器二进制文件。如果无法安全地解包封装器或多路复用器，则不会自动保留允许列表条目。
如果您允许列出解释器（如 `python3` 或 `node`），请首选 `tools.exec.strictInlineEval=true`，以便内联 eval 仍然需要显式审批。在严格模式下，`allow-always` 仍然可以保留良性解释器/脚本调用，但不会自动保留内联 eval 载体。

默认安全二进制文件：

[//]: # "SAFE_BIN_DEFAULTS:START"

`cut`, `uniq`, `head`, `tail`, `tr`, `wc`

[//]: # "SAFE_BIN_DEFAULTS:END"

`grep` 和 `sort` 不在默认列表中。如果您选择加入，请为它们的非 stdin 工作流保留明确的允许列表条目。
对于安全二进制模式下的 `grep`，请使用 `-e`/`--regexp` 提供模式；位置参数模式将被拒绝，以防止文件操作数被混入为模糊的位置参数。

### 安全二进制文件与允许列表

| 主题     | `tools.exec.safeBins`                    | 允许列表 (`exec-approvals.json`)              |
| -------- | ---------------------------------------- | --------------------------------------------- |
| 目标     | 自动允许狭窄的 stdin 过滤器              | 显式信任特定的可执行文件                      |
| 匹配类型 | 可执行文件名称 + 安全二进制 argv 策略    | 解析后的可执行文件路径全局模式                |
| 参数范围 | 受安全二进制配置文件和字面量令牌规则限制 | 仅路径匹配；参数由您自行负责                  |
| 典型示例 | `head`, `tail`, `tr`, `wc`               | `jq`, `python3`, `node`, `ffmpeg`, 自定义 CLI |
| 最佳用途 | 管道中的低风险文本转换                   | 任何具有更广泛行为或副作用的工具              |

配置位置：

- `safeBins` 来自配置 (`tools.exec.safeBins` 或每个代理的 `agents.list[].tools.exec.safeBins`)。
- `safeBinTrustedDirs` 来自配置 (`tools.exec.safeBinTrustedDirs` 或每个代理的 `agents.list[].tools.exec.safeBinTrustedDirs`)。
- `safeBinProfiles` 来自配置 (`tools.exec.safeBinProfiles` 或每个代理的 `agents.list[].tools.exec.safeBinProfiles`)。每个代理的配置文件键会覆盖全局键。
- 允许列表条目位于主机本地的 `~/.openclaw/exec-approvals.json` 下的 `agents.<id>.allowlist` (或通过控制 UI / `openclaw approvals allowlist ...`)。
- 当解释器/运行时二进制文件出现在 `safeBins` 中但没有明确的配置文件时，`openclaw security audit` 会发出 `tools.exec.safe_bins_interpreter_unprofiled` 警告。
- `openclaw doctor --fix` 可以将缺失的自定义 `safeBinProfiles.<bin>` 条目搭建为 `{}`（随后进行审查和收紧）。解释器/运行时二进制文件不会自动搭建。

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

如果您明确选择将 `jq` 加入 `safeBins`，OpenClaw 仍会在安全二进制模式下拒绝 `env` 内置命令，因此 `jq -n env` 无法在没有明确的允许列表路径
或批准提示的情况下转储主机进程环境。

## 控制 UI 编辑

使用 **控制 UI → 节点 → Exec 批准** 卡来编辑默认值、每个代理的覆盖和允许列表。选择一个范围（默认值或代理），调整策略，
添加/删除允许列表模式，然后点击 **保存**。UI 会显示每个模式的 **上次使用** 元数据，
以便您保持列表整洁。

目标选择器选择 **Gateway(网关)**（本地批准）或 **节点**。节点
必须通告 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。
如果节点尚未通告 exec 批准，请直接编辑其本地
`~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持 Gateway(网关) 或节点编辑（请参阅 [Approvals CLI](/en/cli/approvals)）。

## 批准流程

当需要提示时，Gateway(网关) 会向操作员客户端广播 `exec.approval.requested`。
控制 UI 和 macOS 应用通过 `exec.approval.resolve` 解析它，然后 Gateway(网关) 将
已批准的请求转发到节点主机。

对于 `host=node`，批准请求包含一个规范的 `systemRunPlan` 有效载荷。Gateway(网关) 使用
该计划作为转发已批准 `system.run`
请求时的权威命令/cwd/会话上下文。

这对于异步批准延迟很重要：

- 节点 exec 路径会提前准备一个规范计划
- 批准记录会存储该计划及其绑定元数据
- 一旦获得批准，最终转发的 `system.run` 调用将重用存储的计划，
  而不是信任稍后的调用方编辑
- 如果调用者在创建审批请求后更改了 `command`、`rawCommand`、`cwd`、`agentId` 或
  `sessionKey`，网关将因审批不匹配而拒绝转发的运行

## 解释器/运行时命令

基于审批的解释器/运行时运行采用有意保守的策略：

- 精确的 argv/cwd/env 上下文始终是绑定的。
- 直接 Shell 脚本和直接运行时文件形式尽力绑定到一个具体的本地
  文件快照。
- 仍然解析为一个直接本地文件的常见包管理器包装器形式（例如
  `pnpm exec`、`pnpm node`、`npm exec`、`npx`）在绑定之前会被展开。
- 如果 OpenClaw 无法为解释器/运行时命令准确识别一个具体的本地文件
  （例如包脚本、eval 形式、特定于运行时的加载器链，或歧义的多文件
  形式），将拒绝基于审批的执行，而不是声称其不具备的语义覆盖范围。
- 对于这些工作流，首选沙箱隔离、单独的主机边界，或者操作员接受更广泛运行时语义的显式可信
  允许列表/完整工作流。

当需要审批时，exec 工具会立即返回一个审批 ID。使用该 ID 来
关联后续的系统事件（`Exec finished` / `Exec denied`）。如果在超时前
未收到决定，该请求将被视为审批超时，并作为拒绝原因呈现。

### 后续传送行为

在已批准的异步 exec 完成后，OpenClaw 会向同一个会话发送一个后续 `agent` 轮次。

- 如果存在有效的外部传送目标（可传送渠道加上目标 `to`），则后续传送使用该渠道。
- 在没有外部目标的仅网络聊天或内部会话流程中，后续传送仅限于会话（`deliver: false`）。
- 如果调用者在没有可解析外部渠道的情况下显式请求严格的外部传送，则请求将失败并返回 `INVALID_REQUEST`。
- 如果启用了 `bestEffortDeliver` 且无法解析外部渠道，传递将降级为仅限会话，而不是失败。

确认对话框包括：

- 命令 + 参数
- cwd
- 代理 ID
- 解析的可执行文件路径
- 主机 + 策略元数据

操作：

- **允许一次** → 立即运行
- **始终允许** → 添加到允许列表 + 运行
- **拒绝** → 阻止

## 将审批转发到聊天渠道

您可以将执行审批提示转发到任何聊天渠道（包括插件渠道）并使用 `/approve` 批准它们。这使用正常的出站传递管道。

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

`/approve` 命令处理执行审批和插件审批。如果 ID 与待处理的执行审批不匹配，它会自动检查插件审批。

### 插件审批转发

插件审批转发使用与执行审批相同的传递管道，但在 `approvals.plugin` 下有自己的独立配置。启用或禁用一个不会影响另一个。

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

支持共享交互式回复的渠道会为执行审批和插件审批呈现相同的审批按钮。没有共享交互式 UI 的渠道将回退到纯文本并附带 `/approve`
说明。

### 任何渠道上的同聊天审批

当执行或插件审批请求源自可传递的聊天界面时，默认情况下现在可以通过 `/approve` 在同一聊天中进行审批。这适用于 Slack、Matrix 和
Microsoft Teams 等渠道，以及现有的 Web UI 和终端 UI 流程。

此共享文本命令路径使用该对话的正常渠道身份验证模型。如果源聊天已经可以发送命令和接收回复，审批请求不再需要单独的原生传递适配器来保持待处理状态。

Discord 和 Telegram 也支持同聊 `/approve`，但这些渠道仍然使用其解析出的审批人列表进行授权，即使在禁用原生审批交付时也是如此。

对于直接调用 Gateway(网关) 的 Telegram 和其他原生审批客户端，此回退机制有针对性地限定为“未找到审批”的失败情况。真正的 exec 审批拒绝/错误不会作为插件审批静默重试。

### 原生审批交付

某些渠道也可以充当原生审批客户端。原生客户端在共享的同聊 `/approve` 流程之上，增加了审批人私信、原始聊天的分发以及特定于渠道的交互式审批 UX。

当提供原生审批卡片/按钮时，该原生 UI 是面向代理的主要路径。除非工具结果指出聊天审批不可用或手动审批是唯一剩余的路径，否则代理不应回显重复的纯聊天 `/approve` 命令。

通用模型：

- 主机 exec 策略仍然决定是否需要 exec 审批
- `approvals.exec` 控制将审批提示转发到其他聊天目的地
- `channels.<channel>.execApprovals` 控制该渠道是否充当原生审批客户端

当满足以下所有条件时，原生审批客户端会自动启用私信优先交付：

- 该渠道支持原生审批交付
- 可以从显式的 `execApprovals.approvers` 或该渠道记录的回退源中解析审批人
- `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"`

设置 `enabled: false` 以明确禁用原生审批客户端。设置 `enabled: true` 以在解析出审批人时强制启用它。公共原始聊天交付通过 `channels.<channel>.execApprovals.target` 保持显式状态。

常见问题：[为什么聊天审批会有两个 exec 审批配置？](/en/help/faq#why-are-there-two-exec-approval-configs-for-chat-approvals)

- Discord：`channels.discord.execApprovals.*`
- Slack：`channels.slack.execApprovals.*`
- Telegram：`channels.telegram.execApprovals.*`

这些原生审批客户端在共享的同聊 `/approve` 流程和共享审批按钮之上，增加了私信路由和可选的渠道分发功能。

共享行为：

- Slack、Matrix、Microsoft Teams 和类似的可交付聊天使用正常的渠道身份验证模型
  用于同聊天 `/approve`
- 当原生批准客户端自动启用时，默认的原生交付目标是审批人的私信
- 对于 Discord 和 Telegram，只有已解析的审批人才能批准或拒绝
- Discord 审批人可以是显式的 (`execApprovals.approvers`) 或从 `commands.ownerAllowFrom` 推断
- Telegram 审批人可以是显式的 (`execApprovals.approvers`) 或从现有的所有者配置推断 (`allowFrom`，加上受支持时的直接消息 `defaultTo`)
- Slack 审批人可以是显式的 (`execApprovals.approvers`) 或从 `commands.ownerAllowFrom` 推断
- Slack 原生按钮保留批准 id 类型，因此 `plugin:` id 可以解析插件批准
  而不需要第二层 Slack 本地回退层
- Matrix 原生私信/渠道路由和反应快捷方式处理 exec 和插件审批；插件授权仍来自 `channels.matrix.dm.allowFrom`
- 请求者不需要是审批人
- 当发起聊天已支持命令和回复时，该聊天可以直接使用 `/approve` 进行批准
- 原生 Discord 批准按钮按审批 ID 类型路由：`plugin:` ID 直接进入插件审批，其他所有内容进入 exec 审批
- 原生 Telegram 批准按钮遵循与 `/approve` 相同的有界 exec 到插件回退机制
- 当原生 `target` 启用发起聊天的传递时，审批提示包含命令文本
- 待处理的 exec 批准默认在 30 分钟后过期
- 如果没有操作员 UI 或配置的审批客户端可以接受请求，提示将回退到 `askFallback`

Telegram 默认为审批者私信 (`target: "dm"`)。当您希望审批提示也出现在发起的 Telegram 聊天/主题中时，您可以切换到 `channel` 或 `both`。对于 Telegram 论坛主题，OpenClaw 会保留审批提示和批准后后续跟进的主题。

请参阅：

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

- Unix 套接字模式 `0600`，令牌存储在 `exec-approvals.json` 中。
- Same-UID 对端检查。
- 挑战/响应（nonce + HMAC 令牌 + 请求哈希）+ 短 TTL。

## 系统事件

Exec 生命周期作为系统消息呈现：

- `Exec running`（仅当命令超过运行通知阈值时）
- `Exec finished`
- `Exec denied`

这些在节点报告事件后发布到代理的会话。Gateway(网关) 托管的 exec 审批在命令完成时（以及可选地在运行时间超过阈值时）发出相同的生命周期事件。有审批门控的 exec 在这些消息中重用审批 ID 作为 `runId`，以便于关联。

## 拒绝批准的行为

当异步 exec 批准被拒绝时，OpenClaw 会阻止代理重用
会话中同一命令早期运行的任何输出。拒绝原因
会附带明确的指导，即没有可用的命令输出，这会阻止
代理声称有新输出，或使用先前成功运行中的
陈旧结果重复被拒绝的命令。

## 影响

- **full** 功能强大；请尽可能优先使用允许列表。
- **ask** 让您随时了解情况，同时仍允许快速批准。
- 每个代理的允许列表可防止一个代理的批准泄漏到其他代理。
- 审批仅适用于来自**授权发送者**的主机 exec 请求。未经授权的发送者无法发出 `/exec`。
- `/exec security=full` 是为授权操作员提供的会话级便利功能，设计上会跳过批准。
  若要彻底阻止主机执行，请将批准安全性设置为 `deny` 或通过工具策略拒绝 `exec` 工具。

相关：

- [Exec 工具](/en/tools/exec)
- [提升模式](/en/tools/elevated)
- [Skills](/en/tools/skills)

## 相关

- [Exec](/en/tools/exec) — Shell 命令执行工具
- [沙箱隔离](/en/gateway/sandboxing) — 沙箱模式和工作区访问
- [安全](/en/gateway/security) — 安全模型和加固
- [沙箱 vs 工具策略 vs 提升模式](/en/gateway/sandbox-vs-tool-policy-vs-elevated) — 何时使用每种方式
