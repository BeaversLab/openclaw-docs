---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix 是 OpenClaw 的内置渠道插件。
它使用官方的 `matrix-js-sdk`，支持私信、房间、线程、媒体、回应、投票、位置和端到端加密。

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

有关插件行为和安装规则，请参阅 [Plugins](/en/tools/plugin)。

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
   - 新的 Matrix 邀请仅在 `channels.matrix.autoJoin` 允许时才有效。

交互式设置路径：

```bash
openclaw channels add
openclaw configure --section channels
```

Matrix 向导会询问：

- 主服务器 URL
- 认证方式：Access Token 或密码
- 用户 ID（仅限密码认证）
- 可选设备名称
- 是否启用 E2EE
- 是否配置房间访问权限和邀请自动加入

关键向导行为：

- 如果 Matrix 认证环境变量已经存在，且该账户尚未在配置中保存认证信息，向导会提供一个环境变量快捷方式，以将认证信息保留在环境变量中。
- 账户名称会被规范化为账户 ID。例如，`Ops Bot` 会变成 `ops-bot`。
- 私信白名单条目直接接受 `@user:server`；显示名称仅在实时目录查找找到一个精确匹配时才有效。
- 房间白名单条目直接接受房间 ID 和别名。建议使用 `!room:server` 或 `#alias:server`；未解析的名称将在运行时被白名单解析忽略。
- 在邀请自动加入白名单模式下，仅使用稳定的邀请目标：`!roomId:server`、`#alias:server` 或 `*`。普通的房间名称将被拒绝。
- 要在保存之前解析房间名称，请使用 `openclaw channels resolve --channel matrix "Project Room"`。

<Warning>
`channels.matrix.autoJoin` 默认为 `off`。

如果您不设置它，机器人将不会加入被邀请的房间或新的私信式邀请，因此除非您先手动加入，否则它不会出现在新群组或被邀请的私信中。

设置 `autoJoin: "allowlist"` 以及 `autoJoinAllowlist` 来限制它接受的邀请，或者如果您希望它加入每个邀请，请设置 `autoJoin: "always"`。

在 `allowlist` 模式下，`autoJoinAllowlist` 仅接受 `!roomId:server`、`#alias:server` 或 `*`。

</Warning>

白名单示例：

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

加入每个邀请：

```json5
{
  channels: {
    matrix: {
      autoJoin: "always",
    },
  },
}
```

最小令牌设置：

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
当那里存在缓存的凭据时，OpenClaw 会将 Matrix 视为已配置，可用于设置、诊断和渠道状态发现，即使当前的身份验证未直接在配置中设置。

等效的环境变量（当未设置配置键时使用）：

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

对于非默认账户，使用作用于账户的环境变量：

- `MATRIX_<ACCOUNT_ID>_HOMESERVER`
- `MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN`
- `MATRIX_<ACCOUNT_ID>_USER_ID`
- `MATRIX_<ACCOUNT_ID>_PASSWORD`
- `MATRIX_<ACCOUNT_ID>_DEVICE_ID`
- `MATRIX_<ACCOUNT_ID>_DEVICE_NAME`

账户 `ops` 的示例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

对于标准化账户 ID `ops-bot`，使用：

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix 会转义账户 ID 中的标点符号，以保持作用域环境变量不冲突。
例如，`-` 变为 `_X2D_`，因此 `ops-prod` 映射到 `MATRIX_OPS_X2D_PROD_*`。

只有当那些身份验证环境变量已经存在并且所选账户尚未在配置中保存 Matrix 身份验证时，交互式向导才提供环境变量快捷方式。

## 配置示例

这是一个实用的基准配置，启用了私信配对、房间允许列表和端到端加密 (E2EE)：

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

`autoJoin` 适用于所有 Matrix 邀请，包括私信样式的邀请。OpenClaw 无法在邀请时可靠地将被邀请的房间归类为私信或群组，因此所有邀请首先通过 `autoJoin`。`dm.policy` 在机器人加入且房间被归类为私信后应用。

## 流式预览

Matrix 回复流式传输是可选加入的。

