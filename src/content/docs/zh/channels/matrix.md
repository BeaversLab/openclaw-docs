---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix (插件)

Matrix 是 OpenClaw 的 Matrix 渠道插件。
它使用官方 `matrix-js-sdk`，并支持私信、房间、线程、媒体、表情回应、投票、位置和端到端加密 (E2EE)。

## 所需插件

Matrix 是一个插件，未随 OpenClaw 核心打包。

从 npm 安装：

```bash
openclaw plugins install @openclaw/matrix
```

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

请参阅 [插件](/en/tools/plugin) 了解插件行为和安装规则。

## 设置

1. 安装该插件。
2. 在您的家庭服务器上创建一个 Matrix 账户。
3. 使用以下任一方式配置 `channels.matrix`：
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

- 如果所选账号的 Matrix 认证环境变量已存在，并且该账号尚未在配置中保存认证信息，向导将提供环境变量快捷方式，并且仅为该账号写入 `enabled: true`。
- 当您以交互方式添加另一个 Matrix 账号时，输入的账号名称将被规范化为配置和环境变量中使用的账号 ID。例如，`Ops Bot` 将变为 `ops-bot`。
- 私信允许列表提示可直接接受完整的 `@user:server` 值。仅当实时目录查找找到一个精确匹配项时，显示名称才有效；否则向导会要求您使用完整的 Matrix ID 重试。
- 房间允许列表提示可直接接受房间 ID 和别名。它们还可以实时解析已加入房间的名称，但在设置期间未解析的名称仅按输入保留，并在稍后由运行时允许列表解析忽略。建议使用 `!room:server` 或 `#alias:server`。
- 运行时的房间/会话身份使用稳定的 Matrix 房间 ID。房间声明的别名仅用作查找输入，不作为长期会话密钥或稳定的群组身份。
- 要在保存房间名称之前对其进行解析，请使用 `openclaw channels resolve --channel matrix "Project Room"`。

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
默认账号使用 `credentials.json`；命名账号使用 `credentials-<account>.json`。

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

帐户 `ops` 示例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

对于标准化的帐户 ID `ops-bot`，请使用：

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
        threadReplies: "off",
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
      streaming: "partial",
    },
  },
}
```

## 流式预览

Matrix 回复流式传输是可选的。

当您希望 OpenClaw 发送单条草稿回复，在模型生成文本时原位编辑该草稿，并在回复完成后最终确定它时，请将 `channels.matrix.streaming` 设置为 `"partial"`：

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` 是默认设置。OpenClaw 等待最终回复并发送一次。
- `streaming: "partial"` 会创建一条可编辑的预览消息，而不是发送多条部分消息。
- 如果预览不再适合放入一个 Matrix 事件中，OpenClaw 将停止预览流式传输并回退到正常的最终交付。
- 媒体回复仍然正常发送附件。如果过时的预览不再能安全地重复使用，OpenClaw 会在发送最终媒体回复之前将其撤回。
- 预览编辑会消耗额外的 Matrix API 调用。如果您希望最保守的速率限制行为，请关闭流式传输。

## 加密和验证

在加密 (E2EE) 房间中，出站图像事件使用 `thumbnail_file`，因此图像预览与完整附件一起加密。未加密房间仍使用普通的 `thumbnail_url`。无需配置 — 插件会自动检测 E2EE 状态。

### 机器人到机器人房间

默认情况下，来自其他已配置 Matrix OpenClaw 帐户的 Matrix 消息将被忽略。

当您有意需要代理之间的 Matrix 流量时，请使用 `allowBots`：

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

- `allowBots: true` 接受来自其他已配置 Matrix 机器人帐户在允许的房间和私信中的消息。
- `allowBots: "mentions"` 仅当它们在房间中明显提及此机器人时才接受这些消息。私信仍然被允许。
- `groups.<room>.allowBots` 会覆盖单个房间的帐户级设置。
- OpenClaw 仍然忽略来自同一 Matrix 用户 ID 的消息，以避免自回复循环。
- Matrix 在此处不公开原生机器人标记；OpenClaw 将“机器人撰写”视为“由此 OpenClaw 网关上另一个配置的 Matrix 账户发送”。

在共享房间中启用机器人对机器人流量时，请使用严格的房间允许列表和提及要求。

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

在机器可读输出中包含存储的恢复密钥：

```bash
openclaw matrix verify status --include-recovery-key --json
```

