---
summary: "新手引导完整参考：每个步骤、标志和配置字段"
read_when:
  - Looking up a specific onboarding step or flag
  - Automating onboarding with non-interactive mode
  - Debugging onboarding behavior
title: "新手引导参考"
sidebarTitle: "新手引导参考"
---

# 新手引导参考

这是 `openclaw onboard` 的完整参考。
如需高层概览，请参阅 [新手引导 (CLI)](/zh/start/wizard)。

## 流程详细信息（本地模式）

<Steps>
  <Step title="现有配置检测">
    - 如果存在 `~/.openclaw/openclaw.json`，请选择 **保留 / 修改 / 重置**。
    - 重新运行新手引导**不会**清除任何内容，除非您明确选择 **重置**
      （或传递 `--reset`）。
    - CLI `--reset` 默认为 `config+creds+sessions`；使用 `--reset-scope full`
      同时删除工作区。
    - 如果配置无效或包含旧版键，向导将停止并要求
      您在继续之前运行 `openclaw doctor`。
    - 重置使用 `trash`（绝不使用 `rm`）并提供范围选项：
      - 仅配置
      - 配置 + 凭证 + 会话
      - 完全重置（也会删除工作区）
  </Step>
  <Step title="模型/认证">
    - **Anthropic API 密钥**：如果存在 `ANTHROPIC_API_KEY` 则使用，否则提示输入密钥，然后将其保存以供守护进程使用。
    - **Anthropic OAuth (Claude Code CLI)**：在 macOS 上，新手引导会检查钥匙串中的“Claude Code-credentials”项（选择“始终允许”以避免 launchd 启动时被阻止）；在 Linux/Windows 上，如果存在 `~/.claude/.credentials.json` 则会重用它。
    - **Anthropic token (粘贴 setup-token)**：在任何机器上运行 `claude setup-token`，然后粘贴该 token（您可以为其命名；空白表示默认）。
    - **OpenAI Code (Codex) 订阅 (Codex CLI)**：如果存在 `~/.codex/auth.json`，新手引导可以重用它。
    - **OpenAI Code (Codex) 订阅 (OAuth)**：浏览器流程；粘贴 `code#state`。
      - 当模型未设置或 `openai/*` 时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.2`。
    - **OpenAI API 密钥**：如果存在 `OPENAI_API_KEY` 则使用，否则提示输入密钥，然后将其存储在认证配置文件中。
    - **xAI (Grok) API 密钥**：提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供商。
    - **OpenCode**：提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 获取），并让您选择 Zen 或 Go 目录。
    - **Ollama**：提示输入 Ollama 基础 URL，提供 **Cloud + Local** 或 **Local** 模式，发现可用模型，并在需要时自动拉取选定的本地模型。
    - 更多详情：[Ollama](/zh/providers/ollama)
    - **API 密钥**：为您存储密钥。
    - **Vercel AI Gateway (多模型代理)**：提示输入 `AI_GATEWAY_API_KEY`。
    - 更多详情：[Vercel AI Gateway](/zh/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示输入账户 ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多详情：[Cloudflare AI Gateway](/zh/providers/cloudflare-ai-gateway)
    - **MiniMax**：配置将自动写入；托管默认值为 `MiniMax-M2.7`，且 `MiniMax-M2.5` 仍然可用。
    - 更多详情：[MiniMax](/zh/providers/minimax)
    - **Synthetic (Anthropic 兼容)**：提示输入 `SYNTHETIC_API_KEY`。
    - 更多详情：[Synthetic](/zh/providers/synthetic)
    - **Moonshot (Kimi K2)**：配置将自动写入。
    - **Kimi Coding**：配置将自动写入。
    - 更多详情：[Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)
    - **跳过**：尚未配置认证。
    - 从检测到的选项中选择一个默认模型（或手动输入提供商/模型）。为了获得最佳质量和更低的提示注入风险，请在您的提供商堆栈中选择可用的最强最新一代模型。
    - 新手引导会运行模型检查，并在配置的模型未知或缺少认证时发出警告。
    - API 密钥存储模式默认为纯文本认证配置文件值。请使用 `--secret-input-mode ref` 来存储环境变量支持的引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - OAuth 凭证位于 `~/.openclaw/credentials/oauth.json` 中；认证配置文件位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中（API 密钥 + OAuth）。
    - 更多详情：[/concepts/oauth](/zh/concepts/oauth)
    <Note>
    无头/服务器提示：在带有浏览器的机器上完成 OAuth，然后将
    `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）复制到
    网关主机。
    </Note>
  </Step>
  <Step title="Workspace">
    - 默认 `~/.openclaw/workspace` （可配置）。
    - 为 agent 引导仪式所需的工作区文件提供种子。
    - 完整的工作区布局 + 备份指南：[Agent workspace](/zh/concepts/agent-workspace)
  </Step>
  <Step title="Gateway">
    - 端口、绑定、认证模式、Tailscale 暴露。
    - 认证建议：即使是环回也保留 **Token**，以便本地 WS 客户端必须进行身份验证。
    - 在 Token 模式下，交互式设置提供：
      - **生成/存储明文令牌**（默认）
      - **使用 SecretRef**（可选）
      - 快速启动会跨 `env`、`file` 和 `exec` 提供程序重用现有的 `gateway.auth.token` SecretRefs，用于引导探针/仪表板引导。
      - 如果配置了该 SecretRef 但无法解析，引导将提前失败并显示清晰的修复消息，而不是在运行时静默降低认证级别。
    - 在密码模式下，交互式设置也支持明文或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求在引导进程环境中设置非空的环境变量。
      - 不能与 `--gateway-token` 组合使用。
    - 仅当您完全信任每个本地进程时，才禁用认证。
    - 非环回绑定仍然需要认证。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/zh/channels/whatsapp): 可选的 QR 登录。
    - [Telegram](/zh/channels/telegram): 机器人令牌 (bot token)。
    - [Discord](/zh/channels/discord): 机器人令牌 (bot token)。
    - [Google Chat](/zh/channels/googlechat): 服务账号 JSON + Webhook 受众。
    - [Mattermost](/zh/channels/mattermost) (插件): 机器人令牌 (bot token) + 基础 URL。
    - [Signal](/zh/channels/signal): 可选 `signal-cli` 安装 + 账户配置。
    - [BlueBubbles](/zh/channels/bluebubbles): **推荐用于 iMessage**；服务器 URL + 密码 + Webhook。
    - [iMessage](/zh/channels/imessage): 旧版 `imsg` CLI 路径 + 数据库访问权限。
    - 私信安全: 默认为配对模式。第一条私信会发送一个代码；通过 `openclaw pairing approve <channel> <code>` 批准，或使用允许列表。
  </Step>
  <Step title="Web search">
    - 选择提供商: Perplexity、Brave、Gemini、Grok 或 Kimi (或跳过)。
    - 粘贴您的 API 密钥 (QuickStart 会自动检测来自环境变量或现有配置的密钥)。
    - 使用 `--skip-search` 跳过。
    - 稍后配置: `openclaw configure --section web`。
  </Step>
  <Step title="Daemon install">
    - macOS: LaunchAgent
      - 需要登录用户会话；对于无头模式，请使用自定义 LaunchDaemon（未附带）。
    - Linux（以及通过 WSL2 的 Windows）：systemd 用户单元
      - 新手引导会尝试通过 `loginctl enable-linger <user>` 启用 lingering，以便 Gateway 在注销后保持运行。
      - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - **运行时选择：** Node（推荐；WhatsApp/Telegram 必需）。**不建议**使用 Bun。
    - 如果令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证它，但不会将解析后的明文令牌值持久化到监督服务环境元数据中。
    - 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，守护进程安装将被阻止并提供可行的指导。
    - 如果配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，守护进程安装将被阻止，直到显式设置模式。
  </Step>
  <Step title="Health check">
    - 启动 Gateway（如果需要）并运行 `openclaw health`。
    - 提示：`openclaw status --deep` 将网关健康探测添加到状态输出中（需要可访问的网关）。
  </Step>
  <Step title="Skills（推荐）">
    - 读取可用的 Skills 并检查要求。
    - 允许您选择节点管理器：**npm / pnpm**（不推荐 bun）。
    - 安装可选依赖项（有些在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要 + 后续步骤，包括用于额外功能的 iOS/Android/macOS 应用。
  </Step>
