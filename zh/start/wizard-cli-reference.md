---
summary: "CLI 新手引导流程、身份验证/模型设置、输出及内部机制的完整参考"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "CLI 新手引导参考"
sidebarTitle: "CLI 参考"
---

# CLI 新手引导参考

本页是 `openclaw onboard` 的完整参考。
有关简短指南，请参阅 [新手引导向导 (CLI)](/en/start/wizard)。

## 向导的功能

本地模式（默认）将引导您完成以下步骤：

- 模型和认证设置（OpenAI Code 订阅 OAuth、Anthropic API 密钥或设置令牌，以及 MiniMax、GLM、Moonshot 和 AI 网关选项）
- 工作区位置和引导文件
- Gateway(网关) 设置（端口、绑定、认证、tailscale）
- 渠道和提供商（Telegram、WhatsApp、Discord、Google Chat、Mattermost 插件、Signal）
- 守护进程安装（LaunchAgent 或 systemd 用户单元）
- 健康检查
- Skills 设置

远程模式将此机器配置为连接到别处的网关。
它不会在远程主机上安装或修改任何内容。

## 本地流程详情

<Steps>
  <Step title="现有配置检测">
    - 如果 `~/.openclaw/openclaw.json` 存在，请选择保留、修改或重置。
    - 重新运行向导不会清除任何内容，除非您明确选择重置（或传递 `--reset`）。
    - CLI `--reset` 默认为 `config+creds+sessions`；请使用 `--reset-scope full` 同时删除工作区。
    - 如果配置无效或包含旧密钥，向导将停止并要求您在继续之前运行 `openclaw doctor`。
    - 重置使用 `trash` 并提供以下范围：
      - 仅配置
      - 配置 + 凭证 + 会话
      - 完全重置（同时删除工作区）
  </Step>
  <Step title="模型和身份验证">
    - 完整的选项矩阵请参阅 [身份验证和模型选项](#auth-and-model-options)。
  </Step>
  <Step title="Workspace">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 为首次运行引导仪式所需的工作区文件设定种子。
    - 工作区布局：[Agent workspace](/en/concepts/agent-workspace)。
  </Step>
  <Step title="Gateway 网关">
    - 提示输入端口、绑定、身份验证模式和 Tailscale 暴露设置。
    - 建议：即使对于环回地址，也保持令牌身份验证已启用，以便本地 WebSocket 客户端必须进行身份验证。
    - 在令牌模式下，交互式新手引导提供：
      - **生成/存储纯文本令牌**（默认）
      - **使用 SecretRef**（可选）
    - 在密码模式下，交互式新手引导也支持纯文本或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 要求新手引导流程环境中存在非空的环境变量。
      - 不能与 `--gateway-token` 结合使用。
    - 仅当您完全信任每个本地进程时，才禁用身份验证。
    - 非环回绑定仍然需要身份验证。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/en/channels/whatsapp)：可选的二维码登录
    - [Telegram](/en/channels/telegram)：bot token
    - [Discord](/en/channels/discord)：bot token
    - [Google Chat](/en/channels/googlechat)：服务账号 JSON + webhook 受众
    - [Mattermost](/en/channels/mattermost) 插件：bot token + base URL
    - [Signal](/en/channels/signal)：可选的 `signal-cli` 安装 + 账号配置
    - [BlueBubbles](/en/channels/bluebubbles)：推荐用于 iMessage；服务器 URL + 密码 + webhook
    - [iMessage](/en/channels/imessage)：旧版 `imsg` CLI 路径 + 数据库访问权限
    - 私信安全：默认为配对。第一条私信会发送一个代码；通过
      `openclaw pairing approve <channel> <code>` 批准或使用允许列表。
  </Step>
  <Step title="Daemon install">
    - macOS：LaunchAgent
      - 需要登录用户会话；对于无头模式，请使用自定义 LaunchDaemon（未附带）。
    - Linux 和通过 WSL2 的 Windows：systemd 用户单元
      - 向导尝试 `loginctl enable-linger <user>`，以便网关在登出后保持运行。
      - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - 运行时选择：Node（推荐；WhatsApp 和 Telegram 必需）。不推荐 Bun。
  </Step>
  <Step title="Health check">
    - 启动网关（如果需要）并运行 `openclaw health`。
    - `openclaw status --deep` 将网关健康探针添加到状态输出中。
  </Step>
  <Step title="Skills">
    - 读取可用的 Skills 并检查要求。
    - 让您选择节点管理器：npm 或 pnpm（不建议使用 bun）。
    - 安装可选依赖项（某些在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要和后续步骤，包括 iOS、Android 和 macOS 应用选项。
  </Step>
