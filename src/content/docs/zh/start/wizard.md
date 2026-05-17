---
summary: "CLI 新手引导：网关、工作区、频道和技能的引导式设置"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "新手引导 (CLI)"
sidebarTitle: "新手引导：CLI"
---

CLI 新手引导是在 OpenClaw、
macOS 或 Linux（通过 Windows；强烈推荐）上设置 WSL2 的 **推荐** 方式。
它会在一个引导式流程中配置本地 Gateway(网关) 或远程 Gateway(网关) 连接，以及渠道、技能
和工作区默认设置。

```bash
openclaw onboard
```

<Info>最快的首次对话：打开控制 UI（无需设置渠道）。运行 `openclaw dashboard` 并在浏览器中对话。文档：[Dashboard](/zh/web/dashboard)。</Info>

如需稍后重新配置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`。</Note>

<Tip>CLI 新手引导包含一个 Web 搜索步骤，您可以在其中选择一个提供商 ，例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search 、Ollama Web Search、Perplexity、SearXNG 或 Tavily。某些提供商需要 API 密钥，而其他则不需要密钥。您也可以稍后使用 `openclaw configure --section web` 进行配置。文档：[Web tools](/zh/tools/web)。</Tip>

## QuickStart 与 Advanced

新手引导以 **QuickStart**（默认设置）与 **Advanced**（完全控制）开始。

<Tabs>
  <Tab title="QuickStart (默认设置)"Gateway(网关)Gateway(网关)>
    - 本地网关 (loopback)
    - 默认工作区 (或现有工作区)
    - Gateway(网关) 端口 **18789**
    - Gateway(网关) 认证 **Token** (自动生成，即使在 loopback 上)
    - 新本地设置的默认工具策略：`tools.profile: "coding"` (保留现有的显式配置)
    - 私信隔离默认值：当未设置时，本地新手引导会写入 `session.dmScope: "per-channel-peer"`CLI。详情：[CLI 设置参考](/zh/start/wizard-cli-reference#outputs-and-internalsTailscaleTelegramWhatsApp)
    - Tailscale 暴露 **关闭**
    - Telegram + WhatsApp 私信默认为 **allowlist** (系统将提示您输入电话号码)

  </Tab>
  <Tab title="Advanced (完全控制)">
    - 公开每个步骤 (模式、工作区、网关、频道、守护进程、技能)。

  </Tab>
</Tabs>

## 新手引导配置的内容

**本地模式（默认）** 将引导您完成以下步骤：

1. **模型/身份验证** — 选择任何支持的提供商/身份验证流程（API 密钥、OAuth 或特定于提供商的手动身份验证），包括自定义提供商
   （与 OpenAI 兼容、与 Anthropic 兼容或未知自动检测）。选择一个默认模型。
   安全提示：如果该代理将运行工具或处理 webhook/hooks 内容，请首选可用的最强最新一代模型，并保持严格的工具策略。较弱/较旧的层级更容易受到提示注入攻击。
   对于非交互式运行，`--secret-input-mode ref` 在身份验证配置文件中存储环境变量支持的引用，而不是明文 API 密钥值。
   在非交互式 `ref` 模式下，必须设置提供商环境变量；在没有该环境变量的情况下传递内联密钥标志会快速失败。
   在交互式运行中，选择密钥引用模式允许您指向环境变量或已配置的提供商引用（`file` 或 `exec`），并在保存前进行快速的预检查验证。
   对于 Anthropic，交互式新手引导/配置提供 **Anthropic Claude CLI** 作为首选的本地路径，并提供 **Anthropic API 密钥** 作为推荐的生产路径。Anthropic setup-token 也仍然作为一种支持的令牌身份验证路径可用。
2. **工作区** — 代理文件的位置（默认为 `~/.openclaw/workspace`）。生成引导文件。
3. **Gateway(网关)** — 端口、绑定地址、身份验证模式、Tailscale 暴露。
   在交互式令牌模式下，选择默认明文令牌存储或选择加入 SecretRef。
   非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **通道** — 内置和官方插件聊天通道，例如 iMessage、Discord、飞书、Google Chat、Mattermost、Microsoft Teams、QQ 机器人、Signal、Slack、Telegram、WhatsApp 等等。
5. **Daemon** — 安装 LaunchAgent (macOS)、systemd 用户单元 (Linux/WSL2) 或具有每用户启动文件夹回退机制的原生 Windows 计划任务。
   如果 token 身份验证需要 token 且 `gateway.auth.token` 由 SecretRef 管理，daemon 安装会验证它，但不会将解析后的 token 持久化到 supervisor 服务环境元数据中。
   如果 token 身份验证需要 token 且配置的 token SecretRef 未解析，daemon 安装将被阻止，并提供可操作的指导。
   如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，则在显式设置 mode 之前，daemon 安装将被阻止。
6. **Health check** — 启动 Gateway(网关) 并验证其正在运行。
7. **Skills** — 安装推荐的 Skills 和可选依赖项。

<Note>重新运行新手引导**不会**清除任何内容，除非您显式选择 **Reset**（或传递 `--reset`）。 CLI `--reset` 默认包括配置、凭据和会话；使用 `--reset-scope full` 以包括工作区。 如果配置无效或包含旧版键，新手引导会要求您先运行 `openclaw doctor`。</Note>

**Remote mode** 仅配置本地客户端以连接到其他地方的 Gateway(网关)。
它**不会**在远程主机上安装或更改任何内容。

## 添加另一个 Agent

使用 `openclaw agents add <name>` 创建一个具有自己的工作区、会话和身份验证配置文件的独立 Agent。在没有 `--workspace` 的情况下运行会启动新手引导。

设置内容：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

注意：

- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 以路由传入消息（新手引导可以执行此操作）。
- 非交互式标志：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整参考

如需详细的逐步说明和配置输出，请参阅
[CLI 设置参考](/zh/start/wizard-cli-reference)。
有关非交互式示例，请参阅 [CLI 自动化](/zh/start/wizard-cli-automation)。
有关更深的技术参考（包括 RPC 详细信息），请参阅
[新手引导参考](/zh/reference/wizard)。

## 相关文档

- CLI 命令参考：[`openclaw onboard`](/zh/cli/onboard)
- 新手引导概述：[新手引导概述](/zh/start/onboarding-overview)
- macOS 应用新手引导：[新手引导](/zh/start/onboarding)
- Agent 首次运行仪式：[Agent 引导](/zh/start/bootstrapping)
