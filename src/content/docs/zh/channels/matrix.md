---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix 是 OpenClaw 附带的 Matrix 渠道插件。
它使用官方的 `matrix-js-sdk`，并支持私信、房间、话题、媒体、表情回应、投票、位置和端到端加密（E2EE）。

## 附带插件

当前的 Matrix 版本中已附带 OpenClaw 插件，因此常规的打包构建无需单独安装。

如果您使用的是旧版本或排除了 Matrix 的自定义安装，请
手动安装：

从 npm 安装：

```bash
openclaw plugins install @openclaw/matrix
```

从本地检出安装：

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

有关插件行为和安装规则，请参阅[插件](/en/tools/plugin)。

## 设置

1. 确保 Matrix 插件可用。
   - 当前的打包版 OpenClaw 已附带该插件。
   - 旧版本或自定义安装可以使用上述命令手动添加。
2. 在您的主服务器上创建 Matrix 账户。
3. 使用以下方式之一配置 `channels.matrix`：
   - `homeserver` + `accessToken`，或
   - `homeserver` + `userId` + `password`。
4. 重启网关。
5. 向机器人发起私信或将其邀请至房间。

交互式设置路径：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 设置向导实际要求的内容：

- 主服务器 URL
- 认证方式：访问令牌或密码
- 仅在选择密码认证时需要用户 ID
- 可选的设备名称
- 是否启用 E2EE
- 是否现在配置 Matrix 房间访问权限

需要注意的向导行为：

- 如果所选账户的 Matrix 认证环境变量已存在，且该账户尚未在配置中保存认证信息，向导将提供环境变量快捷方式，并仅为该账户写入 `enabled: true`。
- 当您以交互方式添加另一个 Matrix 账户时，输入的账户名称将被规范化为配置和环境变量中使用的账户 ID。例如，`Ops Bot` 会变成 `ops-bot`。
- 私信允许列表提示可立即接受完整的 `@user:server` 值。仅当实时目录查找找到一个完全匹配项时，显示名称才有效；否则，向导会要求您使用完整的 Matrix ID 重试。
- 房间允许列表提示直接接受房间 ID 和别名。它们也可以实时解析已加入房间的名称，但在设置期间未解析的名称仅按输入保留，并在稍后的运行时允许列表解析中被忽略。建议使用 `!room:server` 或 `#alias:server`。
- 运行时房间/会话身份使用稳定的 Matrix 房间 ID。房间声明的别名仅用作查找输入，不作为长期会话密钥或稳定的组身份。
- 要在保存之前解析房间名称，请使用 `openclaw channels resolve --channel matrix "Project Room"`。

最小的基于令牌的设置：

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

基于密码的设置（登录后令牌会被缓存）：

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
当那里存在缓存的凭据时，即使未在配置中直接设置当前身份验证，OpenClaw 也会将 Matrix 视为已配置以进行设置、诊断和渠道状态发现。

等效的环境变量（在未设置配置键时使用）：

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

对于非默认账户，请使用账户范围的环境变量：

- `MATRIX_<ACCOUNT_ID>_HOMESERVER`
- `MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN`
- `MATRIX_<ACCOUNT_ID>_USER_ID`
- `MATRIX_<ACCOUNT_ID>_PASSWORD`
- `MATRIX_<ACCOUNT_ID>_DEVICE_ID`
- `MATRIX_<ACCOUNT_ID>_DEVICE_NAME`

账户 `ops` 的示例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

对于标准化的账户 ID `ops-bot`，使用：

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix 会转义账户 ID 中的标点符号，以保持范围内的环境变量不发生冲突。
例如，`-` 变为 `_X2D_`，因此 `ops-prod` 映射到 `MATRIX_OPS_X2D_PROD_*`。

仅当这些身份验证环境变量已存在，并且所选账户尚未在配置中保存 Matrix 身份验证时，交互式向导才会提供环境变量快捷方式。

## 配置示例

这是一个实用的基础配置，包含私信配对、房间允许列表以及启用的端到端加密 (E2EE)：

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

当您希望 OpenClaw 发送单个实时预览回复，在模型生成文本时原位编辑该预览，并在回复完成时将其确定下来，请将 `channels.matrix.streaming` 设置为 `"partial"`：

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
- `streaming: "partial"` 使用普通的 Matrix 文本消息为当前助手块创建一个可编辑的预览消息。这保留了 Matrix 的传统“预览优先”通知行为，因此标准客户端可能会在第一次流式预览文本时发出通知，而不是在完成的块上。
- `streaming: "quiet"` 为当前助手块创建一个可编辑的静默预览通知。仅当您还为最终预览编辑配置了接收方推送规则时，才使用此选项。
- `blockStreaming: true` 启用单独的 Matrix 进度消息。启用预览流式传输后，Matrix 会保留当前块的实时草稿，并将已完成的块保留为单独的消息。
- 当预览流式传输开启且 `blockStreaming` 关闭时，Matrix 会原位编辑实时草稿，并在块或回合结束时确定该同一事件。
- 如果预览不再适合放入一个 Matrix 事件中，OpenClaw 将停止预览流式传输并回退到正常的最终交付。
- 媒体回复仍然正常发送附件。如果过时的预览不再能安全地重用，OpenClaw 会在发送最终媒体回复之前将其撤回。
- 预览编辑需要额外的 Matrix API 调用。如果您希望获得最保守的速率限制行为，请关闭流式传输。

