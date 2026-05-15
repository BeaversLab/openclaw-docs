---
summary: "针对网关、通道、自动化、节点和浏览器的深度故障排除运行手册"
read_when:
  - The troubleshooting hub pointed you here for deeper diagnosis
  - You need stable symptom based runbook sections with exact commands
title: "故障排除"
sidebarTitle: "故障排除"
---

此页面是深度运行手册。如果您想先进行快速分诊流程，请从 [/help/故障排除](/zh/help/troubleshooting) 开始。

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

- `openclaw gateway status` 显示 `Runtime: running`、`Connectivity probe: ok` 和一行 `Capability: ...`。
- `openclaw doctor` 报告没有阻止性配置或服务问题。
- `openclaw channels status --probe` 显示实时帐户传输状态，以及在支持的情况下，显示探测/审计结果，例如 `works` 或 `audit ok`。

## 分裂脑安装与较新的配置保护

当网关服务在更新后意外停止，或者日志显示某个 `openclaw` 二进制文件比上次写入 `openclaw.json` 的版本更旧时，请使用此方法。

OpenClaw 会使用 `meta.lastTouchedVersion` 标记配置写入。只读命令仍然可以检查由较新的 OpenClaw 写入的配置，但进程和服务变更会拒绝从较旧的二进制文件继续。被阻止的操作包括网关服务的启动、停止、重启、卸载、强制服务重新安装、服务模式网关启动以及 `gateway --force` 端口清理。

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
  <Step title="移除过时的包装器">
    移除仍然指向旧的 `openclaw` 二进制文件的过时系统包或旧包装器条目。
  </Step>
</Steps>

<Warning>仅用于有意的降级或紧急恢复，请为单个命令设置 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作请保持未设置。</Warning>

## 因路径转义而跳过 Skill 符号链接

当日志包含以下内容时使用：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw 将每个 skill 根目录视为一个隔离边界。当
OpenClaw`~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或
`~/.openclaw/skills` 下的符号链接的实际目标解析到该根目录之外时，
除非该目标被显式信任，否则将被跳过。

检查链接：

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

如果该目标是预期的，请同时配置直接的 skill 根目录和
允许的符号链接目标：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

然后启动新的会话或等待 skills 监视器刷新。如果运行进程早于配置更改，
请重启网关。

请勿使用广泛的目标，例如 `~`、`/` 或整个同步的项目文件夹。
请将 `allowSymlinkTargets` 限制在包含受信任的
`SKILL.md` 目录的真实 skill 根目录。

相关内容：

- [Skills 配置](/zh/tools/skills-config#symlinked-sibling-repos)
- [配置示例](/zh/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 长上下文需要额外使用量

当日志/错误包含以下内容时使用：`HTTP 429: rate_limit_error: Extra usage is required for long context requests`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查找：

- 选定的 Anthropic Opus/Sonnet 模型具有 Anthropic`params.context1m: true`。
- 当前的 Anthropic 凭证不具备长上下文使用资格。
- 请求仅在需要 1M beta 路径的长会话/模型运行上失败。

修复选项：

<Steps>
  <Step title="Disable context1m">禁用该模型的 `context1m` 以回退到普通上下文窗口。</Step>
  <Step title="Use an eligible credential" AnthropicAnthropicAPI>
    使用具备长上下文请求资格的 Anthropic 凭证，或切换到 Anthropic API 密钥。
  </Step>
  <Step title="配置备用模型" Anthropic>
    配置备用模型，以便当 Anthropic 长上下文请求被拒绝时继续运行。
  </Step>
</Steps>

相关：

- [Anthropic](Anthropic/en/providers/anthropic)
- [Token 使用和成本](/zh/reference/token-use)
- [为什么我会看到来自 Anthropic 的 HTTP 429？](Anthropic/en/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本地 OpenAI 兼容后端通过直接探测但代理运行失败

在以下情况使用：

- `curl ... /v1/models` 正常工作
- 微小的直接 `/v1/chat/completions` 调用正常工作
- OpenClaw 模型运行仅在普通代理轮次中失败

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

查找：

- 直接微小调用成功，但 OpenClaw 运行仅在较大提示词时失败
- `model_not_found` 或 404 错误，尽管直接 `/v1/chat/completions`
  使用相同的裸模型 ID 可以正常工作
- 关于 `messages[].content` 需要字符串的后端错误
- 使用 OpenAI 兼容本地后端时出现的间歇性 `incomplete turn detected ... stopReason=stop payloads=0`OpenAI 警告
- 仅在使用较大提示词令牌计数或完整代理运行时提示词时出现的后端崩溃

<AccordionGroup>
  <Accordion title="常见特征">
    - `model_not_found` 搭配本地 MLX/vLLM 风格服务器 → 验证 `baseUrl` 包含 `/v1`，`api` 对于 `/v1/chat/completions` 后端是 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是不带前缀的提供商本地 ID。使用提供商前缀选择一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；保持目录条目为 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 后端拒绝结构化的 Chat Completions 内容部分。修复方法：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0`OpenClawOpenAIOpenClaw → 后端完成了 Chat Completions 请求，但在该轮对话中未返回用户可见的助手文本。OpenClaw 会重试一次可重放安全的空 OpenAI 兼容轮次；持续失败通常意味着后端正在发出空/非文本内容或抑制了最终答案文本。
    - 直接的微小请求成功，但 OpenClaw 代理运行失败并伴随后端/模型崩溃（例如某些 `inferrs`OpenClaw 构建版上的 Gemma） → OpenClaw 传输层可能已正确；问题在于后端无法处理更大的代理运行时提示词形状。
    - 禁用工具后失败减少但未消失 → 工具模式是压力的一部分，但剩余问题仍是上游模型/服务器容量或后端错误。

  </Accordion>
  <Accordion title="修复选项">
    1. 为纯字符串聊天补全后端设置 `compat.requiresStringContent: true`。
    2. 为无法可靠处理 OpenClaw 工具架构表面的模型/后端设置 `compat.supportsTools: false`OpenClawOpenClaw。
    3. 尽可能降低提示词压力：更小的工作区引导、更短的会话历史、更轻量的本地模型，或具有更强长上下文支持的后端。
    4. 如果微小的直接请求持续通过，但 OpenClaw 代理轮次仍在后端内部崩溃，请将其视为上游服务器/模型的限制，并使用接受的有效负载形状（payload shape）在那里提交重现问题。
  </Accordion>
