---
summary: "CLI 参考文档 `openclaw directory` (self, peers, groups)"
read_when:
  - 您想要查找某个渠道的联系人/群组/自身 ID
  - 您正在开发渠道目录适配器
title: "directory"
---

# `openclaw directory`

针对支持该功能的渠道（联系人/对等方、群组和“我”）进行目录查找。

## 通用标志

- `--channel <name>`：渠道 ID/别名（当配置了多个渠道时为必填；仅配置一个时为自动）
- `--account <id>`：账户 ID（默认：渠道默认值）
- `--json`：输出 JSON

## 注意事项

- `directory` 旨在帮助您查找可以粘贴到其他命令（尤其是 `openclaw message send --target ...`）中的 ID。
- 对于许多渠道，结果是基于配置的（允许列表/配置的群组），而不是实时的提供商目录。
- 默认输出为 `id`（有时为 `name`），以制表符分隔；在脚本中使用 `--json`。

## 结合 `message send` 使用结果

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（按渠道）

- WhatsApp：`+15551234567` (私信)，`1234567890-1234567890@g.us` (group)
- Telegram：`@username` 或数字聊天 ID；群组为数字 ID
- Slack：`user:U…` 和 `channel:C…`
- Discord：`user:<id>` 和 `channel:<id>`
- Matrix (plugin)：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams (plugin)：`user:<id>` 和 `conversation:<id>`
- Zalo (plugin)：用户 ID (Bot API)
- Zalo Personal / `zalouser` (plugin)：来自 `zca` (`me`、`friend list`、`group list`) 的会话 ID (私信/群组)

## 自身 ("me")

```bash
openclaw directory self --channel zalouser
```

## 对等方 (联系人/用户)

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

import en from "/components/footer/en.mdx";

<en />
