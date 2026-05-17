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
- Gateway(网关) 配置：[配置](<Gateway(网关)/en/gateway/configuration>)

## 常用命令

```bash
openclaw channels list
openclaw channels list --all
openclaw channels status
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
openclaw channels capabilities --channel discord --target channel:<voice-channel-id>
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels logs --channel all
```

`channels list` 仅显示聊天频道：默认显示已配置的帐户，每个帐户带有 `installed`、`configured` 和 `enabled` 状态标签。传递 `--all`OAuthAPI 还可显示尚未配置帐户的捆绑频道以及尚未在磁盘上的可安装目录频道。身份验证提供商（OAuth + API 密钥）和模型提供商使用/配额快照不再在此处打印；请使用 `openclaw models auth list` 查看提供商身份验证配置文件，使用 `openclaw status` 或 `openclaw models list` 查看使用情况。

## 状态 / 功能 / 解析 / 日志

- `channels status`: `--channel <name>`, `--probe`, `--timeout <ms>`, `--json`
- `channels capabilities`: `--channel <name>`, `--account <id>` (仅限 `--channel`), `--target <dest>`, `--timeout <ms>`, `--json`
- `channels resolve`: `<entries...>`, `--channel <name>`, `--account <id>`, `--kind <auto|user|group>`, `--json`
- `channels logs`: `--channel <name|all>`, `--lines <n>`, `--json`

`channels status --probe` 是实时路径：在可访问的 Gateway 上，它运行针对每个账户的 `probeAccount` 和可选的 `auditAccount` 检查，因此输出可以包含传输状态以及探测结果，如 `works`、`probe failed`、`audit ok` 或 `audit failed`。
如果 Gateway 无法访问，`channels status` 将回退到仅配置摘要，而不是实时探测输出。

不要将 `openclaw sessions`Gateway(网关)、Gateway(网关) `sessions.list` 或代理 `sessions_list`DiscordDiscord 工具作为渠道套接字健康信号。这些界面报告的是存储的对话行，而不是提供商运行时状态。在 Discord 提供商重启后，一个已连接但安静的账户可能是健康的，但在下一次入站或出站对话事件之前，不会出现 Discord 会话行。

## 添加 / 删除帐户

```bash
openclaw channels add --channel telegram --token <bot-token>
openclaw channels add --channel nostr --private-key "$NOSTR_PRIVATE_KEY"
openclaw channels remove --channel telegram --delete
```

<Tip>`openclaw channels add --help` 显示每个渠道的标志（token、私钥、应用 token、signal-cli 路径等）。</Tip>

`channels remove` 仅对已安装/配置的渠道插件进行操作。对于可安装的目录渠道，请先使用 `channels add`。
对于运行时支持的渠道插件，`channels remove` 还会请求运行中的 Gateway(网关) 在更新配置之前停止所选账户，从而禁用或删除账户时不会让旧的监听器保持活动状态直到重启。

常见的非交互式添加方式包括：

- bot-token 渠道：`--token`，`--bot-token`，`--app-token`，`--token-file`
- Signal/iMessage 传输字段：`--signal-number`，`--cli-path`，`--http-url`，`--http-host`，`--http-port`，`--db-path`，`--service`，`--region`
- Google Chat 字段：`--webhook-path`，`--webhook-url`，`--audience-type`，`--audience`
- Matrix 字段：`--homeserver`，`--user-id`，`--access-token`，`--password`，`--device-name`，`--initial-sync-limit`
- Nostr 字段：`--private-key`，`--relay-urls`
- Tlon 字段：`--ship`，`--url`，`--code`，`--group-channels`，`--dm-allowlist`，`--auto-discover-channels`
- 如果支持，`--use-env` 用于基于环境变量的默认账户认证

如果在通过标志驱动的添加命令期间需要安装渠道插件，OpenClaw 将使用该渠道的默认安装源，而不会打开交互式插件安装提示。

当您不带标志运行 `openclaw channels add` 时，交互式向导可以提示：

- 每个所选渠道的账户 ID
- 这些账户的可选显示名称
- `Route these channel accounts to agents now?`

如果您确认立即绑定，向导将询问哪个代理应拥有每个已配置的渠道账户，并写入账户范围的路由绑定。

