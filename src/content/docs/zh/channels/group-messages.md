---
summary: "WhatsAppWhatsApp 群组消息处理 — 激活、允许列表、会话和上下文注入"
read_when:
  - Configuring WhatsApp groups specifically
  - Changing WhatsApp activation modes (`mention` vs `always`)
  - Tuning WhatsApp group session keys or pending-message context
title: "WhatsAppWhatsApp 群组消息"
sidebarTitle: "WhatsAppWhatsApp 群组"
---

有关跨渠道群组模型（Discord、iMessage、Matrix、Microsoft Teams、Signal、Slack、Telegram、WhatsApp、Zalo），请参阅[Groups](DiscordiMessageMatrixMicrosoft TeamsSignalSlackTelegramWhatsAppZalo/en/channels/groupsWhatsApp)。本页面介绍基于该模型的 WhatsApp 特定行为：激活、群组允许列表、每群组会话密钥以及待处理消息上下文注入。

目标：让 OpenClaw 待在 WhatsApp 群组中，仅在收到 ping 时唤醒，并将该线程与个人私信会话分开。

<Note>`agents.list[].groupChat.mentionPatterns`TelegramDiscordSlackiMessage 也被 Telegram、Discord、Slack 和 iMessage 使用。对于多代理设置，请按代理进行设置，或者将 `messages.groupChat.mentionPatterns` 作为全局回退选项使用。</Note>

## 行为

- 激活模式：`mention`（默认）或 `always`。`mention`WhatsApp 需要一个 ping（通过 `mentionedJids` 进行的真实 WhatsApp @提及、安全的正则表达式模式，或文本中任何位置的机器人 E.164 号码）。`always` 会在每条消息时唤醒代理，但它应仅在能提供有价值的内容时回复；否则它返回精确的静默令牌 `NO_REPLY` / `no_reply`。可以在配置（`channels.whatsapp.groups`）中设置默认值，并通过 `/activation` 针对每个群组进行覆盖。当设置了 `channels.whatsapp.groups` 时，它也作为群组允许列表（包含 `"*"` 以允许所有）。
- 组策略：`channels.whatsapp.groupPolicy` 控制是否接受组消息 (`open|disabled|allowlist`)。`allowlist` 使用 `channels.whatsapp.groupAllowFrom` (后备：显式 `channels.whatsapp.allowFrom`)。默认为 `allowlist` (在添加发送者之前被阻止)。
- 按组会话：会话键看起来像 `agent:<agentId>:whatsapp:group:<jid>`，因此诸如 `/verbose on`、`/trace on` 或 `/think high` 之类的命令 (作为独立消息发送) 仅作用于该组；个人私信状态不受影响。组线程将跳过心跳检测。
- 上下文注入：**仅待处理** 的组消息 (默认 50 条) 且 _未_ 触发运行的，将以 `[Chat messages since your last reply - for context]` 为前缀，触发行置于 `[Current message - respond to this]` 之下。已在会话中的消息不会被重新注入。
- 发送者显示：现在每个组批次都以 `[from: Sender Name (+E164)]` 结尾，以便 Pi 知道谁在说话。
- 阅后即焚/一次性查看：我们在提取文本/提及之前会解包这些消息，因此其中的 ping 仍然会触发。
- 组系统提示词：在组会话的第一轮 (以及每当 `/activation` 更改模式时)，我们会向系统提示词中注入一段简短的说明，如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), ... Activation: trigger-only ... Address the specific sender noted in the message context.`。如果元数据不可用，我们仍然会告知代理这是一个群聊。

## 配置示例 (WhatsApp)

在 `~/.openclaw/openclaw.json` 中添加一个 `groupChat` 块，以便即使 WhatsApp 剥离了正文中的视觉 `@`，显示名称 ping 也能正常工作：

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

注意：

- 正则表达式不区分大小写，并且与其他配置正则表达式表面使用相同的安全正则表达式保护措施；无效的模式和不安全的嵌套重复将被忽略。
- 当有人点击联系人时，WhatsApp 仍然会通过 `mentionedJids` 发送标准提及，因此数字后备很少需要，但这是一个有用的安全网。

### 激活命令 (仅所有者)

使用群聊命令：

- `/activation mention`
- `/activation always`

只有所有者号码（来自 `channels.whatsapp.allowFrom`，如果未设置则为机器人自己的 E.164 号码）可以更改此设置。在群组中单独发送 `/status` 以查看当前的激活模式。

## 如何使用

1. 将您的 WhatsApp 账号（运行 OpenClaw 的那个）添加到群组中。
2. 说 `@openclaw …`（或包含该号码）。除非您设置了 `groupPolicy: "open"`，否则只有列入白名单的发送者才能触发它。
3. Agent 提示词将包含最近的群组上下文以及尾随的 `[from: …]` 标记，以便它可以回复正确的人。
4. 会话级指令（`/verbose on`、`/trace on`、`/think high`、`/new` 或 `/reset`、`/compact`）仅适用于该群组的会话；请将它们作为单独的消息发送以便注册。您的个人私信会话保持独立。

## 测试 / 验证

- 手动冒烟测试：
  - 在群组中发送一个 `@openclaw` ping，并确认收到引用发送者姓名的回复。
  - 发送第二个 ping 并验证历史记录块是否已包含并在下一轮被清除。
- 检查网关日志（使用 `--verbose` 运行），查看显示 `from: <groupJid>` 和 `[from: …]` 后缀的 `inbound web message` 条目。

## 已知注意事项

- 为了避免嘈杂的广播，故意跳过群组的心跳。
- 回声抑制使用组合的批次字符串；如果您在没有提及的情况下两次发送相同的文本，只有第一个会收到回复。
- 会话存储条目将显示为 `agent:<agentId>:whatsapp:group:<jid>` 在会话存储中（默认为 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少条目仅表示该群组尚未触发运行。
- 群组中的正在输入指示符遵循 `agents.defaults.typingMode`。当可见回复选择了仅消息工具模式时，默认情况下立即开始输入，以便群组成员即使在没有发布自动最终回复的情况下也能看到代理正在工作。显式的输入模式配置仍然优先。

## 相关

- [Groups](/zh/channels/groups)
- [Channel routing](/zh/channels/channel-routing)
- [广播群组](/zh/channels/broadcast-groups)
