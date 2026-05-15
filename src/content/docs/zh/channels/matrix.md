---
summary: "MatrixMatrix 支持状态、设置和配置示例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "MatrixMatrix"
---

Matrix 是一个适用于 OpenClaw 的可下载渠道插件。
它使用官方 MatrixOpenClaw`matrix-js-sdk` 并支持私信、房间、线程、媒体、表情回应、投票、位置和端到端加密 (E2EE)。

## 安装

在配置渠道之前，请从 ClawHub 安装 Matrix：

```bash
openclaw plugins install @openclaw/matrix
```

裸插件规范会先尝试 ClawHub，然后回退到 npm。要强制注册表源，请使用 ClawHubnpm`openclaw plugins install clawhub:@openclaw/matrix` 或 `openclaw plugins install npm:@openclaw/matrix`。

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

`plugins install` 会注册并启用该插件，因此不需要单独的 `openclaw plugins enable matrix` 步骤。在您配置下方的渠道之前，该插件仍然不执行任何操作。有关一般插件行为和安装规则，请参阅 [Plugins](/zh/tools/plugin)。

## 设置

1. 在您的家庭服务器上创建一个 Matrix 账户。
2. 使用 `homeserver` + `accessToken`，或者 `homeserver` + `userId` + `password` 配置 `channels.matrix`。
3. 重启网关。
4. 与机器人开始私信，或将其邀请到房间（请参阅 [自动加入](#auto-join) - 只有当 `autoJoin` 允许时，新的邀请才会生效）。

### 交互式设置

```bash
openclaw channels add
openclaw configure --section channels
```

向导会询问：家庭服务器 URL、身份验证方法（访问令牌或密码）、用户 ID（仅限密码验证）、可选设备名称、是否启用 E2EE，以及是否配置房间访问和自动加入。

如果匹配的 `MATRIX_*` 环境变量已经存在，并且所选帐户没有保存的身份验证信息，向导将提供环境变量快捷方式。要在保存允许列表之前解析房间名称，请运行 `openclaw channels resolve --channel matrix "Project Room"`。当启用 E2EE 时，向导会写入配置并运行与 [`openclaw matrix encryption setup`](#encryption-and-verification) 相同的引导程序。

### 最小配置

基于令牌：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      dm: { policy: "pairing" },
    },
  },
}
```

基于密码（首次登录后令牌会被缓存）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      userId: "@bot:example.org",
      password: "replace-me", // pragma: allowlist secret
      deviceName: "OpenClaw Gateway",
    },
  },
}
```

### 自动加入

`channels.matrix.autoJoin` 默认为 `off`。使用默认值时，在您手动加入之前，机器人不会出现在来自新邀请的新房间或私信中。

OpenClaw 无法在邀请时判断被邀请的房间是私信还是群组，因此所有邀请（包括私信样式的邀请）都会先经过 `autoJoin`。`dm.policy` 仅在稍后机器人加入且房间被分类后应用。

<Warning>
设置 `autoJoin: "allowlist"` 和 `autoJoinAllowlist` 以限制机器人接受的邀请，或者设置 `autoJoin: "always"` 以接受每个邀请。

`autoJoinAllowlist` 仅接受稳定目标：`!roomId:server`、`#alias:server` 或 `*`。纯房间名会被拒绝；别名条目是针对主服务器解析的，而不是针对被邀请房间声明状态解析的。

</Warning>

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": { requireMention: true },
      },
    },
  },
}
```

要接受每个邀请，请使用 `autoJoin: "always"`。

### 允许列表目标格式

私信和房间允许列表最好使用稳定 ID 填充：

- 私信（`dm.allowFrom`、`groupAllowFrom`、`groups.<room>.users`）：使用 `@user:server`。仅当主服务器目录返回完全匹配项时，显示名称才能解析。
- 房间（`groups`、`autoJoinAllowlist`）：使用 `!room:server` 或 `#alias:server`。名称会根据已加入的房间进行尽力解析；未解析的条目在运行时会被忽略。

### 账号 ID 标准化

向导会将友好名称转换为标准化的账号 ID。例如，`Ops Bot` 会变成 `ops-bot`。在作用域环境变量名称中，标点符号会被转义，以防止两个账号发生冲突：`-` → `_X2D_`，因此 `ops-prod` 映射到 `MATRIX_OPS_X2D_PROD_*`。

### 缓存的凭据

Matrix 将缓存的凭据存储在 `~/.openclaw/credentials/matrix/` 下：

- 默认账号：`credentials.json`
- 命名账户：`credentials-<account>.json`

当该处存在缓存的凭据时，即使访问令牌不在配置文件中，OpenClaw 也会将 Matrix 视为已配置——这涵盖了设置、OpenClawMatrix`openclaw doctor` 和渠道状态探测。

### 环境变量

当未设置相应的配置键时使用。默认账户使用无前缀的名称；命名账户使用插入到后缀之前的账户 ID。

| 默认账户              | 命名账户（`<ID>` 是标准化的账户 ID） |
| --------------------- | ------------------------------------ |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`             |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`           |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`               |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`              |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`            |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`           |

