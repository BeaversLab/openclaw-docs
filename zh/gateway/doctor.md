---
summary: "Doctor command: health checks, config migrations, and repair steps"
read_when:
  - 添加或修改 doctor 迁移
  - 引入破坏性配置更改
title: "Doctor"
---

# Doctor

`openclaw doctor` 是 OpenClaw 的修复和迁移工具。它可以修复过时的
配置/状态、检查运行状况，并提供可执行的修复步骤。

## 快速开始

```bash
openclaw doctor
```

### 无头 / 自动化

```bash
openclaw doctor --yes
```

无需提示即接受默认值（包括适用时的重启/服务/沙箱修复步骤）。

```bash
openclaw doctor --repair
```

无需提示即应用推荐的修复措施（在安全的地方进行修复和重启）。

```bash
openclaw doctor --repair --force
```

同时也应用激进的修复措施（覆盖自定义的 supervisor 配置）。

```bash
openclaw doctor --non-interactive
```

无提示运行且仅应用安全的迁移（配置规范化 + 磁盘上的状态移动）。跳过需要人工确认的重启/服务/沙箱操作。
检测到旧版状态迁移时会自动运行。

```bash
openclaw doctor --deep
```

扫描系统服务以查找额外的网关安装 (launchd/systemd/schtasks)。

如果想在写入之前查看更改，请先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## 功能概述（摘要）

- 针对 git 安装的可选起飞前更新（仅限交互模式）。
- UI 协议新鲜度检查（当协议架构较新时重新构建 Control UI）。
- 健康检查 + 重启提示。
- Skills 状态摘要（符合资格/缺失/受阻）。
- 针对旧值的配置规范化。
- 浏览器迁移检查，针对旧版 Chrome 扩展配置和 Chrome MCP 准备情况。
- OpenCode 提供商覆盖警告 (`models.providers.opencode` / `models.providers.opencode-go`)。
- 旧版磁盘状态迁移（会话/agent 目录/WhatsApp 认证）。
- 旧版 cron 存储迁移 (`jobId`, `schedule.cron`, 顶级 delivery/payload 字段, payload `provider`, 简单的 `notify: true` webhook 回退作业)。
- 状态完整性和权限检查（会话、transcripts、状态目录）。
- 本地运行时的配置文件权限检查 (chmod 600)。
- 模型认证健康检查：检查 OAuth 到期情况，可刷新即将过期的令牌，并报告认证配置文件的冷却/禁用状态。
- 额外的工作区目录检测 (`~/openclaw`)。
- 启用沙箱隔离时的沙箱镜像修复。
- 旧版服务迁移和额外网关检测。
- Gateway(网关) 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
- 渠道状态警告（从运行中的网关探测）。
- Supervisor 配置审计（launchd/systemd/schtasks），可选择修复。
- Gateway(网关) 运行时最佳实践检查（Node 与 Bun，版本管理器路径）。
- Gateway(网关) 端口冲突诊断（默认 `18789`）。
- 针对开放私信(私信)策略的安全警告。
- 本地令牌模式的 Gateway(网关) 身份验证检查（当不存在令牌源时提供令牌生成；不会覆盖令牌 SecretRef 配置）。
- Linux 上的 systemd linger 检查。
- 源代码安装检查（pnpm 工作区不匹配、UI 资源缺失、tsx 二进制文件缺失）。
- 写入更新的配置 + 向导元数据。

## 详细行为和基本原理

### 0) 可选更新（git 安装）

如果这是 git 检出且 doctor 正在交互模式下运行，它会在运行 doctor 之前提供更新（fetch/rebase/build）。

### 1) 配置规范化

如果配置包含旧版值形状（例如 `messages.ackReaction`
没有针对特定渠道的覆盖），doctor 会将其规范化为当前架构。

### 2) 旧版配置键迁移

当配置包含已弃用的键时，其他命令将拒绝运行并要求
您运行 `openclaw doctor`。

Doctor 将会：