当您希望 OpenClaw 发送单个实时预览回复，在模型生成文本时原地编辑该预览，并在回复完成时将其定稿时，请将 `channels.matrix.streaming` 设置为 `"partial"`：

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` 是默认值。OpenClaw 会等待最终回复并发送一次。
- `streaming: "partial"` 使用普通的 Matrix 文本消息为当前的助手模块创建一个可编辑的预览消息。这保留了 Matrix 传统的“预览优先”通知行为，因此标准客户端可能会在第一次流式传输预览文本时发出通知，而不是在完成整个模块时。
- `streaming: "quiet"` 为当前的助手模块创建一个可编辑的静默预览通知。仅当您同时也为最终预览编辑配置了接收者推送规则时，才使用此选项。
- `blockStreaming: true` 启用单独的 Matrix 进度消息。在启用预览流式传输的情况下，Matrix 会保留当前模块的实时草稿，并将已完成的模块保留为单独的消息。
- 当开启预览流式传输并关闭 `blockStreaming` 时，Matrix 会原地编辑实时草稿，并在模块或回合完成时定稿该事件。
- 如果预览不再适合放入一个 Matrix 事件中，OpenClaw 将停止预览流式传输并回退到正常的最终交付方式。
- 媒体回复仍然正常发送附件。如果过时的预览不再能够安全地重用，OpenClaw 会在发送最终媒体回复之前将其撤回（redact）。
- 预览编辑会产生额外的 Matrix API 调用。如果您希望最保守的速率限制行为，请保持流式传输关闭。

`blockStreaming` 本身不会启用草稿预览。
使用 `streaming: "partial"` 或 `streaming: "quiet"` 进行预览编辑；然后仅当您还希望完成的助手模块作为单独的进度消息保持可见时，才添加 `blockStreaming: true`。

如果您需要标准 Matrix 通知而不使用自定义推送规则，请使用 `streaming: "partial"` 获得预览优先行为，或者保持 `streaming` 关闭以仅进行最终交付。使用 `streaming: "off"` 时：

- `blockStreaming: true` 将每个完成的模块作为一条普通的可通知 Matrix 消息发送。
- `blockStreaming: false` 仅将最终完成的回复作为一条常规的 Matrix 通知消息发送。

### 用于静默最终预览的自托管推送规则

如果您运行自己的 Matrix 基础设施，并希望静默预览仅在区块或最终回复完成时发送通知，请设置 `streaming: "quiet"` 并为最终预览编辑添加针对单个用户的推送规则。

这通常是接收用户的设置，而不是主服务器（homeserver）的全局配置更改：

开始前的快速图示：

- 接收用户 = 应该接收通知的人员
- 机器人用户 = 发送回复的 OpenClaw Matrix 账户
- 对下方的 API 调用使用接收用户的访问令牌（access token）
- 在推送规则中匹配 `sender`，其值为机器人用户的完整 MXID

1. 将 OpenClaw 配置为使用静默预览：

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. 确保接收账户已经能接收常规的 Matrix 推送通知。静默预览规则只有在用户已有可用的推送器/设备时才有效。

3. 获取接收用户的访问令牌。
   - 使用接收用户的令牌，而不是机器人的令牌。
   - 重用现有的客户端会话令牌通常是最简单的方法。
   - 如果您需要生成一个新的令牌，可以通过标准的 Matrix 客户端-服务器 API 登录：

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

4. 验证接收账户是否已配置推送器：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果此操作未返回任何活动的推送器/设备，请先修复常规的 Matrix 通知，然后再添加下方的 OpenClaw 规则。

OpenClaw 使用以下标记来标记已完成的纯文本预览编辑：

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. 为每个应接收这些通知的接收账户创建一个覆盖推送规则：

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

在运行命令之前替换这些值：

- `https://matrix.example.org`: 您的主服务器基础 URL
- `$USER_ACCESS_TOKEN`: 接收用户的访问令牌
- `openclaw-finalized-preview-botname`: 一个针对此接收用户且对此机器人唯一的规则 ID
- `@bot:example.org`: 您的 OpenClaw Matrix 机器人 MXID，而不是接收用户的 MXID

多机器人设置的重要提示：

- 推送规则由 `ruleId` 作为键。针对相同的规则 ID 重新运行 `PUT` 将更新该规则。
- 如果一个接收用户需要接收多个 OpenClaw Matrix 机器人账户的通知，请为每个机器人创建一个规则，并为每个发送者匹配分配唯一的规则 ID。
- 一个简单的模式是 `openclaw-finalized-preview-<botname>`，例如 `openclaw-finalized-preview-ops` 或 `openclaw-finalized-preview-support`。

该规则是根据事件发送者进行评估的：

- 使用接收用户的令牌进行身份验证
- 将 `sender` 与 OpenClaw 机器人 MXID 进行匹配

6. 验证规则是否存在：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. 测试流式回复。在静默模式下，房间应显示静默草稿预览，并且当区块或回合完成时，最终的就地编辑应发出一次通知。

如果以后需要删除该规则，请使用接收用户的令牌删除相同的规则 ID：

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

注意事项：

- 使用接收用户的访问令牌创建规则，而不是机器人的令牌。
- 新的用户定义 `override` 规则会插入到默认的抑制规则之前，因此不需要额外的排序参数。
- 这只影响 OpenClaw 可以安全就地完成的纯文本预览编辑。媒体回退和过期预览回退仍使用正常的 Matrix 投递。
- 如果 `GET /_matrix/client/v3/pushers` 显示没有推送器（pushers），则该用户对于此账户/设备尚未启用可用的 Matrix 推送投递。

#### Synapse

对于 Synapse，上述设置通常本身就足够了：

