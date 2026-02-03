---
summary: "WhatsApp 群消息处理的行为与配置（mentionPatterns 在多端共享）"
read_when:
  - 需要修改群消息规则或 mentions
title: "群组消息"
---
# 群消息（WhatsApp web 频道）

目标：让 Clawd 待在 WhatsApp 群里，只在被点名时唤醒，并保持该线程与个人 DM 会话分离。

说明：`agents.list[].groupChat.mentionPatterns` 也用于 Telegram/Discord/Slack/iMessage；本文聚焦 WhatsApp 特性。多 agent 场景请为每个 agent 配置 `agents.list[].groupChat.mentionPatterns`（或使用 `messages.groupChat.mentionPatterns` 作为全局兜底）。

## 已实现（2025-12-03）
- 激活模式：`mention`（默认）或 `always`。`mention` 需要被点名（真实 WhatsApp @-mentions 通过 `mentionedJids`、正则匹配、或文本中出现机器人 E.164）。`always` 会在每条消息唤醒，但应仅在能提供价值时回复；否则返回静默 token `NO_REPLY`。默认值可在配置中设置（`channels.whatsapp.groups`），并可通过 `/activation` 对单群覆盖。设置 `channels.whatsapp.groups` 时，也充当群 allowlist（使用 `"*"` 允许全部）。
- 群策略：`channels.whatsapp.groupPolicy` 控制是否接受群消息（`open|disabled|allowlist`）。`allowlist` 使用 `channels.whatsapp.groupAllowFrom`（回退到显式 `channels.whatsapp.allowFrom`）。默认是 `allowlist`（不加入允许列表则阻止）。
- 按群会话：session key 形如 `agent:<agentId>:whatsapp:group:<jid>`，因此 `/verbose on` 或 `/think high`（以独立消息发送）仅作用于该群；个人 DM 状态不受影响。群线程会跳过心跳。
- 上下文注入：**仅 pending** 的群消息（默认 50 条）且 *未触发运行* 的，会被放在 `[Chat messages since your last reply - for context]` 前缀块中，触发消息则在 `[Current message - respond to this]` 下。已进入会话的消息不会重复注入。
- 发送者标注：每个群消息批次末尾都会追加 `[from: Sender Name (+E164)]`，便于 Pi 识别发送者。
- 一次性/阅后即焚：在提取文本/mentions 之前会先展开，确保其中的 ping 仍可触发。
- 群系统提示：群会话的首回合（以及 `/activation` 改变模式时）会向系统提示注入简短说明，例如 `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), … Activation: trigger-only … Address the specific sender noted in the message context.`。若无元数据，也会告知是群聊。

## 配置示例（WhatsApp）
在 `~/.openclaw/openclaw.json` 中添加 `groupChat` 块，以便在 WhatsApp 将可视 `@` 从文本体中剥离时仍支持显示名 ping：

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

备注：
- 正则不区分大小写；可覆盖 `@openclaw` 显示名 ping 以及带/不带 `+` 或空格的号码。
- WhatsApp 在有人点击联系人时仍会通过 `mentionedJids` 发送规范 mention，因此号码兜底通常不需要，但作为安全网很有用。

### 激活命令（仅 owner）

使用群聊天命令：
- `/activation mention`
- `/activation always`

只有 owner 号码（来自 `channels.whatsapp.allowFrom`，或未设置时的机器人自身 E.164）可更改。以独立消息在群里发送 `/status` 可查看当前激活模式。

## 使用方法
1) 将运行 OpenClaw 的 WhatsApp 账号加入群。
2) 发送 `@openclaw …`（或包含号码）。除非将 `groupPolicy: "open"`，否则只有 allowlist 发送者能触发。
3) Agent 的提示会包含近期群上下文和尾部 `[from: …]` 标记，以便正确回应发送者。
4) 会话级指令（`/verbose on`、`/think high`、`/new`、`/reset`、`/compact`）仅作用于该群会话；请以独立消息发送以生效。个人 DM 会话保持独立。

## 测试 / 验证
- 手动冒烟：
  - 在群中发送 `@openclaw` 并确认回复中引用了发送者名称。
  - 再发送一次 ping，确认历史块被包含且下一回合清空。
- 检查 gateway 日志（使用 `--verbose` 运行）以查看 `inbound web message` 条目，其中包含 `from: <groupJid>` 与 `[from: …]` 后缀。

## 已知注意事项
- 群聊默认跳过心跳，避免噪音广播。
- Echo 抑制使用合并后的批次字符串；若连续发送相同文本但未 mention，只有第一条会收到回复。
- Session store 中的条目会显示为 `agent:<agentId>:whatsapp:group:<jid>`（默认在 `~/.openclaw/agents/<agentId>/sessions/sessions.json`）；缺失条目仅表示该群尚未触发运行。
- 群内的 typing indicators 遵循 `agents.defaults.typingMode`（未 mention 时默认 `message`）。
