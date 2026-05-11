---
summary: "新手引导完整参考：每个步骤、标志和配置字段"
read_when:
  - Looking up a specific onboarding step or flag
  - Automating onboarding with non-interactive mode
  - Debugging onboarding behavior
title: "新手引导参考"
sidebarTitle: "新手引导参考"
---

这是 `openclaw onboard` 的完整参考。
有关高级概述，请参阅 [新手引导 (CLI)](/zh/start/wizard)。

## 流程详情（本地模式）

<Steps>
  <Step title="现有配置检测">
    - 如果存在 `~/.openclaw/openclaw.json`，请选择 **保留 / 修改 / 重置**。
    - 重新运行新手引导**不会**清除任何内容，除非您明确选择 **重置**
      （或传递 `--reset`）。
    - CLI `--reset` 默认为 `config+creds+sessions`；请使用 `--reset-scope full`
      来同时删除工作区。
    - 如果配置无效或包含旧版键，向导将停止并要求
      您在继续之前运行 `openclaw doctor`。
    - 重置使用 `trash`（绝不使用 `rm`）并提供以下范围：
      - 仅配置
      - 配置 + 凭据 + 会话
      - 完全重置（同时删除工作区）
  </Step>
  <Step title="Model/Auth">
    - **Anthropic API 密钥**：如果存在 `ANTHROPIC_API_KEY` 则使用它，否则提示输入密钥，然后将其保存以供守护进程使用。
    - **Anthropic API 密钥**：在新手引导 (新手引导)/configure 中首选的 Anthropic 助手选择。
    - **Anthropic setup-token**：在新手引导 (新手引导)/configure 中仍然可用，尽管现在 OpenClaw 在可用时更倾向于复用 Claude CLI。
    - **OpenAI Code (Codex) 订阅 (OAuth)**：浏览器流程；粘贴 `code#state`。
      - 当模型未设置或已经是 OpenAI 系列 (OpenAI-family) 时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.5`。
    - **OpenAI Code (Codex) 订阅 (设备配对)**：带有短期设备代码的浏览器配对流程。
      - 当模型未设置或已经是 OpenAI 系列 (OpenAI-family) 时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.5`。
    - **OpenAI API 密钥**：如果存在 `OPENAI_API_KEY` 则使用它，否则提示输入密钥，然后将其存储在身份验证配置文件 中。
      - 当模型未设置、`openai/*` 或 `openai-codex/*` 时，将 `agents.defaults.model` 设置为 `openai/gpt-5.5`。
    - **xAI (Grok) API 密钥**：提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供商。
    - **OpenCode**：提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 获取），并允许您选择 Zen 或 Go 目录。
    - **Ollama**：首先提供 **Cloud + Local（云 + 本地）**、**Cloud only（仅云）** 或 **Local only（仅本地）**。`Cloud only` 提示输入 `OLLAMA_API_KEY` 并使用 `https://ollama.com`；主机支持的模式会提示输入 Ollama 基础 URL，发现可用模型，并在需要时自动拉入选定的本地模型；`Cloud + Local` 还会检查该 Ollama 主机是否已登录以进行云访问。
    - 更多详情：[Ollama](/zh/providers/ollama)
    - **API 密钥**：为您存储密钥。
    - **Vercel AI Gateway (多模型代理)**：提示输入 `AI_GATEWAY_API_KEY`。
    - 更多详情：[Vercel AI Gateway](/zh/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示输入帐户 ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多详情：[Cloudflare AI Gateway](/zh/providers/cloudflare-ai-gateway)
    - **MiniMax**：配置会自动写入；托管默认值为 `MiniMax-M2.7`。
      API 密钥设置使用 `minimax/...`，OAuth 设置使用
      `minimax-portal/...`。
    - 更多详情：[MiniMax](/zh/providers/minimax)
    - **StepFun**：针对中国或全球端点上的 StepFun 标准版或 Step Plan，配置会自动写入。
    - 标准版目前包括 `step-3.5-flash`，Step Plan 还包括 `step-3.5-flash-2603`。
    - 更多详情：[StepFun](/zh/providers/stepfun)
    - **Synthetic (Anthropic 兼容)**：提示输入 `SYNTHETIC_API_KEY`。
    - 更多详情：[Synthetic](/zh/providers/synthetic)
    - **Moonshot (Kimi K2)**：配置会自动写入。
    - **Kimi Coding**：配置会自动写入。
    - 更多详情：[Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)
    - **跳过**：尚未配置身份验证。
    - 从检测到的选项中选择默认模型（或手动输入提供商/模型）。为了获得最佳质量和更低的提示注入 风险，请选择您的提供商堆栈中可用的最强最新一代模型。
    - 新手引导 (新手引导) 会运行模型检查，如果配置的模型未知或缺少身份验证，则会发出警告。
    - API 密钥存储模式默认为纯文本身份验证配置文件 值。使用 `--secret-input-mode ref` 来存储环境支持的引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - 身份验证配置文件位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API 密钥 + OAuth）。`~/.openclaw/credentials/oauth.json` 仅用于旧版导入。
    - 更多详情：[/concepts/oauth](/zh/concepts/oauth)
    <Note>
    无头/服务器提示：在带有浏览器的机器上完成 OAuth，然后将
    该代理的 `auth-profiles.json`（例如
    `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或匹配的
    `$OPENCLAW_STATE_DIR/...` 路径）复制到网关主机。`credentials/oauth.json`
    只是旧版导入源。
    </Note>
  </Step>
  <Step title="Workspace">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 为引导程序的启动仪式所需的工作区文件进行初始化。
    - 完整的工作区布局 + 备份指南：[Agent workspace](/zh/concepts/agent-workspace)
  </Step>
  <Step title="Gateway(网关)">
    - 端口、绑定、认证模式、Tailscale 暴露。
    - 认证建议：即使对于环回地址也保留 **Token**，以便本地 WS 客户端必须进行身份验证。
    - 在 Token 模式下，交互式设置提供：
      - **生成/存储明文 Token**（默认）
      - **使用 SecretRef**（可选）
      - 快速启动会在 `env`、`file` 和 `exec` 提供程序之间重用现有的 `gateway.auth.token` SecretRef，用于引导探针/仪表板引导。
      - 如果配置了该 SecretRef 但无法解析，引导将提前失败并显示清晰的修复消息，而不是在运行时静默降级认证。
    - 在密码模式下，交互式设置也支持明文或 SecretRef 存储。
    - 非交互式 Token SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在引导流程环境中设置一个非空的 环境变量。
      - 不能与 `--gateway-token` 组合使用。
    - 仅当您完全信任每个本地进程时，才禁用认证。
    - 非环回绑定仍然需要认证。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/zh/channels/whatsapp): 可选的 QR 登录。
    - [Telegram](/zh/channels/telegram): bot token。
    - [Discord](/zh/channels/discord): bot token。
    - [Google Chat](/zh/channels/googlechat): 服务账户 JSON + webhook 受众。
    - [Mattermost](/zh/channels/mattermost) (插件): bot token + 基础 URL。
    - [Signal](/zh/channels/signal): 可选 `signal-cli` 安装 + 账户配置。
    - [BlueBubbles](/zh/channels/bluebubbles): **推荐用于 iMessage**；服务器 URL + 密码 + webhook。
    - [iMessage](/zh/channels/imessage): 旧版 `imsg` CLI 路径 + 数据库访问权限。
    - 私信 安全性：默认为配对。第一条私信会发送一个代码；通过 `openclaw pairing approve <channel> <code>` 批准或使用允许列表。
  </Step>
  <Step title="Web search">
    - 选择一个支持的提供商，例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Ollama Web Search、Perplexity、SearXNG 或 Tavily（或跳过）。
    - 基于 API 的提供商可以使用环境变量或现有配置进行快速设置；无密钥的提供商则使用其特定的先决条件。
    - 使用 `--skip-search` 跳过。
    - 稍后配置：`openclaw configure --section web`。
  </Step>
  <Step title="Daemon install">
    - macOS：LaunchAgent
      - 需要登录的用户会话；对于无头模式，请使用自定义的 LaunchDaemon（未附带）。
    - Linux（以及通过 Windows 的 WSL2）：systemd 用户单元
      - 新手引导尝试通过 `loginctl enable-linger <user>` 启用 lingering，以便在注销后保持 Gateway(网关) 运行。
      - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - **运行时选择：** Node（推荐；WhatsApp/Telegram 所需）。**不推荐**使用 Bun。
    - 如果令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会对其进行验证，但不会将解析后的明文令牌值持久化到主管服务环境元数据中。
    - 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，守护进程安装将被阻止并给出可操作的指导。
    - 如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置且 `gateway.auth.mode` 未设置，则在显式设置模式之前，守护进程安装将被阻止。
  </Step>
  <Step title="Health check">
    - 启动 Gateway(网关)（如果需要）并运行 `openclaw health`。
    - 提示：`openclaw status --deep` 将实时网关运行状况探针添加到状态输出中，包括支持时的渠道探针（需要可访问的网关）。
  </Step>
  <Step title="Skills (recommended)">
    - 读取可用的技能并检查要求。
    - 让您选择一个节点管理器：**npm / pnpm**（不推荐 bun）。
    - 安装可选依赖项（某些在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="Finish">
    - 摘要 + 后续步骤，包括用于额外功能的 iOS/Android/macOS 应用程序。
  </Step>
</Steps>

<Note>如果未检测到 GUI，新手引导将打印用于控制 UI 的 SSH 端口转发指令，而不是打开浏览器。 如果控制 UI 资源缺失，新手引导将尝试构建它们；回退方案是 `pnpm ui:build`（自动安装 UI 依赖项）。</Note>

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

非交互模式下的 Gateway(网关) token SecretRef：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

`--gateway-token` 和 `--gateway-token-ref-env` 互斥。

<Note>`--json` **不**意味着非交互模式。请使用 `--non-interactive`（和 `--workspace`）编写脚本。</Note>

特定提供商的命令示例位于 [CLI 自动化](/zh/start/wizard-cli-automation#provider-specific-examples) 中。
使用此参考页面了解标志语义和步骤顺序。

### 添加代理（非交互模式）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.5 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway(网关)向导 RPC

Gateway(网关)通过 RPC（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）公开新手引导流程。
客户端（macOS 应用、控制 UI）可以在不重新实现新手引导逻辑的情况下呈现步骤。

## Signal 设置 (signal-cli)

新手引导可以从 GitHub 版本中安装 `signal-cli`：

- 下载适当的版本资产。
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- 将 `channels.signal.cliPath` 写入您的配置。

注意事项：

- JVM 版本需要 **Java 21**。
- 尽可能使用 Native 版本。
- Windows 使用 WSL2；signal-cli 安装遵循 WSL 内部的 Linux 流程。

## 向导写入的内容

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` （如果选择了 Minimax）
- `tools.profile` （本地新手引导默认为 `"coding"`（如果未设置）；保留现有的显式值）
- `gateway.*` （模式、绑定、身份验证、tailscale）
- `session.dmScope` （行为详细信息：[CLI 设置参考](/zh/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.matrix.*`、`channels.signal.*`、`channels.imessage.*`
- 频道允许列表（Slack/Discord/Matrix/Microsoft Teams），当您在提示期间选择加入时（名称尽可能解析为 ID）。
- `skills.install.nodeManager`
  - `setup --node-manager` 接受 `npm`、`pnpm` 或 `bun`。
  - 手动配置仍然可以通过直接设置 `skills.install.nodeManager` 来使用 `yarn`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭证位于 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。

某些渠道以插件形式提供。当你在设置过程中选择一个时，新手引导
将提示安装它（npm 或本地路径），然后才能进行配置。

## 相关文档

- 新手引导概述：[新手引导 (CLI)](/zh/start/wizard)
- macOS 应用新手引导：[新手引导](/zh/start/onboarding)
- 配置参考：[Gateway(网关) 配置](/zh/gateway/configuration)
- 提供商：[WhatsApp](/zh/channels/whatsapp)、[Telegram](/zh/channels/telegram)、[Discord](/zh/channels/discord)、[Google Chat](/zh/channels/googlechat)、[Signal](/zh/channels/signal)、[BlueBubbles](/zh/channels/bluebubbles) (iMessage)、[iMessage](/zh/channels/imessage) (旧版)
- 技能：[Skills](/zh/tools/skills)、[Skills 配置](/zh/tools/skills-config)