- 对于已完成的 OpenClaw 预览通知，不需要特殊的 `homeserver.yaml` 更改。
- 如果您的 Synapse 部署已经发送正常的 Matrix 推送通知，那么上述用户令牌 + `pushrules` 调用是主要的设置步骤。
- 如果您在反向代理或工作进程后面运行 Synapse，请确保 `/_matrix/client/.../pushrules/` 正确到达 Synapse。
- 如果您运行 Synapse 工作进程，请确保推送器运行状况良好。推送投递由主进程或 `synapse.app.pusher` / 配置的推送器工作进程处理。

#### Tuwunel

对于 Tuwunel，使用上述相同的设置流程和推送规则 API 调用：

- 对于已完成的预览标记本身，不需要特定于 Tuwunel 的配置。
- 如果正常的 Matrix 通知对该用户已经有效，那么上述用户令牌 + `pushrules` 调用是主要的设置步骤。
- 如果用户在其他设备上处于活动状态时通知似乎消失了，请检查是否启用了 `suppress_push_when_active`。Tuwunel 在 2025 年 9 月 12 日的 Tuwunel 1.4.2 版本中添加了此选项，它可以在一个设备处于活动状态时有意抑制向其他设备的推送。

## Bot-to-bot 房间

默认情况下，来自其他已配置 OpenClaw Matrix 账户的 Matrix 消息将被忽略。

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

- `allowBots: true` 接受来自允许的房间和私信中其他已配置 Matrix 机器人账户的消息。
- `allowBots: "mentions"` 仅当消息在房间中明确提及此机器人时才接受这些消息。私信仍然被允许。
- `groups.<room>.allowBots` 会覆盖单个房间的账户级设置。
- OpenClaw 仍然会忽略来自同一 Matrix 用户 ID 的消息，以避免自回复循环。
- Matrix 在此处没有公开原生的机器人标志；OpenClaw 将“机器人编写”视为“由此 OpenClaw 网关上另一个已配置的 Matrix 账户发送”。

在共享房间中启用 bot-to-bot 流量时，请使用严格的房间允许列表和提及要求。

## 加密和验证

在加密 (E2EE) 房间中，出站图片事件使用 `thumbnail_file`，以便图片预览与完整附件一起被加密。未加密的房间仍然使用纯 `thumbnail_url`。无需配置 —— 插件会自动检测 E2EE 状态。

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

详细引导诊断：

```bash
openclaw matrix verify bootstrap --verbose
```

在引导之前强制进行全新的交叉签名身份重置：

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

使用恢复密钥验证此设备：

```bash
openclaw matrix verify device "<your-recovery-key>"
```

详细设备验证信息：

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

检查房间密钥备份健康状况：

```bash
openclaw matrix verify backup status
```

详细备份健康状况诊断：

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

删除当前的服务器备份并创建一个新的备份基线。如果存储的
备份密钥无法干净地加载，此重置还可以重新创建秘密存储，以便
未来的冷启动可以加载新的备份密钥：

```bash
openclaw matrix verify backup reset --yes
```

默认情况下，所有 `verify` 命令都是简洁的（包括安静的内部 SDK 日志记录），仅在使用 `--verbose` 时显示详细诊断信息。
在编写脚本时，请使用 `--json` 以获取完整的机器可读输出。

在多帐户设置中，除非传递 `--account <id>`，否则 Matrix CLI 命令将使用隐式的 Matrix 默认帐户。
如果您配置了多个命名帐户，请首先设置 `channels.matrix.defaultAccount`，否则这些隐式 CLI 操作将停止并要求您明确选择一个帐户。
每当您希望验证或设备操作针对特定命名帐户时，请使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

当某个命名帐户的加密功能被禁用或不可用时，Matrix 警告和验证错误会指向该帐户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

### “已验证”的含义

OpenClaw 仅当此 Matrix 设备经由您自己的跨签名身份验证时，才将其视为已验证。
实际上，`openclaw matrix verify status --verbose` 暴露了三种信任信号：

- `Locally trusted`：此设备仅受当前客户端信任
- `Cross-signing verified`：SDK 报告该设备已通过跨签名验证
- `Signed by owner`：该设备由您自己的自签名密钥签名

`Verified by owner` 仅在存在跨签名验证或所有者签名时才会变为 `yes`。
仅凭本地信任不足以让 OpenClaw 将该设备视为完全已验证。

### 引导程序的作用

`openclaw matrix verify bootstrap` 是用于加密 Matrix 帐户的修复和设置命令。
它会按顺序执行以下所有操作：

- 引导密钥存储，尽可能重用现有的恢复密钥
- 引导跨签名并上传缺失的公共跨签名密钥
- 尝试标记并跨签名当前设备
- 如果服务器端房间密钥备份尚不存在，则创建一个新的备份

如果家庭服务器需要交互式身份验证来上传跨签名密钥，OpenClaw 会先尝试不带身份验证的上传，然后使用 `m.login.dummy`，如果在配置了 `channels.matrix.password` 的情况下，则最后使用 `m.login.password`。

