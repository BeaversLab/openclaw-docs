---
summary: "WhatsApp 群组消息处理的行为与配置（mentionPatterns 在各平台间共享）"
read_when:
  - Changing group message rules or mentions
title: "群组消息"
---

# 群组消息（WhatsApp Web 通道）

目标：让 Clawd 加入 WhatsApp 群组，仅在收到呼叫时唤醒，并将该会话线程与个人 私信 会话分离开来。

注意：`agents.list[].groupChat.mentionPatterns` 现在也用于 Telegram/Discord/Slack/iMessage；本文档侧重于 WhatsApp 特有的行为。对于多代理设置，请为每个代理设置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局后备）。

## 已实现功能（2025-12-03）

- 激活模式：`mention`（默认）或 `always`。`mention` 需要一次 ping（通过 `mentionedJids` 进行的真实 WhatsApp @提及、正则表达式模式，或文本中任何位置的机器人 E.164 号码）。`always` 会在每条消息时唤醒代理，但它仅当能提供有价值的内容时才回复；否则返回静默令牌 `NO_REPLY`。默认值可在配置（`channels.whatsapp.groups`）中设置，并通过 `/activation` 按组覆盖。当设置 `channels.whatsapp.groups` 时，它还作为群组允许列表（包含 `"*"` 以允许所有）。
- 群组策略：`channels.whatsapp.groupPolicy` 控制是否接受群组消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（后备：显式 `channels.whatsapp.allowFrom`）。默认为 `allowlist`（在您添加发送者之前阻止）。
- 按组的会话：会话键类似于 `agent:<agentId>:whatsapp:group:<jid>`，因此诸如 `/verbose on` 或 `/think high`（作为独立消息发送）之类的命令仅限于该群组；个人 私信 状态不受影响。群组线程跳过心跳。
- 上下文注入：未触发运行的**仅待处理**群组消息（默认为 50 条）将作为前缀注入到 `[Chat messages since your last reply - for context]` 下，触发行则置于 `[Current message - respond to this]` 下。已在会话中的消息不会重新注入。
- 发送者标识：每个群组批次现在都以 `[from: Sender Name (+E164)]` 结束，以便 Pi 知道谁在说话。
- 阅后即焚/一次性查看：在提取文本/提及之前我们会解包这些消息，因此其中的 ping 仍然会触发。
- 群组系统提示词：在群组会话的第一轮（以及每当 `/activation` 更改模式时），我们会向系统提示词中注入一段简短的说明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。如果元数据不可用，我们仍然会告知 Agent 这是一个群组聊天。

## 配置示例 (WhatsApp)

向 `~/.openclaw/openclaw.json` 添加一个 `groupChat` 块，以便即使 WhatsApp 在文本正文中去除了视觉上的 `@`，显示名称的提及仍然有效：

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

- 正则表达式不区分大小写；它们涵盖诸如 `@openclaw` 之类的显示名称提及，以及带或不带 `+`/空格的原始号码。
- 当有人点击联系人时，WhatsApp 仍会通过 `mentionedJids` 发送标准提及，因此很少需要号码作为后备，但这不失为一个有用的安全保障。

### 激活命令（仅限所有者）

使用群聊命令：

- `/activation mention`
- `/activation always`

只有所有者号码（来自 `channels.whatsapp.allowFrom`，如果未设置则为机器人自己的 E.164 号码）可以更改此设置。在群组中发送 `/status` 作为一条独立消息，以查看当前的激活模式。

## 如何使用

1. 将您的 WhatsApp 账户（运行 OpenClaw 的那个）添加到群组中。
2. 说 `@openclaw …`（或包含该号码）。除非您设置了 `groupPolicy: "open"`，否则只有列入白名单的发送者才能触发它。
3. Agent 提示词将包含最近的群组上下文以及末尾的 `[from: …]` 标记，以便它能够称呼正确的人。
4. 会话级指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）仅适用于该群组的会话；请将其作为独立消息发送以便注册。您的个人私信会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群组中发送一个 `@openclaw` ping，并确认回复中引用了发送者名称。
  - 发送第二个 ping 并验证历史记录块已包含在内，并在下一轮被清除。
- 检查网关日志（使用 `--verbose` 运行）以查看 `inbound web message` 条目，这些条目显示 `from: <groupJid>` 和 `[from: …]` 后缀。

## 已知注意事项

- 为了避免嘈杂的广播，有意跳过群组的心跳检测。
- 回显抑制使用合并的批处理字符串；如果您在没有提及的情况下发送两次相同的文本，只有第一个会收到回复。
- 会话存储条目将在会话存储中显示为 `agent:<agentId>:whatsapp:group:<jid>`（默认为 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少条目仅表示该群组尚未触发运行。
- 群组中的正在输入指示器遵循 `agents.defaults.typingMode`（默认情况下，未被提及时为 `message`）。

import zh from '/components/footer/zh.mdx';

<zh />
