---
summary: "`openclaw directory` 的 CLI 参考（self、peers、groups）"
read_when:
  - 你想查找某个渠道的联系人/群组/self id
  - 你在开发渠道目录适配器
title: "directory"
---

# `openclaw directory`

对支持目录功能的渠道做查询（联系人/peers、群组，以及“我”）。

## 常用参数

- `--channel <name>`：渠道 id/别名（配置多个渠道时必填；仅有一个渠道时自动选择）
- `--account <id>`：账号 id（默认：渠道默认账号）
- `--json`：输出 JSON

## 说明

- `directory` 用于查找可粘贴到其他命令的 ID（尤其是 `openclaw message send --target ...`）。
- 许多渠道的结果来自配置（allowlist/已配置群组），而非实时 provider 目录。
- 默认输出为 `id`（有时带 `name`），用制表符分隔；脚本使用 `--json`。

## 与 `message send` 联用

```bash
openclaw directory peers list --channel slack --query "U0"
openclaw message send --channel slack --target user:U012ABCDEF --message "hello"
```

## ID 格式（按渠道）

- WhatsApp：`+15551234567`（私聊），`1234567890-1234567890@g.us`（群）
- Telegram：`@username` 或数字 chat id；群为数字 id
- Slack：`user:U…` 与 `channel:C…`
- Discord：`user:<id>` 与 `channel:<id>`
- Matrix（插件）：`user:@user:server`、`room:!roomId:server` 或 `#alias:server`
- Microsoft Teams（插件）：`user:<id>` 与 `conversation:<id>`
- Zalo（插件）：user id（Bot API）
- Zalo Personal / `zalouser`（插件）：`zca` 的 thread id（DM/群） (`me`、`friend list`、`group list`)

## Self（“我”）

```bash
openclaw directory self --channel zalouser
```

## Peers（联系人/用户）

```bash
openclaw directory peers list --channel zalouser
openclaw directory peers list --channel zalouser --query "name"
openclaw directory peers list --channel zalouser --limit 50
```

## Groups（群组）

```bash
openclaw directory groups list --channel zalouser
openclaw directory groups list --channel zalouser --query "work"
openclaw directory groups members --channel zalouser --group-id <id>
```