仅在您有意放弃当前的交叉签名身份并创建新身份时，才使用 `--force-reset-cross-signing`。

如果您有意放弃当前的房间密钥备份并为将来的消息建立新的备份基线，请使用 `openclaw matrix verify backup reset --yes`。
仅当您接受无法恢复的旧加密历史记录将保持不可用，并且如果当前备份密钥无法安全加载，OpenClaw 可能会重新创建机密存储时，才执行此操作。

### 全新的备份基线

如果您希望未来的加密消息继续工作并接受丢失无法恢复的旧历史记录，请按顺序运行以下命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

当您想要明确针对命名的 Matrix 账户时，请将 `--account <id>` 添加到每个命令中。

### 启动行为

当 `encryption: true` 时，Matrix 默认将 `startupVerification` 设置为 `"if-unverified"`。
在启动时，如果此设备仍未验证，Matrix 将在另一个 Matrix 客户端中请求自我验证，在已有请求挂起时跳过重复请求，并在重启重试之前应用本地冷却。默认情况下，失败的请求尝试比成功创建请求重试得更快。
设置 `startupVerification: "off"` 以禁用自动启动请求，或者如果您想要更短或更长的重试窗口，请调整 `startupVerificationCooldownHours`。

启动还会自动执行保守的加密引导过程。该过程首先尝试重用当前的机密存储和交叉签名身份，并避免重置交叉签名，除非您运行显式的引导修复流程。

如果启动时仍然发现引导状态损坏，即使未配置 `channels.matrix.password`，OpenClaw 也可以尝试受保护的修复路径。
如果主服务器需要基于密码的 UIA 来进行该修复，OpenClaw 会记录警告并保持启动不致命，而不是中止机器人。
如果当前设备已由所有者签名，OpenClaw 将保留该身份，而不是自动重置它。

有关完整的升级流程、限制、恢复命令和常见迁移消息，请参阅 [Matrix migration](/en/install/migrating-matrix)。

### 验证通知

Matrix 将验证生命周期通知直接作为 `m.notice` 消息发布到严格的私信验证房间中。
这包括：

- 验证请求通知
- 验证就绪通知（附有明确的“通过表情符号验证”指导）
- 验证开始和完成通知
- SAS 详情（emoji 和十进制）（如有）

来自另一个 Matrix 客户端的传入验证请求会被 OpenClaw 跟踪并自动接受。
对于自我验证流程，当 emoji 验证可用时，OpenClaw 还会自动启动 SAS 流程并确认其自身一侧。
对于来自另一个 Matrix 用户/设备的验证请求，OpenClaw 会自动接受该请求，然后等待 SAS 流程正常进行。
您仍需在 Matrix 客户端中比较 emoji 或十进制 SAS，并在那里确认“匹配”以完成验证。

OpenClaw 不会盲目地自动接受自我发起的重复流程。当自我验证请求已处于待处理状态时，启动过程会跳过创建新请求。

验证协议/系统通知不会转发到代理聊天管道，因此它们不会生成 `NO_REPLY`。

### 设备清理

旧的 OpenClaw 托管 Matrix 设备可能会在帐户上累积，从而使加密房间的信任状况更难以理清。
使用以下命令列出它们：

```bash
openclaw matrix devices list
```

使用以下命令删除过时的 OpenClaw 托管设备：

```bash
openclaw matrix devices prune-stale
```

### 加密存储

Matrix E2EE 在 Node 中使用官方的 `matrix-js-sdk` Rust 加密路径，并使用 `fake-indexeddb` 作为 IndexedDB 垫片。加密状态会持久化到快照文件 (`crypto-idb-snapshot.json`) 并在启动时恢复。快照文件是存储的敏感运行时状态，具有限制性的文件权限。

加密的运行时状态位于 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 中按帐户、按用户令牌哈希划分的根目录下。
该目录包含同步存储 (`bot-storage.json`)、加密存储 (`crypto/`)、
恢复密钥文件 (`recovery-key.json`)、IndexedDB 快照 (`crypto-idb-snapshot.json`)、
线程绑定 (`thread-bindings.json`) 和启动验证状态 (`startup-verification.json`)。
当令牌更改但帐户身份保持不变时，OpenClaw 会重用该帐户/主服务器/用户元组最佳的现有
根目录，以便先前的同步状态、加密状态、线程绑定
和启动验证状态仍然可见。

## 个人资料管理

使用以下命令更新所选帐户的 Matrix 个人资料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

当您想要明确指定命名的 Matrix 账户时，请添加 `--account <id>`。

Matrix 直接接受 `mxc://` 头像 URL。当您传递 `http://` 或 `https://` 头像 URL 时，OpenClaw 会先将其上传到 Matrix，然后将解析后的 `mxc://` URL 存回 `channels.matrix.avatarUrl`（或所选的账户覆盖设置）。

