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
- 技能状态摘要（符合资格/缺失/受阻）。
- 针对旧版值的配置规范化。
- 浏览器迁移检查旧版 Chrome 扩展配置和 Chrome MCP 准备情况。
- OpenCode 提供商覆盖警告 (`models.providers.opencode` / `models.providers.opencode-go`)。
- 旧版磁盘状态迁移（会话/agent 目录/WhatsApp 认证）。
- 旧版 cron 存储迁移 (`jobId`, `schedule.cron`, 顶级 delivery/payload 字段，payload `provider`，简单 `notify: true` webhook 回退作业)。
- 状态完整性和权限检查（会话、记录副本、状态目录）。
- 在本地运行时的配置文件权限检查 (chmod 600)。
- 模型认证健康状况：检查 OAuth 过期时间，可以刷新即将过期的令牌，并报告认证配置文件的冷却/禁用状态。
- 额外工作区目录检测 (`~/openclaw`)。
- 启用沙箱隔离时的沙箱镜像修复。
- 旧版服务迁移和额外网关检测。
- Gateway(网关) 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
- 渠道状态警告（从运行中的网关探测）。
- 监管程序配置审计 (launchd/systemd/schtasks)，可选择修复。
- Gateway(网关) 运行时最佳实践检查（Node 与 Bun，版本管理器路径）。
- Gateway(网关) 端口冲突诊断（默认 `18789`）。
- 针对开放私信策略的安全警告。
- Gateway(网关) 本地令牌模式的认证检查（当不存在令牌源时提供令牌生成；不覆盖令牌 SecretRef 配置）。
- 在 Linux 上检查 systemd linger。
- 源码安装检查（pnpm 工作区不匹配、缺失 UI 资产、缺失 tsx 二进制文件）。
- 写入更新后的配置 + 向导元数据。

## 详细行为和原理

### 0) 可选更新（git 安装）

如果是 git 检出且 doctor 正在交互式运行，它会提议在运行 doctor 之前更新 (fetch/rebase/build)。

### 1) 配置规范化

如果配置包含旧版值形状（例如没有特定渠道覆盖的 `messages.ackReaction`），doctor 会将其规范化为当前架构。

### 2) 旧版配置键迁移

当配置包含已弃用的键时，其他命令将拒绝运行并要求您运行 `openclaw doctor`。

Doctor 将：

- 解释发现了哪些旧版键。
- 显示其应用的迁移。
- 使用更新后的架构重写 `~/.openclaw/openclaw.json`。

当检测到旧版配置格式时，Gateway(网关) 还会在启动时自动运行 doctor 迁移，因此无需手动干预即可修复过时的配置。

当前迁移：

