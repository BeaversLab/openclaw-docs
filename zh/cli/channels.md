---
summary: "CLI reference for `openclaw channels` (accounts, status, login/logout, logs)"
read_when:
  - You want to add/remove 渠道 accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage)
  - You want to check 渠道 status or tail 渠道 logs
title: "channels"
---

# `openclaw channels`

Manage chat 渠道 accounts and their runtime status on the Gateway(网关).

Related docs:

- Channel guides: [Channels](/zh/channels/index)
- Gateway(网关) configuration: [Configuration](/zh/gateway/configuration)

## Common commands

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## Add / remove accounts

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

Tip: `openclaw channels add --help` shows per-渠道 flags (token, private key, app token, signal-cli paths, etc).

When you run `openclaw channels add` without flags, the interactive wizard can prompt:

- account ids per selected 渠道
- optional display names for those accounts
- `Bind configured channel accounts to agents now?`

If you confirm bind now, the wizard asks which agent should own each configured 渠道 account and writes account-scoped routing bindings.

You can also manage the same routing rules later with `openclaw agents bindings`, `openclaw agents bind`, and `openclaw agents unbind` (see [agents](/zh/cli/agents)).

When you add a non-default account to a 渠道 that is still using single-account top-level settings (no `channels.<channel>.accounts` entries yet), OpenClaw moves account-scoped single-account top-level values into `channels.<channel>.accounts.default`, then writes the new account. This preserves the original account behavior while moving to the multi-account shape.

Routing behavior stays consistent:

- Existing 渠道-only bindings (no `accountId`) continue to match the default account.
- `channels add` does not auto-create or rewrite bindings in non-interactive mode.
- Interactive setup can optionally add account-scoped bindings.

If your config was already in a mixed state (named accounts present, missing `default`, and top-level single-account values still set), run `openclaw doctor --fix` to move account-scoped values into `accounts.default`.

## Login / logout (interactive)

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

## Troubleshooting

- 运行 `openclaw status --deep` 进行广泛探测。
- 使用 `openclaw doctor` 进行引导式修复。
- `openclaw channels list` 打印 `Claude: HTTP 403 ... user:profile` → 使用情况快照需要 `user:profile` 作用域。使用 `--no-usage`，或提供 claude.ai 会话密钥（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或通过 Claude Code CLI 重新进行身份验证。
- 当网关不可达时，`openclaw channels status` 会回退到仅基于配置的摘要。如果通过 SecretRef 配置了支持的渠道凭据，但在当前命令路径中不可用，它会将该帐户报告为已配置并带有降级说明，而不是显示为未配置。

## 功能探测

获取提供商功能提示（如可用时的意图/作用域）以及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

说明：

- `--channel` 是可选的；省略它以列出每个渠道（包括扩展）。
- `--target` 接受 `channel:<id>` 或原始数字渠道 ID，且仅适用于 Discord。
- 探测特定于提供商：Discord 意图 + 可选渠道权限；Slack 机器人 + 用户作用域；Telegram 机器人标志 + webhook；Signal 守护进程版本；MS Teams 应用令牌 + Graph 角色/作用域（在已知处已注释）。没有探测的渠道将报告 `Probe: unavailable`。

## 将名称解析为 ID

使用提供商目录将渠道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

说明：

- 使用 `--kind user|group|auto` 强制指定目标类型。
- 当多个条目共享相同名称时，解析优先选择活动匹配项。
- `channels resolve` 是只读的。如果所选帐户是通过 SecretRef 配置的，但该凭据在当前命令路径中不可用，则该命令将返回带有说明的降级未解析结果，而不是中止整个运行。

import zh from "/components/footer/zh.mdx";

<zh />
