---
summary: "CLI 入门向导：针对网关、工作区、频道和技能的引导式设置"
read_when:
  - Running or configuring the onboarding wizard
  - Setting up a new machine
title: "入门向导 (CLI)"
sidebarTitle: "入门：CLI"
---

# 入门向导 (CLI)

入门向导是在 macOS、
Linux 或 Windows（通过 WSL2；强烈推荐）上设置 OpenClaw 的**推荐**方式。
它在一个引导流程中配置本地 Gateway 网关 或远程 Gateway 网关 连接，以及渠道、技能
和工作区默认设置。

```bash
openclaw onboard
```

<Info>
最快的首次对话方式：打开控制 UI（无需设置频道）。运行
`openclaw dashboard` 并在浏览器中对话。文档：[仪表板](/zh/en/web/dashboard)。
</Info>

若稍后要重新配置：

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不意味着非交互模式。对于脚本，请使用 `--non-interactive`。
</Note>

<Tip>
入门向导包含一个网络搜索步骤，您可以选择提供商
（Perplexity、Brave、Gemini、Grok 或 Kimi）并粘贴您的 API 密钥，以便代理
可以使用 `web_search`。您也可以稍后使用
`openclaw configure --section web` 进行配置。文档：[Web 工具](/zh/en/tools/web)。
</Tip>

## 快速入门与高级模式对比

向导从**快速入门**（默认设置）与**高级**（完全控制）开始。

<Tabs> <Tab title="快速开始（默认设置）"> - 本地网关 (loopback) - 工作区默认值（或现有工作区） - Gateway 网关 端口 **18789** - Gateway 网关 认证 **Token**（自动生成，即使在环回地址上） - 新本地设置的默认工具策略：`tools.profile: "coding"`（保留现有的显式配置） - 默认 私信 隔离：本地入门会在未设置时写入 `session.dmScope: "per-channel-peer"`。详情：[CLI 入门参考](/zh/en/start/向导-cli-reference#outputs-and-internals) - Tailscale 暴露 **关闭** - Telegram + WhatsApp 私信 默认为 **允许列表**（将提示您输入电话号码） </Tab> <Tab title="高级（完全控制）"> - 暴露每个步骤（模式、工作区、Gateway 网关、频道、守护进程、技能）。 </Tab>
</Tabs>

## 向导配置的内容

**本地模式（默认）** 将引导您完成以下步骤：

1. **模型/认证** — 选择任何支持的提供商/认证流程（API 密钥、OAuth 或 setup-token），包括自定义提供商
   （兼容 OpenAI、兼容 Anthropic 或未知自动检测）。选择一个默认模型。
   安全提示：如果该代理将运行工具或处理 webhook/hooks 内容，请尽可能选择可用的最强最新一代模型，并保持严格的工具策略。较弱/较旧的层级的模型更容易被提示注入。
   对于非交互式运行，`--secret-input-mode ref` 会将环境变量支持的引用存储在身份验证配置文件中，而不是纯文本 API 密钥值。
   在非交互式 `ref` 模式下，必须设置提供商环境变量；在没有该环境变量的情况下传递内联密钥标志会快速失败。
   在交互式运行中，选择密钥引用模式允许您指向环境变量或配置的提供商引用（`file` 或 `exec`），并在保存前进行快速预检验证。
2. **Workspace** — 代理文件的位置（默认为 `~/.openclaw/workspace`）。植入引导文件。
3. **Gateway 网关** — 端口、绑定地址、认证模式、Tailscale 暴露。
   在交互式令牌模式下，选择默认的纯文本令牌存储或选择使用 SecretRef。
   非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
4. **通道** — WhatsApp、Telegram、Discord、Google Chat、Mattermost、Signal、BlueBubbles 或 iMessage。
5. **守护进程** — 安装 LaunchAgent (macOS) 或 systemd 用户单元（Linux）（WSL2）。
   如果令牌身份验证需要令牌且 `gateway.auth.token` 由 SecretRef 管理，守护进程安装会对其进行验证，但不会将解析出的令牌持久化到主管服务环境元数据中。
   如果令牌身份验证需要令牌且配置的令牌 SecretRef 未解析，守护进程安装将被阻止并提供可操作的指导。
   如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置且 `gateway.auth.mode` 未设置，守护进程安装将被阻止，直到明确设置模式。
6. **健康检查** — 启动 Gateway 网关 并验证其正在运行。
7. **技能** — 安装推荐的技能和可选的依赖项。

<Note>
重新运行向导**不会**清除任何内容，除非您明确选择 **Reset**（或传递 `--reset`）。
CLI `--reset` 默认包括配置、凭据和会话；使用 `--reset-scope full` 以包含工作区。
如果配置无效或包含旧版密钥，向导会要求您先运行 `openclaw doctor`。
</Note>

**远程模式** 仅配置本地客户端以连接到其他位置的 Gateway 网关。
它**不会**在远程主机上安装或更改任何内容。

## 添加另一个代理

使用 `openclaw agents add <name>` 创建一个具有自己的工作区、会话和身份验证配置文件的独立代理。不带 `--workspace` 运行将启动向导。

设置内容：

- `agents.list[].name`
- `agents.list[].workspace`
- `agents.list[].agentDir`

注意：

- 默认工作区遵循 `~/.openclaw/workspace-<agentId>`。
- 添加 `bindings` 以路由入站消息（向导可以执行此操作）。
- 非交互式标志：`--model`、`--agent-dir`、`--bind`、`--non-interactive`。

## 完整参考

有关详细的逐步分解、非交互式脚本、Signal 设置、
RPC API 以及向导写入的配置字段的完整列表，请参阅
[Wizard Reference](/zh/en/reference/向导)。

## 相关文档

- CLI 命令参考：[`openclaw onboard`](/zh/en/cli/onboard)
- 入门概述：[新手引导 Overview](/zh/en/start/新手引导-overview)
- macOS 应用入门：[新手引导](/zh/en/start/新手引导)
- 代理首次运行仪式：[Agent Bootstrapping](/zh/en/start/bootstrapping)

import zh from '/components/footer/zh.mdx';

<zh />
