---
summary: "通过网关 + CLI 发送投票"
read_when:
  - 添加或修改投票支持
  - 调试从 CLI 或网关发送投票
title: "Polls"
---

# 投票

## 支持的渠道
- WhatsApp（web 渠道）
- Discord
- MS Teams（Adaptive Cards）

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
- `--poll-duration-hours`：仅 Discord（省略时默认 24）

## Gateway RPC

方法：`poll`

参数：
- `to`（string，必填）
- `question`（string，必填）
- `options`（string[]，必填）
- `maxSelections`（number，可选）
- `durationHours`（number，可选）
- `channel`（string，可选，默认：`whatsapp`）
- `idempotencyKey`（string，必填）

## 渠道差异
- WhatsApp：2-12 个选项，`maxSelections` 必须在选项数量范围内，忽略 `durationHours`。
- Discord：2-10 个选项，`durationHours` 会被限制为 1-768 小时（默认 24）。`maxSelections > 1` 启用多选；Discord 不支持严格的“选 N 项”。
- MS Teams：Adaptive Card 投票（由 OpenClaw 管理）。无原生投票 API；`durationHours` 被忽略。

## Agent 工具（Message）
使用 `message` 工具的 `poll` 动作（`to`、`pollQuestion`、`pollOption`，可选 `pollMulti`、`pollDurationHours`、`channel`）。

注意：Discord 没有“必须选 N 项”的模式；`pollMulti` 映射为多选。
Teams 投票以 Adaptive Card 形式渲染，并要求网关保持在线，
以在 `~/.openclaw/msteams-polls.json` 中记录投票。
