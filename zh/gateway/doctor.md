---
summary: "Doctor 命令：健康检查、配置迁移与修复步骤"
read_when:
  - 添加或修改 doctor 迁移
  - 引入破坏性配置变更
---
# Doctor

`openclaw doctor` 是 OpenClaw 的修复 + 迁移工具。它会修复陈旧
config/state、检查健康状况，并提供可执行的修复步骤。

## 快速开始

```bash
openclaw doctor
```

### 无头 / 自动化

```bash
openclaw doctor --yes
```

无提示接受默认值（包括适用时的重启/服务/sandbox 修复步骤）。

```bash
openclaw doctor --repair
```

无提示应用推荐修复（能安全执行的修复 + 重启）。

```bash
openclaw doctor --repair --force
```

连同激进修复一起应用（会覆盖自定义 supervisor 配置）。

```bash
openclaw doctor --non-interactive
```

无提示运行，仅应用安全迁移（配置归一化 + 磁盘状态移动）。跳过需要人工确认的重启/服务/sandbox 操作。
检测到旧版状态迁移时会自动执行。

```bash
openclaw doctor --deep
```

扫描系统服务中额外的 gateway 安装（launchd/systemd/schtasks）。

如果你想在写入前审查变更，请先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## 功能概览
- Git 安装的可选预更新（仅交互模式）。
- UI 协议新鲜度检查（协议 schema 更新时重建 Control UI）。
- 健康检查 + 重启提示。
- Skills 状态汇总（可用/缺失/被阻止）。
- 旧值的配置归一化。
- OpenCode Zen provider 覆盖告警（`models.providers.opencode`）。
- 旧版磁盘状态迁移（sessions/agent dir/WhatsApp auth）。
- 状态完整性与权限检查（sessions、transcripts、state dir）。
- 本地模式下的配置文件权限检查（chmod 600）。
- 模型认证健康：检查 OAuth 过期，可刷新即将过期 token，并报告 auth-profile 冷却/禁用状态。
- 额外工作区目录检测（`~/openclaw`）。
- sandboxing 启用时的 sandbox 镜像修复。
- 旧版服务迁移与额外 gateway 检测。
- Gateway 运行时检查（服务安装但未运行；缓存的 launchd label）。
- 渠道状态告警（从运行中的 gateway 探测）。
- Supervisor 配置审计（launchd/systemd/schtasks）与可选修复。
- Gateway 运行时最佳实践检查（Node vs Bun、版本管理器路径）。
- Gateway 端口冲突诊断（默认 `18789`）。
- 公开 DM 策略的安全警告。
- 未设置 `gateway.auth.token` 的认证警告（local 模式；提供生成 token）。
- Linux 的 systemd linger 检查。
- 源码安装检查（pnpm workspace 不匹配、缺少 UI 资源、缺少 tsx）。
- 写入更新后的 config + wizard 元数据。

## 详细行为与理由

### 0) 可选更新（git 安装）

若为 git checkout 且 doctor 以交互方式运行，会先询问是否更新
（fetch/rebase/build）。

### 1) 配置归一化

若配置包含旧值形态（例如 `messages.ackReaction` 没有渠道级覆盖），doctor 会将其归一化为当前 schema。

### 2) 旧配置键迁移

当配置包含已弃用键时，其他命令会拒绝执行并提示运行 `openclaw doctor`。

Doctor 会：
- 说明发现了哪些旧键。
- 展示其应用的迁移。
- 用更新后的 schema 重写 `~/.openclaw/openclaw.json`。

当 Gateway 启动检测到旧配置格式时也会自动运行迁移，以便无需手工介入即可修复陈旧配置。

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
- `bindings[].match.accountID` → `bindings[].match.accountId`
- `identity` → `agents.list[].identity`
- `agent.*` → `agents.defaults` + `tools.*`（tools/elevated/exec/sandbox/subagents）
- `agent.model`/`allowedModels`/`modelAliases`/`modelFallbacks`/`imageModelFallbacks`
  → `agents.defaults.models` + `agents.defaults.model.primary/fallbacks` + `agents.defaults.imageModel.primary/fallbacks`

### 2b) OpenCode Zen provider 覆盖

若你手动添加了 `models.providers.opencode`（或 `opencode-zen`），它会覆盖
`@mariozechner/pi-ai` 内置的 OpenCode Zen catalog，可能导致所有模型都走同一 API
或成本归零。Doctor 会提示你移除该覆盖，以恢复按模型路由 + 成本。

### 3) 旧版状态迁移（磁盘布局）

Doctor 可将旧磁盘布局迁移到当前结构：
- Sessions store + transcripts：
  - 从 `~/.openclaw/sessions/` 到 `~/.openclaw/agents/<agentId>/sessions/`
- Agent dir：
  - 从 `~/.openclaw/agent/` 到 `~/.openclaw/agents/<agentId>/agent/`
- WhatsApp auth（Baileys）：
  - 从旧 `~/.openclaw/credentials/*.json`（除 `oauth.json`）
  - 到 `~/.openclaw/credentials/whatsapp/<accountId>/...`（默认 account id: `default`）

