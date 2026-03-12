---
summary: CLI 入门向导的完整参考：涵盖每个步骤、标志和配置字段
read_when:
  - Looking up a specific wizard step or flag
  - Automating onboarding with non-interactive mode
  - Debugging wizard behavior
title: 入门向导参考
sidebarTitle: 向导参考
---

# 入门向导参考

这是 `openclaw onboard` CLI 向导的完整参考。
要了解高层概览，请参阅 [入门向导](/zh/en/start/wizard)。

## 流程详情（本地模式）

<Steps>
  <Step title="现有配置检测">
    - 如果 `~/.openclaw/openclaw.json` 存在，请选择 **保留 / 修改 / 重置**。
    - 重新运行向导**不会**清除任何内容，除非您明确选择 **重置**
      （或传递 `--reset`）。
    - CLI `--reset` 默认为 `config+creds+sessions`；使用 `--reset-scope full`
      同时删除工作区。
    - 如果配置无效或包含旧版密钥，向导将停止并要求
      您在继续之前运行 `openclaw doctor`。
    - 重置使用 `trash`（绝不使用 `rm`）并提供范围：
      - 仅配置
      - 配置 + 凭证 + 会话
      - 完全重置（同时删除工作区）
  </Step>
  <Step title="模型/认证">
    - **Anthropic API 密钥**：如果存在 `ANTHROPIC_API_KEY` 则使用，否则提示输入密钥，然后将其保存以供守护进程使用。
    - **Anthropic OAuth (Claude Code CLI)**：在 macOS 上，向导检查钥匙串项 "Claude Code-credentials"（选择 "始终允许" 以免 launchd 启动时被阻止）；在 Linux/Windows 上，如果存在 `~/.claude/.credentials.json` 则复用。
    - **Anthropic 令牌 (粘贴 setup-token)**：在任何机器上运行 `claude setup-token`，然后粘贴令牌（您可以为其命名；留空 = 默认）。
    - **OpenAI Code (Codex) 订阅 (Codex CLI)**：如果 `~/.codex/auth.json` 存在，向导可以复用它。
    - **OpenAI Code (Codex) 订阅**：浏览器流程；粘贴 `code#state`。
      - 当模型未设置或为 `openai/*` 时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.2`。
    - **OpenAI API 密钥**：如果存在 `OPENAI_API_KEY` 则使用，否则提示输入密钥，然后将其存储在认证配置文件中。
    - **xAI (Grok) API 密钥**：提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供商。
    - **OpenCode**：提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`，在 https://opencode.ai/auth 获取）并让您选择 Zen 或 Go 目录。
    - **API 密钥**：为您存储密钥。
    - **Vercel AI Gateway (多模型代理)**：提示输入 `AI_GATEWAY_API_KEY`。
    - 更多详情：[Vercel AI Gateway](/zh/en/providers/vercel-ai-gateway)
    - **Cloudflare AI Gateway**：提示输入账户 ID、Gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    - 更多详情：[Cloudflare AI Gateway](/zh/en/providers/cloudflare-ai-gateway)
    - **MiniMax M2.5**：配置自动写入。
    - 更多详情：[MiniMax](/zh/en/providers/minimax)
    - **Synthetic (Anthropic 兼容)**：提示输入 `SYNTHETIC_API_KEY`。
    - 更多详情：[Synthetic](/zh/en/providers/synthetic)
    - **Moonshot (Kimi K2)**：配置自动写入。
    - **Kimi Coding**：配置自动写入。
    - 更多详情：[Moonshot AI (Kimi + Kimi Coding)](/zh/en/providers/moonshot)
    - **跳过**：尚未配置认证。
    - 从检测到的选项中选择默认模型（或手动输入提供商/模型）。为了获得最佳质量和更低的提示注入风险，请选择您提供商堆栈中可用的最强的最新一代模型。
    - 向导运行模型检查，如果配置的模型未知或缺少认证，则会发出警告。
    - API 密钥存储模式默认为纯文本认证配置文件值。使用 `--secret-input-mode ref` 来存储环境变量支持的引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）。
    - OAuth 凭证位于 `~/.openclaw/credentials/oauth.json`；认证配置文件位于 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`（API 密钥 + OAuth）。
    - 更多详情：[/concepts/oauth](/zh/en/concepts/oauth)
    <Note>
    无头/服务器提示：在有浏览器的机器上完成 OAuth，然后将
    `~/.openclaw/credentials/oauth.json`（或 `$OPENCLAW_STATE_DIR/credentials/oauth.json`）复制到
    网关主机。
    </Note>
  </Step>
  <Step title="工作区">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 为代理引导仪式所需的工作区文件进行种子处理。
    - 完整的工作区布局 + 备份指南：[代理工作区](/zh/en/concepts/agent-workspace)
  </Step>
  <Step title="网关">
    - 端口、绑定、认证模式、Tailscale 暴露。
    - 认证建议：即使是环回也保留 **令牌**，以便本地 WS 客户端必须通过认证。
    - 在令牌模式下，交互式入职提供：
      - **生成/存储纯文本令牌**（默认）
      - **使用 SecretRef**（可选加入）
      - 快速启动跨 `env`、`file` 和 `exec` 提供商复用现有的 `gateway.auth.token` SecretRefs，以便进行入职探测/仪表板引导。
      - 如果该 SecretRef 已配置但无法解析，入职将提前失败并显示明确的修复消息，而不是静默降级运行时认证。
    - 在密码模式下，交互式入职也支持纯文本或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求在入职过程环境中有一个非空的环境变量。
      - 不能与 `--gateway-token` 结合使用。
    - 仅当您完全信任每个本地进程时才禁用认证。
    - 非环回绑定仍然需要认证。
  </Step>
  <Step title="频道">
    - [WhatsApp](/zh/en/channels/whatsapp)：可选的 QR 码登录。
    - [Telegram](/zh/en/channels/telegram)：机器人令牌。
    - [Discord](/zh/en/channels/discord)：机器人令牌。
    - [Google Chat](/zh/en/channels/googlechat)：服务账户 JSON + webhook 受众。
    - [Mattermost](/zh/en/channels/mattermost) (插件)：机器人令牌 + 基础 URL。
    - [Signal](/zh/en/channels/signal)：可选的 `signal-cli` 安装 + 账户配置。
    - [BlueBubbles](/zh/en/channels/bluebubbles)：**推荐用于 iMessage**；服务器 URL + 密码 + webhook。
    - [iMessage](/zh/en/channels/imessage)：旧版 `imsg` CLI 路径 + 数据库访问权限。
    - DM 安全性：默认为配对。第一条 DM 发送代码；通过 `openclaw pairing approve <channel> <code>` 批准或使用允许列表。
  </Step>
  <Step title="网络搜索">
    - 选择提供商：Perplexity、Brave、Gemini、Grok 或 Kimi（或跳过）。
    - 粘贴您的 API 密钥（快速启动自动从环境变量或现有配置中检测密钥）。
    - 使用 `--skip-search` 跳过。
    - 稍后配置：`openclaw configure --section web`。
  </Step>
  <Step title="守护进程安装">
    - macOS：LaunchAgent
      - 需要登录的用户会话；对于无头模式，请使用自定义 LaunchDaemon（未附带）。
    - Linux（以及通过 WSL2 的 Windows）：systemd 用户单元
      - 向导尝试通过 `loginctl enable-linger <user>` 启用 linger，以便网关在注销后保持运行。
      - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - **运行时选择：** Node（推荐；WhatsApp/Telegram 必需）。**不推荐** Bun。
    - 如果令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会验证它，但不会将解析后的纯文本令牌值持久化到监督服务环境元数据中。
    - 如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，守护进程安装将被阻止并提供可操作的指导。
    - 如果配置了 `gateway.auth.token` 和 `gateway.auth.password` 但未设置 `gateway.auth.mode`，守护进程安装将被阻止，直到显式设置模式。
  </Step>
  <Step title="健康检查">
    - 启动网关（如果需要）并运行 `openclaw health`。
    - 提示：`openclaw status --deep` 将网关健康探测添加到状态输出（需要可访问的网关）。
  </Step>
  <Step title="技能（推荐）">
    - 读取可用技能并检查要求。
    - 让您选择节点管理器：**npm / pnpm**（不推荐 bun）。
    - 安装可选依赖项（有些在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要 + 后续步骤，包括用于额外功能的 iOS/Android/macOS 应用程序。
  </Step>
</Steps>

<Note>
如果未检测到 GUI，向导将打印 Control UI 的 SSH 端口转发指令，而不是打开浏览器。
如果缺少 Control UI 资源，向导将尝试构建它们；回退方案是 `pnpm ui:build`（自动安装 UI 依赖项）。
</Note>

## 非交互模式

使用 `--non-interactive` 自动化或编写入职脚本：

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

非交互模式下的 Gateway 令牌 SecretRef：

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
`--json` **不**意味着非交互模式。请使用 `--non-interactive`（和 `--workspace`）进行脚本编写。
</Note>

<AccordionGroup>
  <Accordion title="Gemini 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice gemini-api-key \
      --gemini-api-key "$GEMINI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Z.AI 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice zai-api-key \
      --zai-api-key "$ZAI_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Vercel AI Gateway 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice ai-gateway-api-key \
      --ai-gateway-api-key "$AI_GATEWAY_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Cloudflare AI Gateway 示例">
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
  </Accordion>
  <Accordion title="Moonshot 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice moonshot-api-key \
      --moonshot-api-key "$MOONSHOT_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="Synthetic 示例">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice synthetic-api-key \
      --synthetic-api-key "$SYNTHETIC_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
  </Accordion>
  <Accordion title="OpenCode example">
    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice opencode-zen \
      --opencode-zen-api-key "$OPENCODE_API_KEY" \
      --gateway-port 18789 \
      --gateway-bind loopback
    ```
    Swap to `--auth-choice opencode-go --opencode-go-api-key "$OPENCODE_API_KEY"` for the Go catalog.
  </Accordion>
