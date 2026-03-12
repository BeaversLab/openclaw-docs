---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - Adding or modifying doctor migrations
  - Introducing breaking config changes
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修复和迁移工具。它修复过时的
配置/状态，检查健康状况，并提供可执行的修复步骤。

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
- OpenCode 提供商覆盖警告（`models.providers.opencode` / `models.providers.opencode-go`）。
- 旧版磁盘状态迁移（sessions/agent 目录/WhatsApp 认证）。
- 传统 cron 存储迁移（`jobId`、`schedule.cron`、顶层 delivery/payload 字段、payload `provider`、简单 `notify: true` webhook 回退作业）。
- 状态完整性和权限检查（会话、脚本、state dir）。
- 本地运行时的配置文件权限检查（chmod 600）。
- 模型身份验证健康检查：检查 OAuth 过期情况，可刷新即将过期的令牌，并报告身份配置文件的冷却/禁用状态。
- 额外工作区目录检测 (`~/openclaw`)。
- 启用沙盒时的沙盒镜像修复。
- 旧版服务迁移和额外网关检测。
- 网关运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
- 通道状态警告（从运行中的网关检测）。
- Supervisor 配置审计（launchd/systemd/schtasks），支持可选修复。
- 网关运行时最佳实践检查（Node vs Bun，版本管理器路径）。
- 网关端口冲突诊断（默认 `18789`）。
- 针对开放 DM 策略的安全警告。
- 网关身份验证检查本地令牌模式（当不存在令牌源时提供令牌生成；不覆盖令牌 SecretRef 配置）。
- Linux 上的 systemd linger 检查。
- 源码安装检查（pnpm 工作区不匹配、缺少 UI 资源、缺少 tsx 二进制文件）。
- 写入更新的配置和向导元数据。

## 详细行为和原理

### 0) 可选更新（git 安装）

如果是 git 检出且 doctor 正在交互模式下运行，它会在运行 doctor 之前提供更新（fetch/rebase/build）的选项。

### 1) 配置规范化

如果配置包含遗留的值形态（例如 `messages.ackReaction` 没有特定于通道的覆盖），doctor 会将其规范化为当前架构。

### 2) 遗留配置键迁移

当配置包含已弃用的键时，其他命令将拒绝运行并要求您运行 `openclaw doctor`。

Doctor 将：

- 解释找到了哪些旧版键。
- 显示它应用的迁移。
- 使用更新后的架构重写 `~/.openclaw/openclaw.json`。

