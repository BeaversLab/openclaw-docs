---
summary: "`openclaw channels` 的 CLI 参考（账户、状态、登录/登出、日志）"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage)
  - You want to check channel status or tail channel logs
title: "通道"
---

# `openclaw channels`

管理网关上的聊天通道账户及其运行时状态。

相关文档：

- 通道指南：[通道](/zh/en/channels/index)
- 网关配置：[配置](/zh/en/gateway/configuration)

## 常用命令

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## 添加 / 移除账户

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels remove --channel telegram --delete
```

提示：`openclaw channels add --help` 显示各通道的标志（令牌、应用令牌、signal-cli 路径等）。

当您不带标志运行 `openclaw channels add` 时，交互式向导可能会提示：

- 每个选定通道的账户 ID
- 这些账户的可选显示名称
- `Bind configured channel accounts to agents now?`

如果您确认现在绑定，向导会询问每个已配置的通道账户应由哪个代理拥有，并写入账户范围的路由绑定。

您稍后也可以使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 管理相同的路由规则（请参阅 [代理](/zh/en/cli/agents)）。

当您向仍在使用单账户顶级设置（尚未有 `channels.<channel>.accounts` 条目）的通道添加非默认账户时，OpenClaw 会将账户范围的单账户顶级值移动到 `channels.<channel>.accounts.default` 中，然后写入新账户。这在转移到多账户形式的同时保留了原始账户行为。

路由行为保持一致：

- 现有的仅通道绑定（没有 `accountId`）继续匹配默认账户。
- `channels add` 不会在非交互模式下自动创建或重写绑定。
- 交互式设置可以选择性地添加账户范围的绑定。

如果您的配置已经处于混合状态（存在命名账户，缺少 `default`，并且仍设置了顶级单账户值），请运行 `openclaw doctor --fix` 将账户范围的值移动到 `accounts.default` 中。

## 登录 / 登出（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## 故障排除

- 运行 `openclaw status --deep` 进行广泛探测。
- 使用 `openclaw doctor` 进行引导式修复。
- `openclaw channels list` 打印 `Claude: HTTP 403 ... user:profile` → 使用快照需要 `user:profile` 作用域。请使用 `--no-usage`，或者提供 claude.ai 会话密钥（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或者通过 Claude Code CLI 重新进行身份验证。
- 当网关无法访问时，`openclaw channels status` 会回退到仅配置摘要。如果受支持的渠道凭据是通过 SecretRef 配置的，但在当前命令路径中不可用，它会将该帐户报告为已配置但带有降级说明，而不是显示为未配置。

## 功能探测

获取提供商功能提示（可用时包含 intents/scopes）以及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

说明：

- `--channel` 是可选的；省略它以列出每个渠道（包括扩展）。
- `--target` 接受 `channel:<id>` 或原始数字渠道 ID，且仅适用于 Discord。
- 探测是特定于提供商的：Discord intents + 可选渠道权限；Slack bot + user scopes；Telegram bot flags + webhook；Signal daemon 版本；MS Teams app token + Graph roles/scopes（在已知处标注）。没有探测的渠道报告 `Probe: unavailable`。

## 将名称解析为 ID

使用提供商目录将渠道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

说明：

- 使用 `--kind user|group|auto` 强制指定目标类型。
- 当多个条目共享相同名称时，解析优先考虑活动匹配项。
- `channels resolve` 是只读的。如果所选帐户是通过 SecretRef 配置的，但该凭据在当前命令路径中不可用，该命令将返回带有说明的降级未解析结果，而不是中止整个运行。
