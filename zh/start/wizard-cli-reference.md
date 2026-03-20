---
summary: "CLI 设置流程、auth/模型 设置、输出和内部机制的完整参考"
read_when:
  - 您需要了解 openclaw onboard 的详细行为
  - 您正在调试新手引导结果或集成新手引导客户端
title: "CLI Setup Reference"
sidebarTitle: "CLI reference"
---

# CLI 设置参考

此页面是 `openclaw onboard` 的完整参考。
有关简短指南，请参阅 [新手引导 (CLI)](/zh/start/wizard)。

## 向导的功能

本地模式（默认）将引导您完成以下步骤：

- 模型和身份验证设置（OpenAI Code 订阅 OAuth、Anthropic API 密钥或设置令牌，以及 MiniMax、GLM、Ollama、Moonshot 和 AI Gateway(网关) 选项）
- 工作区位置和引导文件
- Gateway(网关) 设置（端口、绑定、认证、tailscale）
- 渠道和提供商（Telegram、WhatsApp、Discord、Google Chat、Mattermost 插件、Signal）
- 守护进程安装（LaunchAgent 或 systemd 用户单元）
- 健康检查
- Skills 设置

远程模式将此计算机配置为连接到其他位置的网关。
它不会在远程主机上安装或修改任何内容。

## 本地流程详情

<Steps>
  <Step title="Existing config detection">
    - 如果 `~/.openclaw/openclaw.json` 存在，请选择保留、修改或重置。
    - 重新运行向导不会清除任何内容，除非您明确选择重置（或传递 `--reset`）。
    - CLI `--reset` 默认为 `config+creds+sessions`；使用 `--reset-scope full` 也可以删除工作区。
    - 如果配置无效或包含旧版密钥，向导将停止并要求您在继续之前运行 `openclaw doctor`。
    - 重置使用 `trash` 并提供范围：
      - 仅配置
      - 配置 + 凭证 + 会话
      - 完全重置（也会删除工作区）
  </Step>
  <Step title="Model and auth">
    - 完整的选项矩阵请参见 [Auth and 模型 options](#auth-and-model-options)。
  </Step>
  <Step title="Workspace">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 为首次运行的引导程序提供所需的工作区文件。
    - 工作区布局：[Agent workspace](/zh/concepts/agent-workspace)。
  </Step>
  <Step title="Gateway(网关)">
    - 提示输入端口、绑定、身份验证模式和 Tailscale 暴露设置。
    - 建议：即使对于环回地址，也保持令牌身份验证已启用，以便本地 WS 客户端必须进行身份验证。
    - 在令牌模式下，交互式设置提供：
      - **生成/存储明文令牌**（默认）
      - **使用 SecretRef**（可选加入）
    - 在密码模式下，交互式设置也支持明文或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在新手引导流程环境中有一个非空的 环境变量。
      - 不能与 `--gateway-token` 结合使用。
    - 仅当您完全信任每个本地进程时，才禁用身份验证。
    - 非环回绑定仍然需要身份验证。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/zh/channels/whatsapp)：可选的 QR 登录
    - [Telegram](/zh/channels/telegram)：bot 令牌
    - [Discord](/zh/channels/discord)：bot 令牌
    - [Google Chat](/zh/channels/googlechat)：服务账户 JSON + webhook 受众
    - [Mattermost](/zh/channels/mattermost) 插件：bot 令牌 + 基础 URL
    - [Signal](/zh/channels/signal)：可选 `signal-cli` 安装 + 账户配置
    - [BlueBubbles](/zh/channels/bluebubbles)：推荐用于 iMessage；服务器 URL + 密码 + webhook
    - [iMessage](/zh/channels/imessage)：传统 `imsg` CLI 路径 + 数据库访问
    - 私信安全：默认为配对。第一条私信发送一个代码；通过
      `openclaw pairing approve <channel> <code>` 批准或使用允许列表。
  </Step>
  <Step title="Daemon install">
    - macOS：LaunchAgent
      - 需要登录用户会话；对于无头环境，请使用自定义 LaunchDaemon（未附带）。
    - Linux 和通过 Windows 的 WSL2：systemd 用户单元
      - 向导尝试 `loginctl enable-linger <user>`，以便网关在注销后保持运行。
      - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - 运行时选择：Node（推荐；WhatsApp 和 Telegram 必需）。不推荐 Bun。
  </Step>
  <Step title="健康检查">
    - 启动网关（如果需要）并运行 `openclaw health`。
    - `openclaw status --deep` 会向状态输出添加网关健康探测。
  </Step>
  <Step title="Skills">
    - 读取可用的 Skills 并检查要求。
    - 让您选择节点管理器：npm 或 pnpm（不推荐 bun）。
    - 安装可选依赖项（部分在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要和后续步骤，包括 iOS、Android 和 macOS 应用选项。
  </Step>
