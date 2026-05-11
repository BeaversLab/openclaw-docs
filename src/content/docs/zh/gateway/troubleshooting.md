---
summary: "针对网关、通道、自动化、节点和浏览器的深度故障排除手册"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
sidebarTitle: "故障排除"
---

本页面是深度手册。如果您想先进行快速分诊流程，请从 [/help/故障排除](/zh/help/troubleshooting) 开始。

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

- `openclaw gateway status` 显示 `Runtime: running`、`Connectivity probe: ok` 以及一行 `Capability: ...`。
- `openclaw doctor` 报告没有阻碍性的配置/服务问题。
- `openclaw channels status --probe` 显示每个账户的实时传输状态，并且在支持的情况下，显示探测/审计结果，例如 `works` 或 `audit ok`。

## 分裂脑安装与较新的配置保护

当网关服务在更新后意外停止，或日志显示某个 `openclaw` 二进制文件比上次写入 `openclaw.json` 的版本旧时，请使用此方法。

OpenClaw 会在配置写入时打上 `meta.lastTouchedVersion` 标记。只读命令仍可检查由较新 OpenClaw 写入的配置，但进程和服务变更拒绝从旧版本二进制文件继续执行。被阻止的操作包括网关服务的启动、停止、重启、卸载、强制服务重装、服务模式网关启动以及 `gateway --force` 端口清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="修复 PATH">
    修复 `PATH` 以便 `openclaw` 解析到较新的安装，然后重新运行该操作。
  </Step>
  <Step title="重新安装网关服务">
    从较新的安装中重新安装预期的网关服务：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="移除过时的封装程序">
    移除仍然指向旧 `openclaw` 二进制文件的过时系统软件包或旧封装条目。
  </Step>
</Steps>

<Warning>仅限有意降级或紧急恢复时，为单条命令设置 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作时请保持未设置状态。</Warning>

## Anthropic 429 长上下文需要额外使用量

