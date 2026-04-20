---
summary: "WhatsApp 群组消息处理的行为和配置（mentionPatterns 在各平台间共享）"
read_when:
  - Changing group message rules or mentions
title: "群组消息"
---

# 群组消息 (WhatsApp Web 通道)

目标：让 Clawd 停留在 WhatsApp 群组中，仅在收到 ping 时唤醒，并将该对话线程与个人 私信 会话分开。

注意：`agents.list[].groupChat.mentionPatterns` 现在也被 Telegram/Discord/Slack/iMessage 使用；本文档主要关注 WhatsApp 特有的行为。对于多代理设置，请为每个代理设置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局回退）。

## 当前实现 (2025-12-03)

- 激活模式：`mention`（默认）或 `always`。`mention` 需要一次 ping（通过 `mentionedJids` 发起的真实 WhatsApp @提及、安全的正则表达式模式，或文本中任何位置的机器人 E.164 号码）。`always` 会在每条消息时唤醒代理，但它仅应在能提供有意义价值时回复；否则它将返回确切的静默令牌 `NO_REPLY` / `no_reply`。默认值可以在配置（`channels.whatsapp.groups`）中设置，并可通过 `/activation` 按组覆盖。当设置 `channels.whatsapp.groups` 时，它还充当群组允许列表（包含 `"*"` 以允许所有）。
- 群组策略：`channels.whatsapp.groupPolicy` 控制是否接受群组消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退：显式 `channels.whatsapp.allowFrom`）。默认为 `allowlist`（在您添加发送者之前被阻止）。
- 按组划分的会话：会话密钥类似于 `agent:<agentId>:whatsapp:group:<jid>`，因此 `/verbose on`、`/trace on` 或 `/think high` 等命令（作为独立消息发送）的作用域仅限于该组；个人私信状态不受影响。群组线程会跳过心跳检测。
- 上下文注入：未触发运行的“仅待处理”群组消息（默认为 50 条）的前缀会添加在 `[Chat messages since your last reply - for context]` 下，而触发行则位于 `[Current message - respond to this]` 下。已在会话中的消息不会重新注入。
- 发送者显示：每个群组批次现在都以 `[from: Sender Name (+E164)]` 结尾，以便 Pi 知道谁在说话。
- 阅后即焚/一次性查看：我们在提取文本/提及之前会解包这些消息，因此其中的 ping 仍会触发。
- 群组系统提示词：在群组会话的第一轮（以及每当 `/activation` 更改模式时），我们会向系统提示词中注入一段简短的说明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果元数据不可用，我们仍然会告知代理这是一个群组聊天。

## 配置示例 (WhatsApp)

在 `~/.openclaw/openclaw.json` 中添加一个 `groupChat` 块，以便即使 WhatsApp 去除了文本正文中的视觉 `@`，显示名称提及也能正常工作：

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

- 正则表达式不区分大小写，并与其他配置正则表达式表面使用相同的安全正则表达式防护措施；无效的模式和不安全的嵌套重复将被忽略。
- 当有人点击联系人时，WhatsApp 仍会通过 `mentionedJids` 发送标准提及，因此很少需要号码回退，但这是一种有用的安全保障。

### 激活命令（仅限所有者）

使用群组聊天命令：

- `/activation mention`
- `/activation always`

只有所有者号码（来自 `channels.whatsapp.allowFrom`，如果未设置，则为机器人自己的 E.164 号码）可以更改此项。在群组中发送 `/status` 作为独立消息，以查看当前的激活模式。

## 如何使用

1. 将您的 WhatsApp 账户（运行 OpenClaw 的那个）添加到群组中。
2. 说 `@openclaw …`（或包含该号码）。除非您设置了 `groupPolicy: "open"`，否则只有允许列表中的发送者才能触发它。
3. 代理提示词将包含最近的群组上下文以及末尾的 `[from: …]` 标记，以便它能够回复给正确的人。
4. 会话级别的指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）仅适用于该群组的会话；请作为独立消息发送它们以便注册。您的个人私信会话保持独立。

## 测试 / 验证

- 人工冒烟测试：
  - 在群组中发送一个 `@openclaw` ping，并确认回复中引用了发送者名称。
  - 发送第二个 ping，并验证历史记录块是否已包含并在下一轮被清除。
- 检查网关日志（使用 `--verbose` 运行），查看显示 `from: <groupJid>` 和 `[from: …]` 后缀的 `inbound web message` 条目。

## 已知注意事项

- 为了避免嘈杂的广播，群组有意跳过心跳检测。
- 回显抑制使用组合的批次字符串；如果您在不提及的情况下两次发送相同的文本，只有第一条会收到回复。
- 会话存储条目将显示为会话存储（默认为 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）中的 `agent:<agentId>:whatsapp:group:<jid>`；缺少条目仅表示该群组尚未触发运行。
- 群组中的输入指示器遵循 `agents.defaults.typingMode`（默认情况下，未被 @ 时为 `message`）。