`blockStreaming` 本身并不启用草稿预览。使用 `streaming: "partial"` 或 `streaming: "quiet"` 进行预览编辑；然后仅当您还希望已完成的助手块作为单独的进度消息保持可见时，才添加 `blockStreaming: true`。

如果您需要没有自定义推送规则的标准 Matrix 通知，请使用 `streaming: "partial"` 获取预览优先行为，或保持 `streaming` 关闭以仅进行最终交付。使用 `streaming: "off"` 时：

- `blockStreaming: true` 将每个已完成的块作为一条普通的 Matrix 通知消息发送。
- `blockStreaming: false` 仅将最终完成的回复作为一条普通的 Matrix 通知消息发送。

### 针对静默最终预览的自托管推送规则

如果您运行自己的 Matrix 基础设施，并希望静默预览仅在块或最终回复完成时通知，请设置 `streaming: "quiet"` 并为最终预览编辑添加针对特定用户的推送规则。

这通常是接收用户的设置，而不是主服务器全局配置的更改：

开始前的快速说明：

- 接收用户 = 应该接收通知的人
- 机器人用户 = 发送回复的 OpenClaw Matrix 账户
- 在下面的 API 调用中使用接收用户的访问令牌
- 在推送规则中匹配 `sender`，使其对应机器人用户的完整 MXID

1. 配置 OpenClaw 以使用静默预览：

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. 确保接收账户已经接收正常的 Matrix 推送通知。静默预览规则仅在该用户已有可用的推送器/设备时才有效。

3. 获取接收用户的访问令牌。
   - 使用接收用户的令牌，而不是机器人的令牌。
   - 重用现有的客户端会话令牌通常是最简单的。
   - 如果您需要创建一个新的令牌，可以通过标准的 Matrix 客户端-服务器 API 登录：

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": {
      "type": "m.id.user",
      "user": "@alice:example.org"
    },
    "password": "REDACTED"
  }'
```

4. 验证接收账户是否已有推送器：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果此操作没有返回活动的推送器/设备，请先修复正常的 Matrix 通知，然后再添加下面的 OpenClaw 规则。

OpenClaw 使用以下内容标记已完成的纯文本预览编辑：

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. 为每个应该接收这些通知的接收账户创建一个覆盖推送规则：

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

运行命令前替换这些值：

- `https://matrix.example.org`: 您的主服务器基础 URL
- `$USER_ACCESS_TOKEN`: 接收用户的访问令牌
- `openclaw-finalized-preview-botname`: 一个针对该接收用户和此机器人的唯一规则 ID
- `@bot:example.org`: 您的 OpenClaw Matrix 机器人 MXID，而不是接收用户的 MXID

对于多机器人设置很重要：

- 推送规则由 `ruleId` 键控。针对相同的规则 ID 重新运行 `PUT` 将更新该规则。
- 如果一个接收用户需要针对多个 OpenClaw Matrix 机器人账号接收通知，请为每个机器人创建一条规则，并为每个发送者匹配使用唯一的规则 ID。
- 一个简单的模式是 `openclaw-finalized-preview-<botname>`，例如 `openclaw-finalized-preview-ops` 或 `openclaw-finalized-preview-support`。

该规则根据事件发送者进行评估：

- 使用接收用户的令牌进行身份验证
- 将 `sender` 与 OpenClaw 机器人的 MXID 进行匹配

6. 验证规则是否存在：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. 测试流式回复。在静音模式下，房间应显示静音草稿预览，并且当块或回合完成时，最终的就地编辑应通知一次。

如果以后需要删除该规则，请使用接收用户的令牌删除相同的规则 ID：

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

注意：

- 使用接收用户的访问令牌创建规则，而不是机器人的。
- 新的用户定义 `override` 规则会插入到默认抑制规则之前，因此不需要额外的排序参数。
- 这仅影响 OpenClaw 可以安全地就地完成的纯文本预览编辑。媒体回退和过时预览回退仍使用正常的 Matrix 投递。
- 如果 `GET /_matrix/client/v3/pushers` 未显示推送器，则该用户此账号/设备尚无工作的 Matrix 推送投递。

#### Synapse

对于 Synapse，上述设置通常本身已足够：

- 对于已完成的 OpenClaw 预览通知，不需要特殊的 `homeserver.yaml` 更改。
- 如果您的 Synapse 部署已经发送正常的 Matrix 推送通知，则上述用户令牌 + `pushrules` 调用是主要的设置步骤。
- 如果您在反向代理或工作程序之后运行 Synapse，请确保 `/_matrix/client/.../pushrules/` 正确到达 Synapse。
- 如果您运行 Synapse 工作程序，请确保推送器是健康的。推送投递由主进程或 `synapse.app.pusher` / 已配置的推送器工作程序处理。

