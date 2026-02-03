---
summary: "CLI 引导向导：网关、工作区、渠道、技能的引导式配置"
read_when:
  - 运行或配置引导向导
  - 在新机器上设置
title: "入门向导"
---

# 引导向导（CLI）

引导向导是 **推荐** 的 OpenClaw 安装方式（macOS、Linux，或 Windows 通过 WSL2；强烈推荐）。
它会在一次引导流程中配置本地网关或远程网关连接，以及渠道、技能和工作区默认值。

主入口：

```bash
openclaw onboard
```

最快的第一次聊天：打开 Control UI（无需渠道配置）。运行
`openclaw dashboard` 并在浏览器里聊天。文档：[Dashboard](/zh/web/dashboard)。

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

1) **已有配置检测**
   - 如果存在 `~/.openclaw/openclaw.json`，可选择 **保留 / 修改 / 重置**。
   - 重新运行向导 **不会** 清空任何内容，除非你显式选择 **重置**
     （或传 `--reset`）。
   - 如果配置无效或包含旧键，向导会停止并要求先运行
     `openclaw doctor`。
   - 重置使用 `trash`（从不使用 `rm`），并提供范围：
     - 仅配置
     - 配置 + 凭据 + 会话
     - 全量重置（也移除工作区）

2) **模型/认证**
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
   - **MiniMax M2.1**：自动写入配置。
   - 详情：[MiniMax](/zh/providers/minimax)
   - **Synthetic（Anthropic 兼容）**：提示 `SYNTHETIC_API_KEY`。
   - 详情：[Synthetic](/zh/providers/synthetic)
   - **Moonshot（Kimi K2）**：自动写入配置。
   - **Kimi Code**：自动写入配置。
   - 详情：[Moonshot AI（Kimi + Kimi Code）](/zh/providers/moonshot)
   - **跳过**：暂不配置认证。
   - 从检测到的选项中选择默认模型（或手动输入 provider/model）。
   - 向导会进行模型检查，并在模型未知或缺少认证时警告。
   - OAuth 凭据在 `~/.openclaw/credentials/oauth.json`；认证档案在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API key + OAuth）。
   - 详情：[/concepts/oauth](/zh/concepts/oauth)

3) **工作区**
   - 默认 `~/.openclaw/workspace`（可配置）。
   - 写入代理引导所需的工作区文件。
   - 完整工作区结构 + 备份指南：[代理工作区](/zh/concepts/agent-workspace)

4) **网关**
   - 端口、绑定、认证模式、tailscale 暴露。
   - 认证建议：即便是 loopback 也保持 **Token**，确保本地 WS 客户端必须认证。
   - 仅在完全信任所有本地进程时才关闭认证。
   - 非 loopback 绑定仍需要认证。

5) **渠道**
   - WhatsApp：可选二维码登录。
   - Telegram：bot token。
   - Discord：bot token。
   - Google Chat：服务账号 JSON + webhook audience。
   - Mattermost（插件）：bot token + base URL。
   - Signal：可选 `signal-cli` 安装 + 账号配置。
   - iMessage：本地 `imsg` CLI 路径 + DB 访问。
   - 私聊安全：默认是配对。第一次私聊发送代码；用 `openclaw pairing approve <channel> <code>` 批准，或使用 allowlist。

6) **守护进程安装**
   - macOS：LaunchAgent
     - 需要登录用户会话；无头环境请使用自定义 LaunchDaemon（未内置）。
   - Linux（以及 Windows 通过 WSL2）：systemd 用户单元
     - 向导尝试 `loginctl enable-linger <user>` 以便登出后网关仍运行。
     - 可能提示 sudo（写入 `/var/lib/systemd/linger`）；会先尝试不使用 sudo。
   - **运行时选择：** Node（推荐；WhatsApp/Telegram 需要）。不推荐 Bun。

7) **健康检查**
   - 启动网关（如需要）并运行 `openclaw health`。
   - 提示：`openclaw status --deep` 会在状态输出中加入网关健康探测（需要可达网关）。

8) **技能（推荐）**
   - 读取可用技能并检查要求。
   - 选择 node 包管理器：**npm / pnpm**（不推荐 bun）。
   - 安装可选依赖（macOS 上部分使用 Homebrew）。

9) **完成**
   - 汇总 + 下一步，包括 iOS/Android/macOS 应用以获取额外功能。
   - 如果未检测到 GUI，向导会打印 Control UI 的 SSH 端口转发说明，而不是打开浏览器。
   - 若 Control UI 资源缺失，向导会尝试构建；备用方式是 `pnpm ui:build`（会自动安装 UI 依赖）。

## 远程模式

远程模式配置本地客户端连接到其他地方的网关。

需要设置：
- 远程网关 URL（`ws://...`）
- 如果远程网关需要认证，则提供 Token（推荐）

说明：
- 不会进行远程安装或守护进程更改。
- 如果网关仅 loopback，可用 SSH 隧道或 tailnet。
- 发现提示：
  - macOS：Bonjour（`dns-sd`）
  - Linux：Avahi（`avahi-browse`）

## 添加另一个代理

使用 `openclaw agents add <name>` 创建一个独立代理，拥有自己的工作区、会话和认证档案。
不带 `--workspace` 运行会启动向导。

它会设置：
- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

说明：
- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 以路由入站消息（向导可完成）。
- 非交互参数：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 非交互模式

用 `--non-interactive` 自动化/脚本化引导：

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

添加 `--json` 以获得机器可读摘要。

Gemini 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice gemini-api-key \
  --gemini-api-key "$GEMINI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Z.AI 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice zai-api-key \
  --zai-api-key "$ZAI_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Vercel AI Gateway 示例：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
  --gateway-port 18789 \
  --gateway-bind loopback
```

Moonshot 示例：

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

OpenCode Zen 示例：

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

## Signal 设置（signal-cli）

向导可从 GitHub releases 安装 `signal-cli`：
- 下载对应的 release 资产。
- 存放到 `~/.openclaw/tools/signal-cli/<version>/`。
- 将 `channels.signal.cliPath` 写入配置。

说明：
- JVM 版本需要 **Java 21**。
- 有原生版本时优先使用原生版本。
- Windows 使用 WSL2；signal-cli 安装按 WSL 内 Linux 流程进行。

## 向导会写入什么

`~/.openclaw/openclaw.json` 中的常见字段：
- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（选择 Minimax 时）
- `gateway.*`（mode、bind、auth、tailscale）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 渠道 allowlist（Slack/Discord/Matrix/Microsoft Teams），在提示中选择后写入（名称会尽量解析为 ID）。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据位于 `~/.openclaw/credentials/whatsapp/<accountId>/`。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/`。

部分渠道以插件形式提供。你在引导中选择后，向导会提示安装（npm 或本地路径），之后才能配置。

## 相关文档

- macOS 应用引导：[引导](/zh/start/onboarding)
- 配置参考：[网关配置](/zh/gateway/configuration)
- 提供商：[WhatsApp](/zh/channels/whatsapp)、[Telegram](/zh/channels/telegram)、[Discord](/zh/channels/discord)、[Google Chat](/zh/channels/googlechat)、[Signal](/zh/channels/signal)、[iMessage](/zh/channels/imessage)
- 技能：[技能](/zh/tools/skills)、[技能配置](/zh/tools/skills-config)
