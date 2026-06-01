---
summary: "针对网关、渠道、自动化、节点和浏览器的深度故障排除运行手册"
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

- `openclaw gateway status` 显示 `Runtime: running`、`Connectivity probe: ok` 和 `Capability: ...` 行。
- `openclaw doctor` 报告没有阻碍性的配置/服务问题。
- `openclaw channels status --probe` 显示实时的每个账户传输状态，并且在支持的地方显示探测/审计结果，例如 `works` 或 `audit ok`。

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

- `Update restart` 在 `openclaw status` / `openclaw status --all` 中。待处理或失败的交接包括要运行的下一个命令。
- `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`
  在渠道下。这意味着渠道配置仍然存在，但在渠道加载之前插件注册失败。
- 重新身份验证后提供商返回 401。`openclaw doctor --fix` 检查过时的
  每个代理 OAuth 身份验证影子并删除旧副本，以便所有代理解析
  当前的共享配置文件。

## 裂脑安装和较新的配置保护

当网关服务在更新后意外停止，或日志显示某个 `openclaw` 二进制文件比上次写入 `openclaw.json` 的版本旧时，请使用此方法。

OpenClaw 会用 `meta.lastTouchedVersion` 标记配置写入。只读命令仍可检查由较新 OpenClaw 写入的配置，但进程和服务变更拒绝从较旧的二进制文件继续执行。被阻止的操作包括网关服务启动、停止、重启、卸载、强制服务重装、服务模式网关启动以及 `gateway --force` 端口清理。

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
  <Step title="重新安装 gateway 服务">
    从较新的安装中重新安装预期的 gateway 服务：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="移除过时的封装程序">
    移除仍指向旧 `openclaw` 二进制文件的过时系统包或旧封装条目。
  </Step>
</Steps>

<Warning>仅用于有意降级或紧急恢复，为单个命令设置 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常操作时请保持未设置。</Warning>

## 回滚后的协议不匹配

当您降级或回滚 OpenClaw 后日志持续打印 `protocol mismatch` 时使用此方法。这意味着正在运行较旧的 Gateway(网关)，但较新的本地客户端进程仍在尝试使用较旧的 Gateway(网关) 无法支持的协议范围重新连接。

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

1. 停止或重启由 `gateway status --deep` 显示的过时 OpenClaw 客户端进程。
2. 重启嵌入 OpenClaw 的应用程序或封装程序，例如本地仪表板、编辑器、应用服务器助手或长时间运行的 `openclaw logs --follow` shell。
3. 重新运行 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 并确认过时的客户端 PID 已消失。

不要让较旧的 Gateway(网关) 接受较新的不兼容协议。协议升级保护线路契约；回滚恢复是一个进程/版本清理问题。

## 因路径转义跳过 Skills 符号链接

当日志包含以下内容时使用：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw 将每个技能根目录视为包含边界。当其真实目标解析到该根目录之外时，除非目标被显式信任，否则 `~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或 `~/.openclaw/skills` 下的符号链接将被跳过。

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

请勿使用广泛的目标，如 `~`、`/` 或整个已同步的项目文件夹。
请将 `allowSymlinkTargets` 限定在包含受信任的
`SKILL.md` 目录的真实技能根目录上。

相关：

- [Skills 配置](/zh/tools/skills-config#symlinked-sibling-repos)
- [配置示例](/zh/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 长上下文需要额外使用量

当日志/错误包含 `HTTP 429: rate_limit_error: Extra usage is required for long context requests` 时，请使用此方法。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查找：

- 所选的 Anthropic 模型是支持 1M 上下文的 GA 版 Claude 4.x 模型，或者该模型具有旧版 `params.context1m: true`。
- 当前的 Anthropic 凭证不符合长上下文使用条件。
- 请求仅在需要 1M 上下文路径的长会话/模型运行中失败。

修复选项：

<Steps>
  <Step title="使用标准上下文窗口">切换到标准窗口模型，或者从不支持 1M 上下文的 GA 旧模型配置中删除旧版 `context1m`。</Step>
  <Step title="使用符合条件的凭证">使用符合长上下文请求条件的 Anthropic 凭证，或者切换到 Anthropic API 密钥。</Step>
  <Step title="配置备用模型">配置备用模型，以便当 Anthropic 长上下文请求被拒绝时运行能够继续。</Step>
</Steps>

相关内容：

- [Anthropic](/zh/providers/anthropic)
- [Token 使用量和成本](/zh/reference/token-use)
- [为什么我会收到来自 Anthropic 的 HTTP 429 错误？](/zh/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 上游 403 阻止的响应

当上游 LLM 提供商返回通用 `403`（例如
`Your request was blocked`）时，请使用此方法。

不要假设这始终是 OpenClaw 配置问题。该响应可能
来自上游安全层，例如位于 OpenAI 兼容端点前面的
CDN、WAF、机器人管理规则或反向代理。

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
```

