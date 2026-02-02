---
summary: "设置指南：在保持个性化的同时，持续更新 OpenClaw"
read_when:
  - 配置新机器
  - 想要“最新 + 最佳”但不破坏个人设置
title: "Setup"
---

# 设置

最后更新：2026-01-01

## TL;DR
- **个性化配置放在仓库之外：** `~/.openclaw/workspace`（工作区） + `~/.openclaw/openclaw.json`（配置）。
- **稳定流程：** 安装 macOS 应用；由它运行内置 Gateway。
- **前沿流程：** 自己用 `pnpm gateway:watch` 跑 Gateway，然后让 macOS 应用在本地模式下接入。

## 前置条件（从源码）
- Node `>=22`
- `pnpm`
- Docker（可选；仅容器化配置/端到端测试需要 — 见 [Docker](/zh/install/docker)）

## 定制策略（避免更新伤害）

如果你想要“完全贴合我自己”*并且*容易更新，请把自定义放在：

- **配置：** `~/.openclaw/openclaw.json`（JSON/类 JSON5）
- **工作区：** `~/.openclaw/workspace`（技能、提示词、记忆；建议建成私有 git 仓库）

初始化一次：

```bash
openclaw setup
```

在本仓库内也用本地 CLI 入口：

```bash
openclaw setup
```

如果尚未全局安装，可用 `pnpm openclaw setup` 运行。

## 稳定流程（优先 macOS 应用）

1) 安装并启动 **OpenClaw.app**（菜单栏）。
2) 完成引导/权限清单（TCC 提示）。
3) 确认 Gateway 为 **Local** 且正在运行（应用托管）。
4) 连接入口（示例：WhatsApp）：

```bash
openclaw channels login
```

5) 健康检查：

```bash
openclaw health
```

如果你的构建中没有引导：
- 运行 `openclaw setup`，再运行 `openclaw channels login`，然后手动启动 Gateway（`openclaw gateway`）。

## 前沿流程（终端运行 Gateway）

目标：在 TypeScript Gateway 上开发，热重载，并让 macOS 应用 UI 接入。

### 0)（可选）也从源码运行 macOS 应用

如果你也要跑最新版 macOS 应用：

```bash
./scripts/restart-mac.sh
```

### 1) 启动开发 Gateway

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 会以 watch 模式运行，并在 TypeScript 变更时重载。

### 2) 让 macOS 应用连接到运行中的 Gateway

在 **OpenClaw.app** 中：

- Connection Mode：**Local**
应用会连接到配置端口上的网关。

### 3) 验证

- 应用内 Gateway 状态应显示 **“Using existing gateway …”**
- 或通过 CLI：

```bash
openclaw health
```

### 常见坑
- **端口错误：** Gateway WS 默认 `ws://127.0.0.1:18789`；保持应用和 CLI 使用同一端口。
- **状态存放位置：**
  - 凭据：`~/.openclaw/credentials/`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭据存储地图

排查认证或决定备份内容时使用：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`
- **Discord bot token**：config/env（暂不支持 token 文件）
- **Slack tokens**：config/env（`channels.slack.*`）
- **配对 allowlist**：`~/.openclaw/credentials/<channel>-allowFrom.json`
- **模型认证档案**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`
更多细节：[安全](/zh/gateway/security#credential-storage-map)。

## 更新（不破坏你的配置）

- 把 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“你的内容”；不要把个人提示词/配置放进 `openclaw` 仓库。
- 更新源码：`git pull` + `pnpm install`（lockfile 变化时）+ 继续使用 `pnpm gateway:watch`。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **user** 服务。默认情况下，systemd 会在登出/空闲时停止 user
服务，这会杀掉 Gateway。引导会尝试为你启用 lingering（可能需要 sudo）。如果仍未开启，请运行：

```bash
sudo loginctl enable-linger $USER
```

对常驻或多用户服务器，考虑使用 **system** 服务而非 user 服务（无需 lingering）。
systemd 相关说明参见 [Gateway 运行手册](/zh/gateway)。

## 相关文档

- [Gateway 运行手册](/zh/gateway)（参数、守护、端口）
- [Gateway 配置](/zh/gateway/configuration)（配置结构 + 示例）
- [Discord](/zh/channels/discord) 和 [Telegram](/zh/channels/telegram)（reply 标签 + replyToMode 设置）
- [OpenClaw 助手设置](/zh/start/openclaw)
- [macOS 应用](/zh/platforms/macos)（网关生命周期）
