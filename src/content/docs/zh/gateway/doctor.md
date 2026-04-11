---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修复和迁移工具。它会修复过时的配置/状态，检查健康状况，并提供可执行的修复步骤。

## 快速开始

```bash
openclaw doctor
```

### 无头 / 自动化

```bash
openclaw doctor --yes
```

在接受提示时使用默认选项（包括在适用时的重启/服务/沙盒修复步骤）。

```bash
openclaw doctor --repair
```

在不提示的情况下应用推荐的修复（在安全的情况下进行修复和重启）。

```bash
openclaw doctor --repair --force
```

也应用激进的修复（覆盖自定义的 supervisor 配置）。

```bash
openclaw doctor --non-interactive
```

无提示运行，且仅应用安全的迁移（配置规范化 + 磁盘状态移动）。跳过需要人工确认的重启/服务/沙箱操作。
检测到旧版状态迁移时会自动运行。

```bash
openclaw doctor --deep
```

扫描系统服务中是否有额外的网关安装 (launchd/systemd/schtasks)。

如果您想在写入之前查看更改，请先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## 功能概要

- 针对 git 安装的可选预更新（仅限交互模式）。
- UI 协议时效性检查（当协议架构较新时重新构建 Control UI）。
- 健康检查 + 重启提示。
- Skills 状态摘要（符合资格/缺失/已阻止）以及插件状态。
- 针对旧版值的配置规范化。
- 讨论配置从旧的扁平 `talk.*` 字段迁移到 `talk.provider` + `talk.providers.<provider>`。
- 浏览器迁移检查旧的 Chrome 扩展配置和 Chrome MCP 就绪状态。
- OpenCode 提供商覆盖警告 (`models.providers.opencode` / `models.providers.opencode-go`)。
- Codex OAuth 遮蔽警告 (`models.providers.openai-codex`)。
- OpenAI Codex OAuth 配置文件的 OAuth TLS 先决条件检查。
- 旧版本地磁盘状态迁移（会话/agent 目录/WhatsApp 认证）。
- 旧版插件清单契约键迁移 (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`)。
- 旧版 cron 存储迁移 (`jobId`, `schedule.cron`, 顶级 delivery/payload 字段, payload `provider`, 简单 `notify: true` webhook 后备作业)。
- 会话锁文件检查和过期锁清理。
- 状态完整性和权限检查（会话、记录副本、状态目录）。
- 本地运行时的配置文件权限检查 (chmod 600)。
- 模型认证健康检查：检查 OAuth 过期情况，可刷新即将过期的令牌，并报告认证配置文件的冷却/禁用状态。
- 额外工作区目录检测 (`~/openclaw`)。
- 启用沙箱隔离时的沙箱镜像修复。
- 旧版服务迁移和额外网关检测。
- Matrix 渠道旧版状态迁移（在 `--fix` / `--repair` 模式下）。
- Gateway(网关) 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
- 渠道状态警告（从正在运行的 Gateway 探测）。
- 监管程序配置审计 (launchd/systemd/schtasks)，可选择修复。
- Gateway(网关) 运行时最佳实践检查（Node 与 Bun、版本管理器路径）。
- Gateway(网关) 端口冲突诊断（默认 `18789`）。
- 针对开放私信策略的安全警告。
- 本地令牌模式下的 Gateway(网关) 认证检查（当不存在令牌源时提供令牌生成；不会覆盖令牌 SecretRef 配置）。
- Linux 上的 systemd linger 检查。
- 工作区引导文件大小检查（针对上下文文件的截断/接近限制警告）。
- Shell 自动补全状态检查和自动安装/升级。
- 内存搜索嵌入提供商就绪状态检查（本地模型、远程 API 密钥或 QMD 二进制文件）。
- 源码安装检查（pnpm 工作区不匹配、缺少 UI 资产、缺少 tsx 二进制文件）。
- 写入更新后的配置 + 向导元数据。

## 详细行为和原理

### 0) 可选更新（git 安装）

如果是 git 检出且 doctor 正在交互模式下运行，它会提议在运行 doctor 之前进行更新（fetch/rebase/build）。

### 1) 配置规范化

如果配置包含旧版值形状（例如 `messages.ackReaction` 没有渠道特定的覆盖），doctor 会将其规范化为当前架构。

这包括旧版 Talk 扁平字段。当前的公共 Talk 配置是 `talk.provider` + `talk.providers.<provider>`。Doctor 会将旧的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形状重写为提供商映射。

### 2) 旧版配置键迁移

当配置包含已弃用的键时，其他命令将拒绝运行并要求您运行 `openclaw doctor`。

Doctor 将：

- 解释发现了哪些旧版键。
- 显示它应用的迁移。
- 使用更新后的架构重写 `~/.openclaw/openclaw.json`。

当 Gateway(网关) 检测到旧版配置格式时，它也会在启动时自动运行 doctor 迁移，因此无需人工干预即可修复过时的配置。Cron 作业存储迁移由 `openclaw doctor --fix` 处理。

当前迁移：

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → 顶层 `bindings`
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- 旧版 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
- `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
- `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
- `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
- `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
- `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
- `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
- `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold`
  → `plugins.entries.voice-call.config.streaming.providers.openai.*`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- 对于具有命名 `accounts` 但仍有残留的单账户顶级渠道值的渠道，将这些账户范围的值移动到为该渠道选择的提升账户中（对于大多数渠道为 `accounts.default`；Matrix 可以保留现有的匹配命名/默认目标）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost`（旧版扩展中继设置）

Doctor 警告还包含针对多账号渠道的账号默认指导：

- 如果配置了两个或更多 `channels.<channel>.accounts` 条目且未设置 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 会警告回退路由可能会选择意外的账号。
- 如果 `channels.<channel>.defaultAccount` 被设置为未知的账号 ID，Doctor 会发出警告并列出已配置的账号 ID。

### 2b) OpenCode 提供商覆盖

如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它将覆盖来自 `@mariozechner/pi-ai` 的内置 OpenCode 目录。这可能会强制将模型路由到错误的 API 或将费用清零。Doctor 会发出警告，以便您可以移除覆盖并恢复按模型进行的 API 路由和费用设置。

### 2c) 浏览器迁移和 Chrome MCP 准备

如果您的浏览器配置仍然指向已移除的 Chrome 扩展路径，Doctor 会将其规范化为当前主机本地的 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
- `browser.relayBindHost` 被移除

当您使用 `defaultProfile:
"user"` or a configured `existing-会话` 配置文件时，Doctor 还会审计主机本地的 Chrome MCP 路径：

- 检查默认自动连接配置文件的主机上是否安装了 Google Chrome
- 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
- 提醒您在浏览器检查页面中启用远程调试（例如
  `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging`
  或 `edge://inspect/#remote-debugging`）

Doctor 无法为您启用 Chrome 端的设置。主机本地 Chrome MCP 仍然需要：

- 网关/节点主机上基于 Chromium 的浏览器版本为 144 或更高
- 浏览器在本地运行
- 在该浏览器中启用了远程调试
- 在浏览器中批准首次附加同意提示

此处的准备状态仅涉及本地连接的前提条件。现有会话保留当前的 Chrome MCP 路由限制；诸如 `responsebody`、PDF 导出、下载拦截和批量操作等高级路由仍然需要托管浏览器或原始 CDP 配置文件。

此检查**不**适用于 Docker、沙盒、远程浏览器或其他无头流程。这些流程继续使用原始 CDP。

### 2d) OAuth TLS 先决条件

配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点，以验证本地 Node/OpenSSL TLS 栈是否能验证证书链。如果探测失败并出现证书错误（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、过期证书或自签名证书），doctor 会打印特定于平台的修复指南。在带有 Homebrew Node 的 macOS 上，修复方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使网关运行正常，探测也会运行。

### 2c) Codex OAuth 提供商覆盖

如果您之前在 `models.providers.openai-codex` 下添加了旧版 OpenAI 传输设置，它们可能会掩盖新版本自动使用的内置 Codex OAuth 提供商路径。当 doctor 发现这些旧的传输设置与 Codex OAuth 共存时会发出警告，以便您可以删除或重写过时的传输覆盖，从而恢复内置的路由/回退行为。仍支持自定义代理和仅限标头的覆盖，且不会触发此警告。

### 3) 旧版状态迁移（磁盘布局）

Doctor 可以将较旧的磁盘布局迁移到当前结构：

- 会话存储 + 转录：
  - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 认证状态 (Baileys)：
  - 从旧版 `~/.openclaw/credentials/*.json` （`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...` （默认帐户 ID： `default`）

这些迁移是尽力而为且幂等的；当 doctor 将任何遗留文件夹保留为备份时，它会发出警告。Gateway(网关)/CLI 也会在启动时自动迁移旧的会话 + agent 目录，因此历史记录/身份验证/模型会自动进入 per-agent 路径，而无需手动运行 doctor。WhatsApp 身份验证有意仅通过 `openclaw doctor` 进行迁移。Talk 提供商/提供商-map 标准化现在通过结构相等性进行比较，因此仅键顺序不同的差异不再触发重复的空操作 `doctor --fix` 更改。

### 3a) 遗留插件清单迁移

Doctor 会扫描所有已安装的插件清单，查找已弃用的顶级功能键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。发现后，它会提议将其移动到 `contracts` 对象中并就地重写清单文件。此迁移是幂等的；如果 `contracts` 键已具有相同的值，则删除旧键而不重复数据。

### 3b) 遗留 cron 存储迁移

Doctor 还会检查 cron 作业存储（默认为 `~/.openclaw/cron/jobs.json`，或覆盖时为 `cron.store`）中调度程序为了兼容性仍接受的旧作业形状。

当前的 cron 清理包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 顶级 payload 字段（`message`、`model`、`thinking`、...）→ `payload`
- 顶级 delivery 字段（`deliver`、`channel`、`to`、`provider`、...）→ `delivery`
- payload `provider` delivery 别名 → 显式 `delivery.channel`
- 简单的旧式 `notify: true` webhook 后备作业 → 带有 `delivery.to=cron.webhook` 的显式 `delivery.mode="webhook"`

Doctor 仅在不会改变行为的情况下自动迁移 `notify: true` 作业。如果某个作业将旧式通知后备与现有的非 webhook 传递模式结合使用，doctor 会发出警告并将该作业留待手动检查。

### 3c) 会话锁清理

Doctor 会扫描每个代理会话目录中的陈旧写入锁文件——即会话异常退出时遗留的文件。对于发现的每个锁文件，它会报告：路径、PID、PID 是否仍在运行、锁定时长，以及是否被视为陈旧（PID 已死或超过 30 分钟）。在 `--fix` / `--repair` 模式下，它会自动删除陈旧的锁文件；否则，它会打印一条说明并指示您使用 `--fix` 重新运行。

### 4) 状态完整性检查（会话持久化、路由和安全）

状态目录是操作的神经中枢。如果它消失了，您将丢失会话、凭据、日志和配置（除非您在其他地方有备份）。

Doctor 检查：

- **State dir missing**（状态目录缺失）：警告灾难性的状态丢失，提示重新创建目录，并提醒您它无法恢复丢失的数据。
- **State dir permissions**（状态目录权限）：验证可写性；提供修复权限的选项（并在检测到所有者/组不匹配时发出 `chown` 提示）。
- **macOS cloud-synced state dir**（macOS 云同步状态目录）：当状态解析到 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 下时发出警告，因为同步支持的路径可能会导致 I/O 变慢以及锁定/同步竞争。
- **Linux SD or eMMC state dir**（Linux SD 或 eMMC 状态目录）：当状态解析到 `mmcblk*` 挂载源时发出警告，因为 SD 或 eMMC 支持的随机 I/O 可能会更慢，并且在会话和凭据写入下磨损更快。
- **Session dirs missing**（会话目录缺失）：`sessions/` 和会话存储目录是持久化历史记录并避免 `ENOENT` 崩溃所必需的。
- **Transcript mismatch**（记录不匹配）：当最近的会话条目缺少记录文件时发出警告。
- **主会话“单行 JSONL”**：当主记录只有一行时发出标记（历史记录未累积）。
- **多个状态目录**：当跨主目录存在多个 `~/.openclaw` 文件夹，或者当 `OPENCLAW_STATE_DIR` 指向其他位置时发出警告（历史记录可能在安装之间拆分）。
- **远程模式提醒**：如果是 `gateway.mode=remote`，doctor 会提醒你在远程主机上运行它（状态存储在那里）。
- **配置文件权限**：如果 `~/.openclaw/openclaw.json` 可被组/其他用户读取，则发出警告并提供将其收紧为 `600`。

### 5) 模型认证健康状况（OAuth 到期）

Doctor 会检查认证存储中的 OAuth 配置文件，在令牌即将到期/已到期时发出警告，并可以在安全的情况下刷新它们。如果 Anthropic OAuth/令牌配置文件已过期，它会建议使用 Anthropic API 密钥或 Anthropic setup-token 路径。
刷新提示仅在以交互方式（TTY）运行时出现；`--non-interactive` 会跳过刷新尝试。

Doctor 还会报告由于以下原因暂时无法使用的认证配置文件：

- 短暂冷却（速率限制/超时/认证失败）
- 较长时间的禁用（计费/信贷失败）

### 6) Hooks 模型验证

如果设置了 `hooks.gmail.model`，doctor 会对照目录和允许列表验证模型引用，并在无法解析或被拒绝时发出警告。

### 7) 沙箱镜像修复

启用沙箱隔离时，doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧名称。

### 7b) 捆绑插件运行时依赖项

Doctor 会验证捆绑插件运行时依赖项（例如 Discord 插件运行时包）是否存在于 OpenClaw 安装根目录中。如果缺少任何包，doctor 会报告这些包并以 `openclaw doctor --fix` / `openclaw doctor --repair` 模式安装它们。

### 8) Gateway(网关) 服务迁移和清理提示

Doctor 会检测旧的 gateway 服务（launchd/systemd/schtasks），并提供将其删除，并使用当前的 gateway 端口安装 OpenClaw 服务。它还可以扫描额外的类 gateway 服务并打印清理提示。以配置文件命名的 OpenClaw gateway 服务被视为第一方服务，不会被标记为“额外”。

### 8b) 启动 Matrix 迁移

当 Matrix 渠道帐户有待处理或可操作的旧版状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建一个预迁移快照，然后运行尽力而为的迁移步骤：旧版 Matrix 状态迁移和旧版加密状态准备。这两个步骤都不是致命的；错误会被记录，启动过程会继续。在只读模式下（不带 `--fix` 的 `openclaw doctor`），将完全跳过此检查。

### 9) 安全警告

当提供商在没有允许列表的情况下开放私信功能，或者策略以危险方式配置时，Doctor 会发出警告。

### 10) systemd linger (Linux)

如果作为 systemd 用户服务运行，doctor 会确保启用 linger，以便网关在注销后保持运行。

### 11) 工作区状态（Skills、插件和旧版目录）

Doctor 打印默认代理的工作区状态摘要：

- **Skills 状态**：统计符合条件的、缺少要求的和被允许列表阻止的 Skills。
- **旧版工作区目录**：当 `~/openclaw` 或其他旧版工作区目录
  与当前工作区共存时发出警告。
- **插件状态**：统计已加载/已禁用/出错的插件；列出任何错误的插件 ID；报告捆绑插件功能。
- **插件兼容性警告**：标记与当前运行时存在兼容性问题的插件。
- **插件诊断**：显示插件注册器发出的任何加载时警告或错误。

### 11b) 引导文件大小

Doctor 检查工作区引导文件（例如 `AGENTS.md`、
`CLAUDE.md` 或其他注入的上下文文件）是否接近或超过配置的字符预算。它报告每个文件的原始字符数与注入字符数对比、截断百分比、截断原因（`max/file` 或 `max/total`），以及总注入字符数占总预算的比例。当文件被截断或接近限制时，doctor 会打印调整 `agents.defaults.bootstrapMaxChars`
和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

### 11c) Shell 补全

Doctor 检查是否为当前 shell（zsh、bash、fish 或 PowerShell）安装了 Tab 补全功能：

- 如果 shell 配置文件使用了缓慢的动态补全模式
  (`source <(openclaw completion ...)`)，doctor 会将其升级为更快的
  缓存文件变体。
- 如果在配置文件中配置了补全但缓存文件缺失，
  doctor 会自动重新生成缓存。
- 如果根本没有配置补全，doctor 会提示安装它
  (仅限交互模式；使用 `--non-interactive` 时跳过)。

运行 `openclaw completion --write-state` 以手动重新生成缓存。

### 12) Gateway(网关) auth checks (local token)

Doctor 检查本地网关令牌认证的就绪状态。

- 如果令牌模式需要令牌但不存在令牌源，doctor 会提议生成一个。
- 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告，且不会用明文覆盖它。
- `openclaw doctor --generate-gateway-token` 仅在未配置令牌 SecretRef 时强制生成。

### 12b) Read-only SecretRef-aware repairs

某些修复流程需要检查配置的凭据，而不削弱运行时的快速失败（fail-fast）行为。

- `openclaw doctor --fix` 现在使用与 status 系列（状态类）命令相同的只读 SecretRef 摘要模型，用于定向配置修复。
- 示例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修复尝试在可用时使用配置的 bot 凭据。
- 如果 Telegram bot 令牌通过 SecretRef 配置，但在当前命令路径中不可用，doctor 会报告该凭据“已配置但不可用”，并跳过自动解析，而不是崩溃或错误地将令牌报告为缺失。

### 13) Gateway(网关) health check + restart

Doctor 运行健康检查，并在网关看起来
不健康时提供重启选项。

### 13b) Memory search readiness

Doctor 检查为默认代理配置的内存搜索嵌入提供商
是否准备就绪。其行为取决于配置的后端和提供商：

- **QMD backend**: 探测 `qmd` 二进制文件是否可用且可启动。
  如果不可用，会打印修复指南，包括 npm 包和手动二进制路径选项。
- **Explicit local 提供商**: 检查本地模型文件或已识别的
  远程/可下载模型 URL。如果缺失，建议切换到远程提供商。
- **Explicit remote 提供商** (`openai`, `voyage`, 等)：验证环境中或身份验证存储中是否存在 API 密钥。如果缺失，则输出可操作的修复提示。
- **Auto 提供商**：首先检查本地模型可用性，然后按照自动选择顺序尝试每个远程提供商。

当网关探测结果可用时（检查时网关状态良好），doctor 会将其结果与 CLI 可见配置进行交叉比对，并记录任何差异。

使用 `openclaw memory status --deep` 在运行时验证嵌入准备情况。

### 14) 渠道状态警告

如果网关状态良好，doctor 会运行渠道状态探测并报告附带建议修复的警告。

### 15) Supervisor 配置审计 + 修复

Doctor 会检查已安装的 supervisor 配置（launchd/systemd/schtasks）中是否有缺失或过时的默认值（例如，systemd network-online 依赖项和重启延迟）。当发现不匹配时，它会建议更新，并可以将服务文件/任务重写为当前默认值。

注意：

- `openclaw doctor` 在重写 supervisor 配置之前会提示。
- `openclaw doctor --yes` 接受默认的修复提示。
- `openclaw doctor --repair` 应用建议的修复而无需提示。
- `openclaw doctor --repair --force` 覆盖自定义 supervisor 配置。
- 如果令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，doctor 服务安装/修复会验证 SecretRef，但不会将解析后的明文令牌值持久化到 supervisor 服务环境元数据中。
- 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，doctor 会通过可操作的指导阻止安装/修复流程。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，doctor 将阻止安装/修复，直到明确设置模式。
- 对于 Linux 用户 systemd 单元，doctor 在比较服务身份验证元数据时，令牌漂移检查现在包括 `Environment=` 和 `EnvironmentFile=` 源。
- 您始终可以通过 `openclaw gateway install --force` 强制完全重写。

### 16) 网关运行时 + 端口诊断

Doctor 会检查服务运行时（PID，上次退出状态），并在服务已安装但未实际运行时发出警告。它还会检查 Gateway(网关) 端口（默认 `18789`）上的端口冲突，并报告可能的原因（Gateway(网关) 已在运行、SSH 隧道）。

### 17) Gateway(网关) 运行时最佳实践

当 Gateway(网关) 服务在 Bun 或受版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）上运行时，Doctor 会发出警告。WhatsApp + Telegram 渠道需要 Node，且由于服务不会加载您的 shell 初始化文件，版本管理器路径在升级后可能会失效。如果可用，Doctor 会提供迁移到系统 Node 安装的选项（Homebrew/apt/choco）。

### 18) 配置写入 + 向导元数据

Doctor 会保留所有配置更改并标记向导元数据，以记录 doctor 的运行。

### 19) 工作区提示（备份 + 记忆系统）

如果缺少工作区记忆系统，Doctor 会建议安装一个；如果工作区尚未纳入 git 管理，则会打印备份提示。

有关工作区结构和 git 备份的完整指南（推荐使用私有的 GitHub 或 GitLab），请参阅 [/concepts/agent-workspace](/en/concepts/agent-workspace)。
