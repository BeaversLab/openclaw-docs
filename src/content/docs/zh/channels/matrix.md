---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix (插件)

Matrix 是 OpenClaw 的 Matrix 渠道插件。
它使用官方 `matrix-js-sdk`，并支持私信、房间、话题、媒体、回应、投票、位置和 E2EE。

## 所需插件

Matrix 是一个插件，未随 OpenClaw 核心打包。

从 npm 安装：

```bash
openclaw plugins install @openclaw/matrix
```

从本地检出安装：

```bash
openclaw plugins install ./extensions/matrix
```

有关插件行为和安装规则，请参阅 [Plugins](/zh/tools/plugin)。

## 设置

1. 安装该插件。
2. 在您的家庭服务器上创建一个 Matrix 账户。
3. 配置 `channels.matrix`，使用以下任一方式：
   - `homeserver` + `accessToken`，或
   - `homeserver` + `userId` + `password`。
4. 重启网关。
5. 开始与机器人私信，或将其邀请到房间。

交互式设置路径：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 向导实际询问的内容：

- 家庭服务器 URL
- 认证方式：访问令牌或密码
- 用户 ID（仅在选择密码认证时）
- 可选设备名称
- 是否启用 E2EE
- 是否现在配置 Matrix 房间访问权限

重要的向导行为：

- 如果所选账户的 Matrix 认证环境变量已存在，且该账户尚未在配置中保存认证信息，向导将提供环境变量快捷方式，并仅为该账户写入 `enabled: true`。
- 当您以交互方式添加另一个 Matrix 账户时，输入的账户名称将被规范化为配置和环境变量中使用的账户 ID。例如，`Ops Bot` 会变成 `ops-bot`。
- 私信允许列表提示会立即接受完整的 `@user:server` 值。显示名称仅在实时目录查找找到一个精确匹配时有效；否则，向导会要求您使用完整的 Matrix ID 重试。
- 房间允许列表提示直接接受房间 ID 和别名。它们也可以实时解析已加入房间的名称，但未解析的名称仅在设置期间按输入保留，并在稍后被运行时允许列表解析忽略。建议使用 `!room:server` 或 `#alias:server`。
- 运行时的房间/会话身份使用稳定的 Matrix 房间 ID。房间声明的别名仅用作查找输入，不作为长期会话密钥或稳定的群组身份。
- 若要在保存房间名称之前解析它们，请使用 `openclaw channels resolve --channel matrix "Project Room"`。

最小化基于令牌的设置：

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

基于密码的设置（令牌在登录后会被缓存）：

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

Matrix 将缓存的凭据存储在 `~/.openclaw/credentials/matrix/` 中。
默认账户使用 `credentials.json`；命名账户使用 `credentials-<account>.json`。

等效的环境变量（在未设置配置键时使用）：

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

对于非默认账户，请使用账户作用域的环境变量：

- `MATRIX_<ACCOUNT_ID>_HOMESERVER`
- `MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN`
- `MATRIX_<ACCOUNT_ID>_USER_ID`
- `MATRIX_<ACCOUNT_ID>_PASSWORD`
- `MATRIX_<ACCOUNT_ID>_DEVICE_ID`
- `MATRIX_<ACCOUNT_ID>_DEVICE_NAME`

账户 `ops` 的示例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

对于规范化账户 ID `ops-bot`，请使用：

- `MATRIX_OPS_BOT_HOMESERVER`
- `MATRIX_OPS_BOT_ACCESS_TOKEN`

只有当这些身份验证环境变量已存在且所选账户尚未在配置中保存 Matrix 身份验证信息时，交互式向导才提供环境变量快捷方式。

## 配置示例