#### Tuwunel

对于 Tuwunel，使用上面显示的相同设置流程和推送规则 API 调用：

- 对于完成的预览标记本身，不需要特定于 Tuwunel 的配置。
- 如果正常的 Matrix 通知已对该用户工作，则上述用户令牌 + `pushrules` 调用是主要的设置步骤。
- 如果通知在用户活跃于其他设备时似乎消失了，请检查是否启用了 `suppress_push_when_active`。Tuwunel 在 2025 年 9 月 12 日的 Tuwunel 1.4.2 版本中添加了此选项，它可以在一台设备处于活跃状态时有意抑制向其他设备的推送。

## 加密和验证

在加密（E2EE）房间中，出站图片事件使用 `thumbnail_file`，以便图片预览与完整附件一起被加密。未加密房间仍使用普通的 `thumbnail_url`。无需配置 —— 插件会自动检测 E2EE 状态。

### Bot 到 Bot 房间

默认情况下，来自其他已配置 Matrix OpenClaw 账户的 Matrix 消息将被忽略。

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

- `allowBots: true` 接受来自允许的房间和私信中其他已配置 Matrix bot 账户的消息。
- `allowBots: "mentions"` 仅接受在房间中明确提及此 bot 的那些消息。私信仍然被允许。
- `groups.<room>.allowBots` 会覆盖单个房间的账户级设置。
- OpenClaw 仍然会忽略来自同一 Matrix 用户 ID 的消息，以避免自我回复循环。
- Matrix 在此处不公开原生的 bot 标志；OpenClaw 将“bot 创作”视为“由同一 Matrix 网关上另一个已配置 OpenClaw 账户发送”。

在共享房间中启用 bot 到 bot 的流量时，请使用严格的房间允许列表和提及要求。

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