对于账户 `ops`，名称将变为 `MATRIX_OPS_HOMESERVER`、`MATRIX_OPS_ACCESS_TOKEN`CLI 等。恢复密钥环境变量由支持恢复的 CLI 流程（`verify backup restore`、`verify device`、`verify bootstrap`）在您通过 `--recovery-key-stdin` 传输密钥时读取。

`MATRIX_HOMESERVER` 无法从工作区 `.env` 设置；请参阅 [工作区 `.env` 文件](/zh/gateway/security)。

## 配置示例

包含私信配对、房间允许列表和 E2EE 的实用基线配置：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,

      dm: {
        policy: "pairing",
        sessionScope: "per-room",
        threadReplies: "off",
      },

      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": { requireMention: true },
      },

      autoJoin: "allowlist",
      autoJoinAllowlist: ["!roomid:example.org"],
      threadReplies: "inbound",
      replyToMode: "off",
      streaming: "partial",
    },
  },
}
```

## 流式预览

Matrix 回复流式传输是可选启用的。Matrix`streaming`OpenClaw 控制 OpenClaw 如何传递进行中的助手回复；`blockStreaming`Matrix 控制是否将每个完成的块保留为单独的 Matrix 消息。

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

要保留实时答案预览但隐藏临时的工具/进度行，请使用对象
形式：

```json5
{
  channels: {
    matrix: {
      streaming: {
        mode: "partial",
        preview: {
          toolProgress: false,
        },
      },
    },
  },
}
```

| `streaming`     | 行为                                                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `"off"`（默认） | 等待完整回复，发送一次。`true` ↔ `"partial"`，`false` ↔ `"off"`。                                                     |
| `"partial"`     | 当模型编写当前块时，就地编辑一条普通文本消息。原版 Matrix 客户端可能会在第一次预览时通知，而不是在最终编辑时。        |
| `"quiet"`       | 与 `"partial"` 相同，但该消息为非通知提示。仅当针对用户的推送规则匹配到最终编辑时，收件人才会收到一次通知（见下文）。 |

`blockStreaming` 独立于 `streaming`：

| `streaming`             | `blockStreaming: true`                 | `blockStreaming: false`（默认）        |
| ----------------------- | -------------------------------------- | -------------------------------------- |
| `"partial"` / `"quiet"` | 当前块的实时草稿，已完成的块保留为消息 | 当前块的实时草稿，就地完成             |
| `"off"`                 | 每个完成的块发送一条通知类 Matrix 消息 | 针对完整回复发送一条通知类 Matrix 消息 |

注意：

- 如果预览增长超过 Matrix 的每事件大小限制，OpenClaw 将停止预览流式传输并回退到仅最终发送。
- 媒体回复始终正常发送附件。如果过时的预览不再能安全地重用，OpenClaw 会在发送最终媒体回复之前将其删除。
- 当 Matrix 预览流式传输处于活动状态时，默认启用工具进度预览更新。设置 Matrix`streaming.preview.toolProgress: false` 以保留答案文本的预览编辑，但将工具进度保留在正常发送路径上。
- 预览编辑需要额外的 Matrix API 调用。如果您想要最保守的速率限制配置，请保留 MatrixAPI`streaming: "off"`。

## 批准元数据

Matrix 原生批准提示是正常的 Matrix`m.room.message`OpenClaw 事件，其中包含 OpenClaw 特定的自定义事件内容，位于 `com.openclaw.approval`MatrixOpenClaw 下。Matrix 允许自定义事件内容键，因此标准客户端仍会呈现文本正文，而支持 OpenClaw 的客户端则可以读取结构化的批准 ID、类型、状态、可用决策以及 exec/插件详细信息。

当批准提示对于单个 Matrix 事件来说太长时，OpenClaw 会对可见文本进行分块，并仅将 MatrixOpenClaw`com.openclaw.approval` 附加到第一个分块。允许/拒绝决策的反应绑定到第一个事件，因此长提示保持与单事件提示相同的批准目标。

### 用于静默已定稿预览的自托管推送规则

`streaming: "quiet"`Matrix 仅在区块或轮次定稿后通知接收者——每用户推送规则必须匹配已定稿预览标记。有关完整配方（接收者令牌、推送检查、规则安装、每主服务器说明），请参阅 [Matrix push rules for quiet previews](/zh/channels/matrix-push-rules)。

## Bot-to-bot 房间

默认情况下，来自其他已配置 OpenClaw Matrix 账户的 Matrix 消息将被忽略。

当您有意需要代理之间的 Matrix 流量时，请使用 `allowBots`Matrix：

```json5
{
  channels: {
    matrix: {
      allowBots: "mentions", // true | "mentions"
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

- `allowBots: true`Matrix 在允许的房间和私信中接受来自其他已配置 Matrix 机器人账户的消息。
- `allowBots: "mentions"` 仅当它们在房间中明显提及此机器人时才接受这些消息。私信仍然被允许。
- `groups.<room>.allowBots` 会覆盖单个房间的账户级设置。
- OpenClaw 仍然忽略来自同一 Matrix 用户 ID 的消息，以避免自回复循环。
- Matrix 在此处未公开原生机器人标志；OpenClaw 将“机器人撰写”视为“由此 OpenClaw 网关上的另一个已配置 Matrix 账户发送”。

在共享房间中启用机器人到机器人的流量时，请使用严格的房间白名单和提及要求。

## 加密与验证

在加密（E2EE）房间中，出站图像事件使用 `thumbnail_file`，以便图像预览与完整附件一起加密。未加密的房间仍使用普通的 `thumbnail_url`。无需配置——插件会自动检测 E2EE 状态。

所有 `openclaw matrix` 命令都接受 `--verbose`（完整诊断）、`--json`（机器可读输出）和 `--account <id>`（多账户设置）。默认情况下输出简明，内部 SDK 日志保持安静。以下示例显示了规范形式；请根据需要添加标志。

### 启用加密

```bash
openclaw matrix encryption setup
```

引导秘密存储和交叉签名，如果需要则创建房间密钥备份，然后打印状态和后续步骤。有用的标志：

- `--recovery-key <key>` 在引导之前应用恢复密钥（优先使用下文记录的 stdin 形式）
- `--force-reset-cross-signing` 丢弃当前的交叉签名身份并创建一个新的身份（请仅在有意为之时使用）

对于新账户，请在创建时启用 E2EE：

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` 是 `--enable-e2ee` 的别名。

等效的手动配置：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

### 状态与信任信号

```bash
openclaw matrix verify status
openclaw matrix verify status --include-recovery-key --json
```

`verify status` 报告三个独立的信任信号（`--verbose` 显示全部）：

- `Locally trusted`：仅受此客户端信任
- `Cross-signing verified`：SDK 报告通过交叉签名进行验证
- `Signed by owner`：由您自己的自签名密钥签名（仅限诊断）

仅当 `Cross-signing verified` 为 `yes` 时，`Verified by owner` 才会变为 `yes`。仅凭本地信任或所有者签名是不够的。

`--allow-degraded-local-state` 返回尽力而为的诊断信息，而无需事先准备 Matrix 账户；对于离线或部分配置的探测非常有用。

### 使用恢复密钥验证此设备

恢复密钥是敏感的 - 请通过 stdin 传递它，而不是在命令行上传递。设置 `MATRIX_RECOVERY_KEY`（对于命名账户则是 `MATRIX_<ID>_RECOVERY_KEY`）：

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

该命令报告三种状态：

- `Recovery key accepted`Matrix：Matrix 已接受该密钥用于秘密存储或设备信任。
- `Backup usable`：可以使用受信任的恢复材料加载房间密钥备份。
- `Device verified by owner`Matrix：此设备具有完整的 Matrix 交叉签名身份信任。

当完整的身份信任未完成时，即使恢复密钥已解锁备份材料，它也会以非零状态退出。在这种情况下，请从另一个 Matrix 客户端完成自我验证：

```bash
openclaw matrix verify self
```

`verify self` 在成功退出之前会等待 `Cross-signing verified: yes`。使用 `--timeout-ms <ms>` 来调整等待时间。

字面密钥形式 `openclaw matrix verify device "<recovery-key>"` 也是可以接受的，但密钥最终会出现在你的 shell 历史记录中。

### 引导或修复交叉签名

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` 是加密账户的修复和设置命令。按顺序，它：

- 引导秘密存储，尽可能重用现有的恢复密钥
- 引导交叉签名并上传缺失的公钥
- 标记并交叉签名当前设备
- 如果服务器端房间密钥备份不存在，则创建一个

如果主服务器需要 UIA 才能上传交叉签名密钥，OpenClaw 会先尝试 no-auth，然后是 OpenClaw`m.login.dummy`，最后是 `m.login.password`（需要 `channels.matrix.password`）。

有用的标志：

- `--recovery-key-stdin`（与 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …` 配对）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 以丢弃当前的交叉签名身份（仅限有意操作）

### 房间密钥备份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 显示是否存在服务器端备份以及此设备是否可以解密它。`backup restore` 将备份的房间密钥导入到本地加密存储中；如果恢复密钥已在磁盘上，则可以省略 `--recovery-key-stdin`。

要用新的基线替换损坏的备份（接受丢失无法恢复的旧历史记录；如果当前的备份密钥无法加载，也可以重新创建秘密存储）：

```bash
openclaw matrix verify backup reset --yes
```

仅当您有意让之前的恢复密钥不再解锁新的备份基线时，才添加 `--rotate-recovery-key`。

### 列出、请求和响应验证

```bash
openclaw matrix verify list
```

列出所选帐户的待处理验证请求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

从此 OpenClaw 帐户发送验证请求。`--own-user` 请求自验证（您在同一用户的另一个 Matrix 客户端中接受提示）；`--user-id`/`--device-id`/`--room-id` 针对其他人。`--own-user` 不能与其他定向标志结合使用。

对于更低级别的生命周期处理——通常是在从另一个客户端镜像传入请求时——这些命令作用于特定的请求 `<id>`（由 `verify list` 和 `verify request` 打印）：

| 命令                                       | 用途                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| `openclaw matrix verify accept <id>`       | 接受传入请求                                                 |
| `openclaw matrix verify start <id>`        | 启动 SAS 流程                                                |
| `openclaw matrix verify sas <id>`          | 打印 SAS 表情符号或十进制数字                                |
| `openclaw matrix verify confirm-sas <id>`  | 确认 SAS 与另一个客户端显示的匹配                            |
| `openclaw matrix verify mismatch-sas <id>` | 当表情符号或十进制数字不匹配时拒绝 SAS                       |
| `openclaw matrix verify cancel <id>`       | 取消；接受可选的 `--reason <text>` 和 `--code <matrix-code>` |

当验证锚定到特定的私信室时，`accept`、`start`、`sas`、`confirm-sas`、`mismatch-sas` 和 `cancel` 都接受 `--user-id` 和 `--room-id` 作为私信后续提示。

### 多帐户说明

如果没有 `--account <id>`MatrixCLI，Matrix CLI 命令将使用隐式的默认账户。如果您有多个命名账户且未设置 `channels.matrix.defaultAccount`，它们将拒绝猜测并要求您选择。当某个命名账户禁用或无法使用 E2EE 时，错误会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion title="Startup behavior">
    使用 `encryption: true` 时，`startupVerification` 默认为 `"if-unverified"`Matrix。启动时，未验证的设备会在另一个 Matrix 客户端中请求自我验证，跳过重复项并应用冷却时间（默认为 24 小时）。可以使用 `startupVerificationCooldownHours` 进行调整，或使用 `startupVerification: "off"`OpenClaw 禁用。

    启动过程还会运行保守的加密引导过程，该过程重用当前的密钥存储和跨签名身份。如果引导状态损坏，即使没有 `channels.matrix.password`Matrix，OpenClaw 也会尝试受保护的修复；如果主服务器需要密码 UIA，启动会记录警告并保持非致命。已由所有者签名的设备将被保留。

    有关完整的升级流程，请参阅 [Matrix migration](/zh/channels/matrix-migration)。

  </Accordion>

  <Accordion title="Verification notices"Matrix>
    Matrix 会将验证生命周期通知作为 `m.notice`MatrixOpenClawMatrix 消息发布到严格的私信验证房间中：请求、就绪（附带“通过表情符号验证”指南）、开始/完成，以及 SAS（表情符号/十进制）详细信息（如果有）。

    来自另一个 Matrix 客户端的传入请求会被跟踪并自动接受。对于自我验证，OpenClaw 会自动启动 SAS 流程，并在表情符号验证可用时确认其自身的一方——您仍然需要在 Matrix 客户端中比较并确认“它们匹配”。

    验证系统通知不会转发到代理聊天管道。

  </Accordion>

  <Accordion title="MatrixDeleted or invalid Matrix device">
    如果 `verify status`OpenClawMatrix 指出当前设备不再列在主服务器上，请新建一个 OpenClaw Matrix 设备。对于密码登录：

````bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```MatrixOpenClaw

    对于令牌认证，请在您的 Matrix 客户端或管理 UI 中创建一个新的访问令牌，然后更新 OpenClaw：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
````

    将 `assistant` 替换为失败命令中的账户 ID，或者省略 `--account` 以使用默认账户。

  </Accordion>

  <Accordion title="Device hygiene"OpenClaw>
    旧的 OpenClaw 管理的设备可能会不断累积。列出并清理它们：

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="Crypto store"Matrix>
    Matrix E2EE 使用官方的 `matrix-js-sdk` Rust 加密路径，并使用 `fake-indexeddb` 作为 IndexedDB 适配层。加密状态持久化存储到 `crypto-idb-snapshot.json`（受限的文件权限）。

    加密的运行时状态位于 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`OpenClaw 下，包括同步存储、加密存储、恢复密钥、IDB 快照、线程绑定和启动验证状态。当令牌更改但账户身份保持不变时，OpenClaw 会重用最佳现有根目录，以便先前的状态保持可见。

  </Accordion>
</AccordionGroup>

## 个人资料管理

更新所选账户的 Matrix 个人资料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

您可以在一次调用中传递这两个选项。Matrix 直接接受 Matrix`mxc://` 头像 URL；当您传递 `http://` 或 `https://`OpenClaw 时，OpenClaw 会先上传文件，然后将解析后的 `mxc://` URL 存储到 `channels.matrix.avatarUrl`（或每个账户的覆盖设置）中。

## 线程

Matrix 支持原生 Matrix 线程，用于自动回复和消息工具发送。两个独立的开关控制行为：

### 会话路由 (`sessionScope`)

`dm.sessionScope`MatrixOpenClaw 决定了 Matrix 私信房间如何映射到 OpenClaw 会话：

- `"per-user"` （默认）：与同一路由对等端的所有私信房间共享一个会话。
- `"per-room"`Matrix：每个 Matrix 私信房间都有自己的会话密钥，即使对等端相同也是如此。

显式对话绑定始终优先于 `sessionScope`，因此绑定的房间和线程保留其选定的目标会话。

### 回复线程 (`threadReplies`)

`threadReplies` 决定了机器人发布回复的位置：

- `"off"`：回复是顶层的。传入的线程消息保留在父会话上。
- `"inbound"`：仅当传入消息已在该线程中时，才在线程内回复。
- `"always"`：在以触发消息为根的线程内回复；该对话从第一次触发开始通过匹配的线程作用域会话进行路由。

`dm.threadReplies` 仅针对私信覆盖此项 - 例如，保持房间线程隔离，同时保持私信扁平化。

### 线程继承和斜杠命令

- 传入的线程消息将线程根消息作为额外的代理上下文包括在内。
- 当针对同一房间（或同一私信用户目标）时，消息工具发送会自动继承当前的 Matrix 线程，除非提供了显式的 Matrix`threadId`。
- 仅当当前会话元数据证明同一 Matrix 账户上的私信对等端相同时，私信用户目标重用才会生效；否则 OpenClaw 会回退到正常的用户作用域路由。
- `/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和线程绑定的 `/acp spawn`Matrix 均适用于 Matrix 房间和私信。
- 当启用 `threadBindings.spawnSessions` 时，顶层的 `/focus`Matrix 会创建一个新的 Matrix 线程并将其绑定到目标会话。
- 在现有的 Matrix 线程中运行 `/focus` 或 `/acp spawn --thread here`Matrix 会将该线程就地绑定。

当 OpenClaw 检测到 Matrix 私信房间与同一共享会话上的另一个私信房间发生冲突时，它会在该房间中发布一次性 OpenClawMatrix`m.notice`，指向 `/focus` 逃生舱，并建议进行 `dm.sessionScope` 更改。该通知仅在启用线程绑定时出现。

## ACP 会话绑定

Matrix 房间、私信和现有的 Matrix 线程可以转换为持久的 ACP 工作区，而无需更改聊天界面。

快速操作流程：

- 在您想要继续使用的 Matrix 私信、房间或现有线程中运行 `/acp spawn codex --bind here`Matrix。
- 在顶层的 Matrix 私信或房间中，当前的私信/房间保持为聊天界面，未来的消息将路由到生成的 ACP 会话。
- 在现有的 Matrix 线程内部，Matrix`--bind here` 会将该当前线程就地绑定。
- `/new` 和 `/reset` 会就地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

注意：

- `--bind here`Matrix 不会创建子 Matrix 线程。
- `threadBindings.spawnSessions` 控制 `/acp spawn --thread auto|here`OpenClawMatrix，其中 OpenClaw 需要创建或绑定子 Matrix 线程。

### 线程绑定配置

Matrix 继承 Matrix`session.threadBindings` 的全局默认值，并且也支持按渠道覆盖：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`
- `threadBindings.defaultSpawnContext`

Matrix 线程绑定会话默认在以下情况生成：

- 设置 `threadBindings.spawnSessions: false` 以阻止顶级 `/focus` 和 `/acp spawn --thread auto|here`Matrix 创建/绑定 Matrix 线程。
- 当原生子代理线程生成不应分叉父记录时，设置 `threadBindings.defaultSpawnContext: "isolated"`。

## 表情回应

Matrix 支持出站表情回应、入站表情回应通知以及确认（ack）表情回应。

出站表情回应工具由 `channels.matrix.actions.reactions` 控制：

- `react`Matrix 向 Matrix 事件添加表情回应。
- `reactions`Matrix 列出 Matrix 事件的当前表情回应摘要。
- `emoji=""` 移除机器人在该事件上的表情回应。
- `remove: true` 仅移除机器人指定的 emoji 表情回应。

**解析顺序**（最先定义的值优先）：

| 设置                    | 顺序                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| `ackReaction`           | per-account → 渠道 → `messages.ackReaction` → 代理身份 emoji 回退          |
| `ackReactionScope`      | per-account → 渠道 → `messages.ackReactionScope` → 默认 `"group-mentions"` |
| `reactionNotifications` | per-account → 渠道 → 默认 `"own"`                                          |

`reactionNotifications: "own"` 在新增的 `m.reaction`Matrix 事件针对机器人编写的 Matrix 消息时进行转发；`"off"`Matrix 禁用表情回应系统事件。表情回应移除不会被合成为系统事件，因为 Matrix 将其显示为编辑，而不是独立的 `m.reaction` 移除。

## 历史记录上下文

- `channels.matrix.historyLimit` 控制当 Matrix 房间消息触发代理时，将多少条最近的房间消息作为 `InboundHistory`Matrix 包含在内。回退到 `messages.groupChat.historyLimit`；如果两者均未设置，有效默认值为 `0`。设置 `0` 以禁用。
- Matrix 房间历史记录仅限于房间内。私信继续使用正常的会话历史记录。
- Matrix 房间历史记录仅限待处理：OpenClaw 会缓冲尚未触发回复的房间消息，然后在提及或其他触发器到达时对该窗口进行快照。
- 当前的触发消息不包含在 `InboundHistory` 中；它保留在该回合的主要入站正文中。
- 对同一 Matrix 事件的重试会重用原始的历史快照，而不是向前漂移到较新的房间消息。

## 上下文可见性

Matrix 支持共享的 Matrix`contextVisibility` 控制，用于获取的回复文本、线程根和待处理历史记录等补充房间上下文。

- `contextVisibility: "all"` 是默认设置。补充上下文将按接收原样保留。
- `contextVisibility: "allowlist"` 会根据当前房间/用户允许列表检查所允许的发件人，过滤补充上下文。
- `contextVisibility: "allowlist_quote"` 的行为类似于 `allowlist`，但仍保留一条显式的引用回复。

此设置影响补充上下文的可见性，而不影响入站消息本身是否可以触发回复。
触发授权仍来自 `groupPolicy`、`groups`、`groupAllowFrom` 和私信策略设置。

## 私信和房间策略

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
        threadReplies: "off",
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": { requireMention: true },
      },
    },
  },
}
```

要在保持房间正常工作的同时完全静音私信，请设置 `dm.enabled: false`：

```json5
{
  channels: {
    matrix: {
      dm: { enabled: false },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
    },
  },
}
```

有关提及控制和允许列表行为，请参阅[组](/zh/channels/groups)。

Matrix 私信的配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 用户在批准前继续向您发送消息，OpenClaw 将重用同一个待处理的配对代码，并可能在短暂的冷却后发送提醒回复，而不是生成新代码。

有关共享的私信配对流程和存储布局，请参阅[配对](/zh/channels/pairing)。

## 直接房间修复

如果直接消息状态漂移不同步，OpenClaw 可能最终会得到过时的 OpenClaw`m.direct` 映射，这些映射指向旧的独立房间而不是实时私信。检查对等方的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

修复它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

这两个命令都接受 `--account <id>` 用于多账户设置。修复流程：

- 优先使用已在 `m.direct` 中映射的严格 1:1 私信
- 回退到当前已加入的与该用户的任何严格 1:1 私信
- 如果不存在健康的私信，则创建一个新的直接聊天室并重写 `m.direct`

它不会自动删除旧聊天室。它会选择健康的私信并更新映射，以便未来的 Matrix 发送、验证通知和其他私信流程都指向正确的聊天室。

## 执行审批

Matrix 可以作为原生审批客户端。在 `channels.matrix.execApprovals` 下进行配置（或者使用 `channels.matrix.accounts.<account>.execApprovals` 进行每个账户的覆盖）：

- `enabled`：通过 Matrix 原生提示传递审批。当未设置或为 `"auto"` 时，一旦能够解析出至少一个审批者，Matrix 将自动启用。设置 `false` 可显式禁用。
- `approvers`：被授权批准执行请求的 Matrix 用户 ID (`@owner:example.org`)。可选 - 回退到 `channels.matrix.dm.allowFrom`。
- `target`：提示发送的位置。`"dm"`（默认）发送给审批者的私信；`"channel"` 发送到发起的 Matrix 聊天室或私信；`"both"` 发送到两者。
- `agentFilter` / `sessionFilter`：可选的允许列表，用于指定哪些代理/会话触发 Matrix 投递。

授权在不同审批类型之间略有不同：

- **执行审批** 使用 `execApprovals.approvers`，回退到 `dm.allowFrom`。
- **插件审批** 仅通过 `dm.allowFrom` 进行授权。

这两种类型共享 Matrix 反应快捷方式和消息更新。审批者会在主审批消息上看到反应快捷方式：

- `✅` 允许一次
- `❌` 拒绝
- `♾️` 始终允许（当有效的执行策略允许时）

后备斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always`、`/approve <id> deny`。

