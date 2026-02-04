---
summary: "将 OpenClaw 安装从一台机器迁移到另一台"
title: "迁移指南"
read_when:
  - 你要把 OpenClaw 迁移到新笔记本/服务器
  - 你希望保留会话、认证与频道登录（WhatsApp 等）
---

# 将 OpenClaw 迁移到新机器

本指南将 OpenClaw Gateway 从一台机器迁移到另一台，**无需重新 onboarding**。

概念上很简单：

- 复制 **state 目录**（`$OPENCLAW_STATE_DIR`，默认 `~/.openclaw/`）——包含配置、认证、会话和频道状态。
- 复制 **workspace**（默认 `~/.openclaw/workspace/`）——包含你的 agent 文件（memory、prompts 等）。

但常见坑在 **profiles**、**权限** 和 **不完整复制** 上。

## 开始前（你要迁移的内容）

### 1) 确定 state 目录

多数安装使用默认：

- **State 目录：** `~/.openclaw/`

但如果你使用了：

- `--profile <name>`（通常变为 `~/.openclaw-<profile>/`）
- `OPENCLAW_STATE_DIR=/some/path`

如果不确定，在**旧机器**上运行：

```bash
openclaw status
```

看输出中是否提到 `OPENCLAW_STATE_DIR` / profile。如果你运行多个 gateway，请对每个 profile 重复检查。

### 2) 确定 workspace

常见默认：

- `~/.openclaw/workspace/`（推荐 workspace）
- 你自定义的目录

workspace 里会有 `MEMORY.md`、`USER.md` 和 `memory/*.md` 等文件。

### 3) 理解哪些会被保留

如果你**同时**复制 state 目录和 workspace，会保留：

- Gateway 配置（`openclaw.json`）
- Auth profiles / API keys / OAuth tokens
- 会话历史 + agent 状态
- 频道状态（如 WhatsApp 登录/会话）
- 你的 workspace 文件（memory、skills 记录等）

如果你**只**复制 workspace（例如用 Git），**不会**保留：

- 会话
- 凭据
- 频道登录

这些都在 `$OPENCLAW_STATE_DIR` 下。

## 迁移步骤（推荐）

### Step 0 — 先备份（旧机器）

在**旧机器**上先停止 gateway，避免复制过程中有文件变动：

```bash
openclaw gateway stop
```

（可选但推荐）打包 state 目录与 workspace：

```bash
# 如果使用 profile 或自定义路径，调整下面路径
cd ~
tar -czf openclaw-state.tgz .openclaw

tar -czf openclaw-workspace.tgz .openclaw/workspace
```

如果你有多个 profiles/state 目录（例如 `~/.openclaw-main`、`~/.openclaw-work`），请分别打包。

### Step 1 — 在新机器上安装 OpenClaw

在**新机器**上安装 CLI（需要时先装 Node）：

- 见：[安装](/zh/install)

此时即便 onboarding 生成了新的 `~/.openclaw/` 也没关系，下一步会覆盖。

### Step 2 — 复制 state 目录 + workspace 到新机器

复制**两者**：

- `$OPENCLAW_STATE_DIR`（默认 `~/.openclaw/`）
- workspace（默认 `~/.openclaw/workspace/`）

常见方式：

- 用 `scp` 传 tar 包并解压
- 通过 SSH 的 `rsync -a`
- 外接硬盘

复制后请确认：

- 隐藏目录已包含（如 `.openclaw/`）
- 文件属主与运行 gateway 的用户一致

### Step 3 — 运行 Doctor（迁移 + 服务修复）

在**新机器**上：

```bash
openclaw doctor
```

Doctor 是“安全且无聊”的命令，会修复服务、应用配置迁移，并提示不匹配问题。

然后：

```bash
openclaw gateway restart
openclaw status
```

## 常见坑（及避免方法）

### 坑：profile / state-dir 不匹配

如果旧 gateway 用 profile（或 `OPENCLAW_STATE_DIR`），而新 gateway 用了不同的，
你会看到：

- 配置修改不生效
- 频道缺失 / 退出登录
- 会话历史为空

修复：使用**相同**的 profile/state dir 来运行 gateway/服务，然后重新运行：

```bash
openclaw doctor
```

### 坑：只复制 `openclaw.json`

`openclaw.json` 不够。很多 provider 状态保存在：

- `$OPENCLAW_STATE_DIR/credentials/`
- `$OPENCLAW_STATE_DIR/agents/<agentId>/...`

务必迁移整个 `$OPENCLAW_STATE_DIR` 文件夹。

### 坑：权限 / 属主

如果你用 root 复制或更换了用户，gateway 可能无法读取凭据/会话。

修复：确保 state 目录 + workspace 的属主是运行 gateway 的用户。

### 坑：在 remote/local 模式之间迁移

- 如果你的 UI（WebUI/TUI）指向**远程** gateway，那么远程主机才拥有会话存储 + workspace。
- 迁移你的笔记本并不会迁移远程 gateway 的状态。

若你处于 remote 模式，请迁移**gateway 主机**。

### 坑：备份中的 secrets

`$OPENCLAW_STATE_DIR` 包含敏感信息（API keys、OAuth tokens、WhatsApp 凭据）。请把备份当作生产密钥处理：

- 加密存储
- 避免通过不安全渠道分享
- 若怀疑泄露，及时轮换密钥

## 验证清单

在新机器上确认：

- `openclaw status` 显示 gateway 正在运行
- 频道仍已连接（如 WhatsApp 不需要重新配对）
- Dashboard 能打开并显示已有会话
- workspace 文件（memory、configs）存在

## 相关

- [诊断](/zh/gateway/doctor)
- [Gateway 故障排查](/zh/gateway/troubleshooting)
- [OpenClaw 数据存在哪里？](/zh/help/faq#where-does-openclaw-store-its-data)