这是一个包含私信配对、房间允许列表并启用了 E2EE 的实用基准配置：

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
      },

      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },

      autoJoin: "allowlist",
      autoJoinAllowlist: ["!roomid:example.org"],
      threadReplies: "inbound",
      replyToMode: "off",
    },
  },
}
```

## E2EE 设置

## Bot 到 bot 房间

默认情况下，来自其他已配置 Matrix OpenClaw 账户的 Matrix 消息将被忽略。

当您有意需要代理间的 Matrix 流量时，请使用 `allowBots`：

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

- `allowBots: true` 接受来自允许的房间和私信中其他已配置 Matrix bot 账户的消息。
- `allowBots: "mentions"` 仅当这些消息在房间中明确提及此 bot 时才接受它们。私信仍然是被允许的。
- `groups.<room>.allowBots` 会覆盖单个房间的账户级设置。
- OpenClaw 仍会忽略来自同一 Matrix 用户 ID 的消息，以避免自回复循环。
- Matrix 在此处不暴露原生的机器人标记；OpenClaw 将“机器人撰写”视为“在此 OpenClaw 网关上由另一个配置的 Matrix 账户发送”。

在共享房间中启用机器人对机器人的流量时，请使用严格的房间允许列表和提及要求。

启用加密：

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

检查验证状态：

```bash
openclaw matrix verify status
```

详细状态（完整诊断）：

```bash
openclaw matrix verify status --verbose
```

在机器可读的输出中包含存储的恢复密钥：

```bash
openclaw matrix verify status --include-recovery-key --json
```

引导交叉签名和验证状态：

```bash
openclaw matrix verify bootstrap
```

多账户支持：使用 `channels.matrix.accounts` 配合每个账户的凭据和可选的 `name`。有关共享模式，请参阅[配置参考](/zh/gateway/configuration-reference#multi-account-all-channels)。

详细引导诊断：

```bash
openclaw matrix verify bootstrap --verbose
```

在引导之前强制重置新的交叉签名身份：

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

使用恢复密钥验证此设备：

```bash
openclaw matrix verify device "<your-recovery-key>"
```

详细设备验证详细信息：

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

检查房间密钥备份运行状况：

```bash
openclaw matrix verify backup status
```

详细备份运行状况诊断：

```bash
openclaw matrix verify backup status --verbose
```

从服务器备份恢复房间密钥：

```bash
openclaw matrix verify backup restore
```

详细恢复诊断：

```bash
openclaw matrix verify backup restore --verbose
```

删除当前的服务器备份并创建一个新的备份基线：

```bash
openclaw matrix verify backup reset --yes
```

默认情况下，所有 `verify` 命令都是简洁的（包括安静的内部 SDK 日志记录），仅在使用 `--verbose` 时才显示详细的诊断信息。
在编写脚本时，请使用 `--json` 获取完整的机器可读输出。

在多账户设置中，Matrix CLI 命令使用隐式的 Matrix 默认账户，除非您传递 `--account <id>`。
如果您配置了多个命名账户，请先设置 `channels.matrix.defaultAccount`，否则那些隐式 CLI 操作将停止并要求您明确选择一个账户。
每当您希望验证或设备操作明确针对命名账户时，请使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

当对命名账户禁用或无法使用加密时，Matrix 警告和验证错误会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

### “已验证”的含义

只有当此 Matrix 设备经过您自己的交叉签名身份验证时，OpenClaw 才将其视为已验证。
实际上，`openclaw matrix verify status --verbose` 暴露了三种信任信号：

- `Locally trusted`：此设备仅受当前客户端信任
- `Cross-signing verified`：SDK 通过交叉签名报告该设备已验证
- `Signed by owner`：该设备由您自己的自签名密钥签名

仅当存在交叉签名验证或所有者签名时，`Verified by owner` 才会变为 `yes`。
仅靠本地信任不足以让 OpenClaw 将该设备视为完全已验证。

### Bootstrap 的作用

`openclaw matrix verify bootstrap` 是用于加密 Matrix 账户的修复和设置命令。
它按顺序执行以下所有操作：

- 引导密钥存储，尽可能重用现有的恢复密钥
- 引导交叉签名并上传缺失的公共交叉签名密钥
- 尝试标记并对当前设备进行交叉签名
- 如果尚不存在，则创建新的服务器端房间密钥备份

如果主服务器需要交互式身份验证才能上传交叉签名密钥，OpenClaw 会首先尝试在无身份验证的情况下上传，然后使用 `m.login.dummy`，再在配置了 `channels.matrix.password` 时使用 `m.login.password`。

仅当您有意放弃当前的交叉签名身份并创建新身份时，才使用 `--force-reset-cross-signing`。

如果您有意放弃当前的房间密钥备份并为将来的消息启动新的备份基线，请使用 `openclaw matrix verify backup reset --yes`。
仅当您接受无法恢复的旧加密历史记录将保持不可用时，才执行此操作。

### 全新的备份基线

如果您想保持未来的加密消息正常工作并接受丢失无法恢复的旧历史记录，请按顺序运行以下命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

当您想要明确针对命名的 Matrix 账户时，将 `--account <id>` 添加到每个命令中。

### 启动行为

当 `encryption: true` 时，Matrix 默认将 `startupVerification` 设置为 `"if-unverified"`。
启动时，如果此设备仍未验证，Matrix 将在另一个 Matrix 客户端中请求自验证，
当已有请求待处理时跳过重复请求，并在重启后重试前应用本地冷却。
默认情况下，失败的请求尝试比成功创建请求的重试频率更高。
设置 `startupVerification: "off"` 以禁用自动启动请求，或调整 `startupVerificationCooldownHours`
如果您希望缩短或延长重试窗口。

启动时还会自动执行保守的加密引导程序。
该过程首先尝试重用当前的密钥存储和交叉签名身份，并避免重置交叉签名，除非您运行显式的引导程序修复流程。

如果启动时发现引导程序状态损坏并配置了 `channels.matrix.password`，OpenClaw 可以尝试更严格的修复路径。
如果当前设备已由所有者签名，OpenClaw 将保留该身份而不是自动重置它。

从以前的公共 Matrix 插件升级：

- OpenClaw 会尽可能自动重复使用相同的 Matrix 账户、访问令牌和设备身份。
- 在运行任何可操作的 Matrix 迁移更改之前，OpenClaw 会在 `~/Backups/openclaw-migrations/` 下创建或重复使用恢复快照。
- 如果您使用多个 Matrix 账户，请在从旧的扁平存储布局升级之前设置 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪个帐户应该接收该共享的旧版状态。
- 如果以前的插件在本地存储了 Matrix 房间密钥备份解密密钥，启动或 `openclaw doctor --fix` 将自动将其导入到新的恢复密钥流程中。
- 如果在准备迁移后 Matrix 访问令牌发生了更改，启动现在会扫描同级令牌哈希存储根目录以查找待处理的旧版恢复状态，然后再放弃自动备份恢复。
- 如果对于同一帐户、主服务器和用户，Matrix 访问令牌稍后发生变化，OpenClaw 现在倾向于重复使用最完整的现有令牌哈希存储根目录，而不是从空的 Matrix 状态目录开始。
- 在下一次网关启动时，备份的房间密钥将自动恢复到新的加密存储中。
- 如果旧插件有从未备份的仅本地房间密钥，OpenClaw 将明确发出警告。由于这些密钥无法从先前的 rust crypto 存储自动导出，因此一些旧的加密历史记录可能需要手动恢复后才能查看。
- 有关完整的升级流程、限制、恢复命令和常见迁移信息，请参阅 [Matrix 迁移](/zh/install/migrating-matrix)。

加密的运行时状态按账号、按用户令牌哈希根目录组织在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 中。
当启用这些功能时，该目录包含同步存储（`bot-storage.json`）、加密存储（`crypto/`）、
恢复密钥文件（`recovery-key.json`）、IndexedDB 快照（`crypto-idb-snapshot.json`）、
线程绑定（`thread-bindings.json`）和启动验证状态（`startup-verification.json`）。
当令牌更改但账号身份保持不变时，OpenClaw 会为该账号/主服务器/用户组合重用最佳的现有
根目录，以便先前的同步状态、加密状态、线程绑定
和启动验证状态保持可见。

### Node 加密存储模型

此插件中的 Matrix E2EE 使用官方 `matrix-js-sdk` Node 中的 Rust 加密路径。
当您希望加密状态在重启后依然存在时，该路径需要基于 IndexedDB 的持久化支持。

OpenClaw 目前在 Node 中通过以下方式实现这一点：

- 使用 `fake-indexeddb` 作为 SDK 预期的 IndexedDB API 适配层
- 在 `initRustCrypto` 之前，从 `crypto-idb-snapshot.json` 恢复 Rust 加密 IndexedDB 内容
- 在初始化后和运行期间，将更新的 IndexedDB 内容持久化回 `crypto-idb-snapshot.json`

这是兼容性/存储管道，而不是自定义加密实现。
快照文件是敏感的运行时状态，并以限制性文件权限存储。
在 OpenClaw 的安全模型下，网关主机和本地 OpenClaw 状态目录已位于受信任的操作员边界内，因此这主要是一个操作持久性问题，而不是一个独立的远程信任边界。

计划改进：

- 添加 SecretRef 支持以持久化 Matrix 密钥材料，以便可以从 OpenClaw 密钥提供程序获取恢复密钥和相关的存储加密密钥，而不仅仅是从本地文件获取。

## 自动验证通知

Matrix 现在将验证生命周期通知直接作为 `m.notice` 消息发布到严格的私信验证房间中。
包括：

- 验证请求通知
- 验证就绪通知（包含明确的“通过表情符号验证”指引）
- 验证开始和完成通知
- SAS 详细信息（表情符号和十进制），如果有

来自另一个 Matrix 客户端的传入验证请求会被 OpenClaw 跟踪并自动接受。
对于自验证流程，当表情符号验证可用时，OpenClaw 也会自动启动 SAS 流程并确认其自身的一端。
对于来自另一个 Matrix 用户/设备的验证请求，OpenClaw 会自动接受该请求，然后等待 SAS 流程正常进行。
您仍然需要在 Matrix 客户端中比较表情符号或十进制 SAS，并在那里确认“它们匹配”以完成验证。

OpenClaw 不会盲目地自动接受自发起的重复流程。当自验证请求已经处于挂起状态时，启动过程会跳过创建新请求。

验证协议/系统通知不会转发到代理聊天管道，因此它们不会生成 `NO_REPLY`。

### 设备卫生

旧的由 OpenClaw 管理的 Matrix 设备可能会在帐户上累积，从而使得加密房间的信任更难以推断。
使用以下命令列出它们：

```bash
openclaw matrix devices list
```

使用以下命令删除陈旧的 OpenClaw 管理的设备：

```bash
openclaw matrix devices prune-stale
```

### 直接房间修复

如果私信状态不同步，OpenClaw 可能最终会得到陈旧的 `m.direct` 映射，这些映射指向旧的独立房间而不是当前的私信。使用以下命令检查对等方的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下命令修复它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修复过程将特定于 Matrix 的逻辑保留在插件内部：

- 它更倾向于 `m.direct` 中已映射的严格 1:1 私信
- 否则，它会回退到与该用户加入的任何当前严格的 1:1 私信
- 如果不存在健康的私信，它会创建一个新的直接房间并重写 `m.direct` 以指向该房间

修复流程不会自动删除旧房间。它只会选取健康的私信并更新映射，以便新的 Matrix 发送、验证通知和其他直接消息流再次定位到正确的房间。

## 线程

Matrix 支持用于自动回复和消息工具发送的原生 Matrix 线程。

- `threadReplies: "off"` 将回复保持在顶层。
- `threadReplies: "inbound"` 仅在入站消息已位于该线程中时才在线程内回复。
- `threadReplies: "always"` 将房间回复保持在以触发消息为根的线程中。
- 入站线程消息包含线程根消息作为额外的代理上下文。
- 当目标是同一房间或同一私信用户目标时，消息工具发送现在会自动继承当前的 Matrix 线程，除非提供了显式的 `threadId`。
- Matrix 支持运行时线程绑定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和线程绑定的 `/acp spawn` 现在可在 Matrix 房间和私信中工作。
- 顶层 Matrix 房间/私信 `/focus` 在 `threadBindings.spawnSubagentSessions=true` 时会创建一个新的 Matrix 线程并将其绑定到目标会话。
- 在现有 Matrix 线程内运行 `/focus` 或 `/acp spawn --thread here` 会改为绑定该当前线程。

### 线程绑定配置

Matrix 继承 `session.threadBindings` 的全局默认值，并且还支持每个渠道的覆盖设置：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 线程绑定生成标志是可选的：

- 设置 `threadBindings.spawnSubagentSessions: true` 以允许顶层 `/focus` 创建并绑定新的 Matrix 线程。
- 设置 `threadBindings.spawnAcpSessions: true` 以允许 `/acp spawn --thread auto|here` 将 ACP 会话绑定到 Matrix 线程。

## 反应

Matrix 支持出站反应操作、入站反应通知和入站确认反应。

- 出站表情回应工具由 `channels["matrix"].actions.reactions` 控制。
- `react` 向特定的 Matrix 事件添加表情回应。
- `reactions` 列出特定 Matrix 事件的当前表情回应摘要。
- `emoji=""` 移除机器人账户在该事件上的所有表情回应。
- `remove: true` 仅从机器人账户中移除指定的表情回应。

Ack 表情回应使用标准的 OpenClaw 解析顺序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- 代理身份表情回退

Ack 表情回应范围按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

表情回应通知模式按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 默认值：`own`

当前行为：

- `reactionNotifications: "own"` 转发新增的 `m.reaction` 事件，当它们针对机器人发送的 Matrix 消息时。
- `reactionNotifications: "off"` 禁用表情回应系统事件。
- 表情回应移除仍未被合成为系统事件，因为 Matrix 将其展示为撤销，而非独立的 `m.reaction` 移除。

## 私信和房间策略示例

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

有关提及控制和允许列表行为，请参阅 [Groups](/zh/channels/groups)。

Matrix 私信的配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 用户在批准前持续向您发送消息，OpenClaw 将重用相同的待处理配对代码，并可能在短暂的冷却后再次发送提醒回复，而不是生成新代码。

有关共享私信配对流程和存储布局，请参阅 [Pairing](/zh/channels/pairing)。

## 多账户示例

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
          },
        },
      },
    },
  },
}
```

