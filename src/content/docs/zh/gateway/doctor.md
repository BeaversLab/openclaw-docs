---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` 是 OpenClaw 的修复和迁移工具。它可以修复过时的配置/状态，检查健康状况，并提供可执行的修复步骤。

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

    接受默认值而不提示（包括适用时的重启/服务/沙箱修复步骤）。

  </Tab>
  <Tab title="--repair">
    ```bash
    openclaw doctor --repair
    ```

    应用推荐的修复而不提示（在安全的情况下进行修复和重启）。

  </Tab>
  <Tab title="--repair --force">
    ```bash
    openclaw doctor --repair --force
    ```

    同时应用激进的修复（覆盖自定义的 supervisor 配置）。

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    在无提示的情况下运行，仅应用安全的迁移（配置规范化 + 磁盘状态迁移）。跳过需要人工确认的重启/服务/沙箱操作。检测到旧版状态迁移时会自动运行。

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    扫描系统服务以查找额外的网关安装 (launchd/systemd/schtasks)。

  </Tab>
</Tabs>

如果您想在写入之前查看更改，请先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## 功能概要

<AccordionGroup>
  <Accordion title="Health, UI, and updates">
    - 针对 git 安装的可选预更新（仅限交互模式）。
    - UI 协议新鲜度检查（当协议架构较新时重新构建控制 UI）。
    - 健康检查 + 重启提示。
    - Skills 状态摘要（符合资格/缺失/受阻）和插件状态。
  </Accordion>
  <Accordion title="配置和迁移">
    - 针对旧版值的配置规范化。
    - 将对话配置从旧版扁平的 `talk.*` 字段迁移到 `talk.provider` + `talk.providers.<provider>`。
    - 针对旧版 Chrome 扩展配置和 Chrome MCP 准备情况的浏览器迁移检查。
    - OpenCode 提供商覆盖警告 (`models.providers.opencode` / `models.providers.opencode-go`)。
    - Codex OAuth 遮蔽警告 (`models.providers.openai-codex`)。
    - OpenAI Codex OAuth 配置文件的 OAuth TLS 先决条件检查。
    - 旧版磁盘状态迁移（会话/代理目录/WhatsApp 认证）。
    - 旧版插件清单合约键迁移 (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`)。
    - 旧版 cron 存储迁移 (`jobId`, `schedule.cron`, 顶层 delivery/payload 字段, payload `provider`, 简单的 `notify: true` webhook 回退作业)。
    - 旧版代理运行时策略迁移到 `agents.defaults.agentRuntime` 和 `agents.list[].agentRuntime`。
  </Accordion>
  <Accordion title="状态和完整性">
    - 会话锁文件检查和过期锁清理。
    - 针对受影响的 2026.4.24 版本构建所创建的重复提示重写分支的会话记录修复。
    - 状态完整性和权限检查（会话、记录、状态目录）。
    - 本地运行时的配置文件权限检查 (chmod 600)。
    - 模型认证健康检查：检查 OAuth 到期情况，可以刷新即将过期的令牌，并报告认证配置文件的冷却/禁用状态。
    - 额外的工作区目录检测 (`~/openclaw`)。
  </Accordion>
  <Accordion title="Gateway(网关)、服务和监管器">
    - 当启用沙箱隔离时，修复沙箱镜像。
    - 旧版服务迁移和额外的 Gateway(网关) 检测。
    - Matrix 渠道旧版状态迁移（在 `--fix` / `--repair` 模式下）。
    - Gateway(网关) 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
    - 渠道状态警告（从运行中的 Gateway(网关) 探测）。
    - 监管器配置审计（launchd/systemd/schtasks），可选择修复。
    - 针对在安装或更新期间捕获了 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 值的 Gateway(网关) 服务，清理嵌入式代理环境。
    - Gateway(网关) 运行时最佳实践检查（Node 与 Bun、版本管理器路径）。
    - Gateway(网关) 端口冲突诊断（默认 `18789`）。
  </Accordion>
  <Accordion title="Auth、安全和配对">
    - 针对开放私信策略的安全警告。
    - 本地令牌模式的 Gateway(网关) 认证检查（当不存在令牌源时提供令牌生成功能；不会覆盖令牌 SecretRef 配置）。
    - 设备配对故障检测（待处理的首次配对请求、待处理的角色/作用域升级、过时的本地设备令牌缓存漂移以及配对记录认证漂移）。
  </Accordion>
  <Accordion title="工作区和 Shell">
    - 在 Linux 上检查 systemd linger。
    - 工作区引导文件大小检查（针对上下文文件的截断/接近限制警告）。
    - Shell 补全状态检查以及自动安装/升级。
    - 内存搜索嵌入提供商就绪状态检查（本地模型、远程 API 密钥或 QMD 二进制文件）。
    - 源代码安装检查（pnpm 工作区不匹配、UI 资源缺失、tsx 二进制文件缺失）。
    - 写入更新的配置 + 向导元数据。
  </Accordion>
