---
summary: "网关、通道、自动化、节点和浏览器的深度排查手册"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
---

# Gateway(网关) 网关 故障排查

本页面是详细的操作手册。
如果您希望先进行快速分诊流程，请从 [/help/故障排除](/en/help/troubleshooting) 开始。

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
- `openclaw doctor` 报告没有阻塞性配置/服务问题。
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
- 当前的 Anthropic 凭证不具备长上下文使用资格。
- 请求仅在需要 1M beta 路径的长会话/模型运行上失败。

修复选项：

1. 禁用该模型的 `context1m` 以回退到正常的上下文窗口。
2. 使用带有计费的 Anthropic API 密钥，或者在订阅账户上启用 Anthropic 额外使用量。
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
- 群组提及准入控制 (`requireMention`, `mentionPatterns`)。
- 频道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 群组消息在被提及前被忽略。
- `pairing request` → 发送者需要批准。
- `blocked` / `allowlist` → 发送者/渠道被策略过滤。

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

- `device identity required` → 非安全上下文或缺少设备认证。
- `device nonce required` / `device nonce mismatch` → 客户端未完成
  基于挑战的设备认证流程 (`connect.challenge` + `device.nonce`)。
- `device signature invalid` / `device signature expired` → 客户端为当前握手
  签署了错误的有效负载（或时间戳过期）。
- 带有 `canRetryWithDeviceToken=true` 的 `AUTH_TOKEN_MISMATCH` → 客户端可以使用缓存的设备令牌进行一次受信任的重试。
- 在该重试后重复出现 `unauthorized` → 共享令牌/设备令牌漂移；如有需要，请刷新令牌配置并重新批准/轮换设备令牌。
- `gateway connect failed:` → 错误的主机/端口/URL 目标。