</AccordionGroup>

### 添加代理（非交互式）

```bash
openclaw agents add work \
  --workspace ~/.openclaw/workspace-work \
  --model openai/gpt-5.2 \
  --bind whatsapp:biz \
  --non-interactive \
  --json
```

## Gateway 向导 RPC

Gateway 通过 RPC（`wizard.start`、`wizard.next`、`wizard.cancel`、`wizard.status`）公开向导流程。
客户端（macOS 应用、Control UI）可以呈现步骤，而无需重新实现入职逻辑。

## Signal 设置 (signal-cli)

向导可以从 GitHub 版本安装 `signal-cli`：

- 下载适当的发布资源。
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 下。
- 将 `channels.signal.cliPath` 写入您的配置。

注意：

- JVM 构建需要 **Java 21**。
- 如果可用，则使用本机构建。
- Windows 使用 WSL2；signal-cli 安装遵循 WSL 内部的 Linux 流程。

## 向导写入的内容

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（如果未设置，本地入驻默认为 `"coding"`；保留现有的显式值）
- `gateway.*`（mode, bind, auth, tailscale）
- `session.dmScope`（行为详情：[CLI Onboarding Reference](/zh/en/start/wizard-cli-reference#outputs-and-internals)）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 当您在提示期间选择加入时，频道允许列表（Slack/Discord/Matrix/Microsoft Teams）（名称尽可能解析为 ID）。
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据位于 `~/.openclaw/credentials/whatsapp/<accountId>/` 之下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 之下。

某些渠道作为插件提供。当您在入驻期间选择其中一个时，向导将在您可以配置它之前提示安装它（npm 或本地路径）。

## 相关文档

- 向导概述：[Onboarding Wizard](/zh/en/start/wizard)
- macOS 应用入驻：[Onboarding](/zh/en/start/onboarding)
- 配置参考：[Gateway configuration](/zh/en/gateway/configuration)
- 提供商：[WhatsApp](/zh/en/channels/whatsapp)、[Telegram](/zh/en/channels/telegram)、[Discord](/zh/en/channels/discord)、[Google Chat](/zh/en/channels/googlechat)、[Signal](/zh/en/channels/signal)、[BlueBubbles](/zh/en/channels/bluebubbles) (iMessage)、[iMessage](/zh/en/channels/imessage)（旧版）
- 技能：[Skills](/zh/en/tools/skills)、[Skills config](/zh/en/tools/skills-config)
