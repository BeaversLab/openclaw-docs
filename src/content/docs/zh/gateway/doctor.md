---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修复和迁移工具。它修复过时的配置/状态，检查健康状况，并提供可执行的修复步骤。

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
- 将配置从传统的扁平 `talk.*` 字段迁移到 `talk.provider` + `talk.providers.<provider>`。
- 浏览器迁移检查旧的 Chrome 扩展配置和 Chrome MCP 就绪状态。
- OpenCode 提供商覆盖警告 (`models.providers.opencode` / `models.providers.opencode-go`)。
- Codex OAuth 遮蔽警告 (`models.providers.openai-codex`)。
- OpenAI Codex OAuth 配置文件的 OAuth TLS 先决条件检查。
- 旧版本地磁盘状态迁移（会话/agent 目录/WhatsApp 认证）。
- 旧版插件清单合约键迁移 (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`)。
- 旧版 cron 存储迁移 (`jobId`, `schedule.cron`, 顶级 delivery/payload 字段, payload `provider`, 简单 `notify: true` webhook 回退作业)。
- 会话锁文件检查和过期锁清理。
- 状态完整性和权限检查（会话、记录副本、状态目录）。
- 本地运行时的配置文件权限检查 (chmod 600)。
- 模型认证健康检查：检查 OAuth 过期情况，可刷新即将过期的令牌，并报告认证配置文件的冷却/禁用状态。
- 额外工作区目录检测 (`~/openclaw`)。
- 启用沙箱隔离时的沙箱镜像修复。
- 旧版服务迁移和额外网关检测。
- Matrix 渠道旧版状态迁移 (在 `--fix` / `--repair` 模式下)。
- Gateway(网关) 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
- 渠道状态警告（从正在运行的 Gateway 探测）。
- 监管程序配置审计 (launchd/systemd/schtasks)，可选择修复。
- Gateway(网关) 运行时最佳实践检查（Node 与 Bun、版本管理器路径）。
- Gateway(网关) 端口冲突诊断 (默认 `18789`)。
- 针对开放私信策略的安全警告。
- 本地令牌模式下的 Gateway(网关) 认证检查（当不存在令牌源时提供令牌生成；不会覆盖令牌 SecretRef 配置）。
- 设备配对故障检测（待处理的首次配对请求、待处理的角色/范围升级、陈旧的本地设备令牌缓存漂移以及配对记录身份验证漂移）。
- Linux 上的 systemd linger 检查。
- 工作区引导文件大小检查（针对上下文文件的截断/接近限制警告）。
- Shell 补全状态检查和自动安装/升级。
- 记忆搜索嵌入提供商就绪状态检查（本地模型、远程 API 密钥或 QMD 二进制文件）。
- 源码安装检查（pnpm 工作区不匹配、缺少 UI 资产、缺少 tsx 二进制文件）。
- 写入更新的配置 + 向导元数据。

## Dreams UI 回填和重置

控制 UI Dreams 场景包含用于落地梦工作流的 **Backfill**（回填）、**Reset**（重置）和 **Clear Grounded**（清除落地）操作。这些操作使用网关 doctor 风格的 RPC 方法，但它们**不是** `openclaw doctor` CLI 修复/迁移的一部分。

它们的作用：

- **Backfill** 扫描活动工作区中的历史 `memory/YYYY-MM-DD.md` 文件，运行落地 REM 日记传递，并将可逆回填条目写入 `DREAMS.md`。
- **Reset** 仅从 `DREAMS.md` 中删除那些标记为回填的日记条目。
- **Clear Grounded** 仅删除来自历史重放且尚未累积实时回忆或日常支持的暂存纯落地短期条目。

它们**不**会自行执行的操作：

- 它们不编辑 `MEMORY.md`
- 它们不运行完整的 doctor 迁移
- 除非您显式地先运行暂存的 CLI 路径，否则它们不会自动将落地候选暂存到实时短期提升存储中

如果您希望落地历史重放影响正常的深度提升通道，请改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

这会将落地持久候选暂存到短期梦存储中，同时将 `DREAMS.md` 保持为审查界面。

## 详细行为和基本原理

### 0) 可选更新（git 安装）

如果是 git 检出且 doctor 正在交互式运行，它会提供在运行 doctor 之前进行更新（获取/变基/构建）。

### 1) 配置标准化

如果配置包含旧版值形状（例如 `messages.ackReaction` 没有特定于渠道的覆盖），doctor 会将其标准化为当前架构。

其中包括旧版 Talk 扁平字段。当前的公共 Talk 配置是
`talk.provider` + `talk.providers.<provider>`。Doctor 会将旧的
`talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` /
`talk.apiKey` 形状重写为提供商映射。

### 2) 旧版配置键迁移

当配置包含已弃用的键时，其他命令将拒绝运行并要求
您运行 `openclaw doctor`。

Doctor 将会：

- 解释找到了哪些旧版键。
- 显示其应用的迁移。
- 使用更新后的架构重写 `~/.openclaw/openclaw.json`。

当 Gateway(网关) 检测到旧版配置格式时，也会在启动时自动运行 doctor 迁移，因此无需手动干预即可修复过时的配置。
Cron 任务存储迁移由 `openclaw doctor --fix` 处理。

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
- 对于具有命名 `accounts` 但仍残留单账户顶级渠道值的渠道，请将这些账户范围的值移动到为该渠道选择的提升账户中（对于大多数渠道为 `accounts.default`；Matrix 可以保留现有的匹配命名/默认目标）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost`（旧的扩展中继设置）

Doctor 警告还包括针对多账户渠道的账户默认指导：

- 如果配置了两个或更多 `channels.<channel>.accounts` 条目但未配置 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 会警告回退路由可能会选择意外的账户。
- 如果 `channels.<channel>.defaultAccount` 被设置为未知的账户 ID，Doctor 会发出警告并列出已配置的账户 ID。

### 2b) OpenCode 提供商覆盖

如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它将覆盖 `@mariozechner/pi-ai` 的内置 OpenCode 目录。这可能会强制模型使用错误的 API 或将成本清零。Doctor 会发出警告，以便您可以移除覆盖并恢复按 API 的 API 路由和成本。

### 2c) 浏览器迁移和 Chrome MCP 准备情况

如果您的浏览器配置仍指向已移除的 Chrome 扩展路径，Doctor 会将其规范化为当前主机本地的 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
- `browser.relayBindHost` 被移除

当您使用 `defaultProfile:
"user"` or a configured `existing-会话` 配置文件时，Doctor 还会审计主机本地的 Chrome MCP 路径：

- 检查默认自动连接配置文件的主机上是否安装了 Google Chrome
- 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
- 提醒您在浏览器检查页面启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

Doctor 无法为您启用 Chrome 端的设置。主机本地的 Chrome MCP 仍然需要：

- 网关/节点主机上基于 Chromium 的浏览器 144 或更高版本
- 浏览器在本地运行
- 在该浏览器中启用了远程调试
- 在浏览器中批准第一次附加同意提示

此处的准备情况仅涉及本地附加的先决条件。Existing-会话 保持当前的 Chrome MCP 路由限制；高级路由（如 `responsebody`、PDF 导出、下载拦截和批量操作）仍然需要托管浏览器或原始 CDP 配置文件。

此检查**不**适用于 Docker、沙盒、远程浏览器或其他无头流程。这些继续使用原始 CDP。

### 2d) OAuth TLS 先决条件

当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点以验证本地 Node/OpenSSL TLS 堆栈能否验证证书链。如果探测因证书错误（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、过期证书或自签名证书）而失败，doctor 会打印特定于平台的修复指南。在使用 Homebrew Node 的 macOS 上，修复方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使 Gateway 处于健康状态，探测也会运行。

### 2c) Codex OAuth 提供商覆盖

如果您之前在 `models.providers.openai-codex` 下添加了旧的 OpenAI 传输设置，它们可能会覆盖新版本自动使用的内置 Codex OAuth 提供商路径。当 doctor 发现这些旧的传输设置与 Codex OAuth 同时存在时会发出警告，以便您可以删除或重写过时的传输覆盖，并恢复内置的路由/回退行为。仍然支持自定义代理和仅限标头的覆盖，并且不会触发此警告。

### 3) 旧的状态迁移（磁盘布局）

Doctor 可以将较旧的磁盘布局迁移到当前结构：

- 会话存储 + 脚本：
  - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 认证状态 (Baileys)：
  - 从旧的 `~/.openclaw/credentials/*.json` （`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...` （默认帐户 ID： `default`）

这些迁移是尽力而为且幂等的；当 doctor 将任何旧文件夹作为备份保留时，会发出警告。Gateway/CLI 也会在启动时自动迁移旧的会话 + agent 目录，这样历史记录/认证/模型就会落入 per-agent 路径，而无需手动运行 doctor。WhatsApp 认证有意仅通过 `openclaw doctor` 进行迁移。Talk 提供商/提供商-map 标准化现在通过结构相等性进行比较，因此仅键顺序的差异不再触发重复的无操作 `doctor --fix` 更改。

### 3a) 旧插件清单迁移

Doctor 会扫描所有已安装的插件清单，查找已弃用的顶级功能键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。当找到这些键时，它会提议将其移动到 `contracts` 对象中，并就地重写清单文件。此迁移是幂等的；如果 `contracts` 键已具有相同的值，则删除旧键而不复制数据。

### 3b) 旧版 cron 存储迁移

Doctor 还会检查 cron 作业存储（默认为 `~/.openclaw/cron/jobs.json`，或在被覆盖时为 `cron.store`）中调度程序为了兼容性仍然接受的旧作业形状。

当前的 cron 清理包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 顶级 payload 字段（`message`、`model`、`thinking`，...） → `payload`
- 顶级 delivery 字段（`deliver`、`channel`、`to`、`provider`，...） → `delivery`
- payload `provider` delivery 别名 → 显式 `delivery.channel`
- 简单的旧版 `notify: true` webhook 后备作业 → 带有 `delivery.to=cron.webhook` 的显式 `delivery.mode="webhook"`

Doctor 仅当可以在不改变行为的情况下自动迁移 `notify: true` 作业时才会这样做。如果作业将旧版 notify 后备与现有的非 webhook 传递模式结合在一起，doctor 会发出警告并将该作业留待手动审查。

### 3c) 会话锁清理

Doctor 会扫描每个代理会话目录中是否存在陈旧的写锁文件——即会话异常退出时遗留的文件。对于找到的每个锁文件，它会报告：路径、PID、PID 是否仍然存活、锁存在的时间，以及是否被视为陈旧（PID 已死亡或超过 30 分钟）。在 `--fix` / `--repair` 模式下，它会自动删除陈旧的锁文件；否则，它会打印一条说明并指示您使用 `--fix` 重新运行。

### 4) 状态完整性检查（会话持久化、路由和安全）

状态目录是运行的核心中枢。如果它消失了，您将丢失会话、凭据、日志和配置（除非您在其他地方有备份）。

Doctor 检查以下内容：

- **状态目录丢失**：警告灾难性的状态丢失，提示重新创建该目录，并提醒您它无法恢复丢失的数据。
- **状态目录权限**：验证可写性；提供修复权限的选项（并在检测到所有者/组不匹配时发出 `chown` 提示）。
- **macOS 云同步状态目录**：当状态解析到 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 下时发出警告，因为同步支持的路径可能会导致 I/O 变慢以及锁/同步争用。
- **Linux SD 或 eMMC 状态目录**：当状态解析到 `mmcblk*` 挂载源时发出警告，因为基于 SD 或 eMMC 的随机 I/O 可能会更慢，并且在会话和凭据写入下磨损更快。
- **会话目录丢失**：`sessions/` 和会话存储目录是持久化历史记录并避免 `ENOENT` 崩溃所必需的。
- **脚本不匹配**：当最近的会话条目缺少脚本文件时发出警告。
- **主会话“1行 JSONL”**：当主脚本只有一行时进行标记（历史记录未累积）。
- **多个状态目录**：当在主目录中存在多个 `~/.openclaw` 文件夹，或者 `OPENCLAW_STATE_DIR` 指向其他位置时发出警告（历史记录可能会在安装之间分裂）。
- **远程模式提醒**：如果 `gateway.mode=remote`，doctor 会提醒您在远程主机上运行它（状态存在于那里）。
- **配置文件权限**：如果 `~/.openclaw/openclaw.json` 可被组/其他用户读取，则发出警告并提供将其收紧为 `600` 的选项。

### 5) 模型身份验证健康状态 (OAuth 过期)

Doctor 会检查身份验证存储中的 OAuth 个人资料，在令牌即将过期/已过期时发出警告，并在安全时刷新它们。如果 Anthropic OAuth/令牌个人资料已过时，它会建议使用 Anthropic API 密钥或 Anthropic setup-token 路径。
刷新提示仅在以交互方式 (TTY) 运行时出现；`--non-interactive` 会跳过刷新尝试。

当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant` 或提供商告诉您重新登录），doctor 会报告需要重新进行身份验证，并打印确切的 `openclaw models auth login --provider ...` 命令以运行。

Doctor 还会报告因以下原因暂时无法使用的身份验证个人资料：

- 短暂冷却（速率限制/超时/身份验证失败）
- 较长时间的禁用（计费/信用失败）

### 6) Hooks 模型验证

如果设置了 `hooks.gmail.model`，doctor 会对照目录和允许列表验证模型引用，并在其无法解析或被禁止时发出警告。

### 7) 沙箱镜像修复

启用沙箱隔离后，doctor 会检查 Docker 镜像，如果当前镜像缺失，则会提供构建或切换到旧名称的选项。

### 7b) 捆绑插件运行时依赖项

Doctor 仅对当前配置中处于活动状态或由其捆绑清单默认启用的捆绑插件验证运行时依赖项，例如 `plugins.entries.discord.enabled: true`、旧版 `channels.discord.enabled: true` 或默认启用的捆绑提供商。如果有任何缺失，doctor 会报告这些软件包，并以 `openclaw doctor --fix` / `openclaw doctor --repair` 模式安装它们。外部插件仍使用 `openclaw plugins install` / `openclaw plugins update`；doctor 不会为任意插件路径安装依赖项。

### 8) Gateway(网关) 服务迁移和清理提示

Doctor 会检测旧的网关服务（launchd/systemd/schtasks）并提供删除它们并使用当前网关端口安装 OpenClaw 服务的选项。它还可以扫描其他类似网关的服务并打印清理提示。以 Profile 命名的 OpenClaw 网关服务被视为首选服务，不会被标记为“额外”服务。

### 8b) 启动时 Matrix 迁移

当 Matrix 渠道帐户有待处理或可操作的旧状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建预迁移快照，然后运行尽力而为的迁移步骤：旧 Matrix 状态迁移和旧加密状态准备。这两个步骤都不是致命的；错误会被记录，启动将继续。在只读模式下（使用 `openclaw doctor` 但不使用 `--fix`），此检查将被完全跳过。

### 8c) 设备配对和身份验证偏差

Doctor 现在会将设备配对状态作为正常健康检查的一部分进行检查。

它报告的内容：

- 待处理的首次配对请求
- 已配对设备的待处理角色升级
- 已配对设备的待处理范围升级
- 公钥不匹配修复，即设备 ID 仍然匹配，但设备身份不再匹配批准的记录
- 已配对记录缺少已批准角色的活动令牌
- 已配对令牌的范围偏离了批准的配对基线
- 当前计算机的本地缓存设备令牌条目早于网关端令牌轮换或包含过时的范围元数据

Doctor 不会自动批准配对请求或自动轮换设备令牌。相反，它会打印确切的后续步骤：

- 使用 `openclaw devices list` 检查待处理的请求
- 使用 `openclaw devices approve <requestId>` 批准确切的请求
- 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换新令牌
- 使用 `openclaw devices remove <deviceId>` 删除并重新批准过时的记录

这解决了常见的“已配对但仍提示需要配对”的问题：doctor 现在可以区分首次配对、待处理的角色/范围升级以及过时的令牌/设备身份偏差。

### 9) 安全警告

当提供商在没有允许列表的情况下对私信开放，或者以危险的方式配置策略时，Doctor 会发出警告。

### 10) systemd linger (Linux)

如果作为 systemd 用户服务运行，doctor 会确保启用 lingering，以便网关在注销后保持运行。

### 11) 工作区状态（Skills、插件和旧版目录）

Doctor 打印默认代理的工作区状态摘要：

- **Skills 状态**：统计符合条件的、缺少要求的以及被允许列表阻止的 Skills。
- **旧版工作区目录**：当 `~/openclaw` 或其他旧版工作区目录与当前工作区并存时发出警告。
- **插件状态**：统计已加载/已禁用/错误的插件；列出任何错误的插件 ID；报告捆绑插件的功能。
- **插件兼容性警告**：标记与当前运行时存在兼容性问题的插件。
- **插件诊断**：显示插件注册器发出的任何加载时警告或错误。

### 11b) Bootstrap 文件大小

Doctor 检查工作区 bootstrap 文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超过配置的字符预算。它会报告每个文件的原始字符数与注入字符数的对比、截断百分比、截断原因（`max/file` 或 `max/total`），以及总注入字符数占总预算的比例。当文件被截断或接近限制时，doctor 会打印有关调整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。

### 11c) Shell 补全

Doctor 检查是否为当前 shell（zsh、bash、fish 或 PowerShell）安装了 Tab 补全功能：

- 如果 shell 配置文件使用的是缓慢的动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件变体。
- 如果在配置文件中配置了补全功能但缺少缓存文件，doctor 会自动重新生成缓存。
- 如果根本没有配置补全功能，doctor 会提示安装它（仅在交互模式下；使用 `--non-interactive` 时跳过）。

运行 `openclaw completion --write-state` 以手动重新生成缓存。

### 12) Gateway(网关) 身份验证检查（本地令牌）

Doctor 检查本地网关令牌身份验证的准备情况。

- 如果令牌模式需要令牌但不存在令牌源，doctor 会提议生成一个。
- 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告，且不会用明文覆盖它。
- `openclaw doctor --generate-gateway-token` 仅在未配置令牌 SecretRef 时强制生成。

### 12b) 支持只读 SecretRef 的修复

某些修复流程需要检查已配置的凭据，而不会削弱运行时的快速失败（fail-fast）行为。

- `openclaw doctor --fix` 现在对针对性的配置修复使用与 status 系列命令相同的只读 SecretRef 摘要模型。
- 示例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修复尝试在可用时使用已配置的机器人凭据。
- 如果 Telegram 机器人令牌通过 SecretRef 配置但在当前命令路径中不可用，doctor 会报告该凭据“已配置但不可用”，并跳过自动解析，而不是崩溃或错误地将令牌报告为缺失。

### 13) Gateway(网关) 健康检查 + 重启

Doctor 会运行健康检查，并在 Gateway(网关) 看起来不健康时提供重启选项。

### 13b) 内存搜索就绪状态

Doctor 检查为默认代理配置的内存搜索嵌入提供商是否就绪。具体行为取决于已配置的后端和提供商：

- **QMD 后端**：探测 `qmd` 二进制文件是否可用且可启动。
  如果不可用，会打印修复指导，包括 npm 包和手动二进制路径选项。
- **显式本地提供商**：检查是否存在本地模型文件或可识别的
  远程/可下载模型 URL。如果缺失，建议切换到远程提供商。
- **显式远程提供商**（`openai`、`voyage` 等）：验证 API 密钥
  是否存在于环境或身份验证存储中。如果缺失，打印可执行的修复提示。
- **自动提供商**：首先检查本地模型可用性，然后按自动选择顺序尝试每个远程
  提供商。

当 Gateway(网关) 探测结果可用时（在检查时 Gateway(网关) 是健康的），doctor 会将其结果与 CLI 可见的配置进行交叉比对，并记录任何差异。

使用 `openclaw memory status --deep` 在运行时验证嵌入就绪状态。

### 14) 渠道状态警告

如果 Gateway(网关) 状态良好，doctor 会运行渠道状态探查并报告警告及建议修复方法。

### 15) Supervisor 配置审计与修复

Doctor 会检查已安装的 supervisor 配置（launchd/systemd/schtasks），查找缺失或过时的默认值（例如，systemd 的 network-online 依赖和重启延迟）。当发现不匹配时，它会建议更新，并可以将服务文件/任务重写为当前的默认值。

说明：

- `openclaw doctor` 会在重写 supervisor 配置之前提示。
- `openclaw doctor --yes` 接受默认的修复提示。
- `openclaw doctor --repair` 应用建议的修复，无需提示。
- `openclaw doctor --repair --force` 覆盖自定义的 supervisor 配置。
- 如果 token 身份验证需要 token 且 `gateway.auth.token` 由 SecretRef 管理，doctor 服务安装/修复会验证 SecretRef，但不会将解析后的明文 token 值持久化到 supervisor 服务环境元数据中。
- 如果 token 身份验证需要 token 且配置的 token SecretRef 未解析，doctor 会阻止安装/修复路径并提供可行的指导。
- 如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置且 `gateway.auth.mode` 未设置，doctor 会阻止安装/修复，直到明确设置模式。
- 对于 Linux user-systemd 单元，doctor 的 token 偏差检查现在在比较服务身份验证元数据时会同时包含 `Environment=` 和 `EnvironmentFile=` 来源。
- 您始终可以通过 `openclaw gateway install --force` 强制进行完全重写。

### 16) Gateway(网关) 运行时 + 端口诊断

Doctor 会检查服务运行时（PID，上次退出状态），并在服务已安装但未实际运行时发出警告。它还会检查 Gateway(网关) 端口（默认为 `18789`）上的端口冲突，并报告可能的原因（Gateway(网关) 已在运行、SSH 隧道）。

### 17) Gateway(网关) 运行时最佳实践

当网关服务运行在 Bun 或由版本管理器管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）上时，Doctor 会发出警告。Bun + WhatsApp 渠道需要 Node，而且由于服务不会加载您的 shell 初始化文件，版本管理器路径在升级后可能会失效。如果可用（Homebrew/apt/choco），Doctor 会提议迁移到系统 Node 安装。

### 18) Config write + wizard metadata

Doctor 会持久保存所有配置更改，并标记向导元数据以记录此次 doctor 运行。

### 19) Workspace tips (backup + memory system)

如果缺少工作区记忆系统，Doctor 会建议设置一个；如果工作区尚未纳入 git 管理，它还会打印备份提示。

有关工作区结构和 git 备份的完整指南（推荐使用私有的 GitHub 或 GitLab），请参阅 [/concepts/agent-workspace](/zh/concepts/agent-workspace)。
