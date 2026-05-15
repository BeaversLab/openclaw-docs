---
summary: "CLI 设置流程、身份验证/模型设置、输出和内部结构的完整参考"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "CLI 设置参考"
sidebarTitle: "CLI 参考"
---

此页面是 `openclaw onboard` 的完整参考。
如需简短指南，请参阅 [新手引导 (CLI)](/zh/start/wizard)。

## 向导的功能

本地模式（默认）将引导您完成以下步骤：

- 模型和身份验证设置（OpenAI Code 订阅 OAuth、Anthropic Claude CLI 或 API 密钥，以及 MiniMax、GLM、Ollama、Moonshot、StepFun 和 AI Gateway(网关) 选项）
- 工作区位置和引导文件
- Gateway(网关) 设置（端口、绑定、身份验证、Tailscale）
- 渠道和提供商（Telegram、WhatsApp、Discord、Google Chat、Mattermost、Signal、iMessage 以及其他捆绑的渠道插件）
- 守护进程安装（LaunchAgent、systemd 用户单元，或带有启动文件夹回退机制的本地 Windows 计划任务）
- 健康检查
- Skills 设置

远程模式将此机器配置为连接到其他地方的网关。
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
      - 完全重置（同时删除工作区）

  </Step>
  <Step title="Model and auth">
    - 完整的选项矩阵请参见 [Auth and 模型 options](#auth-and-model-options)。

  </Step>
  <Step title="Workspace">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 为首次运行的引导仪式所需的工作区文件进行播种。
    - 工作区布局：[Agent workspace](/zh/concepts/agent-workspace)。

  </Step>
  <Step title="Gateway(网关)Gateway(网关)">
    - 提示输入端口、绑定、认证模式和 Tailscale 暴露。
    - 建议：即使是回环地址，也保持令牌认证启用，以便本地 WS 客户端必须进行身份验证。
    - 在令牌模式下，交互式设置提供：
      - **生成/存储纯文本令牌**（默认）
      - **使用 SecretRef**（可选）
    - 在密码模式下，交互式设置也支持纯文本或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在新手引导进程环境中设置非空环境变量。
      - 不能与 `--gateway-token` 结合使用。
    - 仅当您完全信任每个本地进程时，才禁用认证。
    - 非回环绑定仍然需要认证。

  </Step>
  <Step title="Channels"WhatsApp>
    - [WhatsApp](/zh/channels/whatsappTelegram)：可选的 QR 登录
    - [Telegram](/zh/channels/telegramDiscord)：Bot 令牌
    - [Discord](/en/channels/discordGoogle Chat)：Bot 令牌
    - [Google Chat](/zh/channels/googlechatMattermost)：服务账户 JSON + Webhook 受众
    - [Mattermost](/zh/channels/mattermostSignal)：Bot 令牌 + 基础 URL
    - [Signal](/zh/channels/signal)：可选 `signal-cli`iMessage 安装 + 账户配置
    - [iMessage](/zh/channels/imessage)：`imsg`CLIGateway(网关) CLI 路径 + 消息数据库访问权限；当 Gateway 在非 Mac 设备上运行时，使用 SSH 包装器
    - 私信安全：默认为配对。第一条私信发送一个代码；通过
      `openclaw pairing approve <channel> <code>` 批准或使用允许列表。
  </Step>
  <Step title="守护进程安装">
    - macOS：LaunchAgent
      - 需要登录用户会话；对于无头模式，请使用自定义 LaunchDaemon（未附带）。
    - 通过 Linux 运行的 Windows 和 WSL2：systemd 用户单元
      - 向导尝试执行 `loginctl enable-linger <user>`，以便网关在注销后保持运行。
      - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - 原生 Windows：优先使用计划任务
      - 如果拒绝创建任务，OpenClaw 将回退到每用户启动文件夹登录项并立即启动网关。
      - 计划任务仍然是首选，因为它们提供更好的监督程序状态。
    - 运行时选择：Node（推荐；WhatsApp 和 Telegram 必需）。不建议使用 Bun。

  </Step>
  <Step title="健康检查">
    - 启动网关（如果需要）并运行 `openclaw health`。
    - `openclaw status --deep` 将实时网关健康探测添加到状态输出中，包括支持时的渠道探测。

  </Step>
  <Step title="Skills">
    - 读取可用的 Skills 并检查要求。
    - 让您选择节点管理器：npm、pnpm 或 bun。
    - 安装可选依赖项（有些在 macOS 上使用 Homebrew）。

  </Step>
  <Step title="完成">
    - 摘要和后续步骤，包括 iOS、Android 和 macOS 应用选项。

  </Step>
</Steps>

<Note>如果未检测到 GUI，向导将打印 Control UI 的 SSH 端口转发说明，而不是打开浏览器。 如果 Control UI 资源丢失，向导将尝试构建它们；回退方案是 `pnpm ui:build`（自动安装 UI 依赖项）。</Note>

## Remote mode details

Remote mode configures this machine to connect to a gateway elsewhere.

<Info>Remote mode does not install or modify anything on the remote host.</Info>

What you set:

- Remote gateway URL (`ws://...`)
- Token if remote gateway auth is required (recommended)

<Note>
- 如果网关仅限环回，请使用 SSH 隧道或 tailnet。
- 设备发现提示：
  - macOS：Bonjour (`dns-sd`)
  - Linux：Avahi (`avahi-browse`)

</Note>

## Auth and 模型 options

<AccordionGroup>
  <Accordion title="Anthropic API 密钥">
    如果存在 `ANTHROPIC_API_KEY` 则使用，否则提示输入密钥，然后将其保存以供守护进程使用。
  </Accordion>
  <Accordion title="OpenAIOpenAI 代码订阅 OAuth">
    浏览器流程；粘贴 `code#state`。

    当模型未设置或已是 OpenAI 系列时，通过 Codex 运行时将 `agents.defaults.model` 设置为 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAIOpenAI 代码订阅（设备配对）">
    使用短期设备代码的浏览器配对流程。

    当模型未设置或已是 OpenAI 系列时，通过 Codex 运行时将 `agents.defaults.model` 设置为 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="OpenAI API 密钥">
    如果存在 `OPENAI_API_KEY` 则使用，否则提示输入密钥，然后将凭据存储在身份验证配置文件中。

    当模型未设置、是 `openai/*` 或 `openai-codex/*` 时，将 `agents.defaults.model` 设置为 `openai/gpt-5.5`。

  </Accordion>
  <Accordion title="xAI (Grok) API 密钥">
    提示输入 `XAI_API_KEY` 并将 xAI 配置为模型提供商。
  </Accordion>
  <Accordion title="OpenCode">
    提示输入 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）并允许您选择 Zen 或 Go 目录。
    设置 URL：[opencode.ai/auth](https://opencode.ai/auth)。
  </Accordion>
  <Accordion title="API 密钥 (通用)">
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
  <Accordion title="MiniMax">
    配置会自动写入。托管默认值为 `MiniMax-M2.7`API；API 密钥设置使用
    `minimax/...`，而 OAuth 设置使用 `minimax-portal/...`。
    更多详情：[MiniMax](/zh/providers/minimax)。
  </Accordion>
  <Accordion title="StepFun">
    针对中国或全球端点上的 StepFun 标准版或 Step Plan，配置将自动写入。
    标准版目前包括 `step-3.5-flash`，Step Plan 还包括 `step-3.5-flash-2603`。
    更多详情：[StepFun](/zh/providers/stepfun)。
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    提示输入 `SYNTHETIC_API_KEY`。
    更多详情：[Synthetic](/zh/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    首先提示输入 `Cloud + Local`、`Cloud only` 或 `Local only`。
    `Cloud only` 使用带有 `https://ollama.com` 的 `OLLAMA_API_KEY`。
    主机支持的模式会提示输入基础 URL（默认为 `http://127.0.0.1:11434`），发现可用模型并建议默认值。
    `Cloud + Local` 还会检查该 Ollama 主机是否已登录以进行云访问。
    更多详情：[Ollama](/zh/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot and Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 配置将自动写入。
    更多详情：[Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)。
  </Accordion>
  <Accordion title="Custom 提供商"OpenAIAnthropicAPIAPIAPI>
    适用于与 OpenAI 兼容和与 Anthropic 兼容的端点。

    交互式新手引导支持与其他提供商 API 密钥流程相同的 API 密钥存储选择：
    - **立即粘贴 API 密钥**（纯文本）
    - **使用密钥引用**（环境变量引用或已配置的提供商引用，带有预检验证）

    非交互式标志：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（可选；回退到 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（可选）
    - `--custom-compatibility <openai|anthropic>`（可选；默认 `openai`）
    - `--custom-image-input` / `--custom-text-input`（可选；覆盖推断出的模型输入能力）

  </Accordion>
  <Accordion title="跳过">
    保持身份验证未配置状态。
  </Accordion>
</AccordionGroup>

模型行为：

- 从检测到的选项中选择默认模型，或手动输入提供商和模型。
- 自定义提供商新手引导会推断常见模型 ID 的图像支持，并仅在模型名称未知时才询问。
- 当从提供商身份验证选项开始新手引导时，模型选择器会自动首选该提供商。对于 Volcengine 和 BytePlus，同样的偏好也匹配它们的 coding-plan 变体（`volcengine-plan/*`，
  `byteplus-plan/*`）。
- 如果该首选提供商过滤结果为空，选择器将回退到完整目录，而不是不显示任何模型。
- 向导会运行模型检查，如果配置的模型未知或缺少身份验证，则会发出警告。

凭据和配置文件路径：

- 身份验证配置文件（API 密钥 + OAuth）：APIOAuth`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 旧版 OAuth 导入：OAuth`~/.openclaw/credentials/oauth.json`

凭据存储模式：

- 默认的新手引导行为会将 API 密钥作为纯文本值持久保存在身份验证配置文件中。
- `--secret-input-mode ref` 启用引用模式而不是纯文本密钥存储。
  在交互式设置中，您可以选择以下任一方式：
  - 环境变量引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已配置的提供商引用（`file` 或 `exec`），包含提供商别名 + ID
- 交互式引用模式在保存之前会运行快速的预检查验证。
  - 环境变量引用：验证当前新手引导环境中的变量名称 + 非空值。
  - 提供商引用：验证提供商配置并解析请求的 ID。
  - 如果预检查失败，新手引导会显示错误并允许您重试。
- 在非交互模式下，`--secret-input-mode ref` 仅支持环境变量。
  - 在引导流程环境中设置提供商环境变量。
  - 内联密钥标志（例如 `--openai-api-key`）要求必须设置该环境变量；否则新手引导会快速失败。
  - 对于自定义提供商，非交互式 `ref` 模式会将 `models.providers.<id>.apiKey` 存储为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在该自定义提供商情况下，`--custom-api-key` 要求必须设置 `CUSTOM_API_KEY`；否则新手引导会快速失败。
- Gateway(网关) 身份验证凭据在交互式设置中支持明文和 SecretRef 选择：
  - 令牌模式：**生成/存储明文令牌**（默认）或 **使用 SecretRef**。
  - 密码模式：明文或 SecretRef。
- 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
- 现有的明文设置将继续保持不变。

<Note>
Headless 和服务器提示：在带有浏览器的机器上完成 OAuth，然后将该代理的 OAuth`auth-profiles.json`（例如 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或匹配的 `$OPENCLAW_STATE_DIR/...` 路径）复制到网关主机。`credentials/oauth.json` 仅仅是旧版导入源。
</Note>

## 输出和内部机制

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- 当传递 `--skip-bootstrap` 时的 `agents.defaults.skipBootstrap`
- `agents.defaults.model` / `models.providers`（如果选择了 Minimax）
- `tools.profile`（如果未设置，本地新手引导默认为 `"coding"`；保留现有的显式值）
- `gateway.*`（mode、bind、auth、tailscale）
- `session.dmScope` （本地新手引导在未设置时默认将其设置为 `per-channel-peer`；现有的显式值将被保留）
- `channels.telegram.botToken`， `channels.discord.token`， `channels.matrix.*`， `channels.signal.*`， `channels.imessage.*`
- 当您在提示期间选择加入时的渠道允许列表（Slack， Discord， Matrix， Microsoft Teams）（名称在可能的情况下解析为 ID）
- `skills.install.nodeManager`
  - `setup --node-manager` 标志接受 `npm`、`pnpm` 或 `bun`。
  - 手动配置仍然可以稍后设置 `skills.install.nodeManager: "yarn"`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 会写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭证位于 `~/.openclaw/credentials/whatsapp/<accountId>/` 之下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 之下。

<Note>某些渠道以插件形式提供。在设置期间选择时，向导 会提示在配置渠道之前安装插件（npm 或本地路径）。</Note>

Gateway(网关) 向导 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客户端（macOS 应用和 Control UI）可以渲染步骤，而无需重新实现新手引导逻辑。

Signal 设置行为：

- 下载相应的发布资产
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 之下
- 在配置中写入 `channels.signal.cliPath`
- JVM 构建需要 Java 21
- 在可用时使用原生构建
- Windows 使用 WSL2 并在 WSL 内部遵循 Linux signal-cli 流程

## 相关文档

- 新手引导中心：[新手引导 (CLI)](CLI/en/start/wizard)
- 自动化和脚本：[CLI 自动化](CLI/en/start/wizard-cli-automation)
- 命令参考：[`openclaw onboard`](/zh/cli/onboard)
