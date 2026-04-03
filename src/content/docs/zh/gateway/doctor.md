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
- 浏览器迁移检查旧版 Chrome 扩展配置和 Chrome MCP 准备情况。
- OpenCode 提供商覆盖警告 (`models.providers.opencode` / `models.providers.opencode-go`)。
- 针对 OpenAI Codex OAuth 配置文件的 OAuth TLS 先决条件检查。
- 旧的磁盘状态迁移（会话/agent 目录/WhatsApp 认证）。
- 旧的插件清单契约键迁移（`speechProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders` → `contracts`）。
- 旧的 cron 存储迁移（`jobId`、`schedule.cron`、顶级 delivery/payload 字段、payload `provider`、简单的 `notify: true` webhook 后备作业）。
- 会话锁文件检查和过期锁清理。
- 状态完整性和权限检查（会话、transcripts、state 目录）。
- 本地运行时的配置文件权限检查 (chmod 600)。
- 模型认证健康检查：检查 OAuth 过期情况，可以刷新即将过期的令牌，并报告认证配置文件的冷却/禁用状态。
- 额外的工作区目录检测 (`~/openclaw`)。
- 启用沙箱隔离时的沙箱镜像修复。
- 旧服务迁移和额外的网关检测。
- Matrix 渠道的旧状态迁移（在 `--fix` / `--repair` 模式下）。
- Gateway(网关) 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
- 渠道状态警告（从运行的网关探测）。
- Supervisor 配置审核（launchd/systemd/schtasks）并可选修复。
- Gateway(网关) 运行时最佳实践检查（Node 对比 Bun，版本管理器路径）。
- Gateway(网关) 端口冲突诊断（默认 `18789`）。
- 针对开放 私信 策略的安全警告。
- Gateway(网关) 针对本地令牌模式的认证检查（当不存在令牌源时提供令牌生成；不会覆盖令牌 SecretRef 配置）。
- 在 Linux 上检查 systemd linger。
- 工作区引导文件大小检查（针对上下文文件的截断/接近限制警告）。
- Shell 补全状态检查以及自动安装/升级。
- 内存搜索嵌入提供商就绪情况检查（本地模型、远程 API 密钥或 QMD 二进制文件）。
- 源码安装检查（pnpm 工作区不匹配、UI 资源缺失、tsx 二进制文件缺失）。
- 写入更新的配置 + 向导元数据。

## 详细行为和基本原理

### 0) 可选更新（git 安装）

如果是 git 签出版本且 doctor 正在交互模式下运行，它会在运行 doctor 之前提供更新（fetch/rebase/build）选项。

### 1) 配置规范化

如果配置包含旧的值格式（例如 `messages.ackReaction` 没有特定渠道的覆盖），doctor 会将其规范化为当前架构。

### 2) 旧配置键迁移

当配置包含已弃用的键时，其他命令将拒绝运行并要求您运行 `openclaw doctor`。

Doctor 将：

- 解释发现了哪些旧键。
- 显示它应用的迁移。
- 使用更新后的架构重写 `~/.openclaw/openclaw.json`。

当 Gateway(网关) 检测到旧的配置格式时，也会在启动时自动运行 doctor 迁移，因此无需人工干预即可修复过时的配置。Cron 作业存储迁移由 `openclaw doctor --fix` 处理。

当前迁移：

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → 顶层 `bindings`
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
- `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
- `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
- `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- 对于具有命名 `accounts` 但缺少 `accounts.default` 的渠道，如果存在，则将账户范围顶层的单账户渠道值移动到 `channels.<channel>.accounts.default` 中
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost`（旧版扩展中继设置）

Doctor 警告还包括针对多账户渠道的账户默认指南：

- 如果配置了两个或更多没有 `channels.<channel>.defaultAccount` 或 `accounts.default` 的 `channels.<channel>.accounts` 条目，Doctor 会警告回退路由可能会选择意外的账户。
- 如果 `channels.<channel>.defaultAccount` 设置为未知的账户 ID，Doctor 会警告并列出已配置的账户 ID。

### 2b) OpenCode 提供商覆盖

如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它将覆盖 `@mariozechner/pi-ai` 中的内置 OpenCode 目录。这可能会强制模型使用错误的 API 或将费用清零。Doctor 会发出警告，以便您可以移除覆盖并恢复按模型 API 路由 + 费用。

### 2c) 浏览器迁移和 Chrome MCP 准备工作

如果您的浏览器配置仍然指向已移除的 Chrome 扩展路径，doctor
会将其规范化为当前主机本地的 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
- `browser.relayBindHost` 已被移除

