---
summary: "WhatsApp 群组消息处理的行为和配置（mentionPatterns 在各平台间共享）"
read_when:
  - Changing group message rules or mentions
title: "群组消息"
---

# 群组消息（WhatsApp Web 通道）

目标：让 Clawd 加入 WhatsApp 群组，仅在收到呼叫时唤醒，并将该会话线程与个人 DM 会话分离开来。

注意：`agents.list[].groupChat.mentionPatterns` 现在也被 Telegram/Discord/Slack/iMessage 使用；本文档专注于 WhatsApp 特有的行为。对于多代理设置，请为每个代理设置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局回退）。

## 已实现功能（2025-12-03）

- 激活模式：`mention`（默认）或 `always`。`mention` 需要呼叫（通过 `mentionedJids` 发起的真实 WhatsApp @提及、正则表达式模式，或文本中任意位置出现的机器人 E.164 号码）。`always` 会在每条消息时唤醒代理，但它只应在能提供有意义的价值时回复；否则返回静默令牌 `NO_REPLY`。可以在配置（`channels.whatsapp.groups`）中设置默认值，并通过 `/activation` 为每个群组覆盖。当设置 `channels.whatsapp.groups` 时，它也充当群组白名单（包含 `"*"` 以允许所有）。
- 群组策略：`channels.whatsapp.groupPolicy` 控制是否接受群组消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退：显式 `channels.whatsapp.allowFrom`）。默认为 `allowlist`（在添加发送者之前阻止）。
- 按群组会话：会话键格式类似于 `agent:<agentId>:whatsapp:group:<jid>`，因此诸如 `/verbose on` 或 `/think high`（作为独立消息发送）等命令的作用域仅限于该群组；个人 DM 状态保持不变。群组线程跳过心跳检测。
- 上下文注入：_未_触发运行的 **仅待处理** 群组消息（默认 50 条）会被添加到 `[Chat messages since your last reply - for context]` 前缀下，触发行位于 `[Current message - respond to this]` 下。会话中已有的消息不会被重新注入。
- 发送者显示：每个群组批次现在以 `[from: Sender Name (+E164)]` 结尾，以便 Pi 知道谁在发言。
- 阅后即焚/一次性查看：在提取文本/提及之前我们会解包这些消息，因此其中的 ping 仍然会触发。
- 群组系统提示词：在群组会话的第一轮（以及每当 `/activation` 更改模式时），我们会向系统提示词中注入一段简短的文字，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果元数据不可用，我们仍然会告诉代理这是一个群组聊天。

## 配置示例 (WhatsApp)

添加一个 `groupChat` 块到 `~/.openclaw/openclaw.json`，以便即使 WhatsApp 去除了文本正文中的视觉 `@`，显示名称 ping 仍然有效：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: ["@?openclaw", "\\+?15555550123"],
        },
      },
    ],
  },
}
```

说明：

- 正则表达式不区分大小写；它们涵盖像 `@openclaw` 这样的显示名称 ping，以及带或不带 `+`/空格的原始号码。
- 当有人点击联系人时，WhatsApp 仍然会通过 `mentionedJids` 发送标准提及，因此很少需要号码回退，但这是一种有用的安全网。

### 激活命令（仅限所有者）

使用群聊命令：

- `/activation mention`
- `/activation always`

只有所有者号码（来自 `channels.whatsapp.allowFrom`，如果未设置则为机器人自己的 E.164 号码）可以更改此项。在群组中发送 `/status` 作为单独的消息以查看当前的激活模式。

## 如何使用

1. 将您的 WhatsApp 账户（运行 OpenClaw 的那个）添加到群组中。
2. 说 `@openclaw …`（或包含号码）。除非您设置了 `groupPolicy: "open"`，否则只有列入白名单的发件人才能触发它。
3. 代理提示词将包含最近的群组上下文以及尾随的 `[from: …]` 标记，以便它可以称呼正确的人。
4. 会话级指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）仅适用于该群组的会话；将它们作为单独的消息发送以便它们注册。您的个人 DM 会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群组中发送一个 `@openclaw` ping，并确认引用发件人姓名的回复。
  - 发送第二个 ping，并验证历史记录块已包含在内，然后在下一轮中清除。
- 检查网关日志（使用 `--verbose` 运行）以查看显示 `from: <groupJid>` 和 `[from: …]` 后缀的 `inbound web message` 条目。

## 已知注意事项

- 为了避免嘈杂的广播，故意跳过了群组的心跳信号。
- 回声抑制使用组合批处理字符串；如果您在未提及的情况下两次发送相同的文本，只有第一次会收到响应。
- 会话存储条目将在会话存储中显示为 `agent:<agentId>:whatsapp:group:<jid>`（默认为 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少条目仅表示该群组尚未触发运行。
- 群组中的输入指示器遵循 `agents.defaults.typingMode`（默认：未提及时的 `message`）。

import zh from '/components/footer/zh.mdx';

<zh />
