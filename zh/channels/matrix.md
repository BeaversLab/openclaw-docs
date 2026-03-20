---
summary: "Matrix 支持状态、功能和配置"
read_when:
  - 开发 Matrix 渠道功能
title: "Matrix"
---

# Matrix (插件)

Matrix 是一个开放的去中心化消息协议。OpenClaw 作为 Matrix 用户
连接到任何主服务器，因此您需要为机器人创建一个 Matrix 账户。登录后，您可以直接给机器人发送私信
或将其邀请到房间（Matrix “群组”）。Beeper 也是一个有效的客户端选项，
但它需要启用 E2EE。

状态：通过插件 (@vector-im/matrix-bot-sdk) 支持。私信、房间、话题、媒体、表情回应、
投票（发送 + 文本形式的投票开始）、位置和 E2EE（支持加密）。

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

如果您在设置期间选择 Matrix 并且检测到了 git 检出，
OpenClaw 将自动提供本地安装路径。

详情：[插件](/zh/tools/plugin)

## 设置

1. 安装 Matrix 插件：
   - 从 npm 安装： `openclaw plugins install @openclaw/matrix`
   - 从本地检出安装： `openclaw plugins install ./extensions/matrix`
2. 在主服务器上创建一个 Matrix 账户：
   - 在 [https://matrix.org/ecosystem/hosting/](https://matrix.org/ecosystem/hosting/) 浏览托管选项
   - 或者自己托管。
3. 获取机器人账户的访问令牌：
   - 在您的主服务器上，使用 `curl` 调用 Matrix 登录 API：

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

   - 将 `matrix.example.org` 替换为您的主服务器 URL。
   - 或者设置 `channels.matrix.userId` + `channels.matrix.password`： OpenClaw 调用相同的
     登录端点，将访问令牌存储在 `~/.openclaw/credentials/matrix/credentials.json` 中，
     并在下次启动时重用它。

4. 配置凭据：
   - 环境变量： `MATRIX_HOMESERVER`, `MATRIX_ACCESS_TOKEN` (或 `MATRIX_USER_ID` + `MATRIX_PASSWORD`)
   - 或者配置： `channels.matrix.*`
   - 如果两者都设置了，配置优先。
   - 使用访问令牌：用户 ID 会通过 `/whoami` 自动获取。
   - 设置时， `channels.matrix.userId` 应该是完整的 Matrix ID (例如： `@bot:example.org`)。
5. 重启网关（或完成设置）。
6. 从任何 Matrix 客户端启动与机器人的私信，或将其邀请到房间
   (Element, Beeper 等；参见 [https://matrix.org/ecosystem/clients/](https://matrix.org/ecosystem/clients/))。Beeper 需要 E2EE，
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

通过 Rust 加密 SDK **支持** 端到端加密。

使用 `channels.matrix.encryption: true` 启用：

- 如果加密模块加载，加密的房间将自动解密。
- 发送到加密房间时，出站媒体将被加密。
- 首次连接时，OpenClaw 会请求您的其他会话进行设备验证。
- 在另一个 Matrix 客户端（如 Element 等）中验证设备以启用密钥共享。
- 如果无法加载加密模块，E2EE 将被禁用，加密的房间将无法解密；
  OpenClaw 会记录一条警告。
- 如果您看到缺少加密模块错误（例如，`@matrix-org/matrix-sdk-crypto-nodejs-*`），
  请允许 `@matrix-org/matrix-sdk-crypto-nodejs` 的构建脚本并运行
  `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs` 或使用
  `node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js` 获取二进制文件。

加密状态按账号 + 访问令牌存储在
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/crypto/`
（SQLite 数据库）中。同步状态与其并存于 `bot-storage.json`。
如果访问令牌（设备）发生变化，将创建一个新的存储，并且必须为
加密房间重新验证机器人。

**设备验证：**
启用 E2EE 后，机器人将在启动时请求您的其他会话进行验证。
打开 Element（或其他客户端）并批准验证请求以建立信任。
验证通过后，机器人即可解密加密房间中的消息。

## 多账号

多账号支持：将 `channels.matrix.accounts` 与每账号凭据以及可选的 `name` 一起使用。有关共享模式，请参阅 [`gateway/configuration`](/zh/gateway/configuration#telegramaccounts--discordaccounts--slackaccounts--signalaccounts--imessageaccounts)。

每个账号在任何家庭服务器上均作为单独的 Matrix 用户运行。每账号配置
继承自顶层的 `channels.matrix` 设置，并且可以覆盖任何选项
（私信策略、群组、加密等）。

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

- 账号启动是串行的，以避免并发模块导入的竞态条件。
- 环境变量（`MATRIX_HOMESERVER`、`MATRIX_ACCESS_TOKEN` 等）仅适用于 **默认** 账号。
- 基础渠道设置（私信策略、群组策略、提及限制等）适用于所有账号，除非在特定账号中覆盖。
- 使用 `bindings[].match.accountId` 将每个账号路由到不同的代理。
- 加密状态按账号 + 访问令牌存储（每个账号有单独的密钥存储）。

## 路由模型

- 回复总是发回 Matrix。
- 私信共享代理的主会话；房间映射到群组会话。

## 访问控制（私信）

- 默认值：`channels.matrix.dm.policy = "pairing"`。未知发件人将收到配对码。
- 批准方式：
  - `openclaw pairing list matrix`
  - `openclaw pairing approve matrix <CODE>`
- 公开私信：`channels.matrix.dm.policy="open"` 加上 `channels.matrix.dm.allowFrom=["*"]`。
- `channels.matrix.dm.allowFrom` 接受完整的 Matrix 用户 ID（例如：`@user:server`）。当目录搜索找到单个精确匹配项时，向导会将显示名称解析为用户 ID。
- 请勿使用显示名称或裸本地部分（例如：`"Alice"` 或 `"alice"`）。它们具有歧义，并且在允许列表匹配中会被忽略。请使用完整的 `@user:server` ID。

## 房间（群组）

- 默认值：`channels.matrix.groupPolicy = "allowlist"`（提及门控）。使用 `channels.defaults.groupPolicy` 在未设置时覆盖默认值。
- 运行时注意：如果完全缺少 `channels.matrix`，运行时会回退到 `groupPolicy="allowlist"` 进行房间检查（即使设置了 `channels.defaults.groupPolicy`）。
- 使用 `channels.matrix.groups` 将房间加入允许列表（房间 ID 或别名；当目录搜索找到单个完全匹配项时，名称会被解析为 ID）：

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
- `groups."*"` 可以设置跨房间的提及筛选默认值。
- `groupAllowFrom` 限制哪些发件人可以在房间中触发机器人（完整的 Matrix 用户 ID）。
- 特定房间的 `users` 允许列表可以进一步限制特定房间内的发件人（使用完整的 Matrix 用户 ID）。
- 配置向导会提示输入房间允许列表（房间 ID、别名或名称），并仅在找到唯一的精确匹配时解析名称。
- 启动时，OpenClaw 会将允许列表中的房间/用户名称解析为 ID 并记录映射；未解析的条目在进行允许列表匹配时将被忽略。
- 默认情况下会自动加入邀请；使用 `channels.matrix.autoJoin` 和 `channels.matrix.autoJoinAllowlist` 进行控制。
- 要**不允许任何房间**，请设置 `channels.matrix.groupPolicy: "disabled"`（或保持允许列表为空）。
- 旧版键：`channels.matrix.rooms`（与 `groups` 的形状相同）。

## 话题串

- 支持回复话题串。
- `channels.matrix.threadReplies` 控制回复是否保留在串烧（threads）中：
  - `off`，`inbound`（默认），`always`
- `channels.matrix.replyToMode` 控制不在串烧中回复时的“回复至”元数据：
  - `off`（默认），`first`，`all`

## 功能

| 功能特性         | 状态                                                                                |
| --------------- | ------------------------------------------------------------------------------------- |
| 私信 | ✅ 已支持                                                                          |
| 房间           | ✅ 已支持                                                                          |
| 话题串         | ✅ 已支持                                                                          |
| 媒体           | ✅ 已支持                                                                          |
| E2EE            | ✅ 已支持（需要加密模块）                                                 |
| 回应       | ✅ 已支持（通过工具发送/读取）                                                    |
| 投票           | ✅ 发送已支持；接收到的投票开始事件被转换为文本（忽略回应/结束） |
| 位置        | ✅ 已支持（geo URI；忽略高度）                                              |
| 原生命令 | ✅ 已支持                                                                          |

## 故障排除

首先运行此排查步骤：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

然后根据需要确认私信配对状态：

```bash
openclaw pairing list matrix
```

常见故障：

- 已登录但忽略房间消息：房间被 `groupPolicy` 阻止或受房间允许列表限制。
- 忽略私信：当 `channels.matrix.dm.policy="pairing"` 时，发件人正在等待批准。
- 加密房间失败：加密支持或加密设置不匹配。

有关分流流程：[/channels/故障排除](/zh/channels/troubleshooting)。

## 配置参考（Matrix）

完整配置：[Configuration](/zh/gateway/configuration)

提供商选项：

- `channels.matrix.enabled`：启用/禁用渠道启动。
- `channels.matrix.homeserver`：主服务器 URL。
- `channels.matrix.userId`：Matrix 用户 ID（带有访问令牌时可选）。
- `channels.matrix.accessToken`：访问令牌。
- `channels.matrix.password`：登录密码（已存储令牌）。
- `channels.matrix.deviceName`：设备显示名称。
- `channels.matrix.encryption`：启用 E2EE（默认：false）。
- `channels.matrix.initialSyncLimit`：初始同步限制。
- `channels.matrix.threadReplies`：`off | inbound | always`（默认：inbound）。
- `channels.matrix.textChunkLimit`：出站文本块大小（字符数）。
- `channels.matrix.chunkMode`：`length`（默认）或 `newline` 在按长度分块之前按空行（段落边界）拆分。
- `channels.matrix.dm.policy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.matrix.dm.allowFrom`：私信白名单（完整的 Matrix 用户 ID）。`open` 需要 `"*"`。向导会尽可能将名称解析为 ID。
- `channels.matrix.groupPolicy`：`allowlist | open | disabled`（默认：allowlist）。
- `channels.matrix.groupAllowFrom`：群组消息的白名单发送者（完整的 Matrix 用户 ID）。
- `channels.matrix.allowlistOnly`：对私信和房间强制执行白名单规则。
- `channels.matrix.groups`：群组白名单 + 每个房间的设置映射。
- `channels.matrix.rooms`：旧版群组白名单/配置。
- `channels.matrix.replyToMode`：线程/标签的回复模式。
- `channels.matrix.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.matrix.autoJoin`：邀请处理（`always | allowlist | off`，默认：always）。
- `channels.matrix.autoJoinAllowlist`：允许自动加入的房间 ID/别名。
- `channels.matrix.accounts`：按帐户 ID 键入的多帐户配置（每个帐户继承顶级设置）。
- `channels.matrix.actions`：按操作的工具控制（reactions/messages/pins/memberInfo/channelInfo）。

import en from "/components/footer/en.mdx";

<en />