- 解释找到了哪些旧版键。
- 显示它应用的迁移。
- 使用更新后的架构重写 `~/.openclaw/openclaw.json`。

当 Gateway(网关) 检测到旧版配置格式时，也会在启动时自动运行 doctor 迁移，因此无需人工干预即可修复过时的配置。

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
- 对于具有命名 `accounts` 但缺少 `accounts.default` 的渠道，将帐户范围的单帐户渠道顶层值移入 `channels.<channel>.accounts.default`（如果存在）
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*` (tools/elevated/exec/sandbox/subagents)
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`
- `browser.ssrfPolicy.allowPrivateNetwork` → `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`
- `browser.profiles.*.driver: "extension"` → `"existing-session"`
- 移除 `browser.relayBindHost` (旧版扩展中继设置)

Doctor 警告还包括针对多帐户渠道的帐户默认值指导：

- 如果配置了两个或更多 `channels.<channel>.accounts` 条目但未指定 `channels.<channel>.defaultAccount` 或 `accounts.default`，Doctor 会警告备用路由可能会选择意外的帐户。
- 如果 `channels.<channel>.defaultAccount` 设置为未知的帐户 ID，Doctor 会发出警告并列出已配置的帐户 ID。

### 2b) OpenCode 提供商覆盖

如果您手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它将覆盖来自 `@mariozechner/pi-ai` 的内置 OpenCode 目录。这可能会强制模型使用错误的 API 或将成本归零。Doctor 会发出警告，以便您移除覆盖并恢复按模型的 API 路由 + 成本。

### 2c) 浏览器迁移和 Chrome MCP 准备

如果您的浏览器配置仍指向已删除的 Chrome 扩展路径，Doctor 会将其规范化为当前主机本地的 Chrome MCP 附加模型：

- `browser.profiles.*.driver: "extension"` 变为 `"existing-session"`
- `browser.relayBindHost` 已被移除

当您使用 `defaultProfile:
"user"` or a configured `existing-会话` 配置文件时，Doctor 还会审计主机本地的 Chrome MCP 路径：

- 检查同一主机上是否安装了 Google Chrome，用于默认
  自动连接配置文件
- 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
- 提醒您在浏览器检查页面中启用远程调试（例如
  `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging`
  或 `edge://inspect/#remote-debugging`）

Doctor 无法为您启用 Chrome 端的设置。主机本地 Chrome MCP
仍然需要：

- 网关/节点主机上安装 144+ 版本的基于 Chromium 的浏览器
- 浏览器在本地运行
- 在该浏览器中启用远程调试
- 在浏览器中批准首次附加同意提示

此检查**不**适用于 Docker、沙盒、远程浏览器或其他
无头流程。这些流程继续使用原始 CDP。

### 3) 遗留状态迁移（磁盘布局）

Doctor 可以将较旧的磁盘布局迁移到当前结构：

- 会话存储 + 脚本：
  - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent 目录：
  - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp 认证状态 (Baileys)：
  - 从遗留的 `~/.openclaw/credentials/*.json`（`oauth.json` 除外）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认账户 ID：`default`）

这些迁移是尽力而为且幂等的；当 doctor 将任何遗留文件夹保留为备份时，会发出警告。Gateway(网关)/CLI 还会在启动时自动迁移
遗留的会话 + agent 目录，因此历史记录/认证/模型将落在
每 agent 路径中，而无需手动运行 doctor。WhatsApp 认证特意仅
通过 `openclaw doctor` 迁移。

### 3b) 遗留 cron 存储迁移

Doctor 还会检查 cron 作业存储（默认为 `~/.openclaw/cron/jobs.json`，
或覆盖时的 `cron.store`）中调度程序为了兼容性仍然接受的
旧作业形状。

当前的 cron 清理包括：

