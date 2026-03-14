---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "设置"
---

# 设置

<Note>
如果您是首次设置，请从[入门指南](/zh/en/start/getting-started)开始。
有关向导的详细信息，请参阅[入职向导](/zh/en/start/向导)。
</Note>

最后更新：2026-01-01

## 简述

- **定制配置位于仓库之外：** `~/.openclaw/workspace` (工作区) + `~/.openclaw/openclaw.json` (配置)。
- **稳定工作流：** 安装 macOS 应用；让它运行内置的 Gateway 网关。
- **最新前沿工作流：** 通过 `pnpm gateway:watch` 自己运行 Gateway 网关，然后让 macOS 应用以本地模式连接。

## 先决条件（从源码）

- Node `>=22`
- `pnpm`
- Docker（可选；仅用于容器化设置/e2e — 请参阅 [Docker](/zh/en/install/docker)）

## 定制策略（以免更新造成影响）

如果您想要“100% 为我定制” _并且_ 能够轻松更新，请将您的定制内容保留在：

- **配置：** `~/.openclaw/openclaw.json` (JSON/JSON5-like)
- **工作区：** `~/.openclaw/workspace` (技能、提示词、记忆；将其设为私有 git 仓库)

一次性引导：

```bash
openclaw setup
```

在此仓库内，使用本地 CLI 入口：

```bash
openclaw setup
```

如果你还没有全局安装，可以通过 `pnpm openclaw setup` 运行它。

## 从此仓库运行 Gateway 网关

在 `pnpm build` 之后，你可以直接运行打包好的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 稳定工作流（macOS 应用优先）

1. 安装并启动 **OpenClaw.app**（菜单栏）。
2. 完成入职/权限检查清单（TCC 提示）。
3. 确保 Gateway 网关 处于 **本地** 状态并正在运行（由应用管理）。
4. 连接表面（例如：WhatsApp）：

```bash
openclaw channels login
```

5. 健全性检查：

```bash
openclaw health
```

如果您的构建中不提供入职流程：

- 运行 `openclaw setup`，然后 `openclaw channels login`，接着手动启动 Gateway 网关 (`openclaw gateway`)。

## 前沿工作流（Gateway 网关 在终端中）

目标：开发 TypeScript Gateway 网关，获取热重载，保持连接 macOS 应用 UI。

### 0) （可选）也从源码运行 macOS 应用

如果您同时也希望 macOS 应用处于前沿版本：

```bash
./scripts/restart-mac.sh
```

### 1) 启动开发版 Gateway 网关

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 在监视模式下运行 gateway，并在 TypeScript 更改时重新加载。

### 2) 指向 macOS 应用到你运行的 Gateway 网关

在 **OpenClaw.app** 中：

- 连接模式：**Local (本地)**
  应用将附加到配置端口上运行的 gateway。

### 3) 验证

- 应用内 Gateway 网关 状态应显示 **“Using existing gateway …”**
- 或通过 CLI：

```bash
openclaw health
```

### 常见陷阱

- **端口错误：** Gateway 网关 WS 默认为 `ws://127.0.0.1:18789`；保持应用和 CLI 在同一端口。
- **状态存储位置：**
  - 凭证： `~/.openclaw/credentials/`
  - 会话： `~/.openclaw/agents/<agentId>/sessions/`
  - 日志： `/tmp/openclaw/`

## 凭证存储映射

在调试认证或决定备份内容时使用此表：

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**: config/env 或 `channels.telegram.tokenFile` (仅限常规文件；拒绝符号链接)
- **Discord bot token**: config/env 或 SecretRef (env/file/exec 提供者)
- **Slack tokens**: config/env (`channels.slack.*`)
- **配对允许列表 (Pairing allowlists)**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (默认账户)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (非默认账户)
- **模型认证配置文件**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **文件支持的机密负载（可选）**: `~/.openclaw/secrets.json`
- **旧版 OAuth 导入**: `~/.openclaw/credentials/oauth.json`
  更多详情：[Security](/zh/en/gateway/security#credential-storage-map)。

## 更新（不破坏你的设置）

- 将 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“你自己的东西”；不要将个人的提示词/配置放入 `openclaw` 仓库中。
- 更新源代码：`git pull` + `pnpm install`（当 lockfile 改变时）并继续使用 `pnpm gateway:watch`。

## Linux (systemd 用户服务)

Linux 安装使用 systemd **用户** 服务。默认情况下，systemd 在注销/空闲时停止用户
服务，这会杀死 Gateway 网关。入职向导会尝试为你
启用 lingering (可能需要 sudo)。如果仍然关闭，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于全天候或多用户服务器，请考虑使用 **系统** 服务而不是
用户服务 (不需要 lingering)。有关 systemd 的说明，请参阅 [Gateway 网关 运维手册](/zh/en/gateway)。

## 相关文档

- [Gateway 网关 运维手册](/zh/en/gateway) (标志、监控、端口)
- [Gateway 网关 configuration](/zh/en/gateway/configuration) （配置架构 + 示例）
- [Discord](/zh/en/channels/discord) 和 [Telegram](/zh/en/channels/telegram) （回复标签 + replyToMode 设置）
- [OpenClaw assistant setup](/zh/en/start/openclaw)
- [macOS app](/zh/en/platforms/macos) （网关生命周期）

import zh from '/components/footer/zh.mdx';

<zh />