当日志/错误包含以下内容时使用：`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查找：

- 选定的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 当前的 Anthropic 凭证不符合长上下文使用要求。
- 请求仅在需要 1M beta 路径的长会话/模型运行中失败。

修复选项：

<Steps>
  <Step title="Disable context1m">针对该模型禁用 `context1m` 以回退到正常的上下文窗口。</Step>
  <Step title="Use an eligible credential">使用符合长上下文请求资格的 Anthropic 凭证，或切换到 Anthropic API 密钥。</Step>
  <Step title="Configure fallback models">配置回退模型，以便当 Anthropic 长上下文请求被拒绝时运行继续。</Step>
</Steps>

相关：

- [Anthropic](/zh/providers/anthropic)
- [Token 使用与成本](/zh/reference/token-use)
- [为什么我会看到来自 Anthropic 的 HTTP 429？](/zh/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本地 OpenAI 兼容后端通过直接探测但代理运行失败

在以下情况下使用：

- `curl ... /v1/models` 工作正常
- 微小的直接 `/v1/chat/completions` 调用工作正常
- OpenClaw 模型运行仅在普通代理轮次失败

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

查找：

- 微小的直接调用成功，但 OpenClaw 运行仅在较大提示词时失败
- 出现 `model_not_found` 或 404 错误，尽管直接 `/v1/chat/completions`
  在使用相同基础模型 ID 时工作正常
- 后端报错称 `messages[].content` 期望字符串
- 使用 OpenAI 兼容本地后端时出现间歇性 `incomplete turn detected ... stopReason=stop payloads=0` 警告
- 后端崩溃仅出现在较大的提示词 token 计数或完整代理运行时提示词中

<AccordionGroup>
  <Accordion title="常见特征">
    - `model_not_found` 搭配本地 MLX/vLLM 风格的服务器 → 验证 `baseUrl` 包含 `/v1`，对于 `/v1/chat/completions` 后端 `api` 是 `"openai-completions"`，并且 `models.providers.<provider>.models[].id` 是不带前缀的提供商本地 ID。使用提供商前缀选择一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；保持目录条目为 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 后端拒绝结构化聊天补全内容部分。修复：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 后端完成了聊天补全请求，但该轮次未返回用户可见的助手文本。OpenClaw 会重试一次可重放安全的空 OpenAI 兼容轮次；持续失败通常意味着后端正在发出空/非文本内容或抑制了最终答案文本。
    - 直接的微小请求成功，但 OpenClaw 代理运行因后端/模型崩溃而失败（例如某些 `inferrs` 构建上的 Gemma） → OpenClaw 传输可能已经是正确的；后端在更大的代理运行时提示形状上失败了。
    - 禁用工具后失败减少但未消失 → 工具架构是压力的一部分，但剩余问题仍是上游模型/服务器容量或后端错误。
  </Accordion>
  <Accordion title="修复选项">
    1. 为仅字符串的聊天补全后端设置 `compat.requiresStringContent: true`。
    2. 为无法可靠处理 OpenClaw 工具架构表面的模型/后端设置 `compat.supportsTools: false`。
    3. 尽可能降低提示压力：更小的工作区引导、更短的会话历史、更轻量的本地模型，或具有更强长上下文支持的后端。
    4. 如果微小的直接请求一直通过，但 OpenClaw 代理轮次仍在后端内部崩溃，则将其视为上游服务器/模型限制，并在那里使用可接受的负载形状提交重现问题。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/zh/gateway/configuration)
- [本地模型](/zh/gateway/local-models)
- [OpenAI 兼容端点](/zh/gateway/configuration-reference#openai-compatible-endpoints)

## 无回复

如果渠道已启动但无响应，请在重新连接任何内容之前检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

检查：

- 私信发送者的配对挂起。
- 群组提及限制 (`requireMention`, `mentionPatterns`)。
- 渠道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 群组消息被忽略，直到被提及。
- `pairing request` → 发送者需要批准。
- `blocked` / `allowlist` → 发送者/渠道已被策略过滤。

相关：

- [渠道故障排除](/zh/channels/troubleshooting)
- [群组](/zh/channels/groups)
- [配对](/zh/channels/pairing)

## 仪表板控制 UI 连接

当仪表板/控制 UI 无法连接时，请验证 URL、身份验证模式和安全上下文假设。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

检查：

- 正确的探测 URL 和仪表板 URL。
- 客户端和网关之间的身份验证模式/令牌不匹配。
- 在需要设备身份的情况下使用了 HTTP。

<AccordionGroup>
  <Accordion title="连接 / 身份验证签名">
    - `device identity required` → 非安全上下文或缺少设备身份验证。
    - `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者您正在从未经显式允许列表的非环回浏览器源进行连接）。
    - `device nonce required` / `device nonce mismatch` → 客户端未完成基于质询的设备身份验证流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客户端为当前握手签署了错误的负载（或时间戳过期）。
    - `AUTH_TOKEN_MISMATCH` 同时带有 `canRetryWithDeviceToken=true` → 客户端可以使用缓存的设备令牌进行一次可信重试。
    - 该缓存令牌重试会重复使用与配对设备令牌一起存储的缓存作用域集。显式 `deviceToken` / 显式 `scopes` 调用者将保留其请求的作用域集。
    - 在该重试路径之外，连接身份验证优先级依次为：显式共享令牌/密码、显式 `deviceToken`、存储的设备令牌、引导令牌。
    - 在异步 Tailscale Serve 控制 UI 路径上，针对同一 `{scope, ip}` 的失败尝试在限制器记录失败之前会被序列化。因此，来自同一客户端的两个错误的并发重试可能会在第二次尝试时显示 `retry later`，而不是两次普通的不匹配。
    - 来自浏览器源环回客户端的 `too many failed authentication attempts (retry later)` → 来自同一标准化 `Origin` 的重复失败将被暂时锁定；另一个 localhost 源使用单独的存储桶。
    - 该重试后的重复 `unauthorized` → 共享令牌/设备令牌漂移；如有需要，请刷新令牌配置并重新批准/轮换设备令牌。
    - `gateway connect failed:` → 错误的主机/端口/URL 目标。
  </Accordion>