多账户支持：将 `channels.matrix.accounts` 与每个账户的凭据以及可选的 `name` 一起使用。有关共享模式，请参阅[配置参考](/en/gateway/configuration-reference#multi-account-all-channels)。

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

检查房间密钥备份健康状况：

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

删除当前的服务器备份并创建一个新的备份基线。如果无法干净地加载存储的备份密钥，此重置还可以重新创建机密存储，以便将来的冷启动可以加载新的备份密钥：

```bash
openclaw matrix verify backup reset --yes
```

默认情况下，所有 `verify` 命令都是简洁的（包括静默内部 SDK 日志），仅在使用 `--verbose` 时显示详细诊断信息。
在编写脚本时，请使用 `--json` 获取完整的机器可读输出。

在多帐户设置中，除非传递 `--account <id>`，否则 Matrix CLI 命令使用隐式的 Matrix 默认帐户。
如果您配置了多个命名帐户，请先设置 `channels.matrix.defaultAccount`，否则这些隐式 CLI 操作将停止并要求您显式选择一个帐户。
每当您希望验证或设备操作以命名帐户为目标时，请使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

当命名帐户禁用或无法使用加密时，Matrix 警告和验证错误会指向该帐户的配置密钥，例如 `channels.matrix.accounts.assistant.encryption`。

### "已验证"的含义

OpenClaw 仅当此 Matrix 设备经您自己的交叉签名身份验证时，才将其视为已验证。
在实践中，`openclaw matrix verify status --verbose` 暴露了三个信任信号：

- `Locally trusted`：此设备仅受当前客户端信任
- `Cross-signing verified`：SDK 报告该设备已通过交叉签名验证
- `Signed by owner`：该设备由您自己的自签名密钥签名

`Verified by owner` 只有在存在交叉签名验证或所有者签名时才会变成 `yes`。
仅靠本地信任对于 OpenClaw 将设备视为完全验证是不够的。

### Bootstrap 的作用

`openclaw matrix verify bootstrap` 是用于加密 Matrix 帐户的修复和设置命令。
它按顺序执行以下所有操作：

- 引导机密存储，尽可能重用现有的恢复密钥
- 引导交叉签名并上传缺失的公共交叉签名密钥
- 尝试标记并交叉签名当前设备
- 创建新的服务器端房间密钥备份（如果尚未存在）

如果主服务器在上传跨签名密钥时需要进行交互式身份验证，OpenClaw 会先尝试不带身份验证的上传，然后使用 `m.login.dummy`，当配置了 `channels.matrix.password` 时再使用 `m.login.password`。

仅当您有意放弃当前的跨签名身份并创建新身份时，才使用 `--force-reset-cross-signing`。

如果您有意放弃当前的房间密钥备份并为将来的消息建立新的
备份基线，请使用 `openclaw matrix verify backup reset --yes`。
仅当您接受无法恢复的旧加密历史记录将保持
不可用，并且如果当前备份
密钥无法安全加载，OpenClaw 可能会重新创建机密存储时，才执行此操作。

### 全新的备份基线

如果您想保持未来的加密消息正常工作并接受丢失无法恢复的旧历史记录，请按顺序运行以下命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

当您想要明确指定命名的 Matrix 账户时，将 `--account <id>` 添加到每个命令中。

### 启动行为

当 `encryption: true` 时，Matrix 将 `startupVerification` 默认设置为 `"if-unverified"`。
启动时，如果此设备仍未验证，Matrix 将在另一个 Matrix 客户端中请求自我验证，
在已有请求待处理时跳过重复请求，并在重启后重试之前应用本地冷却。
默认情况下，失败的请求尝试比成功创建请求重试得更快。
设置 `startupVerification: "off"` 以禁用自动启动请求，或者如果您想要更短或更长的重试窗口，请调整 `startupVerificationCooldownHours`。

启动时还会自动执行保守的加密引导过程。
该过程会首先尝试重用当前的机密存储和跨签名身份，并避免重置跨签名，除非您运行显式的引导修复流程。

如果启动发现引导状态损坏且配置了 `channels.matrix.password`，OpenClaw 可以尝试更严格的修复路径。
如果当前设备已由所有者签名，OpenClaw 将保留该身份而不是自动重置它。

从之前的公共 Matrix 插件升级：

- OpenClaw 会尽可能自动重复使用相同的 Matrix 账户、访问令牌和设备身份。
- 在任何可执行的 Matrix 迁移更改运行之前，OpenClaw 会在 `~/Backups/openclaw-migrations/` 下创建或重用恢复快照。
- 如果您使用多个 Matrix 账户，请从旧的扁平存储（flat-store）布局升级之前设置 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪个账户应该接收该共享的旧状态。
- 如果之前的插件在本地存储了 Matrix 房间密钥备份解密密钥，启动或 `openclaw doctor --fix` 会自动将其导入到新的恢复密钥流程中。
- 如果在准备迁移后 Matrix 访问令牌发生了更改，启动现在会在放弃自动备份恢复之前，扫描同级令牌哈希存储根以查找待处理的旧版恢复状态。
- 如果稍后对于同一账户、主服务器和用户，Matrix 访问令牌发生了更改，OpenClaw 现在会优先重用最完整的现有令牌哈希存储根，而不是从空的 Matrix 状态目录开始。
- 在下次网关启动时，备份的房间密钥将自动恢复到新的加密存储中。
- 如果旧插件拥有从未备份的仅本地房间密钥，OpenClaw 将发出明确警告。这些密钥无法从之前的 rust 加密存储中自动导出，因此某些旧的加密历史记录可能需要手动恢复后才能访问。
- 有关完整的升级流程、限制、恢复命令和常见迁移消息，请参阅 [Matrix 迁移](/en/install/migrating-matrix)。

加密的运行时状态按每个账户、每个用户的令牌哈希根组织在 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下。
该目录包含同步存储（`bot-storage.json`）、加密存储（`crypto/`）、
恢复密钥文件（`recovery-key.json`）、IndexedDB 快照（`crypto-idb-snapshot.json`）、
线程绑定（`thread-bindings.json`）和启动验证状态（`startup-verification.json`），
当这些功能处于使用状态时。
当令牌更改但账户身份保持不变时，OpenClaw 会为该账户/主服务器/用户元组重用最佳的现有
根，以便先前的同步状态、加密状态、线程绑定
和启动验证状态保持可见。

### Node 加密存储模型

此插件中的 Matrix E2EE 使用 Node.js 中官方 `matrix-js-sdk` Rust 加密路径。
如果您希望加密状态在重启后保留，该路径需要基于 IndexedDB 的持久化支持。

OpenClaw 目前在 Node.js 中通过以下方式提供此功能：

- 使用 `fake-indexeddb` 作为 SDK 所期望的 IndexedDB API 适配层
- 在 `initRustCrypto` 之前，从 `crypto-idb-snapshot.json` 恢复 Rust 加密的 IndexedDB 内容
- 在初始化后和运行期间，将更新的 IndexedDB 内容持久化回 `crypto-idb-snapshot.json`
- 使用建议性文件锁来针对 `crypto-idb-snapshot.json` 串行化快照恢复和持久化操作，以防止网关运行时持久化和 CLI 维护操作在同一快照文件上发生竞争

这是兼容性/存储管道，而非自定义加密实现。
快照文件是敏感的运行时状态，并具有限制性的文件权限。
在 OpenClaw 的安全模型下，网关主机和本地 OpenClaw 状态目录已位于受信任的操作员边界内，因此这主要是一个运营持久性问题，而不是一个独立的远程信任边界。

计划改进：

- 为持久化 Matrix 密钥材料添加 SecretRef 支持，以便恢复密钥和相关的存储加密密钥可以从 OpenClaw 密钥提供程序获取，而不仅限于本地文件

## 个人资料管理

使用以下内容更新所选帐户的 Matrix 个人资料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

当您想要明确指定某个命名的 Matrix 帐户时，请添加 `--account <id>`。

Matrix 直接接受 `mxc://` 头像 URL。当您传递 `http://` 或 `https://` 头像 URL 时，OpenClaw 会先将其上传到 Matrix，然后将解析后的 `mxc://` URL 存储回 `channels.matrix.avatarUrl`（或所选帐户覆盖设置）。

## 自动验证通知

Matrix 现在将验证生命周期通知直接作为 `m.notice` 消息发布到严格私信验证房间中。
这包括：

- 验证请求通知
- 验证就绪通知（附带明确的“通过表情符号验证”指导）
- 验证开始和完成通知
- SAS 详情（如果有，包括表情符号和十进制）

来自另一个 Matrix 客户端的传入验证请求会被 OpenClaw 跟踪并自动接受。
对于自我验证流程，当表情符号验证可用时，OpenClaw 也会自动启动 SAS 流程并确认其自身一侧。
对于来自另一个 Matrix 用户/设备的验证请求，OpenClaw 会自动接受该请求，然后等待 SAS 流程正常进行。
您仍需在 Matrix 客户端中比较表情符号或十进制 SAS，并在那里确认“匹配”以完成验证。

OpenClaw 不会盲目地自动接受自我发起的重复流程。如果自我验证请求已在等待中，启动时会跳过创建新请求。

验证协议/系统通知不会转发到代理聊天管道，因此它们不会产生 `NO_REPLY`。

### 设备卫生

旧的 OpenClaw 管理的 Matrix 设备可能会在帐户上累积，并使加密房间的信任更难推理。
使用以下命令列出它们：

```bash
openclaw matrix devices list
```

使用以下命令删除过时的 OpenClaw 管理的设备：

```bash
openclaw matrix devices prune-stale
```

### 直接房间修复

如果直接消息状态不同步，OpenClaw 可能最终会得到指向旧的单独房间而不是当前 活跃私信 的过时 `m.direct` 映射。使用以下命令检查对等方的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下命令修复它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修复会将 Matrix 特定的逻辑保留在插件内部：

- 它首选已经在 `m.direct` 中映射的严格 1:1 私信
- 否则，它会回退到当前与该用户加入的任何严格 1:1 私信
- 如果不存在健康的私信，它会创建一个新的直接房间并重写 `m.direct` 以指向它

修复流程不会自动删除旧房间。它只选择健康的私信并更新映射，以便新的 Matrix 发送、验证通知和其他直接消息流程再次针对正确的房间。

## 线程

Matrix 支持用于自动回复和消息工具发送的原生 Matrix 线程。

- `dm.sessionScope: "per-user"`（默认）保持 Matrix 私信路由为发送方作用域，因此当多个私信房间解析为同一对等方时，它们可以共享一个会话。
- `dm.sessionScope: "per-room"` 将每个 Matrix 私信房间隔离到其自己的会话密钥中，同时仍然使用正常的私信身份验证和允许列表检查。
- 显式的 Matrix 会话绑定仍然优先于 `dm.sessionScope`，因此已绑定的房间和线程将保持其选定的目标会话。
- `threadReplies: "off"` 保持回复位于顶层，并将传入的线程化消息保留在父级会话上。
- `threadReplies: "inbound"` 仅在传入消息已位于该线程内时，才在线程内回复。
- `threadReplies: "always"` 将房间回复保留在以触发消息为根的线程中，并通过来自第一条触发消息的匹配线程范围会话路由该对话。
- `dm.threadReplies` 仅针对私信覆盖顶层设置。例如，您可以将房间线程保持隔离，同时将私信保持扁平。
- 传入的线程化消息包括线程根消息作为额外的代理上下文。
- 当目标是同一房间或同一私信用户目标时，消息工具发送现在会自动继承当前的 Matrix 线程，除非提供了显式的 `threadId`。
- 仅当当前会话元数据证明同一 Matrix 账户上的私信对象相同时，才会启动同会话私信用户目标重用；否则 OpenClaw 将回退到正常的用户范围路由。
- 当 OpenClaw 发现 Matrix 私信房间与同一共享 Matrix 私信会话上的另一个私信房间冲突时，它会在该房间中发布一次性的 `m.notice`，并在启用线程绑定且带有 `dm.sessionScope` 提示时提供 `/focus` 逃生舱。
- Matrix 支持运行时线程绑定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和线程绑定的 `/acp spawn` 现可在 Matrix 房间和私信中使用。
- 顶层 Matrix 房间/私信 `/focus` 会在 `threadBindings.spawnSubagentSessions=true` 时创建一个新的 Matrix 线程并将其绑定到目标会话。
- 在现有 Matrix 线程中运行 `/focus` 或 `/acp spawn --thread here` 将改为绑定当前线程。

## ACP 会话绑定

Matrix 房间、私信和现有 Matrix 线程可以转换为持久的 ACP 工作空间，而无需更改聊天界面。

快速操作员流程：

- 在您想要继续使用的 Matrix 私信、房间或现有主题中运行 `/acp spawn codex --bind here`。
- 在顶级 Matrix 私信或房间中，当前的私信/房间保持为聊天界面，未来的消息将路由到生成的 ACP 会话。
- 在现有的 Matrix 主题内，`--bind here` 会将该当前主题就地绑定。
- `/new` 和 `/reset` 会就地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

说明：

- `--bind here` 不会创建子 Matrix 主题。
- `threadBindings.spawnAcpSessions` 仅对于 `/acp spawn --thread auto|here` 是必需的，在这种情况下，OpenClaw 需要创建或绑定一个子 Matrix 主题。

### 主题绑定配置

Matrix 继承 `session.threadBindings` 的全局默认值，并且也支持针对每个渠道的覆盖设置：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 主题绑定的生成标志是可选加入的：

- 设置 `threadBindings.spawnSubagentSessions: true` 以允许顶级 `/focus` 创建并绑定新的 Matrix 主题。
- 设置 `threadBindings.spawnAcpSessions: true` 以允许 `/acp spawn --thread auto|here` 将 ACP 会话绑定到 Matrix 主题。

## 回应

Matrix 支持出站回应操作、入站回应通知和入站 ack 回应。

- 出站回应工具由 `channels["matrix"].actions.reactions` 控制。
- `react` 为特定的 Matrix 事件添加回应。
- `reactions` 列出特定 Matrix 事件的当前回应摘要。
- `emoji=""` 移除机器人账户在该事件上的自己的回应。
- `remove: true` 仅从机器人账户移除指定的 emoji 回应。

Ack 回应使用标准的 OpenClaw 解析顺序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- 代理身份 emoji 回退

Ack 回应作用域按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

表情符号通知模式按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 默认值： `own`

当前行为：

- 当添加的 `m.reaction` 事件针对机器人发出的 Matrix 消息时，`reactionNotifications: "own"` 会转发这些事件。
- `reactionNotifications: "off"` 禁用表情符号系统事件。
- 移除表情符号的操作仍然不会被合成为系统事件，因为 Matrix 将这些操作表现为撤回，而不是独立的 `m.reaction` 移除。

## 历史上下文

- 当 Matrix 房间消息触发代理时，`channels.matrix.historyLimit` 控制包含多少条最近的房间消息作为 `InboundHistory`。
- 它回退到 `messages.groupChat.historyLimit`。设置 `0` 以禁用。
- Matrix 房间历史记录仅限于房间内。私信 继续使用正常的会话历史记录。
- Matrix 房间历史记录是仅限待处理的：OpenClaw 会缓冲尚未触发回复的房间消息，然后在提及或其他触发器到达时对该窗口进行快照。
- 当前的触发消息不包含在 `InboundHistory` 中；它保留在该回合的主要入站正文中。
- 同一 Matrix 事件的重试将重用原始的历史快照，而不是漂移到更新的房间消息。

## 上下文可见性

Matrix 支持共享的 `contextVisibility` 控制，用于补充房间上下文，例如获取的回复文本、线程根和待处理历史。

- `contextVisibility: "all"` 是默认值。补充上下文将按接收到的原样保留。
- `contextVisibility: "allowlist"` 过滤补充上下文，仅发送活跃房间/用户允许列表检查所允许的发件人。
- `contextVisibility: "allowlist_quote"` 的行为类似于 `allowlist`，但仍然保留一条显式的引用回复。

此设置影响补充上下文的可见性，而不是入站消息本身是否可以触发回复。
触发授权仍来自 `groupPolicy`、`groups`、`groupAllowFrom` 和私信策略设置。

## 私信 和房间策略示例

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

请参阅 [Groups](/en/channels/groups) 以了解提及限制和允许列表行为。

Matrix 私信配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 用户在批准前一直向您发送消息，OpenClaw 将重用相同的待处理配对代码，并可能会在短暂的冷却期后再次发送提醒回复，而不是生成新代码。

请参阅 [Pairing](/en/channels/pairing) 以了解共享私信配对流程和存储布局。

## 执行审批

Matrix 可充当 Matrix 账户的执行审批客户端。

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers` （可选；回退到 `channels.matrix.dm.allowFrom`）
- `channels.matrix.execApprovals.target` （`dm` | `channel` | `both`，默认：`dm`）
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

审批者必须是 Matrix 用户 ID，例如 `@owner:example.org`。当 `enabled` 未设置或为 `"auto"` 并且至少可以解析出一个审批者（无论是来自 `execApprovals.approvers` 还是 `channels.matrix.dm.allowFrom`）时，Matrix 会自动启用原生执行审批。设置 `enabled: false` 可明确禁用 Matrix 作为原生审批客户端。否则，审批请求将回退到其他配置的审批路由或执行审批回退策略。

目前原生 Matrix 路由仅限执行审批：

- `channels.matrix.execApprovals.*` 仅控制执行审批的原生私信/渠道路由。
- 插件审批仍使用共享的同聊天 `/approve` 加上任何配置的 `approvals.plugin` 转发。
- 当 Matrix 可以安全推断出审批者时，它仍可以重用 `channels.matrix.dm.allowFrom` 进行插件审批授权，但它不会暴露单独的原生插件审批私信/渠道分发路径。

送达规则：

- `target: "dm"` 将审批提示发送到审批者私信
- `target: "channel"` 将提示发送回原始 Matrix 房间或私信
- `target: "both"` 发送到审批者私信以及原始 Matrix 房间或私信

Matrix 审批提示会在主要审批消息上预设反应快捷方式：

- `✅` = 允许一次
- `❌` = 拒绝
- `♾️` = 当有效执行策略允许该决定时始终允许

审批者可以对该消息做出反应，或使用回退斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always` 或 `/approve <id> deny`。

只有已解析的审批者才能批准或拒绝。频道传递包含命令文本，因此请仅在受信任的房间中启用 `channel` 或 `both`。

Matrix 审批提示重用共享的核心审批规划器。Matrix 特定的本机界面仅作为执行审批的传输层：房间/私信 路由以及消息发送/更新/删除行为。

按账户覆盖：

- `channels.matrix.accounts.<account>.execApprovals`

相关文档：[执行审批](/en/tools/exec-approvals)

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

顶层 `channels.matrix` 值充当命名帐户的默认值，除非帐户覆盖它们。
您可以使用 `groups.<room>.account`（或旧版 `rooms.<room>.account`）将继承的房间条目范围限定为一个 Matrix 帐户。
没有 `account` 的条目在所有 Matrix 帐户之间保持共享，而带有 `account: "default"` 的条目在顶层 `channels.matrix.*` 上直接配置默认帐户时仍然有效。
部分共享的身份验证默认值本身不会创建单独的隐式默认帐户。只有当该默认值具有新的身份验证（`homeserver` 加 `accessToken`，或 `homeserver` 加 `userId` 和 `password`）时，OpenClaw 才会合成顶层 `default` 帐户；当缓存的凭据稍后满足身份验证时，命名帐户仍可从 `homeserver` 加 `userId` 中被发现。
如果 Matrix 已经只有一个命名帐户，或者 `defaultAccount` 指向现有的命名帐户密钥，则单帐户到多帐户的修复/设置升级将保留该帐户，而不是创建新的 `accounts.default` 条目。只有 Matrix 身份验证/引导密钥会移入该升级的帐户；共享的传递策略密钥保留在顶层。
当您希望 OpenClaw 在隐式路由、探测和 Matrix 操作中优先使用一个命名 CLI 帐户时，请设置 `defaultAccount`。
如果您配置了多个命名帐户，请设置 `defaultAccount` 或为依赖隐式帐户选择的 CLI 命令传递 `--account <id>`。
当您想要为某个命令覆盖该隐式选择时，请将 `--account <id>` 传递给 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

## 私有/LAN 主服务器

默认情况下，为了进行 SSRF 保护，OpenClaw 会阻止私有/内部 Matrix 主服务器，除非您
针对每个帐户明确选择加入。

如果您的主服务器运行在 localhost、LAN/Tailscale IP 或内部主机名上，请为该 Matrix 帐户启用
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

此可选设置仅允许受信任的私有/内部目标。诸如 `http://matrix.example.org:8008` 之类的公共明文家庭服务器仍然被阻止。请尽可能首选 `https://`。

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

命名账户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖顶层默认设置。OpenClaw 对运行时 Matrix 流量和账户状态探测使用相同的代理设置。

## 目标解析

只要 OpenClaw 要求您提供房间或用户目标，Matrix 就接受以下目标形式：

- 用户： `@user:server`、 `user:@user:server` 或 `matrix:user:@user:server`
- 房间： `!room:server`、 `room:!room:server` 或 `matrix:room:!room:server`
- 别名： `#alias:server`、 `channel:#alias:server` 或 `matrix:channel:#alias:server`

实时目录查询使用已登录的 Matrix 账户：

- 用户查询会查询该家庭服务器上的 Matrix 用户目录。
- 房间查询直接接受显式的房间 ID 和别名，然后回退到搜索该账户已加入的房间名称。
- 已加入房间名称的查找是尽力而为的。如果房间名称无法解析为 ID 或别名，它将在运行时允许列表解析中被忽略。

## 配置参考

- `enabled`：启用或禁用渠道。
- `name`：账户的可选标签。
- `defaultAccount`：配置了多个 Matrix 账户时的首选账户 ID。
- `homeserver`：家庭服务器 URL，例如 `https://matrix.example.org`。
- `allowPrivateNetwork`：允许此 Matrix 账户连接到私有/内部家庭服务器。当家庭服务器解析为 `localhost`、LAN/Tailscale IP 或内部主机（例如 `matrix-synapse`）时，请启用此功能。
- `proxy`：Matrix 流量的可选 HTTP(S) 代理 URL。命名账户可以使用自己的 `proxy` 覆盖顶层默认设置。
- `userId`：完整的 Matrix 用户 ID，例如 `@bot:example.org`。
- `accessToken`：基于令牌的身份验证的访问令牌。在 env/file/exec 提供程序中，`channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken` 支持纯文本值和 SecretRef 值。请参阅[密钥管理](/en/gateway/secrets)。
- `password`：基于密码的登录密码。支持纯文本值和 SecretRef 值。
- `deviceId`：显式 Matrix 设备 ID。
- `deviceName`：用于密码登录的设备显示名称。
- `avatarUrl`：用于个人资料同步和 `set-profile` 更新的存储的自定义头像 URL。
- `initialSyncLimit`：启动同步事件限制。
- `encryption`：启用 E2EE。
- `allowlistOnly`：对私信和房间强制执行仅允许列表行为。
- `allowBots`：允许来自其他已配置 OpenClaw Matrix 账户（`true` 或 `"mentions"`）的消息。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `contextVisibility`：补充房间上下文可见性模式（`all`、`allowlist`、`allowlist_quote`）。
- `groupAllowFrom`：房间流量的用户 ID 允许列表。
- `groupAllowFrom` 条目应为完整的 Matrix 用户 ID。未解析的名称在运行时将被忽略。
- `historyLimit`：作为组历史上下文包含的最大房间消息数。回退到 `messages.groupChat.historyLimit`。设置为 `0` 以禁用。
- `replyToMode`：`off`、`first` 或 `all`。
- `markdown`：用于出站 Matrix 文本的可选 Markdown 渲染配置。
- `streaming`：`off`（默认）、`partial`、`quiet`、`true` 或 `false`。`partial` 和 `true` 启用带有普通 Matrix 文本消息的预览优先草稿更新。`quiet` 使用不发送通知的预览通知，适用于自托管推送规则设置。
- `blockStreaming`：`true` 在草稿预览流式传输处于活动状态时，为已完成的助手块启用单独的进度消息。
- `threadReplies`：`off`、`inbound` 或 `always`。
- `threadBindings`：针对线程绑定会话路由和生命周期的逐渠道覆盖。
- `startupVerification`：启动时的自动自我验证请求模式（`if-unverified`、`off`）。
- `startupVerificationCooldownHours`：重试自动启动验证请求之前的冷却时间。
- `textChunkLimit`：出站消息块大小。
- `chunkMode`：`length` 或 `newline`。
- `responsePrefix`：出站回复的可选消息前缀。
- `ackReaction`：此渠道/账户的可选 ack 反应覆盖。
- `ackReactionScope`：可选的 ack 反应范围覆盖（`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`）。
- `reactionNotifications`：入站反应通知模式（`own`、`off`）。
- `mediaMaxMb`：Matrix 媒体处理的媒体大小上限（以 MB 为单位）。它适用于出站发送和入站媒体处理。
- `autoJoin`：邀请自动加入策略 (`always`, `allowlist`, `off`)。默认值：`off`。
- `autoJoinAllowlist`：当 `autoJoin` 为 `allowlist` 时允许的房间/别名。在处理邀请时，别名条目会被解析为房间 ID；OpenClaw 不信任被邀请房间声明的别名状态。
- `dm`：私信策略块 (`enabled`, `policy`, `allowFrom`, `sessionScope`, `threadReplies`)。
- `dm.allowFrom` 条目应为完整的 Matrix 用户 ID，除非您已经通过实时目录查找解析了它们。
- `dm.sessionScope`：`per-user`（默认）或 `per-room`。当您希望每个 Matrix 私信房间即使对方相同也保持独立的上下文时，请使用 `per-room`。
- `dm.threadReplies`：仅限私信的线程策略覆盖 (`off`, `inbound`, `always`)。它会覆盖顶级 `threadReplies` 设置，以影响私信中的回复放置和会话隔离。
- `execApprovals`：Matrix 原生执行审批传递 (`enabled`, `approvers`, `target`, `agentFilter`, `sessionFilter`)。
- `execApprovals.approvers`：被允许批准执行请求的 Matrix 用户 ID。当 `dm.allowFrom` 已经标识了审批者时，此项为可选。
- `execApprovals.target`：`dm | channel | both`（默认值：`dm`）。
- `accounts`：命名的按账户覆盖项。顶级 `channels.matrix` 值作为这些条目的默认值。
- `groups`：按房间策略映射。优先使用房间 ID 或别名；运行时将忽略无法解析的房间名称。解析后，会话/群组身份使用稳定的房间 ID，而人类可读的标签仍来自房间名称。
- `groups.<room>.account`：在多账户设置中，将一个继承的房间条目限制为特定的 Matrix 账户。
- `groups.<room>.allowBots`：为配置的机器人发送者（`true` 或 `"mentions"`）提供房间级别的覆盖。
- `groups.<room>.users`：按房间发送者允许列表。
- `groups.<room>.tools`：按房间工具允许/拒绝覆盖。
- `groups.<room>.autoReply`：房间级别的提及控制覆盖。`true` 禁用该房间的提及要求；`false` 强制重新启用。
- `groups.<room>.skills`：可选的房间级别技能过滤器。
- `groups.<room>.systemPrompt`：可选的房间级别系统提示词片段。
- `rooms`：`groups` 的旧版别名。
- `actions`：按操作工具控制（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。

## 相关

- [频道概览](/en/channels) — 所有支持的频道
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群聊行为和提及控制
- [频道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全](/en/gateway/security) — 访问模型和加固