只有已解析的批准者才能批准或拒绝。执行批准的频道投递包含命令文本 - 仅在受信任的房间中启用 `channel` 或 `both`。

相关内容：[Exec approvals](/zh/tools/exec-approvals)。

## 斜杠命令

斜杠命令（`/new`、`/reset`、`/model`、`/focus`、`/unfocus`、`/agents`、`/session`、`/acp`、`/approve` 等）直接在私信中工作。在房间中，OpenClaw 也能识别以机器人自己的 Matrix 提及为前缀的命令，因此 `@bot:server /new` 无需自定义提及正则即可触发命令路径。这使机器人能够对 Element 及类似客户端在用户键入命令前通过 Tab 补全机器人时发出的房间风格 `@mention /command` 帖子做出响应。

授权规则仍然适用：命令发送者必须满足与普通消息相同的私信或房间允许列表/所有者策略。

## 多账户

```json5
{
  channels: {
    matrix: {
      enabled: true,
      defaultAccount: "assistant",
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_xxx",
          encryption: true,
        },
        alerts: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_xxx",
          dm: {
            policy: "allowlist",
            allowFrom: ["@ops:example.org"],
            threadReplies: "off",
          },
        },
      },
    },
  },
}
```

**继承：**

- 顶层 `channels.matrix` 值充当命名账户的默认值，除非账户覆盖了它们。
- 使用 `groups.<room>.account` 将继承的房间条目范围限定为特定账户。没有 `account` 的条目在账户之间共享；当在顶层配置默认账户时，`account: "default"` 仍然有效。

