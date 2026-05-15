---
summary: "OpenClaw在关联的聊天渠道之间移动一个 OpenClaw 会话的回复路由"
title: "渠道对接"
read_when:
  - You want replies for one active session to move from Telegram to Discord, Slack, Mattermost, or another linked channel
  - You are configuring session.identityLinks for cross-channel direct messages
  - A /dock command says the sender is not linked or no active session exists
---

渠道对接是针对一个 OpenClaw 会话的呼叫转移。

它保持相同的对话上下文，但更改该会话的后续回复的发送位置。

## 示例

Alice 可以在 Telegram 和 Discord 上向 OpenClaw 发送消息：

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456"],
    },
  },
}
```

如果 Alice 从 Telegram 发送此消息：

```text
/dock_discord
```

OpenClaw 保持当前会话上下文并更改回复路由：

| 对接前                            | 在 `/dock_discord` 之后         |
| --------------------------------- | ------------------------------- |
| 回复发送到 Telegram Telegram`123` | 回复发送到 Discord Discord`456` |

会话不会被重新创建。对话记录历史保持附加在同一个会话上。

## 为什么使用它

当任务在一个聊天应用中开始，但后续回复应该发送到其他地方时，请使用对接。

常见流程：

1. 从 Telegram 启动一个代理任务。
2. 移动到您正在协调工作的 Discord。
3. 从 Telegram 会话发送 `/dock_discord`Telegram。
4. 保持相同的 OpenClaw 会话，但在 Discord 中接收后续回复。

## 必需配置

对接需要 `session.identityLinks`。源发送者和目标对等端必须在同一个身份组中：

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123", "discord:456", "slack:U123"],
    },
  },
}
```

这些值是带渠道前缀的对等端 ID：

| 值             | 含义                               |
| -------------- | ---------------------------------- |
| `telegram:123` | Telegram 发送者 ID Telegram`123`   |
| `discord:456`  | Discord 直接对等端 ID Discord`456` |
| `slack:U123`   | Slack 用户 ID Slack`U123`          |

规范键（上面的 `alice`）仅是共享身份组名称。对接命令使用带渠道前缀的值来证明源发送者和目标对等端是同一个人。

## 命令

Dock 命令由支持原生命令的已加载渠道插件生成。当前捆绑的命令：

| 目标渠道   | 命令               | 别名               |
| ---------- | ------------------ | ------------------ |
| Discord    | `/dock-discord`    | `/dock_discord`    |
| Mattermost | `/dock-mattermost` | `/dock_mattermost` |
| Slack      | `/dock-slack`      | `/dock_slack`      |
| Telegram   | `/dock-telegram`   | `/dock_telegram`   |

下划线别名在 Telegram 等原生命令界面上很有用。

## 会发生什么变化

Dock 会更新活动会话的传递字段：

| 会话字段        | 执行 `/dock_discord` 后的示例 |
| --------------- | ----------------------------- |
| `lastChannel`   | `discord`                     |
| `lastTo`        | `456`                         |
| `lastAccountId` | 目标渠道帐户，或 `default`    |

这些字段持久化保存在会话存储中，并用于该会话后续的回复传递。

## 什么不会改变

Dock 不会：

- 创建渠道帐户
- 连接新的 Discord、Telegram、Slack 或 Mattermost 机器人
- 授予用户访问权限
- 绕过渠道允许列表或私信策略
- 将对话记录历史移动到另一个会话
- 让不相关的用户共享一个会话

它仅更改当前会话的传递路由。

## 故障排除

**命令提示发送者未关联。**

将当前发送者和目标对等方都添加到同一个 `session.identityLinks` 组中。例如，如果 Telegram 发送者 `123` 应停靠到 Discord 对等方 `456`，请同时包含 `telegram:123` 和 `discord:456`。

**命令提示不存在活动会话。**

从现有的直接聊天会话进行 Dock。该命令需要一个活动会话条目，以便它可以持久化保存新路由。

**回复仍发送到旧渠道。**

请检查命令是否回复了成功消息，并确认目标对等体 ID 与该渠道使用的 ID 匹配。对接仅更改活动会话的路由；另一个会话可能仍会路由到别处。

**我需要切换回去。**

从关联的发送者处发送针对原始渠道的匹配命令，例如 `/dock_telegram` 或
`/dock-telegram`。