</Steps>

<Note>
  如果未检测到 GUI，新手引导将打印 Control UI 的 SSH 端口转发说明，而不是打开浏览器。如果 Control UI
  资源丢失，新手引导将尝试构建它们； 回退方案是 `pnpm ui:build`（自动安装 UI 依赖项）。
</Note>

## 非交互模式

使用 `--non-interactive` 自动化或编写新手引导脚本：

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

添加 `--json` 以获取机器可读的摘要。

非交互模式下的 Gateway 网关 token SecretRef：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 和 `--gateway-token-ref-env` 互斥。

<Note>
  `--json` **不**意味着非交互模式。请使用 `--non-interactive`（和 `--workspace`）进行 脚本编写。
</Note>

特定于提供商的命令示例位于 [CLI Automation](/zh/start/wizard-cli-automation#provider-specific-examples)。
请使用此参考页面了解标志语义和步骤顺序。

### 添加代理（非交互）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway(网关) 网关向导 RPC

Gateway(网关) 通过 RPC (`wizard.start`, `wizard.next`, `wizard.cancel`, `wizard.status`) 公开新手引导流程。
客户端（macOS 应用、控制 UI）可以渲染步骤而无需重新实现新手引导逻辑。

## Signal 设置 (signal-cli)

新手引导可以从 GitHub 版本安装 `signal-cli`：

- 下载相应的版本资产。
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- 将 `channels.signal.cliPath` 写入您的配置。

注意事项：

- JVM 构建版本需要 **Java 21**。
- 如果可用，将使用原生构建版本。
- Windows 使用 WSL2；signal-cli 安装遵循 WSL 内部的 Linux 流程。

## 向导写入的内容

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` （如果选择了 Minimax）
- `tools.profile` （如果未设置，本地新手引导默认为 `"coding"`；现有的显式值将被保留）
- `gateway.*` （mode, bind, auth, tailscale）
- `session.dmScope` （行为详情：[CLI Setup Reference](/zh/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`, `channels.discord.token`, `channels.signal.*`, `channels.imessage.*`
- 频道允许列表（Slack/Discord/Matrix/Microsoft Teams），当您在提示期间选择加入时（名称尽可能解析为 ID）。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据存储在 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。

某些通道以插件形式提供。当您在设置期间选择一个时，新手引导
将提示您安装它 (npm 或本地路径)，然后才能对其进行配置。

## 相关文档

- 新手引导概述：[新手引导 (CLI)](/zh/start/wizard)
- macOS 应用新手引导：[新手引导](/zh/start/onboarding)
- 配置参考：[Gateway(网关) configuration](/zh/gateway/configuration)
- 提供商：[WhatsApp](/zh/channels/whatsapp)、[Telegram](/zh/channels/telegram)、[Discord](/zh/channels/discord)、[Google Chat](/zh/channels/googlechat)、[Signal](/zh/channels/signal)、[BlueBubbles](/zh/channels/bluebubbles) (iMessage)、[iMessage](/zh/channels/imessage) (legacy)
- Skills: [Skills](/zh/tools/skills), [Skills config](/zh/tools/skills-config)

import zh from "/components/footer/zh.mdx";

<zh />