- `jobId` → `id`
- `schedule.cron` → `schedule.expr`
- 顶级 payload 字段 (`message`, `model`, `thinking`, ...) → `payload`
- 顶级 delivery 字段 (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
- payload `provider` delivery 别名 → 显式 `delivery.channel`
- 简单的旧版 `notify: true` webhook 回退作业 → 具有 `delivery.to=cron.webhook` 的显式 `delivery.mode="webhook"`

仅当可以在不改变行为的情况下自动迁移 `notify: true` 作业时，Doctor 才会进行自动迁移。如果作业将旧版 notify 回退与现有的非 webhook delivery 模式结合使用，doctor 会发出警告并将该作业留待人工审查。

### 4) 状态完整性检查（会话持久化、路由和安全）

状态目录是运行的“脑干”。如果它消失，你将丢失会话、凭据、日志和配置（除非你在其他地方有备份）。

Doctor 检查：

- **状态目录丢失**：警告发生灾难性的状态丢失，提示重新创建目录，并提醒你它无法恢复丢失的数据。
- **状态目录权限**：验证可写性；提供修复权限（并且在检测到所有者/组不匹配时发出 `chown` 提示）。
- **macOS 云同步状态目录**：当状态解析到 iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) 或 `~/Library/CloudStorage/...` 下时发出警告，因为同步支持的路径可能会导致 I/O 变慢以及锁/同步竞争。
- **Linux SD 或 eMMC 状态目录**：当状态解析为 `mmcblk*` 挂载源时发出警告，因为 SD 或 eMMC 支持的随机 I/O 可能会更慢，并且在会话和凭据写入时磨损得更快。
- **会话目录丢失**：需要 `sessions/` 和会话存储目录来持久化历史记录并避免 `ENOENT` 崩溃。
- **记录不匹配**：当最近的会话条目缺少记录文件时发出警告。
- **主会话“1-line JSONL”**：当主记录只有一行（历史记录未累积）时进行标记。
- **多重状态目录**：当在多个主目录中存在多个 `~/.openclaw` 文件夹或 `OPENCLAW_STATE_DIR` 指向其他位置时发出警告（历史记录可能会在安装之间分割）。
- **远程模式提醒**：如果处于 `gateway.mode=remote`，doctor 会提醒你在远程主机上运行它（状态驻留在那里）。
- **配置文件权限**：如果 `~/.openclaw/openclaw.json` 可被组/其他人读取，则发出警告并提供将其收紧为 `600` 的选项。

### 5) 模型身份验证健康状况 (OAuth 过期)

Doctor 会检查身份验证存储中的 OAuth 个人资料，在令牌即将过期/已过期时发出警告，并在安全时刷新它们。如果 Anthropic Claude Code 个人资料已过时，它会建议运行 `claude setup-token`（或粘贴 setup-token）。刷新提示仅在交互运行（TTY）时出现；`--non-interactive` 会跳过刷新尝试。

Doctor 还会报告因以下原因暂时无法使用的身份验证个人资料：

- 短暂冷却（速率限制/超时/身份验证失败）
- 较长时间的禁用（账单/信用失败）

### 6) Hooks 模型验证

如果设置了 `hooks.gmail.model`，doctor 会根据目录和允许列表验证模型引用，并在无法解析或被禁止时发出警告。

### 7) 沙箱镜像修复

当启用沙箱隔离时，doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧名称的选项。

### 8) Gateway(网关) 服务迁移和清理提示

Doctor 会检测旧的 Gateway 服务（launchd/systemd/schtasks），并提供删除它们并使用当前 Gateway 端口安装 OpenClaw 服务。它还可以扫描类似 Gateway 的额外服务并打印清理提示。以个人资料命名的 OpenClaw Gateway 服务被视为一等公民，不会被标记为“额外”。

### 9) 安全警告

当提供商在没有允许列表的情况下开放私信，或者以危险的方式配置策略时，Doctor 会发出警告。

### 10) systemd linger (Linux)

如果作为 systemd 用户服务运行，doctor 会确保已启用 linger，以便在注销后 Gateway 保持运行。

### 11) Skills 状态

Doctor 会针对当前工作区打印符合条件/缺失/被阻止的 Skills 的快速摘要。

### 12) Gateway(网关) 身份验证检查（本地令牌）