您还可以稍后使用 `openclaw agents bindings`、`openclaw agents bind` 和 `openclaw agents unbind` 来管理相同的路由规则（请参阅 [agents](/zh/cli/agents)）。

当您向仍在使用单账户顶级设置的渠道添加非默认账户时，OpenClaw 会在写入新账户之前将账户范围的顶级值提升到该渠道的账户映射中。大多数渠道将这些值放入 OpenClaw`channels.<channel>.accounts.default`Matrix，但打包渠道可以保留现有的匹配提升账户。Matrix 是当前的示例：如果一个命名账户已存在，或者 `defaultAccount` 指向现有的命名账户，则提升会保留该账户，而不是创建新的 `accounts.default`。

路由行为保持一致：

- 现有的仅渠道绑定（没有 `accountId`）继续匹配默认账户。
- `channels add` 不会在非交互模式下自动创建或重写绑定。
- 交互式设置可以选择性地添加账户范围的绑定。

如果您的配置已经处于混合状态（存在命名账户且仍设置了顶级单账户值），请运行 `openclaw doctor --fix` 将账户范围的值移动到为该渠道选择的提升账户中。大多数渠道会提升到 `accounts.default`Matrix；Matrix 可以保留现有的命名/默认目标。

## 登录和注销（交互式）

```bash
openclaw channels login --channel whatsapp
openclaw channels logout --channel whatsapp
```

- `channels login` 支持 `--verbose`。
- 当仅配置了一个支持的登录目标时，`channels login` 和 `logout` 可以推断出渠道。
- `channels logout`Gateway(网关)Gateway(网关) 在可达时首选实时 Gateway 路径，因此登出会在清除渠道身份验证状态之前停止任何活动的侦听器。如果本地 Gateway 不可达，它将回退到本地身份验证清理。
- 从 gateway 主机上的终端运行 `channels login`。Agent `exec` 会阻止此交互式登录流程；如果可用，应从聊天中使用渠道原生的代理登录工具（例如 `whatsapp_login`）。

## 故障排除

- 运行 `openclaw status --deep` 进行广泛探测。
- 使用 `openclaw doctor` 获取指导性修复。
- `openclaw channels list` 不再打印模型提供商的使用/配额快照。要查看这些信息，请使用 `openclaw status` （概览）或 `openclaw models list` （按提供商查看）。
- 当网关不可达时，`openclaw channels status` 会回退到仅基于配置的摘要。如果支持的渠道凭证是通过 SecretRef 配置的，但在当前命令路径中不可用，它会将该账户报告为已配置，并附带降级说明，而不是显示为未配置。

## 功能探测

获取提供商功能提示（如果有，包括意图/范围）以及静态功能支持：

```bash
openclaw channels capabilities
openclaw channels capabilities --channel discord --target channel:123
```

注意事项：

- `--channel` 是可选的；省略它以列出每个渠道（包括扩展）。
- `--account` 仅在与 `--channel` 一起使用时有效。
- `--target` 接受 `channel:<id>` 或原始数字渠道 ID，且仅适用于 Discord。对于 Discord 语音渠道，权限检查标志缺少 `ViewChannel`、`Connect`、`Speak`、`SendMessages` 和 `ReadMessageHistory`。
- 探测是特定于提供商的：Discord intents + 可选渠道权限；Slack bot + user scopes；Telegram bot 标志 + webhook；Signal 守护进程版本；Microsoft Teams 应用令牌 + Graph roles/scopes（在已知处标注）。没有探测的渠道会报告 `Probe: unavailable`。

## 将名称解析为 ID

使用提供商目录将频道/用户名称解析为 ID：

```bash
openclaw channels resolve --channel slack "#general" "@jane"
openclaw channels resolve --channel discord "My Server/#support" "@someone"
openclaw channels resolve --channel matrix "Project Room"
```

注意事项：

- 使用 `--kind user|group|auto` 强制指定目标类型。
- 当多个条目共享相同名称时，解析优先选择活跃匹配项。
- `channels resolve` 是只读的。如果选定的账户是通过 SecretRef 配置的，但该凭证在当前命令路径中不可用，则命令将返回带有说明的降级未解析结果，而不是中止整个运行。
- `channels resolve` 不会安装渠道插件。在解析可安装目录渠道的名称之前，请使用 `channels add --channel <name>`。

## 相关

- [CLI 参考](/zh/cli)
- [渠道概览](/zh/channels)