</AccordionGroup>

## Dreams UI 回填和重置

控制 UI Dreams 场景包括用于接地式梦工作流的 **Backfill**（回填）、**Reset**（重置）和 **Clear Grounded**（清除接地状态）操作。这些操作使用 Gateway(网关) doctor 风格的 RPC 方法，但它们 **不** 属于 `openclaw doctor` CLI 修复/迁移的一部分。

它们的作用：

- **回填** 会扫描活动工作区中的历史 `memory/YYYY-MM-DD.md` 文件，运行基础的 REM 日志传递，并将可逆的回填条目写入 `DREAMS.md`。
- **重置** 仅从 `DREAMS.md` 中删除那些标记为回填的日志条目。
- **清除基础** 仅删除来自历史重放且尚未累积实时调用或日常支持的、暂存的基础专用短期条目。

它们自身**不**做的事情：

- 它们不编辑 `MEMORY.md`
- 它们不运行完整的 doctor 迁移
- 除非您显式先运行暂存 CLI 路径，否则它们不会自动将基础候选项暂存到实时短期提升存储中

如果您希望基础历史重放影响正常的深度提升通道，请改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

这会将基础持久候选项暂存到短期梦想存储中，同时保持 `DREAMS.md` 作为审查界面。

## 详细行为和基本原理