Doctor 会检查本地 Gateway 令牌身份验证准备情况。

- 如果 token 模式需要 token 但不存在 token 源，doctor 会建议生成一个。
- 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告且不会用纯文本覆盖它。
- `openclaw doctor --generate-gateway-token` 仅在未配置 token SecretRef 时强制生成。

### 12b) 支持只读 SecretRef 的修复

某些修复流程需要检查已配置的凭据，而不会削弱运行时的快速失败（fail-fast）行为。

- `openclaw doctor --fix` 现在使用与状态系列命令相同的只读 SecretRef 摘要模型来进行有针对性的配置修复。
- 示例：Telegram `allowFrom` / `groupAllowFrom` `@username` 修复会在可用时尝试使用已配置的 bot 凭据。
- 如果 Telegram bot token 是通过 SecretRef 配置的，但在当前命令路径中不可用，doctor 会报告该凭据已配置但不可用，并跳过自动解析，而不是崩溃或错误地将 token 报告为缺失。

### 13) Gateway(网关) 健康检查 + 重启

Doctor 运行健康检查，并在 Gateway(网关) 看起来不健康时建议重启。

### 14) 渠道状态警告

如果 Gateway(网关) 健康，doctor 会运行渠道状态探测并报告附带建议修复的警告。

### 15) Supervisor 配置审计 + 修复

Doctor 检查已安装的 supervisor 配置（launchd/systemd/schtasks）中是否缺失或有过时的默认值（例如 systemd network-online 依赖项和重启延迟）。当发现不匹配时，它会建议更新并可以将服务文件/任务重写为当前默认值。

注：

- `openclaw doctor` 在重写 supervisor 配置之前会提示。
- `openclaw doctor --yes` 接受默认修复提示。
- `openclaw doctor --repair` 应用建议的修复而不提示。
- `openclaw doctor --repair --force` 覆盖自定义 supervisor 配置。
- 如果 token 身份验证需要 token 且 `gateway.auth.token` 由 SecretRef 管理，doctor 服务安装/修复会验证 SecretRef，但不会将解析的纯文本 token 值持久化到 supervisor 服务环境元数据中。
- 如果令牌身份验证需要令牌，但配置的令牌 SecretRef 未解析，doctor 将阻止安装/修复路径并提供可操作的指导。
- 如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 并且 `gateway.auth.mode` 未设置，doctor 将阻止安装/修复，直到明确设置模式。
- 对于 Linux 用户 systemd 单元，doctor 令牌漂移检查现在在比较服务身份验证元数据时包含 `Environment=` 和 `EnvironmentFile=` 源。
- 您始终可以通过 `openclaw gateway install --force` 强制完全重写。

### 16) Gateway(网关) 运行时 + 端口诊断

Doctor 会检查服务运行时（PID、上次退出状态），并在服务已安装但实际未运行时发出警告。它还会检查 Gateway(网关) 端口（默认 `18789`）上的端口冲突，并报告可能的原因（gateway 已在运行、SSH 隧道）。

### 17) Gateway(网关) 运行时最佳实践

当 gateway 服务在 Bun 或由版本管理的 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）上运行时，Doctor 会发出警告。WhatsApp + Telegram 渠道需要 Node，且版本管理器路径在升级后可能会失效，因为服务不会加载您的 shell 初始化脚本。当可用时（Homebrew/apt/choco），Doctor 会提供迁移到系统 Node 安装的建议。

### 18) 配置写入 + 向导元数据

Doctor 会保留所有配置更改，并标记向导元数据以记录 doctor 运行。

### 19) 工作区提示（备份 + 记忆系统）

如果缺少工作区记忆系统，Doctor 会建议一个；如果工作区尚未受 git 管理，则会打印备份提示。

有关工作区结构和 git 备份的完整指南（推荐私有 GitHub 或 GitLab），请参阅 [/concepts/agent-workspace](/zh/concepts/agent-workspace)。

import zh from "/components/footer/zh.mdx";

<zh />