顶层 `channels.matrix` 值作为命名账户的默认值，除非某个账户覆盖了它们。
当您希望 OpenClaw 为隐式路由、探测和 Matrix 操作优先使用某个命名 CLI 账户时，请设置 `defaultAccount`。
如果您配置了多个命名账户，请为依赖隐式账户选择的 CLI 命令设置 `defaultAccount` 或传递 `--account <id>`。
当您想为单个命令覆盖该隐式选择时，请将 `--account <id>` 传递给 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

## 私有/LAN 主服务器

默认情况下，为了防止 SSRF 攻击，OpenClaw 会阻止私有/内部 Matrix 主服务器，除非您
针对每个账户明确选择加入。

如果您的主服务器运行在 localhost、LAN/Tailscale IP 或内部主机名上，请为该 Matrix 账户启用
`allowPrivateNetwork`：

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      allowPrivateNetwork: true,
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

此选择加入仅允许受信任的私有/内部目标。公共明文主服务器（例如
`http://matrix.example.org:8008`）仍然被阻止。请尽可能优先使用 `https://`。

## 目标解析

当 Matrix 要求您在任何地方提供房间或用户目标时，OpenClaw 接受这些目标形式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

实时目录查找使用已登录的 Matrix 账户：

- 用户查找会查询该主服务器上的 Matrix 用户目录。
- 房间查找直接接受显式的房间 ID 和别名，然后回退到搜索该账户已加入的房间名称。
- 已加入房间名称的查找是尽力而为的。如果房间名称无法解析为 ID 或别名，它将在运行时允许列表解析中被忽略。