## 话题

Matrix 支持原生 Matrix 话题，适用于自动回复和消息工具发送。

- `dm.sessionScope: "per-user"`（默认）保持 Matrix 私信路由以发送者范围为限，因此当多个私信房间解析为同一对等方时，它们可以共享一个会话。
- `dm.sessionScope: "per-room"` 将每个 Matrix 私信房间隔离到其自己的会话密钥中，同时仍使用正常的私信身份验证和允许列表检查。
- 显式的 Matrix 会话绑定仍然优先于 `dm.sessionScope`，因此绑定房间和话题保留其选定的目标会话。
- `threadReplies: "off"` 将回复保持在顶层，并将入站话题消息保留在父会话上。
- `threadReplies: "inbound"` 仅当入站消息已在话题中时，才在话题内回复。
- `threadReplies: "always"` 将房间回复保持在以触发消息为根的话题中，并通过来自第一个触发消息的匹配话题范围会话路由该会话。
- `dm.threadReplies` 仅覆盖私信的顶层设置。例如，您可以让房间话题保持隔离，同时保持私信扁平化。
- 入站话题消息包含话题根消息作为额外的代理上下文。
- 当目标是同一房间或同一私信用户目标时，消息工具发送会自动继承当前的 Matrix 话题，除非提供了显式的 `threadId`。
- 仅当当前会话元数据证明同一 Matrix 账户上的私信对等方相同时，才会启用同一会话的私信用户目标重用；否则 OpenClaw 会回退到正常的用户范围路由。
- 当 OpenClaw 发现在同一个共享 Matrix 私信会话中，Matrix 私信房间与另一个私信房间发生冲突时，它会在该房间中发布一条带有 `/focus` 脱困口的 `m.notice`，前提是启用了主题绑定和 `dm.sessionScope` 提示。
- Matrix 支持运行时主题绑定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和与主题绑定的 `/acp spawn` 在 Matrix 房间和私信中均有效。
- 顶级 Matrix 房间/私信 `/focus` 会在 `threadBindings.spawnSubagentSessions=true` 时创建一个新的 Matrix 主题并将其绑定到目标会话。
- 在现有的 Matrix 主题中运行 `/focus` 或 `/acp spawn --thread here` 会改为绑定该当前主题。

## ACP 对话绑定

Matrix 房间、私信和现有的 Matrix 主题可以转换为持久的 ACP 工作区，而无需更改聊天界面。

快速操作流程：

- 在您希望继续使用的 Matrix 私信、房间或现有主题中运行 `/acp spawn codex --bind here`。
- 在顶级 Matrix 私信或房间中，当前的私信/房间保持为聊天界面，未来的消息将路由到生成的 ACP 会话。
- 在现有的 Matrix 主题内，`--bind here` 会将当前主题就地绑定。
- `/new` 和 `/reset` 会就地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

注意：

- `--bind here` 不会创建子 Matrix 主题。
- 仅当 `/acp spawn --thread auto|here` 需要 OpenClaw 创建或绑定子 Matrix 主题时，才需要 `threadBindings.spawnAcpSessions`。

### 主题绑定配置

Matrix 继承 `session.threadBindings` 的全局默认设置，并且也支持针对每个渠道的覆盖配置：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 主题绑定的生成标志是可选加入的：

- 设置 `threadBindings.spawnSubagentSessions: true` 以允许顶级 `/focus` 创建并绑定新的 Matrix 线程。
- 设置 `threadBindings.spawnAcpSessions: true` 以允许 `/acp spawn --thread auto|here` 将 ACP 会话绑定到 Matrix 线程。

## 回应

Matrix 支持出站回应操作、入站回应通知以及入站确认回应。

- 出站回应工具受 `channels["matrix"].actions.reactions` 限制。
- `react` 会向特定的 Matrix 事件添加回应。
- `reactions` 列出特定 Matrix 事件的当前回应摘要。
- `emoji=""` 会移除机器人账户在该事件上的所有回应。
- `remove: true` 仅从机器人账户中移除指定的表情符号回应。

确认回应使用标准的 OpenClaw 解析顺序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- 代理身份表情符号回退

确认回应范围按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

回应通知模式按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 默认值：`own`

行为：

- 当添加的 `m.reaction` 事件目标是机器人编写的 Matrix 消息时，`reactionNotifications: "own"` 会转发这些事件。
- `reactionNotifications: "off"` 会禁用回应系统事件。
- 回应移除操作不会被合成为系统事件，因为 Matrix 将其作为撤回处理，而不是作为独立的 `m.reaction` 移除。

## 历史上下文

