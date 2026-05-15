---
summary: "可复用的消息渠道发送者白名单"
read_when:
  - Configuring the same allowlist across multiple message channels
  - Sharing DM and group sender access rules
  - Reviewing message-channel access control
title: "访问组"
---

访问组是您定义一次的命名发送者列表，可以使用 `accessGroup:<name>` 从渠道白名单中引用。

当同一批人应该被允许访问多个消息渠道，或者当一个受信任的集合应该同时应用于私信和群组发送者授权时，请使用它们。

访问组本身不授予权限。只有当白名单字段引用某个组时，该组才生效。

## 静态消息发送者组

静态发送者组使用 `type: "message.senders"`。

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        "*": ["global-owner-id"],
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
}
```

成员列表以消息渠道 id 为键：

| 键         | 含义                                       |
| ---------- | ------------------------------------------ |
| `"*"`      | 针对引用该组的每个消息渠道检查的共享条目。 |
| `discord`  | 仅针对 Discord 白名单匹配检查的条目。      |
| `telegram` | 仅针对 Telegram 白名单匹配检查的条目。     |
| `whatsapp` | 仅针对 WhatsApp 白名单匹配检查的条目。     |

条目使用目标渠道的常规 `allowFrom`OpenClawTelegramDiscord 规则进行匹配。OpenClaw 不会在不同渠道之间翻译发送者 id。如果 Alice 拥有一个 Telegram id 和一个 Discord id，请在相应的键下列出这两个 id。

## 从白名单引用组

在消息渠道路径支持发送者白名单的任何位置，使用 `accessGroup:<name>` 引用组。

私信白名单示例：

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
      },
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
    telegram: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators"],
    },
  },
}
```

群组发送者白名单示例：

```json5
{
  accessGroups: {
    oncall: {
      type: "message.senders",
      members: {
        whatsapp: ["+15551234567"],
        googlechat: ["users/1234567890"],
      },
    },
  },
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["accessGroup:oncall"],
    },
    googlechat: {
      spaces: {
        "spaces/AAA": {
          users: ["accessGroup:oncall"],
        },
      },
    },
  },
}
```

您可以混合使用组和直接条目：

```json5
{
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:operators", "discord:123456789012345678"],
    },
  },
}
```

## 支持的消息渠道路径

访问组在共享的消息渠道授权路径中可用，包括：

- 私信发送者白名单，例如 `channels.<channel>.allowFrom`
- 群组发送者白名单，例如 `channels.<channel>.groupAllowFrom`
- 使用相同发送者匹配规则的特定渠道每房间发送者白名单
- 复用消息渠道发送者白名单的命令授权路径

渠道支持取决于该渠道是否通过共享的 OpenClaw 发送方授权辅助程序进行连接。当前捆绑的支持包括 Discord、飞书、Google Chat、iMessage、LINE、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQBot、Signal、WhatsApp、Zalo 和 Zalo Personal。静态 `message.senders` 组设计为与渠道无关，因此新的消息渠道应使用共享的插件 SDK 辅助程序来支持它们，而不是自定义允许列表扩展。

## 插件诊断

插件作者可以检查结构化的访问组状态，而无需将其展开回扁平的允许列表：

```typescript
import { resolveAccessGroupAllowFromState } from "openclaw/plugin-sdk/security-runtime";

const state = await resolveAccessGroupAllowFromState({
  accessGroups: cfg.accessGroups,
  allowFrom: channelConfig.allowFrom,
  channel: "my-channel",
  accountId: "default",
  senderId,
  isSenderAllowed,
});
```

结果报告了被引用、匹配、缺失、不支持和失败的组。当您需要诊断或一致性测试时使用此功能。仅对仍然期望扁平 `allowFrom` 数组的兼容性路径使用 `expandAllowFromWithAccessGroups(...)`。

## Discord 渠道受众

Discord 还支持一种动态访问组类型：

```json5
{
  accessGroups: {
    maintainers: {
      type: "discord.channelAudience",
      guildId: "1456350064065904867",
      channelId: "1456744319972282449",
      membership: "canViewChannel",
    },
  },
  channels: {
    discord: {
      dmPolicy: "allowlist",
      allowFrom: ["accessGroup:maintainers"],
    },
  },
}
```

`discord.channelAudience` 意味着“允许当前可以查看此公会频道的 Discord 私信发送方”。OpenClaw 在授权时通过 Discord 解析发送方，并应用 Discord `ViewChannel` 权限规则。

当 Discord 频道已经是团队的事实来源（例如 `#maintainers` 或 `#on-call`）时，请使用此功能。

要求和失败行为：

- 机器人需要访问公会和频道。
- 机器人需要 Discord 开发者门户中的 **Server Members Intent**（服务器成员意图）。
- 当 Discord 返回 `Missing Access`、发送方无法解析为公会成员，或频道属于另一个公会时，访问组将以失败关闭（fails closed）。

更多 Discord 特定的示例：[Discord 访问控制](/zh/channels/discord#access-control-and-routing)

## 安全注意事项

- 访问组是允许列表别名，而非角色。它们本身不会创建所有者、批准配对请求或授予工具权限。
- `dmPolicy: "open"` 仍然需要在有效的私信允许列表中包含 `"*"`。引用访问组并不等同于公开访问。
- 缺失的组名称默认会阻止访问。如果 `allowFrom` 包含 `accessGroup:operators` 但 `accessGroups.operators` 不存在，则该条目不会授权任何人。
- 保持渠道 ID 稳定。当渠道同时支持数字/用户 ID 和显示名称时，优先使用数字/用户 ID。

## 故障排除

如果发送者本应匹配但被阻止：

1. 确认允许列表字段包含确切的 `accessGroup:<name>` 引用。
2. 确认 `accessGroups.<name>.type` 是正确的。
3. 确认发送者 ID 列在匹配的渠道键下，或者列在 `"*"` 下。
4. 确认条目使用了该渠道正常的允许列表语法。
5. 对于 Discord 渠道受众，确认机器人可以看到公会频道并且已启用服务器成员意图。

编辑访问控制配置后，运行 `openclaw doctor`。它可以在运行前捕获许多无效的允许列表和策略组合。