## 配置参考

- `enabled`：启用或禁用渠道。
- `name`：账户的可选标签。
- `defaultAccount`：当配置了多个 Matrix 账户时首选的账户 ID。
- `homeserver`：主服务器 URL，例如 `https://matrix.example.org`。
- `allowPrivateNetwork`：允许此 Matrix 账户连接到私有/内部主服务器。当主服务器解析为 `localhost`、LAN/Tailscale IP 或内部主机（如 `matrix-synapse`）时，请启用此选项。
- `userId`：完整的 Matrix 用户 ID，例如 `@bot:example.org`。
- `accessToken`：基于令牌的身份验证的访问令牌。
- `password`：基于密码登录的密码。
- `deviceId`：显式 Matrix 设备 ID。
- `deviceName`：密码登录的设备显示名称。
- `avatarUrl`：存储的个人头像 URL，用于个人资料同步和 `set-profile` 更新。
- `initialSyncLimit`：启动同步事件限制。
- `encryption`：启用 E2EE。
- `allowlistOnly`：对私信和房间强制执行仅限允许列表的行为。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `groupAllowFrom`：用于房间流量的用户 ID 允许列表。
- `groupAllowFrom` 条目应为完整的 Matrix 用户 ID。未解析的名称在运行时将被忽略。
- `replyToMode`：`off`、`first` 或 `all`。
- `threadReplies`：`off`、`inbound` 或 `always`。
- `threadBindings`：用于线程绑定会话路由和生命周期的渠道覆盖设置。
- `startupVerification`：启动时的自动自我验证请求模式（`if-unverified`、`off`）。
- `startupVerificationCooldownHours`：重试自动启动验证请求之前的冷却时间。
- `textChunkLimit`：出站消息块大小。
- `chunkMode`: `length` 或 `newline`。
- `responsePrefix`: 出站回复的可选消息前缀。
- `ackReaction`: 此渠道/账号的可选确认反应覆盖。
- `ackReactionScope`: 可选的确认反应范围覆盖 (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`)。
- `reactionNotifications`: 入站反应通知模式 (`own`, `off`)。
- `mediaMaxMb`: 出站媒体大小上限（MB）。
- `autoJoin`: 邀请自动加入策略 (`always`, `allowlist`, `off`)。默认值：`off`。
- `autoJoinAllowlist`: 当 `autoJoin` 为 `allowlist` 时允许的房间/别名。别名条目会在邀请处理期间解析为房间 ID；OpenClaw 不信任被邀请房间声明的别名状态。
- `dm`: 私信策略块 (`enabled`, `policy`, `allowFrom`)。
- `dm.allowFrom` 条目应为完整的 Matrix 用户 ID，除非您已通过实时目录查找对其进行了解析。
- `accounts`: 命名的按账号覆盖。顶级 `channels.matrix` 值作为这些条目的默认值。
- `groups`: 按房间策略映射。优先使用房间 ID 或别名；未解析的房间名在运行时会被忽略。会话/组标识在解析后使用稳定的房间 ID，而人类可读的标签仍来自房间名。
- `rooms`: `groups` 的旧版别名。
- `actions`：针对每个动作的工具门控（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。
