---
summary: "针对 Gateway（网关）、渠道、自动化、节点和浏览器的深度故障排除手册"
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

- `openclaw gateway status` 显示 `Runtime: running`、`Connectivity probe: ok` 以及一个 `Capability: ...` 行。
- `openclaw doctor` 报告没有阻塞的配置/服务问题。
- `openclaw channels status --probe` 显示每个账户的实时传输状态，并且在支持的情况下，显示探测/审计结果，例如 `works` 或 `audit ok`。

## 更新后

当更新完成但 Gateway（网关）停机、渠道为空，或模型调用开始出现 401 失败时，请使用此方法。

```bash
openclaw status --all
openclaw update status --json
openclaw gateway status --deep
openclaw doctor --fix
openclaw gateway restart
```

查找：

- `openclaw status` / `openclaw status --all` 中的 `Update restart`。待处理或
  失败的交接包括下一步要运行的命令。
- Channels 下的 `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`。
  这意味着渠道配置仍然存在，但在渠道加载之前插件注册失败了。
- 重新认证后提供商返回 401。`openclaw doctor --fix`OAuth 会检查陈旧的
  每个代理的 OAuth 认证影分身 并移除旧副本，以便所有代理都解析
  当前共享的配置文件。

## 裂脑安装和较新的配置保护

当网关服务在更新后意外停止，或日志显示一个 `openclaw` 二进制文件比上次写入 `openclaw.json` 的版本更旧时，请使用此方法。

OpenClaw 会使用 OpenClaw`meta.lastTouchedVersion`OpenClaw 标记配置写入。只读命令仍可检查由较新的 OpenClaw 写入的配置，但进程和服务变更会拒绝从较旧的二进制文件继续执行。被阻止的操作包括网关服务启动、停止、重启、卸载、强制服务重装、服务模式网关启动，以及 `gateway --force` 端口清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="修复 PATH">
    修复 `PATH`，以便 `openclaw` 解析到较新的安装，然后重新运行该操作。
  </Step>
  <Step title="重新安装网关服务">
    从较新的安装中重新安装预期的网关服务：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="删除过时的封装程序">
    删除仍指向旧 `openclaw` 二进制文件的过时系统包或旧封装程序条目。
  </Step>
</Steps>

<Warning>仅用于有意的降级或紧急恢复，为单个命令设置 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作请保持其未设置状态。</Warning>

## 回滚后的协议不匹配

当您降级或回滚 OpenClaw 后日志持续打印 `protocol mismatch` 时使用此方法。这意味着正在运行较旧的 Gateway(网关)，但较新的本地客户端进程仍尝试使用较旧的 Gateway(网关) 无法支持的协议范围进行重新连接。

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

查找：

- Gateway(网关) 日志中的 `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>`。
- `openclaw gateway status --deep` 中的 `Established clients:` 或 `openclaw doctor --deep` 中的 `Gateway clients`。这将列出连接到 Gateway(网关) 端口的活跃 TCP 客户端，包括操作系统允许时的 PID 和命令行。
- 命令行指向您从中回滚的较新 OpenClaw 安装或封装程序的客户端进程。

修复：

1. 停止或重新启动 `gateway status --deep` 显示的过时 OpenClaw 客户端进程。
2. 重新启动嵌入 OpenClaw 的应用程序或封装程序，例如本地仪表板、编辑器、应用服务器助手或长时间运行的 `openclaw logs --follow` shell。
3. 重新运行 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 并确认过时的客户端 PID 已消失。

不要让较旧的 Gateway(网关) 接受较新的不兼容协议。协议升级保护线路契约；回滚恢复是一个进程/版本清理问题。

## 因路径转义跳过 Skills 符号链接

