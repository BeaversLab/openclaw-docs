---
summary: " `openclaw channels` 的 CLI 参考（账户、状态、登录/登出、日志）"
read_when:
  - You want to add/remove channel accounts (WhatsApp/Telegram/Discord/Google Chat/Slack/Mattermost (plugin)/Signal/iMessage/Matrix)
  - You want to check channel status or tail channel logs
title: "渠道"
---

# `openclaw channels`

管理 Gateway(网关) 网关 上的聊天通道账户及其运行时状态。

相关文档：

- 渠道指南：[渠道](/zh/channels)
- Gateway(网关) 配置：[Configuration](/zh/gateway/configuration)

## 常用命令

```bash
openclaw channels list
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

## 状态 / 功能 / 解析 / 日志

- `channels status`: `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities`: `--channel <name>`, `--account <id>` (仅限 `--channel`), `--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve`: `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs`: `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` 是实时路径：在可达的 Gateway(网关) 上，它会针对每个帐户运行
`probeAccount` 和可选的 `auditAccount` 检查，因此输出可能包含传输
状态以及探测结果，例如 `works`、`probe failed`、`audit ok` 或 `audit failed`。
如果 Gateway(网关) 不可达，`channels status` 将回退到仅配置摘要
而不是实时探测输出。

## 添加 / 删除帐户

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>`openclaw channels add --help` 显示每个渠道的标志（令牌、私钥、应用令牌、signal-cli 路径等）。</Tip>

常见的非交互式添加界面包括：

- 机器人令牌渠道：`--token`、`--bot-token`、`--app-token`、`--token-file`
- Signal/iMessage 传输字段：`--signal-number`、`--cli-path`、`--http-url`、`--http-host`、`--http-port`、`--db-path`、`--service`、`--region`
- Google Chat 字段：`--webhook-path`，`--webhook-url`，`--audience-type`，`--audience`
- Matrix 字段：`--homeserver`，`--user-id`，`--access-token`，`--password`，`--device-name`，`--initial-sync-limit`
- Nostr 字段：`--private-key`，`--relay-urls`
- Tlon 字段：`--ship`，`--url`，`--code`，`--group-channels`，`--dm-allowlist`，`--auto-discover-channels`
- 如果支持，`--use-env` 用于基于默认账户环境变量的身份验证

如果在通过标志驱动的添加命令期间需要安装渠道插件，OpenClaw 将使用该渠道的默认安装源，而不会打开交互式插件安装提示。

当您不带标志运行 `openclaw channels add` 时，交互式向导可能会提示：

- 每个所选渠道的账号 ID
- 这些账号的可选显示名称
- `Bind configured channel accounts to agents now?`

如果您确认立即绑定，向导会询问哪个代理应拥有每个配置的渠道账号，并写入账号范围的路由绑定。

您稍后也可以使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 来管理相同的路由规则（参见 [agents](/zh/cli/agents)）。

当您向仍在使用单账号顶级设置的渠道添加非默认账号时，OpenClaw 会在写入新账号之前将账号范围的顶级值提升到该渠道的账号映射中。大多数渠道将这些值放入 `channels.<channel>.accounts.default`，但打包渠道可以保留现有的匹配提升账号。Matrix 是当前的示例：如果已存在一个命名账号，或者 `defaultAccount` 指向现有的命名账号，则提升操作将保留该账号，而不是创建新的 `accounts.default`。

路由行为保持一致：

- 现有的仅渠道绑定（没有 `accountId`）继续匹配默认账号。
- `channels add` 不会在非交互模式下自动创建或重写绑定。
- 交互式设置可以选择性地添加账号范围的绑定。

如果您的配置已经处于混合状态（存在命名账号且仍设置了顶级单账号值），请运行 `openclaw doctor --fix` 将账号范围的值移动到为该渠道选择的提升账号中。大多数渠道提升到 `accounts.default`；Matrix 可以保留现有的命名/默认目标。

## 登录和注销（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` 支持 `--verbose`。
- 当仅配置了一个支持的登录目标时，`channels login` 和 `logout` 可以推断渠道。

## 故障排除

- 运行 `openclaw status --deep` 进行广泛的探测。
- 使用 `openclaw doctor` 获取引导式修复。
- `openclaw channels list` 打印 `Claude: HTTP 403 ... user:profile` → 使用快照需要 `user:profile` 范围。使用 `--no-usage`，或提供 claude.ai 会话密钥（`CLAUDE_WEB_SESSION_KEY` / `CLAUDE_WEB_COOKIE`），或通过 Claude CLI 重新认证。
- 当网关无法访问时，`openclaw channels status` 会回退到仅配置摘要。如果支持的渠道凭证通过 SecretRef 配置但在当前命令路径中不可用，它会将该帐户报告为已配置但带有降级说明，而不是显示为未配置。

## 功能探测

获取提供商功能提示（可用的意图/范围）以及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

注意：

- `--channel` 是可选的；省略它以列出每个渠道（包括扩展）。
- `--account` 仅在与 `--channel` 一起使用时有效。
- `--target` 接受 `channel:<id>` 或原始数字渠道 ID，且仅适用于 Discord。
- 探测是特定于提供商的：Discord 意图 + 可选的渠道权限；Slack 机器人 + 用户范围；Telegram 机器人标志 + webhook；Signal 守护程序版本；Microsoft Teams 应用令牌 + Graph 角色/范围（在已知处进行了注释）。没有探测的渠道报告 `Probe: unavailable`。

## 将名称解析为 ID

使用提供商目录将渠道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

注意：

- 使用 `--kind user|group|auto` 强制指定目标类型。
- 当多个条目共享相同的名称时，解析优先选择活动匹配项。
- `channels resolve` 是只读的。如果所选的账户是通过 SecretRef 配置的，但该凭据在当前命令路径中不可用，则该命令会返回带有注释的降级未解析结果，而不是中止整个运行。

## 相关

- [CLI 参考](/zh/cli)
- [渠道概览](/zh/channels)