**默认账户选择：**

- 设置 `defaultAccount` 以选择隐式路由、探测和 CLI 命令首选的命名账户。
- 如果您有多个账户且其中一个字面名称为 `default`，即使未设置 `defaultAccount`，OpenClaw 也会隐式使用它。
- 如果您有多个命名帐户且未选择默认帐户，CLI 命令将拒绝猜测 - 请设置 CLI`defaultAccount` 或传递 `--account <id>`。
- 仅当顶级 `channels.matrix.*` 块的身份验证完成（`homeserver` + `accessToken`，或 `homeserver` + `userId` + `password`）时，该块才会被视为隐式 `default` 帐户。一旦缓存的凭据覆盖身份验证，命名帐户仍可从 `homeserver` + `userId` 发现。

**提升：**

- 当 OpenClaw 在修复或设置期间将单帐户配置提升为多帐户配置时，如果存在现有的命名帐户或 OpenClaw`defaultAccount`Matrix 已指向某个帐户，它将保留该命名帐户。只有 Matrix 身份验证/引导密钥会移动到提升后的帐户中；共享的传递策略密钥保留在顶层。

有关共享的多帐户模式，请参阅 [配置参考](/zh/gateway/config-channels#multi-account-all-channels)。

## 私有/LAN 家庭服务器

默认情况下，为了防止 SSRF，OpenClaw 会阻止私有/内部 Matrix 家庭服务器，除非您针对每个帐户明确选择加入。

如果您的家庭服务器运行在 localhost、LAN/Tailscale IP 或内部主机名上，请为该 Matrix 帐户启用 Tailscale`network.dangerouslyAllowPrivateNetwork`Matrix：

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      network: {
        dangerouslyAllowPrivateNetwork: true,
      },
      accessToken: "syt_internal_xxx",
    },
  },
}
```

CLI 设置示例：

```bash
openclaw matrix account add \
  --account ops \
  --homeserver http://matrix-synapse:8008 \
  --allow-private-network \
  --access-token syt_ops_xxx
