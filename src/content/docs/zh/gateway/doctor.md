---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor`OpenClaw 是用于 OpenClaw 的修复和迁移工具。它可以修复过时的配置/状态，检查健康状况，并提供可执行的修复步骤。

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
    - 可选的 git 安装预更新（仅限交互模式）。
    - UI 协议新鲜度检查（当协议架构较新时重新构建 Control UI）。
    - 健康检查 + 重启提示。
    - Skills 状态摘要（符合资格/缺失/已阻止）和插件状态。

  </Accordion>
  <Accordion title="配置和迁移">
    - 遗留值的配置规范化。
    - 将对话配置从遗留的扁平 `talk.*` 字段迁移到 `talk.provider` + `talk.providers.<provider>`。
    - 浏览器迁移检查，针对遗留的 Chrome 扩展配置和 Chrome MCP 就绪状态。
    - OpenCode 提供商覆盖警告 (`models.providers.opencode` / `models.providers.opencode-go`OAuth)。
    - Codex OAuth 遮蔽警告 (`models.providers.openai-codex`OAuthOpenAIOAuth)。
    - 针对 OpenAI Codex OAuth 配置文件的 OAuth TLS 先决条件检查。
    - 当 `plugins.allow`WhatsApp 具有限制性但工具策略仍要求通配符或插件拥有的工具时的插件/工具允许列表警告。
    - 遗留磁盘状态迁移（会话/代理目录/WhatsApp 认证）。
    - 遗留插件清单合约密钥迁移 (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`)。
    - 遗留 cron 存储迁移 (`jobId`, `schedule.cron`, 顶级 delivery/payload 字段, payload `provider`, 简单 `notify: true` webhook 回退作业)。
    - 遗留全代理运行时策略清理；提供商/模型运行时策略是活动路由选择器。
    - 启用插件时的陈旧插件配置清理；当 `plugins.enabled=false` 时，陈旧的插件引用被视为惰性包含配置并被保留。

  </Accordion>
  <Accordion title="状态和完整性">
    - 检查会话锁定文件并清理过期的锁。
    - 修复受影响的 2026.4.24 版本创建的重复 prompt-rewrite 分支的会话记录。
    - 卡住的子代理重启恢复墓碑检测，支持 `--fix`OAuth 清理过时的中止恢复标志，以免启动时继续将子进程视为重启中止。
    - 状态完整性和权限检查（sessions, transcripts, state dir）。
    - 本地运行时配置文件权限检查 (chmod 600)。
    - 模型认证健康检查：检查 OAuth 过期情况，可刷新即将过期的令牌，并报告认证配置文件的冷却/禁用状态。
    - 额外的工作区目录检测 (`~/openclaw`)。

  </Accordion>
  <Accordion title="Gateway(网关)、服务和监管器"Matrix>
    - 当启用沙箱隔离时修复沙箱镜像。
    - 旧版服务迁移和额外的 Gateway 检测。
    - Matrix 渠道旧版状态迁移（在 `--fix` / `--repair`Gateway(网关) 模式下）。
    - Gateway 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
    - 渠道状态警告（从运行中的 Gateway 探测）。
    - 特定于渠道的权限检查位于 `openclaw channels capabilities`Discord 下；例如，Discord 语音频道权限会通过 `openclaw channels capabilities --channel discord --target channel:<channel-id>`WhatsAppGateway(网关)TUI 进行审计。
    - 当本地 TUI 客户端仍在运行时，针对 Gateway 事件循环健康状况下降的 WhatsApp 响应能力检查；`--fix` 仅停止已验证的本地 TUI 客户端。
    - 针对主要模型、回退、心跳/子代理/压缩覆盖、钩子、渠道模型覆盖和会话路由锚点中旧版 `openai-codex/*` 模型引用的 Codex 路由修复；`--fix` 会将其重写为 `openai/*`OpenAI，移除过时的会话/整个代理运行时锚点，并在默认 Codex 驱动器上保留规范的 OpenAI 代理引用。
    - 监管器配置审计（launchd/systemd/schtasks），支持可选修复。
    - 针对在安装或更新期间捕获了 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`Gateway(网关) 值的 Gateway 服务的嵌入式代理环境清理。
    - Gateway 运行时最佳实践检查（Node 与 BunGateway(网关)，版本管理器路径）。
    - Gateway 端口冲突诊断（默认 `18789`）。

  </Accordion>
  <Accordion title="Auth, security, and pairing"Gateway(网关)>
    - 针对开放私信策略的安全警告。
    - 本地令牌模式的网关身份验证检查（当不存在令牌源时提供令牌生成功能；不会覆盖令牌 SecretRef 配置）。
    - 设备配对故障检测（待处理的首次配对请求、待处理的角色/范围升级、过时的本地设备令牌缓存漂移以及配对记录身份验证漂移）。

  </Accordion>
  <Accordion title="Workspace and shell"Linux>
    - Linux 上的 systemd linger 检查。
    - 工作区引导文件大小检查（针对上下文文件的截断/接近限制警告）。
    - 默认代理的 Skills 准备情况检查；报告缺少二进制文件、环境变量、配置或操作系统要求的允许使用的 Skills，并且 `--fix` 可以在 `skills.entries`API 中禁用不可用的 Skills。
    - Shell 补全状态检查和自动安装/升级。
    - 记忆搜索嵌入提供商准备情况检查（本地模型、远程 API 密钥或 QMD 二进制文件）。
    - 源码安装检查（pnpm 工作区不匹配、缺少 UI 资产、缺少 tsx 二进制文件）。
    - 写入更新的配置 + 向导元数据。

  </Accordion>
</AccordionGroup>

## Dreams UI 回填和重置

控制 UI Dreams 场景包括用于基础梦境工作流的 **Backfill**（回填）、**Reset**（重置）和 **Clear Grounded**（清除基础）操作。这些操作使用网关医生风格的 RPC 方法，但它们**不是** RPC`openclaw doctor`CLI CLI 修复/迁移的一部分。

它们的作用：

- **Backfill** 会扫描活动工作区中的历史 `memory/YYYY-MM-DD.md` 文件，运行基础 REM 日记传递，并将可逆的回填条目写入 `DREAMS.md`。
- **Reset** 仅从 `DREAMS.md` 中删除那些标记为回填的日记条目。
- **清除基础** 仅删除来自历史重放且尚未累积实时调用或日常支持的、暂存的基础专用短期条目。

它们自身**不**做的事情：

- 它们不会编辑 `MEMORY.md`
- 它们不运行完整的 doctor 迁移
- 除非您显式先运行暂存 CLI 路径，否则它们不会自动将基础候选项暂存到实时短期提升存储中

如果您希望基础历史重放影响正常的深度提升通道，请改用 CLI 流程：

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

这将把基础持久化候选者暂存到短期梦境存储中，同时保持 `DREAMS.md` 作为审查表面。

## 详细行为和基本原理

<AccordionGroup>
  <Accordion title="0. 可选更新（git 安装）">
    如果这是 git 检出且 doctor 正在交互式运行，它会在运行 doctor 之前提供更新（fetch/rebase/build）。
  </Accordion>
  <Accordion title="1. 配置规范化">
    如果配置包含旧版值形状（例如没有渠道特定覆盖的 `messages.ackReaction`），doctor 会将其规范化为当前架构。

    这包括旧的 Talk 扁平字段。当前的公共 Talk 语音配置是 `talk.provider` + `talk.providers.<provider>`，实时语音配置是 `talk.realtime.*`。Doctor 将旧的 `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` 形状重写为提供商映射，并将旧的顶级实时选择器（`talk.mode`、`talk.transport`、`talk.brain`、`talk.model`、`talk.voice`）重写为 `talk.realtime`。

    当 `plugins.allow` 非空且工具策略使用通配符或插件拥有的工具条目时，Doctor 还会发出警告。`tools.allow: ["*"]` 仅匹配实际加载的插件中的工具；它不会绕过独占插件允许列表。Doctor 会为迁移的旧版允许列表配置写入 `plugins.bundledDiscovery: "compat"`，以保留现有的捆绑提供商行为，然后指向更严格的 `"allowlist"` 设置。

  </Accordion>
  <Accordion title="2. 遗留配置键迁移">
    当配置包含已弃用的键时，其他命令将拒绝运行并要求您运行 `openclaw doctor`。

    Doctor 将会：

    - 解释找到了哪些遗留键。
    - 显示它应用的迁移。
    - 使用更新后的架构重写 `~/.openclaw/openclaw.json`。

    Gateway(网关) 启动时会拒绝遗留的配置格式并要求您运行 `openclaw doctor --fix`；它不会在启动时重写 `openclaw.json`。Cron 作业存储迁移也由 `openclaw doctor --fix` 处理。

    当前的迁移：

    - `routing.allowFrom` → `channels.whatsapp.allowFrom`
    - `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
    - `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
    - `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
    - `channels.telegram.requireMention` → `channels.telegram.groups."*".requireMention`
    - 缺少可见回复策略的已配置渠道配置 → `messages.groupChat.visibleReplies: "message_tool"`
    - `routing.queue` → `messages.queue`
    - `routing.bindings` → 顶层 `bindings`
    - `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
    - 遗留 `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey` → `talk.provider` + `talk.providers.<provider>`
    - 遗留的顶层实时 Talk 选择器 (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) + `talk.provider`/`talk.providers` → `talk.realtime`
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
    - 对于具有命名 `accounts` 但残留单账户顶层渠道值的渠道，将这些账户范围值移动到为该渠道选择的提升账户中（大多数渠道为 `accounts.default`；Matrix 可以保留现有的匹配命名/默认目标）
    - `identity` → `agents.list[].identity`
    - `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
    - `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks` → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
    - 移除 `agents.defaults.llm`；对于慢速提供商/模型超时，请使用 `models.providers.<id>.timeoutSeconds`
    - `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
    - `browser.profiles.*.driver: "extension"` → `"existing-session"`
    - 移除 `browser.relayBindHost` (遗留扩展中继设置)
    - 遗留 `models.providers.*.api: "openai"` → `"openai-completions"` (网关启动时也会跳过 `api` 设置为未来或未知枚举值的提供商，而不是直接失败)
    - 移除 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex 应用服务器始终将 Codex 原生工作区工具保持为原生

    Doctor 警告还包括针对多账户渠道的账户默认指导：

    - 如果配置了两个或更多 `channels.<channel>.accounts` 条目但没有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告回退路由可能会选择意外的账户。
    - 如果 `channels.<channel>.defaultAccount` 设置为未知的账户 ID，doctor 会发出警告并列出已配置的账户 ID。

  </Accordion>
  <Accordion title="2b. OpenCode 提供商覆盖">
    如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它将覆盖 `@mariozechner/pi-ai`APIAPI 中的内置 OpenCode 目录。这可能会将模型强制转移到错误的 API 或将成本归零。Doctor 会发出警告，以便您移除覆盖并恢复按模型的 API 路由和成本。
  </Accordion>
  <Accordion title="2c. 浏览器迁移和 Chrome MCP 就绪性">
    如果您的浏览器配置仍然指向已删除的 Chrome 扩展路径，doctor 会将其规范化为当前的主机本地 Chrome MCP 附加模型：

    - `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
    - `browser.relayBindHost` 被移除

    当您使用 `defaultProfile: "user"` 或配置的 `existing-session` 配置文件时，Doctor 还会审核主机本地 Chrome MCP 路径：

    - 检查是否在同一主机上安装了 Google Chrome（适用于默认自动连接配置文件）
    - 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
    - 提醒您在浏览器检查页面中启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 无法为您启用 Chrome 端的设置。主机本地 Chrome MCP 仍然需要：

    - 网关/节点主机上基于 Chromium 的浏览器 144+
    - 浏览器在本地运行
    - 在该浏览器中启用了远程调试
    - 在浏览器中批准第一个附加同意提示

    此处的就绪性仅涉及本地附加的先决条件。现有会话保持当前的 Chrome MCP 路由限制；像 `responsebody`Docker、PDF 导出、下载拦截和批量操作这样的高级路由仍然需要托管浏览器或原始 CDP 配置文件。

    此检查**不**适用于 Docker、沙箱、远程浏览器或其他无头流程。这些流程继续使用原始 CDP。

  </Accordion>
  <Accordion title="OAuth2d. OAuth TLS 先决条件"OpenAIOAuthOpenAI>
    当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点，以验证本地 Node/OpenSSL TLS 栈能否验证证书链。如果探测因证书错误（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`macOS、过期证书或自签名证书）而失败，doctor 会打印特定于平台的修复指南。在带有 Homebrew Node 的 macOS 上，修复方法通常是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使网关运行正常，探测也会运行。
  </Accordion>
  <Accordion title="OAuth2e. Codex OAuth 提供商覆盖"OpenAI>
    如果您之前在 `models.providers.openai-codex`OAuthOAuth 下添加了旧版 OpenAI 传输设置，它们可能会掩盖新版本自动使用的内置 Codex OAuth 提供商路径。当 doctor 发现这些旧的传输设置与 Codex OAuth 同时存在时会发出警告，以便您可以移除或重写过时的传输覆盖，并恢复内置的路由/回退行为。仍然支持自定义代理和仅标头覆盖，并且不会触发此警告。
  </Accordion>
  <Accordion title="2f. Codex 路由修复">
    Doctor 会检查旧的 `openai-codex/*` 模型引用。原生 Codex harness 路由使用规范的 `openai/*`OpenAIOpenClawOpenAI 模型引用；OpenAI 代理轮次会通过 Codex 应用服务器 harness，而不是 OpenClaw PI OpenAI 路径。

    在 `--fix` / `--repair` 模式下，doctor 会重写受影响的默认代理和每个代理的引用，包括主要模型、回退、心跳/子代理/压缩覆盖、钩子、渠道模型覆盖以及过时的持久化会话路由状态：

    - `openai-codex/gpt-*` 变为 `openai/gpt-*`。
    - 过时的全代理运行时配置和持久化会话运行时固定项会被移除，因为运行时选择是提供商/模型范围的。
    - 显式的提供商/模型运行时策略会被保留。
    - 现有的模型回退列表会被保留，其旧条目会被重写；复制的每个模型设置会从旧键移动到规范的 `openai/*` 键。
    - 持久化会话 `modelProvider`/`providerOverride`、`model`/`modelOverride`、回退通知、身份验证配置文件固定项以及 Codex harness 固定项会在所有发现的代理会话存储中进行修复。
    - `/codex ...` 意味着“从聊天中控制或绑定原生 Codex 对话”。
    - `/acp ...` 或 `runtime: "acp"` 意味着“使用外部 ACP/acpx 适配器”。

  </Accordion>
  <Accordion title="2g. 会话路由清理">
    在您将配置的模型或运行时从插件拥有的路由（例如 Codex）移开后，Doctor 还会扫描发现的代理会话存储，以清理过时的自动创建路由状态。

    `openclaw doctor --fix` 可以清除自动创建的过时状态，例如 `modelOverrideSource: "auto"`CLI 模型固定、运行时模型元数据、固定的 harness ID、CLI 会话绑定以及自动身份配置文件覆盖，当其拥有的路由不再被配置时。明确的用户或遗留会话模型选择将被报告以供手动审查，并保持不变；当该路由不再需要时，请使用 `/model ...`、`/new` 切换它们，或重置会话。

  </Accordion>
  <Accordion title="3. 遗留状态迁移（磁盘布局）">
    Doctor 可以将较旧的磁盘布局迁移到当前结构：

    - 会话存储 + 转录：
      - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
    - 代理目录：
      - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`WhatsAppBaileys
    - WhatsApp 身份验证状态：
      - 从遗留的 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
      - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认账户 ID：`default`Gateway(网关)CLIWhatsApp）

    这些迁移是尽力而为且幂等的；当 doctor 将任何遗留文件夹作为备份保留时，会发出警告。Gateway/CLI 还会在启动时自动迁移遗留的会话 + 代理目录，以便历史记录/身份验证/模型无需手动运行 doctor 即可进入每个代理的路径。WhatsApp 身份验证有意仅通过 `openclaw doctor` 迁移。Talk 提供商/提供商-map 标准化现在通过结构相等性进行比较，因此仅键顺序的差异不再触发重复的空操作 `doctor --fix` 更改。

  </Accordion>
  <Accordion title="3a. Legacy plugin manifest migrations">
    Doctor 会扫描所有已安装的插件清单，查找已弃用的顶级能力键（`speechProviders`、`realtimeTranscriptionProviders`、`realtimeVoiceProviders`、`mediaUnderstandingProviders`、`imageGenerationProviders`、`videoGenerationProviders`、`webFetchProviders`、`webSearchProviders`）。如果找到这些键，它会提议将其移动到 `contracts` 对象中，并就地重写清单文件。此迁移是幂等的；如果 `contracts` 键已具有相同的值，则移除旧键，而不会重复数据。
  </Accordion>
  <Accordion title="3b. 传统 cron 存储迁移">
    Doctor 还会检查 cron 作业存储（默认为 `~/.openclaw/cron/jobs.json`，若被覆盖则为 `cron.store`），查找调度器出于兼容性考虑仍接受的旧作业形态。

    当前的 cron 清理包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - 顶层负载字段（`message`、`model`、`thinking`，……）→ `payload`
    - 顶层投递字段（`deliver`、`channel`、`to`、`provider`，……）→ `delivery`
    - 负载 `provider` 投递别名 → 显式 `delivery.channel`
    - 简单的传统 `notify: true` webhook 回退作业 → 带有 `delivery.to=cron.webhook` 的显式 `delivery.mode="webhook"`

    只有在不会改变行为的情况下，Doctor 才会自动迁移 `notify: true` 作业。如果作业将传统 notify 回退与现有的非 webhook 投递模式结合使用，doctor 会发出警告并将该作业留待人工审查。

    在 Linux 上，如果用户的 crontab 仍在调用传统的 `~/.openclaw/bin/ensure-whatsapp.sh`，doctor 也会发出警告。该主机本地脚本不由当前的 OpenClaw 维护，并且当 cron 无法到达 systemd 用户总线时，可能会向 `~/.openclaw/logs/whatsapp-health.log` 写入错误的 `Gateway inactive` 消息。请使用 `crontab -e` 删除过时的 crontab 条目；对于当前的健康检查，请使用 `openclaw channels status --probe`、`openclaw doctor` 和 `openclaw gateway status`。

  </Accordion>
  <Accordion title="3c. 会话锁清理"OpenClaw>
    Doctor 会扫描每个代理会话目录中过时的写锁文件——即会话异常退出时遗留的文件。对于发现的每个锁文件，它会报告：路径、PID、PID 是否仍在运行、锁的年龄，以及它是否被视为过时（PID 已死、超过 30 分钟，或可证明属于非 OpenClaw 进程的活动 PID）。在 `--fix` / `--repair` 模式下，它会自动删除过时的锁文件；否则它会打印一条说明并指示您使用 `--fix` 重新运行。
  </Accordion>
  <Accordion title="3d. 会话记录分支修复"OpenClaw>
    Doctor 扫描代理会话 JSONL 文件，查找由 2026.4.24 提示记录重写错误产生的重复分支结构：一个包含 OpenClaw 内部运行时上下文的被放弃用户轮次，以及一个包含相同可见用户提示的活动同级分支。在 `--fix` / `--repair` 模式下，doctor 会将每个受影响的文件在原文件旁进行备份，并将记录重写至活动分支，以便网关历史和内存读取器不再看到重复的轮次。
  </Accordion>
  <Accordion title="4. 状态完整性检查（会话持久化、路由和安全）">
    状态目录是运行的“脑干”。如果它消失了，你将丢失会话、凭据、日志和配置（除非你在其他地方有备份）。

    Doctor 会检查：

    - **状态目录丢失**：警告灾难性的状态丢失，提示重新创建目录，并提醒你它无法恢复丢失的数据。
    - **状态目录权限**：验证可写性；提供修复权限的选项（并在检测到所有者/组不匹配时发出 `chown`macOS 提示）。
    - **macOS 云同步状态目录**：当状态解析位于 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...`Linux 下时发出警告，因为同步支持的路径可能导致 I/O 变慢以及锁/同步竞争。
    - **Linux SD 或 eMMC 状态目录**：当状态解析到 `mmcblk*` 挂载源时发出警告，因为 SD 或 eMMC 支持的随机 I/O 在会话和凭据写入下可能会更慢且磨损更快。
    - **会话目录丢失**：`sessions/` 和会话存储目录是持久化历史记录和避免 `ENOENT` 崩溃所必需的。
    - **记录不匹配**：当最近的会话条目缺少记录文件时发出警告。
    - **主会话“1行 JSONL”**：当主记录只有一行时进行标记（历史记录未在累积）。
    - **多个状态目录**：当跨主目录存在多个 `~/.openclaw` 文件夹，或者当 `OPENCLAW_STATE_DIR` 指向别处时发出警告（历史记录可能会在安装之间分裂）。
    - **远程模式提醒**：如果 `gateway.mode=remote`，doctor 会提醒你在远程主机上运行它（状态位于那里）。
    - **配置文件权限**：如果 `~/.openclaw/openclaw.json` 是组/可读的，则会发出警告并提供将其收紧为 `600` 的选项。

  </Accordion>
  <Accordion title="OAuth5. 模型身份验证运行状况 (OAuth 过期)"OAuthAnthropicOAuthAnthropicAPIAnthropic>
    Doctor 会检查身份验证存储中的 OAuth 配置文件，在令牌即将过期或已过期时发出警告，并在安全时刷新它们。如果 Anthropic OAuth/令牌配置文件已过时，它会建议使用 Anthropic API 密钥或 Anthropic setup-token 路径。刷新提示仅在交互式运行 (TTY) 时出现；`--non-interactive`OAuth 会跳过刷新尝试。

    当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant` 或提供商要求您重新登录），doctor 会报告需要重新进行身份验证，并打印确切的 `openclaw models auth login --provider ...` 命令以供运行。

    Doctor 还会报告因以下原因暂时无法使用的身份验证配置文件：

    - 短暂冷却（速率限制/超时/身份验证失败）
    - 较长时间的禁用（计费/信用失败）

  </Accordion>
  <Accordion title="6. Hooks 模型验证">
    如果设置了 `hooks.gmail.model`，doctor 会对照目录和允许列表验证模型引用，并在模型无法解析或被禁止时发出警告。
  </Accordion>
  <Accordion title="7. 沙箱镜像修复"Docker>
    当启用沙箱隔离时，doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧版名称的选项。
  </Accordion>
  <Accordion title="7b. Plugin install cleanup">
    Doctor 会移除 OpenClaw 生成的旧版插件依赖暂存状态（处于 `openclaw doctor --fix` / `openclaw doctor --repair` 模式时）。这包括过时的生成依赖根目录、旧的安装阶段目录、早期捆绑插件依赖修复代码留下的包内碎片，以及可能会覆盖当前捆绑清单的孤立或已恢复的受管 npm 捆绑 `@openclaw/*` 插件副本。

    当配置引用了插件但本地插件注册表无法找到它们时，Doctor 还可以重新安装缺失的可下载插件。示例包括素材 `plugins.entries`、配置的渠道(提供商)/搜索设置以及配置的代理运行时。在包更新期间，Doctor 会在交换核心包时避免运行包管理器插件修复；如果配置的插件仍然需要修复，请在更新后再次运行 `openclaw doctor --fix`。Gateway(网关) 启动和配置重载不会运行包管理器；插件安装仍然是显式的 doctor/install/update 工作。

  </Accordion>
  <Accordion title="8. Gateway(网关) 服务迁移和清理提示">
    Doctor 会检测旧的 OpenClaw 服务（launchd/systemd/schtasks），并提供将其移除并使用当前 OpenClaw 端口安装 Linux 服务的选项。它还可以扫描额外的类 OpenClaw 服务并打印清理提示。以配置文件命名的 OpenClaw OpenClaw 服务被视为一等公民，不会被标记为“额外”。

    在 OpenClaw 上，如果缺少用户级 OpenClaw 服务但存在系统级 OpenClaw OpenClaw 服务，Doctor 不会自动安装第二个用户级服务。使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 进行检查，然后移除重复项，或者在系统主管管理 OpenClaw 生命周期时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="Matrix8b. Startup Matrix migration"Matrix>
    当 Matrix 渠道帐户有待处理或可执行的旧版状态迁移时，doctor（在 `--fix` / `--repair`Matrix 模式下）会创建预迁移快照，然后运行尽力而为的迁移步骤：旧版 Matrix 状态迁移和旧版加密状态准备。这两个步骤都不是致命的；错误会被记录下来，启动继续。在只读模式下（`openclaw doctor` 不带 `--fix`），此检查将被完全跳过。
  </Accordion>
  <Accordion title="8c. Device pairing and auth drift">
    Doctor 现在会检查设备配对状态，作为常规健康检查的一部分。

    它报告以下内容：

    - 待处理的首次配对请求
    - 已配对设备的待处理角色升级
    - 已配对设备的待处理范围升级
    - 公钥不匹配修复，即设备 ID 仍然匹配，但设备身份不再匹配已批准的记录
    - 缺少已批准角色的活动令牌的已配对记录
    - 范围超出已批准配对基线的已配对令牌
    - 本地缓存的当前机器的设备令牌条目，其时间早于网关端的令牌轮换，或包含过时的范围元数据

    Doctor 不会自动批准配对请求或自动轮换设备令牌。相反，它会打印确切的后续步骤：

    - 使用 `openclaw devices list` 检查待处理的请求
    - 使用 `openclaw devices approve <requestId>` 批准确切的请求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换一个新令牌
    - 使用 `openclaw devices remove <deviceId>` 删除并重新批准过时的记录

    这填补了常见的“已配对但仍要求配对”漏洞：doctor 现在可以区分首次配对、待处理的角色/范围升级以及过时的令牌/设备身份偏差。

  </Accordion>
  <Accordion title="9. Security warnings">
    当提供商在没有允许列表的情况下开放私信，或者策略以危险方式配置时，Doctor 会发出警告。
  </Accordion>
  <Accordion title="Linux10. systemd linger (Linux)">
    如果作为 systemd 用户服务运行，doctor 会确保启用 linger，以便网关在注销后保持运行状态。
  </Accordion>
  <Accordion title="11. 工作区状态（Skills、插件和旧版目录）">
    Doctor 会打印默认代理的工作区状态摘要：

    - **Skills 状态**：统计符合条件的、缺少要求的以及被允许列表阻止的 Skills。
    - **旧版工作区目录**：当 `~/openclaw` 或其他旧版工作区目录与当前工作区并存时发出警告。
    - **插件状态**：统计已启用/已禁用/错误的插件；列出所有错误的插件 ID；报告捆绑插件的功能。
    - **插件兼容性警告**：标记与当前运行时存在兼容性问题的插件。
    - **插件诊断**：显示插件注册器发出的任何加载时警告或错误。

  </Accordion>
  <Accordion title="11b. 引导文件大小">
    Doctor 会检查工作区引导文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超过配置的字符预算。它报告每个文件的原始字符数与注入字符数的对比、截断百分比、截断原因（`max/file` 或 `max/total`），以及总注入字符数占总预算的比例。当文件被截断或接近限制时，doctor 会打印调整 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的提示。
  </Accordion>
  <Accordion title="11d. 清理过时的渠道插件">
    当 `openclaw doctor --fix` 移除缺失的渠道插件时，它还会移除引用该插件的悬空渠道范围配置：`channels.<id>` 条目、命名该渠道的心跳目标以及 `agents.*.models["<channel>/*"]`Gateway(网关) 覆盖。这可以防止 Gateway(网关) 出现启动循环，即渠道运行时已消失但配置仍要求网关绑定到它。
  </Accordion>
  <Accordion title="11c. Shell 补全">
    Doctor 会检查当前 shell（zsh、bash、fish 或 PowerShell）是否安装了 Tab 补全功能：

    - 如果 shell 配置文件使用了缓慢的动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件变体。
    - 如果在配置文件中配置了补全但缓存文件丢失，doctor 会自动重新生成缓存。
    - 如果根本没有配置补全，doctor 会提示安装它（仅限交互模式；使用 `--non-interactive` 时跳过）。

    运行 `openclaw completion --write-state` 以手动重新生成缓存。

  </Accordion>
  <Accordion title="Gateway(网关)12. Gateway(网关) 认证检查（本地令牌）">
    Doctor 检查本地网关令牌认证准备情况。

    - 如果令牌模式需要令牌但不存在令牌源，doctor 会提议生成一个。
    - 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告且不会用明文覆盖它。
    - `openclaw doctor --generate-gateway-token` 仅在未配置令牌 SecretRef 时强制生成。

  </Accordion>
  <Accordion title="12b. 只读 SecretRef 感知修复">
    某些修复流程需要检查已配置的凭证，而不会削弱运行时的快速失败（fail-fast）行为。

    - `openclaw doctor --fix`Telegram 现在使用与状态系列命令相同的只读 SecretRef 摘要模型来针对特定配置进行修复。
    - 示例：当可用时，Telegram `allowFrom` / `groupAllowFrom` `@username`Telegram 修复会尝试使用已配置的 bot 凭证。
    - 如果 Telegram bot 令牌通过 SecretRef 配置，但在当前命令路径中不可用，doctor 会报告该凭证“已配置但不可用”，并跳过自动解析，而不是崩溃或错误地将令牌报告为缺失。

  </Accordion>
  <Accordion title="Gateway(网关)13. Gateway(网关) 健康检查 + 重启">
    Doctor 会运行健康检查，并在 Gateway(网关) 看起来不健康时建议重启它。
  </Accordion>
  <Accordion title="13b. 记忆搜索准备情况">
    Doctor 检查为默认智能体配置的记忆搜索嵌入提供商是否准备就绪。具体行为取决于配置的后端和提供商：

    - **QMD 后端**：探测 `qmd`npm 二进制文件是否可用且可启动。如果不可用，会打印修复指南，包括 npm 包和手动二进制路径选项。
    - **显式本地提供商**：检查本地模型文件或可识别的远程/可下载模型 URL。如果缺失，建议切换到远程提供商。
    - **显式远程提供商**（`openai`、`voyage`APICLI 等）：验证环境或身份验证存储中是否存在 API 密钥。如果缺失，会打印可操作的修复提示。
    - **自动提供商**：首先检查本地模型可用性，然后按自动选择顺序尝试每个远程提供商。

    当存在缓存的网关探测结果时（检查时网关状态健康），doctor 会将其结果与 CLI 可见配置进行交叉引用，并记录任何差异。Doctor 不会在默认路径上启动新的嵌入 ping；如果您想要实时的提供商检查，请使用深度内存状态命令。

    使用 `openclaw memory status --deep` 在运行时验证嵌入准备情况。

  </Accordion>
  <Accordion title="14. 渠道状态警告">
    如果网关健康，doctor 会运行渠道状态探测并报告带有建议修复方法的警告。
  </Accordion>
  <Accordion title="15. Supervisor 配置审计 + 修复">
    Doctor 会检查已安装的 supervisor 配置（launchd/systemd/schtasks）中是否缺失或有过时的默认值（例如，systemd network-online 依赖项和重启延迟）。当发现不匹配时，它会建议更新并可以将服务文件/任务重写为当前默认值。

    注意事项：

    - `openclaw doctor` 会在重写 supervisor 配置之前进行提示。
    - `openclaw doctor --yes` 接受默认的修复提示。
    - `openclaw doctor --repair` 应用推荐的修复，无需提示。
    - `openclaw doctor --repair --force` 覆盖自定义的 supervisor 配置。
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` 使 doctor 在 Gateway 服务生命周期中保持只读。它仍然报告服务健康状况并运行非服务修复，但会跳过服务安装/启动/重启/引导、supervisor 配置重写和旧版服务清理，因为外部 supervisor 拥有该生命周期。
    - 在 Linux 上，当匹配的 systemd gateway 单元处于活动状态时，doctor 不会重写命令/入口点元数据。在重复服务扫描期间，它还会忽略不活动的非旧版额外类 gateway 单元，因此伴随服务文件不会产生清理干扰。
    - 如果令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，则 doctor 服务安装/修复会验证 SecretRef，但不会将解析后的纯文本令牌值持久化到 supervisor 服务环境元数据中。
    - Doctor 检测到由 SecretRef 支持的托管 `.env` 服务环境值，这些值曾被旧的 LaunchAgent、systemd 或 Windows 计划任务安装内嵌，并且会重写服务元数据，以便这些值从运行时源而不是 supervisor 定义加载。
    - Doctor 检测到 `gateway.port` 更改后服务命令仍固定旧的 `--port` 时，会将服务元数据重写为当前端口。
    - 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，doctor 会通过可行的指导阻止安装/修复路径。
    - 如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置且未设置 `gateway.auth.mode`，doctor 将阻止安装/修复，直到显式设置模式。
    - 对于 Linux 用户 systemd 单元，doctor 令牌漂移检查现在在比较服务身份验证元数据时同时包括 `Environment=` 和 `EnvironmentFile=` 源。
    - 当配置是由较新版本最后写入时，Doctor 服务修复将拒绝重写、停止或重启来自较旧 OpenClaw 二进制文件的 gateway 服务。请参阅 [Gateway(网关) 故障排除](/zh/gateway/troubleshooting#split-brain-installs-and-newer-config-guard)。
    - 您始终可以通过 `openclaw gateway install --force` 强制进行完全重写。

  </Accordion>
  <Accordion title="Gateway(网关)16. Gateway(网关) 运行时 + 端口诊断">
    Doctor 会检查服务运行时（PID、上次退出状态），并在服务已安装但未实际运行时发出警告。它还会检查 Gateway(网关) 端口（默认 `18789`）上的端口冲突，并报告可能的原因（Gateway(网关) 已在运行、SSH 隧道）。
  </Accordion>
  <Accordion title="Gateway(网关)17. Gateway(网关) 运行时最佳实践"Bun>
    当 Gateway(网关) 服务在 Bun 上或受版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf`WhatsAppTelegrammacOS 等）上运行时，Doctor 会发出警告。WhatsApp + Telegram 渠道需要 Node，并且由于服务不会加载您的 Shell 初始化文件，版本管理器路径可能在升级后失效。如果可用，Doctor 会建议迁移到系统 Node 安装（Homebrew/apt/choco）。

    新安装或修复的 macOS LaunchAgents 使用规范系统 PATH（`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`Linux），而不是复制交互式 Shell PATH，因此 Homebrew 管理的系统二进制文件保持可用，而 Volta、asdf、fnm、pnpm 和其他版本管理器目录不会影响 Node 子进程的解析。Linux 服务仍保留显式的环境根目录（`NVM_DIR`、`FNM_DIR`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`BUN_INSTALL`、`PNPM_HOME`）和稳定的用户二进制目录，但只有当推测的版本管理器回退目录存在于磁盘上时，才会被写入服务的 PATH。

  </Accordion>
  <Accordion title="18. 配置写入 + 向导元数据">
    Doctor 会保留所有配置更改，并标记向导元数据以记录 doctor 运行情况。
  </Accordion>
  <Accordion title="19. 工作区提示（备份 + 内存系统）">
    Doctor 会在缺少工作区内存系统时建议创建一个，如果工作区尚未在 git 下管理，则会打印备份提示。

    请参阅 [/concepts/agent-workspace](/zh/concepts/agent-workspace) 以获取有关工作区结构和 git 备份的完整指南（推荐使用私有 GitHub 或 GitLab）。

  </Accordion>
</AccordionGroup>

## 相关

- [Gateway(网关) 运维手册](/zh/gateway)
- [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)