- `routing.allowFrom` → `channels.whatsapp.allowFrom`
- `routing.groupChat.requireMention` → `channels.whatsapp/telegram/imessage.groups."*".requireMention`
- `routing.groupChat.historyLimit` → `messages.groupChat.historyLimit`
- `routing.groupChat.mentionPatterns` → `messages.groupChat.mentionPatterns`
- `routing.queue` → `messages.queue`
- `routing.bindings` → 顶级 `bindings`
- `routing.agents`/`routing.defaultAgentId` → `agents.list` + `agents.list[].default`
- `routing.agentToAgent` → `tools.agentToAgent`
- `routing.transcribeAudio` → `tools.media.audio.models`
- `bindings[].match.accountID` → `bindings[].match.accountId`
- 对于具有命名 `accounts` 但缺少 `accounts.default` 的渠道，如果存在，则将账户范围的顶级单账户渠道值移动到 `channels.<channel>.accounts.default` 中
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost`（旧版扩展中继设置）

Doctor 警告还包括针对多账户渠道的账户默认指导：

- 如果配置了两个或更多 `channels.<channel>.accounts` 条目且没有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告回退路由可能会选择意外账户。
- 如果 `channels.<channel>.defaultAccount` 被设置为未知的账户 ID，doctor 会发出警告并列出已配置的账户 ID。

### 2b) OpenCode 提供商覆盖

如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它将覆盖 `@mariozechner/pi-ai` 的内置 OpenCode 目录。这可能会强制将模型使用错误的 API 或将成本归零。Doctor 会发出警告，以便您可以移除该覆盖并恢复按模型的 API 路由和成本。

### 2c) 浏览器迁移和 Chrome MCP 准备

如果您的浏览器配置仍指向已移除的 Chrome 扩展路径，doctor 会将其规范化为当前主机的本地 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
- `browser.relayBindHost` 被移除

当您使用 `defaultProfile:
"user"` or a configured `existing-会话` 配置文件时，Doctor 还会审计主机本地 Chrome MCP 路径：

- 检查默认自动连接配置文件是否在同一主机上安装了 Google Chrome
- 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
- 提醒您在浏览器检查页面启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

Doctor 无法为您启用 Chrome 端的设置。主机本地 Chrome MCP 仍然需要：

- 网关/节点主机上安装基于 Chromium 的浏览器 144+
- 浏览器在本地运行
- 在该浏览器中启用了远程调试
- 在浏览器中批准第一个附加同意提示

此检查**不**适用于 Docker、沙箱、remote-browser 或其他无头流程。这些流程继续使用原始 CDP。

### 3) 旧版状态迁移（磁盘布局）

Doctor 可以将较旧的磁盘布局迁移到当前结构：

- 会话存储 + 副本：
  - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 认证状态 (Baileys)：
  - 从旧版 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认账户 ID：`default`）

这些迁移是尽力而为且幂等的；当 doctor 将任何旧版文件夹作为备份保留时，它会发出警告。Gateway(网关)/CLI 也会在启动时自动迁移旧版会话 + agent 目录，以便历史记录/身份验证/模型存入 per-agent 路径，而无需手动运行 doctor。WhatsApp 身份验证有意仅通过 `openclaw doctor` 迁移。

### 3b) 旧版 cron 存储迁移

Doctor 还会检查 cron 作业存储（默认为 `~/.openclaw/cron/jobs.json`，覆盖时为 `cron.store`）中调度器出于兼容性仍接受的旧作业形状。

当前的 cron 清理包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 顶层 payload 字段（`message`、`model`、`thinking`、...）→ `payload`
- 顶层 delivery 字段（`deliver`、`channel`、`to`、`provider`、...）→ `delivery`
- payload `provider` delivery 别名 → 显式 `delivery.channel`
- 简单的旧版 `notify: true` webhook 回退作业 → 带有 `delivery.to=cron.webhook` 的显式 `delivery.mode="webhook"`

Doctor 只有在可以在不改变行为的情况下，才会自动迁移 `notify: true` 作业。如果作业将旧版 notify 回退与现有的非 webhook 交付模式结合使用，doctor 会发出警告并将该作业留给人工审查。

### 4) 状态完整性检查（会话持久性、路由和安全性）

状态目录是操作的生命线。如果它消失了，您将失去会话、凭据、日志和配置（除非您在其他地方有备份）。

Doctor 检查：

- **State dir missing**：警告灾难性的状态丢失，提示重新创建目录，并提醒您它无法恢复丢失的数据。
- **状态目录权限**：验证可写性；提供修复权限的选项
  （并在检测到所有者/组不匹配时发出 `chown` 提示）。
- **macOS 云同步状态目录**：当状态解析到 iCloud Drive
  （`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或
  `~/Library/CloudStorage/...` 下时发出警告，因为同步支持的路径可能导致 I/O
  变慢以及锁定/同步竞争。
- **Linux SD 或 eMMC 状态目录**：当状态解析到 `mmcblk*`
  挂载源时发出警告，因为 SD 或 eMMC 支持的随机 I/O 在会话和凭据写入时
  可能会更慢并磨损得更快。
- **会话目录缺失**：`sessions/` 和会话存储目录
  是持久化历史记录并避免 `ENOENT` 崩溃所必需的。
- **记录不匹配**：当最近的会话条目缺少记录文件时发出警告。
- **主会话“1行 JSONL”**：当主记录只有一行时标记
  （历史记录未在累积）。
- **多个状态目录**：当在主目录中存在多个 `~/.openclaw` 文件夹
  或当 `OPENCLAW_STATE_DIR` 指向别处时发出警告（历史记录可能会在安装之间
  分散）。
- **远程模式提醒**：如果 `gateway.mode=remote`，doctor 会提醒您在
  远程主机上运行它（状态位于那里）。
- **配置文件权限**：如果 `~/.openclaw/openclaw.json` 可被
  组/其他人读取，则发出警告并提供将其收紧为 `600` 的选项。

### 5) 模型认证健康 (OAuth 过期)

Doctor 会检查认证存储中的 OAuth 配置文件，在令牌即将过期/已过期时发出警告，并在安全时刷新它们。如果 Anthropic Claude Code
配置文件已过期，它会建议运行 `claude setup-token`（或粘贴 setup-token）。
刷新提示仅在交互运行 (TTY) 时出现；`--non-interactive`
会跳过刷新尝试。

Doctor 还会报告由于以下原因暂时无法使用的认证配置文件：

- 短暂冷却（速率限制/超时/认证失败）
- 较长时间的禁用（计费/信用失败）

### 6) Hooks 模型验证

如果设置了 `hooks.gmail.model`，doctor 会根据目录
和允许列表验证模型引用，并在其无法解析或被禁止时发出警告。

### 7) 沙箱镜像修复