当您使用 `defaultProfile:
"user"` or a configured `existing-会话` 配置文件时，Doctor 还会审核主机本地的 Chrome MCP 路径：

- 检查默认自动连接配置文件的主机上是否安装了 Google Chrome
- 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
- 提醒您在浏览器检查页面中启用远程调试（例如
  `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging`
  或 `edge://inspect/#remote-debugging`）

Doctor 无法为您启用 Chrome 端的设置。主机本地 Chrome MCP
仍然需要：

- 网关/节点主机上安装基于 Chromium 的浏览器 144+
- 浏览器在本地运行
- 在该浏览器中启用了远程调试
- 在浏览器中批准第一个附加同意提示

此检查**不**适用于 Docker、沙箱、远程浏览器或其他
无头流程。这些流程继续使用原始 CDP。

### 2d) OAuth TLS 先决条件

当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI
授权端点，以验证本地 Node/OpenSSL TLS 堆栈是否可以
验证证书链。如果探测失败并出现证书错误（例如
`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、过期证书或自签名证书），
doctor 会打印特定于平台的修复指南。在带有 Homebrew Node 的 macOS 上，
修复方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使网关健康，探测也会运行。

### 3) 旧版状态迁移（磁盘布局）

Doctor 可以将较旧的磁盘布局迁移到当前结构：

- 会话存储 + 脚本：
  - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 认证状态 (Baileys)：
  - 从旧版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认帐户 id：`default`）

这些迁移是尽力而为且幂等的；当 doctor 将旧版文件夹作为备份保留时，会发出警告。Gateway(网关)/CLI 也会在启动时自动迁移旧版 session + agent 目录，这样历史记录/身份验证/模型就会自动放入 per-agent 路径，而无需手动运行 doctor。WhatsApp 身份验证有意仅通过 `openclaw doctor` 进行迁移。

### 3a) 旧版插件清单迁移

Doctor 会扫描所有已安装的插件清单，查找已弃用的顶级功能键（`speechProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`）。如果发现，它会提议将其移动到 `contracts` 对象中，并就地重写清单文件。此迁移是幂等的；如果 `contracts` 键已具有相同的值，则删除旧键而不会重复数据。

### 3b) 旧版 cron 存储迁移

Doctor 还会检查 cron 作业存储（默认为 `~/.openclaw/cron/jobs.json`，如果被覆盖则为 `cron.store`）中调度程序为了兼容性仍接受的旧作业形状。

当前的 cron 清理包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 顶级 payload 字段（`message`、`model`、`thinking` 等）→ `payload`
- 顶级 delivery 字段（`deliver`、`channel`、`to`、`provider` 等）→ `delivery`
- payload `provider` delivery 别名 → 显式 `delivery.channel`
- 简单的旧版 `notify: true` webhook 回退作业 → 带有 `delivery.to=cron.webhook` 的显式 `delivery.mode="webhook"`

Doctor 只有在不改变行为的情况下才会自动迁移 `notify: true` 作业。如果作业将旧版 notify 回退与现有的非 webhook 交付模式结合使用，doctor 会发出警告并将该作业留给人工审查。

### 3c) 会话锁清理

Doctor 会扫描每个代理会话目录中是否存在过时的写锁文件——即会话异常退出时遗留的文件。对于找到的每个锁文件，它会报告：路径、PID、PID 是否仍存活、锁存在时间以及是否被视为过时（PID 已死亡或超过 30 分钟）。在 `--fix` / `--repair` 模式下，它会自动删除过时的锁文件；否则，它会打印一条说明并指示您使用 `--fix` 重新运行。

### 4) 状态完整性检查（会话持久化、路由和安全）

状态目录是操作的核心。如果它消失了，您将丢失会话、凭据、日志和配置（除非您在其他地方有备份）。

Doctor 检查：

- **State dir missing**：警告灾难性的状态丢失，提示重新创建目录，并提醒您它无法恢复丢失的数据。
- **State dir permissions**：验证可写性；提供修复权限的选项（并在检测到所有者/组不匹配时发出 `chown` 提示）。
- **macOS cloud-synced state dir**：当状态位于 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 下时发出警告，因为同步支持的路径可能导致 I/O 变慢以及锁定/同步冲突。
- **Linux SD or eMMC state dir**：当状态解析为 `mmcblk*` 挂载源时发出警告，因为基于 SD 或 eMMC 的随机 I/O 在会话和凭据写入时可能较慢且磨损更快。
- **Session dirs missing**：`sessions/` 和会话存储目录是持久化历史记录并避免 `ENOENT` 崩溃所必需的。
- **Transcript mismatch**：当最近的会话条目缺少转录文件时发出警告。
- **Main 会话 “1-line JSONL”**：当主转录文件只有一行时标记（历史记录未累积）。
- **Multiple state dirs**：当跨主目录存在多个 `~/.openclaw` 文件夹，或者 `OPENCLAW_STATE_DIR` 指向其他位置时发出警告（历史记录可能在安装之间分裂）。
- **Remote mode reminder**：如果 `gateway.mode=remote`，doctor 会提醒您在远程主机上运行它（状态位于那里）。
- **配置文件权限**：如果 `~/.openclaw/openclaw.json` 可被组/其他用户读取，则会发出警告并提供将其收紧至 `600` 的选项。

### 5) 模型身份验证健康 (OAuth 过期)

Doctor 会检查身份验证存储中的 OAuth 配置文件，在令牌即将过期或已过期时发出警告，并在安全时刷新它们。如果 Anthropic Claude Code 配置文件已过时，它会建议运行 `claude setup-token`（或粘贴设置令牌）。
刷新提示仅在交互式运行 (TTY) 时出现；`--non-interactive` 会跳过刷新尝试。

Doctor 还会报告因以下原因暂时不可用的身份验证配置文件：

- 短暂冷却（速率限制/超时/身份验证失败）
- 较长时期的禁用（计费/信用失败）

### 6) Hooks 模型验证

如果设置了 `hooks.gmail.model`，doctor 会根据目录和允许列表验证模型引用，并在其无法解析或被禁止时发出警告。

### 7) 沙箱镜像修复

启用沙箱隔离时，doctor 会检查 Docker 镜像，如果当前镜像缺失，则提供构建或切换到旧版名称的选项。

### 7b) 捆绑插件运行时依赖项

Doctor 会验证捆绑的插件运行时依赖项（例如 Discord 插件运行时包）是否存在于 OpenClaw 安装根目录中。
如果缺少任何包，doctor 会报告这些包并以 `openclaw doctor --fix` / `openclaw doctor --repair` 模式安装它们。

### 8) Gateway(网关) 服务迁移和清理提示

Doctor 会检测旧的网关服务 (launchd/systemd/schtasks)，并建议删除它们并使用当前网关端口安装 OpenClaw 服务。它还可以扫描额外的类网关服务并打印清理提示。
以配置文件命名的 OpenClaw 网关服务被视为一等公民，不会被标记为“额外”。

### 8b) 启动 Matrix 迁移

当 Matrix 渠道帐户有待处理或可执行的旧状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建迁移前快照，然后运行尽力而为的迁移步骤：旧 Matrix 状态迁移和旧加密状态准备。这两个步骤都不是致命的；错误会被记录，启动会继续。在只读模式（`openclaw doctor` 没有 `--fix`）下，此检查将被完全跳过。

### 9) 安全警告

当提供商在没有允许列表的情况下对私信开放，或者策略以危险方式配置时，Doctor 会发出警告。

### 10) systemd linger (Linux)

如果作为 systemd 用户服务运行，doctor 会确保已启用 linger，以便网关在注销后保持运行。

### 11) 工作区状态（skills、插件和旧目录）

Doctor 打印默认代理的工作区状态摘要：

- **Skills 状态**：统计符合条件、缺少要求和被允许列表阻止的 skills。
- **旧工作区目录**：当 `~/openclaw` 或其他旧工作区目录与当前工作区并存时发出警告。
- **插件状态**：统计已加载/已禁用/出错的插件；列出任何错误的插件 ID；报告包插件功能。
- **插件兼容性警告**：标记与当前运行时存在兼容性问题的插件。
- **插件诊断**：显示插件注册器发出的任何加载时警告或错误。

### 11b) Bootstrap 文件大小

Doctor 会检查工作区 bootstrap 文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超过配置的字符预算。它报告每个文件的原始与注入字符计数、截断百分比、截断原因（`max/file` 或 `max/total`），以及作为总预算一部分的总注入字符。当文件被截断或接近限制时，doctor 会打印调整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

### 11c) Shell 补全

Doctor 会检查当前 shell（zsh、bash、fish 或 PowerShell）是否安装了 Tab 补全功能：

- 如果 shell 配置文件使用缓慢的动态补全模式
  (`source <(openclaw completion ...)`)，doctor 会将其升级为更快的
  缓存文件变体。
- 如果配置文件中配置了补全但缓存文件缺失，
  doctor 会自动重新生成缓存。
- 如果根本没有配置补全，doctor 会提示安装它
  （仅限交互模式；使用 `--non-interactive` 时跳过）。

运行 `openclaw completion --write-state` 以手动重新生成缓存。

### 12) Gateway(网关) 认证检查（本地令牌）

Doctor 会检查本地 gateway 令牌认证就绪状态。

- 如果令牌模式需要令牌但不存在令牌源，doctor 会提议生成一个。
- 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告，并且不会用纯文本覆盖它。
- `openclaw doctor --generate-gateway-token` 仅在未配置令牌 SecretRef 时强制生成。

### 12b) 只读 SecretRef 感知修复

某些修复流程需要检查已配置的凭据，而不会削弱运行时的快速失败行为。

- `openclaw doctor --fix` 现在使用与 status 系列（状态类）命令相同的只读 SecretRef 摘要模型来进行定向配置修复。
- 示例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修复会尝试在可用时使用已配置的机器人凭据。
- 如果 Telegram 机器人令牌通过 SecretRef 配置但在当前命令路径中不可用，doctor 会报告该凭据已配置但不可用，并跳过自动解析，而不是崩溃或错误地将令牌报告为缺失。

### 13) Gateway(网关) 健康检查 + 重启

Doctor 会运行健康检查，并在 gateway 看起来
不健康时提议重启它。

### 13b) 记忆搜索就绪性

Doctor 会检查为默认代理配置的记忆搜索嵌入提供商是否
就绪。具体行为取决于配置的后端和提供商：

- **QMD 后端**：探测 `qmd` 二进制文件是否可用且可启动。
  如果不可用，会打印修复指南，包括 npm 包和手动二进制路径选项。
- **显式本地提供商**：检查本地模型文件或可识别的
  远程/可下载模型 URL。如果缺失，建议切换到远程提供商。
- **显式远程提供商**（`openai`、`voyage` 等）：验证环境或认证存储中是否存在 API 密钥。如果缺失，则打印可执行的修复提示。
- **自动提供商**：首先检查本地模型可用性，然后按自动选择顺序尝试每个远程提供商。

当网关探测结果可用时（检查时网关健康），Doctor 会将其结果与 CLI 可见配置进行交叉引用，并记录任何差异。

使用 `openclaw memory status --deep` 在运行时验证嵌入就绪状态。

### 14) 渠道状态警告

如果网关健康，Doctor 会运行渠道状态探测并报告警告及建议的修复方法。

### 15) 监管者配置审计与修复

Doctor 会检查已安装的监管者配置（launchd/systemd/schtasks）中是否存在缺失或过时的默认值（例如，systemd 的 network-online 依赖项和重启延迟）。当发现不匹配时，它会建议更新并可以将服务文件/任务重写为当前默认值。

注意：

- `openclaw doctor` 会在重写监管者配置之前进行提示。
- `openclaw doctor --yes` 接受默认的修复提示。
- `openclaw doctor --repair` 应用推荐的修复而无需提示。
- `openclaw doctor --repair --force` 覆盖自定义监管者配置。
- 如果令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，Doctor 服务安装/修复会验证 SecretRef，但不会将解析后的明文令牌值持久化到监管者服务环境元数据中。
- 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，Doctor 会使用可操作的指导阻止安装/修复路径。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 并且未设置 `gateway.auth.mode`，Doctor 会阻止安装/修复，直到明确设置模式。
- 对于 Linux 用户 systemd 单元，Doctor 令牌漂移检查现在在比较服务认证元数据时会同时包含 `Environment=` 和 `EnvironmentFile=` 源。
- 您始终可以通过 `openclaw gateway install --force` 强制完全重写。

### 16) Gateway(网关) 运行时与端口诊断

Doctor 会检查服务运行时（PID、上次退出状态），并在服务已安装但未实际运行时发出警告。它还会检查 Gateway(网关) 端口（默认 `18789`）上的端口冲突，并报告可能的原因（Gateway(网关) 已在运行、SSH 隧道）。

### 17) Gateway(网关) 运行时最佳实践

当 Gateway(网关) 服务在 Bun 或受版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）上运行时，Doctor 会发出警告。WhatsApp + Telegram 渠道需要 Node，且受版本管理的路径在升级后可能会失效，因为服务不会加载您的 shell 初始化脚本。如果可用，Doctor 会建议迁移到系统 Node 安装（Homebrew/apt/choco）。

### 18) 配置写入 + 向导元数据

Doctor 会保存任何配置更改，并标记向导元数据以记录 doctor 运行情况。

### 19) 工作区提示（备份 + 记忆系统）

Doctor 会在缺少工作区记忆系统时提出建议，如果工作区尚未受 git 管理，则会打印备份提示。

有关工作区结构和 git 备份（推荐使用私有 GitHub 或 GitLab）的完整指南，请参阅 [/concepts/agent-workspace](/en/concepts/agent-workspace)。
