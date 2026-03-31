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
它在一个引导式流程中配置本地 Gateway 或远程 Gateway 连接，以及频道、技能
和工作区默认值。

```bash
openclaw onboard
```

<Info>最快开启首次对话：打开控制 UI（无需设置渠道）。运行 `openclaw dashboard` 并在浏览器中聊天。文档：[Dashboard](/en/web/dashboard)。</Info>

稍后重新配置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`。</Note>

<Tip>CLI 新手引导包含一个网络搜索步骤，您可以选择提供商 (Perplexity, Brave, Gemini, Grok, 或 Kimi) 并粘贴您的 API 密钥，以便代理 可以使用 `web_search`。您也可以稍后使用 `openclaw configure --section web` 进行配置。文档：[Web tools](/en/tools/web)。</Tip>

## QuickStart 与高级选项

新手引导以 **QuickStart**（默认设置）与 **Advanced**（完全控制）的选择开始。

<Tabs>
  <Tab title="QuickStart (defaults)">
    - 本地 Gateway (loopback) - 工作区默认值（或现有工作区） - Gateway 端口 **18789** - Gateway 认证 **Token**（自动生成，即使在 loopback 上） - 新本地设置的工具策略默认值：`tools.profile: "coding"`（现有的显式配置文件将被保留） - 私信隔离默认值：本地新手引导在未设置时写入 `session.dmScope: "per-channel-peer"`。详情：[CLI Setup Reference](/en/start/wizard-cli-reference#outputs-and-internals) -
    Tailscale 暴露 **关闭** - Telegram + WhatsApp 私信默认为 **允许列表**（系统将提示您输入电话号码）
  </Tab>
  <Tab title="Advanced (full control)">- 显示每个步骤（模式、工作区、网关、通道、守护进程、技能）。</Tab>
</Tabs>

## 新手引导配置的内容

**本地模式（默认）** 将引导您完成以下步骤：

1. **模型/认证** — 选择任何支持的提供商/认证流程（API 密钥、OAuth 或 setup-token），包括自定义提供商
   （OpenAI 兼容、Anthropic 兼容或未知自动检测）。选择默认模型。
   安全说明：如果此代理将运行工具或处理 webhook/hooks 内容，请首选可用的最强最新一代模型，并保持严格的工具策略。较弱/较旧的层级更容易受到提示注入攻击。
   对于非交互式运行，`--secret-input-mode ref` 将基于环境的引用存储在认证配置文件中，而不是明文 API 密钥值。
   在非交互式 `ref` 模式下，必须设置提供商环境变量；在没有该环境变量的情况下传递内联密钥标志将快速失败。
   在交互式运行中，选择密钥引用模式允许您指向环境变量或配置的提供商引用（`file` 或 `exec`），并在保存前进行快速预检验证。
2. **工作区** — 代理文件的位置（默认为 `~/.openclaw/workspace`）。种子引导文件。
3. **Gateway 网关** — 端口、绑定地址、身份验证模式、Tailscale 暴露。
   在交互式令牌模式下，选择默认的明文令牌存储或选择使用 SecretRef。
   非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **Channels** — WhatsApp、Telegram、Discord、Google Chat、Mattermost、Signal、BlueBubbles 或 iMessage。
5. **Daemon** — 安装 LaunchAgent (macOS) 或 systemd 用户单元 (Linux/WSL2)。
   如果令牌认证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会对其进行验证，但不会将解析出的令牌持久化到 supervisor 服务环境元数据中。
   如果令牌认证需要令牌且配置的令牌 SecretRef 未解析，守护进程安装将被阻止，并提供可操作的指导。
   如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置，且 `gateway.auth.mode` 未设置，则在明确设置模式之前，守护进程安装将被阻止。
6. **健康检查** — 启动 Gateway(网关) 并验证其是否正在运行。
7. **Skills** — 安装推荐的 Skills 和可选依赖项。

<Note>重新运行新手引导**不会**清除任何内容，除非您明确选择 **Reset**（或传递 `--reset`）。 CLI `--reset` 默认针对配置、凭据和会话；使用 `--reset-scope full` 以包含工作区。 如果配置无效或包含旧版密钥，新手引导会要求您先运行 `openclaw doctor`。</Note>

**Remote mode** 仅配置本地客户端以连接到其他位置的 Gateway(网关)。
它**不会**在远程主机上安装或更改任何内容。

## 添加另一个 Agent

使用 `openclaw agents add <name>` 创建一个具有自己的工作区、
会话和认证配置文件的独立 Agent。不带 `--workspace` 运行会启动新手引导。

设置内容：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

注意：

- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 以路由传入消息（新手引导可以执行此操作）。
- 非交互式标志：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整参考

有关详细的分步说明和配置输出，请参阅
[CLI Setup Reference](/en/start/wizard-cli-reference)。
有关非交互式示例，请参阅 [CLI Automation](/en/start/wizard-cli-automation)。
有关更深入的技术参考，包括 RPC 详情，请参阅
[新手引导 Reference](/en/reference/wizard)。

## 相关文档

- CLI 命令参考：[`openclaw onboard`](/en/cli/onboard)
- 新手引导概述：[新手引导 Overview](/en/start/onboarding-overview)
- macOS 应用新手引导：[新手引导](/en/start/onboarding)
- Agent 首次运行仪式：[Agent 引导程序](/en/start/bootstrapping)