当日志包含以下内容时使用：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw 将每个 skill 根目录视为隔离边界。当 `~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或 `~/.openclaw/skills` 下的符号链接的实际目标解析到该根目录之外时，该链接会被跳过，除非该目标被明确信任。

检查链接：

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

如果该目标是预期的，请同时配置直接的 skill 根目录和允许的符号链接目标：

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

然后启动新会话或等待 skills 监视器刷新。如果运行进程早于配置更改，请重启网关。

请勿使用 `~`、`/` 或整个同步项目文件夹等宽泛目标。请将 `allowSymlinkTargets` 限制在包含受信任 `SKILL.md` 目录的实际 skill 根目录范围内。

相关：

- [Skills 配置](/zh/tools/skills-config#symlinked-sibling-repos)
- [配置示例](/zh/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 长上下文需要额外使用量

当日志/错误包含 `HTTP 429: rate_limit_error: Extra usage is required for long context requests` 时使用。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查找：

- 所选 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 当前的 Anthropic 凭证不符合长上下文使用条件。
- 请求仅在需要 1M beta 路径的长会话/模型运行中失败。

修复选项：

<Steps>
  <Step title="Disable context1m">禁用该模型的 `context1m` 以回退到常规上下文窗口。</Step>
  <Step title="Use an eligible credential">使用符合长上下文请求条件的 Anthropic 凭证，或切换到 Anthropic API 密钥。</Step>
  <Step title="Configure fallback models">配置回退模型，以便在 Anthropic 长上下文请求被拒绝时继续运行。</Step>
</Steps>

相关内容：

- [Anthropic](Anthropic/en/providers/anthropic)
- [Token 使用量和成本](/zh/reference/token-use)
- [为什么我会从 Anthropic 收到 HTTP 429？](/zh/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本地 OpenAI 兼容后端通过了直接探测，但代理运行失败

在以下情况使用：

- `curl ... /v1/models` 工作正常
- 微小的直接 `/v1/chat/completions` 调用工作正常
- OpenClaw 模型运行仅在正常的代理轮次中失败

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

查找：

- 微小的直接调用成功，但 OpenClaw 运行仅在较大的提示词下失败
- 出现 `model_not_found` 或 404 错误，即使直接 `/v1/chat/completions`
  使用相同的裸模型 ID 工作正常
- 后端报错，关于 `messages[].content` 需要字符串
- 间歇性 `incomplete turn detected ... stopReason=stop payloads=0` 警告，带有 OpenAI 兼容的本地后端
- 后端崩溃，仅出现在较大的提示词 token 数量或完整代理运行时提示词的情况下

<AccordionGroup>
  <Accordion title="常见特征">
    - `model_not_found` 搭配本地 MLX/vLLM 风格服务器 → 验证 `baseUrl` 包含 `/v1`，对于 `/v1/chat/completions` 后端，`api` 为 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是不带前缀的提供商本地 ID。使用提供商前缀选择一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；将目录条目保留为 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 后端拒绝结构化的 Chat Completions 内容部分。修复：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `validation.keys` 或允许的消息键（如 `["role","content"]`OpenAI） → 后端拒绝 Chat Completions 消息上的 OpenAI 风格重放元数据。修复：设置 `models.providers.<provider>.models[].compat.strictMessageKeys: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0`OpenClawOpenAIOpenClaw → 后端完成了 Chat Completions 请求，但针对该轮次未返回用户可见的助手文本。OpenClaw 会重放安全的空 OpenAI 兼容轮次一次；持续失败通常意味着后端正在发出空/非文本内容或正在抑制最终答案文本。
    - 直接的小型请求成功，但 OpenClaw 代理运行失败并伴随后端/模型崩溃（例如某些 `inferrs`OpenClaw 构建版本上的 Gemma） → OpenClaw 传输可能已经是正确的；后端在处理更大的代理运行时提示形状时失败。
    - 禁用工具后失败减少但未消失 → 工具模式是压力的一部分，但剩余问题仍是上游模型/服务器容量或后端错误。

  </Accordion>
  <Accordion title="修复选项">
    1. 为纯字符串 Chat Completions 后端设置 `compat.requiresStringContent: true`。
    2. 为严格的 Chat Completions 后端设置 `compat.strictMessageKeys: true`，这些后端仅接受每条消息中的 `role` 和 `content`。
    3. 为无法可靠处理 OpenClaw 工具架构表面的模型/后端设置 `compat.supportsTools: false`OpenClawOpenClaw。
    4. 尽可能降低提示词压力：更小的工作区引导、更短的会话历史、更轻量的本地模型，或具有更强长上下文支持的后端。
    5. 如果微小的直接请求持续通过，但 OpenClaw 代理轮次仍在后端内部崩溃，则将其视为上游服务器/模型的限制，并使用接受的有效负载形状在此处提交可复现问题。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/zh/gateway/configuration)
- [本地模型](/zh/gateway/local-models)
- [OpenAI 兼容端点](OpenAI/en/gateway/configuration-reference#openai-compatible-endpoints)

## 无回复

如果渠道已启用但没有任何回复，请在重新连接任何内容之前检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

查找：

- 私信发送者配对挂起。
- 群组提及限制 (`requireMention`, `mentionPatterns`)。
- 渠道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 群组消息在提及前被忽略。
- `pairing request` → 发送者需要批准。
- `blocked` / `allowlist` → 发送者/渠道已被策略过滤。

相关：

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

查找：

- 正确的探测 URL 和仪表盘 URL。
- 客户端和网关之间的身份验证模式/令牌不匹配。
- 在需要设备身份的地方使用了 HTTP。

<AccordionGroup>
  <Accordion title="连接 / 身份验证签名">
    - `device identity required` → 非安全上下文或缺少设备身份验证。
    - `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者您正在从没有显式允许列表的非环回浏览器源进行连接）。
    - `device nonce required` / `device nonce mismatch` → 客户端未完成基于挑战的设备身份验证流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客户端为当前握手签名了错误的负载（或时间戳已过期）。
    - 带有 `canRetryWithDeviceToken=true` 的 `AUTH_TOKEN_MISMATCH` → 客户端可以使用缓存的设备令牌进行一次受信任的重试。
    - 该缓存令牌重试会重用与配对设备令牌一起存储的缓存作用域集。显式 `deviceToken` / 显式 `scopes` 调用方将保留其请求的作用域集。
    - `AUTH_SCOPE_MISMATCH` → 设备令牌已被识别，但其批准的作用域未覆盖此连接请求；请重新配对或批准请求的作用域合约，而不是轮换共享网关令牌。
    - 在该重试路径之外，连接身份验证优先级首先是显式共享令牌/密码，然后是显式 `deviceToken`，接着是存储的设备令牌，最后是引导令牌。
    - 在异步 Tailscale Serve Control UI 路径上，针对同一 `{scope, ip}` 的失败尝试在限制器记录失败之前会被序列化。因此，来自同一客户端的两个错误的并发重试可能会在第二次尝试时显示 `retry later`，而不是两次普通的不匹配错误。
    - 来自浏览器源环回客户端的 `too many failed authentication attempts (retry later)` → 来自同一规范化 `Origin` 的重复失败将被暂时锁定；另一个本地主机源使用单独的存储桶。
    - 该重试后的重复 `unauthorized` → 共享令牌/设备令牌漂移；如果需要，请刷新令牌配置并重新批准/轮换设备令牌。
    - `gateway connect failed:` → 错误的主机/端口/URL 目标。

  </Accordion>
