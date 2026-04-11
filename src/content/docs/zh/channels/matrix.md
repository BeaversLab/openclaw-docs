---
summary: "Matrix 支持状态、设置和配置示例"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix 是 OpenClaw 的内置 Matrix 渠道插件。
它使用官方的 `matrix-js-sdk` 并支持私信、房间、话题、媒体、表情回应、投票、位置和 E2EE。

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

关于插件行为和安装规则，请参阅 [Plugins](/en/tools/plugin)。

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

Matrix 向导实际询问的内容：

- 主服务器 URL
- 认证方式：Access Token 或密码
- 仅在选择密码认证时需要用户 ID
- 可选设备名称
- 是否启用 E2EE
- 是否现在配置 Matrix 房间访问权限
- 是否现在配置 Matrix 邀请自动加入
- 当启用邀请自动加入时，应设置为 `allowlist`、`always` 还是 `off`

重要的向导行为：

- 如果所选账户的 Matrix 认证环境变量已存在，且该账户尚未在配置中保存认证信息，向导将提供环境变量快捷方式，以便设置将认证保留在环境变量中，而不是将密钥复制到配置中。
- 当您以交互方式添加另一个 Matrix 账户时，输入的账户名称将被规范化为配置和环境变量中使用的账户 ID。例如，`Ops Bot` 将变为 `ops-bot`。
- 私信允许列表提示立即接受完整的 `@user:server` 值。仅当实时目录查找找到一个精确匹配时，显示名称才有效；否则向导会要求您使用完整的 Matrix ID 重试。
- 房间允许列表提示直接接受房间 ID 和别名。它们也可以实时解析已加入房间的名称，但未解析的名称仅在设置期间按输入保留，稍后会被运行时允许列表解析忽略。建议使用 `!room:server` 或 `#alias:server`。
- 向导现在会在邀请自动加入步骤之前显示明确的警告，因为 `channels.matrix.autoJoin` 默认为 `off`；除非您进行设置，否则代理不会加入受邀请的房间或新的私信风格邀请。
- 在邀请自动加入白名单模式下，请仅使用稳定的邀请目标：`!roomId:server`、`#alias:server` 或 `*`。纯房间名称将被拒绝。
- 运行时的房间/会话身份使用稳定的 Matrix 房间 ID。房间声明的别名仅用作查找输入，而不作为长期会话密钥或稳定的组身份。
- 要在保存之前解析房间名称，请使用 `openclaw channels resolve --channel matrix "Project Room"`。

<Warning>
`channels.matrix.autoJoin` 默认为 `off`。

如果您不设置它，机器人将不会加入受邀请的房间或新的私信风格邀请，因此除非您先手动加入，否则它不会出现在新组或受邀请的私信中。

设置 `autoJoin: "allowlist"` 结合 `autoJoinAllowlist` 以限制其接受的邀请，或者如果您希望它加入每个邀请，请设置 `autoJoin: "always"`。

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
默认帐户使用 `credentials.json`；命名帐户使用 `credentials-<account>.json`。
当那里存在缓存的凭据时，即使当前身份验证未直接在配置中设置，OpenClaw 也会将 Matrix 视为已配置以进行设置、诊断和渠道状态发现。

等效的环境变量（在未设置配置键时使用）：

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

对于非默认帐户，请使用帐户作用域的环境变量：

- `MATRIX_<ACCOUNT_ID>_HOMESERVER`
- `MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN`
- `MATRIX_<ACCOUNT_ID>_USER_ID`
- `MATRIX_<ACCOUNT_ID>_PASSWORD`
- `MATRIX_<ACCOUNT_ID>_DEVICE_ID`
- `MATRIX_<ACCOUNT_ID>_DEVICE_NAME`

账号 `ops` 的示例：

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

对于规范化的账号 ID `ops-bot`，请使用：

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix 会对账号 ID 中的标点符号进行转义，以避免作用域环境变量发生冲突。
例如，`-` 会变为 `_X2D_`，因此 `ops-prod` 会映射到 `MATRIX_OPS_X2D_PROD_*`。

仅当这些身份验证环境变量已存在，且所选账户的配置中尚未保存 Matrix 身份验证信息时，交互式向导才会提供环境变量快捷方式。

## 配置示例

这是一个包含私信配对、房间允许列表以及启用端到端加密 (E2EE) 的实用基础配置：

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

`autoJoin` 适用于 Matrix 邀请，不仅限于房间/群组邀请。
这包括新的私信风格邀请。在邀请时，OpenClaw 无法可靠地知道被邀请的房间最终会被视为私信还是群组，因此所有邀请都会先经过相同的 `autoJoin` 决策流程。当机器人已加入且房间被归类为私信后，`dm.policy` 仍然适用，因此 `autoJoin` 控制加入行为，而 `dm.policy` 控制回复/访问行为。

## 流式预览

Matrix 回复流式传输是可选的。