查找：

- 同一提供商下的多个模型以相同方式失败
- HTML 或通用安全文本，而不是正常的提供商 API 错误
- 同一请求时间的提供商端安全事件
- 微小的直接 `curl` 探测成功，而正常的 SDK 形状请求失败

当证据指向 WAF/CDN
拦截时，请先修复提供商端的过滤。优先为 API 路径 OpenClaw
使用的范围设置允许或跳过规则，并避免禁用整个站点的保护。

<Warning>成功的最小 `curl` 并不能保证真正的 SDK 风格请求将通过同一上游安全层。</Warning>

相关内容：

- [OpenAI 兼容端点](/zh/gateway/configuration-reference#openai-compatible-endpoints)
- [提供商配置](/zh/providers)
- [日志](/zh/logging)

## 本地 OpenAI 兼容后端通过直接探测，但代理运行失败

在以下情况下使用：

- `curl ... /v1/models` 正常工作
- 微小的直接 `/v1/chat/completions` 调用正常工作
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

- 直接的微小调用成功，但 OpenClaw 运行仅在较大的提示词下失败
- `model_not_found` 或 404 错误，即使直接 `/v1/chat/completions`
  在使用相同的裸模型 id 时工作正常
- 后端关于 `messages[].content` 期望字符串的错误
- 使用 OpenAI 兼容本地后端时出现间歇性的 `incomplete turn detected ... stopReason=stop payloads=0`OpenAI 警告
- 后端崩溃仅出现在较大的提示词 token 数量或完整的代理运行时提示词中

<AccordionGroup>
  <Accordion title="常见特征">
    - `model_not_found` 并伴随本地 MLX/vLLM 风格服务器 → 验证 `baseUrl` 包含 `/v1`，对于 `/v1/chat/completions` 后端 `api` 为 `"openai-completions"`，且 `models.providers.<provider>.models[].id` 是裸的提供商本地 id。使用提供商前缀选择一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；将目录条目保持为 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 后端拒绝结构化的 Chat Completions 内容部分。修复：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `validation.keys` 或允许的消息键（如 `["role","content"]`OpenAI）→ 后端拒绝 Chat Completions 消息上的 OpenAI 风格重放元数据。修复：设置 `models.providers.<provider>.models[].compat.strictMessageKeys: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0`OpenClawOpenAIOpenClaw → 后端完成了 Chat Completions 请求，但未返回该轮次用户可见的助手文本。OpenClaw 会对重放安全的空 OpenAI 兼容轮次重试一次；持续失败通常意味着后端正在发出空/非文本内容或抑制最终答案文本。
    - 直接微小的请求成功，但 OpenClaw 代理运行失败并伴随后端/模型崩溃（例如某些 `inferrs`OpenClaw 构建上的 Gemma）→ OpenClaw 传输可能已经正确；后端在更大的代理运行时提示形状上失败。
    - 禁用工具后故障减少但未消失 → 工具模式是压力的一部分，但剩余问题仍是上游模型/服务器容量或后端错误。

  </Accordion>
  <Accordion title="修复选项">
    1. 为仅支持字符串的 Chat Completions 后端设置 `compat.requiresStringContent: true`。
    2. 为严格的 Chat Completions 后端设置 `compat.strictMessageKeys: true`，这些后端仅接受每条消息上的 `role` 和 `content`。
    3. 为无法可靠处理 OpenClaw 工具架构表面的模型/后端设置 `compat.supportsTools: false`OpenClawOpenClaw。
    4. 尽可能降低提示词压力：更小的工作区引导、更短的会话历史、更轻量的本地模型，或具有更强长上下文支持的后端。
    5. 如果微小的直接请求一直通过，但 OpenClaw 代理轮次在后端内部仍然崩溃，请将其视为上游服务器/模型的限制，并在那里使用可接受的负载形状提交可重现问题报告。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/zh/gateway/configuration)