- 当 Matrix 房间消息触发代理时，`channels.matrix.historyLimit` 控制将多少条最近的房间消息作为 `InboundHistory` 包含在内。回退到 `messages.groupChat.historyLimit`；如果两者均未设置，有效默认值为 `0`。设置 `0` 以禁用。
- Matrix 房间历史记录仅限于房间内。私信继续使用正常的会话历史记录。
- Matrix 聊天室历史是仅待处理状态：OpenClow 会缓冲尚未触发回复的聊天室消息，然后在收到提及或其他触发因素时，对该窗口进行快照。
- 当前的触发消息不包含在 `InboundHistory` 中；它保留在该回合的主要入站正文中。
- 对同一 Matrix 事件的重试会重用原始历史快照，而不是向前漂移到更新的聊天室消息。

## 上下文可见性

Matrix 支持共享的 `contextVisibility` 控制，用于补充聊天室上下文，例如获取的回复文本、线索根和待处理历史。

- `contextVisibility: "all"` 是默认设置。补充上下文将按接收原样保留。
- `contextVisibility: "allowlist"` 会过滤补充上下文，仅保留当前聊天室/用户允许列表检查所允许的发送者。
- `contextVisibility: "allowlist_quote"` 的行为类似于 `allowlist`，但仍保留一条显式的引用回复。

此设置影响补充上下文的可见性，而不影响入站消息本身是否可以触发回复。
触发授权仍来自 `groupPolicy`、`groups`、`groupAllowFrom` 和私信策略设置。

## 私信和聊天室策略

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

有关提及控制和允许列表行为，请参阅 [Groups](/en/channels/groups)。

Matrix 私信的配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 用户在批准前一直向您发送消息，OpenClaw 将重用同一个待处理的配对代码，并可能在短暂的冷却后再次发送提醒回复，而不是生成新代码。

有关共享私信配对流程和存储布局，请参阅 [Pairing](/en/channels/pairing)。

## 直接聊天室修复

如果私信状态失去同步，OpenClaw 可能会保留过时的 `m.direct` 映射，这些映射指向旧的独立聊天室而不是当前的私信。使用以下命令检查对等方的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下命令修复它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修复流程：

- 优先选择已经在 `m.direct` 中映射的严格 1:1 私信
- 回退到当前加入的任何与该用户的严格 1:1 私信
- 如果不存在正常的私信，则创建一个新的直接聊天室并重写 `m.direct`

修复流程不会自动删除旧的房间。它只会选择健康的私信并更新映射，以便新的 Matrix 发送、验证通知和其他直接消息流再次定位到正确的房间。

## 执行审批

Matrix 可以充当 Matrix 账户的原生审批客户端。原生私信/渠道路由控制开关仍然位于执行审批配置下：

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers`（可选；回退到 `channels.matrix.dm.allowFrom`）
- `channels.matrix.execApprovals.target`（`dm` | `channel` | `both`，默认值：`dm`）
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

审批人必须是 Matrix 用户 ID，例如 `@owner:example.org`。当未设置 `enabled` 或其值为 `"auto"` 且至少可以解析出一个审批人时，Matrix 会自动启用原生审批。执行审批首先使用 `execApprovals.approvers`，并且可以回退到 `channels.matrix.dm.allowFrom`。插件审批通过 `channels.matrix.dm.allowFrom` 进行授权。设置 `enabled: false` 可明确禁用 Matrix 作为原生审批客户端。否则，审批请求将回退到其他配置的审批路由或审批回退策略。

Matrix 原生路由支持这两种审批类型：

- `channels.matrix.execApprovals.*` 控制用于 Matrix 审批提示的原生私信/渠道分发模式。
- 执行审批使用从 `execApprovals.approvers` 或 `channels.matrix.dm.allowFrom` 设置的执行审批人。
- 插件审批使用来自 `channels.matrix.dm.allowFrom` 的 Matrix 私信允许列表。
- Matrix 反应快捷键和消息更新适用于执行审批和插件审批。

传递规则：

- `target: "dm"` 将审批提示发送到审批人私信
- `target: "channel"` 将提示发送回原始 Matrix 房间或私信
- `target: "both"` 发送到审批人私信以及原始 Matrix 房间或私信

Matrix 审批提示在主要审批消息上预置反应快捷键：

- `✅` = 允许一次
- `❌` = deny
- `♾️` = 当该决定被有效的执行策略允许时，始终允许

审批人可以对该消息做出反应，或使用备用斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always` 或 `/approve <id> deny`。

只有已解析的审批人才能批准或拒绝。对于执行审批，渠道投递包含命令文本，因此请仅在受信任的房间中启用 `channel` 或 `both`。

按账户覆盖：

- `channels.matrix.accounts.<account>.execApprovals`

相关文档：[Exec approvals](/en/tools/exec-approvals)

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

