---
summary: "CLI 引导向导：网关、工作区、渠道和技能的引导式设置"
read_when:
  - "Running or configuring the onboarding wizard"
  - "Setting up a new machine"
title: "引导向导"
---

# 引导向导（CLI）

引导向导是 **推荐** 的 OpenClaw 安装方式（macOS、Linux，或 Windows 通过 WSL2；强烈推荐）。
它会在一次引导流程中配置本地网关或远程网关连接，以及渠道、技能和工作区默认值。

主入口：

```bash
openclaw onboard
```

最快的第一次聊天：打开 Control UI（无需渠道配置）。运行
`openclaw dashboard` 并在浏览器里聊天。文档：[仪表板](/zh/web/dashboard)。

后续重新配置：

```bash
openclaw configure
```

推荐：设置 Brave Search API key 以便代理使用 `web_search`
（`web_fetch` 无需 key）。最简单路径：`openclaw configure --section web`
会写入 `tools.web.search.apiKey`。文档：[Web 工具](/zh/tools/web)。

## QuickStart vs Advanced

向导会从 **QuickStart**（默认值）与 **Advanced**（完全控制）开始。

**QuickStart** 保持默认：

- 本地网关（loopback）
- 工作区默认值（或已有工作区）
- 网关端口 **18789**
- 网关认证 **Token**（自动生成，即使是 loopback）
- Tailscale 暴露 **关闭**
- Telegram + WhatsApp 私聊默认 **allowlist**（会提示输入手机号）

**Advanced** 会展示每一步（模式、工作区、网关、渠道、守护进程、技能）。

## 向导会做什么

**本地模式（默认）** 会引导你完成：

- 模型/认证（OpenAI Code (Codex) 订阅 OAuth，Anthropic API key（推荐）或 setup-token（粘贴），以及 MiniMax/GLM/Moonshot/AI Gateway 选项）
- 工作区位置 + 引导文件
- 网关设置（端口/绑定/认证/tailscale）
- 渠道（Telegram、WhatsApp、Discord、Google Chat、Mattermost（插件）、Signal）
- 守护进程安装（LaunchAgent / systemd 用户单元）
- 健康检查
- 技能（推荐）

**远程模式** 仅配置本地客户端连接到其他地方的网关。
它 **不会** 在远程主机上安装或修改任何内容。

要添加更多隔离代理（独立工作区 + 会话 + 认证），使用：

```bash
openclaw agents add <name>
```

提示：`--json` **不等于** 非交互模式。脚本请使用 `--non-interactive`（以及 `--workspace`）。

## 流程细节（本地）

1. **已有配置检测**
   - 如果存在 `~/.openclaw/openclaw.json`，可选择 **保留 / 修改 / 重置**。
   - 重新运行向导 **不会** 清空任何内容，除非你显式选择 **重置**
     （或传 `--reset`）。
   - 如果配置无效或包含旧键，向导会停止并要求先运行
     `openclaw doctor`。
   - 重置使用 `trash`（从不使用 `rm`），并提供范围：
     - 仅配置
     - 配置 + 凭据 + 会话
     - 全量重置（也移除工作区）