</AccordionGroup>

### 身份验证详情代码快速映射

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| 详情代码                     | 含义                                                                                                                                                                                 | 建议的操作                                                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享令牌。                                                                                                                                                         | 在客户端中粘贴/设置令牌并重试。对于控制面板路径：`openclaw config get gateway.auth.token` 然后粘贴到控制 UI 设置中。                                                                                                                              |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关身份验证令牌不匹配。                                                                                                                                                   | 如果是 `canRetryWithDeviceToken=true`，请允许一次受信任的重试。缓存令牌重试使用存储的已批准范围；显式 `deviceToken` / `scopes` 调用者保留请求的范围。如果仍然失败，请运行[令牌漂移恢复检查清单](/zh/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的单设备令牌已过期或已被撤销。                                                                                                                                                   | 使用 [devices CLI](/zh/cli/devices) 轮换/重新批准设备令牌，然后重新连接。                                                                                                                                                                         |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 是否存在 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在出现这些情况时使用 `requestId` / `remediationHint`。 | 批准待处理的请求：`openclaw devices list` 然后 `openclaw devices approve <requestId>`。范围/角色升级在您审查请求的访问权限后使用相同的流程。                                                                                                      |

<Note>使用共享网关令牌/密码进行身份验证的直接环回后端 RPC 不应依赖 CLI 的已配对设备范围基线。如果子代理或其他内部调用仍然因 `scope-upgrade` 而失败，请验证调用者是否正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，并且未强制执行显式 `deviceIdentity` 或设备令牌。</Note>

设备身份验证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示 nonce/签名错误，请更新连接的客户端并进行验证：

<Steps>
  <Step title="Wait for connect.challenge">客户端等待网关发出的 `connect.challenge`。</Step>
  <Step title="Sign the payload">客户端对绑定挑战的有效负载进行签名。</Step>
  <Step title="发送设备随机数">客户端发送带有相同质询随机数的 `connect.params.device.nonce`。</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 被意外拒绝：

- 配对设备令牌会话只能管理**它们自己的**设备，除非调用方也拥有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能请求调用方会话已拥有的操作员范围

相关：

- [配置](/zh/gateway/configuration)（Gateway(网关) 身份验证模式）
- [控制 UI](/zh/web/control-ui)
- [设备](/zh/cli/devices)
- [远程访问](/zh/gateway/remote)
- [受信任代理身份验证](/zh/gateway/trusted-proxy-auth)

## Gateway(网关) 服务未运行

当服务已安装但进程无法保持运行时使用此方法。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

查找：

- 带有退出提示的 `Runtime: stopped`。
- 服务配置不匹配（`Config (cli)` 与 `Config (service)`）。
- 端口/监听器冲突。
- 使用 `--deep` 时产生的额外 launchd/systemd/schtasks 安装。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="常见特征">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 本地网关模式未启用，或者配置文件被破坏并丢失了 `gateway.mode`。修复方法：在配置中设置 `gateway.mode="local"`，或重新运行 `openclaw onboard --mode local` / `openclaw setup` 以重新生成预期的本地模式配置。如果您通过 Podman 运行 OpenClaw，默认配置路径是 `~/.openclaw/openclaw.json`。 - `refusing to bind
    gateway ... without auth` → 非环回绑定，且没有有效的网关身份验证路径（令牌/密码，或配置的受信任代理）。 - `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。 - `Other gateway-like services detected (best effort)` → 存在过时或并行的 launchd/systemd/schtasks 单元。大多数设置应在每台机器上保留一个网关；如果确实需要多个，请隔离端口 + 配置/状态/工作区。请参阅
    [/gateway#multiple-gateways-same-host](/zh/gateway#multiple-gateways-same-host)。 - 来自诊断工具的 `System-level OpenClaw gateway service detected` → 存在 systemd 系统单元，但缺少用户级服务。在允许诊断工具安装用户服务之前，请删除或禁用重复项；如果系统单元是预期的管理器，则设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。 - `Gateway service port does not match current gateway config` →
    已安装的管理器仍固定使用旧的 `--port`。运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然后重启网关服务。
  </Accordion>
</AccordionGroup>

相关内容：

- [后台执行和进程工具](/zh/gateway/background-process)
- [配置](/zh/gateway/configuration)
- [诊断工具](/zh/gateway/doctor)

## Gateway(网关) 恢复了上次已知正常的配置

当 Gateway(网关) 启动但日志显示它恢复了 `openclaw.json` 时，请使用此部分。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

查找以下内容：

- `Config auto-restored from last-known-good`
- `gateway: invalid config was restored from last-known-good backup`
- `config reload restored last-known-good config after invalid-config`
- 位于活动配置旁边的带时间戳的 `openclaw.json.clobbered.*` 文件
- 以 `Config recovery warning` 开头的主代理系统事件

<AccordionGroup>
  <Accordion title="发生了什么">
    - 被拒绝的配置在启动或热重载期间未通过验证。
    - OpenClaw 将被拒绝的负载保存为 `.clobbered.*`。
    - 活动配置已从上次验证过的已知良好副本中恢复。
    - 下一个主代理轮次收到警告，不要盲目覆盖被拒绝的配置。
    - 如果所有验证问题都在 `plugins.entries.<id>...` 之下，OpenClaw 将不会恢复整个文件。插件本地故障保持高亮，而不相关的用户设置保留在活动配置中。
  </Accordion>
  <Accordion title="检查和修复">
    ```bash
    CONFIG="$(openclaw config file)"
    ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
    diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
    openclaw config validate
    openclaw doctor
    ```
  </Accordion>
  <Accordion title="常见签名">
    - 存在 `.clobbered.*` → 恢复了外部直接编辑或启动读取。
    - 存在 `.rejected.*` → OpenClaw 拥有的配置写入在提交前未通过架构或覆盖检查。
    - `Config write rejected:` → 写入试图丢弃必需的形状、急剧缩小文件或保留无效配置。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → 启动将当前文件视为被覆盖，因为与上次已知的良好备份相比，它丢失了字段或大小。
    - `Config last-known-good promotion skipped` → 候选文件包含编辑过的机密占位符，例如 `***`。
  </Accordion>
  <Accordion title="修复选项">
    1. 如果恢复的活动配置正确，请保留它。
    2. 仅从 `.clobbered.*` 或 `.rejected.*` 复制所需的键，然后使用 `openclaw config set` 或 `config.patch` 应用它们。
    3. 重启前运行 `openclaw config validate`。
    4. 如果手动编辑，请保留完整的 JSON5 配置，而不仅仅是要更改的部分对象。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/zh/cli/config)
- [配置：热重载](/zh/gateway/configuration#config-hot-reload)
- [配置：严格验证](/zh/gateway/configuration#strict-validation)
- [Doctor](/zh/gateway/doctor)

## Gateway(网关) 探测警告

当 `openclaw gateway probe` 能够连接到目标，但仍打印警告块时使用此方法。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查找：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是否关于 SSH 回退、多个 Gateway(网关)、缺少作用域或未解析的身份验证引用。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍尝试直接配置的/环回目标。
- `multiple reachable gateways detected` → 有多个目标响应。通常这意味着有意设置的多 Gateway(网关) 环境，或者存在过时/重复的监听器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 连接成功，但详细的 RPC 受限于作用域；请配对设备身份或使用具有 `operator.read` 的凭据。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → Gateway(网关) 已响应，但在正常操作员访问之前，此客户端仍需要配对/批准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 身份验证材料在此命令路径中对失败的目标不可用。

相关内容：

- [Gateway(网关)](/zh/cli/gateway)
- [同一主机上的多个 Gateway(网关)](/zh/gateway#multiple-gateways-same-host)
- [远程访问](/zh/gateway/remote)

## 渠道已连接，消息未流动

如果渠道状态为已连接但消息流已停止，请重点关注策略、权限和渠道特定的传递规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

查找：

- 私信 策略 (`pairing`, `allowlist`, `open`, `disabled`)。
- 群组允许列表和提及要求。
- 缺少渠道 API 权限/作用域。

常见特征：

- `mention required` → 消息被群组提及策略忽略。
- `pairing` / 待批准跟踪 → 发送者未获批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 渠道身份验证/权限问题。

相关内容：

- [渠道故障排除](/zh/channels/troubleshooting)
- [Discord](/zh/channels/discord)
- [Telegram](/zh/channels/telegram)
- [WhatsApp](/zh/channels/whatsapp)

## Cron 和心跳传递

如果 Cron 或心跳未运行或未传递，请首先验证调度器状态，然后验证传递目标。

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
- 心跳跳过原因 (`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

<AccordionGroup>
  <Accordion title="常见特征">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。 - `cron: timer tick failed` → 调度器时钟失败；请检查文件/日志/运行时错误。 - `heartbeat skipped` 伴随 `reason=quiet-hours` → 超出活动时间窗口。 - `heartbeat skipped` 伴随 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在，但仅包含空行/markdown 标题，因此 OpenClaw 跳过了模型调用。 - `heartbeat skipped` 伴随
    `reason=no-tasks-due` → `HEARTBEAT.md` 包含一个 `tasks:` 块，但在该时钟周期内没有任务到期。 - `heartbeat: unknown accountId` → 心跳传递目标的账户 ID 无效。 - `heartbeat skipped` 伴随 `reason=dm-blocked` → 心跳目标解析为私信 样式的目标，而 `agents.defaults.heartbeat.directPolicy` (或每代理覆盖) 设置为 `block`。
  </Accordion>
</AccordionGroup>

相关：

- [心跳](/zh/gateway/heartbeat)
- [计划任务](/zh/automation/cron-jobs)
- [计划任务：故障排除](/zh/automation/cron-jobs#troubleshooting)

## 节点已配对，工具失败

如果节点已配对但工具失败，请隔离前台、权限和审批状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

查找：

- 节点在线并具有预期功能。
- 授予摄像头/麦克风/位置/屏幕的 OS 权限。
- 执行审批和允许列表状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → node 应用程序必须在前台运行。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少操作系统权限。
- `SYSTEM_RUN_DENIED: approval required` → 批准待处理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表阻止。

相关：

- [执行批准](/zh/tools/exec-approvals)
- [节点故障排除](/zh/nodes/troubleshooting)
- [节点](/zh/nodes/index)

## Browser 工具失败

即使网关本身运行正常，但当 Browser 工具操作失败时，请使用此部分。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

检查以下内容：

- 是否已设置 `plugins.allow` 并包含 `browser`。
- 有效的浏览器可执行文件路径。
- CDP 配置文件的可达性。
- 用于 `existing-session` / `user` 配置文件的本地 Chrome 可用性。

<AccordionGroup>
  <Accordion title="插件 / 可执行文件签名">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除。
    - 当 `browser.enabled=true` 时 Browser 工具丢失 / 不可用 → `plugins.allow` 排除了 `browser`，因此插件从未加载。
    - `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
    - `browser.executablePath not found` → 配置的路径无效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不支持的方案，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口错误或超出范围。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前的网关安装缺少捆绑浏览器插件的 `playwright-core` 运行时依赖项；请运行 `openclaw doctor --fix`，然后重启网关。ARIA 快照和基本页面截图仍然可以使用，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出将不可用。
  </Accordion>
  <Accordion title="Chrome MCP / existing-会话 signatures">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP 现有会话尚未能附加到所选的浏览器数据目录。打开浏览器检查页面，启用远程调试，保持浏览器打开，批准首次附加提示，然后重试。如果不需要登录状态，建议使用托管 `openclaw` 配置文件。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
    - `Remote CDP for profile "<name>" is not reachable` → 网关主机无法访问配置的远程 CDP 端点。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有可访问的目标，或者 HTTP 端点有响应但无法打开 CDP WebSocket。
  </Accordion>
  <Accordion title="Element / screenshot / upload signatures">
    - `fullPage is not supported for element screenshots` → screenshot request mixed `--full-page` with `--ref` or `--element`.
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` screenshot calls must use page capture or a snapshot `--ref`, not CSS `--element`.
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP upload hooks need snapshot refs, not CSS selectors.
    - `existing-session file uploads currently support one file at a time.` → send one upload per call on Chrome MCP profiles.
    - `existing-session dialog handling does not support timeoutMs.` → dialog hooks on Chrome MCP profiles do not support timeout overrides.
    - `existing-session type does not support timeoutMs overrides.` → omit `timeoutMs` for `act:type` on `profile="user"` / Chrome MCP existing-会话 profiles, or use a managed/CDP browser profile when a custom timeout is required.
    - `existing-session evaluate does not support timeoutMs overrides.` → omit `timeoutMs` for `act:evaluate` on `profile="user"` / Chrome MCP existing-会话 profiles, or use a managed/CDP browser profile when a custom timeout is required.
    - `response body is not supported for existing-session profiles yet.` → `responsebody` still requires a managed browser or raw CDP profile.
    - stale viewport / dark-mode / locale / offline overrides on attach-only or remote CDP profiles → run `openclaw browser stop --browser-profile <name>` to close the active control 会话 and release Playwright/CDP emulation state without restarting the whole gateway.
  </Accordion>
</AccordionGroup>

相关：

- [Browser (OpenClaw-managed)](/zh/tools/browser)
- [Browser 故障排除](/zh/tools/browser-linux-troubleshooting)

## 如果您升级后突然出现问题

大多数升级后的问题是由于配置偏差或现在强制执行了更严格的默认设置。

<AccordionGroup>
  <Accordion title="1. Auth and URL override behavior changed">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    检查事项：

    - 如果是 `gateway.mode=remote`，CLI 调用可能指向远程，而您的本地服务正常。
    - 显式的 `--url` 调用不会回退到存储的凭据。

    常见特征：

    - `gateway connect failed:` → 错误的 URL 目标。
    - `unauthorized` → 端点可达但认证错误。

  </Accordion>
  <Accordion title="2. Bind and auth guardrails are stricter">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    检查事项：

    - 非回环绑定（`lan`、`tailnet`、`custom`）需要有效的 gateway 认证路径：共享令牌/密码认证，或正确配置的非回环 `trusted-proxy` 部署。
    - 旧密钥（如 `gateway.token`）不会替换 `gateway.auth.token`。

    常见特征：

    - `refusing to bind gateway ... without auth` → 非回环绑定没有有效的 gateway 认证路径。
    - 运行时运行时出现 `Connectivity probe: failed` → gateway 存活但使用当前认证/URL 无法访问。

  </Accordion>
  <Accordion title="3. Pairing and device identity state changed">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    检查事项：

    - 仪表板/节点的待处理设备审批。
    - 策略或身份更改后的待处理 私信 配对审批。

    常见特征：

    - `device identity required` → 未满足设备认证。
    - `pairing required` → 发送方/设备必须获得审批。

  </Accordion>
</AccordionGroup>

如果检查后服务配置和运行时仍然不一致，请从同一配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [认证](/zh/gateway/authentication)
- [后台执行和进程工具](/zh/gateway/background-process)
- [Gateway(网关) 拥有的配对](/zh/gateway/pairing)

## 相关

- [Doctor](/zh/gateway/doctor)
- [常见问题](/zh/help/faq)
- [Gateway(网关) 运维手册](/zh/gateway)
