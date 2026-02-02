---
summary: "`openclaw channels` 的 CLI 参考（账号、状态、登录/登出、日志）"
read_when:
  - 你想添加/删除渠道账号（WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost（插件）/Signal/iMessage）
  - 你想查看渠道状态或追踪渠道日志
title: "channels"
---

# `openclaw channels`

管理 Gateway 上的聊天渠道账号及其运行状态。

相关文档：
- 渠道指南：[Channels](/zh/channels/index)
- Gateway 配置：[Configuration](/zh/gateway/configuration)

## 常用命令

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## 添加 / 删除账号

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels remove --channel telegram --delete
```

提示：`openclaw channels add --help` 可查看各渠道参数（token、app token、signal-cli 路径等）。

## 登录 / 登出（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## 故障排查

- 运行 `openclaw status --deep` 获取全面探测。
- 使用 `openclaw doctor` 获取引导式修复。
- `openclaw channels list` 显示 `Claude: HTTP 403 ... user:profile` → usage snapshot 需要 `user:profile` scope。可使用 `--no-usage`，或提供 claude.ai 会话 key（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或通过 Claude Code CLI 重新认证。

## 能力探测

获取 provider 能力提示（可用 intents/scopes）+ 静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

说明：
- `--channel` 可选；省略则列出所有渠道（含扩展）。
- `--target` 支持 `channel:<id>` 或纯数字 channel id，仅适用于 Discord。
- 探测为 provider 定制：Discord intents + 可选频道权限；Slack bot + user scopes；Telegram bot 标记 + webhook；Signal daemon 版本；MS Teams app token + Graph 角色/scopes（已知信息会标注）。无探测的渠道会显示 `Probe: unavailable`。

## 解析名称为 ID

使用 provider 目录解析频道/用户名称为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

说明：
- 使用 `--kind user|group|auto` 强制目标类型。
- 当名称有多个匹配时，优先选择活跃匹配。