引导交叉签名和验证状态：

```bash
openclaw matrix verify bootstrap
```

多账户支持：使用 `channels.matrix.accounts` 配置每个账户的凭据以及可选的 `name`。有关共享模式，请参阅 [配置参考](/en/gateway/configuration-reference#multi-account-all-channels)。

详细的引导诊断：

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

详细的设备验证详情：

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

检查房间密钥备份的健康状况：

```bash
openclaw matrix verify backup status
```

详细的备份健康状况诊断：

```bash
openclaw matrix verify backup status --verbose
```

从服务器备份恢复房间密钥：

```bash
openclaw matrix verify backup restore
```

详细的恢复诊断：

```bash
openclaw matrix verify backup restore --verbose
```

删除当前的服务器备份并创建新的备份基线：

```bash
openclaw matrix verify backup reset --yes
```

所有 `verify` 命令默认都是简洁的（包括安静的内部 SDK 日志），仅在使用 `--verbose` 时才显示详细的诊断信息。
在编写脚本时，使用 `--json` 获取完整的机器可读输出。

在多账户设置中，Matrix CLI 命令使用隐式的 Matrix 默认账户，除非您传递 `--account <id>`。
如果您配置了多个命名账户，请先设置 `channels.matrix.defaultAccount`，否则那些隐式的 CLI 操作将停止并要求您明确选择一个账户。
每当您希望验证或设备操作明确针对某个命名账户时，请使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

当某个命名账户禁用或无法使用加密时，Matrix 警告和验证错误会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

### “已验证”的含义

OpenClaw 仅当此 Matrix 设备经过您自己的交叉签名身份验证时，才将其视为已验证。
实际上，`openclaw matrix verify status --verbose` 公开了三种信任信号：

- `Locally trusted`：此设备仅受当前客户端信任
- `Cross-signing verified`：SDK 报告该设备通过交叉签名已验证
- `Signed by owner`：该设备由您自己的自签名密钥签名

只有当存在交叉签名验证或所有者签名时，`Verified by owner` 才会变为 `yes`。
仅凭本地信任不足以让 OpenClaw 将该设备视为完全已验证。

### Bootstrap 的作用

`openclaw matrix verify bootstrap` 是用于加密 Matrix 账户的修复和设置命令。
它会按顺序执行以下所有操作：

- 引导密钥存储，并在可能时重用现有的恢复密钥
- 引导交叉签名并上传缺失的公共交叉签名密钥
- 尝试标记并对当前设备进行交叉签名
- 如果服务器端房间密钥备份尚不存在，则创建一个新的

如果主服务器需要交互式身份验证来上传交叉签名密钥，OpenClaw 会先尝试不带身份验证的上传，然后使用 `m.login.dummy`，再在配置了 `channels.matrix.password` 时使用 `m.login.password`。

仅当您有意要丢弃当前的交叉签名身份并创建新身份时，才使用 `--force-reset-cross-signing`。

如果您有意要丢弃当前的房间密钥备份并为未来的消息建立新的备份基线，请使用 `openclaw matrix verify backup reset --yes`。
请仅在您接受无法恢复的旧加密历史将保持不可用这一情况时才执行此操作。

### 全新的备份基线

如果您希望未来的加密消息能够正常工作并接受丢失无法恢复的旧历史记录，请按顺序运行以下命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

当您想要显式定位指定的 Matrix 账户时，请将 `--account <id>` 添加到每个命令中。

### 启动行为

当 `encryption: true` 时，Matrix 默认将 `startupVerification` 设置为 `"if-unverified"`。
启动时，如果此设备仍未验证，Matrix 将在另一个 Matrix 客户端中请求自验证，
在已有请求待处理时跳过重复请求，并在重启后重试前应用本地冷却时间。
默认情况下，失败的请求尝试比成功创建请求更早重试。
设置 `startupVerification: "off"` 以禁用自动启动请求，或者调整 `startupVerificationCooldownHours`
如果您希望缩短或延长重试窗口。

启动时还会自动执行一次保守的加密引导传递。
该传递首先尝试重用当前的密钥存储和交叉签名身份，并避免重置交叉签名，除非您运行显式的引导修复流程。

如果启动发现引导状态损坏且配置了 `channels.matrix.password`，OpenClaw 可以尝试更严格的修复路径。
如果当前设备已经由所有者签名，OpenClaw 将保留该身份而不是自动重置它。

从之前的公共 Matrix 插件升级：

- OpenClaw 会在可能的情况下自动重用相同的 Matrix 账户、访问令牌和设备身份。
- 在任何可执行的 Matrix 迁移更改运行之前，OpenClaw 会在 `~/Backups/openclaw-migrations/` 下创建或重用恢复快照。
- 如果您使用多个 Matrix 账户，请在从旧的扁平存储布局升级之前设置 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪个账户应该接收该共享的旧版状态。
- 如果之前的插件在本地存储了 Matrix 房间密钥备份解密密钥，启动或 `openclaw doctor --fix` 会将其自动导入到新的恢复密钥流程中。
- 如果在准备好迁移后 Matrix 访问令牌发生了更改，启动现在会在放弃自动备份恢复之前扫描同级令牌哈希存储根以查找待处理的旧版恢复状态。
- 如果后来同一账户、主服务器和用户的 Matrix 访问令牌发生了更改，OpenClaw 现在更倾向于重用最完整的现有令牌哈希存储根，而不是从空的 Matrix 状态目录开始。
- 在下次网关启动时，备份的房间密钥将自动恢复到新的加密存储中。
- 如果旧插件有从未备份的本地房间密钥，OpenClaw 将发出明确警告。这些密钥无法从先前的 rust crypto 存储中自动导出，因此某些旧的加密历史记录可能需要手动恢复后才能访问。
- 有关完整的升级流程、限制、恢复命令和常见迁移消息，请参阅 [Matrix 迁移](/en/install/migrating-matrix)。

加密的运行时状态在 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下按账户、按用户令牌哈希根目录进行组织。
该目录包含同步存储 (`bot-storage.json`)、加密存储 (`crypto/`)、
恢复密钥文件 (`recovery-key.json`)、IndexedDB 快照 (`crypto-idb-snapshot.json`)、
线程绑定 (`thread-bindings.json`) 和启动验证状态 (`startup-verification.json`)
（当这些功能处于使用状态时）。
当令牌发生更改但账户身份保持不变时，OpenClaw 会为该账户/主服务器/用户元组重用最佳的现有
根目录，以便先前的同步状态、加密状态、线程绑定
和启动验证状态保持可见。

### Node 加密存储模型

此插件中的 Matrix E2EE 使用官方 `matrix-js-sdk` Node Rust 加密路径。
如果您希望加密状态在重启后保留，该路径需要 IndexedDB 支持的持久化。

OpenClaw 目前通过以下方式在 Node 中提供此功能：

- 使用 `fake-indexeddb` 作为 SDK 所需的 IndexedDB API 模拟层
- 在 `initRustCrypto` 之前，从 `crypto-idb-snapshot.json` 恢复 Rust 加密 IndexedDB 内容
- 在初始化后和运行期间，将更新的 IndexedDB 内容持久化回 `crypto-idb-snapshot.json`

这是兼容性/存储管道，而不是自定义加密实现。
快照文件是敏感的运行时状态，并以限制性的文件权限存储。
在 OpenClaw 的安全模型下，网关主机和本地 OpenClaw 状态目录已经位于受信任的操作员边界内，因此这主要是一个操作持久性问题，而不是单独的远程信任边界。

计划改进：

- 添加对持久化 Matrix 密钥材料的 SecretRef 支持，以便恢复密钥和相关的存储加密密钥可以从 OpenClaw 密钥提供程序获取，而不仅限于本地文件

## 个人资料管理

使用以下命令更新所选帐户的 Matrix 个人资料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

当您想要明确指定命名的 Matrix 帐户时，请添加 `--account <id>`。

Matrix 直接接受 `mxc://` 头像 URL。当您传递 `http://` 或 `https://` 头像 URL 时，OpenClaw 会先将其上传到 Matrix，然后将解析后的 `mxc://` URL 存回 `channels.matrix.avatarUrl`（或所选的帐户覆盖）。

## 自动验证通知

Matrix 现在将验证生命周期通知直接发布到严格的私信验证房间中，作为 `m.notice` 消息。
这包括：

- 验证请求通知
- 验证就绪通知（包含明确的“通过表情符号验证”指导）
- 验证开始和完成通知
- SAS 详情（表情符号和十进制）（如有）

来自另一个 Matrix 客户端的传入验证请求会被 OpenClaw 跟踪并自动接受。
对于自验证流程，当表情符号验证可用时，OpenClaw 还会自动启动 SAS 流程并确认其自身的一侧。
对于来自另一个 Matrix 用户/设备的验证请求，OpenClaw 会自动接受请求，然后等待 SAS 流程正常进行。
您仍需在您的 Matrix 客户端中比较表情符号或十进制 SAS，并在那里确认“它们匹配”以完成验证。

OpenClaw 不会盲目地自动接受自我发起的重复流程。当自验证请求已在等待时，启动过程会跳过创建新请求。

验证协议/系统通知不会转发到代理聊天管道，因此它们不会产生 `NO_REPLY`。

### 设备清理

旧的由 OpenClaw 管理的 Matrix 设备可能会在帐户上累积，从而使得加密房间的信任更难推断。
使用以下命令列出它们：

```bash
openclaw matrix devices list
```

使用以下命令移除过时的由 OpenClaw 管理的设备：

```bash
openclaw matrix devices prune-stale
```

### 直接房间修复

如果私信状态不同步，OpenClaw 可能会出现过时的 `m.direct` 映射，指向旧的私人房间而不是当前活跃的私信。使用以下命令检查对等方的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下命令修复：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修复操作将 Matrix 特有的逻辑保留在插件内部：

- 它优先选择已经在 `m.direct` 中映射的严格的 1:1 私信
- 否则，它会回退到当前已加入的与该用户的任何严格的 1:1 私信
- 如果不存在健康的私信，它会创建一个新的私人房间并重写 `m.direct` 以指向它

修复流程不会自动删除旧房间。它只选择健康的私信并更新映射，以便新的 Matrix 发送、验证通知和其他私信流程再次定位到正确的房间。

## 话题

Matrix 支持原生的 Matrix 话题，用于自动回复和消息工具发送。

- `threadReplies: "off"` 将回复保持在顶层，并将传入的话题消息保留在父会话中。
- `threadReplies: "inbound"` 仅在传入消息已在该话题中时才在话题内回复。
- `threadReplies: "always"` 将房间回复保持在以触发消息为根的话题中，并将该对话通过来自第一个触发消息的匹配话题范围会话进行路由。
- `dm.threadReplies` 仅覆盖私信的顶层设置。例如，您可以将房间话题保持隔离，同时将私信保持扁平。
- 传入的话题消息包含话题根消息作为额外的代理上下文。
- 当目标是同一房间或同一私信用户目标时，消息工具发送现在会自动继承当前的 Matrix 话题，除非提供了明确的 `threadId`。
- Matrix 支持运行时话题绑定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和绑定话题的 `/acp spawn` 现在可在 Matrix 房间和私信中使用。
- 顶层 Matrix 房间/私信 `/focus` 在 `threadBindings.spawnSubagentSessions=true` 时创建一个新的 Matrix 话题并将其绑定到目标会话。
- 在现有的 Matrix 线程中运行 `/focus` 或 `/acp spawn --thread here` 会绑定该当前线程。

## ACP 会话绑定

Matrix 房间、私信和现有的 Matrix 线程可以转换为持久的 ACP 工作区，而无需更改聊天界面。

操作员快速流程：

- 在您希望继续使用的 Matrix 私信、房间或现有线程中运行 `/acp spawn codex --bind here`。
- 在顶级 Matrix 私信或房间中，当前的私信/房间保持为聊天界面，未来的消息将路由到生成的 ACP 会话。
- 在现有的 Matrix 线程中，`--bind here` 会就地绑定该当前线程。
- `/new` 和 `/reset` 会就地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

备注：

- `--bind here` 不会创建子 Matrix 线程。
- `threadBindings.spawnAcpSessions` 仅对于 `/acp spawn --thread auto|here` 是必需的，在这种情况下 OpenClaw 需要创建或绑定子 Matrix 线程。

### 线程绑定配置

Matrix 继承 `session.threadBindings` 的全局默认值，并且支持每个渠道的覆盖：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 线程绑定的生成标志是可选的（opt-in）：

- 设置 `threadBindings.spawnSubagentSessions: true` 以允许顶级 `/focus` 创建并绑定新的 Matrix 线程。
- 设置 `threadBindings.spawnAcpSessions: true` 以允许 `/acp spawn --thread auto|here` 将 ACP 会话绑定到 Matrix 线程。

## 反应

Matrix 支持出站反应操作、入站反应通知和入站确认反应。

- 出站反应工具受 `channels["matrix"].actions.reactions` 限制。
- `react` 会向特定的 Matrix 事件添加反应。
- `reactions` 列出特定 Matrix 事件的当前反应摘要。
- `emoji=""` 会移除机器人帐户在该事件上的自己的反应。
- `remove: true` 仅从机器人帐户中移除指定的表情符号反应。

Ack 反应使用标准的 OpenClaw 解析顺序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- agent identity emoji fallback

Ack 反应范围按此顺序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

反应通知模式按此顺序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 默认：`own`

当前行为：

- 当目标是 bot 发送的 Matrix 消息时，`reactionNotifications: "own"` 会转发添加的 `m.reaction` 事件。
- `reactionNotifications: "off"` 禁用反应系统事件。
- 反应移除仍不会被合成为系统事件，因为 Matrix 将其作为撤回（redactions）处理，而不是作为独立的 `m.reaction` 移除。

## 历史上下文

- 当 Matrix 房间消息触发 agent 时，`channels.matrix.historyLimit` 控制包含多少条最近的房间消息作为 `InboundHistory`。
- 它会回退到 `messages.groupChat.historyLimit`。设置 `0` 以禁用。
- Matrix 房间历史仅限房间。私信继续使用正常的会话历史。
- Matrix 房间历史仅限待处理（pending-only）：OpenClaw 会缓冲尚未触发回复的房间消息，然后在提及或其他触发器到达时对该窗口进行快照。
- 当前触发消息不包含在 `InboundHistory` 中；它保留在该轮次的主要入站正文中。
- 同一 Matrix 事件的重试会重用原始历史快照，而不是漂移到较新的房间消息。
- 获取的房间上下文（包括回复和线程上下文查找）会按发送者允许列表（`groupAllowFrom`）进行过滤，因此非允许列表中的消息会从 agent 上下文中排除。

## 私信和房间策略示例

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
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

有关提及门控（mention-gating）和允许列表行为，请参阅[组（Groups）](/en/channels/groups)。

Matrix 私信配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 用户在批准前一直向您发送消息，OpenClaw 将重用相同的待处理配对代码，并可能在短暂冷却后再次发送提醒回复，而不是生成新代码。

有关共享私信配对流程和存储布局，请参阅[配对](/en/channels/pairing)。

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
            threadReplies: "off",
          },
        },
      },
    },
  },
}
```

除非命名账户覆盖了顶层 `channels.matrix` 值，否则这些值将作为命名账户的默认值。
当您希望 OpenClaw 在隐式路由、探测和 Matrix 操作中优先使用某个命名的 CLI 账户时，请设置 `defaultAccount`。
如果您配置了多个命名账户，请设置 `defaultAccount` 或为依赖隐式账户选择的 CLI 命令传递 `--account <id>`。
当您想要为某个命令覆盖该隐式选择时，请将 `--account <id>` 传递给 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

## 私有/LAN 主服务器

默认情况下，为了 SSRF 保护，OpenClaw 会阻止私有/内部 Matrix 主服务器，除非您
明确为每个账户选择加入。

如果您的服务器运行在 localhost、LAN/Tailscale IP 或内部主机名上，请为该 Matrix 账户启用
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
`http://matrix.example.org:8008`）仍将被阻止。请尽可能使用 `https://`。