当您希望 OpenClaw 发送单条实时预览回复，在模型生成文本时就地编辑该预览，并在回复完成后将其定稿时，请将 `channels.matrix.streaming` 设置为 `"partial"`：

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
- `streaming: "partial"` 会使用普通的 Matrix 文本消息为当前助手块创建一条可编辑的预览消息。这保留了 Matrix 传统的预览优先通知行为，因此标准客户端可能会在第一条流式预览文本而不是完成的块上发送通知。
- `streaming: "quiet"` 为当前的助手块创建一个可编辑的静态预览通知。仅当您同时也为最终预览编辑配置了接收方的推送规则时才使用此项。
- `blockStreaming: true` 启用单独的 Matrix 进度消息。启用预览流式传输后，Matrix 会保留当前块的实时草稿，并将已完成的块保留为单独的消息。
- 当预览流式传输开启且 `blockStreaming` 关闭时，Matrix 会原地编辑实时草稿，并在块或回合完成时确定该事件。
- 如果预览不再适合放入一个 Matrix 事件中，OpenClaw 将停止预览流式传输并回退到正常的最终交付。
- 媒体回复仍会正常发送附件。如果过时的预览不再能被安全地复用，OpenClaw 会在发送最终媒体回复之前将其撤回。
- 预览编辑会产生额外的 Matrix API 调用。如果您希望速率限制行为最为保守，请关闭流式传输。

`blockStreaming` 本身并不启用草稿预览。
请使用 `streaming: "partial"` 或 `streaming: "quiet"` 进行预览编辑；然后仅当您也希望已完成的助手块保持可见并作为单独的进度消息时，才添加 `blockStreaming: true`。

如果您需要不带自定义推送规则的 Matrix 标准通知，请使用 `streaming: "partial"` 以获得“预览优先”的行为，或者保持 `streaming` 关闭以仅进行最终交付。使用 `streaming: "off"`：

- `blockStreaming: true` 将每个完成的块作为一条正常的通知 Matrix 消息发送。
- `blockStreaming: false` 仅将最终完成的回复作为一条正常的通知 Matrix 消息发送。

### 用于静态最终预览的自托管推送规则

如果您运行自己的 Matrix 基础设施，并希望静态预览仅在块或最终回复完成时通知，请设置 `streaming: "quiet"` 并为最终预览编辑添加针对特定用户的推送规则。

这通常是接收方的用户设置，而不是主服务器全局配置更改：

开始前的快速说明：

- recipient user = 应接收通知的人员
- bot user = 发送回复的 OpenClaw Matrix 账户
- 对以下 API 调用使用接收方的访问令牌
- 在推送规则中将 `sender` 与机器人用户的完整 MXID 进行匹配

1. 配置 OpenClaw 使用静默预览：

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. 确保接收者账户已经接收正常的 Matrix 推送通知。静默预览
   规则仅在该用户已经有可用的推送器/设备时才有效。

3. 获取接收者用户的访问令牌。
   - 使用接收者用户的令牌，而不是机器人的令牌。
   - 重用现有的客户端会话令牌通常是最简单的方法。
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

4. 验证接收者账户已经有推送器：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果这没有返回任何活动的推送器/设备，请先修复正常的 Matrix 通知，然后再添加下面的
OpenClaw 规则。

OpenClaw 使用以下内容标记已完成的纯文本预览编辑：

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. 为每个应该接收这些通知的接收者账户创建一个覆盖推送规则：

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

- `https://matrix.example.org`：您的主服务器基础 URL
- `$USER_ACCESS_TOKEN`：接收者用户的访问令牌
- `openclaw-finalized-preview-botname`：针对此机器人和此接收者用户的唯一规则 ID
- `@bot:example.org`：您的 OpenClaw Matrix 机器人 MXID，而不是接收者用户的 MXID

对于多机器人设置很重要：

- 推送规则由 `ruleId` 键控。针对相同的规则 ID 重新运行 `PUT` 将更新该规则。
- 如果一个接收者用户应该接收来自多个 OpenClaw Matrix 机器人账户的通知，请为每个机器人创建一个规则，并为每个发送者匹配使用唯一的规则 ID。
- 一个简单的模式是 `openclaw-finalized-preview-<botname>`，例如 `openclaw-finalized-preview-ops` 或 `openclaw-finalized-preview-support`。

该规则根据事件发送者进行评估：

- 使用接收者用户的令牌进行身份验证
- 将 `sender` 与 OpenClaw 机器人 MXID 进行匹配

6. 验证规则是否存在：

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. 测试流式回复。在静默模式下，房间应显示静默草稿预览，并且最终
   的就地编辑应在块或回合完成时通知一次。

如果您以后需要删除该规则，请使用接收者用户的令牌删除相同的规则 ID：

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

注意：

- 使用接收者用户的访问令牌创建规则，而不是机器人的令牌。
- 新的用户定义 `override` 规则会插入到默认抑制规则之前，因此不需要额外的排序参数。
- 这仅影响 OpenClaw 可以安全就地定稿的纯文本预览编辑。媒体回退和过时预览回退仍使用正常的 Matrix 投递。
- 如果 `GET /_matrix/client/v3/pushers` 显示没有推送器，则该用户/账户的 Matrix 推送投递尚未正常工作。

#### Synapse

对于 Synapse，上述设置通常就足够了：

- 对于已定稿的 OpenClaw 预览通知，不需要特殊的 `homeserver.yaml` 更改。
- 如果您的 Synapse 部署已经发送正常的 Matrix 推送通知，那么上述用户令牌 + `pushrules` 调用是主要的设置步骤。
- 如果您在反向代理或工作器后运行 Synapse，请确保 `/_matrix/client/.../pushrules/` 正确到达 Synapse。
- 如果您运行 Synapse 工作器，请确保推送器是健康的。推送投递由主进程或 `synapse.app.pusher` / 配置的推送器工作器处理。