```

此选择加入仅允许受信任的私有/内部目标。诸如 `http://matrix.example.org:8008` 之类的公共明文家庭服务器仍然被阻止。请尽可能优先使用 `https://`。

## 代理 Matrix 流量

如果您的 Matrix 部署需要显式的出站 HTTP(S) 代理，请设置 Matrix`channels.matrix.proxy`：

```json5
{
  channels: {
    matrix: {
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
    },
  },
}
```

命名帐户可以使用 `channels.matrix.accounts.<id>.proxy`OpenClawMatrix 覆盖顶层默认值。
OpenClaw 对运行时 Matrix 流量和帐户状态探测使用相同的代理设置。

## 目标解析

在 OpenClaw 要求您提供房间或用户目标的任何位置，Matrix 接受以下目标格式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

Matrix 房间 ID 区分大小写。在配置显式传递目标、定时任务、绑定或允许列表时，请使用来自 Matrix 的确切房间 ID 大小写。
OpenClaw 将内部会话密钥规范化存储，因此这些小写密钥不是 Matrix 传递 ID 的可靠来源。

实时目录查询使用已登录的 Matrix 账户：

- 用户查询会查询该主服务器上的 Matrix 用户目录。
- 房间查询直接接受显式房间 ID 和别名，然后回退到搜索该账户已加入的房间名称。
- 已加入房间名称查询是尽力而为的。如果房间名称无法解析为 ID 或别名，它将在运行时允许列表解析中被忽略。