## 代理 Matrix 流量

如果您的 Matrix 部署需要显式的出站 HTTP(S) 代理，请设置 `channels.matrix.proxy`：

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

命名账户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖顶层默认值。
OpenClaw 对运行时 Matrix 流量和账户状态探测使用相同的代理设置。

## 目标解析

在 Matrix 要求您提供房间或用户目标的任何地方，OpenClaw 都接受以下目标形式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

实时目录查找使用已登录的 Matrix 账户：

- 用户查询会在该主服务器上查询 Matrix 用户目录。
- 房间查找优先接受明确的房间 ID 和别名，然后回退到搜索该帐号已加入的房间名称。
- 已加入房间的名称查找是尽力而为的。如果房间名称无法解析为 ID 或别名，它将在运行时允许列表解析中被忽略。

## 配置参考

- `enabled`：启用或禁用渠道。
- `name`: 帐户的可选标签。
- `defaultAccount`: 当配置了多个 Matrix 帐户时，首选的帐户 ID。
- `homeserver`：主服务器 URL，例如 `https://matrix.example.org`。
- `allowPrivateNetwork`：允许此 Matrix 账户连接到私有/内部主服务器。当主服务器解析为 `localhost`、局域网/Tailscale IP 或内部主机（例如 `matrix-synapse`）时，请启用此选项。
- `proxy`：可选的用于 Matrix 流量的 HTTP(S) 代理 URL。命名账户可以使用它们自己的 `proxy` 来覆盖顶层默认值。
- `userId`：完整的 Matrix 用户 ID，例如 `@bot:example.org`。
- `accessToken`: 用于基于令牌的身份验证的访问令牌。在 env/file/exec 提供程序中，`channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken` 支持明文值和 SecretRef 值。请参阅[机密管理](/en/gateway/secrets)。
- `password`：基于密码登录的密码。支持明文值和 SecretRef 值。
- `deviceId`：显式的 Matrix 设备 ID。
- `deviceName`：用于密码登录的设备显示名称。
- `avatarUrl`：用于个人资料同步和 `set-profile` 更新的已存储个人头像 URL。
- `initialSyncLimit`：启动同步事件限制。
- `encryption`：启用端到端加密 (E2EE)。
- `allowlistOnly`：对私信和房间强制仅允许列表行为。
- `groupPolicy`: `open`, `allowlist` 或 `disabled`。
- `groupAllowFrom`: 允许参与房间流量的用户 ID 白名单。
- `groupAllowFrom` 条目应为完整的 Matrix 用户 ID。未解析的名称在运行时将被忽略。
- `historyLimit`：作为群组历史上下文包含的最大房间消息数。回退到 `messages.groupChat.historyLimit`。设置为 `0` 可禁用。
- `replyToMode`：`off`、`first` 或 `all`。
- `streaming`：`off`（默认）或 `partial`。`partial` 启用支持就地编辑更新的单消息草稿预览。
- `threadReplies`：`off`、`inbound` 或 `always`。
- `threadBindings`：针对线程绑定会话路由和生命周期的每渠道覆盖。
- `startupVerification`：启动时的自动自我验证请求模式（`if-unverified`，`off`）。
- `startupVerificationCooldownHours`：重试自动启动验证请求之前的冷却时间。
- `textChunkLimit`：出站消息块大小。
- `chunkMode`： `length` 或 `newline`。
- `responsePrefix`：出站回复的可选消息前缀。
- `ackReaction`：用于此渠道/账户的可选确认回应覆盖。
- `ackReactionScope`：可选的确认反应范围覆盖 (`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`)。
- `reactionNotifications`：入站回复通知模式 (`own`, `off`)。
- `mediaMaxMb`：Matrix 媒体处理的媒体大小上限（以 MB 为单位）。它适用于发送出站媒体和接收入站媒体处理。
- `autoJoin`：邀请自动加入策略（`always`、`allowlist`、`off`）。默认值：`off`。
- `autoJoinAllowlist`：当 `autoJoin` 为 `allowlist` 时，允许使用房间/别名。在处理邀请期间，别名条目会被解析为房间 ID；OpenClaw 不信任被邀请房间声明的别名状态。
- `dm`: 私信策略拦截 (`enabled`, `policy`, `allowFrom`, `threadReplies`)。
- `dm.allowFrom` 条目应为完整的 Matrix 用户 ID，除非您已通过实时目录查找解析了它们。
- `dm.threadReplies`：仅私信的线程策略覆盖（`off`、`inbound`、`always`）。它覆盖顶层的 `threadReplies` 设置，以在私信中控制回复放置和会话隔离。
- `accounts`：按帐户命名的覆盖设置。顶层的 `channels.matrix` 值作为这些条目的默认值。
- `groups`: 每个房间的策略映射。优先使用房间 ID 或别名；运行时会忽略未解析的房间名称。解析后，会话/群组身份使用稳定的房间 ID，而人类可读的标签仍来自房间名称。
- `rooms`：`groups` 的旧式别名。
- `actions`：基于操作的工具限制（`messages`，`reactions`，`pins`，`profile`，`memberInfo`，`channelInfo`，`verification`）。

## 相关

- [Channels Overview](/en/channels) — 所有支持的渠道
- [Pairing](/en/channels/pairing) — 私信认证和配对流程
- [Groups](/en/channels/groups) — 群聊行为和提及门槛
- [Channel Routing](/en/channels/channel-routing) — 消息的会话路由
- [安全](/en/gateway/security) — 访问模型和加固