</Steps>

<Note>
  如果未检测到 GUI，向导将打印 Control UI 的 SSH 端口转发说明，而不是打开浏览器。 如果 Control UI
  资源缺失，向导将尝试构建它们；回退方案是 `pnpm ui:build`（自动安装 UI 依赖）。
</Note>

## Remote mode details

Remote mode configures this machine to connect to a gateway elsewhere.

<Info>远程模式不会在远程主机上安装或修改任何内容。</Info>

What you set:

- 远程网关 URL (`ws://...`)
- Token if remote gateway auth is required (recommended)

<Note>
  - 如果网关仅限本地回环，请使用 SSH 隧道或 tailnet。 - 设备发现提示： - macOS：Bonjour (`dns-sd`) -
  Bonjour：Avahi (`avahi-browse`)
</Note>

## 身份验证和模型选项

<AccordionGroup>
  <Accordion title="Anthropic API 密钥">
    如果存在则使用 `ANTHROPIC_API_KEY`，或提示输入密钥，然后将其保存供守护进程使用。
  </Accordion>
  <Accordion title="Anthropic OAuth (Claude Code CLI)">
    - macOS：检查钥匙串项 "Claude Code-credentials"
    - Linux 和 Windows：如果存在则重用 `~/.claude/.credentials.json`

    在 macOS 上，选择“始终允许”，以免 launchd 启动被阻塞。

  </Accordion>
  <Accordion title="Anthropic 令牌 (setup-token paste)">
    在任何机器上运行 `claude setup-token`，然后粘贴令牌。
    您可以为其命名；留空则使用默认值。
  </Accordion>
  <Accordion title="OpenAI Code 订阅 (Codex CLI 重用)">
    如果 `~/.codex/auth.json` 存在，向导可以重用它。
  </Accordion>
  <Accordion title="OpenAI Code 订阅 (OAuth)">
    浏览器流程；粘贴 `code#state`。

    当模型未设置或为 `openai/*` 时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.4`。

  </Accordion>
  <Accordion title="OpenAI API 密钥">
    如果存在 `OPENAI_API_KEY` 则使用它，否则提示输入密钥，然后将凭据存储在 auth profiles 中。

    当模型未设置、为 `openai/*` 或 `openai-codex/*` 时，将 `agents.defaults.model` 设置为 `openai/gpt-5.1-codex`。

  </Accordion>
  <Accordion title="xAI (Grok) API 密钥">
    提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供商。
  </Accordion>
  <Accordion title="OpenCode">
    提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）并允许您选择 Zen 或 Go 目录。
    设置 URL：[opencode.ai/auth](https://opencode.ai/auth)。
  </Accordion>
  <Accordion title="API 密钥（通用）">
    为您存储密钥。
  </Accordion>
  <Accordion title="Vercel AI Gateway(网关)">
    提示输入 `AI_GATEWAY_API_KEY`。
    更多详情：[Vercel AI Gateway(网关)](/zh/providers/vercel-ai-gateway)。
  </Accordion>
  <Accordion title="Cloudflare AI Gateway(网关)">
    提示输入账户 ID、网关 ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    更多详情：[Cloudflare AI Gateway(网关)](/zh/providers/cloudflare-ai-gateway)。
  </Accordion>
  <Accordion title="MiniMax M2.5">
    配置会自动写入。
    更多详情：[MiniMax](/zh/providers/minimax)。
  </Accordion>
  <Accordion title="Synthetic (Anthropic-兼容)">
    提示输入 `SYNTHETIC_API_KEY`。
    更多详情：[Synthetic](/zh/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama（云端和本地开源模型）">
    提示输入基础 URL（默认为 `http://127.0.0.1:11434`），然后提供“云端 + 本地”或“仅本地”模式。
    发现可用模型并建议默认选项。
    更多详情：[Ollama](/zh/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot 和 Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 配置会自动写入。
    更多详情：[Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)。
  </Accordion>
  <Accordion title="自定义提供商">
    适用于 OpenAI 兼容和 Anthropic 兼容的端点。

    交互式新手引导支持与其他提供商 API 密钥流程相同的 API 密钥存储选项：
    - **现在粘贴 API 密钥**（明文）
    - **使用密钥引用**（环境变量引用或已配置的提供商引用，并包含预检验证）

    非交互式标志：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（可选；回退到 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（可选）
    - `--custom-compatibility <openai|anthropic>`（可选；默认为 `openai`）

  </Accordion>
  <Accordion title="跳过">
    保持身份验证未配置状态。
  </Accordion>
</AccordionGroup>

模型行为：

- 从检测到的选项中选择默认模型，或手动输入提供商和模型。
- 向导会运行模型检查，如果配置的模型未知或缺少身份验证，则会发出警告。

凭据和配置文件路径：

- OAuth 凭据：`~/.openclaw/credentials/oauth.json`
- 身份验证配置文件（API 密钥 + OAuth）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

凭据存储模式：

- 默认的新手引导行为会将 API 密钥作为纯文本值保留在身份验证配置文件中。
- `--secret-input-mode ref` 启用引用模式，而不是明文密钥存储。
  在交互式设置中，您可以选择：
  - 环境变量引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已配置的提供商引用（`file` 或 `exec`），需带有提供商别名和 ID
- 交互式引用模式在保存之前会运行快速预检验证。
  - 环境变量引用：验证当前新手引导环境中的变量名称和非空值。
  - 提供商引用：验证提供商配置并解析请求的 ID。
  - 如果预检失败，新手引导会显示错误并允许您重试。
- 在非交互模式下，`--secret-input-mode ref` 仅支持环境变量后备。
  - 在 新手引导 进程环境中设置 提供商 环境变量。
  - 内联密钥标志（例如 `--openai-api-key`）要求必须设置相应的环境变量；否则新手引导将快速失败。
  - 对于自定义提供商，非交互式 `ref` 模式将 `models.providers.<id>.apiKey` 存储为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在那种自定义提供商的情况下，`--custom-api-key` 要求必须设置 `CUSTOM_API_KEY`；否则新手引导会快速失败。
- Gateway 身份验证凭据在交互式设置中支持明文和 SecretRef 选择：
  - 令牌模式：**生成/存储明文令牌**（默认）或 **使用 SecretRef**。
  - 密码模式：明文或 SecretRef。
- 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
- 现有的明文设置继续不受影响地工作。

<Note>
  Headless 和服务器提示：在带有浏览器的机器上完成 OAuth，然后将
  `~/.openclaw/credentials/oauth.json`（或
  `$OPENCLAW_STATE_DIR/credentials/oauth.json`）复制到网关主机。
</Note>

## 输出与内部细节

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（如果未设置，本地新手引导默认为 `"coding"`；保留现有的显式值）
- `gateway.*`（mode、bind、auth、tailscale）
- `session.dmScope`（如果未设置，本地新手引导将其默认为 `per-channel-peer`；保留现有的显式值）
- `channels.telegram.botToken`、`channels.discord.token`、`channels.signal.*`、`channels.imessage.*`
- 频道允许列表（Slack、Discord、Matrix、Microsoft Teams），当您在提示期间选择加入时（如果可能，名称将解析为 ID）
- `skills.install.nodeManager`
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据位于 `~/.openclaw/credentials/whatsapp/<accountId>/` 下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。

<Note>
  某些渠道以插件形式提供。在设置过程中选择时，向导会在配置渠道之前提示安装插件（npm 或本地路径）。
</Note>

Gateway(网关) 向导 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客户端（macOS 应用和控制 UI）可以渲染步骤，而无需重新实现引导逻辑。

Signal 设置行为：

- 下载相应的发布资源
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 下
- 在配置中写入 `channels.signal.cliPath`
- JVM 构建需要 Java 21
- 尽可能使用原生构建
- Windows 使用 WSL2 并在 WSL 内部遵循 Linux signal-cli 流程

## 相关文档

- 新手引导中心：[新手引导（CLI）](/zh/start/wizard)
- 自动化与脚本：[CLI 自动化](/zh/start/wizard-cli-automation)
- 命令参考：[`openclaw onboard`](/zh/cli/onboard)

import zh from "/components/footer/zh.mdx";

<zh />
