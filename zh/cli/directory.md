---
summary: "`openclaw directory`（自己、对等方、群组）的 CLI 参考"
read_when:
  - You want to look up contacts/groups/self ids for a channel
  - You are developing a channel directory adapter
title: "directory"
---

# `openclaw directory`

针对支持该功能的渠道（联系人/对等方、群组和“我”）进行的目录查找。

## 通用标志

- `--channel <name>`：渠道 ID/别名（配置了多个渠道时必填；仅配置一个时自动选择）
- `--account <id>`：账户 ID（默认：渠道默认值）
- `--json`：输出 JSON

## 注意事项

- `directory` 旨在帮助您找到可以粘贴到其他命令（尤其是 `openclaw message send --target ...`）中的 ID。
- 对于许多渠道，结果是基于配置的（允许列表/已配置群组），而不是实时的提供商目录。
- 默认输出为 `id`（有时也包括 `name`），以制表符分隔；在脚本中使用 `--json`。

## 将结果与 `message send` 配合使用

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（按渠道）

- WhatsApp：`+15551234567`（私信），`1234567890-1234567890@g.us`（群组）
- Telegram：`@username` 或数字聊天 ID；群组为数字 ID
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix (插件)：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams (插件)：`user:<id>` 和 `conversation:<id>`
- Zalo (插件)：user id (Bot API)
- Zalo Personal / `zalouser` (插件)：来自 `zca` 的线程 ID (私信/群组) (`me`、`friend list`、`group list`)

## 自己（“我”）

```bash
openclaw directory self --channel zalouser
```

## 对等方（联系人/用户）

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

import zh from '/components/footer/zh.mdx';

<zh />
