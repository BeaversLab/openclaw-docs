---
summary: "WhatsApp 群组消息处理的行为和配置（mentionPatterns 在各平台间共享）"
read_when:
  - Changing group message rules or mentions
title: "Group messages"
---

目标：让 Clawd 待在 WhatsApp 群组中，仅在收到 ping 时唤醒，并将该线程与个人私信会话分开。

<Note>`agents.list[].groupChat.mentionPatterns` 也被 Telegram、Discord、Slack 和 iMessage 使用。本文档专注于 WhatsApp 特定的行为。对于多代理设置，请为每个代理设置 `agents.list[].groupChat.mentionPatterns`，或将 `messages.groupChat.mentionPatterns` 用作全局回退。</Note>

## 当前实现 (2025-12-03)

- 激活模式：`mention`（默认）或 `always`。`mention` 需要一个 ping（通过 `mentionedJids` 发送的真实 WhatsApp @提及、安全的正则模式或文本中任何位置的 E.164 机器人号码）。`always` 会在每条消息时唤醒代理，但它应仅在能提供有价值回复时回复；否则返回确切的静默令牌 `NO_REPLY` / `no_reply`。可以在配置中设置默认值 (`channels.whatsapp.groups`) 并通过 `/activation` 针对每个群组进行覆盖。当设置了 `channels.whatsapp.groups` 时，它也作为群组允许列表（包含 `"*"` 以允许所有）。
- 群组策略：`channels.whatsapp.groupPolicy` 控制是否接受群组消息 (`open|disabled|allowlist`)。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退：显式 `channels.whatsapp.allowFrom`）。默认为 `allowlist`（在添加发送者之前被阻止）。
- 每个群组的会话：会话密钥类似于 `agent:<agentId>:whatsapp:group:<jid>`，因此诸如 `/verbose on`、`/trace on` 或 `/think high` 之类的命令（作为独立消息发送）仅作用于该群组；个人私信状态不受影响。群组线程跳过心跳检测。
- 上下文注入：*未*触发运行的 **pending-only** 群组消息（默认 50 条）前缀位于 `[Chat messages since your last reply - for context]` 下，触发行位于 `[Current message - respond to this]` 下。会话中已有的消息不会被重新注入。
- 发送者显示：现在每个群组批次都以 `[from: Sender Name (+E164)]` 结束，以便 Pi 知道是谁在发言。
- 阅后即焚/一次性查看：我们在提取文本/提及之前会将其解包，因此其中的 ping 仍然会触发。
- 群组系统提示词：在群组会话的第一轮（以及每当 `/activation` 更改模式时），我们会向系统提示词中注入一段简短的说明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.` 如果元数据不可用，我们仍然会告知代理这是一个群组聊天。

## 配置示例 (WhatsApp)

将 `groupChat` 块添加到 `~/.openclaw/openclaw.json`，以便即使在 WhatsApp 剥离了文本正文中的视觉 `@` 时，显示名称 ping 也能工作：

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

- 正则表达式不区分大小写，并使用与其他配置正则表达式表面相同的安全正则表达式护栏；无效的模式和不安全的嵌套重复将被忽略。
- WhatsApp 仍然会在有人点击联系人时通过 `mentionedJids` 发送规范提及，因此很少需要数字回退，但它是一个有用的安全网。

### 激活命令（仅限所有者）

使用群组聊天命令：

- `/activation mention`
- `/activation always`

只有所有者号码（来自 `channels.whatsapp.allowFrom`，如果未设置则为机器人自己的 E.164 号码）可以更改此设置。在群组中发送 `/status` 作为独立消息以查看当前的激活模式。

## 如何使用

1. 将您的 WhatsApp 账户（运行 OpenClaw 的那个）添加到群组中。
2. 说 `@openclaw …`（或包含号码）。除非您设置 `groupPolicy: "open"`，否则只有列入允许列表的发送者才能触发它。
3. 代理提示词将包含最近的群组上下文以及末尾的 `[from: …]` 标记，以便它可以称呼正确的人。
4. 会话级指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）仅适用于该群组的会话；将它们作为独立消息发送以便它们注册。您的个人私信会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群组中发送一个 `@openclaw` ping 并确认回复引用了发送者名称。
  - 发送第二个 ping 并验证历史记录块是否已包含并在下一轮被清除。
- 检查网关日志（使用 `--verbose` 运行）以查看显示 `from: <groupJid>` 和 `[from: …]` 后缀的 `inbound web message` 条目。

## 已知注意事项

- 有意跳过群组的心跳检测，以避免嘈杂的广播。
- 回声抑制使用组合的批处理字符串；如果您在没有提及的情况下两次发送相同的文本，只有第一次会收到回复。
- 会话存储条目将在会话存储中显示为 `agent:<agentId>:whatsapp:group:<jid>`（默认为 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少条目仅表示该群组尚未触发运行。
- 群组中的输入指示器遵循 `agents.defaults.typingMode`（默认情况下，未被提及时为 `message`）。

## 相关

- [群组](/zh/channels/groups)
- [通道路由](/zh/channels/channel-routing)
- [广播群组](/zh/channels/broadcast-groups)
