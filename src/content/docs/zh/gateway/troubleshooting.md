---
summary: "网关、通道、自动化、节点和浏览器的深度故障排除手册"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
---

# Gateway(网关) 网关 故障排查

此页面是深度运行手册。
如果您想先进行快速分流，请从 [/help/故障排除](/zh/help/troubleshooting) 开始。

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

- `openclaw gateway status` 显示 `Runtime: running`、`Connectivity probe: ok` 和 `Capability: ...` 行。
- `openclaw doctor` 报告没有阻塞的配置/服务问题。
- `openclaw channels status --probe` 显示实时每个账户的传输状态，并且
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

- 选定的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 当前的 Anthropic 凭证不具备长上下文使用资格。
- 请求仅在需要 1M beta 路径的长会话/模型运行上失败。

修复选项：

1. 禁用该模型的 `context1m` 以回退到正常的上下文窗口。
2. 使用符合长上下文请求条件的 Anthropic 凭据，或切换到 Anthropic API API 密钥。
3. 配置回退模型，以便在 Anthropic 长上下文请求被拒绝时继续运行。

相关：

- [/providers/anthropic](/zh/providers/anthropic)
- [/reference/token-use](/zh/reference/token-use)
- [/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/zh/help/faq#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本地 OpenAI 兼容后端通过直接探测但代理运行失败

在以下情况下使用此方法：

- `curl ... /v1/models` 工作正常
- 微小的直接 `/v1/chat/completions` 调用工作正常
- OpenClaw 模型运行仅在正常代理轮次时失败

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

查找：

- 直接的微小调用成功，但 OpenClaw 运行仅在较大的提示词时失败
- 后端关于 `messages[].content` 期望字符串的错误
- 后端崩溃，仅出现在较大的提示词 token 计数或完整的代理
  运行时提示词中

常见特征：

- `messages[...].content: invalid type: sequence, expected a string` → 后端
  拒绝结构化聊天完成内容部分。修复：设置
  `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 直接的微小请求成功，但 OpenClaw 代理运行因后端/模型
  崩溃而失败（例如某些 `inferrs` 构建版本上的 Gemma）→ OpenClaw 传输
  可能已经正确；后端在更大的代理运行时
  提示形状上失败。
- 禁用工具后故障减少但并未消失 → 工具架构是压力的一部分，但剩下的问题仍然是上游模型/服务器容量或后端错误。

修复选项：

1. 为仅支持字符串的聊天完成后端设置 `compat.requiresStringContent: true`。
2. 为无法可靠处理
   OpenClaw 工具架构表面的模型/后端设置 `compat.supportsTools: false`。
3. 尽可能降低提示词压力：更小的工作区引导、更短的会话历史、更轻量的本地模型，或具有更强长上下文支持的后端。
4. 如果微小的直接请求持续通过，而 OpenClaw 代理轮次仍然在后端内部崩溃，则将其视为上游服务器/模型限制，并使用可接受的负载形状在此处提交复现问题。

相关：

- [/gateway/local-models](/zh/gateway/local-models)
- [/gateway/configuration](/zh/gateway/configuration)
- [/gateway/configuration-reference#openai-compatible-endpoints](/zh/gateway/configuration-reference#openai-compatible-endpoints)

## 无回复

如果渠道已启动但无响应，请在重新连接任何内容之前检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

查找：

- 私信发送方配对挂起。
- 组提及门控 (`requireMention`, `mentionPatterns`)。
- 渠道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 在收到提及之前忽略群组消息。
- `pairing request` → 发送者需要审批。
- `blocked` / `allowlist` → 发送者/渠道已被策略过滤。

相关：

- [/channels/故障排除](/zh/channels/troubleshooting)
- [/channels/pairing](/zh/channels/pairing)
- [/channels/groups](/zh/channels/groups)

## 仪表板控制 UI 连接

当仪表板/控制 UI 无法连接时，请验证 URL、身份验证模式和安全上下文假设。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

查找：

- 正确的探测 URL 和仪表板 URL。
- 客户端与网关之间的身份验证模式/令牌不匹配。
- 需要设备身份时使用了 HTTP。

常见特征：

- `device identity required` → 非安全上下文或缺少设备身份验证。
- `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中
  （或者您在没有显式允许列表的非环回浏览器源进行连接）。
- `device nonce required` / `device nonce mismatch` → 客户端未完成
  基于质询的设备身份验证流程 (`connect.challenge` + `device.nonce`)。
- `device signature invalid` / `device signature expired` → 客户端为当前握手
  签署了错误的负载（或时间戳已过期）。
- 带有 `canRetryWithDeviceToken=true` 的 `AUTH_TOKEN_MISMATCH` → 客户端可以使用缓存的设备令牌进行一次可信重试。
- 该缓存令牌重试重用与配对设备令牌一起存储的缓存作用域集。显式 `deviceToken` / 显式 `scopes` 调用者
  改为保留其请求的作用域集。
- 在该重试路径之外，连接身份验证优先级首先是显式共享令牌/密码，然后是显式 `deviceToken`，
  接着是存储的设备令牌，最后是引导令牌。
- 在异步 Tailscale Serve 控制 UI 路径上，对相同 `{scope, ip}` 的失败尝试
  会在限制器记录失败之前进行序列化。因此，来自同一客户端的两个糟糕的并发重试可能会在第二次尝试时
  显示 `retry later`，而不是两个普通的不匹配。
- 来自浏览器源的 `too many failed authentication attempts (retry later)`
  回环客户端 → 来自同一规范化 `Origin` 的反复失败
  将被暂时锁定；另一个 localhost 源使用单独的存储桶。
- 重试后反复出现 `unauthorized` → 共享令牌/设备令牌偏移；刷新令牌配置并在需要时重新批准/轮换设备令牌。
- `gateway connect failed:` → 错误的主机/端口/URL 目标。

### Auth detail codes quick map

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| Detail code                  | Meaning                                                                                                                                                                      | Recommended action                                                                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享令牌。                                                                                                                                                 | 在客户端中粘贴/设置令牌并重试。对于仪表板路径：`openclaw config get gateway.auth.token` 然后粘贴到 Control UI 设置中。                                                                                                                          |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与 Gateway 认证令牌不匹配。                                                                                                                                          | 如果 `canRetryWithDeviceToken=true`，允许一次受信任的重试。缓存令牌的重试使用存储的已批准范围；显式 `deviceToken` / `scopes` 调用者保留请求的范围。如果仍然失败，请运行[令牌偏移恢复检查清单](/zh/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每个设备的缓存令牌已过期或被吊销。                                                                                                                                           | 使用 [devices CLI](/zh/cli/devices) 轮换/重新批准设备令牌，然后重新连接。                                                                                                                                                                       |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 中是否有 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在存在时使用 `requestId` / `remediationHint`。 | 批准待处理的请求：`openclaw devices list` 然后 `openclaw devices approve <requestId>`。范围/角色升级在您审查请求的访问权限后使用相同的流程。                                                                                                    |

设备认证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示 nonce/签名错误，请更新连接的客户端并进行验证：

1. 等待 `connect.challenge`
2. 对绑定质询的有效负载进行签名
3. 使用相同的挑战随机数发送 `connect.params.device.nonce`

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒绝：

- 配对设备令牌会话只能管理**它们自己的**设备，除非
  调用者还具有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能请求调用者会话已经拥有的操作员范围

相关：

- [/web/control-ui](/zh/web/control-ui)
- [/gateway/configuration](/zh/gateway/configuration) (gateway auth modes)
- [/gateway/trusted-proxy-auth](/zh/gateway/trusted-proxy-auth)
- [/gateway/remote](/zh/gateway/remote)
- [/cli/devices](/zh/cli/devices)

## Gateway(网关) 服务未运行

当服务已安装但进程无法保持运行时，请使用此项。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

查找：

- `Runtime: stopped` 并带有退出提示。
- 服务配置不匹配（`Config (cli)` vs `Config (service)`）。
- 端口/监听器冲突。
- 当使用 `--deep` 时，存在额外的 launchd/systemd/schtasks 安装。
- `Other gateway-like services detected (best effort)` 清理提示。

常见特征：

- `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 本地网关模式未启用，或者配置文件被破坏并丢失了 `gateway.mode`。修复方法：在配置中设置 `gateway.mode="local"`，或重新运行 `openclaw onboard --mode local` / `openclaw setup` 以重新应用预期的本地模式配置。如果您是通过 Podman 运行 OpenClaw 的，默认配置路径是 `~/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 非环回绑定且没有有效的网关认证路径（令牌/密码，或配置的可信代理）。
- `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。
- `Other gateway-like services detected (best effort)` → 存在过时的或并行的 launchd/systemd/schtasks 单元。大多数设置应该每台机器保留一个网关；如果您确实需要多个，请隔离端口 + 配置/状态/工作区。请参阅 [/gateway#multiple-gateways-same-host](/zh/gateway#multiple-gateways-same-host)。

相关：

- [/gateway/background-process](/zh/gateway/background-process)
- [/gateway/configuration](/zh/gateway/configuration)
- [/gateway/doctor](/zh/gateway/doctor)

## Gateway(网关)恢复了上次已知良好的配置

当 Gateway(网关) 启动但日志显示它恢复了 `openclaw.json` 时使用此方法。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

查找：

- `Config auto-restored from last-known-good`
- `gateway: invalid config was restored from last-known-good backup`
- `config reload restored last-known-good config after invalid-config`
- 活动配置旁边的带有时间戳的 `openclaw.json.clobbered.*` 文件
- 以 `Config recovery warning` 开头的 main-agent 系统事件

发生了什么：

- 被拒绝的配置在启动或热加载期间未通过验证。
- OpenClaw 将被拒绝的负载保存为 `.clobbered.*`。
- 活动配置已从上次验证过的已知良好副本恢复。
- 已警告下一个主代理周期不要盲目覆盖被拒绝的配置。

检查并修复：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
openclaw config validate
openclaw doctor
```

常见特征：

- `.clobbered.*` 存在 → 恢复了外部直接编辑或启动读取。
- `.rejected.*` 存在 → OpenClaw 拥有的配置写入在提交前未通过架构或覆盖检查。
- `Config write rejected:` → 写入试图删除必需的形状、大幅缩小文件或持久化无效配置。
- `Config last-known-good promotion skipped` → 候选配置包含编辑过的密钥占位符，例如 `***`。

修复选项：

1. 如果恢复的活动配置正确，请保留它。
2. 仅从 `.clobbered.*` 或 `.rejected.*` 复制所需的键，然后使用 `openclaw config set` 或 `config.patch` 应用它们。
3. 在重新启动之前运行 `openclaw config validate`。
4. 如果您手动编辑，请保留完整的 JSON5 配置，而不仅仅是您想要更改的部分对象。

相关：

- [/gateway/configuration#strict-validation](/zh/gateway/configuration#strict-validation)
- [/gateway/configuration#config-hot-reload](/zh/gateway/configuration#config-hot-reload)
- [/cli/config](/zh/cli/config)
- [/gateway/doctor](/zh/gateway/doctor)

## Gateway 探测警告

当 `openclaw gateway probe` 到达某个目标但仍打印警告块时使用。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查找：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 无论警告是关于 SSH 回退、多个网关、缺少作用域还是未解析的身份验证引用。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍尝试直接配置/回环目标。
- `multiple reachable gateways detected` → 多个目标响应。通常这意味着有意的多网关设置或过时/重复的侦听器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 连接成功，但详细 RPC 受到范围限制；请配对设备身份或使用具有 `operator.read` 的凭据。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → 网关已响应，但此客户端在正常操作员访问之前仍需要配对/批准。
- 未解决的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 在此命令路径中，失败目标的认证材料不可用。

相关：

- [/cli/gateway](/zh/cli/gateway)
- [/gateway#multiple-gateways-same-host](/zh/gateway#multiple-gateways-same-host)
- [/gateway/remote](/zh/gateway/remote)

## 渠道已连接但消息未流转

如果渠道状态显示已连接但消息流已中断，请重点关注策略、权限以及渠道特定的传递规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

查找：

- 私信策略（`pairing`、`allowlist`、`open`、`disabled`）。
- 群组白名单和提及要求。
- 缺少渠道 API 权限/范围。

常见特征：

- `mention required` → 消息因群组提及策略被忽略。
- `pairing` / 待批准的跟踪信息 → 发送方未获批准。
- `missing_scope`、`not_in_channel`、`Forbidden`、`401/403` → 渠道认证/权限问题。

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

- Cron 已启用且存在下次唤醒时间。
- 作业运行历史状态（`ok`、`skipped`、`error`）。
- 心跳跳过原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

常见特征：

- `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
- `cron: timer tick failed` → 调度器计时失败；检查文件/日志/运行时错误。
- 带有 `reason=quiet-hours` 的 `heartbeat skipped` → 超出活动时间窗口。
- 带有 `reason=empty-heartbeat-file` 的 `heartbeat skipped` → `HEARTBEAT.md` 存在但仅包含空行/markdown 标题，因此 OpenClaw 跳过模型调用。
- 带有 `reason=no-tasks-due` 的 `heartbeat skipped` → `HEARTBEAT.md` 包含一个 `tasks:` 块，但本次计时没有任务到期。
- `heartbeat: unknown accountId` → 心跳传递目标的账户 ID 无效。
- 带有 `reason=dm-blocked` 的 `heartbeat skipped` → 心跳目标解析为 私信 风格的目的地，但 `agents.defaults.heartbeat.directPolicy`（或每代理覆盖）设置为 `block`。

相关：

- [/automation/cron-jobs#故障排除](/zh/automation/cron-jobs#troubleshooting)
- [/automation/cron-jobs](/zh/automation/cron-jobs)
- [/gateway/heartbeat](/zh/gateway/heartbeat)

## 节点配对工具失败

如果节点已配对但工具失败，请隔离前台、权限和审批状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

检查：

- 节点在线且具备预期功能。
- 相机/麦克风/位置/屏幕的 OS 权限授予。
- 执行审批和允许列表状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须在前台。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少 OS 权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行审批待处理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表阻止。

相关：

- [/nodes/故障排除](/zh/nodes/troubleshooting)
- [/nodes/index](/zh/nodes/index)
- [/tools/exec-approvals](/zh/tools/exec-approvals)

## 浏览器工具失败

当网关本身健康但浏览器工具操作失败时使用此方法。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

查找：

- `plugins.allow` 是否已设置并且包含 `browser`。
- 有效的浏览器可执行文件路径。
- CDP 配置文件的可达性。
- `existing-session` / `user` 配置文件的本地 Chrome 可用性。

常见特征：

- `unknown command "browser"` 或 `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除了。
- browser 工具 missing / unavailable while `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此插件从未加载。
- `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
- `browser.executablePath not found` → 配置的路径无效。
- `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不支持的方案，例如 `file:` 或 `ftp:`。
- `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口错误或超出范围。
- `Could not find DevToolsActivePort for chrome` → Chrome MCP 现有会话尚无法连接到所选的浏览器数据目录。打开浏览器检查页面，启用远程调试，保持浏览器打开，批准首次连接提示，然后重试。如果不需要登录状态，建议使用托管的 `openclaw` 配置文件。
- `No Chrome tabs found for profile="user"` → Chrome MCP 连接配置文件没有打开的本地 Chrome 标签页。
- `Remote CDP for profile "<name>" is not reachable` → 配置的远程 CDP 端点无法从网关主机访问。
- `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅连接配置文件没有可访问的目标，或者 HTTP 端点有响应但 CDP WebSocket 仍无法打开。
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前的网关安装缺少完整的 Playwright 包；ARIA 快照和基本页面截图仍然可以工作，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出将不可用。
- `fullPage is not supported for element screenshots` → 截图请求混合了 `--full-page` 与 `--ref` 或 `--element`。
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截图调用必须使用页面捕获或快照 `--ref`，而不是 CSS `--element`。
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上传挂钩需要快照引用，而不是 CSS 选择器。
- `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 配置文件上每次调用发送一个上传。
- `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 配置文件上的对话挂钩不支持超时覆盖。
- `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要托管浏览器或原始 CDP 配置文件。
- 仅附加或远程 CDP 配置文件上的视口/暗黑模式/区域/离线覆盖过期 → 运行 `openclaw browser stop --browser-profile <name>` 以关闭活动控制会话并释放 Playwright/CDP 仿真状态，而无需重启整个网关。

相关：

- [/tools/browser-linux-故障排除](/zh/tools/browser-linux-troubleshooting)
- [/tools/browser](/zh/tools/browser)

## 如果您升级后突然出现问题

大多数升级后的问题是由于配置漂移或现在强制执行了更严格的默认设置。

### 1) 身份验证和 URL 覆盖行为已更改

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

检查事项：

- 如果 `gateway.mode=remote`，CLI 调用可能指向远程，而您的本地服务正常。
- 显式 `--url` 调用不会回退到存储的凭据。

常见特征：

- `gateway connect failed:` → 错误的 URL 目标。
- `unauthorized` → 端点可达但身份验证错误。

### 2) 绑定和身份验证防护措施更严格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.mode
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

检查事项：

- 非环回绑定（`lan`、`tailnet`、`custom`）需要有效的网关身份验证路径：共享令牌/密码身份验证，或正确配置的非环回 `trusted-proxy` 部署。
- 像 `gateway.token` 这样的旧密钥不会替换 `gateway.auth.token`。

常见特征：

- `refusing to bind gateway ... without auth` → 非环回绑定没有有效的网关身份验证路径。
- `Connectivity probe: failed` 而运行时正在运行 → 网关处于活动状态，但使用当前的 auth/url 无法访问。

### 3) 配对和设备标识状态已更改

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

检查事项：

- 仪表板/节点的待处理设备审批。
- 策略或身份更改后，待处理的私信配对审批。

常见特征：

- `device identity required` → 设备认证未满足。
- `pairing required` → 发送方/设备必须被批准。

如果在检查后服务配置和运行时仍然不一致，请从相同的配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关内容：

- [/gateway/pairing](/zh/gateway/pairing)
- [/gateway/authentication](/zh/gateway/authentication)
- [/gateway/background-process](/zh/gateway/background-process)