## 配置参考

Allowlist 风格的字段（`groupAllowFrom`、`dm.allowFrom`、`groups.<room>.users`Matrix）接受完整的 Matrix 用户 ID（最安全）。确切的目录匹配项将在启动时以及监视器运行期间允许列表发生更改时进行解析；无法解析的条目将在运行时被忽略。出于同样的原因，房间允许列表优先使用房间 ID 或别名。

### 账户和连接

- `enabled`：启用或禁用该渠道。
- `name`：账户的可选显示标签。
- `defaultAccount`Matrix：当配置了多个 Matrix 账户时，首选的账户 ID。
- `accounts`：命名的按账户覆盖。顶级 `channels.matrix` 值将作为默认值继承。
- `homeserver`：主服务器 URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允许此帐户连接到 `localhost`、LAN/Tailscale IP 或内部主机名。
- `proxy`：用于 Matrix 流量的可选 HTTP(S) 代理 URL。支持每个帐户覆盖。
- `userId`：完整的 Matrix 用户 ID (`@bot:example.org`)。
- `accessToken`：用于基于令牌的身份验证的访问令牌。支持跨 env/file/exec 提供程序使用明文和 SecretRef 值（[机密管理](/zh/gateway/secrets)）。
- `password`：用于基于密码登录的密码。支持明文和 SecretRef 值。
- `deviceId`：显式的 Matrix 设备 ID。
- `deviceName`：在密码登录时使用的设备显示名称。
- `avatarUrl`：存储的用于个人资料同步和 `profile set` 更新的自身头像 URL。
- `initialSyncLimit`：在启动同步期间获取的事件的最大数量。

