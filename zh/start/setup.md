---
summary: "OpenClaw 的高级设置和开发工作流"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "设置"
---

# 设置

<Note>
  如果是首次设置，请从[入门指南](/zh/start/getting-started)开始。
  有关新手引导的详细信息，请参阅[新手引导 (CLI)](/zh/start/wizard)。
</Note>

## TL;DR

- **Tailoring lives outside the repo:** `~/.openclaw/workspace` (workspace) + `~/.openclaw/openclaw.json` (config).
- **Stable workflow:** install the macOS app; let it run the bundled Gateway(网关).
- **Bleeding edge workflow:** run the Gateway(网关) yourself via `pnpm gateway:watch`, then let the macOS app attach in Local mode.

## Prereqs (from source)

- 推荐 Node 24（Node 22 LTS，目前为 `22.16+`，仍受支持）
- `pnpm`
- Docker（可选；仅用于容器化设置/e2e — 请参阅 [Docker](/zh/install/docker)）

## Tailoring strategy (so updates do not hurt)

如果您想要“100% 为我量身定制”*并且*轻松更新，请将您的自定义内容保留在：

- **Config:** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **Workspace:** `~/.openclaw/workspace` (skills, prompts, memories; make it a private git repo)

Bootstrap once:

```bash
openclaw setup
```

From inside this repo, use the local CLI entry:

```bash
openclaw setup
```

If you don’t have a global install yet, run it via `pnpm openclaw setup`.

## Run the Gateway(网关) from this repo

After `pnpm build`, you can run the packaged CLI directly:

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

- Run `openclaw setup`, then `openclaw channels login`, then start the Gateway(网关) manually (`openclaw gateway`).

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

`gateway:watch` runs the gateway in watch mode and reloads on relevant source,
config, and bundled-plugin metadata changes.

### 2) Point the macOS app at your running Gateway(网关)

In **OpenClaw.app**:

- Connection Mode: **Local**
  The app will attach to the running gateway on the configured port.

### 3) Verify

- In-app Gateway(网关) status should read **“Using existing gateway …”**
- Or via CLI:

```bash
openclaw health
```

### Common footguns

- **Wrong port:** Gateway(网关) WS 默认为 `ws://127.0.0.1:18789`；请确保应用和 CLI 使用相同的端口。
- **Where state lives:**
  - 凭证：`~/.openclaw/credentials/`
  - 会话：`~/.openclaw/agents/<agentId>/sessions/`
  - 日志：`/tmp/openclaw/`

## 凭证存储映射

在调试认证或决定备份内容时请参考此表：

- **WhatsApp**：`~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Telegram bot token**：config/env 或 `channels.telegram.tokenFile`（仅限常规文件；不接受符号链接）
- **Discord bot token**：config/env 或 SecretRef（env/file/exec 提供者）
- **Slack tokens**：config/env（`channels.slack.*`）
- **配对允许列表**：
  - `~/.openclaw/credentials/<channel>-allowFrom.json`（默认账户）
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json`（非默认账户）
- **模型认证配置**：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **文件支持的机密负载（可选）**：`~/.openclaw/secrets.json`
- **传统 OAuth 导入**：`~/.openclaw/credentials/oauth.json`
  更多详情：[Security](/zh/gateway/security#credential-storage-map)。

## 更新（不破坏您的设置）

- 将 `~/.openclaw/workspace` 和 `~/.openclaw/` 视为“您自己的内容”；不要将个人的提示词/配置放入 `openclaw` 仓库中。
- 更新源代码：`git pull` + `pnpm install`（当锁定文件更改时）+ 继续使用 `pnpm gateway:watch`。

## Linux（systemd 用户服务）

Linux 安装使用 systemd **用户**服务。默认情况下，systemd 会在注销/空闲时停止用户服务，这会终止 Gateway(网关)。新手引导会尝试为您启用 lingering（可能会提示输入 sudo）。如果仍然关闭，请运行：

```bash
sudo loginctl enable-linger $USER
```

对于常驻或多用户服务器，请考虑使用 **系统**服务而不是用户服务（不需要 lingering）。有关 systemd 的说明，请参阅 [Gateway(网关) runbook](/zh/gateway)。

## 相关文档

- [Gateway(网关) runbook](/zh/gateway)（标志、监管、端口）
- [Gateway(网关) configuration](/zh/gateway/configuration)（配置架构 + 示例）
- [Discord](/zh/channels/discord) 和 [Telegram](/zh/channels/telegram)（回复标签 + replyToMode 设置）
- [OpenClaw assistant setup](/zh/start/openclaw)
- [macOS 应用](/zh/platforms/macos)（网关生命周期）

import zh from "/components/footer/zh.mdx";

<zh />