#### Tuwunel

对于 Tuwunel，使用上面显示的相同设置流程和推送规则 API 调用：

- 已定稿的预览标记本身不需要 Tuwunel 特定的配置。
- 如果正常的 Matrix 通知对该用户已经有效，那么上述用户令牌 + `pushrules` 调用是主要的设置步骤。
- 如果当用户在另一台设备上活动时通知似乎消失了，请检查是否启用了 `suppress_push_when_active`。Tuwunel 在 2025 年 9 月 12 日的 Tuwunel 1.4.2 中添加了此选项，并且当一台设备处于活动状态时，它可以有意抑制向其他设备的推送。

## 加密与验证

在加密 (E2EE) 房间中，出站图片事件使用 `thumbnail_file`，因此图片预览与完整附件一起加密。未加密的房间仍然使用纯 `thumbnail_url`。不需要配置 —— 插件会自动检测 E2EE 状态。

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

- `allowBots: true` 接受来自其他已配置 Matrix 机器人账户在允许的房间和私信中的消息。
- `allowBots: "mentions"` 仅当这些消息在房间中明确提及此机器人时才接受。私信仍然被允许。
- `groups.<room>.allowBots` 覆盖单个房间的账户级设置。
- OpenClaw 仍然忽略来自同一 Matrix 用户 ID 的消息，以避免自回复循环。
- Matrix 在此处不公开原生机器人标志；OpenClaw 将“机器人编写”视为“由此 Matrix 网关上另一个已配置的 OpenClaw 账户发送”。

在共享房间中启用机器人到机器人流量时，请使用严格的房间允许列表和提及要求。

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

