---
summary: "Matrix 支持状态、功能和配置"
read_when:
  - Working on Matrix channel features
title: "Matrix"
---

# Matrix (插件)

Matrix 是一个开放、去中心化的消息传递协议。OpenClaw 作为 Matrix **用户** 连接到
任何主服务器，因此你需要为机器人准备一个 Matrix 账户。一旦登录，你可以直接
私信机器人或将其邀请到房间（Matrix "群组"）。Beeper 也是一个有效的客户端选项，
但需要启用 E2EE。

状态：通过插件 支持。私信、房间、话题、媒体、表情回应、
投票（发送 + 投票开始作为文本）、位置和 E2EE（支持加密）。

## 所需插件

Matrix 以插件形式提供，不包含在核心安装中。

通过 CLI (npm 注册表) 安装：

```bash
openclaw plugins install @openclaw/matrix
```

本地检出 (当从 git 仓库运行时)：

```bash
openclaw plugins install ./extensions/matrix
```

如果你在配置/入职期间选择 Matrix 并检测到 git 检出，
OpenClaw 将自动提供本地安装路径。

详情：[插件](/en/tools/plugin)

## 设置

1. 安装 Matrix 插件：
   - 从 npm 安装： `openclaw plugins install @openclaw/matrix`
   - 从本地检出安装： `openclaw plugins install ./extensions/matrix`
2. 在主服务器上创建 Matrix 账户：
   - 在 [https://matrix.org/ecosystem/hosting/](https://matrix.org/ecosystem/hosting/) 浏览托管选项
   - 或者自行托管。
3. 获取机器人账户的访问令牌：
   - 在您的家庭服务器上使用带有 `curl` 的 Matrix 登录 API：

   ```bash
   curl --request POST \
     --url https://matrix.example.org/_matrix/client/v3/login \
     --header 'Content-Type: application/json' \
     --data '{
     "type": "m.login.password",
     "identifier": {
       "type": "m.id.user",
       "user": "your-user-name"
     },
     "password": "your-password"
   }'
   ```

   - 将 `matrix.example.org` 替换为您的家庭服务器 URL。
   - 或者设置 `channels.matrix.userId` + `channels.matrix.password`：OpenClaw 调用相同的
     登录端点，将访问令牌存储在 `~/.openclaw/credentials/matrix/credentials.json` 中，
     并在下次启动时重复使用它。

4. 配置凭据：
   - 环境变量： `MATRIX_HOMESERVER`， `MATRIX_ACCESS_TOKEN` （或 `MATRIX_USER_ID` + `MATRIX_PASSWORD`）
   - 或配置： `channels.matrix.*`
   - 如果两者都设置了，配置优先。
   - 使用访问令牌：用户 ID 通过 `/whoami` 自动获取。
   - 设置时， `channels.matrix.userId` 应为完整的 Matrix ID（例如： `@bot:example.org`）。
5. 重启网关 (或完成入职)。
6. 从任何 Matrix 客户端开始与机器人私信或将其邀请到房间
   （Element、Beeper 等；参见 [https://matrix.org/ecosystem/clients/](https://matrix.org/ecosystem/clients/)）。Beeper 需要 E2EE，
   因此请设置 `channels.matrix.encryption: true` 并验证设备。

最小配置（访问令牌，用户 ID 自动获取）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      dm: { policy: "pairing" },
    },
  },
}
```

E2EE 配置（已启用端到端加密）：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_***",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

## 加密 (E2EE)

通过 Rust 加密 SDK **支持**端到端加密。

使用 `channels.matrix.encryption: true` 启用：

- 如果加密模块加载，加密房间将自动解密。
- 发送到加密房间时，出站媒体将被加密。
- 首次连接时，OpenClaw 会向您的其他会话请求设备验证。
- 在另一个 Matrix 客户端（Element 等）中验证设备以启用密钥共享。
- 如果无法加载加密模块，E2EE 将被禁用，加密房间将无法解密；
  OpenClaw 会记录警告。
- 如果您看到加密模块缺失错误（例如， `@matrix-org/matrix-sdk-crypto-nodejs-*`），
  允许 `@matrix-org/matrix-sdk-crypto-nodejs` 的构建脚本并运行
  `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs` 或使用
  `node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js` 获取二进制文件。

加密状态按账户 + 访问令牌存储在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/crypto/` 中
（SQLite 数据库）。同步状态与其一起存储在 `bot-storage.json` 中。
如果访问令牌（设备）更改，将创建一个新的存储，并且必须
对加密房间重新验证机器人。

