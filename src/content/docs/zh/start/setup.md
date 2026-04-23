---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "设置"
---

# 设置

<Note>如果您是首次设置，请从[入门指南](/zh/start/getting-started)开始。 有关新手引导的详细信息，请参阅[新手引导 (CLI)](/zh/start/wizard)。</Note>

## TL;DR

- **个性化配置位于仓库之外：** `~/.openclaw/workspace` (工作区) + `~/.openclaw/openclaw.json` (配置)。
- **Stable workflow:** install the macOS app; let it run the bundled Gateway(网关).
- **最新前沿工作流：** 通过 `pnpm gateway:watch` 自己运行 Gateway(网关)，然后让 macOS 应用以本地模式连接。

## Prereqs (from source)

- 推荐使用 Node 24（Node 22 LTS，目前为 `22.14+`，仍受支持）
- `pnpm` 首选（或者如果您有意使用 [Bun 工作流](/zh/install/bun)，则使用 Bun）
- Docker（可选；仅用于容器化设置/e2e 测试 — 请参阅 [Docker](/zh/install/docker)）

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
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

`gateway:watch` 在监视模式下运行 Gateway，并在相关的源代码、配置和捆绑插件元数据更改时重新加载。
`pnpm openclaw setup` 是针对新检出的代码进行的一次性本地配置/工作区初始化步骤。
`pnpm gateway:watch` 不会重新构建 `dist/control-ui`，因此在 `ui/` 更改后请重新运行 `pnpm ui:build`，或者在开发 Control UI 时使用 `pnpm ui:dev`。

如果您有意使用 Bun 工作流，等效命令为：

```bash
bun install
# First run only (or after resetting local OpenClaw config/workspace)
bun run openclaw setup
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

- **端口错误：** Gateway WS 默认使用 `ws://127.0.0.1:18789`；请确保应用程序和 CLI 处于同一端口。
- **状态存储位置：**
  - Channel/提供商 状态：`~/.openclaw/credentials/`
  - 模型认证配置文件：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭证存储映射

调试身份验证或决定要备份的内容时使用此功能：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`（仅限常规文件；拒绝符号链接）
- **Discord 机器人令牌**：config/env 或 SecretRef（env/file/exec 提供程序）
- **Slack tokens**：config/env (`channels.slack.*`)
- **配对允许列表**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账户）
- **Model auth profiles**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **文件支持的秘密载荷（可选）**：`~/.openclaw/secrets.json`
- **旧版 OAuth 导入**：`~/.openclaw/credentials/oauth.json`
  更多详细信息：[安全性](/zh/gateway/security#credential-storage-map)。

## 更新（不破坏你的设置）

- 请将 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“您自己的东西”；不要将个人的提示词/配置放入 `openclaw` 仓库中。
- 更新源码：`git pull` + 您选择的包管理器安装步骤（默认为 `pnpm install`；Bun 工作流则为 `bun install`）+ 继续使用匹配的 `gateway:watch` 命令。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户** 服务。默认情况下，systemd 会在注销/空闲时停止用户
服务，这会终止 Gateway(网关)。新手引导会尝试为你启用
lingering（可能会提示输入 sudo）。如果它仍然是关闭的，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于全天候或多用户服务器，请考虑使用 **system** 服务而不是用户服务（不需要 lingering）。有关 systemd 的说明，请参阅 [Gateway(网关) 运维手册](/zh/gateway)。

## 相关文档

- [Gateway(网关) 运维手册](/zh/gateway)（标志、监管、端口）
- [Gateway(网关) 配置](/zh/gateway/configuration)（配置架构 + 示例）
- [Discord](/zh/channels/discord) 和 [Telegram](/zh/channels/telegram)（回复标签 + replyToMode 设置）
- [OpenClaw 助手设置](/zh/start/openclaw)
- [macOS 应用](/zh/platforms/macos)（网关生命周期）