这些迁移尽力而为且幂等；若留下旧目录作为备份，doctor 会提示。Gateway/CLI 也会在启动时自动迁移旧 sessions + agent dir，使历史/auth/models 落到 per-agent 路径，无需手工 doctor。WhatsApp auth 刻意仅通过 `openclaw doctor` 迁移。

### 4) 状态完整性检查（会话持久化、路由与安全）

状态目录是运行的“脑干”。丢失它会导致会话、凭据、日志与配置丢失（除非你在别处备份）。

Doctor 检查：
- **State dir 缺失**：警告灾难性状态丢失，提示重建目录并提醒无法恢复缺失数据。
- **State dir 权限**：验证可写性；提供修复权限（当发现 owner/group 不匹配时提示 `chown`）。
- **Session dirs 缺失**：`sessions/` 与会话 store 目录必须存在，否则会导致 `ENOENT` 崩溃。
- **Transcript mismatch**：近期会话条目缺少 transcript 文件时告警。
- **Main session “1-line JSONL”**：当主 transcript 只有一行时提示（历史未累积）。
- **多个 state dirs**：当存在多个 `~/.openclaw` 目录或 `OPENCLAW_STATE_DIR` 指向别处时告警（历史会分裂）。
- **Remote mode 提醒**：若 `gateway.mode=remote`，提示在远端主机运行 doctor（状态在那里）。
- **配置文件权限**：若 `~/.openclaw/openclaw.json` 对组/全局可读则告警，并建议收紧到 `600`。

### 5) 模型认证健康（OAuth 过期）

Doctor 检查 auth store 中的 OAuth profiles，提示即将过期/已过期的 token，并在安全时可刷新。
若 Anthropic Claude Code profile 过期，会建议运行 `claude setup-token`（或粘贴 setup-token）。
刷新提示仅在交互模式（TTY）出现；`--non-interactive` 会跳过刷新。

Doctor 还会报告因以下原因暂时不可用的 profiles：
- 短期冷却（限流/超时/认证失败）
- 长期禁用（billing/额度失败）

### 6) Hooks 模型校验

若设置 `hooks.gmail.model`，doctor 会根据 catalog 与 allowlist 校验该模型引用，并在无法解析或不被允许时告警。

### 7) Sandbox 镜像修复

启用 sandboxing 时，doctor 会检查 Docker 镜像并提供构建或切换到旧名称的选项。

### 8) Gateway 服务迁移与清理提示

Doctor 会检测旧版 gateway 服务（launchd/systemd/schtasks），提供移除并按当前 gateway 端口安装 OpenClaw 服务的选项。也可扫描额外的类 gateway 服务并输出清理提示。带 profile 名的 OpenClaw gateway 服务被视为一等公民，不会被标为“额外”。

### 9) 安全警告

当 provider 对 DMs 公开且没有 allowlist，或策略配置危险时，doctor 会提示。

### 10) systemd linger（Linux）

若作为 systemd 用户服务运行，doctor 会确保启用 linger，使 gateway 在注销后保持运行。

### 11) Skills 状态

Doctor 会输出当前工作区可用/缺失/被阻止 skills 的快速摘要。

### 12) Gateway 认证检查（本地 token）

Doctor 在本地 gateway 缺少 `gateway.auth` 时提示，并提供生成 token。自动化可使用 `openclaw doctor --generate-gateway-token` 强制生成。

### 13) Gateway 健康检查 + 重启

Doctor 运行健康检查，并在 gateway 看起来不健康时提供重启。

### 14) 渠道状态告警

若 gateway 健康，doctor 会运行渠道状态探测并提供修复建议。

### 15) Supervisor 配置审计 + 修复

Doctor 检查已安装的 supervisor 配置（launchd/systemd/schtasks）是否缺失或过期默认值（例如 systemd network-online 依赖与重启延迟）。发现不匹配时会推荐更新，并可将 service 文件/任务重写为当前默认值。

注：
- `openclaw doctor` 在重写 supervisor 配置前会提示。
- `openclaw doctor --yes` 接受默认修复提示。
- `openclaw doctor --repair` 无提示应用推荐修复。
- `openclaw doctor --repair --force` 覆盖自定义 supervisor 配置。
- 可用 `openclaw gateway install --force` 强制全量重写。

### 16) Gateway 运行时 + 端口诊断

Doctor 检查服务运行时（PID、上次退出状态），并在服务已安装却未运行时提示。也会检查 gateway 端口（默认 `18789`）冲突并报告可能原因（gateway 已运行、SSH 隧道）。

### 17) Gateway 运行时最佳实践

Doctor 会在 gateway 服务运行于 Bun 或版本管理器 Node 路径（`nvm`、`fnm`、`volta`、`asdf` 等）时警告。WhatsApp + Telegram 渠道需要 Node，版本管理器路径在升级后可能失效，因为服务不加载 shell init。Doctor 会在可用时建议迁移到系统 Node 安装（Homebrew/apt/choco）。

### 18) 配置写入 + wizard 元数据

Doctor 会持久化任何配置变更，并写入 wizard 元数据记录此次 doctor 运行。

### 19) 工作区提示（备份 + memory 系统）

当缺少工作区记忆系统时，doctor 会提示，并在工作区未纳入 git 时给出备份建议。

完整工作区结构与 git 备份指南参见 [/concepts/agent-workspace](/zh/concepts/agent-workspace)。