### 身份验证详细代码快速映射

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| 详细代码                     | 含义                               | 建议操作                                                                                                                                                                               |
| ---------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享令牌。       | 在客户端中粘贴/设置令牌并重试。对于仪表板路径：`openclaw config get gateway.auth.token`，然后粘贴到控制 UI 设置中。                                                                    |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关身份验证令牌不匹配。 | 如果 `canRetryWithDeviceToken=true`，允许一次受信任的重试。如果仍然失败，请运行令牌偏移恢复检查清单 [token drift recovery checklist](/en/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的每设备令牌已过期或已撤销。   | 使用 [devices CLI](/en/cli/devices) 轮换/重新批准设备令牌，然后重新连接。                                                                                                              |
| `PAIRING_REQUIRED`           | 设备身份已知但未获批准用于此角色。 | 批准待处理的请求：`openclaw devices list` 然后 `openclaw devices approve <requestId>`。                                                                                                |

设备身份验证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示随机数/签名错误，请更新连接的客户端并进行验证：

1. 等待 `connect.challenge`
2. 对绑定质询的负载进行签名
3. 使用相同的挑战随机数发送 `connect.params.device.nonce`

相关内容：

- [/web/control-ui](/en/web/control-ui)
- [/gateway/configuration](/en/gateway/configuration) （网关身份验证模式）
- [/gateway/trusted-proxy-auth](/en/gateway/trusted-proxy-auth)
- [/gateway/remote](/en/gateway/remote)
- [/cli/devices](/en/cli/devices)

## Gateway(网关) 服务未运行

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
- 服务配置不匹配（`Config (cli)` vs `Config (service)`）。
- 端口/监听器冲突。

常见特征：

- `Gateway start blocked: set gateway.mode=local` → 未启用本地网关模式。修复方法：在配置中设置 `gateway.mode="local"`（或运行 `openclaw configure`）。如果您是通过 Podman 运行 OpenClaw 的，默认配置路径是 `~/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 没有令牌/密码的非环回绑定。
- `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。

相关：

- [/gateway/background-process](/en/gateway/background-process)
- [/gateway/configuration](/en/gateway/configuration)
- [/gateway/doctor](/en/gateway/doctor)

## 渠道已连接但消息未流动

如果渠道状态为已连接但消息流已中断，请重点关注策略、权限和渠道特定的传递规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

查找：

- 私信策略 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群组白名单和提及要求。
- 缺少渠道 API 权限/范围。

常见特征：

- `mention required` → 消息被群组提及策略忽略。
- `pairing` / 待审批跟踪 → 发送者未获批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 渠道身份验证/权限问题。

相关：

- [/channels/故障排除](/en/channels/troubleshooting)
- [/channels/whatsapp](/en/channels/whatsapp)
- [/channels/telegram](/en/channels/telegram)
- [/channels/discord](/en/channels/discord)

## Cron 和心跳传递

如果 cron 或心跳未运行或未传递，请先验证调度器状态，然后验证传递目标。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

查找：

- Cron 已启用且存在下一次唤醒时间。
- 作业运行历史记录状态 (`ok`, `skipped`, `error`)。
- 心跳跳过原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`)。

常见特征：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
- `cron: timer tick failed` → 调度器时钟失败；检查文件/日志/运行时错误。
- `heartbeat skipped` 且带有 `reason=quiet-hours` → 在活动小时窗口之外。
- `heartbeat: unknown accountId` → 心跳传递目标的账户 ID 无效。
- `heartbeat skipped` 且带有 `reason=dm-blocked` → 心跳目标解析为私信风格的目标，而 `agents.defaults.heartbeat.directPolicy`（或每代理覆盖）设置为 `block`。

相关：

- [/automation/故障排除](/en/automation/troubleshooting)
- [/automation/cron-jobs](/en/automation/cron-jobs)
- [/gateway/heartbeat](/en/gateway/heartbeat)

## 节点配对工具失败

如果节点已配对但工具失败，请隔离前台、权限和审批状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

查找：

- 节点在线并具备预期功能。
- 操作系统对摄像头/麦克风/位置/屏幕的权限授予。
- 执行批准和允许列表状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须位于前台。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少操作系统权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行批准待处理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表阻止。

相关：

- [/nodes/故障排除](/en/nodes/troubleshooting)
- [/nodes/index](/en/nodes/index)
- [/tools/exec-approvals](/en/tools/exec-approvals)

## 浏览器工具失败

当浏览器工具操作失败但网关本身健康时使用此部分。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

检查事项：

- 是否已设置 `plugins.allow` 并包含 `browser`。
- 有效的浏览器可执行文件路径。
- CDP 配置文件可达性。
- `existing-session` / `user` 配置文件的本地 Chrome 可用性。

常见特征：

- `unknown command "browser"` 或 `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除。
- 浏览器工具在 `browser.enabled=true` 时丢失/不可用 → `plugins.allow` 排除了 `browser`，因此插件从未加载。
- `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
- `browser.executablePath not found` → 配置的路径无效。
- `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
- `Browser attachOnly is enabled ... not reachable` → 仅附加配置文件没有可访问的目标。

相关：

- [/tools/browser-linux-故障排除](/en/tools/browser-linux-troubleshooting)
- [/tools/browser](/en/tools/browser)

## 如果您升级后突然出现故障

大多数升级后的故障是由于配置偏差或现在强制执行了更严格的默认值。

### 1) Auth 和 URL 覆盖行为已更改

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

检查事项：

- 如果存在 `gateway.mode=remote`，CLI 调用可能针对远程，而您的本地服务正常。
- 显式的 `--url` 调用不会回退到存储的凭据。

常见特征：

- `gateway connect failed:` → 错误的 URL 目标。
- `unauthorized` → 端点可达但认证错误。

### 2) 绑定和认证防护措施更严格了

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

检查事项：

- 非回环绑定（`lan`、`tailnet`、`custom`）需要配置认证。
- 旧密钥（如 `gateway.token`）不会替换 `gateway.auth.token`。

常见特征：

- `refusing to bind gateway ... without auth` → 绑定+认证不匹配。
- 运行时运行时出现 `RPC probe: failed` → 网关存活但无法通过当前的认证/URL 访问。

### 3) 配对和设备标识状态已更改

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

检查事项：

- 待批准的设备（针对仪表板/节点）。
- 策略或标识更改后待批准的私信（私信）配对。

常见特征：

- `device identity required` → 设备认证未满足。
- `pairing required` → 发送方/设备必须被批准。

如果在检查后服务配置和运行时仍然不一致，请从相同的配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关内容：

- [/gateway/pairing](/en/gateway/pairing)
- [/gateway/authentication](/en/gateway/authentication)
- [/gateway/background-process](/en/gateway/background-process)