当启用沙箱隔离时，doctor 会检查 Docker 镜像，如果当前镜像缺失，它会提供构建或切换到旧版名称的选项。

### 8) Gateway(网关) 服务迁移和清理提示

Doctor 会检测旧版 gateway 服务（launchd/systemd/schtasks），并提供将其删除以及使用当前 gateway 端口安装 OpenClaw 服务的选项。它还可以扫描额外的类 gateway 服务并打印清理提示。以配置文件命名的 OpenClaw gateway 服务被视为一等公民，不会被标记为“额外”。

### 9) 安全警告

当提供商在没有允许列表的情况下对私信开放，或者策略以危险方式配置时，Doctor 会发出警告。

### 10) systemd linger (Linux)

如果作为 systemd 用户服务运行，doctor 会确保启用 linger，以便 gateway 在注销后保持运行。

### 11) Skills 状态

Doctor 会针对当前工作区打印关于符合条件/缺失/被阻止的 Skills 的快速摘要。

### 12) Gateway(网关) 认证检查（本地令牌）

Doctor 检查本地 gateway 令牌认证就绪状态。

- 如果令牌模式需要令牌但不存在令牌源，doctor 会提供生成令牌的选项。
- 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告，并且不会用纯文本覆盖它。
- `openclaw doctor --generate-gateway-token` 强制生成，但前提是未配置令牌 SecretRef。

### 12b) 只读 SecretRef 感知修复

某些修复流程需要检查已配置的凭据，而不会削弱运行时的快速失败（fail-fast）行为。

- `openclaw doctor --fix` 现在使用与 status 系列（status-family）命令相同的只读 SecretRef 摘要模型来进行有针对性的配置修复。
- 示例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修复会尝试在可用时使用已配置的机器人凭据。
- 如果 Telegram 机器人令牌是通过 SecretRef 配置的，但在当前命令路径中不可用，doctor 会报告该凭据已配置但不可用，并跳过自动解析，而不是崩溃或错误地将令牌报告为缺失。

### 13) Gateway(网关) 健康检查 + 重启

Doctor 会运行健康检查，并在 gateway 看起来不健康时提供重启选项。

### 14) 渠道状态警告

如果 gateway 健康，doctor 会运行渠道状态探测并报告附带建议修复方法的警告。

### 15) 监管器配置审计 + 修复

Doctor 会检查已安装的监管器配置（launchd/systemd/schtasks）中是否有缺失或过时的默认值（例如 systemd 的 network-online 依赖项和重启延迟）。当发现不匹配时，它会建议更新并可以将服务文件/任务重写为当前的默认值。

说明：

- `openclaw doctor` 会在重写监管器配置之前提示。
- `openclaw doctor --yes` 接受默认的修复提示。
- `openclaw doctor --repair` 应用推荐的修复且不提示。
- `openclaw doctor --repair --force` 覆盖自定义监管器配置。
- 如果令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，doctor 服务安装/修复会验证 SecretRef，但不会将解析后的明文令牌值持久化到监管器服务环境元数据中。
- 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，doctor 会通过可操作的指导阻止安装/修复路径。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，doctor 会阻止安装/修复，直到明确设置模式。
- 对于 Linux 用户 systemd 单元，doctor 令牌偏差检查现在包括 `Environment=` 和 `EnvironmentFile=` 源，以便在比较服务身份验证元数据时使用。
- 您始终可以通过 `openclaw gateway install --force` 强制完全重写。

### 16) Gateway(网关) 运行时 + 端口诊断

Doctor 会检查服务运行时（PID，上次退出状态）并在服务已安装但未实际运行时发出警告。它还会检查 Gateway(网关) 端口（默认 `18789`）上的端口冲突，并报告可能的原因（Gateway(网关) 已在运行，SSH 隧道）。

### 17) Gateway(网关) 运行时最佳实践

当网关服务在 Bun 或版本管理的 Node 路径上运行时（`nvm`、`fnm`、`volta`、`asdf` 等），Doctor 会发出警告。Bun + WhatsApp 通道需要 Node，且由于服务不会加载您的 shell 初始化文件，版本管理器路径在升级后可能会失效。如果可用（Homebrew/apt/choco），Doctor 会建议迁移到系统 Node 安装。

### 18) 配置写入 + 向导元数据

Doctor 会保存所有配置更改，并标记向导元数据以记录 Doctor 的运行情况。

### 19) 工作区提示（备份 + 记忆系统）

如果缺少工作区记忆系统，Doctor 会建议设置；如果工作区尚未在 git 下管理，Doctor 会打印备份提示。

有关工作区结构和 git 备份（推荐使用私有 GitHub 或 GitLab）的完整指南，请参阅 [/concepts/agent-workspace](/en/concepts/agent-workspace)。
