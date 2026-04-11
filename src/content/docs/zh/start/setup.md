---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "设置"
---

# 设置

<Note>如果您是第一次设置，请从 [入门指南](/en/start/getting-started) 开始。 有关新手引导的详细信息，请参阅 [新手引导 (CLI)](/en/start/wizard)。</Note>

## TL;DR

- **个性化配置位于仓库之外：** `~/.openclaw/workspace` (工作区) + `~/.openclaw/openclaw.json` (配置)。
- **Stable workflow:** install the macOS app; let it run the bundled Gateway(网关).
- **最新前沿工作流：** 通过 `pnpm gateway:watch` 自己运行 Gateway(网关)，然后让 macOS 应用以本地模式连接。

## Prereqs (from source)

- 推荐使用 Node 24（Node 22 LTS，目前为 `22.14+`，仍受支持）
- 首选 `pnpm`（或者如果您有意使用 [Bun 工作流](/en/install/bun)，则使用 Bun）
- Docker（可选；仅用于容器化设置/e2e — 请参阅 [Docker](/en/install/docker)）

## Tailoring strategy (so updates do not hurt)

如果您想要“100% 为我量身定制”*并且*轻松更新，请将您的自定义内容保留在：

- **配置：** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **工作区：** `~/.openclaw/workspace` (技能、提示词、记忆；将其设为私有 git 仓库)

Bootstrap once:

```bash
openclaw setup
```

From inside this repo, use the local CLI entry:

```bash
openclaw setup
```

如果您还没有全局安装，可以通过 `pnpm openclaw setup` 运行（如果您使用 Bun 工作流，则使用 `bun run openclaw setup`）。

## Run the Gateway(网关) from this repo

在 `pnpm build` 之后，您可以直接运行打包好的 CLI：

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## Stable workflow (macOS app first)

1. Install + launch **OpenClaw.app** (menu bar).
2. Complete the 新手引导/permissions checklist (TCC prompts).
3. Ensure Gateway(网关) is **Local** and running (the app manages it).
4. Link surfaces (example: WhatsApp):

```bash
openclaw channels login
```

5. Sanity check:

```bash
openclaw health
```

If 新手引导 is not available in your build:

- 运行 `openclaw setup`，然后 `openclaw channels login`，接着手动启动 Gateway(网关) (`openclaw gateway`)。

## Bleeding edge workflow (Gateway(网关) in a terminal)

Goal: work on the TypeScript Gateway(网关), get hot reload, keep the macOS app UI attached.

### 0) (Optional) Run the macOS app from source too

If you also want the macOS app on the bleeding edge:

```bash
./scripts/restart-mac.sh
```

### 1) Start the dev Gateway(网关)

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` 以监视模式运行网关，并在相关的源代码、配置和捆绑插件元数据更改时重新加载。

如果您有意使用 Bun 工作流，等效命令为：

```bash
bun install
bun run gateway:watch
```

### 2) 将 macOS 应用指向您正在运行的 Gateway(网关)

在 **OpenClaw.app** 中：

- 连接模式：**Local**
  应用将连接到配置端口上正在运行的网关。

### 3) 验证

- 应用内 Gateway(网关) 状态应显示 **“Using existing gateway …”**
- 或通过 CLI：

```bash
openclaw health
```

### 常见陷阱

- **端口错误：** Gateway(网关) WS 默认为 `ws://127.0.0.1:18789`；请保持应用和 CLI 在同一端口上。
- **状态存储位置：**
  - 渠道/提供商状态：`~/.openclaw/credentials/`
  - 模型身份验证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭证存储映射

调试身份验证或决定要备份的内容时使用此功能：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram 机器人令牌**：config/env 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接）
- **Discord 机器人令牌**：config/env 或 SecretRef（env/file/exec 提供程序）
- **Slack 令牌**：config/env（`channels.slack.*`）
- **配对允许列表**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账户）
- **模型身份验证配置文件**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **基于文件的机密负载（可选）**：`~/.openclaw/secrets.json`
- **传统 OAuth 导入**：`~/.openclaw/credentials/oauth.json`
  更多详情：[Security](/en/gateway/security#credential-storage-map)。

## 更新（不破坏你的设置）

- 将 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“你自己的东西”；不要将个人提示词/配置放入 `openclaw` 仓库中。
- 更新源代码：`git pull` + 你选择的包管理器安装步骤（默认为 `pnpm install`；Bun 工作流为 `bun install`）+ 继续使用匹配的 `gateway:watch` 命令。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户** 服务。默认情况下，systemd 会在注销/空闲时停止用户
服务，这会终止 Gateway(网关)。新手引导会尝试为你启用
lingering（可能会提示输入 sudo）。如果它仍然是关闭的，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于全天候运行或多用户服务器，请考虑使用 **系统**（system）服务而不是
用户服务（无需 lingering）。有关 systemd 的说明，请参阅 [Gateway(网关) runbook](/en/gateway)。

## 相关文档

- [Gateway(网关) runbook](/en/gateway)（标志、监督、端口）
- [Gateway(网关) configuration](/en/gateway/configuration)（配置架构 + 示例）
- [Discord](/en/channels/discord) 和 [Telegram](/en/channels/telegram)（回复标签 + replyToMode 设置）
- [OpenClaw assistant setup](/en/start/openclaw)
- [macOS app](/en/platforms/macos)（网关生命周期）
