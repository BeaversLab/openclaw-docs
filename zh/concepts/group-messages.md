---
summary: "WhatsApp 群消息处理的行为与配置（mentionPatterns 跨表面共享）"
read_when:
  - 修改群消息规则或提及时
---
# 群消息（WhatsApp web channel）

目标：让 Clawd 在 WhatsApp 群里待命，仅在被 ping 时唤醒，并将该线程与个人私聊会话分离。

注意：`agents.list[].groupChat.mentionPatterns` 现在也用于 Telegram/Discord/Slack/iMessage；本文聚焦 WhatsApp 特定行为。对多 agent 场景，请为每个 agent 设置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局兜底）。

## 已实现（2025-12-03）
- 激活模式：`mention`（默认）或 `always`。`mention` 需要触发（真实 WhatsApp @ 提及，经 `mentionedJids`、正则模式或消息文本中的 bot E.164）。`always` 会在每条消息时唤醒 agent，但仅在有价值时回复；否则返回静默 token `NO_REPLY`。默认值可在配置中设置（`channels.whatsapp.groups`），并可通过 `/activation` 按群覆盖。设置了 `channels.whatsapp.groups` 时，它同时充当群 allowlist（包含 `"*"` 表示允许所有）。
- 群策略：`channels.whatsapp.groupPolicy` 控制是否接收群消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（兜底：显式 `channels.whatsapp.allowFrom`）。默认是 `allowlist`（未添加发送者前会阻止）。
- 按群会话：session key 形如 `agent:<agentId>:whatsapp:group:<jid>`，因此 `/verbose on` 或 `/think high`（作为独立消息发送）的作用域是该群；个人私聊状态不受影响。群线程会跳过 heartbeat。
- 上下文注入：**仅待处理**的群消息（默认 50 条）且*未*触发运行的，会被前置到 `[Chat messages since your last reply - for context]`，触发行置于 `[Current message - respond to this]`。已在会话中的消息不会重复注入。
- 发送者呈现：每个群消息批次末尾追加 `[from: Sender Name (+E164)]`，让 Pi 知道谁在说话。
- 临时/阅后即焚：提取文本/mentions 之前会先解包，这样内部的 ping 仍可触发。
- 群 system prompt：在群会话首个回合（以及 `/activation` 改变模式时）会注入短提示，如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.` 若元数据不可用，仍会告知是群聊。

## 配置示例（WhatsApp）

在 `~/.openclaw/openclaw.json` 中加入 `groupChat`，以便 WhatsApp 在文本中去掉可视化 `@` 时仍能识别显示名 ping：

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true }
      }
    }
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: [
            "@?openclaw",
            "\\+?15555550123"
          ]
        }
      }
    ]
  }
}
```

注：
- 正则不区分大小写；覆盖 `@openclaw` 这类显示名 ping，以及带/不带 `+`/空格的原始号码。
- WhatsApp 在点击联系人时仍会通过 `mentionedJids` 发送规范 mention，因此号码兜底很少需要，但它是有用的安全网。

### Activation command（仅 owner）

使用群聊命令：
- `/activation mention`
- `/activation always`

只有 owner 号码（来自 `channels.whatsapp.allowFrom`，或未设置时为 bot 自身的 E.164）可以更改该设置。在群里以独立消息发送 `/status` 可查看当前激活模式。

## 使用方法
1) 将运行 OpenClaw 的 WhatsApp 账号加入群。
2) 发送 `@openclaw …`（或包含号码）。除非设置 `groupPolicy: "open"`，否则仅 allowlist 发送者可触发。
3) Agent 提示会包含近期群上下文 + 结尾的 `[from: …]` 标记，以便正确称呼发送者。
4) 会话级指令（`/verbose on`、`/think high`、`/new` 或 `/reset`、`/compact`）只作用于该群会话；以独立消息发送才能生效。个人私聊会话仍独立。

## 测试 / 验证
- 手工冒烟：
  - 在群里发送 `@openclaw` ping，并确认回复中引用了发送者名字。
  - 再发一次 ping，验证历史块会包含并在下回合清空。
- 查看 gateway 日志（使用 `--verbose`）以确认有 `inbound web message` 记录，且 `from: <groupJid>` 与 `[from: …]` 后缀出现。

## 已知注意事项
- 群聊会跳过 heartbeat 以避免噪声广播。
- 回声抑制使用合并后的批次字符串；若你连续两次发送相同文本但未提及，只有第一次会收到回复。
- 会话存储条目会显示为 `agent:<agentId>:whatsapp:group:<jid>`（默认存储为 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺少条目仅表示该群尚未触发运行。
- 群内输入指示遵循 `agents.defaults.typingMode`（默认：未提及时为 `message`）。