**设备验证：**
当启用 E2EE 时，机器人将在启动时从您的其他会话请求验证。
打开 Element（或其他客户端）并批准验证请求以建立信任。
验证后，机器人可以解密加密房间中的消息。

## 多帐户

多账号支持：使用 `channels.matrix.accounts` 配合每个账号的凭据和可选的 `name`。请参阅 [`gateway/configuration`](/en/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts) 了解共享模式。

每个账号在任何主服务器上都作为独立的 Matrix 用户运行。每个账号的配置继承自顶层 `channels.matrix` 设置，并且可以覆盖任何选项（私信策略、群组、加密等）。

```json5
{
  channels: {
    matrix: {
      enabled: true,
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          name: "Main assistant",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_***",
          encryption: true,
        },
        alerts: {
          name: "Alerts bot",
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_***",
          dm: { policy: "allowlist", allowFrom: ["@admin:example.org"] },
        },
      },
    },
  },
}
```

注意：

- 帐号启动已序列化，以避免并发模块导入时的竞态条件。
- 环境变量（`MATRIX_HOMESERVER`、`MATRIX_ACCESS_TOKEN` 等）仅适用于**默认**账号。
- 基础频道设置（DM 策略、群组策略、提及门控等）适用于所有帐号，除非针对每个帐号进行了覆盖。
- 使用 `bindings[].match.accountId` 将每个账号路由到不同的代理（agent）。
- 加密状态按帐号 + 访问令牌存储（每个帐号有单独的密钥存储）。

## 路由模型

- 回复始终返回到 Matrix。
- 私信共享代理的主会话；房间映射到群组会话。

## 访问控制 (DMs)

- 默认值：`channels.matrix.dm.policy = "pairing"`。未知发送者将收到配对码。
- 通过以下方式批准：
  - `openclaw pairing list matrix`
  - `openclaw pairing approve matrix <CODE>`
- 公开私信：`channels.matrix.dm.policy="open"` 加上 `channels.matrix.dm.allowFrom=["*"]`。
- `channels.matrix.dm.allowFrom` 接受完整的 Matrix 用户 ID（例如：`@user:server`）。当目录搜索找到单个精确匹配时，向导会将显示名称解析为用户 ID。
- 请勿使用显示名称或仅用本地部分（例如：`"Alice"` 或 `"alice"`）。它们具有歧义，并且在白名单匹配时会被忽略。请使用完整的 `@user:server` ID。

## 房间（群组）

- 默认值：`channels.matrix.groupPolicy = "allowlist"`（提及限制）。当未设置时，使用 `channels.defaults.groupPolicy` 覆盖默认值。
- 运行时说明：如果完全缺少 `channels.matrix`，运行时将在房间检查时回退到 `groupPolicy="allowlist"`（即使设置了 `channels.defaults.groupPolicy`）。
- 使用 `channels.matrix.groups` 将房间加入白名单（房间 ID 或别名；当目录搜索找到单个精确匹配时，名称将被解析为 ID）：

```json5
{
  channels: {
    matrix: {
      groupPolicy: "allowlist",
      groups: {
        "!roomId:example.org": { allow: true },
        "#alias:example.org": { allow: true },
      },
      groupAllowFrom: ["@owner:example.org"],
    },
  },
}
```

- `requireMention: false` 在该房间中启用自动回复。
- `groups."*"` 可以为跨房间的提及限制设置默认值。
- `groupAllowFrom` 限制哪些发送者可以在房间中触发机器人（完整的 Matrix 用户 ID）。
- 每个房间的 `users` 允许列表可以进一步限制特定房间内的发送者（使用完整的 Matrix 用户 ID）。
- 配置向导会提示输入房间允许列表（房间 ID、别名或名称），并且仅在精确且唯一匹配的情况下解析名称。
- 启动时，OpenClaw 会将允许列表中的房间/用户名称解析为 ID 并记录映射；未解析的条目在允许列表匹配时将被忽略。
- 默认情况下会自动加入邀请；使用 `channels.matrix.autoJoin` 和 `channels.matrix.autoJoinAllowlist` 进行控制。
- 为了**不允许任何房间**，请设置 `channels.matrix.groupPolicy: "disabled"`（或保持允许列表为空）。
- 旧版密钥：`channels.matrix.rooms`（与 `groups` 形状相同）。