### 加密

- `encryption`：启用 E2EE。默认值：`false`。
- `startupVerification`：`"if-unverified"`（开启 E2EE 时的默认值）或 `"off"`。当此设备未验证时，在启动时自动请求自我验证。
- `startupVerificationCooldownHours`：下一次自动启动请求之前的冷却时间。默认值：`24`。

### 访问和策略

- `groupPolicy`：`"open"`、`"allowlist"` 或 `"disabled"`。默认值：`"allowlist"`。
- `groupAllowFrom`：用于房间流量的用户 ID 白名单。
- `dm.enabled`：当 `false` 时，忽略所有私信。默认值：`true`。
- `dm.policy`：`"pairing"`（默认）、`"allowlist"`、`"open"` 或 `"disabled"`。在机器人加入并将房间归类为私信后应用；它不影响邀请处理。
- `dm.allowFrom`：用于私信流量的用户 ID 白名单。
- `dm.sessionScope`：`"per-user"`（默认）或 `"per-room"`。
- `dm.threadReplies`：仅针对私信的回复线程覆盖设置（`"off"`、`"inbound"`、`"always"`）。
- `allowBots`：接受来自其他已配置 Matrix 机器人帐户的消息（`true` 或 `"mentions"`）。
- `allowlistOnly`：当为 `true` 时，强制所有活动的私信策略（`"disabled"` 除外）和 `"open"` 组策略为 `"allowlist"`。不更改 `"disabled"` 策略。
- `autoJoin`：`"always"`、`"allowlist"` 或 `"off"`。默认值：`"off"`。适用于每个 Matrix 邀请，包括私信样式的邀请。
- `autoJoinAllowlist`：当 `autoJoin` 为 `"allowlist"` 时允许的房间/别名。别名条目是针对主服务器解析的，而不是针对被邀请房间声明的状态。
- `contextVisibility`：补充上下文可见性（`"all"` 默认，`"allowlist"`，`"allowlist_quote"`）。