</AccordionGroup>

相关内容：

- [配置](/zh/gateway/configuration)
- [本地模型](/zh/gateway/local-models)
- [OpenAI 兼容端点](OpenAI/en/gateway/configuration-reference#openai-compatible-endpoints)

## 无回复

如果渠道已启动但无响应，请在重新连接任何内容之前检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

查找以下内容：

- 私信发送者的配对挂起。
- 群组提及 gating (`requireMention`, `mentionPatterns`)。
- 渠道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 群组消息被忽略，直到被提及。
- `pairing request` → 发送者需要批准。
- `blocked` / `allowlist` → 发送者/渠道已被策略过滤。

相关内容：

- [渠道故障排除](/zh/channels/troubleshooting)
- [群组](/zh/channels/groups)
- [配对](/zh/channels/pairing)

## 仪表盘控制 UI 连接性

当仪表盘/控制 UI 无法连接时，请验证 URL、身份验证模式和安全上下文假设。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

查找以下内容：

- 正确的探测 URL 和仪表盘 URL。
- 客户端和网关之间的身份验证模式/令牌不匹配。
- 在需要设备身份的地方使用了 HTTP。

<AccordionGroup>
  <Accordion title="Connect / auth signatures">
    - `device identity required` → 非安全上下文或缺少设备身份验证。
    - `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者您正在从非环回浏览器源连接，且没有明确的允许列表）。
    - `device nonce required` / `device nonce mismatch` → 客户端未完成基于质询的设备身份验证流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客户端为当前握手签署了错误的负载（或时间戳已过期）。
    - `AUTH_TOKEN_MISMATCH` 搭配 `canRetryWithDeviceToken=true` → 客户端可以使用缓存的设备令牌进行一次可信的重试。
    - 该缓存令牌重试会重用与配对设备令牌一起存储的缓存范围集。显式的 `deviceToken` / 显式 `scopes` 调用者将改为保留其请求的范围集。
    - 在该重试路径之外，连接身份验证的优先级依次是：显式共享令牌/密码、显式 `deviceToken`、存储的设备令牌，然后是引导令牌。
    - 在异步 Tailscale Serve Control UI 路径上，针对同一个 `{scope, ip}` 的失败尝试在限制器记录失败之前会被序列化。因此，来自同一客户端的两个并发错误重试可能会在第二次尝试时显示 `retry later`，而不是两个普通的不匹配错误。
    - 来自浏览器源环回客户端的 `too many failed authentication attempts (retry later)` → 来自同一规范化 `Origin` 的重复失败将被暂时锁定；另一个本地主机源使用单独的存储桶。
    - 在该重试后重复 `unauthorized` → 共享令牌/设备令牌漂移；刷新令牌配置并在需要时重新批准/轮换设备令牌。
    - `gateway connect failed:` → 错误的主机/端口/URL 目标。

  </Accordion>
</AccordionGroup>

### Auth detail codes quick map

Use `error.details.code` from the failed `connect` response to pick the next action:

| Detail code                  | 含义                                                                                                                                                                     | 建议操作                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享令牌。                                                                                                                                             | 在客户端中粘贴/设置令牌并重试。对于仪表板路径：`openclaw config get gateway.auth.token` 然后粘贴到控制 UI 设置中。                                                                                                                                      |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关身份验证令牌不匹配。                                                                                                                                       | 如果 `canRetryWithDeviceToken=true`，允许一次受信任的重试。缓存令牌重试会重复使用已存储的批准范围；显式的 `deviceToken` / `scopes` 调用方会保留请求的范围。如果仍然失败，请运行[令牌漂移恢复检查清单](/zh/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的每设备令牌已过期或已被吊销。                                                                                                                                       | 使用 [devices CLI](CLI/en/cli/devices) 轮换/重新批准设备令牌，然后重新连接。                                                                                                                                                                            |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 中的 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在出现时使用 `requestId` / `remediationHint`。 | 批准待处理的请求：`openclaw devices list` 然后 `openclaw devices approve <requestId>`。在您审查所请求的访问权限后，范围/角色升级使用相同的流程。                                                                                                        |

<Note>使用共享网关令牌/密码进行身份验证的直接环回后端 RPC 不应依赖于 CLI 的配对设备范围基线。如果子代理或其他内部调用仍然失败并显示 CLI`scope-upgrade`，请验证调用方正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，并且未强制使用显式的 `deviceIdentity` 或设备令牌。</Note>

设备身份验证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示 nonce/签名错误，请更新连接的客户端并进行验证：

<Steps>
  <Step title="Wait for connect.challenge">客户端等待网关发出的 `connect.challenge`。</Step>
  <Step title="对负载进行签名">客户端对绑定挑战的负载进行签名。</Step>
  <Step title="发送设备随机数">客户端发送带有相同挑战随机数的 `connect.params.device.nonce`。</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒绝：

- 配对设备令牌会话只能管理**它们自己的**设备，除非调用方也拥有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能请求调用方会话已经拥有的操作员范围

相关：

- [配置](/zh/gateway/configuration) (网关认证模式)
- [控制 UI](/zh/web/control-ui)
- [设备](/zh/cli/devices)
- [远程访问](/zh/gateway/remote)
- [受信任代理认证](/zh/gateway/trusted-proxy-auth)

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
- 服务配置不匹配 (`Config (cli)` vs `Config (service)`)。
- 端口/监听器冲突。
- 当使用 `--deep` 时，额外的 launchd/systemd/schtasks 安装。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="常见特征">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未启用本地网关模式，或者配置文件被破坏并丢失了 `gateway.mode`。解决方法：在配置中设置 `gateway.mode="local"`，或者重新运行 `openclaw onboard --mode local` / `openclaw setup`OpenClaw 以重新生成预期的本地模式配置。如果您通过 Podman 运行 OpenClaw，默认配置路径为 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 在没有有效网关认证路径（令牌/密码，或配置的受信任代理）的情况下进行非环回绑定。
    - `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。
    - `Other gateway-like services detected (best effort)` → 存在过时或并行的 launchd/systemd/schtasks 单元。大多数设置每台机器应保留一个网关；如果确实需要多个，请隔离端口 + 配置/状态/工作区。请参阅 [/gateway#multiple-gateways-same-host](/zh/gateway#multiple-gateways-same-host)。
    - 来自诊断程序的 `System-level OpenClaw gateway service detected` → 存在 systemd 系统单元，但缺少用户级服务。在允许诊断程序安装用户服务之前，请删除或禁用重复项；如果系统单元是指定的监管程序，请设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 已安装的监管程序仍然固定使用旧的 `--port`。运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然后重启网关服务。

  </Accordion>
</AccordionGroup>

相关：

- [后台执行和进程工具](/zh/gateway/background-process)
- [配置](/zh/gateway/configuration)
- [诊断程序](/zh/gateway/doctor)

## Gateway(网关) 拒绝了无效配置

当 Gateway(网关) 启动失败并显示 Gateway(网关)`Invalid config` 或热重载日志显示它跳过了无效编辑时，请使用此方法。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

查找：

- `Invalid config at ...`
- `config reload skipped (invalid config): ...`
- `Config write rejected: ...`
- 活动配置旁边带有时间戳的 `openclaw.json.rejected.*` 文件
- 如果 `doctor --fix` 修复了损坏的直接编辑，则会出现一个带时间戳的 `openclaw.json.clobbered.*` 文件

<AccordionGroup>
  <Accordion title="发生了什么">
    - 配置在启动、热重载或 OpenClaw 拥有的写入期间未通过验证。
    - Gateway(网关) 启动失败并关闭，而不是重写 `openclaw.json`。
    - 热重载会跳过无效的外部编辑，并保持当前运行时配置处于活动状态。
    - OpenClaw 拥有的写入会在提交前拒绝无效/破坏性载荷，并保存 `.rejected.*`。
    - `openclaw doctor --fix` 负责修复。它可以删除非 JSON 前缀或恢复最后已知的良好副本，同时将拒绝的载荷保存为 `.clobbered.*`。

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
  <Accordion title="常见特征">
    - 存在 `.clobbered.*` → doctor 在修复活动配置时保留了损坏的外部编辑。
    - 存在 `.rejected.*` → OpenClaw 拥有的配置写入在提交前未通过架构或覆盖检查。
    - `Config write rejected:` → 写入尝试删除所需的形状、急剧缩小文件或保留无效配置。
    - `config reload skipped (invalid config):` → 直接编辑未通过验证并被正在运行的 Gateway(网关) 忽略。
    - `Invalid config at ...` → 启动在 Gateway(网关) 服务启动之前失败。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → OpenClaw 拥有的写入被拒绝，因为它与最后已知的良好备份相比丢失了字段或大小。
    - `Config last-known-good promotion skipped` → 候选文件包含编辑过的机密占位符，例如 `***`。

  </Accordion>
  <Accordion title="修复选项">
    1. 运行 `openclaw doctor --fix` 以让 doctor 修复被添加前缀/损坏的配置或恢复最后一次已知的良好配置。
    2. 仅从 `.clobbered.*` 或 `.rejected.*` 复制所需的键，然后使用 `openclaw config set` 或 `config.patch` 应用它们。
    3. 在重启前运行 `openclaw config validate`。
    4. 如果您手动编辑，请保留完整的 JSON5 配置，而不仅仅是您想要更改的部分对象。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/zh/cli/config)
- [配置：热重载](/zh/gateway/configuration#config-hot-reload)
- [配置：严格验证](/zh/gateway/configuration#strict-validation)
- [Doctor](/zh/gateway/doctor)

## Gateway(网关) 探测警告

当 `openclaw gateway probe` 成功连接到目标但仍打印警告块时，请使用本节内容。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查找：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是关于 SSH 回退、多个 Gateway(网关)、缺少作用域还是未解析的身份验证引用。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍尝试直接配置/环回目标。
- `multiple reachable gateways detected` → 多个目标响应。这通常意味着有意设置的多 Gateway(网关) 环境或过时/重复的侦听器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)`RPC → 连接成功，但详细 RPC 受作用域限制；请配对设备身份或使用具有 `operator.read` 的凭据。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed`RPCGateway(网关) → 连接成功，但完整的诊断 RPC 集超时或失败。请将其视为诊断功能降级的可访问 Gateway(网关)；比较 `--json` 输出中的 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → Gateway(网关) 已响应，但此客户端在正常操作员访问之前仍需要配对/批准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 在此命令路径中，失败目标的认证材料不可用。

相关：

- [Gateway(网关)](<Gateway(网关)/en/cli/gateway>)
- [同一主机上的多个网关](/zh/gateway#multiple-gateways-same-host)
- [远程访问](/zh/gateway/remote)

## 渠道已连接，消息未流转

如果渠道状态显示为已连接，但消息流已停止，请重点检查策略、权限和渠道特定的投递规则。

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
- `pairing` / 待批准追踪 → 发送者未被批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 渠道认证/权限问题。

相关：

- [渠道故障排除](/zh/channels/troubleshooting)
- [Discord](Discord/en/channels/discord)
- [Telegram](Telegram/en/channels/telegram)
- [WhatsApp](WhatsApp/en/channels/whatsapp)

## Cron 和心跳投递

如果 cron 或心跳未运行或未投递，请首先验证调度程序状态，然后验证投递目标。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

查找：

- Cron 已启用且存在下一次唤醒时间。
- 作业运行历史状态 (`ok`, `skipped`, `error`)。
- 心跳跳过原因 (`quiet-hours`, `requests-in-flight`, `cron-in-progress`, `lanes-busy`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

<AccordionGroup>
  <Accordion title="常见特征">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
    - `cron: timer tick failed` → 调度器计时失败；请检查文件/日志/运行时错误。
    - `heartbeat skipped` 搭配 `reason=quiet-hours` → 超出活动时间窗口。
    - `heartbeat skipped` 搭配 `reason=empty-heartbeat-file` → `HEARTBEAT.md`OpenClaw 存在但仅包含空行/markdown 标题，因此 OpenClaw 跳过了模型调用。
    - `heartbeat skipped` 搭配 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 块，但在此次计时中没有任务到期。
    - `heartbeat: unknown accountId` → 心跳传递目标的帐户 ID 无效。
    - `heartbeat skipped` 搭配 `reason=dm-blocked` → 心跳目标解析为 私信（私信）风格的目的地，但 `agents.defaults.heartbeat.directPolicy`（或每代理覆盖）设置为 `block`。

  </Accordion>
</AccordionGroup>

相关：

- [心跳](/zh/gateway/heartbeat)
- [计划任务](/zh/automation/cron-jobs)
- [计划任务：故障排除](/zh/automation/cron-jobs#troubleshooting)

## 节点已配对，工具失败

如果节点已配对但工具失败，请隔离前台、权限和批准状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

查找：

- 节点在线且具备预期功能。
- 授予的操作系统相机/麦克风/位置/屏幕权限。
- 执行批准和允许列表状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须在前台。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少操作系统权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行批准待定。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表阻止。

相关：

- [执行批准](/zh/tools/exec-approvals)
- [节点故障排除](/zh/nodes/troubleshooting)
- [节点](/zh/nodes/index)

## 浏览器工具失败

当浏览器工具操作失败但网关本身运行正常时，请使用此指南。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

查找：

- 是否设置了 `plugins.allow` 并包含 `browser`。
- 有效的浏览器可执行文件路径。
- CDP 配置文件可达性。
- 本地 Chrome 可用性，适用于 `existing-session` / `user` 配置文件。

<AccordionGroup>
  <Accordion title="插件 / 可执行文件签名">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除了。
    - 浏览器工具缺失/不可用，而 `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此插件从未加载。
    - `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
    - `browser.executablePath not found` → 配置的路径无效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不受支持的方案，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口错误或超出范围。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前的网关安装缺少核心浏览器运行时依赖；请重新安装或更新 OpenClaw，然后重启网关。ARIA 快照和基本页面截图仍然可以工作，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出将保持不可用。

  </Accordion>
  <Accordion title="Chrome MCP / 现有会话签名">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP 现有会话尚无法附加到所选的浏览器数据目录。打开浏览器检查页面，启用远程调试，保持浏览器打开，批准第一个附加提示，然后重试。如果不需要登录状态，请首选托管 `openclaw` 配置文件。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
    - `Remote CDP for profile "<name>" is not reachable` → 配置的远程 CDP 端点从网关主机无法访问。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有可访问的目标，或者 HTTP 端点已响应但 CDP WebSocket 仍然无法打开。

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

- [Browser (OpenClaw-managed)](OpenClaw/en/tools/browser)
- [Browser 故障排除](/zh/tools/browser-linux-troubleshooting)

## 如果您进行了升级并且某些功能突然损坏

大多数升级后的损坏是由于配置漂移或现在强制执行的更严格的默认设置。

<AccordionGroup>
  <Accordion title="1. Auth and URL override behavior changed">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    检查事项：

    - 如果 `gateway.mode=remote`CLI，CLI 调用可能指向远程，而您的本地服务正常。
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

    - 非环回绑定 (`lan`, `tailnet`, `custom`) 需要有效的 Gateway(网关) 认证路径：共享令牌/密码认证，或正确配置的非环回 `trusted-proxy` 部署。
    - 诸如 `gateway.token` 的旧密钥不会替换 `gateway.auth.token`。

    常见特征：

    - `refusing to bind gateway ... without auth` → 非环回绑定且没有有效的 Gateway(网关) 认证路径。
    - `Connectivity probe: failed` 且运行时正在运行 → Gateway(网关) 存活但使用当前的 auth/url 无法访问。

  </Accordion>
  <Accordion title="3. Pairing and device identity state changed">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    检查事项：

    - Dashboard/节点的待处理设备批准。
    - 策略或身份更改后的待处理私聊配对批准。

    常见特征：

    - `device identity required` → 设备认证未满足。
    - `pairing required` → 发送方/设备必须被批准。

  </Accordion>
</AccordionGroup>

如果检查后服务配置和运行时仍然不一致，请从相同的配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [Authentication](/zh/gateway/authentication)
- [Background exec and process 工具](/zh/gateway/background-process)
- [Gateway(网关)-owned pairing](<Gateway(网关)/en/gateway/pairing>)

## 相关

- [Doctor](/zh/gateway/doctor)
- [常见问题](/zh/help/faq)
- [Gateway(网关) runbook](<Gateway(网关)/en/gateway>)
