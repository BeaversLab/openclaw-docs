---
summary: "网关、渠道、自动化、节点和浏览器的深度故障排除手册"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
---

# Gateway(网关) 网关 故障排查

此页面是深度手册。
如果您想先进行快速分诊流程，请从 [/help/故障排除](/en/help/troubleshooting) 开始。

## 命令阶梯

请按以下顺序首先运行这些命令：

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
- `openclaw channels status --probe` 显示实时的每个账户传输状态，并且
  在支持的情况下，显示探测/审计结果，例如 `works` 或 `audit ok`。

## Anthropic 429 长上下文需要额外使用量

当日志/错误包含以下内容时使用此方法：
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查找：

- 所选的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 当前的 Anthropic 凭证不具备长上下文使用资格。
- 请求仅在需要 1M beta 路径的长会话/模型运行上失败。

修复选项：

1. 禁用该模型的 `context1m` 以回退到正常的上下文窗口。
2. 使用带有计费的 Anthropic API 密钥，或在 Anthropic Anthropic/订阅账户上启用 OAuth 额外使用量。
3. 配置回退模型，以便在 Anthropic 长上下文请求被拒绝时继续运行。

相关：

- [/providers/anthropic](/en/providers/anthropic)
- [/reference/token-use](/en/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/en/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 无回复

如果频道已启动但无响应，请在重新连接任何内容之前检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

查找：

- 私信发送者正在等待配对。
- 群组提及门控 (`requireMention`, `mentionPatterns`)。
- 频道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 在提及之前忽略群组消息。
- `pairing request` → 发送者需要批准。
- `blocked` / `allowlist` → 发送者/渠道已被策略过滤。

相关：

- [/channels/故障排除](/en/channels/troubleshooting)
- [/channels/pairing](/en/channels/pairing)
- [/channels/groups](/en/channels/groups)

## 仪表板控制 UI 连接性

当仪表板/控制 UI 无法连接时，请验证 URL、身份验证模式和安全上下文假设。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

检查以下内容：

- 正确的探针 URL 和仪表板 URL。
- 客户端和网关之间的身份验证模式/令牌不匹配。
- 在需要设备身份的地方使用了 HTTP。

常见特征：

- `device identity required` → 非安全上下文或缺少设备身份验证。
- `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中
  （或者您来自非回环浏览器来源进行连接，且没有明确的
  允许列表）。
- `device nonce required` / `device nonce mismatch` → 客户端未完成
  基于挑战的设备身份验证流程 (`connect.challenge` + `device.nonce`)。
- `device signature invalid` / `device signature expired` → 客户端为当前握手
  签署了错误的负载（或时间戳已过期）。
- 带有 `canRetryWithDeviceToken=true` 的 `AUTH_TOKEN_MISMATCH` → 客户端可以使用缓存的设备令牌进行一次可信的重试。
- 该缓存令牌重试重用了与配对设备令牌存储的缓存作用域集。显式 `deviceToken` / 显式 `scopes` 调用者改为保留其请求的作用域集。
- 在该重试路径之外，连接身份验证优先级首先是显式共享令牌/密码，然后是显式 `deviceToken`，接着是存储的设备令牌，
  最后是引导令牌。
- 在异步 Tailscale Serve Control UI 路径上，限制器记录失败之前，针对同一
  `{scope, ip}` 的失败尝试会被序列化。因此，来自同一客户端的两个错误的并发重试可能会在第二次尝试时显示 `retry later`
  而不是两个普通的匹配失败。
- 来自浏览器源
  环回客户端的 `too many failed authentication attempts (retry later)` → 来自同一标准化 `Origin` 的重复失败
  将被暂时锁定；另一个 localhost 源使用单独的存储桶。
- 该重试后重复 `unauthorized` → 共享令牌/设备令牌不一致；刷新令牌配置并在需要时重新批准/轮换设备令牌。
- `gateway connect failed:` → 错误的主机/端口/url 目标。

### 身份验证详细代码快速映射

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| 详细代码                     | 含义                               | 建议操作                                                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享令牌。       | 在客户端中粘贴/设置令牌并重试。对于仪表板路径：`openclaw config get gateway.auth.token` 然后粘贴到 Control UI 设置中。                                                                                                                           |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关身份验证令牌不匹配。 | 如果 `canRetryWithDeviceToken=true`，允许一次可信的重试。缓存令牌重试会重用存储的已批准范围；显式 `deviceToken` / `scopes` 调用方将保留请求的范围。如果仍然失败，请运行 [令牌漂移恢复检查清单](/en/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的每设备令牌已过期或已被撤销。 | 使用 [devices CLI](/en/cli/devices) 轮换/重新批准设备令牌，然后重新连接。                                                                                                                                                                        |
| `PAIRING_REQUIRED`           | 设备身份已知但未获此角色批准。     | 批准挂起的请求：`openclaw devices list` 然后 `openclaw devices approve <requestId>`。                                                                                                                                                            |

设备身份验证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示 nonce/签名错误，请更新连接的客户端并验证它：

1. 等待 `connect.challenge`
2. 对绑定质询的负载进行签名
3. 发送带有相同质询 nonce 的 `connect.params.device.nonce`

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒绝：

- 配对设备令牌会话只能管理**其自己的**设备，除非
  调用方还拥有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能请求调用方会话
  已拥有的操作员范围

相关：

- [/web/control-ui](/en/web/control-ui)
- [/gateway/configuration](/en/gateway/configuration) (Gateway 身份验证模式)
- [/gateway/trusted-proxy-auth](/en/gateway/trusted-proxy-auth)
- [/gateway/remote](/en/gateway/remote)
- [/cli/devices](/en/cli/devices)

## Gateway(网关) 服务未运行

当服务已安装但进程无法保持运行时使用此项。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

查找：

- 带有退出提示的 `Runtime: stopped`。
- 服务配置不匹配 (`Config (cli)` 与 `Config (service)`)。
- 端口/监听器冲突。
- 使用 `--deep` 时出现额外的 launchd/systemd/schtasks 安装。
- `Other gateway-like services detected (best effort)` 清理提示。

常见特征：

- `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未启用本地 gateway 模式，或者配置文件被破坏并丢失了 `gateway.mode`。解决方法：在配置中设置 `gateway.mode="local"`，或重新运行 `openclaw onboard --mode local` / `openclaw setup` 以重新生成预期的本地模式配置。如果您通过 Podman 运行 OpenClaw，则默认配置路径为 `~/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 在没有有效的 gateway 身份验证路径（令牌/密码，或配置的受信任代理）的情况下进行了非环回绑定。
- `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。
- `Other gateway-like services detected (best effort)` → 存在过时或并行的 launchd/systemd/schtasks 单元。大多数设置每台机器应保留一个 gateway；如果确实需要多个，请隔离端口 + 配置/状态/工作区。请参阅 [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host)。

相关：

- [/gateway/background-process](/en/gateway/background-process)
- [/gateway/configuration](/en/gateway/configuration)
- [/gateway/doctor](/en/gateway/doctor)

## Gateway(网关) 探测警告

当 `openclaw gateway probe` 能够到达目标，但仍打印警告块时使用此项。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查找：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 判断警告是关于 SSH 回退、多个 gateway、缺少作用域，还是未解析的身份验证引用。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍尝试直接连接已配置/环回的目标。
- `multiple reachable gateways detected` → 多个目标响应。通常这意味着有意设置的多 gateway 环境，或存在过时/重复的监听器。
- `Probe diagnostics are limited by gateway scopes (missing operator.read)` → 连接成功，但详细 RPC 受作用域限制；请配对设备身份或使用具有 `operator.read` 的凭据。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 在此命令路径中，失败目标的身份验证材料不可用。

相关：

- [/cli/gateway](/en/cli/gateway)
- [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host)
- [/gateway/remote](/en/gateway/remote)

## 渠道已连接但消息未流转

如果渠道状态显示已连接但消息流停止，请重点关注策略、权限和特定于渠道的投递规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

查找以下内容：

- 私信策略 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群组允许列表和提及要求。
- 缺少渠道 API 权限/范围。

常见特征：

- `mention required` → 消息因群组提及策略被忽略。
- `pairing` / 待审批跟踪 → 发送者未获批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 渠道认证/权限问题。

相关内容：

- [/channels/故障排除](/en/channels/troubleshooting)
- [/channels/whatsapp](/en/channels/whatsapp)
- [/channels/telegram](/en/channels/telegram)
- [/channels/discord](/en/channels/discord)

## Cron 和心跳投递

如果 Cron 或心跳未运行或未投递，请首先验证调度器状态，然后验证投递目标。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

查找以下内容：

- Cron 已启用且存在下一次唤醒时间。
- 作业运行历史状态 (`ok`, `skipped`, `error`)。
- 心跳跳过原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

常见特征：

- `cron: scheduler disabled; jobs will not run automatically` → Cron 已禁用。
- `cron: timer tick failed` → 调度器时钟失败；请检查文件/日志/运行时错误。
- `heartbeat skipped` 且带有 `reason=quiet-hours` → 超出活动时间窗口。
- `heartbeat skipped` 且带有 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但仅包含空行/markdown 标题，因此 OpenClaw 跳过模型调用。
- `heartbeat skipped` 搭配 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 代码块，但在当前周期中没有任务到期。
- `heartbeat: unknown accountId` → 心跳传递目标的账户 ID 无效。
- `heartbeat skipped` 搭配 `reason=dm-blocked` → 心跳目标解析为私信 (私信) 风格的目标，但 `agents.defaults.heartbeat.directPolicy`（或每代理覆盖）被设置为 `block`。

相关：

- [/automation/cron-jobs#故障排除](/en/automation/cron-jobs#troubleshooting)
- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)

## 节点配对工具故障

如果节点已配对但工具失败，请隔离前台、权限和审批状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

查找：

- 节点在线且具有预期功能。
- 操作系统对相机/麦克风/位置/屏幕的权限授予。
- 执行审批和允许列表状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须处于前台。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少操作系统权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行审批待定。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表阻止。

相关：

- [/nodes/故障排除](/en/nodes/troubleshooting)
- [/nodes/index](/en/nodes/index)
- [/tools/exec-approvals](/en/tools/exec-approvals)

## 浏览器工具故障

当浏览器工具操作失败但网关本身运行正常时使用。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

查找：

- `plugins.allow` 是否已设置并包含 `browser`。
- 有效的浏览器可执行路径。
- CDP 配置文件的可达性。
- 用于 `existing-session` / `user` 配置文件的本地 Chrome 可用性。

常见特征：

- `unknown command "browser"` 或 `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除。
- 在 `browser.enabled=true` 期间浏览器工具丢失/不可用 → `plugins.allow` 排除了 `browser`，因此插件从未加载。
- `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
- `browser.executablePath not found` → 配置的路径无效。
- `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不支持的协议，例如 `file:` 或 `ftp:`。
- `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口错误或超出范围。
- `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
- `Remote CDP for profile "<name>" is not reachable` → 网关主机无法访问配置的远程 CDP 端点。
- `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有可访问的目标，或者 HTTP 端点有响应但仍无法打开 CDP WebSocket。
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前网关安装缺少完整的 Playwright 包；ARIA 快照和基本页面截图仍然可以使用，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出将不可用。
- `fullPage is not supported for element screenshots` → 截图请求混合使用了 `--full-page` 和 `--ref` 或 `--element`。
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截图调用必须使用页面捕获或快照 `--ref`，而不是 CSS `--element`。
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上传钩子需要快照引用，而不是 CSS 选择器。
- `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 配置文件上每次调用发送一个上传。
- `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 配置文件上的对话框钩子不支持超时覆盖。
- `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要托管浏览器或原始 CDP 配置文件。
- 仅附加或远程 CDP 配置文件上的过时视口 / 暗黑模式 / 语言环境 / 离线覆盖 → 运行 `openclaw browser stop --browser-profile <name>` 以关闭活动控制会话并释放 Playwright/CDP 模拟状态，而无需重启整个网关。

相关：

- [/tools/browser-linux-故障排除](/en/tools/browser-linux-troubleshooting)
- [/tools/browser](/en/tools/browser)

## 如果您进行了升级且某些内容突然中断

大多数升级后的中断是由于配置漂移，或者是现在强制执行了更严格的默认设置。

### 1) 认证和 URL 覆盖行为已更改

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

检查事项：

- 如果 `gateway.mode=remote`，CLI 调用可能针对远程，而您的本地服务是正常的。
- 显式的 `--url` 调用不会回退到存储的凭据。

常见特征：

- `gateway connect failed:` → 错误的 URL 目标。
- `unauthorized` → 端点可达但认证错误。

### 2) 绑定和认证护栏更加严格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.mode
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

检查事项：

- 非回环绑定（`lan`、`tailnet`、`custom`）需要有效的网关认证路径：共享令牌/密码认证，或正确配置的非回环 `trusted-proxy` 部署。
- 像 `gateway.token` 这样的旧密钥不会替换 `gateway.auth.token`。

常见特征：

- `refusing to bind gateway ... without auth` → 非回环绑定且没有有效的网关认证路径。
- `RPC probe: failed` 而运行时正在运行 → 网关处于活动状态，但通过当前的认证/URL 无法访问。

### 3) 配对和设备身份状态已更改

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

检查事项：

- 仪表板/节点的待处理设备批准。
- 策略或身份更改后的待处理私信配对批准。

常见特征：

- `device identity required` → 设备认证未满足。
- `pairing required` → 发送方/设备必须被批准。

如果检查后服务配置和运行时仍然不一致，请从相同的配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关内容：

- [/gateway/pairing](/en/gateway/pairing)
- [/gateway/authentication](/en/gateway/authentication)
- [/gateway/background-process](/en/gateway/background-process)