### 回复行为

- `replyToMode`：`"off"`、`"first"`、`"all"` 或 `"batched"`。
- `threadReplies`：`"off"`、`"inbound"` 或 `"always"`。
- `threadBindings`: 针对绑定线程会话路由和生命周期的每个渠道覆盖设置。
- `streaming`: `"off"`（默认）、`"partial"`、`"quiet"` 或对象形式 `{ mode, preview: { toolProgress } }`。`true` ↔ `"partial"`，`false` ↔ `"off"`。
- `blockStreaming`: 当 `true` 时，已完成的助手块将保留为单独的进度消息。
- `markdown`: 用于出站文本的可选 Markdown 渲染配置。
- `responsePrefix`: 附加到出站回复的可选字符串。
- `textChunkLimit`: 当 `chunkMode: "length"` 时的出站分块大小（以字符为单位）。默认值：`4000`。
- `chunkMode`: `"length"`（默认，按字符数分割）或 `"newline"`（在行边界分割）。
- `historyLimit`: 当房间消息触发代理时，包含为 `InboundHistory` 的最近房间消息数量。回退到 `messages.groupChat.historyLimit`；有效默认值为 `0`（已禁用）。
- `mediaMaxMb`: 用于出站发送和入站处理的媒体大小上限（MB）。

### 反应设置

- `ackReaction`: 此渠道/账户的 ack 反应覆盖设置。
- `ackReactionScope`: 范围覆盖（`"group-mentions"` 默认，`"group-all"`、`"direct"`、`"all"`、`"none"`、`"off"`）。
- `reactionNotifications`: 入站反应通知模式（`"own"` 默认，`"off"`）。

### 工具和每个房间的覆盖设置

- `actions`：基于每个操作的工具限制（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
- `groups`：基于每个房间的策略映射。会话身份在解析后使用稳定的房间 ID。（`rooms` 是旧版别名。）
  - `groups.<room>.account`：将一个继承的房间条目限制为特定账户。
  - `groups.<room>.allowBots`：覆盖渠道级别设置（`true` 或 `"mentions"`）的基于每个房间的设置。
  - `groups.<room>.users`：基于每个房间的发送者允许列表。
  - `groups.<room>.tools`：基于每个房间的工具允许/拒绝覆盖。
  - `groups.<room>.autoReply`：基于每个房间的提及限制覆盖。`true` 禁用该房间的提及要求；`false` 强制重新启用。
  - `groups.<room>.skills`：基于每个房间的技能过滤器。
  - `groups.<room>.systemPrompt`：基于每个房间的系统提示片段。

### 执行批准设置

- `execApprovals.enabled`：通过 Matrix 原生提示传递执行批准。
- `execApprovals.approvers`：获准批准的 Matrix 用户 ID。回退到 `dm.allowFrom`。
- `execApprovals.target`：`"dm"`（默认）、`"channel"` 或 `"both"`。
- `execApprovals.agentFilter` / `execApprovals.sessionFilter`：用于传递的可选代理/会话允许列表。

## 相关

- [渠道概览](/zh/channels) - 所有支持的渠道
- [配对](/zh/channels/pairing) - 私信认证和配对流程
- [群组](/zh/channels/groups) - 群聊行为和提及限制
- [渠道路由](/zh/channels/channel-routing) - 消息的会话路由
- [安全](/zh/gateway/security) - 访问模型和加固