</AccordionGroup>

### 认证详情代码快速参考

根据失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| 详情代码                     | 含义                                                                                                                                                                           | 建议操作                                                                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享令牌。                                                                                                                                                   | 在客户端中粘贴/设置令牌并重试。对于仪表板路径：`openclaw config get gateway.auth.token`，然后粘贴到控制 UI 设置中。                                                                                                                               |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关认证令牌不匹配。                                                                                                                                                 | 如果是 `canRetryWithDeviceToken=true`，则允许一次可信重试。缓存令牌重试会重用已存储的批准范围；显式 `deviceToken` / `scopes` 调用方会保留请求的范围。如果仍然失败，请运行[令牌漂移恢复检查清单](/zh/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的每设备令牌已过期或已撤销。                                                                                                                                               | 使用 [devices CLI](/zh/cli/devices) 轮换/重新批准设备令牌，然后重新连接。                                                                                                                                                                         |
| `AUTH_SCOPE_MISMATCH`        | 设备令牌有效，但其批准的角色/范围未覆盖此连接请求。                                                                                                                            | 重新配对设备或批准请求的范围合同；不要将此视为共享令牌漂移。                                                                                                                                                                                      |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 中是否存在 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在出现时使用 `requestId` / `remediationHint`。 | 批准待处理的请求：`openclaw devices list`，然后 `openclaw devices approve <requestId>`。范围/角色升级在您审查请求的访问权限后使用相同的流程。                                                                                                     |

<Note>使用共享网关令牌/密码进行身份验证的直接环回后端 RPC 不应依赖 CLI 的配对设备范围基线。如果子代理或其他内部调用仍然因 `scope-upgrade` 而失败，请验证调用方正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，并且没有强制执行显式 `deviceIdentity` 或设备令牌。</Note>

设备认证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示 nonce/签名 错误，请更新连接的客户端并进行验证：

<Steps>
  <Step title="Wait for connect.challenge">客户端等待 Gateway(网关) 发出的 `connect.challenge`。</Step>
  <Step title="Sign the payload">客户端对绑定 challenge 的 payload 进行签名。</Step>
  <Step title="Send the device nonce">客户端发送带有相同 challenge nonce 的 `connect.params.device.nonce`。</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒绝：

- paired-device token 会话只能管理**它们自己的**设备，除非调用者也拥有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能请求调用者会话已经拥有的 operator scopes

相关内容：

- [配置](/zh/gateway/configuration) （Gateway(网关) 认证模式）
- [控制 UI](/zh/web/control-ui)
- [设备](/zh/cli/devices)
- [远程访问](/zh/gateway/remote)
- [受信任代理认证](/zh/gateway/trusted-proxy-auth)

## Gateway(网关) 服务未运行

当服务已安装但进程无法保持运行时，请使用此方法。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # also scan system-level services
```

查找：

- `Runtime: stopped` 并附带退出提示。
- 服务配置不匹配（`Config (cli)` 与 `Config (service)`）。
- 端口/监听器冲突。
- 当使用 `--deep` 时存在额外的 launchd/systemd/schtasks 安装。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="Common signatures">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未启用本地网关模式，或者配置文件被覆盖并丢失了 `gateway.mode`。修复方法：在配置中设置 `gateway.mode="local"`，或重新运行 `openclaw onboard --mode local` / `openclaw setup`OpenClaw 以重新生成预期的本地模式配置。如果您通过 Podman 运行 OpenClaw，默认配置路径为 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 非环回绑定且没有有效的网关身份验证路径（令牌/密码，或配置的可信代理）。
    - `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。
    - `Other gateway-like services detected (best effort)` → 存在陈旧或并行的 launchd/systemd/schtasks 单元。大多数设置每台机器应保留一个网关；如果确实需要多个，请隔离端口 + 配置/状态/工作区。请参阅 [/gateway#multiple-gateways-same-host](/zh/gateway#multiple-gateways-same-host)。
    - `System-level OpenClaw gateway service detected` 来自 doctor → 存在 systemd 系统单元，但缺少用户级服务。在允许 doctor 安装用户服务之前，删除或禁用重复项；如果系统单元是预期的主管，则设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 已安装的主管仍然固定旧的 `--port`。运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然后重启网关服务。

  </Accordion>
</AccordionGroup>

相关：

- [后台执行和进程工具](/zh/gateway/background-process)
- [配置](/zh/gateway/configuration)
- [诊断工具](/zh/gateway/doctor)

## Gateway(网关) 在高内存使用期间退出

当 Gateway(网关) 在负载下消失、主管报告 OOM 样式的重启，或日志提及 Gateway(网关)`critical memory pressure bundle written` 时，请使用本节内容。

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

查找：

- 最新稳定包中的 `Reason: diagnostic.memory.pressure.critical`。
- 使用 `Memory pressure:` 配合 `critical/rss_threshold`、`critical/heap_threshold` 或 `critical/rss_growth`。
- 接近堆限制的 `V8 heap:` 值。
- `Largest session files:` 条目，例如 `agents/<agent>/sessions/<session>.jsonl` 或 `sessions/<session>.jsonl`。
- 当 gateway 在容器或受限内存服务中运行时，Linux cgroup 内存计数器。

常见特征：

- `critical memory pressure bundle written` 在重启前不久出现 → OpenClaw 捕获了 OOM 前的稳定性包。请使用 `openclaw gateway stability --bundle latest` 检查它。
- `memory pressure: level=critical ... memoryPressureSnapshot=disabled` 出现在 gateway 日志中 → OpenClaw 检测到严重的内存压力，但 OOM 前的稳定性快照已关闭。
- `Largest session files:` 指向一个非常大的已编辑记录路径 → 减少保留的会话历史记录，检查会话增长情况，或在重启前将旧记录移出活动存储。
- `V8 heap:` 已用字节数接近堆限制 → 降低提示/会话压力，减少并发工作，或仅在确认工作负载符合预期后提高 Node 堆限制。
- `Memory pressure: critical/rss_growth` → 内存在一个采样窗口内快速增长。检查最新的日志中是否有大型导入、失控的工具输出、重复重试或一批排队的代理工作。
- 日志中出现严重内存压力但不存在包 → 这是默认行为。设置 `diagnostics.memoryPressureSnapshot: true` 以在未来的严重内存压力事件中捕获 OOM 前的稳定性包。

稳定性包不包含有效负载。它包括操作内存证据和已编辑的相对文件路径，不包括消息文本、webhook 主体、凭据、令牌、Cookie 或原始会话 ID。请将诊断导出附加到错误报告中，而不是复制原始日志。

相关：

- [Gateway(网关) 健康](/zh/gateway/health)
- [诊断导出](/zh/gateway/diagnostics)
- [会话](/zh/cli/sessions)

## Gateway(网关) 拒绝了无效配置

当 Gateway(网关) 启动失败并出现 `Invalid config` 或热重载日志提示它跳过了无效编辑时，请使用此方法。

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
- 活动配置旁边的带时间戳 `openclaw.json.rejected.*` 文件
- 如果 `doctor --fix` 修复了损坏的直接编辑，则会有一个带时间戳 `openclaw.json.clobbered.*` 文件
- OpenClaw 为每个配置路径保留最新的 32 个 `.clobbered.*` 文件，并轮换较旧的文件

<AccordionGroup>
  <Accordion title="发生了什么">
    - 配置在启动、热重载或 OpenClaw 拥有的写入期间未通过验证。
    - Gateway(网关) 启动失败并关闭，而不是重写 `openclaw.json`。
    - 热重载会跳过无效的外部编辑，并保持当前运行时配置处于活动状态。
    - OpenClaw 拥有的写入会在提交前拒绝无效/破坏性的有效载荷，并保存 `.rejected.*`。
    - `openclaw doctor --fix` 拥有修复权。它可以删除非 JSON 前缀或恢复最后已知的良好副本，同时将被拒绝的有效载荷保存为 `.clobbered.*`。
    - 当一个配置路径发生多次修复时，OpenClaw 会轮换较旧的 `.clobbered.*` 文件，以便最新的修复有效载荷仍然可用。

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
    - `.clobbered.*` 存在 → 在修复活动配置时，doctor 保留了损坏的外部编辑。
    - `.rejected.*`OpenClaw 存在 → OpenClaw 拥有的配置写入在提交前未通过架构或覆盖检查。
    - `Config write rejected:` → 写入尝试丢弃必需的形状、大幅缩小文件或持久化无效配置。
    - `config reload skipped (invalid config):`Gateway(网关) → 直接编辑未通过验证并被正在运行的 Gateway(网关) 忽略。
    - `Invalid config at ...`Gateway(网关) → 在 Gateway(网关) 服务启动之前启动失败。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*`OpenClaw → OpenClaw 拥有的写入被拒绝，因为与上次已知的良好备份相比，它丢失了字段或大小。
    - `Config last-known-good promotion skipped` → 候选配置包含编辑过的机密占位符，例如 `***`。

  </Accordion>
  <Accordion title="修复选项">
    1. 运行 `openclaw doctor --fix` 以让 doctor 修复带前缀/被覆盖的配置或恢复上次已知的良好配置。
    2. 仅从 `.clobbered.*` 或 `.rejected.*` 复制预期的键，然后使用 `openclaw config set` 或 `config.patch` 应用它们。
    3. 在重新启动之前运行 `openclaw config validate`。
    4. 如果您手动编辑，请保留完整的 JSON5 配置，而不仅仅是您想要更改的部分对象。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/zh/cli/config)
- [配置：热重载](/zh/gateway/configuration#config-hot-reload)
- [配置：严格验证](/zh/gateway/configuration#strict-validation)
- [Doctor](/zh/gateway/doctor)

## Gateway(网关) 探测警告

当 `openclaw gateway probe` 能够访问目标，但仍打印警告块时使用此部分。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查找：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 无论警告是关于 SSH 回退、多个 Gateway(网关)、缺少作用域，还是未解析的身份验证引用。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍尝试直接配置/环回目标。
- `multiple reachable gateways detected` → 有多个目标响应。通常这意味着有意配置的多 Gateway(网关) 设置或过时/重复的监听器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)`RPC → 连接成功，但详细 RPC 受作用域限制；请配对设备身份或使用具有 `operator.read` 的凭据。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed`RPCGateway(网关) → 连接成功，但完整的诊断 RPC 集超时或失败。请将此视为可访问但诊断功能降级的 Gateway(网关)；请在 `--json` 输出中比较 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → Gateway(网关) 已响应，但在正常操作员访问之前，此客户端仍需要配对/批准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 在此命令路径中，失败目标的身份验证材料不可用。

相关：

- [Gateway(网关)](<Gateway(网关)/en/cli/gateway>)
- [同一主机上的多个 Gateway(网关)](/zh/gateway#multiple-gateways-same-host)
- [远程访问](/zh/gateway/remote)

## 渠道已连接，消息未流转

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
- 群组允许列表和提及要求。
- 缺少渠道 API 权限/作用域。

常见特征：

- `mention required` → 消息因群组提及策略被忽略。
- `pairing` / 待批准跟踪 → 发送者未获批准。
- `missing_scope`, `not_in_channel`, `Forbidden`, `401/403` → 渠道身份验证/权限问题。

相关：

- [渠道故障排除](/zh/channels/troubleshooting)
- [Discord](/zh/channels/discord)
- [Telegram](/zh/channels/telegram)
- [WhatsApp](/zh/channels/whatsapp)

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
- 作业运行历史状态 (`ok`, `skipped`, `error`)。
- 心跳跳过原因 (`quiet-hours`, `requests-in-flight`, `cron-in-progress`, `lanes-busy`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`)。

<AccordionGroup>
  <Accordion title="常见特征">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
    - `cron: timer tick failed` → 调度器计时失败；检查文件/日志/运行时错误。
    - `heartbeat skipped` 含有 `reason=quiet-hours` → 超出活跃时间窗口。
    - `heartbeat skipped` 含有 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但仅包含空行/markdown 标题，因此 OpenClaw 跳过模型调用。
    - `heartbeat skipped` 含有 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 块，但此计时下没有任务到期。
    - `heartbeat: unknown accountId` → 心跳传递目标的帐户 ID 无效。
    - `heartbeat skipped` 含有 `reason=dm-blocked` → 心跳目标解析为私信风格的目的地，而 `agents.defaults.heartbeat.directPolicy`（或每个代理的覆盖）设置为 `block`。

  </Accordion>
</AccordionGroup>

相关：

- [心跳](/zh/gateway/heartbeat)
- [定时任务](/zh/automation/cron-jobs)
- [定时任务：故障排除](/zh/automation/cron-jobs#troubleshooting)

## 节点已配对，工具失败

如果节点已配对但工具失败，请排查前台、权限和审批状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

检查：

- 节点在线且具备预期功能。
- 操作系统对摄像头/麦克风/位置/屏幕的权限授予。
- 执行审批和允许列表状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须在前台。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少操作系统权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行审批待定。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表阻止。

相关：

- [执行审批](/zh/tools/exec-approvals)
- [节点故障排除](/zh/nodes/troubleshooting)
- [节点](/zh/nodes/index)

## 浏览器工具失败

当浏览器工具操作失败，但网关本身健康时使用此方法。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

检查：

- 是否设置了 `plugins.allow` 并且包含 `browser`。
- 有效的浏览器可执行文件路径。
- CDP 配置文件的可达性。
- 本地 Chrome 可用性，针对 `existing-session` / `user` 配置文件。

<AccordionGroup>
  <Accordion title="Plugin / executable signatures">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除了。
    - 在 `browser.enabled=true` 期间浏览器工具丢失/不可用 → `plugins.allow` 排除了 `browser`，因此插件从未加载。
    - `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
    - `browser.executablePath not found` → 配置的路径无效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不支持的方案，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 配置的 CDP URL 的端口错误或超出范围。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.`OpenClaw → 当前的网关安装缺少核心浏览器运行时依赖；请重新安装或更新 OpenClaw，然后重启网关。ARIA 快照和基本页面截图仍然可以工作，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出将不可用。

  </Accordion>
  <Accordion title="Chrome MCP / existing-会话 signatures">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-会话 尚无法附加到所选的浏览器数据目录。打开浏览器检查页面，启用远程调试，保持浏览器打开，批准第一个附加提示，然后重试。如果不需要登录状态，请首选托管配置文件 `openclaw`。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
    - `Remote CDP for profile "<name>" is not reachable` → 配置的远程 CDP 端点无法从网关主机访问。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有可访问的目标，或者 HTTP 端点响应了但 CDP WebSocket 仍然无法打开。

  </Accordion>
  <Accordion title="Element / screenshot / upload signatures">
    - `fullPage is not supported for element screenshots` → 截图请求混合了 `--full-page` 与 `--ref` 或 `--element`。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截图调用必须使用页面捕获或快照 `--ref`，而不是 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上传钩子需要快照引用，而不是 CSS 选择器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 配置文件上每次调用发送一个上传。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 配置文件上的对话框钩子不支持超时覆盖。
    - `existing-session type does not support timeoutMs overrides.` → 对于 `profile="user"` / Chrome MCP 现有会话配置文件上的 `act:type`，省略 `timeoutMs`，或者在需要自定义超时时使用托管/CDP 浏览器配置文件。
    - `existing-session evaluate does not support timeoutMs overrides.` → 对于 `profile="user"` / Chrome MCP 现有会话配置文件上的 `act:evaluate`，省略 `timeoutMs`，或者在需要自定义超时时使用托管/CDP 浏览器配置文件。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要托管浏览器或原始 CDP 配置文件。
    - 仅附加或远程 CDP 配置文件上的过时视口/深色模式/语言环境/离线覆盖 → 运行 `openclaw browser stop --browser-profile <name>` 以关闭活动控制会话并释放 Playwright/CDP 模拟状态，而无需重启整个网关。

  </Accordion>
</AccordionGroup>

相关：

- [浏览器 (OpenClaw-托管)](/zh/tools/browser)
- [浏览器故障排除](/zh/tools/browser-linux-troubleshooting)

## 如果您升级后某些功能突然损坏

大多数升级后的损坏是由于配置漂移或现在强制执行了更严格的默认设置。

<AccordionGroup>
  <Accordion title="1. 认证和 URL 覆盖行为已更改">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    检查事项：

    - 如果 `gateway.mode=remote`CLI，CLI 调用可能指向远程，而您的本地服务是正常的。
    - 显式的 `--url` 调用不会回退到存储的凭据。

    常见特征：

    - `gateway connect failed:` → URL 目标错误。
    - `unauthorized` → 端点可达但认证错误。

  </Accordion>
  <Accordion title="2. 绑定和认证防护更严格">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    检查事项：

    - 非回环绑定（`lan`、`tailnet`、`custom`）需要有效的 Gateway(网关) 认证路径：共享令牌/密码认证，或正确配置的非回环 `trusted-proxy` 部署。
    - 像 `gateway.token` 这样的旧密钥不会替换 `gateway.auth.token`。

    常见特征：

    - `refusing to bind gateway ... without auth` → 没有有效 Gateway(网关) 认证路径的非回环绑定。
    - 当运行时正在运行时 `Connectivity probe: failed` → Gateway(网关) 存活但当前 auth/url 无法访问。

  </Accordion>
  <Accordion title="3. 配对和设备标识状态已更改">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    检查事项：

    - 仪表板/节点待处理的设备批准。
    - 策略或标识更改后待处理的私信配对批准。

    常见特征：

    - `device identity required` → 设备认证未满足。
    - `pairing required` → 发送方/设备必须被批准。

  </Accordion>
</AccordionGroup>

如果经过检查后服务配置和运行时仍然不一致，请从相同的配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关内容：

- [认证](/zh/gateway/authentication)
- [后台执行和进程工具](/zh/gateway/background-process)
- [Gateway(网关) 拥有的配对](<Gateway(网关)/en/gateway/pairing>)

## 相关

- [Doctor](/zh/gateway/doctor)
- [常见问题](/zh/help/faq)
- [Gateway(网关) 运行手册](<Gateway(网关)/en/gateway>)
