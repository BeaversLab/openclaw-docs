---
summary: "Tlon/Urbit 支持状态、功能和配置"
read_when:
  - Working on Tlon/Urbit channel features
title: "Tlon"
---

Tlon 是一个构建在 Urbit 上的去中心化消息传递应用。OpenClaw 连接到您的 Urbit ship 并可以
响应私信和群组聊天消息。默认情况下，群组回复需要 @ 提及，并且可以通过允许列表进一步进行限制。

状态：捆绑插件。支持私信、群组提及、线程回复、富文本格式和
图片上传。尚不支持反应和投票。

## 捆绑插件

在当前的 OpenClaw 版本中，Tlon 作为捆绑插件提供，因此普通的打包
构建无需单独安装。

如果您使用的是旧版本构建或排除了 Tlon 的自定义安装，请
手动安装：

通过 CLI (npm registry) 安装：

```bash
openclaw plugins install @openclaw/tlon
```

本地检出（从 git 仓库运行时）：

```bash
openclaw plugins install ./path/to/local/tlon-plugin
```

详情：[Plugins](/zh/tools/plugin)

## 设置

1. 确保 Tlon 插件可用。
   - 当前打包的 OpenClaw 版本已包含它。
   - 旧版本/自定义安装可以使用上述命令手动添加。
2. 收集您的 ship URL 和登录代码。
3. 配置 `channels.tlon`。
4. 重启网关。
5. 向机器人发送私信或在群组渠道中提及它。

最小配置（单个账户）：

```json5
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // recommended: your ship, always allowed
    },
  },
}
```

## 私有/LAN ships

默认情况下，为了 SSRF 保护，OpenClaw 会阻止私有/内部主机名和 IP 范围。
如果您的 ship 运行在私有网络（localhost、LAN IP 或内部主机名）上，
您必须明确选择加入：

```json5
{
  channels: {
    tlon: {
      url: "http://localhost:8080",
      allowPrivateNetwork: true,
    },
  },
}
```

这适用于以下 URL：

- `http://localhost:8080`
- `http://192.168.x.x:8080`
- `http://my-ship.local:8080`

⚠️ 仅在您信任本地网络时才启用此功能。此设置将禁用对您的 ship URL 请求的 SSRF 保护。

## 群组渠道

默认情况下启用自动发现。您也可以手动固定渠道：

```json5
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
    },
  },
}
```

禁用自动发现：

```json5
{
  channels: {
    tlon: {
      autoDiscoverChannels: false,
    },
  },
}
```

## 访问控制

私信允许列表（空 = 不允许私信，使用 `ownerShip` 进行批准流程）：

```json5
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}
```

群组授权（默认受限）：

```json5
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"],
          },
          "chat/~host-ship/announcements": {
            mode: "open",
          },
        },
      },
    },
  },
}
```

## 所有者和批准系统

设置一个 owner ship，以便在未授权用户尝试交互时接收批准请求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

Owner ship **在所有地方自动获得授权** — 私信邀请会被自动接受，
且始终允许渠道消息。您无需将 owner 添加到 `dmAllowlist` 或
`defaultAuthorizedShips`。

设置后，owner 将收到关于以下内容的私信通知：

- 来自不在允许列表中的 ships 的私信请求
- 未经授权的渠道提及
- 群组邀请请求

## 自动接受设置

自动接受私信邀请（针对 dmAllowlist 中的船）：

```json5
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}
```

自动接受群组邀请：

```json5
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
    },
  },
}
```

## 投递目标 (CLI/cron)

将这些与 `openclaw message send` 或 cron 投递配合使用：

- 私信：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群组：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 内置技能

Tlon 插件包含一个内置技能 ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))，
提供 CLI 访问 Tlon 操作的功能：

- **联系人**：获取/更新个人资料，列出联系人
- **渠道**：列出、创建、发送消息、获取历史记录
- **群组**：列出、创建、管理成员
- **私信**：发送消息，对消息做出反应
- **反应**：为帖子和私信添加/移除表情反应
- **设置**：通过斜杠命令管理插件权限

安装插件后，该技能将自动可用。

## 功能

| 功能      | 状态                               |
| --------- | ---------------------------------- |
| 私信      | ✅ 支持                            |
| 群组/渠道 | ✅ 支持（默认需要提及）            |
| 线程      | ✅ 支持（线程内自动回复）          |
| 富文本    | ✅ Markdown 已转换为 Tlon 格式     |
| 图片      | ✅ 已上传到 Tlon 存储              |
| 反应      | ✅ 通过 [内置技能](#bundled-skill) |
| 投票      | ❌ 尚不支持                        |
| 原生命令  | ✅ 支持（默认仅限所有者）          |

## 故障排除

首先运行此 ladder：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常见故障：

- **私信被忽略**：发送者不在 `dmAllowlist` 中，且未配置 `ownerShip` 以进行审批流程。
- **群组消息被忽略**：未发现渠道或发送者未获授权。
- **连接错误**：检查船 URL 是否可达；为本地船启用 `allowPrivateNetwork`。
- **认证错误**：验证登录码是否为最新（代码会轮换）。

## 配置参考

完整配置：[配置](/zh/gateway/configuration)

提供程序选项：

- `channels.tlon.enabled`：启用/禁用渠道启动。
- `channels.tlon.ship`：机器人的 Urbit 船名称（例如 `~sampel-palnet`）。
- `channels.tlon.url`：船 URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：船登录码。
- `channels.tlon.allowPrivateNetwork`：允许 localhost/LAN URL（SSRF 绕过）。
- `channels.tlon.ownerShip`：审批系统的所有者 ship（始终已授权）。
- `channels.tlon.dmAllowlist`：允许发送私信的 ship（空 = 无）。
- `channels.tlon.autoAcceptDmInvites`：自动接受来自已列入白名单的 ship 的私信。
- `channels.tlon.autoAcceptGroupInvites`：自动接受所有群组邀请。
- `channels.tlon.autoDiscoverChannels`：自动发现群组渠道（默认：true）。
- `channels.tlon.groupChannels`：手动固定的渠道巢。
- `channels.tlon.defaultAuthorizedShips`：已授权用于所有渠道的 ship。
- `channels.tlon.authorization.channelRules`：针对每个渠道的授权规则。
- `channels.tlon.showModelSignature`：将模型名称追加到消息中。

## 注意

- 群组回复需要提及（例如 `~your-bot-ship`）才能响应。
- 主题回复：如果入站消息在主题中，OpenClaw 会在主题内回复。
- 富文本：Markdown 格式（粗体、斜体、代码、标题、列表）会被转换为 Tlon 的原生格式。
- 图片：URL 会上传到 Tlon 存储并作为图片块嵌入。

## 相关

- [渠道概述](/zh/channels) — 所有支持的渠道
- [配对](/zh/channels/pairing) — 私信认证和配对流程
- [群组](/zh/channels/groups) — 群组聊天的行为和提及限制
- [渠道路由](/zh/channels/channel-routing) — 消息的会话路由
- [安全性](/zh/gateway/security) — 访问模型和加固
