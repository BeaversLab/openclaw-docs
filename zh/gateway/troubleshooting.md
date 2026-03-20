---
summary: "针对Gateway(网关)、渠道、自动化、节点和浏览器的深度故障排除手册"
read_when:
  - 故障排除中心将您指向此处进行更深入的诊断
  - 您需要包含确切命令的基于稳定症状的手册章节
title: "故障排除"
---

# Gateway(网关) 故障排除

本页面是深度手册。
如果您想先进行快速分诊流程，请从 [/help/故障排除](/zh/help/troubleshooting) 开始。

## 命令阶梯

首先按以下顺序运行这些命令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

预期的健康信号：

- `openclaw gateway status` 显示 `Runtime: running` 和 `RPC probe: ok`。
- `openclaw doctor` 报告没有阻碍性的配置/服务问题。
- `openclaw channels status --probe` 显示已连接/就绪的渠道。

## Anthropic 429 长上下文需要额外使用量

当日志/错误包含以下内容时使用此方法：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查找：

- 选定的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 当前的 Anthropic 凭证不符合长上下文使用的条件。
- 请求仅在需要 1M beta 路径的长会话/模型运行上失败。

修复选项：

1. 禁用该模型的 `context1m` 以回退到普通上下文窗口。
2. 使用带有计费的 Anthropic API 密钥，或者在订阅账户上启用 Anthropic 额外使用量。
3. 配置回退模型，以便当 Anthropic 长上下文请求被拒绝时继续运行。

相关：