当 Gateway 检测到旧版配置格式时，也会在启动时自动运行 doctor 迁移，因此无需人工干预即可修复过时的配置。

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
- 对于具有命名 `accounts` 但缺少 `accounts.default` 的通道，如果存在，则将帐户范围的顶级单帐户通道值移动到 `channels.<channel>.accounts.default` 中
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`

Doctor 警告还包括针对多账户通道的账户默认指南：

- 如果配置了两个或更多 `channels.<channel>.accounts` 条目但没有设置 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告备用路由可能会选择意外的账户。
- 如果 `channels.<channel>.defaultAccount` 被设置为未知的账户 ID，doctor 会发出警告并列出已配置的账户 ID。

### 2b) OpenCode 提供商覆盖

如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它会覆盖 `@mariozechner/pi-ai` 中内置的 OpenCode 目录。这可能会导致模型使用错误的 API 或将费用归零。Doctor 会发出警告，以便您可以移除覆盖并恢复按模型的 API 路由和费用。

### 3) 传统状态迁移（磁盘布局）

Doctor 可以将较旧的磁盘布局迁移到当前结构：

- 会话存储 + 转录：
  - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 认证状态 (Baileys)：
  - 从旧的 `~/.openclaw/credentials/*.json` (`oauth.json` 除外)
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...` (默认账户 id: `default`)

这些迁移是尽力而为且幂等的；当 doctor 将任何遗留文件夹保留为备份时，它会发出警告。Gateway/CLI 还会在启动时自动迁移遗留会话和代理目录，以便历史记录/身份验证/模型无需手动运行 doctor 即可进入每个代理的路径。WhatsApp 身份验证只能通过 `openclaw doctor` 迁移。

### 3b) 遗留 cron 存储迁移

Doctor 还会检查 cron 任务存储（默认为 `~/.openclaw/cron/jobs.json`，如果被覆盖则为 `cron.store`）中是否存在调度器为了兼容性仍然接受的旧任务格式。

当前的 cron 清理包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 顶层 payload 字段（`message`、`model`、`thinking`，...）→ `payload`
- 顶层交付字段（`deliver`、`channel`、`to`、`provider`，...）→ `delivery`
- 载荷 `provider` 交付别名 → 显式 `delivery.channel`
- 简单旧版 `notify: true` webhook 回退作业 → 带有 `delivery.to=cron.webhook` 的显式 `delivery.mode="webhook"`

只有在不会改变行为的情况下，Doctor 才会自动迁移 `notify: true` 任务。如果一个任务结合了旧的 notify 回退机制和现有的非 webhook 交付模式，doctor 会发出警告并将该任务留待人工检查。

### 4) 状态完整性检查（会话持久性、路由和安全性）

状态目录是操作的核心。如果它消失了，你将丢失会话、凭证、日志和配置（除非你在其他地方有备份）。

Doctor 检查：

- **状态目录丢失**：警告灾难性的状态丢失，提示重新创建
该目录，并提醒你它无法恢复丢失的数据。
- **状态目录权限**：验证可写性；提供修复权限的选项
  （并在检测到所有者/组不匹配时发出 `chown` 提示）。
- **macOS 云同步状态目录**：当状态解析于 iCloud Drive 下时发出警告
  （`~/Library/Mobile Documents/com~apple~CloudDocs/...`）或
  `~/Library/CloudStorage/...`，因为同步支持的路径可能导致 I/O 变慢
  以及锁/同步竞争。
- **Linux SD 或 eMMC 状态目录**：当状态解析到 `mmcblk*` 时发出警告
  挂载源，因为在会话和凭证写入时，基于 SD 或 eMMC 的随机 I/O 可能会变慢并且磨损更快。
- **缺少会话目录**：`sessions/` 和会话存储目录是
  持久化历史记录并避免 `ENOENT` 崩溃所必需的。
- **记录不匹配**：当最近的会话条目缺少
  记录文件时发出警告。
- **主会话“单行 JSONL”**：当主记录只有一行时标记
  （历史记录未在累积）。
- **多个状态目录**：当存在多个 `~/.openclaw` 文件夹时发出警告
  跨主目录或当 `OPENCLAW_STATE_DIR` 指向别处时（历史记录可能
  在安装之间分割）。
- **远程模式提醒**：如果 `gateway.mode=remote`，doctor 会提醒您运行
  它在远程主机上（状态驻留在那里）。
- **配置文件权限**：如果 `~/.openclaw/openclaw.json` 为
  组/全局可读，则会发出警告并提供收紧为 `600`。

### 5) 模型身份验证健康状况（OAuth 过期）

Doctor 会检查身份验证存储中的 OAuth 配置文件，在令牌即将过期或已过期时发出警告，并在安全时刷新它们。如果 Anthropic Claude Code 配置文件过期，它会建议运行 `claude setup-token`（或粘贴设置令牌）。刷新提示仅在交互运行（TTY）时出现；`--non-interactive` 会跳过刷新尝试。

Doctor 还会报告因以下原因暂时不可用的身份验证配置文件：

- 短暂冷却（速率限制/超时/身份验证失败）
- 较长时间的禁用（计费/信用失败）

### 6) Hooks 模型验证

如果设置了 `hooks.gmail.model`，Doctor 会根据目录和允许列表验证模型引用，并在无法解析或被禁止时发出警告。

### 7) 沙箱镜像修复

当启用沙箱功能时，Doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧名称的选项。

### 8) 网关服务迁移和清理提示

Doctor 会检测旧的网关服务（launchd/systemd/schtasks），并建议移除它们，然后使用当前的网关端口安装 OpenClaw 服务。它还可以扫描额外的类网关服务并打印清理提示。以配置文件命名的 OpenClaw 网关服务被视为头等实体，不会被标记为“额外”服务。

### 9) 安全警告

当提供程序在没有允许列表的情况下开放私信，或者策略配置方式危险时，Doctor 会发出警告。

### 10) systemd linger (Linux)

如果作为 systemd 用户服务运行，doctor 会确保启用 linger，以便网关在注销后保持运行。

### 11) 技能状态

Doctor 会打印当前工作区中合格/缺失/被阻止技能的快速摘要。

### 12) 网关身份验证检查（本地令牌）

Doctor 会检查本地网关令牌的身份验证就绪状态。

- 如果令牌模式需要令牌但不存在令牌源，Doctor 会提议生成一个令牌。
- 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，Doctor 会发出警告且不会用明文覆盖它。
- `openclaw doctor --generate-gateway-token` 仅在未配置令牌 SecretRef 时强制生成。

### 12b) 只读 SecretRef 感知修复

某些修复流程需要检查配置的凭据，同时不削弱运行时的快速失败行为。

- `openclaw doctor --fix` 现在与 status 族命令使用相同的只读 SecretRef 摘要模型，以进行有针对性的配置修复。
- 示例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修复尝试在可用时使用已配置的机器人凭据。
- 如果 Telegram 机器人令牌是通过 SecretRef 配置的，但在当前命令路径中不可用，doctor 会报告该凭据已配置但不可用，并跳过自动解析，而不是崩溃或错误地将令牌报告为缺失。

### 13) 网关健康检查 + 重启

Doctor 会运行健康检查，并在网关看起来不正常时提示重启网关。

### 14) 通道状态警告

如果网关正常，Doctor 会运行通道状态探测，并报告附带建议修复方案的警告。

### 15) Supervisor 配置审计 + 修复

Doctor 会检查已安装的监管程序配置（launchd/systemd/schtasks）中
缺失或过时的默认值（例如 systemd 的 network-online 依赖项和
重启延迟）。当发现不匹配时，它会建议更新并可以
将服务文件/任务重写为当前的默认值。

注意：

- `openclaw doctor` 在重写监管程序配置之前会进行提示。
- `openclaw doctor --yes` 接受默认的修复提示。
- `openclaw doctor --repair` 在不提示的情况下应用推荐的修复。
- `openclaw doctor --repair --force` 覆盖自定义的 supervisor 配置。
- 如果令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，doctor 服务安装/修复会验证 SecretRef，但不会将解析后的明文令牌值持久化到 supervisor 服务环境元数据中。
- 如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，doctor 会使用可操作的指导阻止安装/修复路径。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，Doctor 将阻止安装/修复，直到显式设置模式。
- 对于 Linux 用户 systemd 单元，Doctor 的令牌漂移检查现在在比较服务身份验证元数据时会包含 `Environment=` 和 `EnvironmentFile=` 两个来源。
- 您始终可以通过 `openclaw gateway install --force` 强制完全重写。

### 16) 网关运行时 + 端口诊断

Doctor 会检查服务运行时状态（PID、上次退出状态），并在服务已安装但未实际运行时发出警告。它还会检查网关端口（默认 `18789`）上的端口冲突，并报告可能的原因（网关已在运行、SSH 隧道）。

### 17) 网关运行时最佳实践

当网关服务运行在 Bun 或受版本管理的 Node 路径（`nvm`, `fnm`, `volta`, `asdf` 等）上时，Doctor 会发出警告。WhatsApp 和 Telegram 渠道需要 Node，并且由于服务不会加载您的 shell 初始化文件，版本管理器路径在升级后可能会失效。如果可用，Doctor 会提议迁移到系统安装的 Node（Homebrew/apt/choco）。

### 18) 配置写入 + 向导元数据

Doctor 会持久保存所有配置更改，并标记向导元数据以记录此次 doctor 运行。

### 19) 工作区提示（备份 + 记忆系统）

如果缺少工作区记忆系统，Doctor 会建议设置一个；如果工作区尚未处于 git 管理下，Doctor 会打印备份提示。

有关工作区结构和 git 备份（推荐使用私有 GitHub 或 GitLab）的完整指南，请参阅 [/concepts/agent-workspace](/zh/en/concepts/agent-workspace)。