2. **模型/认证**
   - **Anthropic API key（推荐）**：如果有 `ANTHROPIC_API_KEY` 则使用，否则提示输入，然后保存供守护进程使用。
   - **Anthropic OAuth（Claude Code CLI）**：macOS 上检查钥匙串项 "Claude Code-credentials"（选择 "Always Allow" 以避免 launchd 启动被阻塞）；Linux/Windows 复用 `~/.claude/.credentials.json`（如果存在）。
   - **Anthropic token（粘贴 setup-token）**：在任意机器运行 `claude setup-token`，然后粘贴 token（可命名；留空为默认）。
   - **OpenAI Code (Codex) 订阅（Codex CLI）**：如果存在 `~/.codex/auth.json`，向导可复用。
   - **OpenAI Code (Codex) 订阅（OAuth）**：浏览器流程；粘贴 `code#state`。
     - 当模型未设置或为 `openai/*` 时，将 `agents.defaults.model` 设为 `openai-codex/gpt-5.2`。
   - **OpenAI API key**：使用 `OPENAI_API_KEY`（如果存在）或提示输入，然后保存到 `~/.openclaw/.env` 以便 launchd 读取。
   - **OpenCode Zen（多模型代理）**：提示 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 获取）。
   - **API key**：为你存储 key。
   - **Vercel AI Gateway（多模型代理）**：提示 `AI_GATEWAY_API_KEY`。
   - 详情：[Vercel AI Gateway](/zh/providers/vercel-ai-gateway)
   - **Cloudflare AI Gateway**：提示输入账号 ID、网关 ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
   - 详情：[Cloudflare AI Gateway](/zh/providers/cloudflare-ai-gateway)
   - **MiniMax M2.1**：自动写入配置。
   - 详情：[MiniMax](/zh/providers/minimax)
   - **Synthetic（Anthropic 兼容）**：提示 `SYNTHETIC_API_KEY`。
   - 详情：[Synthetic](/zh/providers/synthetic)
   - **Moonshot（Kimi K2）**：自动写入配置。
   - **Kimi Coding**：自动写入配置。
   - 详情：[Moonshot AI（Kimi + Kimi Coding）](/zh/providers/moonshot)
   - **跳过**：暂不配置认证。
   - 从检测到的选项中选择默认模型（或手动输入 provider/model）。
   - 向导会进行模型检查，并在模型未知或缺少认证时警告。
   - OAuth 凭据在 `~/.openclaw/credentials/oauth.json`；认证档案在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API key + OAuth）。
   - 详情：[/concepts/oauth](/zh/concepts/oauth)

3. **工作区**
   - 默认 `~/.openclaw/workspace`（可配置）。
   - 写入代理引导所需的工作区文件。
   - 完整工作区结构 + 备份指南：[代理工作区](/zh/concepts/agent-workspace)
4. **网关**
   - 端口、绑定、认证模式、tailscale 暴露。
   - 认证建议：即便是 loopback 也保持 **Token**，确保本地 WS 客户端必须认证。
   - 仅在完全信任所有本地进程时才关闭认证。
   - 非 loopback 绑定仍需要认证。

5. **渠道**
   - [WhatsApp](/zh/channels/whatsapp)：可选二维码登录。
   - [Telegram](/zh/channels/telegram)：bot token。
   - [Discord](/zh/channels/discord)：bot token。
   - [Google Chat](/zh/channels/googlechat)：服务账号 JSON + webhook audience。
   - [Mattermost](/zh/channels/mattermost)（插件）：bot token + base URL。
   - [Signal](/zh/channels/signal)：可选 `signal-cli` 安装 + 账号配置。
   - [BlueBubbles](/zh/channels/bluebubbles)：**iMessage 推荐方式**；服务器 URL + 密码 + webhook。
   - [iMessage](/zh/channels/imessage)：旧版 `imsg` CLI 路径 + DB 访问。
   - 私聊安全：默认是配对。第一次私聊发送代码；用 `openclaw pairing approve <channel> <code>` 批准，或使用 allowlist。

6. **守护进程安装**
   - macOS：LaunchAgent
     - 需要登录用户会话；无头环境请使用自定义 LaunchDaemon（未内置）。
   - Linux（以及 Windows 通过 WSL2）：systemd 用户单元
     - 向导尝试 `loginctl enable-linger <user>` 以便登出后网关仍运行。
     - 可能提示 sudo（写入 `/var/lib/systemd/linger`）；会先尝试不使用 sudo。
   - **运行时选择：** Node（推荐；WhatsApp/Telegram 需要）。不推荐 Bun。

7. **健康检查**
   - 启动网关（如需要）并运行 `openclaw health`。
   - 提示：`openclaw status --deep` 会在状态输出中加入网关健康探测（需要可达网关）。

8. **技能（推荐）**
   - 读取可用技能并检查要求。
   - 选择 node 包管理器：**npm / pnpm**（不推荐 bun）。
   - 安装可选依赖（macOS 上部分使用 Homebrew）。

