---
summary: "通过 Gateway + CLI 发送 Poll"
read_when:
  - "Adding or modifying poll support"
  - "Debugging poll sends from the CLI or gateway"
title: "Polls"
---

# Polls

## 支持的频道

- WhatsApp (web 频道)
- Discord
- MS Teams (自适应卡片)

## CLI

```bash
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

# MS Teams
openclaw message poll --channel msteams --target conversation:19:abc@thread.tacv2 \
  --poll-question "Lunch?" --poll-option "Pizza" --poll-option "Sushi"
```

选项：

- `--channel`：`whatsapp`（默认）、`discord` 或 `msteams`
- `--poll-multi`：允许多选
- `--poll-duration-hours`：仅 Discord（省略时默认为 24）

## Gateway RPC

方法：`poll`

参数：

- `to`（字符串，必需）
- `question`（字符串，必需）
- `options`（字符串数组，必需）
- `maxSelections`（数字，可选）
- `durationHours`（数字，可选）
- `channel`（字符串，可选，默认：`whatsapp`）
- `idempotencyKey`（字符串，必需）

## 频道差异

- WhatsApp：2-12 个选项，`maxSelections` 必须在选项数量内，忽略 `durationHours`。
- Discord：2-10 个选项，`durationHours` 限制为 1-768 小时（默认 24）。`maxSelections > 1` 启用多选；Discord 不支持严格的选择计数。
- MS Teams：自适应卡片 Poll（由 OpenClaw 管理）。没有原生 Poll API；`durationHours` 被忽略。

## 代理工具 (Message)

使用 `message` 工具，执行 `poll` 操作（`to`、`pollQuestion`、`pollOption`、可选 `pollMulti`、`pollDurationHours`、`channel`）。

注意：Discord 没有"恰好选择 N 个"模式；`pollMulti` 映射到多选。
Teams Poll 渲染为自适应卡片，需要 Gateway 保持在线状态
才能在 `~/.openclaw/msteams-polls.json` 中记录投票。
