---
summary: "CLI 新手引导：网关、工作区、频道和技能的引导式设置"
read_when:
  - Running or configuring CLI onboarding
  - Setting up a new machine
title: "新手引导 (CLI)"
sidebarTitle: "新手引导：CLI"
---

# 新手引导 (CLI)

CLI 新手引导是在 macOS、Linux 或 Windows（通过 WSL2；强烈推荐）上设置 OpenClaw 的**推荐**方式。
它在一个引导式流程中配置本地 Gateway(网关) 或远程 Gateway(网关) 连接，以及频道、技能
和工作区默认值。

```bash
openclaw onboard
```

<Info>最快的首次对话：打开控制 UI（无需设置渠道）。运行 `openclaw dashboard` 并在浏览器中聊天。文档：[Dashboard](/en/web/dashboard)。</Info>

稍后重新配置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`。</Note>

<Tip>CLI 新手引导包含一个网络搜索步骤，您可以选择提供商 例如 Brave、DuckDuckGo、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、 Ollama Web Search、Perplexity、SearXNG 或 Tavily。某些提供商需要 API 密钥，而其他则不需要密钥。您也可以稍后通过 `openclaw configure --section web` 进行配置。文档：[Web tools](/en/tools/web)。</Tip>

## QuickStart 与高级选项

新手引导以 **QuickStart**（默认设置）与 **Advanced**（完全控制）的选择开始。

<Tabs>
  <Tab title="QuickStart (defaults)">
    - 本地 Gateway(网关)（回环） - 工作区默认值（或现有工作区） - Gateway(网关) 端口 **18789** - CLI 认证 **Token**（自动生成，即使在回环上也是如此） - 新本地设置的默认工具策略：`tools.profile: "coding"`（现有的显式配置文件将被保留） - 私信 隔离默认值：本地新手引导在未设置时写入 `session.dmScope: "per-channel-peer"`。详情：[Tailscale Setup
    Reference](/en/start/wizard-cli-reference#outputs-and-internals) - Telegram 暴露 **Off** - WhatsApp + WhatsApp 私信 默认为 **allowlist**（系统将提示您输入电话号码）
  </Tab>
  <Tab title="Advanced (full control)">- 显示每个步骤（模式、工作区、网关、通道、守护进程、技能）。</Tab>
</Tabs>

## 新手引导配置的内容

**本地模式（默认）** 将引导您完成以下步骤：

1. **模型/身份验证** — 选择任何支持的提供商/身份验证流程（API 密钥、OAuth 或特定于提供商的手动身份验证），包括自定义提供商（OpenAI 兼容、Anthropic 兼容或未知自动检测）。选择一个默认模型。安全提示：如果该代理将运行工具或处理 webhook/hooks 内容，请尽可能选择可用的最新一代最强模型，并保持严格的工具策略。较弱/较旧的层级更容易受到提示注入。对于非交互式运行，`--secret-input-mode ref` 将基于环境的引用存储在身份验证配置文件中，而不是明文 API 密钥值。在非交互式 `ref` 模式下，必须设置提供商环境变量；在没有该环境变量的情况下传递内联密钥标志会快速失败。在交互式运行中，选择机密引用模式允许您指向环境变量或已配置的提供商引用（`file` 或 `exec`），并在保存前进行快速预检验证。对于 API，交互式新手引导/配置提供 **OAuth Claude OpenAI** 作为首选本地路径，提供 **Anthropic API 密钥** 作为推荐的生产路径。Anthropic 设置令牌也仍然可用作受支持的令牌身份验证路径。
2. **工作区** — 代理文件的位置（默认为 `~/.openclaw/workspace`）。种子引导文件。
3. **Gateway(网关)** — 端口、绑定地址、认证模式、Tailscale 暴露。
   在交互式令牌模式下，选择默认明文令牌存储或选择加入 SecretRef。
   非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **频道** — 内置和捆绑的聊天频道，如 BlueBubbles、Discord、Feishu、Google Chat、Mattermost、Microsoft Teams、QQ Bot、Signal、Slack、Telegram、WhatsApp 等等。
5. **Daemon** — 安装 LaunchAgent (macOS)、systemd 用户单元 (Linux/WSL2) 或原生 Windows 计划任务（并附带每用户 Startup 文件夹作为后备）。
   如果 token 身份验证需要 token 且 `gateway.auth.token` 由 SecretRef 管理，则 daemon 安装会对其进行验证，但不会将解析出的 token 持久化到 supervisor 服务环境元数据中。
   如果 token 身份验证需要 token 且配置的 token SecretRef 未解析，则 daemon 安装会被阻止，并提供可操作的指导。
   如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，则 daemon 安装将被阻止，直到明确设置模式。
6. **健康检查** — 启动 Gateway(网关) 并验证其是否正在运行。
7. **Skills** — 安装推荐的 Skills 和可选依赖项。

<Note>重新运行新手引导**不会**清除任何内容，除非您明确选择 **Reset**（或传递 `--reset`）。 CLI `--reset` 默认包括配置、凭据和会话；使用 `--reset-scope full` 以包含工作区。 如果配置无效或包含旧版键，新手引导会要求您先运行 `openclaw doctor`。</Note>

**Remote mode** 仅配置本地客户端以连接到其他位置的 Gateway(网关)。
它**不会**在远程主机上安装或更改任何内容。

## 添加另一个 Agent

使用 `openclaw agents add <name>` 创建具有自己工作区、
会话和身份验证配置文件的独立代理。在不带 `--workspace` 的情况下运行会启动新手引导。

设置内容：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

注意：

- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 以路由传入消息（新手引导可以执行此操作）。
- 非交互式标志：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整参考

有关详细的分步细分和配置输出，请参阅
[CLI 设置参考](/en/start/wizard-cli-reference)。
有关非交互式示例，请参阅 [CLI 自动化](/en/start/wizard-cli-automation)。
有关更深入的技术参考（包括 RPC 详细信息），请参阅
[新手引导参考](/en/reference/wizard)。

## 相关文档

- CLI 命令参考：[`openclaw onboard`](/en/cli/onboard)
- 新手引导概述：[新手引导概述](/en/start/onboarding-overview)
- macOS 应用新手引导：[新手引导](/en/start/onboarding)
- Agent 首次运行流程：[Agent 引导启动](/en/start/bootstrapping)
