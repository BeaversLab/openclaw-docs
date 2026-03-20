---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - 在新机器上进行设置
  - 您希望在获得“最新+最棒”功能的同时，不破坏您的个人设置
title: "设置"
---

# 设置

<Note>
  如果您是首次进行设置，请从[入门指南](/zh/start/getting-started)开始。
  有关新手引导的详细信息，请参阅[新手引导 (CLI)](/zh/start/wizard)。
</Note>

最后更新时间：2026-01-01

## 简而言之

- **自定义配置位于仓库之外：** `~/.openclaw/workspace` (工作区) + `~/.openclaw/openclaw.json` (配置)。
- **稳定工作流：** 安装 macOS 应用；让它运行捆绑的 Gateway(网关)。
- **前沿工作流：** 通过 `pnpm gateway:watch` 自己运行 Gateway(网关)，然后让 macOS 应用以本地模式附加连接。

## 先决条件（从源码）

- Node `>=22`
- `pnpm`
- Docker（可选；仅用于容器化设置/e2e — 请参阅 [Docker](/zh/install/docker)）

## 自定义策略（以免更新造成影响）

如果您希望“100% 为我定制” _并且_ 能够轻松更新，请将您的自定义内容保留在：

- **配置：** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **工作区：** `~/.openclaw/workspace` (技能、提示词、记忆；将其设为私有 git 仓库)

一次性引导：

```bash
openclaw setup
```

在此仓库内，使用本地 CLI 入口点：

```bash
openclaw setup
```

如果您尚未进行全局安装，请通过 `pnpm openclaw setup` 运行它。

## 从此仓库运行 Gateway(网关)

在 `pnpm build` 之后，您可以直接运行打包的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## 稳定工作流（首先使用 macOS 应用）

1. 安装并启动 **OpenClaw.app**（菜单栏）。
2. 完成新手引导/权限检查清单（TCC 提示）。
3. 确保 Gateway(网关) 处于 **Local（本地）** 模式并正在运行（由应用管理）。
4. 关联界面（例如：WhatsApp）：

```bash
openclaw channels login
```

5. 完整性检查：

```bash
openclaw health
```

如果您的构建版本中没有新手引导：

- 运行 `openclaw setup`，然后运行 `openclaw channels login`，接着手动启动 Gateway(网关) (`openclaw gateway`)。

## 前沿工作流（在终端中运行 Gateway(网关)）

目标：开发 TypeScript Gateway(网关)，获取热重载，并保持 macOS 应用 UI 附加连接。

### 0) （可选）也从源码运行 macOS 应用

如果您还希望 macOS 应用处于前沿版本：

```bash
./scripts/restart-mac.sh
```

### 1) 启动开发版 Gateway(网关)

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 在监视模式下运行网关，并在相关源代码、配置和捆绑插件元数据更改时重新加载。

### 2) 将 macOS 应用指向您正在运行的 Gateway(网关)

在 **OpenClaw.app** 中：

- 连接模式：**本地 (Local)**
  应用将附加到配置端口上运行的网关。

### 3) 验证

- 应用内的 Gateway(网关) 状态应显示 **“Using existing gateway …”**
- 或通过 CLI：

```bash
openclaw health
```

### 常见陷阱

- **端口错误：** Gateway(网关) WS 默认为 `ws://127.0.0.1:18789`；保持应用和 CLI 在同一端口上。
- **状态存储位置：**
  - 凭证：`~/.openclaw/credentials/`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭证存储映射

在调试身份验证或决定要备份的内容时使用此功能：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接）
- **Discord bot token**：config/env 或 SecretRef（env/file/exec providers）
- **Slack tokens**：config/env (`channels.slack.*`)
- **配对允许列表：**
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认帐户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认帐户）
- **Model auth profiles**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **File-backed secrets payload (optional)**：`~/.openclaw/secrets.json`
- **Legacy OAuth import**：`~/.openclaw/credentials/oauth.json`
  更多详情：[安全](/zh/gateway/security#credential-storage-map)。

## 更新（而不破坏您的设置）

- 将 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“您自己的内容”；不要将个人的提示词/配置放入 `openclaw` 仓库中。
- 更新源代码：`git pull` + `pnpm install`（当锁文件更改时）+ 继续使用 `pnpm gateway:watch`。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户**服务。默认情况下，systemd 在注销/空闲时停止用户
服务，这会终止 Gateway(网关)。新手引导会尝试
为您启用 lingering（可能会提示输入 sudo）。如果仍然关闭，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于全天候或多用户服务器，请考虑使用 **system** 服务而不是用户服务（不需要 lingering）。有关 systemd 的说明，请参阅 [Gateway(网关) runbook](/zh/gateway)。

## 相关文档

- [Gateway(网关) runbook](/zh/gateway)（标志、监督、端口）
- [Gateway(网关) configuration](/zh/gateway/configuration)（配置架构 + 示例）
- [Discord](/zh/channels/discord) 和 [Telegram](/zh/channels/telegram)（回复标签 + replyToMode 设置）
- [OpenClaw assistant setup](/zh/start/openclaw)
- [macOS app](/zh/platforms/macos)（网关生命周期）

import zh from "/components/footer/zh.mdx";

<zh />
