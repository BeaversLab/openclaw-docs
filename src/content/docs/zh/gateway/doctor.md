---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor`OpenClaw 是 OpenClaw 的修复和迁移工具。它修复过时的配置/状态，检查健康状况，并提供可执行的修复步骤。

## 快速开始

```bash
openclaw doctor
```

### 无头和自动化模式

<Tabs>
  <Tab title="--yes">
    ```bash
    openclaw doctor --yes
    ```

    在不提示的情况下接受默认值（包括适用时的重启/服务/沙盒修复步骤）。

  </Tab>
  <Tab title="--fix">
    ```bash
    openclaw doctor --fix
    ```

    在不提示的情况下应用推荐的修复（在安全的情况下进行修复和重启）。

  </Tab>
  <Tab title="--lint">
    ```bash
    openclaw doctor --lint
    openclaw doctor --lint --json
    ```

    运行用于 CI 或预检自动化的结构化健康检查。此模式是
    只读的：它不会提示、修复、迁移配置、重启服务或
    触及状态。

  </Tab>
  <Tab title="--fix --force">
    ```bash
    openclaw doctor --fix --force
    ```

    也应用激进的修复（覆盖自定义的 supervisor 配置）。

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    在无提示的情况下运行，并仅应用安全的迁移（配置规范化 + 磁盘上的状态移动）。跳过需要人工确认的重启/服务/沙盒操作。检测到旧版状态迁移时会自动运行。

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    扫描系统服务以查找额外的网关安装 (launchd/systemd/schtasks)。

  </Tab>
</Tabs>

如果您想在写入之前审查更改，请先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## 只读 lint 模式

`openclaw doctor --lint` 是
`openclaw doctor --fix` 的适用于自动化的兄弟命令。两者都使用 doctor 健康检查，但它们的立场
不同：

| 模式                     | 提示 | 写入配置/状态    | 输出           | 用于               |
| ------------------------ | ---- | ---------------- | -------------- | ------------------ |
| `openclaw doctor`        | 是   | 否               | 友好的健康报告 | 人工检查状态       |
| `openclaw doctor --fix`  | 有时 | 是，带有修复策略 | 友好的修复日志 | 正在应用批准的修复 |
| `openclaw doctor --lint` | 否   | 否               | 结构化发现     | CI、预检和审查门禁 |

现代化的健康检查可能会提供可选的 `repair()` 实现。
`doctor --fix` 在存在这些修复时应用它们，并继续对尚未迁移的检查使用现有的 doctor 修复流程。
结构化修复合约还将修复报告与检测分离开来：`detect()` 报告当前发现，而 `repair()` 可以报告更改、配置/文件差异和非文件副作用。这为未来的 `doctor --fix --dry-run` 和差异输出保持迁移路径畅通，而无需让 lint 检查计划变更。

示例：

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --only core/doctor/gateway-config --json
```

JSON 输出包括：

- `ok`：是否有任何可见的发现达到选定的严重性阈值
- `checksRun`：执行的健康检查数量
- `checksSkipped`：由 `--only` 或 `--skip` 跳过的检查
- `findings`：具有 `checkId`、`severity`、`message` 的结构化诊断，以及
  可选的 `path`、`line`、`column`、`ocPath` 和 `fixHint`

退出代码：

- `0`：在选定阈值或之上没有发现
- `1`：一个或多个发现达到选定阈值
- `2`：在发出 lint 发现之前的命令/运行时失败

使用 `--severity-min info|warning|error` 来控制打印内容和导致非零 lint 退出的原因。使用 `--only <id>` 进行狭义的预检门控，并使用 `--skip <id>` 临时排除嘈杂的检查，同时保持 lint 运行的其余部分处于活动状态。
Lint 输出选项，如 `--json`、`--severity-min`、`--only` 和 `--skip`，必须与 `--lint` 配对；常规的 doctor 和 repair 运行会拒绝它们。

## 功能（摘要）