- [本地模型](/zh/gateway/local-models)
- [OpenAI 兼容端点](OpenAI/en/gateway/configuration-reference#openai-compatible-endpoints)

## 无回复

如果渠道已启动但没有任何响应，请在重新连接任何内容之前检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

查找：

- 私信发送方等待配对。
- 群组提及门控 (`requireMention`, `mentionPatterns`)。
- 渠道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 群组消息被忽略，直到被提及。
- `pairing request` → 发送者需要批准。
- `blocked` / `allowlist` → 发送者/渠道已被策略过滤。

相关：

- [渠道故障排除](/zh/channels/troubleshooting)
- [群组](/zh/channels/groups)
- [配对](/zh/channels/pairing)

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

- 正确的探测 URL 和仪表板 URL。
- 客户端和网关之间的身份验证模式/令牌不匹配。
- 需要设备身份时使用了 HTTP。

如果更新后本地浏览器无法连接到 `127.0.0.1:18789`Gateway(网关)，请首先
恢复本地 Gateway 服务并确认其正在提供仪表板：

```bash
openclaw gateway restart
lsof -i :18789
curl http://127.0.0.1:18789
```

如果 `curl`OpenClawGateway(网关) 返回 OpenClaw HTML，则 Gateway 正在工作，剩余的问题
可能是浏览器缓存、旧的深层链接或过期的标签页状态。直接
打开 `http://127.0.0.1:18789` 并从仪表板进行导航。如果重启后
服务未保持运行，请运行 `openclaw gateway start` 并重新检查
`openclaw gateway status`。

<AccordionGroup>
  <Accordion title="连接 / 认证签名">
    - `device identity required` → 非安全上下文或缺少设备认证。
    - `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者您在没有显式允许列表的非本地回环浏览器源进行连接）。
    - `device nonce required` / `device nonce mismatch` → 客户端未完成基于质询的设备认证流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客户端为当前握手签署了错误的负载（或时间戳过期）。
    - `AUTH_TOKEN_MISMATCH` 且带有 `canRetryWithDeviceToken=true` → 客户端可以使用缓存的设备令牌进行一次可信重试。
    - 该缓存令牌重试会重用与配对设备令牌一起存储的缓存作用域集。显式 `deviceToken` / 显式 `scopes` 调用方将改为保留其请求的作用域集。
    - `AUTH_SCOPE_MISMATCH` → 设备令牌已被识别，但其批准的作用域未覆盖此连接请求；请重新配对或批准请求的作用域合约，而不是轮换共享网关令牌。
    - 在该重试路径之外，连接认证优先级依次为：显式共享令牌/密码优先，然后是显式 `deviceToken`Tailscale，接着是存储的设备令牌，最后是引导令牌。
    - 在异步 Tailscale Serve 控制器 UI 路径上，针对同一 `{scope, ip}` 的失败尝试会在限制器记录失败之前进行序列化。因此，来自同一客户端的两个错误的并发重试可能会在第二次尝试时显示 `retry later`，而不是两个普通的错误匹配。
    - 来自浏览器源本地回环客户端的 `too many failed authentication attempts (retry later)` → 来自同一标准化 `Origin` 的重复失败将被暂时锁定；另一个本地主机源使用单独的存储桶。
    - 该重试后重复出现 `unauthorized` → 共享令牌/设备令牌漂移；如果需要，请刷新令牌配置并重新批准/轮换设备令牌。
    - `gateway connect failed:` → 错误的主机/端口/URL 目标。

  </Accordion>
</AccordionGroup>

### Auth detail codes quick map

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| Detail code                  | 含义                                                                                                                                                                           | 推荐操作                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享令牌。                                                                                                                                                   | 在客户端中粘贴/设置令牌并重试。对于控制面板路径：`openclaw config get gateway.auth.token`，然后粘贴到控制 UI 设置中。                                                                                                                                   |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关认证令牌不匹配。                                                                                                                                                 | 如果是 `canRetryWithDeviceToken=true`，允许一次受信任的重试。缓存令牌的重试会重用存储的已批准范围；显式的 `deviceToken` / `scopes` 调用方将保留请求的范围。如果仍然失败，请运行[令牌漂移恢复检查清单](/zh/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的每设备令牌已过期或被撤销。                                                                                                                                               | 使用[设备 CLI](CLI/en/cli/devices)轮换/重新批准设备令牌，然后重新连接。                                                                                                                                                                                 |
| `AUTH_SCOPE_MISMATCH`        | 设备令牌有效，但其批准的角色/范围未覆盖此连接请求。                                                                                                                            | 重新配对设备或批准请求的范围合约；不要将此视为共享令牌漂移。                                                                                                                                                                                            |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 中是否存在 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在存在时使用 `requestId` / `remediationHint`。 | 批准待处理的请求：`openclaw devices list` 然后 `openclaw devices approve <requestId>`。范围/角色升级在您审查所请求的访问权限后使用相同的流程。                                                                                                          |

<Note>使用共享网关令牌/密码进行身份验证的直接环回后端 RPC 不应依赖于 CLI 的配对设备范围基线。如果子代理或其他内部调用仍然因 CLI`scope-upgrade` 而失败，请验证调用方是否正在使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，并且未强制使用显式的 `deviceIdentity` 或设备令牌。</Note>

Device auth v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示随机数/签名错误，请更新连接的客户端并进行验证：

<Steps>
  <Step title="等待 connect.challenge">客户端等待网关颁发的 `connect.challenge`。</Step>
  <Step title="对负载进行签名">客户端对绑定挑战的负载进行签名。</Step>
  <Step title="发送设备随机数">客户端使用相同的挑战随机数发送 `connect.params.device.nonce`。</Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒绝：

- 配对设备令牌会话只能管理**它们自己的**设备，除非调用者还拥有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能请求调用者会话已经拥有的操作员范围

相关：

- [配置](/zh/gateway/configuration)（网关认证模式）
- [控制界面](/zh/web/control-ui)
- [设备](/zh/cli/devices)
- [远程访问](/zh/gateway/remote)
- [可信代理认证](/zh/gateway/trusted-proxy-auth)

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
- 服务配置不匹配（`Config (cli)` vs `Config (service)`）。
- 端口/监听器冲突。
- 当使用 `--deep` 时，额外的 launchd/systemd/schtasks 安装。
- `Other gateway-like services detected (best effort)` 清理提示。

<AccordionGroup>
  <Accordion title="常见特征">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 本地网关模式未启用，或配置文件被破坏并丢失了 `gateway.mode`。修复方法：在配置中设置 `gateway.mode="local"`，或重新运行 `openclaw onboard --mode local` / `openclaw setup` 以重新生成预期的本地模式配置。如果您通过 Podman 运行 OpenClaw，默认配置路径为 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 非环回绑定且没有有效的网关认证路径（令牌/密码，或配置的可信代理）。
    - `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。
    - `Other gateway-like services detected (best effort)` → 存在过时或并行的 launchd/systemd/schtasks 单元。大多数设置应在每台机器上保留一个网关；如果确实需要多个，请隔离端口 + 配置/状态/工作区。参见 [/gateway#multiple-gateways-same-host](/zh/gateway#multiple-gateways-same-host)。
    - 来自诊断工具的 `System-level OpenClaw gateway service detected` → 存在 systemd 系统单元，但缺少用户级服务。在允许诊断工具安装用户服务之前删除或禁用重复项，或者如果系统单元是预期的监督程序，则设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 已安装的监督程序仍然固定到旧的 `--port`。运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然后重启网关服务。

  </Accordion>
</AccordionGroup>

相关内容：

- [后台执行和进程工具](/zh/gateway/background-process)
- [配置](/zh/gateway/configuration)
- [诊断工具](/zh/gateway/doctor)

## macOS 网关静默停止响应，当您触摸仪表板时恢复

当 macOS 主机上的频道（Telegram、WhatsApp 等）安静数分钟到数小时，并且您打开控制 UI、通过 SSH 登录或以其他方式与主机交互时，网关似乎立即恢复，请使用此方法。在 TelegramWhatsAppmacOS`openclaw status` 中通常没有明显的症状，因为当您查看时网关已经恢复运行。

```bash
ls ~/.openclaw/logs/stability/ | tail -5
openclaw gateway stability --bundle latest
pmset -g log | grep -iE "sleep|wake|maintenance" | tail -50
launchctl print gui/$UID/ai.openclaw.gateway | grep -E "state|last exit|runs"
```

查找：

- 在 `~/.openclaw/logs/stability/` 中有一个或多个 `*-uncaught_exception.json` 包，其 `error.code` 设置为瞬态网络代码，例如 `ENETDOWN`、`ENETUNREACH`、`EHOSTUNREACH` 或 `ECONNREFUSED`。
- 与崩溃时间戳对齐的 `Entering Sleep state due to 'Maintenance Sleep'` 或 `en0 driver is slow (msg: WillChangeState to 0)` 等 `pmset -g log` 行。Power Nap / Maintenance Sleep 会短暂地将 Wi-Fi 驱动程序置于状态 0；任何落在该窗口内的出站 `connect()` 都可能因 `ENETDOWN` 而失败，即使主机在其他方面具有完整的网络连接。
- `launchctl print` 输出显示 `state = not running` 具有多个最近的 `runs`macOS 和退出代码，尤其是当崩溃和下次启动之间的间隔大约是一小时而不是几秒钟时。macOS launchd 在崩溃爆发后应用了一个未记录的重生保护门，可能会停止遵守 `KeepAlive=true`，直到交互式登录、仪表板连接或 `launchctl kickstart` 等外部触发器重新将其激活。

常见特征：

- 一个稳定性包，其 `error.code` 是 `ENETDOWN` 或同级代码，调用堆栈指向 Node `net` `lookupAndConnect` / `Socket.connect`OpenClaw。OpenClaw `2026.5.26` 及更新版本将这些归类为良性瞬态网络错误，因此它们不再传播到顶层未捕获的处理程序；如果您使用的是旧版本，请先升级。
- 长时间静止，并在您连接到控制 UI 或通过 SSH 登录主机的瞬间结束：用户可见的活动是重新启动 launchd 重生守门的原因，而不是仪表板对 Gateway 所做的任何操作。
- `runs` 计数全天递增，但在 `~/Library/Logs/openclaw/gateway.log` 中没有相应的 `received SIG*; shutting down` 行：正常关机会记录一个信号；瞬态崩溃则不会。

操作方法：

1. 如果您运行的版本早于 `2026.5.26`，请**升级 Gateway**。升级后，未来的 `ENETDOWN` 错误将被记录为警告，而不会终止进程。
2. 在旨在作为始终开启服务器运行的 Mac mini / 桌面主机上，**减少维护睡眠活动**：

   ```bash
   sudo pmset -a sleep 0 disksleep 0 standby 0 powernap 0
   ```

   这显著减少了（但不能完全消除）底层的驱动程序抖动。无论这些标志如何设置，系统仍可能执行某些维护睡眠，以进行 TCP 保活和 mDNS 维护。

3. **添加一个存活性看门狗**，以便快速捕获被 launchd 暂停的未来崩溃爆发：

   ```bash
   # Example launchd-aware liveness check, suitable for a 5-minute cron or LaunchAgent
   state=$(launchctl print gui/$UID/ai.openclaw.gateway 2>/dev/null | awk -F'= ' '/state =/ {print $2; exit}')
   if [ "$state" != "running" ]; then
     launchctl kickstart -k gui/$UID/ai.openclaw.gateway
   fi
   ```

   关键在于从外部重新启动重生守门；在崩溃爆发后，仅靠 `KeepAlive=true` 在 macOS 上是不够的。

相关：

- [macOS 平台说明](/zh/platforms/macos)
- [日志记录](/zh/logging)
- [诊断程序](/zh/gateway/doctor)

## Gateway 在高内存使用期间退出

当 Gateway(网关) 在负载下消失，监控程序报告 OOM 样式的重启，或日志中提到 `critical memory pressure bundle written` 时，请使用此方法。

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

查找：

- 最新稳定性包中的 `Reason: diagnostic.memory.pressure.critical`。
- `Memory pressure:` 配合 `critical/rss_threshold`、`critical/heap_threshold` 或 `critical/rss_growth`。
- 接近堆限制的 `V8 heap:` 值。
- `Largest session files:` 条目，例如 `agents/<agent>/sessions/<session>.jsonl` 或 `sessions/<session>.jsonl`。
- 当 Gateway 在容器或受限内存服务中运行时，使用 Linux cgroup 内存计数器。

常见特征：

- `critical memory pressure bundle written`OpenClaw 出现在重启前不久 → OpenClaw 捕获了 OOM 前的稳定性包。请使用 `openclaw gateway stability --bundle latest` 检查它。
- `memory pressure: level=critical ... memoryPressureSnapshot=disabled`OpenClaw 出现在 Gateway 日志中 → OpenClaw 检测到严重的内存压力，但 OOM 前的稳定性快照已关闭。
- `Largest session files:` 指向一个非常大的脱敏记录路径 → 在重启之前减少保留的会话历史，检查会话增长，或将旧记录移出活动存储。
- `V8 heap:` 已使用字节数接近堆限制 → 降低提示/会话压力，减少并发工作，或仅在确认工作负载符合预期后提高 Node 堆限制。
- `Memory pressure: critical/rss_growth` → 内存在一个采样窗口内快速增长。检查最新日志中是否有大型导入、失控的 工具 输出、重复重试或一批排队的工作代理任务。
- 日志中出现严重的内存压力但没有包存在 → 这是默认设置。设置 `diagnostics.memoryPressureSnapshot: true` 以便在未来的严重内存压力事件中捕获 OOM 前的稳定性包。

稳定性包不包含负载数据。它包含操作内存证据和脱敏的相对文件路径，不包含消息文本、Webhook 主体、凭据、令牌、Cookie 或原始会话 ID。请将诊断导出附加到错误报告中，而不是复制原始日志。

相关：

- [Gateway(网关) 健康状况](<Gateway(网关)/en/gateway/health>)
- [诊断导出](/zh/gateway/diagnostics)
- [会话](/zh/cli/sessions)

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
- 活动配置旁边的带时间戳的 `openclaw.json.rejected.*` 文件
- 带时间戳的 `openclaw.json.clobbered.*` 文件（如果 `doctor --fix` 修复了损坏的直接编辑）
- OpenClaw 会为每个配置路径保留最新的 32 个 OpenClaw`.clobbered.*` 文件，并轮换较旧的文件

<AccordionGroup>
  <Accordion title="发生了什么"OpenClawGateway(网关)>
    - 配置在启动、热重载或 OpenClaw 拥有的写入过程中未通过验证。
    - Gateway 启动失败并转为封闭状态，而不是重写 `openclaw.json`OpenClaw。
    - 热重载会跳过无效的外部编辑，并保持当前运行时配置处于活动状态。
    - OpenClaw 拥有的写入操作会在提交前拒绝无效/破坏性有效负载，并保存 `.rejected.*`。
    - `openclaw doctor --fix` 负责修复。它可以删除非 JSON 前缀或恢复最后一次已知的良好副本，同时将被拒绝的有效负载保留为 `.clobbered.*`OpenClaw。
    - 当对一个配置路径进行多次修复时，OpenClaw 会轮换较旧的 `.clobbered.*` 文件，以便最新的修复后有效负载仍然可用。

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
    - 存在 `.clobbered.*` → doctor 在修复活动配置时保留了损坏的外部编辑。
    - 存在 `.rejected.*`OpenClaw → OpenClaw 拥有的配置写入在提交前未能通过架构或覆盖检查。
    - `Config write rejected:` → 写入试图丢弃必需的结构、急剧缩小文件大小或持久化无效配置。
    - `config reload skipped (invalid config):`Gateway(网关) → 直接编辑未通过验证并被运行中的 Gateway 忽略。
    - `Invalid config at ...`Gateway(网关) → 在 Gateway 服务启动之前启动失败。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*`OpenClaw → OpenClaw 拥有的写入被拒绝，因为与上次已知的良好备份相比，它丢失了字段或大小。
    - `Config last-known-good promotion skipped` → 候选配置包含编辑过的密钥占位符，例如 `***`。

  </Accordion>
  <Accordion title="修复选项">
    1. 运行 `openclaw doctor --fix` 以让 doctor 修复带前缀/被覆盖的配置或恢复上次已知的良好配置。
    2. 仅从 `.clobbered.*` 或 `.rejected.*` 中复制所需的键，然后使用 `openclaw config set` 或 `config.patch` 应用它们。
    3. 在重启之前运行 `openclaw config validate`。
    4. 如果您手动编辑，请保留完整的 JSON5 配置，而不仅仅是您想要更改的部分对象。
  </Accordion>
</AccordionGroup>

相关内容：

- [配置](/zh/cli/config)
- [配置：热重载](/zh/gateway/configuration#config-hot-reload)
- [配置：严格验证](/zh/gateway/configuration#strict-validation)
- [Doctor](/zh/gateway/doctor)

## Gateway 探测警告

当 `openclaw gateway probe` 能够连接到目标但仍打印警告块时，请使用此部分。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查找：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 无论警告是关于 SSH 回退、多个 Gateway、缺少作用域还是未解析的身份验证引用。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍尝试直接配置/环回目标。
- `multiple reachable gateways detected` → 多个目标响应。这通常意味着有意的多 Gateway 设置或过时/重复的监听器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)`RPC → 连接成功，但详细信息 RPC 受作用域限制；请配对设备身份或使用具有 `operator.read` 的凭据。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed`RPCGateway(网关) → 连接成功，但完整的诊断 RPC 集超时或失败。请将此视为可访问但诊断功能降级的 Gateway；比较 `--json` 输出中的 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → Gateway 已响应，但此客户端在正常操作员访问之前仍需要配对/批准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 该命令路径中失败目标的身份验证材料不可用。

相关：

- [Gateway(网关)](<Gateway(网关)/en/cli/gateway>)
- [同一主机上的多个 Gateway](/zh/gateway#multiple-gateways-same-host)
- [远程访问](/zh/gateway/remote)

## 渠道已连接，消息未流动

如果渠道状态显示已连接但消息流已中断，请重点关注策略、权限和渠道特定的传递规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

检查：

- 私信策略（`pairing`、`allowlist`、`open`、`disabled`）。
- 群组允许列表和提及要求。
- 缺少渠道 API 权限/作用域。

常见特征：

- `mention required` → 消息被群组提及策略忽略。
- `pairing` / 待批准跟踪 → 发送者未获批准。
- `missing_scope`，`not_in_channel`，`Forbidden`，`401/403` → 渠道身份验证/权限问题。

相关：

- [渠道故障排除](/zh/channels/troubleshooting)
- [Discord](/zh/channels/discord)
- [Telegram](/zh/channels/telegram)
- [WhatsApp](/zh/channels/whatsapp)

## Cron 和心跳投递

如果 cron 或心跳未运行或未投递，请先验证调度器状态，然后再验证投递目标。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

查找：

- Cron 已启用且存在下次唤醒时间。
- 作业运行历史状态（`ok`，`skipped`，`error`）。
- 心跳跳过原因（`quiet-hours`，`requests-in-flight`，`cron-in-progress`，`lanes-busy`，`alerts-disabled`，`empty-heartbeat-file`，`no-tasks-due`）。

<AccordionGroup>
  <Accordion title="常见特征">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
    - `cron: timer tick failed` → 调度器滴答失败；请检查文件/日志/运行时错误。
    - `heartbeat skipped` 且 `reason=quiet-hours` → 超出活跃时段窗口。
    - `heartbeat skipped` 且 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在，但仅包含空行/markdown 标题，因此 OpenClaw 跳过了模型调用。
    - `heartbeat skipped` 且 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 块，但此滴答时刻没有任务到期。
    - `heartbeat: unknown accountId` → 心跳投递目标的账户 ID 无效。
    - `heartbeat skipped` 且 `reason=dm-blocked` → 心跳目标解析为私信式目标，但 `agents.defaults.heartbeat.directPolicy`（或每代理覆盖）设置为 `block`。

  </Accordion>
</AccordionGroup>

相关：

- [心跳](/zh/gateway/heartbeat)
- [计划任务](/zh/automation/cron-jobs)
- [计划任务：故障排除](/zh/automation/cron-jobs#troubleshooting)

## 节点已配对，工具失败

如果节点已配对但工具失败，请排查前台运行、权限和批准状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

检查以下内容：

- 节点在线且具备预期能力。
- 操作系统授予的摄像头/麦克风/位置/屏幕权限。
- 执行批准和允许列表状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须位于前台。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少操作系统权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行批准待处理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被允许列表阻止。

相关内容：

- [执行批准](/zh/tools/exec-approvals)
- [节点故障排除](/zh/nodes/troubleshooting)
- [节点](/zh/nodes/index)

## 浏览器工具失败

当浏览器工具操作失败但网关本身健康时，请使用此步骤。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

检查以下内容：

- 是否设置了 `plugins.allow` 并包含 `browser`。
- 有效的浏览器可执行文件路径。
- CDP 配置文件的可达性。
- 本地 Chrome 的可用性，适用于 `existing-session` / `user` 配置文件。

<AccordionGroup>
  <Accordion title="插件 / 可执行文件签名">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除。
    - 浏览器工具缺失/不可用，而 `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此插件从未加载。
    - `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
    - `browser.executablePath not found` → 配置的路径无效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不支持的方案，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口错误或超出范围。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前网关安装缺少核心浏览器运行时依赖；请重新安装或更新 OpenClaw，然后重启网关。ARIA 快照和基本页面截图仍然可以工作，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出将不可用。

  </Accordion>
  <Accordion title="Chrome MCP / 现有会话签名">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP 现有会话尚无法附加到所选的浏览器数据目录。打开浏览器检查页面，启用远程调试，保持浏览器打开，批准第一次附加提示，然后重试。如果不需要登录状态，请首选托管 `openclaw` 配置文件。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
    - `Remote CDP for profile "<name>" is not reachable` → 配置的远程 CDP 端点无法从网关主机访问。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有可访问的目标，或者 HTTP 端点有响应但 CDP WebSocket 仍然无法打开。

  </Accordion>
  <Accordion title="Element / screenshot / upload signatures">
    - `fullPage is not supported for element screenshots` → 截图请求混合了 `--full-page` 与 `--ref` 或 `--element`。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截图调用必须使用页面捕获或快照 `--ref`，而不是 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上传钩子需要快照引用，而不是 CSS 选择器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 配置文件上每次调用发送一个上传。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 配置文件上的对话框钩子不支持超时覆盖。
    - `existing-session type does not support timeoutMs overrides.` → 在 `profile="user"` / Chrome MCP 现有会话配置文件上，为 `act:type` 省略 `timeoutMs`，或者在需要自定义超时时使用托管/CDP 浏览器配置文件。
    - `existing-session evaluate does not support timeoutMs overrides.` → 在 `profile="user"` / Chrome MCP 现有会话配置文件上，为 `act:evaluate` 省略 `timeoutMs`，或者在需要自定义超时时使用托管/CDP 浏览器配置文件。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要托管浏览器或原始 CDP 配置文件。
    - 仅附加或远程 CDP 配置文件上过时的视口 / 深色模式 / 区域设置 / 离线覆盖 → 运行 `openclaw browser stop --browser-profile <name>` 以关闭活动的控制会话并释放 Playwright/CDP 模拟状态，而无需重启整个网关。

  </Accordion>
</AccordionGroup>

相关：

- [浏览器 (OpenClaw 托管)](/zh/tools/browser)
- [浏览器故障排除](/zh/tools/browser-linux-troubleshooting)

## 如果您升级了且某些内容突然损坏

大多数升级后的损坏是由配置漂移或现在强制执行的更严格默认值引起的。

<AccordionGroup>
  <Accordion title="1. 身份验证和 URL 覆盖行为已更改">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    检查事项：

    - 如果 `gateway.mode=remote`CLI，CLI 调用可能定位到远程，而您的本地服务正常。
    - 显式的 `--url` 调用不会回退到存储的凭据。

    常见特征：

    - `gateway connect failed:` → URL 目标错误。
    - `unauthorized` → 端点可达但身份验证错误。

  </Accordion>
  <Accordion title="2. 绑定和身份验证防护措施更严格">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    检查事项：

    - 非回环绑定 (`lan`, `tailnet`, `custom`) 需要有效的 Gateway 身份验证路径：共享令牌/密码身份验证，或正确配置的非回环 `trusted-proxy` 部署。
    - 旧密钥（如 `gateway.token`）不会替换 `gateway.auth.token`。

    常见特征：

    - `refusing to bind gateway ... without auth` → 非回环绑定缺少有效的 Gateway 身份验证路径。
    - `Connectivity probe: failed`（当运行时正在运行时）→ Gateway 存活但通过当前身份验证/URL 无法访问。

  </Accordion>
  <Accordion title="3. 配对和设备身份状态已更改">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    检查事项：

    - 仪表板/节点的待处理设备审批。
    - 策略或身份更改后的待处理私信配对审批。

    常见特征：

    - `device identity required` → 设备身份验证未满足。
    - `pairing required` → 发送者/设备必须被批准。

  </Accordion>
</AccordionGroup>

如果经过检查后服务配置和运行时仍不一致，请从相同的配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [身份验证](/zh/gateway/authentication)
- [后台执行和进程工具](/zh/gateway/background-process)
- [Gateway 拥有的配对](<Gateway(网关)/en/gateway/pairing>)

## 相关

- [诊断工具](/zh/gateway/doctor)
- [常见问题](/zh/help/faq)
- [Gateway(网关) runbook](<Gateway(网关)/en/gateway>)