多账户支持：将 `channels.matrix.accounts` 与每个账户的凭据以及可选的 `name` 一起使用。有关共享模式，请参阅 [配置参考](/en/gateway/configuration-reference#multi-account-all-channels)。

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

详细设备验证详情：

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

删除当前服务器备份并创建一个新的备份基线。如果存储的
备份密钥无法干净加载，此重置还可以重新创建秘密存储，以便
未来的冷启动可以加载新的备份密钥：

```bash
openclaw matrix verify backup reset --yes
```

所有 `verify` 命令默认都是简洁的（包括安静的内部 SDK 日志），仅在使用 `--verbose` 时显示详细诊断。
在编写脚本时，请使用 `--json` 获取完整的机器可读输出。

在多账户设置中，Matrix CLI 命令使用隐式的 Matrix 默认账户，除非你传递 `--account <id>`。
如果你配置了多个命名账户，请先设置 `channels.matrix.defaultAccount`，否则那些隐式的 CLI 操作将会停止并要求你明确选择一个账户。
当你希望验证或设备操作明确针对某个命名账户时，请使用 `--account`：

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

当某个命名账户的加密被禁用或不可用时，Matrix 警告和验证错误会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

### “已验证”的含义

OpenClaw 仅当此 Matrix 设备经过你自己的交叉签名身份验证时，才会将其视为已验证。
实际上，`openclaw matrix verify status --verbose` 暴露了三种信任信号：

- `Locally trusted`：此设备仅受当前客户端信任
- `Cross-signing verified`：SDK 报告该设备通过交叉签名已验证
- `Signed by owner`：该设备由你自己的自签名密钥签名

`Verified by owner` 仅在存在交叉签名验证或所有者签名时才会变为 `yes`。
仅靠本地信任对于 OpenClaw 来说不足以将设备视为完全已验证。

### bootstrap 的作用

`openclaw matrix verify bootstrap` 是用于加密 Matrix 账户的修复和设置命令。
它按顺序执行以下所有操作：

- 引导秘密存储，尽可能重用现有的恢复密钥
- 引导交叉签名并上传缺失的公共交叉签名密钥
- 尝试标记并交叉签名当前设备
- 如果不存在，则创建新的服务器端房间密钥备份

如果主服务器需要交互式身份验证才能上传交叉签名密钥，OpenClaw 会先尝试不带身份验证的上传，然后使用 `m.login.dummy`，当配置了 `channels.matrix.password` 时，再使用 `m.login.password`。

仅当你有意丢弃当前的交叉签名身份并创建新身份时，才使用 `--force-reset-cross-signing`。

如果您有意丢弃当前的房间密钥备份并为将来的消息建立新的备份基线，请使用 `openclaw matrix verify backup reset --yes`。
仅当您接受无法恢复的旧加密历史将保持不可用，并且如果当前备份密钥无法安全加载，OpenClaw 可能会重新创建机密存储时，才执行此操作。

### 全新备份基线

如果您希望保持未来的加密消息正常工作并接受丢失无法恢复的旧历史记录，请按顺序运行以下命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

当您想要显式定位命名 Matrix 账户时，将 `--account <id>` 添加到每个命令中。

### 启动行为

当 `encryption: true` 时，Matrix 默认将 `startupVerification` 设置为 `"if-unverified"`。
启动时，如果此设备仍未验证，Matrix 将在另一个 Matrix 客户端中请求自我验证，
当已有请求待处理时跳过重复请求，并在重启后重试之前应用本地冷却。
默认情况下，失败的请求尝试比成功的请求创建重试得更快。
设置 `startupVerification: "off"` 以禁用自动启动请求，或调整 `startupVerificationCooldownHours`
如果您希望更短或更长的重试窗口。

启动时还会自动执行保守的加密引导传递。
该传递首先尝试重用当前的机密存储和交叉签名身份，并避免重置交叉签名，除非您运行显式的引导修复流程。

如果启动发现损坏的引导状态并且配置了 `channels.matrix.password`，OpenClaw 可以尝试更严格的修复路径。
如果当前设备已经由所有者签名，OpenClaw 将保留该身份而不是自动重置它。

从以前的公共 Matrix 插件升级：

- OpenClaw 会在可能的情况下自动重用相同的 Matrix 账户、访问令牌和设备身份。
- 在任何可操作的 Matrix 迁移更改运行之前，OpenClaw 会在 `~/Backups/openclaw-migrations/` 下创建或重用恢复快照。
- 如果您使用多个 Matrix 账户，请在从旧的扁平存储布局升级之前设置 `channels.matrix.defaultAccount`，以便 OpenClaw 知道哪个账户应该接收该共享的旧状态。
- 如果先前的插件在本地存储了 Matrix 房间密钥备份解密密钥，启动或 `openclaw doctor --fix` 会自动将其导入到新的恢复密钥流程中。
- 如果在准备迁移后 Matrix 访问令牌发生了更改，启动现在会在放弃自动备份恢复之前，扫描同级令牌哈希存储根目录中待处理的旧版恢复状态。
- 如果稍后对于同一账户、主服务器和用户，Matrix 访问令牌发生了更改，OpenClaw 现在倾向于重用最完整的现有令牌哈希存储根目录，而不是从空的 Matrix 状态目录开始。
- 在下一次网关启动时，备份的房间密钥将自动恢复到新的加密存储中。
- 如果旧插件拥有从未备份过的仅限本地的房间密钥，OpenClaw 将发出明确警告。这些密钥无法从先前的 Rust 加密存储中自动导出，因此某些旧的加密历史记录可能在手动恢复之前一直不可用。
- 有关完整的升级流程、限制、恢复命令和常见迁移消息，请参阅 [Matrix 迁移](/en/install/migrating-matrix)。

加密的运行时状态是按账户、按用户令牌哈希根目录组织在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 中的。
该目录包含同步存储 (`bot-storage.json`)、加密存储 (`crypto/`)、
恢复密钥文件 (`recovery-key.json`)、IndexedDB 快照 (`crypto-idb-snapshot.json`)、
线程绑定 (`thread-bindings.json`) 和启动验证状态 (`startup-verification.json`)
（当使用这些功能时）。
当令牌更改但账户身份保持不变时，OpenClaw 会重用该账户/主服务器/用户元组最佳的现有
根目录，以便先前的同步状态、加密状态、线程绑定
和启动验证状态保持可见。

### Node 加密存储模型

此插件中的 Matrix E2EE 使用官方 `matrix-js-sdk` Node 中的 Rust 加密路径。
当您希望加密状态在重启后保留时，该路径需要基于 IndexedDB 的持久化。

OpenClaw 目前通过以下方式在 Node 中提供此功能：

- 使用 `fake-indexeddb` 作为 SDK 预期的 IndexedDB API 适配层
- 在 `initRustCrypto` 之前从 `crypto-idb-snapshot.json` 恢复 Rust 加密 IndexedDB 内容
- 在初始化之后和运行期间，将更新的 IndexedDB 内容持久化回 `crypto-idb-snapshot.json`
- 使用建议性文件锁序列化针对 `crypto-idb-snapshot.json` 的快照恢复和持久化，以便网关运行时持久化和 CLI 维护不会在同一个快照文件上产生竞争

这是兼容性/存储底层工作，而非自定义加密实现。
快照文件是敏感的运行时状态，并以限制性文件权限存储。
在 OpenClaw 的安全模型下，网关主机和本地 OpenClaw 状态目录已处于受信任的操作员边界内，因此这主要是一个操作持久性问题，而非单独的远程信任边界。

计划改进：

- 为持久化 Matrix 密钥材料添加 SecretRef 支持，以便可以从 OpenClaw 密钥提供程序获取恢复密钥和相关的存储加密密钥，而不仅限于本地文件

## 个人资料管理

使用以下内容更新所选帐户的 Matrix 个人资料：

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

当您想要明确定位指定的 Matrix 帐户时，请添加 `--account <id>`。

Matrix 直接接受 `mxc://` 头像 URL。当您传递 `http://` 或 `https://` 头像 URL 时，OpenClaw 会首先将其上传到 Matrix，然后将解析后的 `mxc://` URL 存储回 `channels.matrix.avatarUrl`（或所选的帐户覆盖项）。

## 自动验证通知

Matrix 现在将验证生命周期通知直接发布到严格的私信验证房间作为 `m.notice` 消息。
这包括：

- 验证请求通知
- 验证就绪通知（包含明确的“通过表情符号验证”指导）
- 验证开始和完成通知
- SAS 详细信息（表情符号和十进制）（如有）

来自另一个 Matrix 客户端的传入验证请求由 OpenClaw 跟踪并自动接受。
对于自验证流程，当表情符号验证可用时，OpenClaw 也会自动启动 SAS 流程并确认其自身端。
对于来自另一个 Matrix 用户/设备的验证请求，OpenClaw 会自动接受请求，然后等待 SAS 流程正常进行。
您仍然需要在您的 Matrix 客户端中比较表情符号或十进制 SAS，并在那里确认“匹配”以完成验证。

OpenClaw 不会盲目自动接受自发起的重复流程。当自验证请求已经待处理时，启动过程会跳过创建新请求。

验证协议/系统通知不会转发到代理聊天流水线，因此它们不会产生 `NO_REPLY`。

### 设备卫生

旧的由 OpenClaw 管理的 Matrix 设备可能会在账户上累积，使得加密房间信任更难推断。
使用以下命令列出它们：

```bash
openclaw matrix devices list
```

使用以下命令移除陈旧的由 OpenClaw 管理的设备：

```bash
openclaw matrix devices prune-stale
```

### 直接房间修复

如果私信状态不同步，OpenClaw 最终可能会保留过时的 `m.direct` 映射，这些映射指向旧的独立房间而不是当前的私信。使用以下命令检查对等方的当前映射：

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

使用以下命令修复它：

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

修复将 Matrix 特定逻辑保留在插件内部：

- 它首选已经在 `m.direct` 中映射的严格 1:1 私信
- 否则它会回退到与该用户当前加入的任何严格 1:1 私信
- 如果不存在健康的私信，它会创建一个新的直接房间并重写 `m.direct` 以指向它

修复流程不会自动删除旧房间。它只选择健康的私信并更新映射，以便新的 Matrix 发送、验证通知和其他直接消息流再次以正确的房间为目标。

## 话题

Matrix 支持用于自动回复和消息工具发送的原生 Matrix 话题。

- `dm.sessionScope: "per-user"`（默认）保持 Matrix 私信路由为发送者作用域，因此多个私信房间在解析为同一对等方时可以共享一个会话。
- `dm.sessionScope: "per-room"` 将每个 Matrix 私信房间隔离到其自己的会话密钥中，同时仍然使用正常的私信身份验证和允许列表检查。
- 显式的 Matrix 会话绑定仍然优先于 `dm.sessionScope`，因此已绑定的房间和话题将保持其选择的目标会话。
- `threadReplies: "off"` 保持回复在顶层，并将入站话题消息保留在父会话中。
- `threadReplies: "inbound"` 仅当入站消息已在该话题中时，才在话题内回复。
- `threadReplies: "always"` 将房间回复保留在以触发消息为根的话题中，并通过来自第一条触发消息的匹配话题作用域会话路由该对话。
- `dm.threadReplies` 仅覆盖私信的顶层设置。例如，您可以让房间话题保持隔离，同时让私信保持扁平。
- 入站话题消息将话题根消息作为额外的代理上下文包含在内。
- 当目标是同一房间或同一私信用户目标时，消息工具发送现在会自动继承当前的 Matrix 话题，除非提供了显式的 `threadId`。
- 仅当当前会话元数据证明同一 Matrix 账户上的私信对象相同时，同会话私信用户目标复用才会生效；否则 OpenClaw 将回退到正常的用户作用域路由。
- 当 OpenClaw 发现有 Matrix 私信房间在同一共享 Matrix 私信会话上与另一个私信房间冲突时，如果启用了话题绑定且有 `dm.sessionScope` 提示，它会在该房间中发布一次性的 `m.notice`，其中包含 `/focus` 应急方案。
- Matrix 支持运行时话题绑定。`/focus`、`/unfocus`、`/agents`、`/session idle`、`/session max-age` 和话题绑定的 `/acp spawn` 现在可用于 Matrix 房间和私信。
- 顶层 Matrix 房间/私信 `/focus` 在 `threadBindings.spawnSubagentSessions=true` 时会创建一个新的 Matrix 话题并将其绑定到目标会话。
- 在现有的 Matrix 话题中运行 `/focus` 或 `/acp spawn --thread here` 将改为绑定该当前话题。

## ACP 对话绑定

Matrix 房间、私信和现有的 Matrix 话题可以在不改变聊天界面的情况下转换为持久的 ACP 工作区。

快速操作流程：

- 在您希望继续使用的 Matrix 私信、房间或现有话题内运行 `/acp spawn codex --bind here`。
- 在顶层 Matrix 私信或房间中，当前的私信/房间保持为聊天界面，未来的消息将路由到生成的 ACP 会话。
- 在现有的 Matrix 话题内，`--bind here` 会就地绑定当前话题。
- `/new` 和 `/reset` 会就地重置同一个绑定的 ACP 会话。
- `/acp close` 会关闭 ACP 会话并移除绑定。

备注：

- `--bind here` 不会创建子 Matrix 话题。
- `threadBindings.spawnAcpSessions` 仅对于 `/acp spawn --thread auto|here` 是必需的，此时 OpenClaw 需要创建或绑定子 Matrix 话题。

### 话题绑定配置

Matrix 继承 `session.threadBindings` 的全局默认值，并支持按渠道覆盖：

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Matrix 话题绑定生成标志是可选项：

- 设置 `threadBindings.spawnSubagentSessions: true` 以允许顶层 `/focus` 创建并绑定新的 Matrix 话题。
- 设置 `threadBindings.spawnAcpSessions: true` 以允许 `/acp spawn --thread auto|here` 将 ACP 会话绑定到 Matrix 话题。

## 表情回应

Matrix 支持出站表情回应操作、入站表情回应通知和入站确认表情回应。

- 出站表情回应工具受 `channels["matrix"].actions.reactions` 限制。
- `react` 会向特定的 Matrix 事件添加表情回应。
- `reactions` 会列出特定 Matrix 事件的当前表情回应摘要。
- `emoji=""` 会移除机器人账户在该事件上的自身表情回应。
- `remove: true` 仅移除机器人账户指定的 emoji 表情回应。

确认表情回应使用标准的 OpenClaw 解析顺序：

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- 代理身份 emoji 回退

确认表情回应范围按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

表情符号通知模式按以下顺序解析：

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- 默认值：`own`

当前行为：

- `reactionNotifications: "own"` 当针对机器人发送的 Matrix 消息时，转发已添加的 `m.reaction` 事件。
- `reactionNotifications: "off"` 禁用反应系统事件。
- 移除反应仍未合成为系统事件，因为 Matrix 将这些事件作为撤回处理，而不是作为独立的 `m.reaction` 移除。

## 历史上下文

- `channels.matrix.historyLimit` 控制当 Matrix 房间消息触发代理时，包含多少条最近的房间消息作为 `InboundHistory`。
- 它回退到 `messages.groupChat.historyLimit`。如果两者均未设置，有效默认值为 `0`，因此不会缓冲提及门控的房间消息。设置 `0` 以禁用。
- Matrix 房间历史记录仅限房间。私信继续使用正常会话历史记录。
- Matrix 房间历史记录仅为待处理：OpenClaw 缓冲尚未触发回复的房间消息，然后当提及或其他触发器到达时对窗口进行快照。
- 当前触发消息不包含在 `InboundHistory` 中；它保留在该回合的主要入站正文中。
- 对同一个 Matrix 事件的重试会重用原始历史快照，而不是向前漂移到更新的房间消息。

## 上下文可见性

Matrix 支持共享 `contextVisibility` 控制，用于补充房间上下文，例如获取的回复文本、线程根和待处理历史。

- `contextVisibility: "all"` 是默认值。补充上下文按接收保留。
- `contextVisibility: "allowlist"` 过滤补充上下文，仅包含活动房间/用户允许列表检查允许的发件人。
- `contextVisibility: "allowlist_quote"` 的行为类似于 `allowlist`，但仍保留一条显式引用的回复。

此设置影响补充上下文的可见性，而不影响传入消息本身是否可以触发回复。
触发授权仍来自 `groupPolicy`、`groups`、`groupAllowFrom` 和私信策略设置。

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

请参阅 [组](/en/channels/groups) 了解提及限制和允许列表行为。

Matrix 私信的配对示例：

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

如果未批准的 Matrix 用户在批准前一直向您发送消息，OpenClaw 将重用同一个待处理的配对代码，并且可能会在短暂冷却后再次发送提醒回复，而不是生成新代码。

请参阅 [配对](/en/channels/pairing) 了解共享私信配对流程和存储布局。

## Exec 批准

Matrix 可以充当 Matrix 账户的原生批准客户端。原生
私信/渠道路由控制旋钮仍位于 exec 批准配置下：

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers` （可选；回退到 `channels.matrix.dm.allowFrom`）
- `channels.matrix.execApprovals.target` （`dm` | `channel` | `both`，默认值：`dm`）
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

批准者必须是 Matrix 用户 ID，例如 `@owner:example.org`。当 `enabled` 未设置或为 `"auto"` 并且至少可以解析一个批准者时，Matrix 会自动启用原生批准。Exec 批准首先使用 `execApprovals.approvers`，并且可以回退到 `channels.matrix.dm.allowFrom`。插件批准通过 `channels.matrix.dm.allowFrom` 进行授权。设置 `enabled: false` 以显式禁用 Matrix 作为原生批准客户端。否则，批准请求将回退到其他配置的批准路由或批准回退策略。

Matrix 原生路由现在支持两种批准类型：

- `channels.matrix.execApprovals.*` 控制 Matrix 批准提示的原生私信/渠道分发模式。
- Exec 批准使用从 `execApprovals.approvers` 或 `channels.matrix.dm.allowFrom` 设置的 exec 批准者。
- 插件批准使用来自 `channels.matrix.dm.allowFrom` 的 Matrix 私信允许列表。
- Matrix 反应快捷方式和消息更新适用于 exec 和插件审批。

投递规则：

- `target: "dm"` 将审批提示发送到审批人的私信
- `target: "channel"` 将提示发送回原始 Matrix 房间或私信
- `target: "both"` 发送到审批人私信以及原始 Matrix 房间或私信

Matrix 审批提示会在主要审批消息上预设反应快捷方式：

- `✅` = 允许一次
- `❌` = 拒绝
- `♾️` = 当有效的 exec 策略允许该决定时始终允许

审批人可以对该消息做出反应，或使用备用斜杠命令：`/approve <id> allow-once`、`/approve <id> allow-always` 或 `/approve <id> deny`。

只有已解析的审批人才能批准或拒绝。对于 exec 审批，渠道投递包含命令文本，因此请仅在受信任的房间中启用 `channel` 或 `both`。

Matrix 审批提示会重用共享的核心审批规划器。Matrix 特定的原生界面处理房间/私信路由、反应以及消息发送/更新/删除行为，这适用于 exec 和插件审批。

按帐户覆盖：

- `channels.matrix.accounts.<account>.execApprovals`

相关文档：[Exec 审批](/en/tools/exec-approvals)

## 多帐户示例

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

顶层的 `channels.matrix` 值作为命名帐户的默认值，除非某个帐户覆盖了它们。
您可以使用 `groups.<room>.account`（或旧版 `rooms.<room>.account`）将继承的房间条目限定到一个 Matrix 帐户。
没有 `account` 的条目在所有 Matrix 帐户之间保持共享，而带有 `account: "default"` 的条目在默认帐户直接配置在顶层 `channels.matrix.*` 上时仍然有效。
部分共享的身份验证默认值本身不会创建一个单独的隐式默认帐户。只有当该默认值具有新的身份验证信息（`homeserver` 加上 `accessToken`，或 `homeserver` 加上 `userId` 和 `password`）时，OpenClaw 才会合成顶层 `default` 帐户；当缓存的凭据稍后满足身份验证时，命名帐户仍然可以从 `homeserver` 加上 `userId` 中被发现。
如果 Matrix 已经正好有一个命名帐户，或者 `defaultAccount` 指向现有的命名帐户密钥，则从单帐户到多帐户的修复/设置升级会保留该帐户，而不是创建一个新的 `accounts.default` 条目。只有 Matrix 身份验证/引导密钥会移动到该升级的帐户中；共享的传递策略密钥保留在顶层。
当您希望 OpenClaw 为隐式路由、探测和 Matrix 操作优先选择一个命名 CLI 帐户时，请设置 `defaultAccount`。
如果您配置了多个命名帐户，请为依赖隐式帐户选择的 CLI 命令设置 `defaultAccount` 或传递 `--account <id>`。
当您想要为一个命令覆盖该隐式选择时，请将 `--account <id>` 传递给 `openclaw matrix verify ...` 和 `openclaw matrix devices ...`。

## 私有/LAN 家庭服务器

默认情况下，为了进行 SSRF 保护，OpenClaw 会阻止私有/内部 Matrix 家庭服务器，除非您针对每个帐户明确选择加入。

如果您的家庭服务器运行在 localhost、LAN/Tailscale IP 或内部主机名上，请为该 Matrix 帐户启用 `network.dangerouslyAllowPrivateNetwork`：

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

此可选选项仅允许受信任的私有/内部目标。公共明文主服务器（如
`http://matrix.example.org:8008`）仍然被阻止。请尽可能优先选择 `https://`。

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

命名账户可以使用 `channels.matrix.accounts.<id>.proxy` 覆盖顶级默认值。
OpenClaw 对运行时 Matrix 流量和账户状态探测使用相同的代理设置。

## 目标解析

当 Matrix 要求您提供房间或用户目标时，OpenClaw 接受以下目标格式：

- 用户：`@user:server`、`user:@user:server` 或 `matrix:user:@user:server`
- 房间：`!room:server`、`room:!room:server` 或 `matrix:room:!room:server`
- 别名：`#alias:server`、`channel:#alias:server` 或 `matrix:channel:#alias:server`

实时目录查找使用已登录的 Matrix 账户：

- 用户查找会查询该主服务器上的 Matrix 用户目录。
- 房间查找直接接受显式的房间 ID 和别名，然后回退到为该账户搜索已加入的房间名称。
- 已加入房间名称的查找是尽力而为的。如果房间名称无法解析为 ID 或别名，它将被运行时允许列表解析忽略。

## 配置参考

- `enabled`：启用或禁用渠道。
- `name`：账户的可选标签。
- `defaultAccount`：配置了多个 Matrix 账户时的首选账户 ID。
- `homeserver`：主服务器 URL，例如 `https://matrix.example.org`。
- `network.dangerouslyAllowPrivateNetwork`：允许此 Matrix 账户连接到私有/内部主服务器。当主服务器解析为 `localhost`、LAN/Tailscale IP 或内部主机（如 `matrix-synapse`）时，请启用此选项。
- `proxy`：Matrix 流量的可选 HTTP(S) 代理 URL。命名账户可以使用自己的 `proxy` 覆盖顶级默认值。
- `userId`：完整的 Matrix 用户 ID，例如 `@bot:example.org`。
- `accessToken`：基于令牌的身份验证的访问令牌。对于 env/file/exec 提供程序中的 `channels.matrix.accessToken` 和 `channels.matrix.accounts.<id>.accessToken`，支持纯文本值和 SecretRef 值。请参阅 [Secrets Management](/en/gateway/secrets)。
- `password`：基于密码的登录密码。支持纯文本值和 SecretRef 值。
- `deviceId`：显式的 Matrix 设备 ID。
- `deviceName`：密码登录的设备显示名称。
- `avatarUrl`：存储的自头像 URL，用于个人资料同步和 `set-profile` 更新。
- `initialSyncLimit`：启动同步事件限制。
- `encryption`：启用 E2EE。
- `allowlistOnly`：对私信和房间强制执行仅允许列表的行为。
- `allowBots`：允许来自其他已配置 OpenClaw Matrix 帐户（`true` 或 `"mentions"`）的消息。
- `groupPolicy`：`open`、`allowlist` 或 `disabled`。
- `contextVisibility`：补充的房间上下文可见性模式（`all`、`allowlist`、`allowlist_quote`）。
- `groupAllowFrom`：房间流量的用户 ID 允许列表。
- `groupAllowFrom` 条目应为完整的 Matrix 用户 ID。未解析的名称在运行时将被忽略。
- `historyLimit`：作为组历史上下文包含的最大房间消息数。回退到 `messages.groupChat.historyLimit`；如果两者都未设置，则有效默认值为 `0`。设置为 `0` 以禁用。
- `replyToMode`：`off`、`first`、`all` 或 `batched`。
- `markdown`：用于传出 Matrix 文本的可选 Markdown 渲染配置。
- `streaming`: `off` (默认), `partial`, `quiet`, `true`, 或 `false`。`partial` 和 `true` 启用预览优先的草稿更新，通过普通的 Matrix 文本消息发送。`quiet` 使用非通知的预览通知，用于自托管推送规则设置。
- `blockStreaming`: `true` 启用单独的进度消息，用于在草稿预览流式传输处于活动状态时完成的助手块。
- `threadReplies`: `off`, `inbound`, 或 `always`。
- `threadBindings`: 按渠道覆盖，用于绑定线程的会话路由和生命周期。
- `startupVerification`: 启动时的自动自我验证请求模式 (`if-unverified`, `off`)。
- `startupVerificationCooldownHours`: 重试自动启动验证请求之前的冷却时间。
- `textChunkLimit`: 出站消息块大小。
- `chunkMode`: `length` 或 `newline`。
- `responsePrefix`: 出站回复的可选消息前缀。
- `ackReaction`: 针对此渠道/账户的可选 ack 反应覆盖。
- `ackReactionScope`: 可选的 ack 反应范围覆盖 (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`)。
- `reactionNotifications`: 入站反应通知模式 (`own`, `off`)。
- `mediaMaxMb`: Matrix 媒体处理的媒体大小上限（MB）。它适用于出站发送和入站媒体处理。
- `autoJoin`：邀请自动加入策略（`always`、`allowlist`、`off`）。默认值：`off`。这通常适用于 Matrix 邀请，包括私信样式的邀请，而不仅仅是房间/群组邀请。OpenClaw 在邀请时做出此决定，此时它尚无法将加入的房间可靠地分类为私信或群组。
- `autoJoinAllowlist`：当 `autoJoin` 为 `allowlist` 时允许的房间/别名。在处理邀请期间，别名条目会被解析为房间 ID；OpenClaw 不信任被邀请房间声明的别名状态。
- `dm`：私信策略块（`enabled`、`policy`、`allowFrom`、`sessionScope`、`threadReplies`）。
- `dm.policy`：控制 OpenClaw 加入房间并将其分类为私信后的私信访问权限。它不更改邀请是否自动加入。
- `dm.allowFrom` 条目应为完整的 Matrix 用户 ID，除非您已经通过实时目录查找解析了它们。
- `dm.sessionScope`：`per-user`（默认）或 `per-room`。当您希望每个 Matrix 私信房间即使对方相同也保持单独的上下文时，请使用 `per-room`。
- `dm.threadReplies`：仅私信线程策略覆盖（`off`、`inbound`、`always`）。它覆盖顶层 `threadReplies` 设置，以用于私信中的回复放置和会话隔离。
- `execApprovals`：Matrix 原生执行审批传递（`enabled`、`approvers`、`target`、`agentFilter`、`sessionFilter`）。
- `execApprovals.approvers`：允许批准执行请求的 Matrix 用户 ID。当 `dm.allowFrom` 已识别审批者时为可选项。
- `execApprovals.target`: `dm | channel | both` (默认: `dm`).
- `accounts`: 命名的按帐户覆盖。顶级 `channels.matrix` 值充当这些条目的默认值。
- `groups`: 按房间策略映射。首选房间 ID 或别名；未解析的房间名称在运行时会被忽略。会话/组身份在解析后使用稳定的房间 ID，而人类可读的标签仍来自房间名称。
- `groups.<room>.account`: 在多帐户设置中，将一个继承的房间条目限制为特定的 Matrix 帐户。
- `groups.<room>.allowBots`: 已配置机器人发送者 (`true` 或 `"mentions"`) 的房间级别覆盖。
- `groups.<room>.users`: 按房间发送者允许列表。
- `groups.<room>.tools`: 按房间工具允许/拒绝覆盖。
- `groups.<room>.autoReply`: 房间级别提及限制覆盖。`true` 禁用该房间的提及要求；`false` 强制重新启用。
- `groups.<room>.skills`: 可选的房间级别技能过滤器。
- `groups.<room>.systemPrompt`: 可选的房间级别系统提示词片段。
- `rooms`: `groups` 的旧别名。
- `actions`: 按操作工具限制 (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`)。

## 相关

- [频道概述](/en/channels) — 所有支持的频道
- [配对](/en/channels/pairing) — 私信认证和配对流程
- [群组](/en/channels/groups) — 群聊行为和提及限制
- [频道路由](/en/channels/channel-routing) — 消息的会话路由
- [安全性](/en/gateway/security) — 访问模型和强化