顶层 `channels.matrix` 值充当命名账户的默认值，除非账户覆盖了它们。
您可以使用 `groups.<room>.account` 将继承的房间条目限定为一个 Matrix 账户。
没有 `account` 的条目在所有 Matrix 账户之间保持共享，并且带有 `account: "default"` 的条目在默认账户直接配置在顶层 `channels.matrix.*` 上时仍然有效。
部分共享的身份验证默认值本身不会创建一个单独的隐式默认账户。只有当该默认值具有新的身份验证（`homeserver` 加上 `accessToken`，或 `homeserver` 加上 `userId` 和 `password`）时，OpenClaw 才会合成顶层 `default` 账户；当缓存的凭据稍后满足身份验证时，命名账户仍然可以从 `homeserver` 加上 `userId` 中被发现。
如果 Matrix 已经恰好有一个命名账户，或者 `defaultAccount` 指向现有的命名账户键，则从单账户到多账户的修复/设置升级将保留该账户，而不是创建新的 `accounts.default` 条目。只有 Matrix 身份验证/引导密钥会移动到该升级后的账户中；共享的传递策略密钥保持在顶层。
当您希望 OpenClaw 在隐式路由、探测和 Matrix 操作中优先使用一个命名 CLI 账户时，请设置 `defaultAccount`。
如果配置了多个 Matrix 账户，并且其中一个账户 ID 是 `default`，即使未设置 `defaultAccount`，OpenClaw 也会隐式使用该账户。
如果您配置了多个命名账户，请设置 `defaultAccount` 或为依赖隐式账户选择的 CLI 命令传递 `--account <id>`。
当您想针对一条命令覆盖该隐式选择时，请向 `openclaw matrix verify ...` 和 `openclaw matrix devices ...` 传递 `--account <id>`。

