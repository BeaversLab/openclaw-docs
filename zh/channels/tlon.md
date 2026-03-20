---
summary: "Tlon/Urbit 支持状态、功能和配置"
read_when:
  - 正在处理 Tlon/Urbit 渠道功能
title: "Tlon"
---

# Tlon（插件）

Tlon 是一个基于 Urbit 构建的去中心化消息传递应用。OpenClaw 连接到您的 Urbit ship 并可
响应私信和群组聊天消息。群组回复默认需要 @ 提及，并且可以通过允许列表进行进一步限制。

状态：通过插件支持。支持私信、群组提及、线程回复、富文本格式和
图片上传。暂不支持表情反应和投票。

## 所需插件

Tlon 作为插件提供，不包含在核心安装中。

通过 CLI 安装（npm 注册表）：

```bash
openclaw plugins install @openclaw/tlon
```

本地检出（当从 git 仓库运行时）：

```bash
openclaw plugins install ./extensions/tlon
```

详细信息：[插件](/zh/tools/plugin)

## 设置

1. 安装 Tlon 插件。
2. 准备好您的 ship URL 和登录代码。
3. 配置 `channels.tlon`。
4. 重启网关。
5. 向机器人发送私信或在群组频道中提及它。

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

## 私有/LAN Ships

默认情况下，OpenClaw 会阻止私有/内部主机名和 IP 范围以进行 SSRF 保护。
如果您的 ship 运行在私有网络（localhost、LAN IP 或内部主机名）上，
则必须明确选择加入：

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

⚠️ 仅在您信任本地网络时才启用此项。此设置将禁用针对您的 ship URL 请求的 SSRF 保护。

## 群组频道

默认启用自动发现。您也可以手动固定频道：

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

私信允许列表（空 = 不允许私信，使用 `ownerShip` 进行审批流程）：

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

## 所有者和审批系统

设置一个所有者 ship，以便在未授权用户尝试交互时接收审批请求：

```json5
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}
```

所有者 ship **在所有位置自动获得授权** — 私信邀请被自动接受，
且始终允许渠道消息。您无需将所有者添加到 `dmAllowlist` 或
`defaultAuthorizedShips` 中。

设置后，所有者将收到以下 私信 通知：

- 来自不在允许列表中的 ship 的私信请求
- 未经授权的频道提及
- 群组邀请请求

## 自动接受设置

自动接受私信邀请（针对 dmAllowlist 中的船只）：

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

将这些与 `openclaw message send` 或 cron 传递结合使用：

- 私信：`~sampel-palnet` 或 `dm/~sampel-palnet`
- 群组：`chat/~host-ship/channel` 或 `group:~host-ship/channel`

## 捆绑技能

Tlon 插件包含一个捆绑技能（[`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill)），
提供对 Tlon 操作的 CLI 访问权限：

- **联系人 (Contacts)**：获取/更新个人资料，列出联系人
- **频道 (Channels)**：列出、创建、发送消息、获取历史记录
- **群组 (Groups)**：列出、创建、管理成员
- **私信 (私信)**：发送消息，对消息做出反应
- **回应 (Reactions)**：对帖子 and 添加/移除表情符号回应
- **设置 (Settings)**：通过斜杠命令管理插件权限

安装插件后，该技能将自动可用。

## 功能

| 功能         | 状态                                  |
| --------------- | --------------------------------------- |
| 私信 | ✅ 已支持                            |
| 群组/频道 | ✅ 已支持（默认通过提及触发） |
| 话题串         | ✅ 已支持（在话题串中自动回复）   |
| 富文本       | ✅ Markdown 转换为 Tlon 格式    |
| 图片          | ✅ 已上传到 Tlon 存储             |
| 表情反应       | ✅ 通过 [bundled skill](#bundled-skill)  |
| 投票           | ❌ 尚不支持                    |
| 原生指令 | ✅ 已支持（默认仅所有者可用）    |

## 故障排查

首先运行此步骤：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
```

常见故障：

- **忽略私信**：发送者不在 `dmAllowlist` 中，且未配置 `ownerShip` 用于审批流程。
- **群组消息被忽略**：频道未发现或发送者未获授权。
- **连接错误**：检查 ship URL 是否可访问；为本地 ship 启用 `allowPrivateNetwork`。
- **认证错误**：验证登录码是否为最新（登录码会轮换）。

## 配置参考

完整配置：[配置](/zh/gateway/configuration)

提供者选项：

- `channels.tlon.enabled`：启用/禁用渠道启动。
- `channels.tlon.ship`：机器人的 Urbit 船名（例如 `~sampel-palnet`）。
- `channels.tlon.url`：船 URL（例如 `https://sampel-palnet.tlon.network`）。
- `channels.tlon.code`：船登录代码。
- `channels.tlon.allowPrivateNetwork`：允许 localhost/LAN URL（SSRF 绕过）。
- `channels.tlon.ownerShip`：审批系统的所有者船（始终已授权）。
- `channels.tlon.dmAllowlist`：允许发送私信的船（留空 = 无）。
- `channels.tlon.autoAcceptDmInvites`：自动接受来自白名单船只的私信。
- `channels.tlon.autoAcceptGroupInvites`：自动接受所有群组邀请。
- `channels.tlon.autoDiscoverChannels`：自动发现群组渠道（默认：true）。
- `channels.tlon.groupChannels`：手动固定的渠道嵌套。
- `channels.tlon.defaultAuthorizedShips`：已授权访问所有渠道的船。
- `channels.tlon.authorization.channelRules`：针对各渠道的授权规则。
- `channels.tlon.showModelSignature`：将模型名称附加到消息。

## 注意

- 群组回复需要提及（例如 `~your-bot-ship`）才能响应。
- 帖子回复：如果传入消息位于帖子串中，OpenClaw 将在串内回复。
- 富文本：Markdown 格式（粗体、斜体、代码、标题、列表）将转换为 Tlon 的原生格式。
- 图片：URL 将上传到 Tlon 存储并作为图片块嵌入。

import en from "/components/footer/en.mdx";

<en />
