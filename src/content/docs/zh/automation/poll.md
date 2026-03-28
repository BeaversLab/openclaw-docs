---
summary: "通过网关 + CLI 发送投票"
read_when:
  - Adding or modifying poll support
  - Debugging poll sends from the CLI or gateway
title: "投票"
---

# 投票

## 支持的频道

- Telegram
- WhatsApp（网页频道）
- Discord
- Microsoft Teams (Adaptive Cards)

## CLI

```bash
# Telegram
openclaw message poll --channel telegram --target 123456789 \
  --poll-question "Ship it?" --poll-option "Yes" --poll-option "No"
openclaw message poll --channel telegram --target -1001234567890:topic:42 \
  --poll-question "Pick a time" --poll-option "10am" --poll-option "2pm" \
  --poll-duration-seconds 300

# WhatsApp
openclaw message poll --target +15555550123 \
  --poll-question "Lunch today?" --poll-option "Yes" --poll-option "No" --poll-option "Maybe"
openclaw message poll --target 123456789@g.us \
  --poll-question "Meeting time?" --poll-option "10am" --poll-option "2pm" --poll-option "4pm" --poll-multi

# Discord
openclaw message poll --channel discord --target channel:123456789 \
  --poll-question "Snack?" --poll-option "Pizza" --poll-option "Sushi"
openclaw message poll --channel discord --target channel:123456789 \
  --poll-question "Plan?" --poll-option "A" --poll-option "B" --poll-duration-hours 48

# Microsoft Teams
openclaw message poll --channel msteams --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" --poll-option "Pizza" --poll-option "Sushi"
```

选项：

- `--channel`：`whatsapp`（默认）、`telegram`、`discord` 或 `msteams`
- `--poll-multi`：允许选择多个选项
- `--poll-duration-hours`：仅限 Discord（省略时默认为 24）
- `--poll-duration-seconds`：仅限 Telegram（5-600 秒）
- `--poll-anonymous` / `--poll-public`：仅限 Telegram 的投票可见性

## Gateway 网关 RPC

方法：`poll`

参数：

- `to`（字符串，必需）
- `question`（字符串，必需）
- `options`（字符串[]，必需）
- `maxSelections`（数字，可选）
- `durationHours`（数字，可选）
- `durationSeconds`（数字，可选，仅限 Telegram）
- `isAnonymous`（布尔值，可选，仅限 Telegram）
- `channel`（字符串，可选，默认：`whatsapp`）
- `idempotencyKey`（字符串，必需）

## 频道差异

- Telegram：2-10 个选项。通过 `threadId` 或 `:topic:` 目标支持论坛主题。使用 `durationSeconds` 代替 `durationHours`，限制为 5-600 秒。支持匿名和公开投票。
- WhatsApp：2-12 个选项，`maxSelections` 必须在选项数量范围内，忽略 `durationHours`。
- Discord：2-10 个选项，`durationHours` 限制为 1-768 小时（默认 24）。`maxSelections > 1` 启用多选；Discord 不支持严格的选择数量。
- Microsoft Teams：Adaptive Card 投票（OpenClaw 托管）。没有原生投票 API；`durationHours` 被忽略。

## 代理工具（消息）

使用带有 `poll` 动作的 `message` 工具（`to`、`pollQuestion`、`pollOption`、可选的 `pollMulti`、`pollDurationHours`、`channel`）。

对于 Telegram，该工具还接受 `pollDurationSeconds`、`pollAnonymous` 和 `pollPublic`。

使用 `action: "poll"` 进行投票创建。通过 `action: "send"` 传递的投票字段将被拒绝。

注意：Discord 没有“恰好选择 N 个”模式；`pollMulti` 映射到多选模式。
Teams 投票呈现为自适应卡片（Adaptive Cards），并要求网关保持在线状态
以便在 `~/.openclaw/msteams-polls.json` 中记录投票。