有关共享多账户模式，请参阅 [Configuration reference](/en/gateway/configuration-reference#multi-account-all-channels)。

## 私有/LAN 主服务器

默认情况下，为了防范 SSRF 攻击，OpenClaw 会阻止私有/内部 Matrix 主服务器，除非您
针对每个帐户明确选择加入。

如果您的主机服务器在 localhost、局域网/Tailscale IP 或内部主机名上运行，请为该 Matrix 账户启用
`network.dangerouslyAllowPrivateNetwork`：

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

此选项仅允许受信任的私有/内部目标。诸如
`http://matrix.example.org:8008` 之类的公共明文主机服务器仍将被阻止。请尽可能优先选择 `https://`。

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

命名账户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖顶级默认设置。
OpenClaw 对运行时 Matrix 流量和账户状态探测使用相同的代理设置。

## 目标解析

在 Matrix 要求您提供房间或用户目标的任何位置，OpenClaw 都接受以下目标形式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

实时目录查找使用已登录的 Matrix 账户：

- 用户查找会查询该主服务器上的 Matrix 用户目录。
- 房间查找直接接受显式的房间 ID 和别名，然后回退到搜索该账户已加入的房间名称。
- 已加入房间名称查找是尽力而为的。如果房间名称无法解析为 ID 或别名，它将被运行时允许列表解析忽略。

## 配置参考

- `enabled`：启用或禁用渠道。
- `name`：账户的可选标签。
- `defaultAccount`：当配置了多个 Matrix 账户时首选的账户 ID。
- `homeserver`：主机服务器 URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允许此 Matrix 账户连接到私有/内部主机服务器。当主机服务器解析为 `localhost`、局域网/Tailscale IP 或内部主机（例如 `matrix-synapse`）时，请启用此选项。
- `proxy`：Matrix 流量的可选 HTTP(S) 代理 URL。命名账户可以使用自己的 `proxy` 覆盖顶级默认设置。
- `userId`：完整的 Matrix 用户 ID，例如 `@bot:example.org`。
- `accessToken`：基于令牌的身份验证的访问令牌。env/file/exec 提供程序中的 `channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken` 支持明文值和 SecretRef 值。请参阅[密钥管理](/en/gateway/secrets)。
- `password`: 基于密码登录的密码。支持明文值和 SecretRef 值。
- `deviceId`: 显式的 Matrix 设备 ID。
- `deviceName`: 密码登录的设备显示名称。
- `avatarUrl`: 用于配置文件同步和 `profile set` 更新的存储的个人头像 URL。
- `initialSyncLimit`: 启动同步期间获取的最大事件数。
- `encryption`: 启用 E2EE。
- `allowlistOnly`: 当 `true` 时，将 `open` 房间策略升级为 `allowlist`，并强制所有活动 Matrix 策略（Matrix 私信）除 `disabled` 外（包括 `pairing` 和 `open`）变为 `allowlist`。不影响 `disabled` 策略。
- `allowBots`: 允许来自其他已配置 OpenClaw Matrix 账户（`true` 或 `"mentions"`）的消息。
- `groupPolicy`: `open`、`allowlist` 或 `disabled`。
- `contextVisibility`: 补充房间上下文可见性模式（`all`、`allowlist`、`allowlist_quote`）。
- `groupAllowFrom`: 房间流量的用户 ID 白名单。条目应为完整的 Matrix 用户 ID；运行时将忽略未解析的名称。
- `historyLimit`: 作为组历史上下文包含的最大房间消息数。回退到 `messages.groupChat.historyLimit`；如果两者均未设置，有效默认值为 `0`。设置为 `0` 以禁用。
- `replyToMode`: `off`、`first`、`all` 或 `batched`。
- `markdown`: 用于出站 Matrix 文本的可选 Markdown 渲染配置。
- `streaming`：`off`（默认）、`"partial"`、`"quiet"`、`true` 或 `false`。`"partial"` 和 `true` 通过正常的 Matrix 文本消息启用预览优先的草稿更新。`"quiet"` 为自托管推送规则设置使用无通知的预览通知。`false` 等同于 `"off"`。
- `blockStreaming`：`true` 在草稿预览流式传输处于活动状态时，为已完成的助手块启用单独的进度消息。
- `threadReplies`：`off`、`inbound` 或 `always`。
- `threadBindings`：针对线程绑定会话路由和生命周期的按渠道覆盖设置。
- `startupVerification`：启动时的自动自我验证请求模式（`if-unverified`、`off`）。
- `startupVerificationCooldownHours`：重试自动启动验证请求之前的冷却时间。
- `textChunkLimit`：出站消息分块大小，以字符为单位（当 `chunkMode` 为 `length` 时适用）。
- `chunkMode`：`length` 按字符数分割消息；`newline` 在行边界处分割。
- `responsePrefix`：附加到此渠道所有出站回复的可选字符串。
- `ackReaction`：针对此渠道/账户的可选 ack 反应覆盖设置。
- `ackReactionScope`：可选的 ack 反应范围覆盖设置（`group-mentions`、`group-all`、`direct`、`all`、`none`、`off`）。
- `reactionNotifications`：入站反应通知模式（`own`、`off`）。
- `mediaMaxMb`：出站发送和入站媒体处理的媒体大小上限（以 MB 为单位）。
- `autoJoin`：邀请自动加入策略 (`always`, `allowlist`, `off`)。默认：`off`。适用于所有 Matrix 邀请，包括私信风格的邀请。
- `autoJoinAllowlist`：当 `autoJoin` 为 `allowlist` 时允许的房间/别名。在处理邀请期间，别名条目会被解析为房间 ID；OpenClaw 不信任被邀请房间所声称的别名状态。
- `dm`：私信策略块 (`enabled`, `policy`, `allowFrom`, `sessionScope`, `threadReplies`)。
- `dm.policy`：控制 OpenClaw 加入房间并将其归类为私信后的私信访问权限。它不改变邀请是否自动加入。
- `dm.allowFrom`：除非您已经通过实时目录查找解析了条目，否则条目应为完整的 Matrix 用户 ID。
- `dm.sessionScope`：`per-user`（默认）或 `per-room`。当您希望每个 Matrix 私信房间即使对方相同也保持独立的上下文时，请使用 `per-room`。
- `dm.threadReplies`：仅限私信的线程策略覆盖 (`off`, `inbound`, `always`)。它会覆盖顶层的 `threadReplies` 设置，该设置用于私信中的回复放置和会话隔离。
- `execApprovals`：Matrix 原生的执行审批传递 (`enabled`, `approvers`, `target`, `agentFilter`, `sessionFilter`)。
- `execApprovals.approvers`：允许批准执行请求的 Matrix 用户 ID。当 `dm.allowFrom` 已经标识了审批者时，此项为可选。
- `execApprovals.target`：`dm | channel | both`（默认：`dm`）。
- `accounts`：命名按帐户覆盖项。顶级 `channels.matrix` 值充当这些条目的默认值。
- `groups`：每个房间的策略映射。首选房间 ID 或别名；未解析的房间名称在运行时会被忽略。会话/群组身份在解析后使用稳定的房间 ID。
- `groups.<room>.account`：在多帐户设置中，将一个继承的房间条目限制为特定的 Matrix 帐户。
- `groups.<room>.allowBots`：针对已配置机器人发送者（`true` 或 `"mentions"`）的房间级覆盖项。
- `groups.<room>.users`：每个房间的发送者允许列表。
- `groups.<room>.tools`：每个房间的工具允许/拒绝覆盖项。
- `groups.<room>.autoReply`：房间级提及门控覆盖项。`true` 禁用该房间的提及要求；`false` 强制重新启用。
- `groups.<room>.skills`：可选的房间级技能过滤器。
- `groups.<room>.systemPrompt`：可选的房间级系统提示词片段。
- `rooms`：`groups` 的旧式别名。
- `actions`：按操作的工具门控（`messages`、`reactions`、`pins`、`profile`、`memberInfo`、`channelInfo`、`verification`）。

## 相关内容

- [Channels Overview](/en/channels) — 所有支持的频道
- [Pairing](/en/channels/pairing) — 私信认证和配对流程
- [Groups](/en/channels/groups) — 群聊行为和提及门控
- [Channel Routing](/en/channels/channel-routing) — 消息的会话路由
- [Security](/en/gateway/security) — 访问模型和加固