- [/providers/anthropic](/zh/providers/anthropic)
- [/reference/token-use](/zh/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/zh/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 无回复

如果渠道已启动但没有响应，请在重新连接任何内容之前检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

查找：

- 私信发送者正在等待配对。
- 群组提及拦截 (`requireMention`, `mentionPatterns`)。
- 渠道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 群组消息被忽略，直到被提及。
- `pairing request` → 发送者需要批准。
- `blocked` / `allowlist` → 发送者/渠道被策略过滤。

相关：

- [/channels/故障排除](/zh/channels/troubleshooting)
- [/channels/pairing](/zh/channels/pairing)
- [/channels/groups](/zh/channels/groups)

## 仪表板控制 UI 连接性

当仪表板/控制 UI 无法连接时，请验证 URL、身份验证模式和安全上下文假设。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

查找：

- 正确的探针 URL 和仪表板 URL。
- 客户端和网关之间的身份验证模式/令牌不匹配。
- 需要设备身份的 HTTP 使用情况。

常见特征：

- `device identity required` → 非安全上下文或缺少设备身份验证。
- `device nonce required` / `device nonce mismatch` → 客户端未完成
  基于质询的设备身份验证流程（`connect.challenge` + `device.nonce`）。
- `device signature invalid` / `device signature expired` → 客户端为当前握手
  签署了错误的有效负载（或时间戳过时）。
- `AUTH_TOKEN_MISMATCH` 且 `canRetryWithDeviceToken=true` → 客户端可以使用缓存的设备令牌执行一次受信任的重试。
- 该重试后重复出现 `unauthorized` → 共享令牌/设备令牌漂移；刷新令牌配置并在需要时重新批准/轮换设备令牌。
- `gateway connect failed:` → 错误的主机/端口/URL 目标。

### 身份验证详细代码快速映射

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| 详细代码                  | 含义                                                  | 建议的操作                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享令牌。             | 在客户端中粘贴/设置令牌并重试。对于仪表板路径：`openclaw config get gateway.auth.token`，然后粘贴到控制 UI 设置中。                          |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关身份验证令牌不匹配。           | 如果 `canRetryWithDeviceToken=true`，则允许一次受信任的重试。如果仍然失败，请运行[令牌漂移恢复检查清单](/zh/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的每设备令牌已过时或已被吊销。             | 使用 [devices CLI](/zh/cli/devices) 轮换/重新批准设备令牌，然后重新连接。                                                                                    |
| `PAIRING_REQUIRED`           | 设备身份已知，但未获批准用于此角色。 | 批准待处理的请求：`openclaw devices list` 然后 `openclaw devices approve <requestId>`。                                                                        |

设备身份验证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示 nonce/签名错误，请更新连接的客户端并验证它：

1. 等待 `connect.challenge`
2. 对绑定挑战的负载进行签名
3. 使用相同的挑战 nonce 发送 `connect.params.device.nonce`

相关：

- [/web/control-ui](/zh/web/control-ui)
- [/gateway/authentication](/zh/gateway/authentication)
- [/gateway/remote](/zh/gateway/remote)
- [/cli/devices](/zh/cli/devices)

## Gateway 服务未运行

当服务已安装但进程无法保持运行时使用此方法。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep
```

查找：

- 带有退出提示的 `Runtime: stopped`。
- 服务配置不匹配 (`Config (cli)` vs `Config (service)`)。
- 端口/监听器冲突。

常见特征：

- `Gateway start blocked: set gateway.mode=local` → 未启用本地 gateway 模式。修复方法：在配置中设置 `gateway.mode="local"`（或运行 `openclaw configure`）。如果您通过 Podman 使用专用的 `openclaw` 用户运行 OpenClaw，则配置文件位于 `~openclaw/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 在没有令牌/密码的情况下进行非回环绑定。
- `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。

相关：

- [/gateway/background-process](/zh/gateway/background-process)
- [/gateway/configuration](/zh/gateway/configuration)
- [/gateway/doctor](/zh/gateway/doctor)

## 渠道已连接但消息无法流转

如果渠道状态显示已连接但消息流已中断，请重点关注策略、权限和渠道特定的传递规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

查找：

- 私信策略 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群组允许列表和提及要求。
- 缺少渠道 API 权限/范围。

常见特征：

- `mention required` → 消息被群组提及策略忽略。
- `pairing` / 待批准跟踪 → 发送者未获批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 渠道认证/权限问题。

相关：

- [/channels/故障排除](/zh/channels/troubleshooting)
- [/channels/whatsapp](/zh/channels/whatsapp)
- [/channels/telegram](/zh/channels/telegram)
- [/channels/discord](/zh/channels/discord)

## Cron 和心跳传递

如果 cron 或心跳未运行或未传递，请先验证调度程序状态，然后验证传递目标。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

查找：

- Cron 已启用且存在下一次唤醒。
- 作业运行历史状态 (`ok`, `skipped`, `error`)。
- 心跳跳过原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`)。

常见特征：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
- `cron: timer tick failed` → 调度程序时钟失败；检查文件/日志/运行时错误。
- `heartbeat skipped` 同时 `reason=quiet-hours` → 超出活跃时间窗口。
- `heartbeat: unknown accountId` → 心跳传递目标的帐户 ID 无效。
- `heartbeat skipped` 同时 `reason=dm-blocked` → 心跳目标解析为私信样式目标，但 `agents.defaults.heartbeat.directPolicy`（或每代理覆盖）设置为 `block`。

相关：

- [/automation/故障排除](/zh/automation/troubleshooting)
- [/automation/cron-jobs](/zh/automation/cron-jobs)
- [/gateway/heartbeat](/zh/gateway/heartbeat)

## 节点已配对工具失败

如果节点已配对但工具失败，请隔离前台、权限和批准状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

查找：

- 节点在线并具有预期功能。
- 针对摄像头/麦克风/位置/屏幕的操作系统权限授予。
- 执行批准和允许列表状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须处于前台。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少操作系统权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行批准待定。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表阻止。

相关：

- [/nodes/故障排除](/zh/nodes/troubleshooting)
- [/nodes/index](/zh/nodes/index)
- [/tools/exec-approvals](/zh/tools/exec-approvals)

## Browser 工具 fails

Use this when browser 工具 actions fail even though the gateway itself is healthy.

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

Look for:

- Valid browser executable path.
- CDP profile reachability.
- Local Chrome availability for `existing-session` / `user` profiles.

Common signatures:

- `Failed to start Chrome CDP on port` → browser process failed to launch.
- `browser.executablePath not found` → configured path is invalid.
- `No Chrome tabs found for profile="user"` → the Chrome MCP attach profile has no open local Chrome tabs.
- `Browser attachOnly is enabled ... not reachable` → attach-only profile has no reachable target.

Related:

- [/tools/browser-linux-故障排除](/zh/tools/browser-linux-troubleshooting)
- [/tools/browser](/zh/tools/browser)

## 如果您升级后突然出现问题

大多数升级后的问题是由配置漂移或现在强制执行更严格的默认设置引起的。

### 1) 身份验证和 URL 覆盖行为已更改

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

检查内容：

- If `gateway.mode=remote`, CLI calls may be targeting remote while your local service is fine.
- Explicit `--url` calls do not fall back to stored credentials.

常见特征：

- `gateway connect failed:` → wrong URL target.
- `unauthorized` → endpoint reachable but wrong auth.

### 2) 绑定和身份验证护栏更严格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

检查内容：

- Non-loopback binds (`lan`, `tailnet`, `custom`) need auth configured.
- Old keys like `gateway.token` do not replace `gateway.auth.token`.

常见特征：

- `refusing to bind gateway ... without auth` → bind+auth mismatch.
- `RPC probe: failed` while runtime is running → gateway alive but inaccessible with current auth/url.

### 3) 配对和设备身份状态已更改

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

检查事项：

- 仪表板/节点的待处理设备审批。
- 策略或身份更改后的待处理私信 配对审批。

常见特征：

- `device identity required` → device auth not satisfied.
- `pairing required` → sender/device must be approved.

如果在检查后服务配置和运行时仍然不一致，请从相同的配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [/gateway/pairing](/zh/gateway/pairing)
- [/gateway/authentication](/zh/gateway/authentication)
- [/gateway/background-process](/zh/gateway/background-process)

import en from "/components/footer/en.mdx";

<en />
