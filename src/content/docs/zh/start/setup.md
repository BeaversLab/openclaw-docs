---
summary: "OpenClawOpenClaw 的高级设置和开发工作流"
read_when:
  - Setting up a new machine
  - You want "latest + greatest" without breaking your personal setup
title: "设置"
---

<Note>如果您是首次进行设置，请从 [入门指南](/zh/start/getting-startedCLI) 开始。 有关新手引导的详细信息，请参阅 [新手引导 (CLI)](/zh/start/wizard)。</Note>

## TL;DR

根据您希望更新频率以及是否想自行运行 Gateway(网关) 来选择设置工作流：

- **自定义配置位于仓库之外：** 将您的配置和工作区保留在 `~/.openclaw/openclaw.json` 和 `~/.openclaw/workspace/` 中，以便仓库更新不会触及它们。
- **Stable workflow (recommended for most):** 安装 macOS 应用程序并让它运行捆绑的 Gateway(网关)。
- **前沿工作流（开发版）：** 通过 Gateway(网关)`pnpm gateway:watch`macOS 自己运行 Gateway(网关)，然后让 macOS 应用以本地模式连接。

## Prereqs (from source)

- 推荐使用 Node 24（目前为 `22.16+` 的 Node 22 LTS 仍然受支持）
- 源码检出需要 `pnpm`OpenClaw。OpenClaw 在开发模式下从
  `extensions/*` pnpm 工作区包加载捆绑插件，因此根目录 `npm install`
  不会准备完整的源代码树。
- Docker（可选；仅用于容器化设置/e2e - 请参阅 [Docker](DockerDocker/en/install/docker)）

## Tailoring strategy (so updates do not hurt)

如果您想要“100% 为我定制”*并且*想要轻松更新，请将您的自定义内容保存在：

- **配置：** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **工作区：** `~/.openclaw/workspace`（技能、提示词、记忆；将其设为私有 git 仓库）

Bootstrap once:

```bash
openclaw setup
```

From inside this repo, use the local CLI entry:

```bash
openclaw setup
```

如果您尚未进行全局安装，请通过 `pnpm openclaw setup` 运行它。

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
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

`gateway:watch`Gateway(网关) 在命名的 tmux 会话中启动或重启 Gateway(网关) 监视进程，并从交互式终端自动附加。非交互式 Shell 保持分离状态并打印 `tmux attach -t openclaw-gateway-watch-main`；使用 `OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch` 使交互式运行保持分离，或使用 `pnpm gateway:watch:raw`Gateway(网关) 进入前台监视模式。当相关的源代码、配置和捆绑插件元数据发生变化时，监视器会重新加载。如果被监视的 Gateway(网关) 在启动期间退出，`gateway:watch` 将运行一次 `openclaw doctor --fix --non-interactive` 并重试；设置 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0` 可禁用该仅用于开发的修复过程。
`pnpm openclaw setup` 是针对全新检出的代码进行一次性本地配置/工作区初始化的步骤。
`pnpm gateway:watch` 不会重新构建 `dist/control-ui`，因此在 `ui/` 更改后请重新运行 `pnpm ui:build`，或者在开发 Control UI 时使用 `pnpm ui:dev`。

### 2) 将 macOS 应用指向您正在运行的 Gateway(网关)

在 **OpenClaw.app** 中：

- 连接模式：**本地 (Local)**
  应用将附加到配置端口上正在运行的 gateway。

### 3) 验证

- 应用内的 Gateway(网关) 状态应显示 **"Using existing gateway …"**
- 或通过 CLI：

```bash
openclaw health
```

### 常见陷阱

- **端口错误：** Gateway(网关) WS 默认为 Gateway(网关)`ws://127.0.0.1:18789`；请保持应用和 CLI 在同一端口上。
- **状态存储位置：**
  - 频道/提供商状态：`~/.openclaw/credentials/`
  - 模型认证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭证存储映射

调试认证或决定要备份的内容时请参考此信息：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接）
- **Discord bot token**：config/env 或 SecretRef（env/file/exec providers）
- **Slack tokens**: config/env (Slack`channels.slack.*`)
- **配对允许列表**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账户）
- **模型认证配置**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **文件支持的机密载荷（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：OAuth`~/.openclaw/credentials/oauth.json`
  更多详情：[安全](/zh/gateway/security#credential-storage-map)。

## 更新（不破坏您的设置）

- 将 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“您自己的内容”；不要将个人的提示词/配置放入 `openclaw` 仓库中。
- 更新源代码：`git pull` + `pnpm install` + 继续使用 `pnpm gateway:watch`。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户**服务。默认情况下，systemd 会在注销/空闲时停止用户
服务，这会终止 Gateway。新手引导会尝试为您
启用 linger（可能会提示输入 sudo）。如果仍然关闭，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于全天候运行或多用户服务器，请考虑使用 **系统**服务而不是
用户服务（无需 linger）。有关 systemd 的说明，请参阅 [Gateway 运维手册](<Gateway(网关)/en/gateway>)。

## 相关文档

- [Gateway 运维手册](<Gateway(网关)/en/gateway>)（标志、监控、端口）
- [Gateway 配置](<Gateway(网关)/en/gateway/configuration>)（配置架构 + 示例）
- [Discord](Discord/en/channels/discordTelegram) 和 [Telegram](/zh/channels/telegram)（回复标签 + replyToMode 设置）
- [OpenClaw 助手设置](OpenClaw/en/start/openclaw)
- [macOS 应用](macOS/en/platforms/macos)（Gateway 生命周期）