<AccordionGroup>
  <Accordion title="0. 可选更新（git 安装）">
    如果这是 git 检出且 doctor 正在交互式运行，它会在运行 doctor 之前提供更新（fetch/rebase/build）。
  </Accordion>
  <Accordion title="1. 配置规范化">
    如果配置包含旧版值形状（例如没有特定渠道覆盖的 `messages.ackReaction`），doctor 会将其规范化为当前架构。

    这包括旧版 Talk 扁平字段。当前的公共 Talk 配置是 `talk.provider` + `talk.providers.<provider>`。Doctor 会将旧的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形状重写为提供商映射。

  </Accordion>
  <Accordion title="2. 传统配置键迁移">
    当配置包含已弃用的键时，其他命令将拒绝运行并要求您运行 `openclaw doctor`。

    Doctor 将会：

    - 解释找到了哪些传统键。
    - 显示它应用的迁移。
    - 使用更新后的架构重写 `~/.openclaw/openclaw.json`。

    当 Gateway(网关) 检测到传统配置格式时，也会在启动时自动运行 doctor 迁移，因此无需人工干预即可修复过时的配置。Cron 任务存储迁移由 `openclaw doctor --fix` 处理。

    当前迁移：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → 顶层 `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - 传统 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
    - `routing.agentToAgent` → `tools.agentToAgent`
    - `routing.transcribeAudio` → `tools.media.audio.models`
    - `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `messages.tts.providers.<provider>`
    - `messages.tts.provider: "edge"` 和 `messages.tts.providers.edge` → `messages.tts.provider: "microsoft"` 和 `messages.tts.providers.microsoft`
    - `channels.discord.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.voice.tts.providers.<provider>`
    - `channels.discord.accounts.<id>.voice.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `channels.discord.accounts.<id>.voice.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`) → `plugins.entries.voice-call.config.tts.providers.<provider>`
    - `plugins.entries.voice-call.config.tts.provider: "edge"` 和 `plugins.entries.voice-call.config.tts.providers.edge` → `provider: "microsoft"` 和 `providers.microsoft`
    - `plugins.entries.voice-call.config.provider: "log"` → `"mock"`
    - `plugins.entries.voice-call.config.twilio.from` → `plugins.entries.voice-call.config.fromNumber`
    - `plugins.entries.voice-call.config.streaming.sttProvider` → `plugins.entries.voice-call.config.streaming.provider`
    - `plugins.entries.voice-call.config.streaming.openaiApiKey|sttModel|silenceDurationMs|vadThreshold` → `plugins.entries.voice-call.config.streaming.providers.openai.*`
    - `bindings[].match.accountID` → `bindings[].match.accountId`
    - 对于具有命名 `accounts` 但仍有残留的单账户顶层渠道值的渠道，将这些账户范围的值移动到为该渠道选择的提升账户中（对于大多数渠道为 `accounts.default`；Matrix 可以保留现有的匹配命名/默认目标）
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 移除 `agents.defaults.llm`；对于慢速提供商/模型超时，请使用 `models.providers.<id>.timeoutSeconds`
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 移除 `browser.relayBindHost` (传统扩展中继设置)
    - 传统 `models.providers.*.api: "openai"` → `"openai-completions"` (网关启动时也会跳过其 `api` 设置为未来或未知枚举值的提供商，而不是直接失败)

    Doctor 警告还包括针对多账户渠道的账户默认指导：

    - 如果配置了两个或更多 `channels.<channel>.accounts` 条目且未设置 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告回退路由可能会选择意外的账户。
    - 如果 `channels.<channel>.defaultAccount` 设置为未知的账户 ID，doctor 会警告并列出已配置的账户 ID。

  </Accordion>
  <Accordion title="2b. OpenCode 提供商覆盖">
    如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它将覆盖来自 `@mariozechner/pi-ai` 的内置 OpenCode 目录。这可能会将模型强制路由到错误的 API 或将成本归零。Doctor 会发出警告，以便您可以移除覆盖并恢复按模型的 API 路由 + 成本。
  </Accordion>
  <Accordion title="2c. 浏览器迁移和 Chrome MCP 就绪状态">
    如果您的浏览器配置仍然指向已删除的 Chrome 扩展路径，doctor 会将其规范化为当前主机本地 Chrome MCP 附加模型：

    - `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
    - `browser.relayBindHost` 被移除

    当您使用 `defaultProfile: "user"` 或配置的 `existing-session` 配置文件时，Doctor 还会审计主机本地的 Chrome MCP 路径：

    - 检查是否在同一主机上安装了 Google Chrome（针对默认自动连接配置文件）
    - 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
    - 提醒您在浏览器检查页面启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 无法为您启用 Chrome 端的设置。主机本地 Chrome MCP 仍然需要：

    - 网关/节点主机上基于 Chromium 的浏览器 144+
    - 浏览器在本地运行
    - 在该浏览器中启用了远程调试
    - 在浏览器中批准第一个附加同意提示

    这里的就绪状态仅关于本地附加先决条件。现有会话保持当前的 Chrome MCP 路由限制；像 `responsebody`、PDF 导出、下载拦截和批处理操作等高级路由仍然需要托管浏览器或原始 CDP 配置文件。

    此检查**不**适用于 Docker、沙箱、远程浏览器或其他无头流程。这些流程继续使用原始 CDP。

  </Accordion>
  <Accordion title="2d. OAuth TLS 先决条件">
    当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点，以验证本地 Node/OpenSSL TLS 堆栈能否验证证书链。如果探测失败并出现证书错误（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、过期证书或自签名证书），doctor 会打印特定于平台的修复指南。在带有 Homebrew Node 的 macOS 上，修复方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使网关正常运行，探测也会运行。
  </Accordion>
  <Accordion title="2e. Codex OAuth 提供商覆盖">
    如果您之前在 `models.providers.openai-codex` 下添加了旧版 OpenAI 传输设置，它们可能会掩盖新版本自动使用的内置 Codex OAuth 提供商路径。当 Doctor 看到这些旧传输设置与 Codex OAuth 并存时会发出警告，以便您可以删除或重写过时的传输覆盖，从而恢复内置的路由/回退行为。仍支持自定义代理和仅标头覆盖，且不会触发此警告。
  </Accordion>
  <Accordion title="2f. Codex 插件路由警告">
    当启用捆绑的 Codex 插件时，doctor 还会检查 `openai-codex/*` 主模型引用是否仍通过默认 PI 运行程序解析。当您希望通过 PI 使用 Codex OAuth/订阅身份验证时，这种组合是有效的，但它很容易与原生 Codex 应用服务器套具混淆。Doctor 会发出警告并指向明确的应用服务器形状：`openai/*` 加上 `agentRuntime.id: "codex"` 或 `OPENCLAW_AGENT_RUNTIME=codex`。

    Doctor 不会自动修复此问题，因为两条路由都是有效的：

    - `openai-codex/*` + PI 意味着“通过正常的 OAuth 运行程序使用 Codex OpenClaw/订阅身份验证。”
    - `openai/*` + `runtime: "codex"` 意味着“通过原生 Codex 应用服务器运行嵌入式回合。”
    - `/codex ...` 意味着“从聊天控制或绑定原生 Codex 对话。”
    - `/acp ...` 或 `runtime: "acp"` 意味着“使用外部 ACP/acpx 适配器。”

    如果出现警告，请选择您想要的路由并手动编辑配置。如果是有意使用 PI Codex OAuth，请保持警告不变。

  </Accordion>
  <Accordion title="3. 遗留状态迁移（磁盘布局）">
    Doctor 可以将较旧的磁盘布局迁移到当前结构：

    - Sessions store + transcripts（会话存储 + 脚本）：
      - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - Agent dir（代理目录）：
      - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp auth state (Baileys)（WhatsApp 认证状态）：
      - 从旧版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认账户 ID：`default`）

    这些迁移是尽力而为且幂等的；当 doctor 将任何遗留文件夹保留作为备份时，会发出警告。Gateway(网关)/CLI 也会在启动时自动迁移遗留的 sessions + agent dir，这样历史记录/认证/模型就会落入 per-agent 路径，而无需手动运行 doctor。WhatsApp 认证有意仅通过 `openclaw doctor` 进行迁移。Talk 提供商/提供商-map 标准化现在通过结构相等性进行比较，因此仅键顺序的差异不再会触发重复的无操作 `doctor --fix` 更改。

  </Accordion>
  <Accordion title="3a. 遗留插件清单迁移">
    Doctor 会扫描所有已安装的插件清单，查找已弃用的顶层功能键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。如果找到，它会提议将其移动到 `contracts` 对象中，并就地重写清单文件。此迁移是幂等的；如果 `contracts` 键已经具有相同的值，则删除旧键而不重复数据。
  </Accordion>
  <Accordion title="3b. Legacy cron store migrations">
    Doctor 还会检查 cron 任务存储（默认为 `~/.openclaw/cron/jobs.json`，如果被覆盖则为 `cron.store`）中是否存在调度器为了兼容性仍然接受的旧任务结构。

    当前的 cron 清理包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 顶层 payload 字段（`message`、`model`、`thinking`、...） → `payload`
    - 顶层 delivery 字段（`deliver`、`channel`、`to`、`provider`、...） → `delivery`
    - payload `provider` delivery 别名 → 显式 `delivery.channel`
    - 简单的旧式 `notify: true` webhook 回退任务 → 带有 `delivery.to=cron.webhook` 的显式 `delivery.mode="webhook"`

    Doctor 只有在不会改变行为的情况下才会自动迁移 `notify: true` 任务。如果一个任务结合了旧式 notify 回退和现有的非 webhook delivery 模式，doctor 会发出警告并将该任务留待人工审查。

  </Accordion>
  <Accordion title="3c. Session lock cleanup">
    Doctor 会扫描每个代理会话目录中是否存在过期的写入锁文件——即会话异常退出时留下的文件。对于发现的每个锁文件，它会报告：路径、PID、PID 是否仍然存活、锁的年龄，以及是否被视为过期（PID 已死或超过 30 分钟）。在 `--fix` / `--repair` 模式下，它会自动删除过期的锁文件；否则它会打印一条说明，并指示你使用 `--fix` 重新运行。
  </Accordion>
  <Accordion title="3d. 会话转录分支修复">
    Doctor 会扫描代理会话 JSONL 文件，查找由 2026.4.24 提示词转录重写 bug 创建的重复分支形状：一个带有 OpenClaw 内部运行时上下文的被废弃的用户轮次，以及一个包含相同可见用户提示词的活动同级分支。在 `--fix` / `--repair` 模式下，doctor 会在原始文件旁边备份每个受影响的文件，并将转录重写为活动分支，从而使网关历史记录和内存读取器不再看到重复的轮次。
  </Accordion>
  <Accordion title="4. 状态完整性检查（会话持久化、路由和安全）">
    状态目录是操作的核心枢纽。如果它消失了，您将丢失会话、凭据、日志和配置（除非您在其他地方有备份）。

    Doctor 会检查：

    - **状态目录缺失**：警告灾难性的状态丢失，提示重新创建目录，并提醒您它无法恢复丢失的数据。
    - **状态目录权限**：验证可写性；提供修复权限的选项（当检测到所有者/组不匹配时发出 `chown` 提示）。
    - **macOS 云同步状态目录**：当状态解析位于 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 下时发出警告，因为同步支持的路径可能导致较慢的 I/O 以及锁定/同步竞争。
    - **Linux SD 或 eMMC 状态目录**：当状态解析为 `mmcblk*` 挂载源时发出警告，因为 SD 或 eMMC 支持的随机 I/O 在会话和凭据写入时可能较慢且磨损更快。
    - **会话目录缺失**：`sessions/` 和会话存储目录是持久化历史记录并避免 `ENOENT` 崩溃所必需的。
    - **副本不匹配**：当最近的会话条目缺少副本文件时发出警告。
    - **主会话“单行 JSONL”**：当主副本仅有一行时标记（历史记录未累积）。
    - **多个状态目录**：当跨主目录存在多个 `~/.openclaw` 文件夹或 `OPENCLAW_STATE_DIR` 指向其他位置时发出警告（历史记录可能在安装之间拆分）。
    - **远程模式提醒**：如果 `gateway.mode=remote`，doctor 会提醒您在远程主机上运行它（状态位于那里）。
    - **配置文件权限**：如果 `~/.openclaw/openclaw.json` 是组/世界可读的，则发出警告并提供将其收紧为 `600` 的选项。

  </Accordion>
  <Accordion title="5. 模型认证健康状态 (OAuth 过期)">
    Doctor 会检查认证存储中的 OAuth 个人资料，在令牌即将过期或已过期时发出警告，并在安全的情况下刷新它们。如果 Anthropic OAuth/令牌个人资料已过时，它会建议使用 Anthropic API 密钥或 Anthropic setup-token 路径。刷新提示仅在交互运行 (TTY) 时出现；`--non-interactive` 会跳过刷新尝试。

    当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant` 或提供商提示您重新登录），doctor 会报告需要重新认证，并打印出确切的 `openclaw models auth login --provider ...` 命令以供执行。

    Doctor 还会报告由于以下原因暂时无法使用的认证个人资料：

    - 短期冷却（速率限制/超时/认证失败）
    - 长期禁用（计费/信用失败）

  </Accordion>
  <Accordion title="6. Hooks 模型验证">
    如果设置了 `hooks.gmail.model`，doctor 会根据目录和允许列表验证模型引用，并在模型无法解析或被禁止时发出警告。
  </Accordion>
  <Accordion title="7. 沙箱镜像修复">
    当启用沙箱隔离时，doctor 会检查 Docker 镜像，如果当前镜像缺失，它会提供构建或切换到旧名称的选项。
  </Accordion>
  <Accordion title="7b. 打包插件运行时依赖项">
    Doctor 仅验证当前配置中处于活动状态或通过其打包清单默认启用的打包插件的运行时依赖项，例如 `plugins.entries.discord.enabled: true`、旧版 `channels.discord.enabled: true` 或默认启用的打包提供商。如果缺少任何依赖项，doctor 会报告这些包并在 `openclaw doctor --fix` / `openclaw doctor --repair` 模式下安装它们。外部插件仍然使用 `openclaw plugins install` / `openclaw plugins update`；doctor 不会为任意插件路径安装依赖项。

    在 doctor 修复期间，打包的运行时依赖项 npm 安装会在 TTY 会话中报告旋转进度，在管道/无头输出中报告周期性行进度。Gateway 和本地 Gateway(网关) 也可以在导入打包插件之前按需修复活动的打包插件运行时依赖项。这些安装的范围限定于插件运行时安装根目录，在禁用脚本的情况下运行，不写入 package lock，并由安装根锁保护，因此并发 CLI 或 CLI 启动不会同时修改同一个 `node_modules` 树。

  </Accordion>
  <Accordion title="8. Gateway(网关) 服务迁移和清理提示">
    Doctor 检测旧版 gateway 服务（launchd/systemd/schtasks）并建议将其删除，并使用当前的 gateway 端口安装 OpenClaw 服务。它还可以扫描额外的类 gateway 服务并打印清理提示。以配置文件命名的 OpenClaw gateway 服务被视为一等公民，不会被标记为“额外”。

    在 Linux 上，如果缺少用户级 gateway 服务但存在系统级 OpenClaw gateway 服务，doctor 不会自动安装第二个用户级服务。请使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 进行检查，然后在系统主管管理 gateway 生命周期时删除重复项或设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. Startup Matrix migration">
    当 Matrix 渠道帐户有待处理或可执行的旧版状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建一个预迁移快照，然后运行尽力而为的迁移步骤：旧版 Matrix 状态迁移和旧版加密状态准备。这两个步骤都不是致命的；错误会被记录，启动继续。在只读模式（`openclaw doctor` 不带 `--fix`）下，完全跳过此检查。
  </Accordion>
  <Accordion title="8c. Device pairing and auth drift">
    Doctor 现在会将设备配对状态作为正常健康检查的一部分进行检查。

    它报告以下内容：

    - 待处理的首次配对请求
    - 已配对设备的待处理角色升级
    - 已配对设备的待处理范围升级
    - 公钥不匹配修复，其中设备 ID 仍然匹配，但设备身份不再匹配已批准的记录
    - 已配对记录缺少已批准角色的有效令牌
    - 配对令牌的范围超出了已批准的配对基线
    - 当前机器的本地缓存设备令牌条目，其日期早于网关端令牌轮换或携带过时的范围元数据

    Doctor 不会自动批准配对请求或自动轮换设备令牌。相反，它会打印确切的后续步骤：

    - 使用 `openclaw devices list` 检查待处理的请求
    - 使用 `openclaw devices approve <requestId>` 批准确切的请求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换一个新令牌
    - 使用 `openclaw devices remove <deviceId>` 删除并重新批准过时的记录

    这解决了常见的“已配对但仍要求配对”的问题：doctor 现在可以区分首次配对、待处理的角色/范围升级以及过时的令牌/设备身份漂移。

  </Accordion>
  <Accordion title="9. Security warnings">
    当提供商在没有允许列表的情况下开放私信，或者策略配置危险时，Doctor 会发出警告。
  </Accordion>
  <Accordion title="10. systemd linger (Linux)">
    如果作为 systemd 用户服务运行，doctor 会确保启用 lingering，以便网关在注销后保持运行。
  </Accordion>
  <Accordion title="11. Workspace status (skills, plugins, and legacy dirs)">
    Doctor 打印默认代理的工作区状态摘要：

    - **Skills 状态**：统计符合条件的、缺少要求的以及被允许列表阻止的 Skills。
    - **Legacy workspace dirs**：当 `~/openclaw` 或其他旧版工作区目录与当前工作区并存时发出警告。
    - **Plugin 状态**：统计已启用/已禁用/错误的插件；列出出现错误的插件 ID；报告捆绑插件的功能。
    - **Plugin 兼容性警告**：标记与当前运行时存在兼容性问题的插件。
    - **Plugin 诊断**：显示插件注册器发出的加载时警告或错误。

  </Accordion>
  <Accordion title="11b. Bootstrap file size">
    Doctor 检查工作区引导文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超过配置的字符预算。它报告每个文件的原始字符数与注入字符数的对比、截断百分比、截断原因（`max/file` 或 `max/total`），以及总注入字符数占总预算的比例。当文件被截断或接近限制时，doctor 会打印调整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。
  </Accordion>
  <Accordion title="11d. Stale 渠道 plugin cleanup">
    当 `openclaw doctor --fix` 删除缺失的渠道插件时，它还会删除引用该插件的孤立的渠道范围配置：`channels.<id>` 条目、命名该渠道的心跳目标以及 `agents.*.models["<channel>/*"]` 覆盖。这可以防止 Gateway(网关) 启动循环，即渠道运行时已消失但配置仍要求网关绑定到它。
  </Accordion>
  <Accordion title="11c. Shell completion">
    Doctor 检查当前 shell（zsh、bash、fish 或 PowerShell）是否安装了 tab 补全功能：

    - 如果 shell 配置文件使用的是缓慢的动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件版本。
    - 如果配置文件中配置了补全但缺少缓存文件，doctor 会自动重新生成缓存。
    - 如果根本没有配置补全，doctor 会提示安装（仅限交互模式；使用 `--non-interactive` 时跳过）。

    运行 `openclaw completion --write-state` 以手动重新生成缓存。

  </Accordion>
  <Accordion title="12. Gateway auth checks (local token)">
    Doctor 检查本地 Gateway 令牌身份验证的准备情况。

    - 如果令牌模式需要令牌但不存在令牌源，doctor 会提议生成一个。
    - 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告，并且不会用纯文本覆盖它。
    - `openclaw doctor --generate-gateway-token` 仅在未配置令牌 SecretRef 时强制生成。

  </Accordion>
  <Accordion title="12b. Read-only SecretRef-aware repairs">
    某些修复流程需要检查已配置的凭据，而不会削弱运行时的快速失败（fail-fast）行为。

    - `openclaw doctor --fix` 现在使用与状态系列命令相同的只读 SecretRef 摘要模型来进行针对性的配置修复。
    - 示例：当可用时，Telegram `allowFrom` / `groupAllowFrom` `@username` 修复尝试使用已配置的机器人凭据。
    - 如果 Telegram 机器人令牌是通过 SecretRef 配置的，但在当前命令路径中不可用，doctor 会报告该凭据“已配置但不可用”，并跳过自动解析，而不是崩溃或将令牌错误报告为丢失。

  </Accordion>
  <Accordion title="13. Gateway health check + restart">
    Doctor 运行健康检查，并在 Gateway 看起来不健康时提议重启它。
  </Accordion>
  <Accordion title="13b. 内存搜索就绪状态">
    Doctor 检查配置的内存搜索嵌入提供商是否已准备好为默认代理提供服务。具体行为取决于配置的后端和提供商：

    - **QMD 后端**：探测 `qmd` 二进制文件是否可用且可启动。如果不可用，会打印修复指南，包括 npm 包和手动二进制文件路径选项。
    - **显式本地提供商**：检查是否存在本地模型文件或可识别的远程/可下载模型 URL。如果缺失，建议切换到远程提供商。
    - **显式远程提供商**（`openai`、`voyage` 等）：验证环境或身份验证存储中是否存在 API 密钥。如果缺失，会打印可操作的修复提示。
    - **自动提供商**：首先检查本地模型可用性，然后按自动选择顺序尝试每个远程提供商。

    当有缓存的网关探测结果可用时（网关在检查时处于健康状态），doctor 会将其结果与 CLI 可见配置进行交叉引用，并记录任何差异。Doctor 不会在默认路径上启动新的嵌入 ping；如果您想要实时的提供商检查，请使用深度内存状态命令。

    使用 `openclaw memory status --deep` 在运行时验证嵌入就绪状态。

  </Accordion>
  <Accordion title="14. 渠道状态警告">
    如果网关运行正常，doctor 会运行渠道状态探测并报告带有建议修复的警告。
  </Accordion>
  <Accordion title="15. Supervisor config audit + repair">
    Doctor 会检查已安装的 supervisor 配置（launchd/systemd/schtasks）中是否缺少默认值或默认值过时（例如 systemd network-online 依赖项和重启延迟）。当发现不匹配时，它会建议更新，并可以将服务文件/任务重写为当前的默认值。

    注意：

    - `openclaw doctor` 会在重写 supervisor 配置之前进行提示。
    - `openclaw doctor --yes` 接受默认的修复提示。
    - `openclaw doctor --repair` 应用推荐的修复而无需提示。
    - `openclaw doctor --repair --force` 会覆盖自定义的 supervisor 配置。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 使 doctor 对 Gateway 服务生命周期保持只读。它仍然报告服务健康状况并运行非服务修复，但跳过服务安装/启动/重启/引导、supervisor 配置重写和旧版服务清理，因为外部 supervisor 拥有该生命周期。
    - 如果令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，则 doctor 服务安装/修复会验证 SecretRef，但不会将解析后的纯文本令牌值持久保存到 supervisor 服务环境元数据中。
    - Doctor 会检测由较旧的 LaunchAgent、systemd 或 Windows 计划任务安装内联嵌入的受管 `.env`/SecretRef 支持的服务环境值，并重写服务元数据，以便这些值从运行时源而不是 supervisor 定义加载。
    - Doctor 会检测在 `gateway.port` 更改后服务命令是否仍固定到旧的 `--port`，并将服务元数据重写为当前端口。
    - 如果令牌认证需要令牌但配置的令牌 SecretRef 未解析，doctor 会通过可操作的指导阻止安装/修复路径。
    - 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，则 doctor 会阻止安装/修复，直到显式设置模式。
    - 对于 Linux user-systemd 单元，doctor 令牌漂移检查现在在比较服务身份验证元数据时包括 `Environment=` 和 `EnvironmentFile=` 源。
    - 当配置最后由较新版本写入时，Doctor 服务修复将拒绝从较旧的 OpenClaw 二进制文件重写、停止或重新启动 Gateway 服务。请参阅 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 您始终可以通过 `openclaw gateway install --force` 强制进行完全重写。

  </Accordion>
  <Accordion title="16. Gateway(网关) 运行时 + 端口诊断">
    Doctor 检查服务运行时（PID、上次退出状态），并在服务已安装但未实际运行时发出警告。它还会检查 gateway(网关) 端口（默认 `18789`）上的端口冲突，并报告可能的原因（gateway(网关) 已在运行、SSH 隧道）。
  </Accordion>
  <Accordion title="17. Gateway(网关) 运行时最佳实践">
    当 gateway(网关) 服务运行在 Bun 或受版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）上时，Doctor 会发出警告。WhatsApp + Telegram 渠道需要 Node，且由于服务不会加载您的 shell 初始化文件，版本管理器路径可能会在升级后失效。如果可用，Doctor 会提议迁移到系统 Node 安装（Homebrew/apt/choco）。
  </Accordion>
  <Accordion title="18. 配置写入 + 向导元数据">
    Doctor 会持久化任何配置更改，并标记向导元数据以记录 doctor 运行情况。
  </Accordion>
  <Accordion title="19. 工作区提示（备份 + 记忆系统）">
    如果缺少工作区记忆系统，Doctor 会建议添加；如果工作区尚未受 git 管理，则会打印备份提示。

    请参阅 [/concepts/agent-workspace](/zh/concepts/agent-workspace) 以获取关于工作区结构和 git 备份（推荐使用私有 GitHub 或 GitLab）的完整指南。

  </Accordion>
</AccordionGroup>

## 相关

- [Gateway(网关) 运维手册](/zh/gateway)
- [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)