<AccordionGroup>
  <Accordion title="Health, UI, and updates">
    - 可选的 git 安装预更新（仅限交互模式）。
    - UI 协议新鲜度检查（当协议架构较新时重建 Control UI）。
    - 健康检查 + 重启提示。
    - Skills 状态摘要（符合条件/缺失/被阻止）和插件状态。

  </Accordion>
  <Accordion title="配置和迁移">
    - 针对旧版值的配置规范化。
    - 将对话配置从旧的扁平 `talk.*` 字段迁移到 `talk.provider` + `talk.providers.<provider>`。
    - 针对旧版 Chrome 扩展配置和 Chrome MCP 准备情况的浏览器迁移检查。
    - OpenCode 提供商覆盖警告（`models.providers.opencode` / `models.providers.opencode-go`）。
    - 旧的 OpenAI Codex 提供商/配置文件迁移（`openai-codex` → `openai`）以及针对过时 `models.providers.openai-codex` 的遮蔽警告。
    - 针对 OAuth Codex OpenAI 配置文件的 OAuth TLS 先决条件检查。
    - 当 `plugins.allow` 受限但工具策略仍请求通配符或插件拥有的工具时，发出插件/工具允许列表警告。
    - 旧的磁盘状态迁移（会话/代理目录/WhatsApp 身份验证）。
    - 旧的插件清单合约键迁移（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders` → `contracts`）。
    - 旧的 cron 存储迁移（`jobId`、`schedule.cron`、顶级 delivery/payload 字段、payload `provider`、`notify: true` webhook 回退作业）。
    - 清理旧的整代理运行时策略；提供商/模型运行时策略是活跃的路由选择器。
    - 启用插件时清理过时的插件配置；当 `plugins.enabled=false` 时，过时的插件引用将被视为非活动容器配置并被保留。

  </Accordion>
  <Accordion title="State and integrity">
    - Session lock file inspection and stale lock cleanup.
    - Session transcript repair for duplicated prompt-rewrite branches created by affected 2026.4.24 builds.
    - Wedged subagent restart-recovery tombstone detection, with `--fix` support for clearing stale aborted recovery flags so startup does not keep treating the child as restart-aborted.
    - State integrity and permissions checks (sessions, transcripts, state dir).
    - Config file permission checks (chmod 600) when running locally.
    - Model auth health: checks OAuth expiry, can refresh expiring tokens, and reports auth-profile cooldown/disabled states.
    - Extra workspace dir detection (`~/openclaw`).

  </Accordion>
  <Accordion title="Gateway(网关)Gateway(网关)、服务和管理器"Matrix>
    - 当启用沙箱隔离时，修复沙箱镜像。
    - 旧版服务迁移和额外网关检测。
    - Matrix 渠道旧版状态迁移（在 `--fix` / `--repair`Gateway(网关) 模式下）。
    - Gateway(网关) 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
    - 渠道状态警告（从正在运行的 Gateway(网关) 探测）。
    - 特定于渠道的权限检查位于 `openclaw channels capabilities`Discord 下；例如，Discord 语音频道权限使用 `openclaw channels capabilities --channel discord --target channel:<channel-id>`WhatsAppGateway(网关)TUI 进行审计。
    - WhatsApp 响应能力检查，针对 Gateway(网关) 事件循环健康状况下降但本地 TUI 客户端仍在运行的情况；`--fix`TUI 仅停止已验证的本地 TUI 客户端。
    - 针对 `openai-codex/*` 模型中的旧版模型引用的 Codex 路由修复，包括主模型、回退模型、图像/视频生成模型、心跳/子代理/压缩覆盖、钩子、渠道模型覆盖和会话路由固定；`--fix` 将其重写为 `openai/*`，将 `openai-codex:*` 身份验证配置文件/顺序迁移至 `openai:*`OpenAI，移除过时的会话/全代理运行时固定，并在默认 Codex 约具上保留规范的 OpenAI 代理引用。
    - 管理器配置审计（launchd/systemd/schtasks），并提供可选修复。
    - 为在安装或更新期间捕获了 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`Gateway(网关)BunGateway(网关) 值的网关服务清理嵌入式代理环境。
    - Gateway(网关) 运行时最佳实践检查（Node 与 Bun，版本管理器路径）。
    - Gateway(网关) 端口冲突诊断（默认 `18789`）。

  </Accordion>
  <Accordion title="Auth, security, and pairing"Gateway(网关)>
    - 针对开放私信策略的安全警告。
    - 本地令牌模式的 Gateway(网关) 身份验证检查（当不存在令牌源时提供令牌生成功能；不会覆盖令牌 SecretRef 配置）。
    - 设备配对故障检测（挂起的首次配对请求、挂起的角色/范围升级、过时的本地设备令牌缓存漂移，以及配对记录的身份验证漂移）。

  </Accordion>
  <Accordion title="Workspace and shell"Linux>
    - Linux 上的 systemd linger 检查。
    - Workspace bootstrap 文件大小检查（针对上下文文件的截断/接近限制警告）。
    - 默认代理的 Skills 准备情况检查；报告缺少二进制文件、环境变量、配置或操作系统要求但允许使用的 Skills，并且 `--fix` 可以在 `skills.entries`API 中禁用不可用的 Skills。
    - Shell 补全状态检查和自动安装/升级。
    - 记忆搜索嵌入提供商准备情况检查（本地模型、远程 API 密钥或 QMD 二进制文件）。
    - 源码安装检查（pnpm workspace 不匹配、缺少 UI 资产、缺少 tsx 二进制文件）。
    - 写入更新的配置 + 向导元数据。

  </Accordion>
</AccordionGroup>

## Dreams UI 回填和重置

控制 UI Dreams 场景包括用于基础梦境工作流的**Backfill**、**Reset** 和 **Clear Grounded** 操作。这些操作使用网关医生风格的 RPC 方法，但它们**不**属于 RPC`openclaw doctor`CLI CLI 修复/迁移的一部分。

它们的作用：

- **Backfill** 扫描活动工作区中的历史 `memory/YYYY-MM-DD.md` 文件，运行基础 REM 日记传递，并将可逆回填条目写入 `DREAMS.md`。
- **Reset** 仅从 `DREAMS.md` 中删除那些标记为回填的日记条目。
- **Clear Grounded** 仅删除来自历史重放且尚未累积实时回忆或日常支持的暂存仅基于事实的短期条目。

它们**不会**自己做的事情：

- 它们不编辑 `MEMORY.md`
- 它们不运行完整的医生迁移
- 除非您先显式运行暂存 CLI 路径，否则它们不会自动将基于事实的候选项暂存到实时短期推广存储中

如果您希望基于事实的历史回放能够影响常规深度推广通道，请改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

这将使基础持久候选项进入短期梦境存储，同时保持 `DREAMS.md` 作为审查表面。

## 详细行为和基本原理

<AccordionGroup>
  <Accordion title="0. 可选更新（git 安装）">
    如果这是一个 git checkout 版本并且 doctor 正在交互式运行，它会在运行 doctor 之前提议进行更新（fetch/rebase/build）。
  </Accordion>
  <Accordion title="1. 配置规范化">
    如果配置包含旧版值形状（例如 `messages.ackReaction` 没有特定于渠道的覆盖），doctor 会将其规范化为当前架构。

    这包括旧版 Talk 平铺字段。当前的公共 Talk 语音配置是 `talk.provider` + `talk.providers.<provider>`，实时语音配置是 `talk.realtime.*`。Doctor 会将旧的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形状重写为提供商映射，并将旧版顶级实时选择器（`talk.mode`、`talk.transport`、`talk.brain`、`talk.model`、`talk.voice`）重写为 `talk.realtime`。

    当 `plugins.allow` 非空且工具策略使用
    通配符或插件拥有的工具条目时，Doctor 还会发出警告。`tools.allow: ["*"]` 仅匹配
    实际加载的插件中的工具；它不会绕过独占插件
    许可列表。

  </Accordion>
  <Accordion title="2. 传统配置键迁移">
    当配置包含已弃用的键时，其他命令将拒绝运行并要求您运行 `openclaw doctor`。

    Doctor 将会：

    - 解释发现了哪些传统键。
    - 显示它应用的迁移。
    - 使用更新的架构重写 `~/.openclaw/openclaw.json`Gateway(网关)。

    Gateway(网关) 启动时会拒绝传统的配置格式，并要求您运行 `openclaw doctor --fix`；它不会在启动时重写 `openclaw.json`。Cron 任务存储迁移也由 `openclaw doctor --fix` 处理。

    当前迁移：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - 移除已废弃的 `channels.webchat` 和 `gateway.webchat`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → 顶层 `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - 传统 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
    - 传统顶层实时 Talk 选择器 (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
    - `routing.agentToAgent` → `tools.agentToAgent`
    - `routing.transcribeAudio` → `tools.media.audio.models`
    - `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
    - `messages.tts.provider: "edge"` 和 `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` 和 `messages.tts.providers.microsoft`
    - TTS 说话人选择字段 (`voice`/`voiceName`/`voiceId`) → `speakerVoice`/`speakerVoiceId`
    - `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` 和 `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` 和 `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - 对于具有命名 `accounts` 但仍存在单一账户顶层渠道值的渠道，将这些账户范围的值移动到为该渠道选择的提升账户中（对于大多数渠道为 `accounts.default`Matrix；Matrix 可以保留现有的匹配命名/默认目标）
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 移除 `agents.defaults.llm`；针对慢速提供商/模型超时使用 `models.providers.<id>.timeoutSeconds`，并且当整个运行必须持续更长时间时，保持 agent/run 超时高于该值
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 移除 `browser.relayBindHost` (传统扩展中继设置)
    - 传统 `models.providers.*.api: "openai"` → `"openai-completions"` (网关启动时也会跳过其 `api` 被设置为未来或未知枚举值的提供商，而不是封闭失败)
    - 移除 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex 应用服务器始终保持 Codex 原生工作区工具为原生状态

    Doctor 警告还包括针对多账户渠道的账户默认指导：

    - 如果配置了两个或更多 `channels.<channel>.accounts` 条目但未指定 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告回退路由可能会选择意外的账户。
    - 如果 `channels.<channel>.defaultAccount` 被设置为未知的账户 ID，doctor 会警告并列出已配置的账户 ID。

  </Accordion>
  <Accordion title="2b. OpenCode 提供商覆盖">
    如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它将覆盖来自 `openclaw/plugin-sdk/llm`APIAPI 的内置 OpenCode 目录。这可能会导致模型被强制使用错误的 API 或将成本清零。Doctor 会发出警告，以便您删除覆盖并恢复按模型的 API 路由 + 成本。
  </Accordion>
  <Accordion title="2c. 浏览器迁移和 Chrome MCP 就绪检查">
    如果您的浏览器配置仍然指向已移除的 Chrome 扩展路径，doctor 会将其规范化为当前主机本地 Chrome MCP 附加模型：

    - `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
    - `browser.relayBindHost` 被移除

    当您使用 `defaultProfile: "user"` 或配置的 `existing-session` 配置文件时，Doctor 还会审核主机本地 Chrome MCP 路径：

    - 检查同一主机上是否安装了 Google Chrome，用于默认自动连接配置文件
    - 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
    - 提醒您在浏览器检查页面启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 无法为您启用 Chrome 端的设置。主机本地 Chrome MCP 仍然需要：

    - 网关/节点主机上基于 Chromium 的浏览器 144+
    - 浏览器在本地运行
    - 在该浏览器中启用远程调试
    - 在浏览器中批准第一个附加同意提示

    这里的就绪检查仅与本地附加前提条件有关。现有会话保持当前的 Chrome MCP 路由限制；像 `responsebody`Docker、PDF 导出、下载拦截和批量操作这样的高级路由仍然需要托管浏览器或原始 CDP 配置文件。

    此检查**不**适用于 Docker、沙盒、remote-browser 或其他无头流程。这些流程继续使用原始 CDP。

  </Accordion>
  <Accordion title="OAuth2d. OAuth TLS 前提条件"OpenAIOAuthOpenAI>
    当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点，以验证本地 Node/OpenSSL TLS 栈是否能验证证书链。如果探测因证书错误（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`macOS、过期证书或自签名证书）而失败，doctor 会打印特定于平台的修复指南。在使用 Homebrew Node 的 macOS 上，修复方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使网关运行正常，探测也会运行。
  </Accordion>
  <Accordion title="OAuth2e. Codex OAuth 提供商覆盖"OpenAI>
    如果您之前在 `models.providers.openai-codex`OAuthOAuth 下添加了旧的 OpenAI 传输设置，它们可能会掩盖新版本自动使用的内置 Codex OAuth 提供商路径。当 Doctor 看到这些旧的传输设置与 Codex OAuth 并存时会发出警告，以便您可以删除或重写过时的传输覆盖，并恢复内置的路由/回退行为。仍然支持自定义代理和仅标头覆盖，并且不会触发此警告。
  </Accordion>
  <Accordion title="2f. Codex 路由修复">
    Doctor 会检查遗留的 `openai-codex/*` 模型引用。原生 Codex harness 路由使用规范的 `openai/*`OpenAIOpenClawOpenAI 模型引用；OpenAI 代理轮次通过 Codex 应用服务器 harness，而不是 OpenClaw OpenAI 提供商路径。

    在 `--fix` / `--repair` 模式下，doctor 会重写受影响的默认代理和按代理引用，包括主要模型、回退模型、图像/视频生成模型、心跳/子代理/压缩覆盖、钩子、渠道模型覆盖和过时的持久化会话路由状态：

    - `openai-codex/gpt-*` 变为 `openai/gpt-*`。
    - Codex intent 移至提供商/模型作用域的 `agentRuntime.id: "codex"` 条目，用于修复后的代理模型引用。
    - 过时的全代理运行时配置和持久化会话运行时固定项会被删除，因为运行时选择是提供商/模型作用域的。
    - 保留现有的提供商/模型运行时策略，除非修复后的遗留模型引用需要 Codex 路由来保留旧的认证路径。
    - 保留现有的模型回退列表，并重写其遗留条目；复制的按模型设置从遗留键移动到规范的 `openai/*` 键。
    - 在所有发现的代理会话存储中，修复持久化的会话 `modelProvider`/`providerOverride`、`model`/`modelOverride`、回退通知和认证配置文件固定项。
    - `/codex ...` 意味着“从聊天控制或绑定原生 Codex 对话。”
    - `/acp ...` 或 `runtime: "acp"` 意味着“使用外部 ACP/acpx 适配器。”

  </Accordion>
  <Accordion title="2g. 会话路由清理">
    在您将配置的模型或运行时从插件拥有的路由（如 Codex）移走后，Doctor 还会扫描发现的代理会话存储，以清理陈旧的自动创建路由状态。

    当其所属路由不再配置时，`openclaw doctor --fix` 可以清除自动创建的陈旧状态，例如 `modelOverrideSource: "auto"`CLI 模型固定、运行时模型元数据、固定的 harness id、CLI 会话绑定以及自动 auth-profile 覆盖。显式的用户或遗留会话模型选择将被报告以供手动审查，并保持不变；请使用 `/model ...`、`/new` 进行切换，或者当不再需要该路由时重置会话。

  </Accordion>
  <Accordion title="3. 遗留状态迁移（磁盘布局）">
    Doctor 可以将较旧的磁盘布局迁移到当前结构：

    - 会话存储 + 转录：
      - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - 代理目录：
      - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`WhatsAppBaileys
    - WhatsApp 认证状态：
      - 从遗留 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认帐户 id：`default`Gateway(网关)CLIWhatsApp）

    这些迁移是尽力而为且幂等的；当 doctor 将任何遗留文件夹作为备份保留时，会发出警告。Gateway/CLI 还会在启动时自动迁移遗留会话 + 代理目录，以便历史记录/认证/模型无需手动运行 doctor 即可进入每个代理的路径。WhatsApp 认证有意仅通过 `openclaw doctor` 进行迁移。Talk 提供商/提供商-map 标准化现在通过结构相等性进行比较，因此仅键顺序的差异不再触发重复的无操作 `doctor --fix` 更改。

  </Accordion>
  <Accordion title="3a. 旧版插件清单迁移">
    Doctor 会扫描所有已安装的插件清单，查找已弃用的顶级功能键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。找到后，它会将其移动到 `contracts` 对象中并就地重写清单文件。此迁移是幂等的；如果 `contracts` 键已具有相同的值，则删除旧键而不重复数据。
  </Accordion>
  <Accordion title="3b. 旧版 cron 存储迁移">
    Doctor 还会检查 cron 作业存储（默认为 `~/.openclaw/cron/jobs.json`，覆盖时为 `cron.store`）中调度程序为了兼容性仍接受的旧作业形状。

    当前的 cron 清理包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 顶级 payload 字段（`message`、`model`、`thinking`，...）→ `payload`
    - 顶级 delivery 字段（`deliver`、`channel`、`to`、`provider`，...）→ `delivery`
    - payload `provider` delivery 别名 → 显式 `delivery.channel`
    - 旧版 `notify: true` webhook 回退作业 → 来自 `cron.webhook` 的显式 webhook delivery；announce 作业保留其 chat delivery 并获取 `delivery.completionDestination`Gateway(网关)

    Gateway(网关)还会在加载时清理格式错误的 cron 行，以便有效作业继续运行。原始格式错误的行会在从 `jobs.json`Gateway(网关) 移除之前复制到活动存储旁边的 `jobs-quarantine.json`；doctor 会报告隔离的行，以便您可以手动审查或修复它们。

    Doctor 和 Gateway(网关)启动在调度程序运行之前使用相同的 `notify: true` 迁移。如果 `cron.webhook`Linux 缺失，doctor 会发出警告并保留旧版 notify 标记以进行手动修复。

    在 Linux 上，如果用户的 crontab 仍调用旧版 `~/.openclaw/bin/ensure-whatsapp.sh`OpenClaw，doctor 也会发出警告。该主机本地脚本不由当前的 OpenClaw 维护，并且当 cron 无法访问 systemd 用户总线时，可能会向 `~/.openclaw/logs/whatsapp-health.log` 写入错误的 `Gateway inactive` 消息。使用 `crontab -e` 删除过时的 crontab 条目；请使用 `openclaw channels status --probe`、`openclaw doctor` 和 `openclaw gateway status` 进行当前的健康检查。

  </Accordion>
  <Accordion title="3c. Session lock cleanup"OpenClaw>
    Doctor 扫描每个代理会话目录中的过时写锁文件——即会话异常退出时留下的文件。对于找到的每个锁文件，它会报告：路径、PID、PID 是否仍存活、锁的年龄，以及是否被视为过时（PID 已死、所有者元数据格式错误、超过 30 分钟，或可证明属于非 OpenClaw 进程的存活 PID）。在 `--fix` / `--repair`OpenClawOpenClaw 模式下，它会自动移除具有已死、孤立、回收、格式错误或非 OpenClaw 所有者的锁。仍由存活 OpenClaw 进程拥有的旧锁仅作报告而保留在原位，以免 Doctor 中断活动的记录写入器。
  </Accordion>
  <Accordion title="3d. Session transcript branch repair"OpenClaw>
    Doctor 扫描代理会话 JSONL 文件，查找由 2026.4.24 提示记录重写错误导致的重复分支形状：一个包含 OpenClaw 内部运行时上下文的被遗弃用户回合，以及一个包含相同可见用户提示的活动兄弟分支。在 `--fix` / `--repair` 模式下，Doctor 会将每个受影响的文件在原文件旁进行备份，并将记录重写至活动分支，从而使网关历史和内存读取器不再看到重复的回合。
  </Accordion>
  <Accordion title="4. 状态完整性检查（会话持久化、路由和安全）">
    状态目录是运营的“脑干”。如果它消失，您将丢失会话、凭据、日志和配置（除非您在其他地方有备份）。

    Doctor 会检查：

    - **State dir missing**：警告灾难性的状态丢失，提示重新创建目录，并提醒您它无法恢复丢失的数据。
    - **State dir permissions**：验证可写性；提供修复权限的选项（并在检测到所有者/组不匹配时发出 `chown`macOS 提示）。
    - **macOS cloud-synced state dir**：当状态解析到 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...`Linux 下时发出警告，因为同步支持的路径可能导致 I/O 变慢以及锁/同步竞争。
    - **Linux SD or eMMC state dir**：当状态解析到 `mmcblk*` 挂载源时发出警告，因为 SD 或 eMMC 支持的随机 I/O 在会话和凭据写入时可能更慢并且磨损更快。
    - **Session dirs missing**：`sessions/` 和会话存储目录是持久化历史记录并避免 `ENOENT` 崩溃所必需的。
    - **Transcript mismatch**：当最近的会话条目缺少转录文件时发出警告。
    - **Main 会话 "1-line JSONL"**：当主转录文件只有一行（历史记录未累积）时进行标记。
    - **Multiple state dirs**：当在主目录中存在多个 `~/.openclaw` 文件夹或 `OPENCLAW_STATE_DIR` 指向其他位置时发出警告（历史记录可能会在安装之间拆分）。
    - **Remote mode reminder**：如果 `gateway.mode=remote`，doctor 会提醒您在远程主机上运行它（状态驻留在那里）。
    - **Config file permissions**：如果 `~/.openclaw/openclaw.json` 可被组/全局读取，则发出警告并提供将其收紧为 `600` 的选项。

  </Accordion>
  <Accordion title="OAuth5. 模型认证健康 (OAuth 过期)"OAuthAnthropicOAuthAnthropicAPIAnthropic>
    Doctor 会检查认证存储中的 OAuth 配置文件，在令牌即将过期或已过期时发出警告，并在安全时刷新它们。如果 Anthropic OAuth/令牌配置文件已过时，它会建议使用 Anthropic API 密钥或 Anthropic setup-token 路径。刷新提示仅在交互式运行 (TTY) 时出现；`--non-interactive`OAuth 会跳过刷新尝试。

    当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant` 或提供商要求您重新登录），doctor 会报告需要重新认证，并打印出确切的 `openclaw models auth login --provider ...`OAuthmacOS 命令以供执行。

    Doctor 还会报告由于以下原因暂时无法使用的认证配置文件：

    - 短暂冷却（速率限制/超时/认证失败）
    - 长期禁用（计费/信用失败）

    旧版 Codex OAuth 配置文件的令牌存储在 macOS 钥匙串中（基于文件的 sidecar 布局之前的旧版新手引导），只能通过 doctor 进行修复。从交互式终端运行一次 `openclaw doctor --fix`，即可将钥匙串支持的旧版令牌内联迁移到 `auth-profiles.json`TelegramOpenAIOAuth；此后，嵌入式轮次（Telegram、cron、子代理调度）会将它们解析为规范的 OpenAI OAuth 配置文件。

  </Accordion>
  <Accordion title="6. 模型验证">
    如果设置了 `hooks.gmail.model`，doctor 会根据目录和允许列表验证模型引用，并在无法解析或被拒绝时发出警告。
  </Accordion>
  <Accordion title="7. 沙箱 image repair">
    当启用 Docker 时，doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧版名称的选项。
  </Accordion>
  <Accordion title="7b. 插件安装清理">
    Doctor 会移除 OpenClaw 生成的旧版插件依赖暂存状态，这是在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式下进行的。这包括过时的生成依赖根目录、旧的安装阶段目录、早期捆绑插件依赖修复代码遗留的本地包碎片，以及可能会覆盖当前捆绑清单的孤立或已恢复的托管 npm 捆绑 `@openclaw/*` 插件副本。Doctor 还会将主机 `openclaw` 包重新链接到声明 `peerDependencies.openclaw` 的托管 npm 插件中，以便更新或 npm 修复后，本地包运行时导入（如 `openclaw/plugin-sdk/*`）仍能正确解析。

    当配置引用了可下载插件但本地插件注册表找不到它们时，Doctor 也可以重新安装这些缺失的插件。示例包括素材 `plugins.entries`、配置的渠道/提供商/搜索设置以及配置的代理运行时。在包更新期间，当核心包正在交换时，Doctor 会避免运行包管理器插件修复；如果配置的插件仍需要恢复，请在更新后再次运行 `openclaw doctor --fix`。Gateway(网关) 启动和配置重新加载不会运行包管理器；插件安装仍然是显式的 doctor/install/update 工作。

  </Accordion>
  <Accordion title="Gateway(网关)8. Gateway(网关) 服务迁移和清理提示"OpenClawOpenClawLinuxOpenClaw>
    Doctor 会检测旧版 Gateway(网关) 服务（launchd/systemd/schtasks）并建议将其删除，并使用当前的 Gateway(网关) 端口安装 OpenClaw 服务。它还可以扫描其他类似 Gateway(网关) 的服务并打印清理提示。以配置文件命名的 OpenClaw Gateway(网关) 服务被视为首选服务，不会被标记为“额外”。

    在 Linux 上，如果缺少用户级 Gateway(网关) 服务但存在系统级 OpenClaw Gateway(网关) 服务，doctor 不会自动安装第二个用户级服务。请使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 进行检查，然后在系统主管管理 Gateway(网关) 生命周期时删除重复项或设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="Matrix8b. 启动 Matrix 迁移"Matrix>
    当 Matrix 渠道帐户有待处理或可操作的旧版状态迁移时，doctor（在 `--fix` / `--repair`Matrix 模式下）会创建预迁移快照，然后运行尽力而为的迁移步骤：旧版 Matrix 状态迁移和旧版加密状态准备。这两个步骤都不是致命的；错误会被记录，启动继续。在只读模式（`openclaw doctor` 不带 `--fix`）下，此检查将被完全跳过。
  </Accordion>
  <Accordion title="8c. Device pairing and auth drift">
    Doctor 现在会将设备配对状态作为常规健康检查的一部分进行检查。

    报告内容：

    - 待处理的首次配对请求
    - 已配对设备的待处理角色升级
    - 已配对设备的待处理范围升级
    - 公钥不匹配修复，即设备 ID 仍然匹配，但设备身份不再与已批准的记录匹配
    - 已配对记录缺少已批准角色的有效令牌
    - 已配对令牌的范围偏离已批准的配对基线
    - 当前机器的本地缓存设备令牌条目早于网关端的令牌轮换或携带过时的范围元数据

    Doctor 不会自动批准配对请求或自动轮换设备令牌。相反，它会打印确切的后续步骤：

    - 使用 `openclaw devices list` 检查待处理的请求
    - 使用 `openclaw devices approve <requestId>` 批准确切的请求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换新令牌
    - 使用 `openclaw devices remove <deviceId>` 删除并重新批准过时的记录

    这解决了常见的“已配对但仍提示需要配对”的问题：Doctor 现在可以区分首次配对、待处理的角色/范围升级以及过时的令牌/设备身份漂移。

  </Accordion>
  <Accordion title="9. 安全警告">
    当提供商在没有允许列表的情况下开放私信，或者策略以危险方式配置时，Doctor 会发出警告。
  </Accordion>
  <Accordion title="Linux10. systemd linger (Linux)">
    如果作为 systemd 用户服务运行，Doctor 会确保已启用 linger，以便网关在注销后保持运行。
  </Accordion>
  <Accordion title="11. Workspace status (skills, plugins, and legacy dirs)">
    Doctor 会打印默认代理的工作区状态摘要：

    - **Skills status**：统计符合条件、缺少要求和被允许列表阻止的 Skills。
    - **Legacy workspace dirs**：当 `~/openclaw` 或其他旧版工作区目录与当前工作区并存时发出警告。
    - **Plugin status**：统计已启用/已禁用/已出错的插件；列出任何出错的插件 ID；报告捆绑插件功能。
    - **Plugin compatibility warnings**：标记与当前运行时存在兼容性问题的插件。
    - **Plugin diagnostics**：显示插件注册器发出的任何加载时警告或错误。

  </Accordion>
  <Accordion title="11b. Bootstrap file size">
    Doctor 会检查工作区 bootstrap 文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超过配置的字符预算。它会报告每个文件的原始字符数与注入字符数的对比、截断百分比、截断原因（`max/file` 或 `max/total`），以及注入的总字符数占总预算的比例。当文件被截断或接近限制时，doctor 会打印有关调整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。
  </Accordion>
  <Accordion title="11d. Stale 渠道 plugin cleanup">
    当 `openclaw doctor --fix` 移除缺失的渠道插件时，它还会移除引用该插件的悬空渠道作用域配置：`channels.<id>` 条目、命名该渠道的心跳目标以及 `agents.*.models["<channel>/*"]`Gateway(网关) 覆盖项。这可以防止 Gateway(网关) 启动循环，即渠道运行时已消失但配置仍要求 gateway 绑定到它。
  </Accordion>
  <Accordion title="11c. Shell completion">
    Doctor 会检查是否为当前 shell（zsh、bash、fish 或 PowerShell）安装了 Tab 补全功能：

    - 如果 shell 配置文件使用缓慢的动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件变体。
    - 如果补全功能已在配置文件中配置但缓存文件缺失，doctor 会自动重新生成缓存。
    - 如果根本没有配置补全功能，doctor 会提示进行安装（仅限交互模式；使用 `--non-interactive` 时跳过）。

    运行 `openclaw completion --write-state` 可手动重新生成缓存。

  </Accordion>
  <Accordion title="Gateway(网关)12. Gateway(网关) auth checks (local token)">
    Doctor 检查本地 Gateway(网关) 令牌身份验证就绪状态。

    - 如果令牌模式需要令牌但不存在令牌源，Doctor 会提议生成一个。
    - 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，Doctor 会发出警告并且不会用明文覆盖它。
    - `openclaw doctor --generate-gateway-token` 仅在未配置令牌 SecretRef 时强制生成。

  </Accordion>
  <Accordion title="12b. Read-only SecretRef-aware repairs">
    某些修复流程需要检查已配置的凭据，而不会削弱运行时的快速失败行为。

    - `openclaw doctor --fix`Telegram 现在对针对配置的修复使用与状态系列命令相同的只读 SecretRef 摘要模型。
    - 示例：Telegram `allowFrom` / `groupAllowFrom` `@username`Telegram 修复尝试在可用时使用已配置的机器人凭据。
    - 如果 Telegram 机器人令牌通过 SecretRef 配置但在当前命令路径中不可用，Doctor 会报告该凭据“已配置但不可用”，并跳过自动解析，而不是崩溃或错误地将令牌报告为缺失。

  </Accordion>
  <Accordion title="Gateway(网关)13. Gateway(网关) 健康检查 + 重启">
    Doctor 运行健康检查，并在 Gateway(网关) 看起来不健康时提议重启它。
  </Accordion>
  <Accordion title="13b. Memory search readiness">
    Doctor 会检查配置的记忆搜索嵌入提供商是否已准备好供默认智能体使用。其行为取决于配置的后端和提供商：

    - **QMD backend**：探测 `qmd` 二进制文件是否可用且可启动。如果不可用，则会打印修复指南，包括 npm 包和手动二进制路径选项。
    - **Explicit local 提供商**：检查是否存在本地模型文件或可识别的远程/可下载模型 URL。如果缺失，建议切换到远程提供商。
    - **Explicit remote 提供商**（`openai`、`voyage` 等）：验证环境或身份验证存储中是否存在 API 密钥。如果缺失，则打印可操作的修复提示。
    - **Legacy auto 提供商**：将 `memorySearch.provider: "auto"` 视为 OpenAI，检查 OpenAI 就绪状态，并且 `doctor --fix` 会将其重写为 `provider: "openai"`。

    当存在缓存的网关探测结果时（网关在检查时是健康的），Doctor 会将其结果与 CLI 可见配置进行交叉比对，并记录任何差异。Doctor 不会在默认路径上启动新的嵌入 ping；如果您想要对提供商进行实时检查，请使用深度内存状态命令。

    使用 `openclaw memory status --deep` 来验证运行时的嵌入就绪状态。

  </Accordion>
  <Accordion title="14. 渠道状态警告">
    如果网关健康，doctor 会运行渠道状态探测并报告带有建议修复方案的警告。
  </Accordion>
  <Accordion title="15. Supervisor 配置审计 + 修复">
    Doctor 会检查已安装的 supervisor 配置（launchd/systemd/schtasks）中是否有缺失或过时的默认值（例如，systemd network-online 依赖项和重启延迟）。当发现不匹配时，它会建议更新，并可以将服务文件/任务重写为当前默认值。

    注意事项：

    - `openclaw doctor` 会在重写 supervisor 配置之前提示。
    - `openclaw doctor --yes` 接受默认的修复提示。
    - `openclaw doctor --fix` 应用推荐的修复而不提示（`--repair` 是别名）。
    - `openclaw doctor --fix --force` 会覆盖自定义的 supervisor 配置。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external`Linux 使 doctor 对 Gateway 服务生命周期保持只读。它仍然报告服务健康状况并运行非服务修复，但会跳过服务安装/启动/重启/引导、supervisor 配置重写和旧版服务清理，因为外部 supervisor 拥有该生命周期。
    - 在 Linux 上，当匹配的 systemd gateway 单元处于活动状态时，doctor 不会重写命令/入口点元数据。它还会在重复服务扫描期间忽略不活动的非旧版额外类 gateway 单元，以免伴随服务文件产生清理干扰。
    - 如果令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，则 doctor 服务安装/修复会验证 SecretRef，但不会将解析后的纯文本令牌值持久化到 supervisor 服务环境元数据中。
    - Doctor 检测到较旧的 LaunchAgent、systemd 或 Windows 计划任务安装中内嵌的受管 `.env`Windows/SecretRef 支持的服务环境值，并重写服务元数据，以便这些值从运行时源而不是 supervisor 定义加载。
    - Doctor 检测到 `gateway.port` 更改后服务命令是否仍固定旧的 `--port`，并将服务元数据重写为当前端口。
    - 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，doctor 会通过可操作的指导阻止安装/修复路径。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`Linux，则 doctor 会阻止安装/修复，直到显式设置模式。
    - 对于 Linux 用户 systemd 单元，doctor 令牌漂移检查现在在比较服务身份验证元数据时包括 `Environment=` 和 `EnvironmentFile=`OpenClawGateway(网关) 源。
    - 当配置最后由较新版本写入时，Doctor 服务修复拒绝重写、停止或重启来自较旧 OpenClaw 二进制文件的 Gateway 服务。请参阅 [Gateway 故障排除](/zh/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 您始终可以通过 `openclaw gateway install --force` 强制进行完全重写。

  </Accordion>
  <Accordion title="Gateway(网关)16. Gateway(网关) 运行时 + 端口诊断">
    Doctor 会检查服务运行时（PID、上次退出状态），并在服务已安装但未实际运行时发出警告。它还会检查网关端口（默认 `18789`）上的端口冲突，并报告可能的原因（网关已在运行、SSH 隧道）。
  </Accordion>
  <Accordion title="Gateway(网关)17. Gateway(网关) 运行时最佳实践"Bun>
    当网关服务在 Bun 上或受版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf`WhatsAppTelegrammacOS 等）上运行时，Doctor 会发出警告。WhatsApp + Telegram 渠道需要 Node，且版本管理器路径可能会在升级后失效，因为服务不会加载您的 shell 初始化配置。如果系统上安装了系统版 Node（Homebrew/apt/choco），Doctor 会建议迁移到该安装。

    新安装或修复的 macOS LaunchAgents 使用规范的系统 PATH（`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`Linux），而不是复制交互式 shell PATH，因此 Homebrew 管理的系统二进制文件保持可用，而 Volta、asdf、fnm、pnpm 和其他版本管理器目录不会影响 Node 子进程的解析。Linux 服务仍然保留显式的环境根目录（`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`）和稳定的用户 bin 目录，但推测的版本管理器回退目录仅在这些目录存在于磁盘上时才会写入到服务 PATH 中。

  </Accordion>
  <Accordion title="18. 配置写入 + 向导元数据">
    Doctor 会保存所有配置更改，并标记向导元数据以记录此次 doctor 运行。
  </Accordion>
  <Accordion title="19. 工作区提示（备份 + 记忆系统）">
    Doctor 在缺少工作区记忆系统时会建议添加，并且如果工作区尚未受 git 管理，则会打印备份提示。

    请参阅 [/concepts/agent-workspace](/zh/concepts/agent-workspace) 以获取有关工作区结构和 git 备份的完整指南（推荐使用私有 GitHub 或 GitLab）。

  </Accordion>
</AccordionGroup>

## 相关

- [Gateway(网关) runbook](/zh/gateway)
- [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)
