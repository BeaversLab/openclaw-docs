---
summary: "`openclaw directory` 的 CLI 参考（self、peers、groups）"
read_when:
  - "You want to look up contacts/groups/self ids for a channel"
  - "You are developing a channel directory adapter"
title: "directory"
---

# `openclaw directory`

支持目录查询的频道（联系人/peers、群组和"我"）。

## 常用标志

- `--channel <name>`：频道 id/alias（配置多个频道时必需；仅配置一个时自动选择）
- `--account <id>`：账号 id（默认：频道默认值）
- `--json`：输出 JSON

## 说明

- `directory` 旨在帮助你找到可以粘贴到其他命令中的 ID（尤其是 `openclaw message send --target ...`）。
- 对于许多频道，结果基于配置（allowlists / 配置的群组）而非实时的 provider 目录。
- 默认输出为 `id`（有时也包括 `name`），以制表符分隔；使用 `--json` 进行脚本操作。

## 将结果与 `message send` 一起使用

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（按频道）

- WhatsApp：`+15551234567`（DM）、`1234567890-1234567890@g.us`（群组）
- Telegram：`@username` 或数字聊天 id；群组为数字 id
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix（插件）：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams（插件）：`user:<id>` 和 `conversation:<id>`
- Zalo（插件）：user id（Bot API）
- Zalo Personal / `zalouser`（插件）：来自 `zca` 的 thread id（DM/群组）（`me`、`friend list`、`group list`）

## 自身（"我"）

```bash
openclaw directory self --channel zalouser
```

## Peers（联系人/用户）

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## 群组

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```