9. **完成**
   - 汇总 + 下一步，包括 iOS/Android/macOS 应用以获取额外功能。
   - 如果未检测到 GUI，向导会打印 Control UI 的 SSH 端口转发说明，而不是打开浏览器。
   - 若 Control UI 资源缺失，向导会尝试构建；备用方式是 `pnpm ui:build`（会自动安装 UI 依赖）。

8. **技能（推荐）**
   - 读取可用技能并检查要求。
   - 让你选择 node 包管理器：**npm / pnpm**（不推荐 bun）。
   - 安装可选依赖（macOS 上部分使用 Homebrew）。

9. **完成**
   - 汇总 + 下一步，包括 iOS/Android/macOS 应用以获取额外功能。

- 若未检测到 GUI，向导会打印 Control UI 的 SSH 端口转发说明，而不是打开浏览器。
- 远程网关 URL（`ws://...`）

## 远程模式

说明：

将要设置的内容：

- 如果网关仅 loopback，可用 SSH 隧道或 tailnet。
- 发现提示：
  - macOS：Bonjour（`dns-sd`）
  - Linux：Avahi（`avahi-browse`）

`~/.openclaw/openclaw.json` 中的常见字段：

- 不会执行远程安装或守护进程修改。
- 如果网关仅限 loopback，请使用 SSH 隧道或 tailnet。
- 发现提示：
  - macOS：Bonjour (`dns-sd`)
  - Linux：Avahi (`avahi-browse`)

## 添加另一个代理

使用 `openclaw agents add <name>` 创建具有自己的工作区、会话和认证档案的独立代理。不带 `--workspace` 运行会启动向导。

设置内容：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

`~/.openclaw/openclaw.json` 中的常见字段：

- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 以路由传入消息（向导可以执行此操作）。
- 非交互标志：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 非交互模式

Vercel AI Gateway 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice apiKey \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback \
  --install-daemon \
  --daemon-runtime node \
  --skip-skills
```

Moonshot 示例：

Synthetic 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

OpenCode Zen 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice zai-api-key \
  --zai-api-key "$ZAI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

添加代理（非交互）示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Cloudflare AI Gateway 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

网关通过 RPC 暴露向导流程（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）。
客户端（macOS 应用、Control UI）可以渲染步骤，而无需重新实现引导逻辑。

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice moonshot-api-key \
  --moonshot-api-key "$MOONSHOT_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Synthetic 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice synthetic-api-key \
  --synthetic-api-key "$SYNTHETIC_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

向导可从 GitHub releases 安装 `signal-cli`：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice opencode-zen \
  --opencode-zen-api-key "$OPENCODE_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

添加代理（非交互）示例：

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## 网关向导 RPC

网关通过 RPC 暴露向导流程（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）。
客户端（macOS 应用、Control UI）可以渲染步骤，而无需重新实现引导逻辑。

## Signal 设置 (signal-cli)

向导可以从 GitHub releases 安装 `signal-cli`：

- 有原生版本时优先使用原生版本。
- Windows 使用 WSL2；signal-cli 安装按 WSL 内 Linux 流程进行。
- 向你的配置写入 `channels.signal.cliPath`。

`~/.openclaw/openclaw.json` 中的常见字段：

- `agents.defaults.model` / `models.providers`（选择 Minimax 时）
- `gateway.*`（mode、bind、auth、tailscale）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`

## 向导写入的内容

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果选择了 MiniMax）
- `gateway.*`（mode、bind、auth、tailscale）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据存放在 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。

部分渠道以插件形式提供。当你在引导期间选择其中之一时，向导会在配置前提示安装（npm 或本地路径）。

## 相关文档

- macOS 应用引导：[引导](/zh/start/onboarding)
- 配置参考：[网关配置](/zh/gateway/configuration)
- 提供商：[WhatsApp](/zh/channels/whatsapp)、[Telegram](/zh/channels/telegram)、[Discord](/zh/channels/discord)、[Google Chat](/zh/channels/googlechat)、[Signal](/zh/channels/signal)、[BlueBubbles](/zh/channels/bluebubbles) (iMessage)、[iMessage](/zh/channels/imessage)（旧版）
- 技能：[技能](/zh/tools/skills)、[技能配置](/zh/tools/skills-config)