</Steps>

<Note>
  如果未检测到 GUI，向导会打印用于 Control UI 的 SSH 端口转发说明，而不是打开浏览器。 如果 Control
  UI 资源缺失，向导会尝试构建它们；回退方案是 `pnpm ui:build`（自动安装 UI 依赖项）。
</Note>

## Remote mode details

Remote mode configures this machine to connect to a gateway elsewhere.

<Info>Remote mode does not install or modify anything on the remote host.</Info>

What you set:

- Remote gateway URL (`ws://...`)
- Token if remote gateway auth is required (recommended)

<Note>
  - If gateway is loopback-only, use SSH tunneling or a tailnet. - 设备发现 hints: - macOS: Bonjour
  (`dns-sd`) - Linux: Avahi (`avahi-browse`)
</Note>

## 身份验证和模型选项

<AccordionGroup>
  <Accordion title="Anthropic API 密钥">
    如果存在 `ANTHROPIC_API_KEY` 则使用，否则提示输入密钥，然后将其保存以供守护进程使用。
  </Accordion>
  <Accordion title="Anthropic OAuth (Claude Code CLI)">
    - macOS：检查钥匙串项 "Claude Code-credentials"
    - Linux 和 Windows：如果存在 `~/.claude/.credentials.json` 则复用

    在 macOS 上，选择“始终允许”，以便 launchd 启动不会受阻。

  </Accordion>
  <Accordion title="Anthropic 令牌（粘贴 setup-token）">
    在任何机器上运行 `claude setup-token`，然后粘贴令牌。
    您可以为其命名；留空则使用默认值。
  </Accordion>
  <Accordion title="OpenAI Code 订阅（复用 Codex CLI）">
    如果存在 `~/.codex/auth.json`，向导可以复用它。
  </Accordion>
  <Accordion title="OpenAI Code 订阅（OAuth）">
    浏览器流程；粘贴 `code#state`。

    当模型未设置或为 `openai/*` 时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.4`。

  </Accordion>
  <Accordion title="OpenAI API 密钥">
    如果存在 `OPENAI_API_KEY` 则使用，否则提示输入密钥，然后将凭据存储在身份验证配置文件中。

    当模型未设置、为 `openai/*` 或为 `openai-codex/*` 时，将 `agents.defaults.model` 设置为 `openai/gpt-5.1-codex`。

  </Accordion>
  <Accordion title="xAI (Grok) API 密钥">
    提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供商。
  </Accordion>
  <Accordion title="OpenCode">
    提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）并允许您选择 Zen 或 Go 目录。
    设置 URL：[opencode.ai/auth](https://opencode.ai/auth)。
  </Accordion>
  <Accordion title="API key (generic)">
    为您存储密钥。
  </Accordion>
  <Accordion title="Vercel AI Gateway">
    提示输入 `AI_GATEWAY_API_KEY`。
    更多详情：[Vercel AI Gateway](/en/providers/vercel-ai-gateway)。
  </Accordion>
  <Accordion title="Cloudflare AI Gateway(网关)">
    提示输入帐户 ID、Gateway(网关) ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    更多详情：[Cloudflare AI Gateway(网关)](/en/providers/cloudflare-ai-gateway)。
  </Accordion>
  <Accordion title="MiniMax M2.5">
    配置会自动写入。
    更多详情：[MiniMax](/en/providers/minimax)。
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    提示输入 `SYNTHETIC_API_KEY`。
    更多详情：[Synthetic](/en/providers/synthetic)。
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 配置会自动写入。
    更多详情：[Moonshot AI (Kimi + Kimi Coding)](/en/providers/moonshot)。
  </Accordion>
  <Accordion title="Custom 提供商">
    适用于与 OpenAI 和 Anthropic 兼容的端点。

    交互式新手引导支持与其他提供商 API 密钥流程相同的 API 密钥存储选择：
    - **立即粘贴 API 密钥**（明文）
    - **使用机密引用**（环境变量引用或已配置的提供商引用，带有预检验证）

    非交互式标志：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（可选；回退到 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（可选）
    - `--custom-compatibility <openai|anthropic>`（可选；默认 `openai`）

  </Accordion>
  <Accordion title="Skip">
    保持身份验证未配置状态。
  </Accordion>
</AccordionGroup>

模型行为：

- 从检测到的选项中选取默认模型，或手动输入提供商和模型。
- 向导会运行模型检查，如果配置的模型未知或缺少身份验证，则会发出警告。

凭据和配置文件路径：

- OAuth 凭据：`~/.openclaw/credentials/oauth.json`
- 身份验证配置文件（API 密钥 + OAuth）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

凭据存储模式：

- 默认的新手引导行为会将 API 密钥作为纯文本值保留在身份验证配置文件中。
- `--secret-input-mode ref` 启用引用模式，而不是纯文本密钥存储。
  在交互式新手引导中，您可以选择：
  - 环境变量引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已配置的提供商引用（`file` 或 `exec`），并带有提供商别名 + id
- 交互式引用模式在保存之前会运行快速预检验证。
  - 环境变量引用：验证当前新手引导环境中的变量名称和非空值。
  - 提供商引用：验证提供商配置并解析请求的 id。
  - 如果预检失败，新手引导会显示错误并允许您重试。
- 在非交互模式下，`--secret-input-mode ref` 仅由环境变量支持。
  - 在引导流程环境中设置提供商环境变量。
  - 内联密钥标志（例如 `--openai-api-key`）要求必须设置该环境变量；否则引导会快速失败。
  - 对于自定义提供商，非交互 `ref` 模式将 `models.providers.<id>.apiKey` 存储为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在该自定义提供商的情况下，`--custom-api-key` 要求必须设置 `CUSTOM_API_KEY`；否则引导会快速失败。
- Gateway(网关) 身份验证凭据在交互式新手引导中支持明文和 SecretRef 选项：
  - 令牌模式：**生成/存储明文令牌**（默认）或**使用 SecretRef**。
  - 密码模式：明文或 SecretRef。
- 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
- 现有的明文设置继续工作，无需更改。

<Note>
  无头和服务器提示：在有浏览器的机器上完成 OAuth，然后将 `~/.openclaw/credentials/oauth.json`（或
  `$OPENCLAW_STATE_DIR/credentials/oauth.json`） 复制到网关主机。
</Note>

## 输出和内部机制

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（本地引导在未设置时默认为 `"coding"`；保留现有的显式值）
- `gateway.*`（模式、绑定、身份验证、tailscale）
- `session.dmScope`（本地引导在未设置时将其默认为 `per-channel-peer`；保留现有的显式值）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 频道允许列表（Slack、Discord、Matrix、Microsoft Teams），当您在提示期间选择加入时（名称在可能时解析为 ID）
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据位于 `~/.openclaw/credentials/whatsapp/<accountId>/` 之下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 之下。

<Note>
  Some channels are delivered as plugins. When selected during 新手引导, the 向导 prompts to install
  the plugin (npm or local path) before 渠道 configuration.
</Note>

Gateway(网关) 向导 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客户端（macOS 应用程序和控制 UI）可以呈现步骤，而无需重新实现新手引导逻辑。

Signal 设置行为：

- 下载相应的发布资源
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 下
- 在配置中写入 `channels.signal.cliPath`
- JVM 构建需要 Java 21
- 如果可用，则使用本机构建
- Windows 使用 WSL2 并在 WSL 内部遵循 Linux signal-cli 流程

## 相关文档

- 新手引导中心：[新手引导向导 (CLI)](/en/start/wizard)
- 自动化和脚本：[CLI 自动化](/en/start/wizard-cli-automation)
- 命令参考：[`openclaw onboard`](/en/cli/onboard)

import zh from '/components/footer/zh.mdx';

<zh />
