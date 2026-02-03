---
summary: "Matrix 支持状态、能力与配置"
read_when:
  - 开发 Matrix 渠道功能
title: "Matrix"
---

# Matrix（插件）

Matrix 是开放的去中心化消息协议。OpenClaw 作为 Matrix **用户**连接到任意 homeserver，
因此 bot 需要一个 Matrix 账号。登录后可直接 DM 或邀请到房间（Matrix “groups”）。
Beeper 也是可用客户端，但需要启用 E2EE。

状态：通过插件支持（@vector-im/matrix-bot-sdk）。支持私聊、房间、线程、媒体、reactions、
投票（发送 + poll-start 文本化）、位置，以及 E2EE（带加密支持）。

## 需要插件

Matrix 为插件形式，未随核心安装打包。

通过 CLI 安装（npm registry）：

```bash
openclaw plugins install @openclaw/matrix
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/matrix
```

若在配置/上手流程中选择 Matrix 且检测到 git 检出，OpenClaw 会自动提供本地安装路径。

详情：[Plugins](/zh/plugin)

## 设置

1. 安装 Matrix 插件：
   - npm：`openclaw plugins install @openclaw/matrix`
   - 本地检出：`openclaw plugins install ./extensions/matrix`
2. 在 homeserver 创建 Matrix 账号：
   - 浏览托管选项：[https://matrix.org/ecosystem/hosting/](https://matrix.org/ecosystem/hosting/)
   - 或自行部署。
3. 获取 bot 账号的 access token：
   - 在你的 homeserver 用 `curl` 调用 Matrix 登录 API：

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

   - 将 `matrix.example.org` 替换为你的 homeserver URL。
   - 或设置 `channels.matrix.userId` + `channels.matrix.password`：OpenClaw 会调用相同登录端点，
     将 access token 存入 `~/.openclaw/credentials/matrix/credentials.json`，并在下次启动复用。

4. 配置凭据：
   - 环境变量：`MATRIX_HOMESERVER`、`MATRIX_ACCESS_TOKEN`（或 `MATRIX_USER_ID` + `MATRIX_PASSWORD`）
   - 或配置：`channels.matrix.*`
   - 两者同时设置时，以配置优先。
   - 使用 access token 时，用户 ID 会通过 `/whoami` 自动获取。
   - 若设置 `channels.matrix.userId`，需为完整 Matrix ID（如 `@bot:example.org`）。
5. 重启 gateway（或完成上手流程）。
6. 从任意 Matrix 客户端（Element、Beeper 等；见 https://matrix.org/ecosystem/clients/）与 bot 私聊或邀请进房间。
   Beeper 需要 E2EE，因此请设置 `channels.matrix.encryption: true` 并验证设备。

最小配置（access token，user ID 自动获取）：

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

E2EE 配置（端到端加密启用）：

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

## 加密（E2EE）

端到端加密通过 Rust crypto SDK **支持**。

启用：`channels.matrix.encryption: true`：

- 若 crypto 模块加载成功，加密房间会自动解密。
- 向加密房间发送媒体时会加密。
- 首次连接时，OpenClaw 会请求你的其他会话进行设备验证。
- 在另一个 Matrix 客户端（Element 等）验证设备以共享密钥。
- 若 crypto 模块无法加载，会禁用 E2EE，并记录警告；加密房间无法解密。
- 若出现缺失 crypto 模块错误（例如 `@matrix-org/matrix-sdk-crypto-nodejs-*`），
  请允许 `@matrix-org/matrix-sdk-crypto-nodejs` 的构建脚本，并运行
  `pnpm rebuild @matrix-org/matrix-sdk-crypto-nodejs` 或执行
  `node node_modules/@matrix-org/matrix-sdk-crypto-nodejs/download-lib.js` 下载二进制。

Crypto 状态按账号 + access token 存在：
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/crypto/`
（SQLite 数据库）。同步状态保存在同目录下的 `bot-storage.json`。
如果 access token（设备）变化，会创建新存储，bot 需重新验证才能解密加密房间。

**设备验证：**
启用 E2EE 后，bot 启动时会向其他会话发起验证请求。
在 Element（或其他客户端）中批准该请求以建立信任。
验证完成后，bot 才能解密加密房间的消息。

## 路由模型

- 回复始终回到 Matrix。
- 私聊共享 agent 主会话；房间映射为群组会话。

## 访问控制（私聊）

- 默认：`channels.matrix.dm.policy = "pairing"`。未知发送者会收到配对码。
- 批准命令：
  - `openclaw pairing list matrix`
  - `openclaw pairing approve matrix <CODE>`
- 公共私聊：`channels.matrix.dm.policy="open"` 且 `channels.matrix.dm.allowFrom=["*"]`。
- `channels.matrix.dm.allowFrom` 可接受用户 ID 或显示名。向导在可用目录搜索时会将显示名解析为用户 ID。

## 房间（群组）

- 默认：`channels.matrix.groupPolicy = "allowlist"`（提及门控）。若未设置，可用 `channels.defaults.groupPolicy` 覆盖默认值。
- 使用 `channels.matrix.groups` allowlist 房间（room ID、别名或名称）：

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

- `requireMention: false` 可在该房间启用自动回复。
- `groups."*"` 可设置全局提及门控默认值。
- `groupAllowFrom` 可限制哪些发送者可在房间中触发 bot（可选）。
- 每房间 `users` allowlist 可进一步限制该房间的发送者。
- 配置向导会提示设置房间 allowlist（room ID、别名或名称），并在可能时解析名称。
- 启动时，OpenClaw 会将 allowlist 中的房间/用户名称解析为 ID 并记录映射；无法解析的条目保留原样。
- 邀请默认自动加入；用 `channels.matrix.autoJoin` 与 `channels.matrix.autoJoinAllowlist` 控制。
- 若要**禁止所有房间**，设置 `channels.matrix.groupPolicy: "disabled"`（或保持空 allowlist）。
- 旧键：`channels.matrix.rooms`（与 `groups` 结构相同）。

## 线程

- 支持回复线程。
- `channels.matrix.threadReplies` 控制是否在同一线程回复：
  - `off`、`inbound`（默认）、`always`
- `channels.matrix.replyToMode` 控制不在线程中回复时的 reply-to 元数据：
  - `off`（默认）、`first`、`all`

## 能力

| 功能      | 状态                                                     |
| --------- | -------------------------------------------------------- |
| 私聊      | ✅ 支持                                                  |
| 房间      | ✅ 支持                                                  |
| 线程      | ✅ 支持                                                  |
| 媒体      | ✅ 支持                                                  |
| E2EE      | ✅ 支持（需 crypto 模块）                                |
| Reactions | ✅ 支持（通过工具读/发）                                 |
| 投票      | ✅ 发送支持；入站 poll-start 会转为文本（忽略响应/结束） |
| 位置      | ✅ 支持（geo URI；忽略海拔）                             |
| 原生命令  | ✅ 支持                                                  |

## 配置参考（Matrix）

完整配置见：[Configuration](/zh/gateway/configuration)

Provider 选项：

- `channels.matrix.enabled`：启用/禁用渠道启动。
- `channels.matrix.homeserver`：homeserver URL。
- `channels.matrix.userId`：Matrix 用户 ID（access token 可选）。
- `channels.matrix.accessToken`：access token。
- `channels.matrix.password`：登录密码（会存 token）。
- `channels.matrix.deviceName`：设备显示名。
- `channels.matrix.encryption`：启用 E2EE（默认：false）。
- `channels.matrix.initialSyncLimit`：初始同步上限。
- `channels.matrix.threadReplies`：`off | inbound | always`（默认：inbound）。
- `channels.matrix.textChunkLimit`：出站文本分块大小（字符）。
- `channels.matrix.chunkMode`：`length`（默认）或 `newline`（按空行分段再分块）。
- `channels.matrix.dm.policy`：`pairing | allowlist | open | disabled`（默认：pairing）。
- `channels.matrix.dm.allowFrom`：私聊 allowlist（用户 ID 或显示名）。`open` 需要 `"*"`。向导会在可能时解析名称。
- `channels.matrix.groupPolicy`：`allowlist | open | disabled`（默认：allowlist）。
- `channels.matrix.groupAllowFrom`：群聊允许的发送者。
- `channels.matrix.allowlistOnly`：强制私聊 + 房间走 allowlist 规则。
- `channels.matrix.groups`：群 allowlist + 房间配置 map。
- `channels.matrix.rooms`：旧版群 allowlist/config。
- `channels.matrix.replyToMode`：线程/标签的 reply-to 模式。
- `channels.matrix.mediaMaxMb`：入站/出站媒体上限（MB）。
- `channels.matrix.autoJoin`：邀请处理（`always | allowlist | off`，默认：always）。
- `channels.matrix.autoJoinAllowlist`：允许自动加入的房间 ID/别名。
- `channels.matrix.actions`：动作级工具门控（reactions/messages/pins/memberInfo/channelInfo）。