## 话题

- 支持回复话题。
- `channels.matrix.threadReplies` 控制回复是否保留在主题中：
  - `off`、`inbound`（默认）、`always`
- `channels.matrix.replyToMode` 控制不在主题中回复时的回复元数据：
  - `off`（默认）、`first`、`all`

## 功能

| 功能         | 状态                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| 私信           | ✅ 已支持                                                                          |
| 房间           | ✅ 已支持                                                                          |
| 话题线程       | ✅ 已支持                                                                          |
| 媒体           | ✅ 已支持                                                                          |
| 端到端加密     | ✅ 已支持（需要加密模块）                                                 |
| 表情回应       | ✅ 已支持（通过工具发送/读取）                                                    |
| 投票           | ✅ 发送已支持；接收到的投票开始被转换为文本（忽略响应/结束） |
| 位置           | ✅ 已支持（地理 URI；忽略海拔）                                              |
| 原生命令       | ✅ 已支持                                                                          |

## 故障排除

首先运行此排查步骤：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

如有需要，然后确认私信配对状态：

```bash
openclaw pairing list matrix
```

常见故障：

- 已登录但房间消息被忽略：房间被 `groupPolicy` 阻止或处于房间允许列表之外。
- 私信被忽略：当 `channels.matrix.dm.policy="pairing"` 时，发送者待批准。
- 加密房间失败：加密支持或加密设置不匹配。

分流排查流程：[/channels/troubleshooting](/en/channels/troubleshooting)。

## 配置参考 (Matrix)

完整配置：[Configuration](/en/gateway/configuration)

提供者选项：

- `channels.matrix.enabled`：启用/禁用频道启动。
- `channels.matrix.homeserver`：主服务器 URL。
- `channels.matrix.userId`：Matrix 用户 ID（使用访问令牌时可选）。
- `channels.matrix.accessToken`：访问令牌。
- `channels.matrix.password`：登录密码（令牌已存储）。
- `channels.matrix.deviceName`：设备显示名称。
- `channels.matrix.encryption`：启用 E2EE（默认：false）。
- `channels.matrix.initialSyncLimit`：初始同步限制。
- `channels.matrix.threadReplies`：`off | inbound | always`（默认：inbound）。
- `channels.matrix.textChunkLimit`：出站文本块大小（字符数）。
- `channels.matrix.chunkMode`：`length`（默认）或 `newline` 以在按长度分块之前在空行（段落边界）处拆分。
- `channels.matrix.dm.policy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.matrix.dm.allowFrom`：私信白名单（完整的 Matrix 用户 ID）。`open` 需要 `"*"`。向导会在可能时将名称解析为 ID。
- `channels.matrix.groupPolicy`：`allowlist | open | disabled`（默认：白名单）。
- `channels.matrix.groupAllowFrom`：群组消息的白名单发送者（完整的 Matrix 用户 ID）。
- `channels.matrix.allowlistOnly`：强制执行私信和房间的白名单规则。
- `channels.matrix.groups`：群组白名单 + 每房间设置映射。
- `channels.matrix.rooms`：旧版群组白名单/配置。
- `channels.matrix.replyToMode`：主题/标签的回复模式。
- `channels.matrix.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.matrix.autoJoin`：邀请处理（`always | allowlist | off`，默认：always）。
- `channels.matrix.autoJoinAllowlist`：允许自动加入的房间 ID/别名。
- `channels.matrix.accounts`：按账户 ID 键控的多账户配置（每个账户继承顶级设置）。
- `channels.matrix.actions`：按操作工具限制（reactions/messages/pins/memberInfo/channelInfo）。

import zh from '/components/footer/zh.mdx';

<zh />
