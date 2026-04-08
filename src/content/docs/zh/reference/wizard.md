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
如需概览，请参阅 [新手引导 (CLI)](/en/start/wizard)。

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
  <Step title="模型/身份">
    - **Anthropic API 密钥**：如果存在 `ANTHROPIC_API_KEY` 则使用，否则提示输入密钥，然后将其保存以供守护进程使用。
    - **Anthropic API 密钥**：在 新手引导/configure 中首选的 Anthropic 助手选择。
    - **Anthropic setup-token（旧版/手动）**：在 新手引导/configure 中再次可用，但 Anthropic 告知 OpenClaw 用户，OpenClaw Claude 登录路径被视为第三方工具使用，并且需要 Claude 账户启用 **Extra Usage**。
    - **OpenAI Code (Codex) 订阅 (Codex CLI)**：如果 `~/.codex/auth.json` 存在，新手引导可以重用它。重用的 Codex CLI 凭据仍由 Codex CLI 管理；过期时 OpenClaw 会首先重新读取该来源，并且当提供商可以刷新它时，会将刷新后的凭据写回 Codex 存储，而不是自己接管所有权。
    - **OpenAI Code (Codex) 订阅 (OAuth)**：浏览器流程；粘贴 `code#state`。
      - 当模型未设置或 `openai/*` 时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.4`。
    - **OpenAI API 密钥**：如果存在 `OPENAI_API_KEY` 则使用，否则提示输入密钥，然后将其存储在身份配置文件中。
      - 当模型未设置、`openai/*` 或 `openai-codex/*` 时，将 `agents.defaults.model` 设置为 `openai/gpt-5.4`。
    - **xAI (Grok) API 密钥**：提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供商。
    - **OpenCode**：提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 获取）并允许您选择 Zen 或 Go 目录。
    - **Ollama**：提示输入 Ollama 基础 URL，提供 **Cloud + Local** 或 **Local** 模式，发现可用模型，并在需要时自动拉选定的本地模型。
    - 更多详情：[Ollama](/en/providers/ollama)
    - **API 密钥**：为您存储密钥。
    - **Vercel AI Gateway(网关) (多模型代理)**：提示输入 `AI_GATEWAY_API_KEY`。
    - 更多详情：[Vercel AI Gateway(网关)](/en/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway(网关)**：提示输入账户 ID、Gateway(网关) ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多详情：[Cloudflare AI Gateway(网关)](/en/providers/cloudflare-ai-gateway)
    - **MiniMax**：配置自动写入；托管默认值为 `MiniMax-M2.7`。
      API 密钥设置使用 `minimax/...`，而 OAuth 设置使用
      `minimax-portal/...`。
    - 更多详情：[MiniMax](/en/providers/minimax)
    - **StepFun**：为中国或全球端点的 StepFun 标准版或 Step Plan 自动写入配置。
    - 标准版目前包括 `step-3.5-flash`，Step Plan 也包括 `step-3.5-flash-2603`。
    - 更多详情：[StepFun](/en/providers/stepfun)
    - **Synthetic (Anthropic 兼容)**：提示输入 `SYNTHETIC_API_KEY`。
    - 更多详情：[Synthetic](/en/providers/synthetic)
    - **Moonshot (Kimi K2)**：配置自动写入。
    - **Kimi Coding**：配置自动写入。
    - 更多详情：[Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)
    - **跳过**：尚未配置身份验证。
    - 从检测到的选项中选择一个默认模型（或手动输入提供商/模型）。为了获得最佳质量和更低的提示注入风险，请选择您的提供商堆栈中可用的最强大的最新一代模型。
    - 新手引导运行模型检查，如果配置的模型未知或缺少身份验证，则会发出警告。
    - API 密钥存储模式默认为纯文本身份配置文件值。使用 `--secret-input-mode ref` 来存储环境支持的引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - 身份配置文件位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API 密钥 + OAuth）。`~/.openclaw/credentials/oauth.json` 仅限旧版导入。
    - 更多详情：[/concepts/oauth](/en/concepts/oauth)
    <Note>
    无头/服务器提示：在带有浏览器的机器上完成 OAuth，然后将
    该代理的 `auth-profiles.json`（例如
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或匹配的
    `$OPENCLAW_STATE_DIR/...` 路径）复制到网关主机。`credentials/oauth.json`
    仅是旧版导入源。
    </Note>
  </Step>
  <Step title="Workspace">
    - 默认 `~/.openclaw/workspace` （可配置）。
    - 初始化代理引导仪式所需的工作区文件。
    - 完整的工作区布局和备份指南：[Agent workspace](/en/concepts/agent-workspace)
  </Step>
  <Step title="Gateway(网关)">
    - 端口、绑定、认证模式、Tailscale 暴露。
    - 认证建议：即使是环回也请保留 **Token**，以便本地 WS 客户端必须进行认证。
    - 在 Token 模式下，交互式设置提供：
      - **生成/存储明文 Token**（默认）
      - **使用 SecretRef**（可选）
      - 快速启动会跨 `env`、`file` 和 `exec` 提供程序重用现有的 `gateway.auth.token` SecretRef，用于新手引导探查器/仪表板的初始化引导。
      - 如果配置了该 SecretRef 但无法解析，新手引导将提前失败并显示明确的修复消息，而不是静默降低运行时认证的安全性。
    - 在密码模式下，交互式设置也支持明文或 SecretRef 存储。
    - 非交互式 Token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求新手引导过程环境中存在非空的环境变量。
      - 不能与 `--gateway-token` 组合使用。
    - 仅在您完全信任每个本地进程时才禁用认证。
    - 非环回绑定仍然需要认证。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/en/channels/whatsapp): 可选的二维码登录。
    - [Telegram](/en/channels/telegram): Bot 令牌。
    - [Discord](/en/channels/discord): Bot 令牌。
    - [Google Chat](/en/channels/googlechat): 服务账号 JSON + Webhook 受众。
    - [Mattermost](/en/channels/mattermost) (插件): Bot 令牌 + 基础 URL。
    - [Signal](/en/channels/signal): 可选的 `signal-cli` 安装 + 账户配置。
    - [BlueBubbles](/en/channels/bluebubbles): **推荐用于 iMessage**；服务器 URL + 密码 + Webhook。
    - [iMessage](/en/channels/imessage): 旧版 `imsg` CLI 路径 + 数据库访问权限。
    - 私信安全：默认为配对。首条私信会发送一个代码；通过 `openclaw pairing approve <channel> <code>` 批准，或使用允许列表。
  </Step>
  <Step title="Web search">
    - 选择一个支持的提供商，例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG 或 Tavily（或跳过）。
    - 基于 API 的提供商可以使用环境变量或现有配置进行快速设置；无密钥提供商则使用其特定的先决条件。
    - 使用 `--skip-search` 跳过。
    - 稍后配置：`openclaw configure --section web`。
  </Step>
  <Step title="Daemon install">
    - macOS: LaunchAgent
      - Requires a logged-in user 会话; for headless, use a custom LaunchDaemon (not shipped).
    - Linux (and Windows via WSL2): systemd user unit
      - 新手引导尝试通过 `loginctl enable-linger <user>` 启用 lingering，以便在注销后 Gateway(网关) 仍保持运行。
      - May prompt for sudo (writes `/var/lib/systemd/linger`); it tries without sudo first.
    - **Runtime selection:** Node (recommended; required for WhatsApp/Telegram). Bun is **not recommended**.
    - If token auth requires a token and `gateway.auth.token` is SecretRef-managed, daemon install validates it but does not persist resolved plaintext token values into supervisor service environment metadata.
    - If token auth requires a token and the configured token SecretRef is unresolved, daemon install is blocked with actionable guidance.
    - If both `gateway.auth.token` and `gateway.auth.password` are configured and `gateway.auth.mode` is unset, daemon install is blocked until mode is set explicitly.
  </Step>
  <Step title="Health check">
    - 启动 Gateway(网关)（如果需要）并运行 `openclaw health`。
    - Tip: `openclaw status --deep` adds the live gateway health probe to status output, including 渠道 probes when supported (requires a reachable gateway).
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

<Note>If no GUI is detected, 新手引导 prints SSH port-forward instructions for the Control UI instead of opening a browser. If the Control UI assets are missing, 新手引导 attempts to build them; fallback is `pnpm ui:build` (auto-installs UI deps).</Note>

## 非交互模式

使用 `--non-interactive` 自动化或通过脚本运行新手引导：

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

添加 `--json` 以获取机器可读摘要。

非交互模式下的 Gateway(网关) 网关 token SecretRef：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 和 `--gateway-token-ref-env` 互斥。

<Note>`--json` 并**不**意味着非交互模式。脚本请使用 `--non-interactive`（和 `--workspace`）。</Note>

特定于提供商的命令示例位于 [CLI 自动化](/en/start/wizard-cli-automation#provider-specific-examples) 中。
请使用此参考页面了解标志语义和步骤顺序。

### 添加代理（非交互）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.4 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway(网关) 网关向导 RPC

Gateway 通过 RPC (`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`) 暴露新手引导流程。
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
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（本地新手引导在未设置时默认为 `"coding"`；保留现有的显式值）
- `gateway.*`（模式、绑定、认证、tailscale）
- `session.dmScope`（行为详情：[CLI 设置参考](/en/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 频道允许列表（Slack/Discord/Matrix/Microsoft Teams），当您在提示期间选择加入时（名称尽可能解析为 ID）。
- `skills.install.nodeManager`
  - `setup --node-manager` 接受 `npm`、`pnpm` 或 `bun`。
  - 手动配置仍可通过直接设置 `skills.install.nodeManager` 来使用 `yarn`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据位于 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。

某些通道以插件形式提供。当您在设置期间选择其中一个时，新手引导将提示您在配置之前安装它（npm 或本地路径）。

## 相关文档

- 新手引导概述：[新手引导 (CLI)](/en/start/wizard)
- macOS 应用新手引导：[新手引导](/en/start/onboarding)
- 配置参考：[Gateway(网关) 配置](/en/gateway/configuration)
- 提供商：[WhatsApp](/en/channels/whatsapp)、[Telegram](/en/channels/telegram)、[Discord](/en/channels/discord)、[Google Chat](/en/channels/googlechat)、[Signal](/en/channels/signal)、[BlueBubbles](/en/channels/bluebubbles) (iMessage)、[iMessage](/en/channels/imessage) (旧版)
- Skills：[Skills](/en/tools/skills)、[Skills 配置](/en/tools/skills-config)
