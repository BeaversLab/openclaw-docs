---
summary: "将 OpenClaw 安装从一台机器迁移（move，即 migrate）到另一台机器"
read_when:
  - 您正在将 OpenClaw 迁移到新的笔记本电脑/服务器
  - 您希望保留会话、身份验证和渠道登录信息（WhatsApp 等）
title: "迁移指南"
---

# 将 OpenClaw 迁移到新机器

本指南将 OpenClaw Gateway 从一台机器迁移到另一台机器，**无需重做新手引导**。

从概念上讲，迁移很简单：

- 复制 **状态目录**（`$OPENCLAW_STATE_DIR`，默认：`~/.openclaw/`）——其中包括配置、身份验证、会话和渠道状态。
- 复制您的 **工作区**（默认为 `~/.openclaw/workspace/`）——其中包括您的代理文件（memory、prompts 等）。

但是，关于 **profiles**、**权限** 和 **部分复制** 存在一些常见的陷阱。

## 开始之前（您正在迁移什么）

### 1) 确定您的状态目录

大多数安装使用默认设置：

- **状态目录：** `~/.openclaw/`

但如果您使用以下方式，可能会有所不同：

- `--profile <name>`（通常会变成 `~/.openclaw-<profile>/`）
- `OPENCLAW_STATE_DIR=/some/path`

如果您不确定，请在 **旧** 机器上运行：

```bash
openclaw status
```

在输出中查找 `OPENCLAW_STATE_DIR` / profile 的提及。如果您运行多个网关，请对每个 profile 重复此操作。

### 2) 确定您的工作区

常见的默认值：

- `~/.openclaw/workspace/`（推荐的工作区）
- 您创建的自定义文件夹

您的工作区是 `MEMORY.md`、`USER.md` 和 `memory/*.md` 等文件所在的位置。

### 3) 了解您将保留的内容

如果您复制状态目录和工作区 **两者**，您将保留：

- Gateway(网关) 配置（`openclaw.json`）
- 身份验证 profiles / API 密钥 / OAuth 令牌
- 会话历史 + 代理状态
- 渠道状态（例如 WhatsApp 登录/会话）
- 您的工作区文件（memory、skills notes 等）

如果您 **仅** 复制工作区（例如，通过 Git），您将 **不会** 保留：

- 会话
- 凭据
- 渠道登录信息

这些位于 `$OPENCLAW_STATE_DIR` 下。

## 迁移步骤（推荐）

### 步骤 0 - 进行备份（旧机器）

在 **旧** 机器上，先停止网关，以免文件在复制过程中发生变化：

```bash
openclaw gateway stop
```

（可选但推荐）归档状态目录和工作区：

```bash
# Adjust paths if you use a profile or custom locations
cd ~
tar -czf openclaw-state.tgz .openclaw

tar -czf openclaw-workspace.tgz .openclaw/workspace
```

如果您有多个配置文件/状态目录（例如 `~/.openclaw-main`、`~/.openclaw-work`），请分别将它们归档。

### 步骤 1 - 在新机器上安装 OpenClaw

在**新**机器上，安装 CLI（如果需要，同时也安装 Node）：

- 参见：[安装](/zh/install)

在此阶段，如果新手引导创建了一个新的 `~/.openclaw/`，这没关系——您将在下一步中覆盖它。

### 步骤 2 - 将状态目录和工作区复制到新机器

复制**两者**：

- `$OPENCLAW_STATE_DIR`（默认为 `~/.openclaw/`）
- 您的工作区（默认为 `~/.openclaw/workspace/`）

常用方法：

- `scp` tarball 并解压
- 通过 SSH `rsync -a`
- 外部驱动器

复制后，请确保：

- 包含了隐藏目录（例如 `.openclaw/`）
- 文件所有权对于运行网关的用户是正确的

### 步骤 3 - 运行 Doctor（迁移和服务修复）

在**新**机器上：

```bash
openclaw doctor
```

Doctor 是一个“安全无聊”的命令。它会修复服务、应用配置迁移，并警告不匹配的情况。

然后：

```bash
openclaw gateway restart
openclaw status
```

## 常见陷阱（以及如何避免它们）

### 陷阱：配置文件/状态目录不匹配

如果您使用配置文件（或 `OPENCLAW_STATE_DIR`）运行旧网关，而新网关使用的是不同的配置，您将会看到以下症状：

- 配置更改未生效
- 频道丢失/已登出
- 空的会话历史

修复方法：使用您迁移的**相同**配置文件/状态目录运行网关/服务，然后重新运行：

```bash
openclaw doctor
```

### 陷阱：仅复制 `openclaw.json`

`openclaw.json` 是不够的。许多提供程序将状态存储在以下位置：

- `$OPENCLAW_STATE_DIR/credentials/`
- `$OPENCLAW_STATE_DIR/agents/<agentId>/...`

请始终迁移整个 `$OPENCLAW_STATE_DIR` 文件夹。

### 陷阱：权限/所有权

如果您以 root 身份复制或更改了用户，网关可能无法读取凭据/会话。

修复方法：确保状态目录和工作区归运行网关的用户所有。

### 陷阱：在远程/本地模式之间迁移

- 如果您的 UI（WebUI/TUI）指向**远程**网关，则远程主机拥有会话存储和工作区。
- 迁移笔记本电脑不会移动远程网关的状态。

如果您处于远程模式，请迁移 **网关主机**。

### 陷阱：备份中的机密信息

`$OPENCLAW_STATE_DIR` 包含机密信息（API 密钥、OAuth 令牌、WhatsApp 凭据）。请像对待生产环境机密信息一样对待备份：

- 加密存储
- 避免通过不安全的渠道共享
- 如果怀疑泄露，请轮换密钥

## 验证清单

在新机器上，确认：

- `openclaw status` 显示网关正在运行
- 您的频道仍然连接（例如 WhatsApp 不需要重新配对）
- 仪表板打开并显示现有会话
- 您的工作区文件（记忆、配置）都存在

## 相关

- [Doctor](/zh/gateway/doctor)
- [Gateway(网关) 故障排除](/zh/gateway/troubleshooting)
- [OpenClaw 将其数据存储在哪里？](/zh/help/faq#where-does-openclaw-store-its-data)

import en from "/components/footer/en.mdx";

<en />
