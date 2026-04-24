---
summary: "CLI 设置流程、身份验证/模型设置、输出和内部结构的完整参考"
read_when:
  - You need detailed behavior for openclaw onboard
  - You are debugging onboarding results or integrating onboarding clients
title: "CLI 设置参考"
sidebarTitle: "CLI 参考"
---

# CLI 设置参考

本页面是 `openclaw onboard` 的完整参考。
有关简短指南，请参阅 [CLI (CLI)](/zh/start/wizard)。

## 向导的功能

本地模式（默认）将引导您完成以下步骤：

- OpenAI 和身份验证设置（OAuth Code 订阅 Anthropic、CLI Claude API 或 MiniMax 密钥，以及 GLM、Ollama、Moonshot、Gateway(网关)、StepFun 和 AI Gateway(网关) 选项）
- 工作区位置和引导文件
- Gateway(网关) 设置（端口、绑定、认证、tailscale）
- 渠道和提供商（Telegram、WhatsApp、Discord、Google Chat、Mattermost、Signal、BlueBubbles 以及其他捆绑的渠道插件）
- 守护进程安装（LaunchAgent、systemd 用户单元或原生 Windows 计划任务，并带有启动文件夹回退机制）
- 健康检查
- Skills 设置

远程模式将此机器配置为连接到别处的网关。
它不会在远程主机上安装或修改任何内容。

## 本地流程详情

<Steps>
  <Step title="现有配置检测">
    - 如果 `~/.openclaw/openclaw.json` 存在，请选择保留、修改或重置。
    - 重新运行向导不会清除任何内容，除非您明确选择重置（或传递 `--reset`）。
    - CLI `--reset` 默认为 `config+creds+sessions`；使用 `--reset-scope full` 也可删除工作区。
    - 如果配置无效或包含旧版密钥，向导将停止并要求您在继续之前运行 `openclaw doctor`。
    - 重置使用 `trash` 并提供范围：
      - 仅配置
      - 配置 + 凭证 + 会话
      - 完全重置（同时删除工作区）
  </Step>
  <Step title="模型和身份验证">
    - 完整选项矩阵位于 [身份验证和模型选项](#auth-and-model-options) 中。
  </Step>
  <Step title="工作区">
    - 默认 `~/.openclaw/workspace`（可配置）。
    - 为首次运行引导仪式所需的工作区文件制作种子。
    - 工作区布局：[Agent 工作区](/zh/concepts/agent-workspace)。
  </Step>
  <Step title="Gateway(网关)">
    - 提示输入端口、绑定、身份验证模式和 Tailscale 暴露。
    - 建议：即使是环回连接，也要保持令牌身份验证已启用，以便本地 WS 客户端必须进行身份验证。
    - 在令牌模式下，交互式设置提供：
      - **生成/存储明文令牌**（默认）
      - **使用 SecretRef**（可选）
    - 在密码模式下，交互式设置也支持明文或 SecretRef 存储。
    - 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
      - 需要在新手引导过程环境中有一个非空环境变量。
      - 不能与 `--gateway-token` 结合使用。
    - 仅当您完全信任每个本地进程时才禁用身份验证。
    - 非环回绑定仍然需要身份验证。
  </Step>
  <Step title="Channels">
    - [WhatsApp](/zh/channels/whatsapp): 可选的 QR 登录
    - [Telegram](/zh/channels/telegram): bot token
    - [Discord](/zh/channels/discord): bot token
    - [Google Chat](/zh/channels/googlechat): 服务账号 JSON + webhook 受众
    - [Mattermost](/zh/channels/mattermost): bot token + 基础 URL
    - [Signal](/zh/channels/signal): 可选的 `signal-cli` 安装 + 账号配置
    - [BlueBubbles](/zh/channels/bluebubbles): 推荐用于 iMessage；服务器 URL + 密码 + webhook
    - [iMessage](/zh/channels/imessage): 旧版 `imsg` CLI 路径 + 数据库访问权限
    - 私信安全：默认为配对。第一条私信发送验证码；通过
      `openclaw pairing approve <channel> <code>` 批准或使用允许列表。
  </Step>
  <Step title="守护进程安装">
    - macOS：LaunchAgent
      - 需要登录用户会话；对于无头模式，请使用自定义 LaunchDaemon（未附带）。
    - Linux 和通过 WSL2 运行的 Windows：systemd 用户单元
      - 向导尝试 `loginctl enable-linger <user>`，以便注销后网关仍保持运行。
      - 可能会提示输入 sudo（写入 `/var/lib/systemd/linger`）；它会先尝试不使用 sudo。
    - 原生 Windows：优先使用计划任务
      - 如果拒绝创建任务，OpenClaw 将回退到每用户启动文件夹登录项并立即启动网关。
      - 仍然首选计划任务，因为它们提供更好的监督程序状态。
    - 运行时选择：Node（推荐；WhatsApp 和 Telegram 必需）。不建议使用 Bun。
  </Step>
  <Step title="健康检查">
    - 启动网关（如果需要）并运行 `openclaw health`。
    - `openclaw status --deep` 将实时网关运行状况探针添加到状态输出中，包括支持时的渠道探针。
  </Step>
  <Step title="Skills">
    - 读取可用的 Skills 并检查要求。
    - 让您选择节点管理器：npm、pnpm 或 bun。
    - 安装可选依赖项（某些在 macOS 上使用 Homebrew）。
  </Step>
  <Step title="完成">
    - 摘要和后续步骤，包括 iOS、Android 和 macOS 应用选项。
  </Step>
</Steps>

<Note>如果未检测到 GUI，向导将打印控制 UI 的 SSH 端口转发说明，而不是打开浏览器。 如果控制 UI 资源丢失，向导将尝试构建它们；回退方案是 `pnpm ui:build`（自动安装 UI 依赖项）。</Note>

## Remote mode details

Remote mode configures this machine to connect to a gateway elsewhere.

<Info>远程模式不会在远程主机上安装或修改任何内容。</Info>

What you set:

- 远程网关 URL (`ws://...`)
- Token if remote gateway auth is required (recommended)

<Note>- 如果网关仅限环回，请使用 SSH 隧道或 tailnet。 - 设备发现提示： - macOS：Bonjour (`dns-sd`) - Linux：Avahi (`avahi-browse`)</Note>

## 身份验证和模型选项

<AccordionGroup>
  <Accordion title="Anthropic API 密钥">
    如果存在则使用 `ANTHROPIC_API_KEY`，否则提示输入密钥，然后将其保存供守护进程使用。
  </Accordion>
  <Accordion title="OpenAI Code 订阅 (OAuth)">
    浏览器流程；粘贴 `code#state`。

    当模型未设置或为 `openai/*` 时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.4`。

  </Accordion>
  <Accordion title="OpenAI Code 订阅 (device pairing)">
    带有短期设备代码的浏览器配对流程。

    当模型未设置或为 `openai/*` 时，将 `agents.defaults.model` 设置为 `openai-codex/gpt-5.4`。

  </Accordion>
  <Accordion title="OpenAI API 密钥">
    如果存在则使用 `OPENAI_API_KEY`，或者提示输入密钥，然后将凭据存储在 auth 配置文件中。

    当模型未设置、`openai/*` 或 `openai-codex/*` 时，将 `agents.defaults.model` 设置为 `openai/gpt-5.4`。

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
    提示输入 account ID、gateway ID 和 `CLOUDFLARE_AI_GATEWAY_API_KEY`。
    更多详情：[Cloudflare AI Gateway(网关)](/zh/providers/cloudflare-ai-gateway)。
  </Accordion>
  <Accordion title="MiniMax">
    配置会自动写入。托管的默认值为 `MiniMax-M2.7`；API-key 设置使用
    `minimax/...`，OAuth 设置使用 `minimax-portal/...`。
    更多详情：[MiniMax](/zh/providers/minimax)。
  </Accordion>
  <Accordion title="StepFun">
    针对中国或全球端点上的 StepFun 标准版或 Step Plan，配置会自动写入。
    标准版目前包括 `step-3.5-flash`，Step Plan 也包括 `step-3.5-flash-2603`。
    更多详情：[StepFun](/zh/providers/stepfun)。
  </Accordion>
  <Accordion title="Synthetic (Anthropic-compatible)">
    提示输入 `SYNTHETIC_API_KEY`。
    更多详情：[Synthetic](/zh/providers/synthetic)。
  </Accordion>
  <Accordion title="Ollama (Cloud and local open models)">
    首先提示输入 `Cloud + Local`、`Cloud only` 或 `Local only`。
    `Cloud only` 使用 `OLLAMA_API_KEY` 配合 `https://ollama.com`。
    主机支持的模式会提示输入基础 URL（默认为 `http://127.0.0.1:11434`），发现可用模型，并建议默认值。
    `Cloud + Local` 还会检查该 Ollama 主机是否已登录以使用云端访问。
    更多详情：[Ollama](/zh/providers/ollama)。
  </Accordion>
  <Accordion title="Moonshot 和 Kimi Coding">
    Moonshot (Kimi K2) 和 Kimi Coding 配置会自动写入。
    更多详情：[Moonshot AI (Kimi + Kimi Coding)](/zh/providers/moonshot)。
  </Accordion>
  <Accordion title="Custom 提供商">
    适用于与 OpenAI 兼容和与 Anthropic 兼容的端点。

    交互式新手引导支持与其他提供商 API 密钥流程相同的 API 密钥存储选项：
    - **立即粘贴 API 密钥**（明文）
    - **使用密钥引用**（环境变量引用或配置的提供商引用，带有预检验证）

    非交互式标志：
    - `--auth-choice custom-api-key`
    - `--custom-base-url`
    - `--custom-model-id`
    - `--custom-api-key`（可选；回退到 `CUSTOM_API_KEY`）
    - `--custom-provider-id`（可选）
    - `--custom-compatibility <openai|anthropic>`（可选；默认为 `openai`）

  </Accordion>
  <Accordion title="跳过">
    保持未配置认证状态。
  </Accordion>
</AccordionGroup>

模型行为：

- 从检测到的选项中选择默认模型，或手动输入提供商和模型。
- 当新手引导从提供商身份验证选项开始时，模型选择器会自动偏向该提供商。对于 Volcengine 和 BytePlus，相同的偏好也会匹配其 coding-plan 变体（`volcengine-plan/*`、`byteplus-plan/*`）。
- 如果首选提供商筛选结果为空，选择器将回退到完整目录，而不是不显示任何模型。
- 向导会运行模型检查，如果配置的模型未知或缺少认证，则会发出警告。

凭证和配置文件路径：

- 身份验证配置文件（API 密钥 + OAuth）：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- 旧版 OAuth 导入：`~/.openclaw/credentials/oauth.json`

凭证存储模式：

- 默认的新手引导行为会将 API 密钥作为明文值保留在认证配置文件中。
- `--secret-input-mode ref` 启用引用模式而非明文密钥存储。在交互式设置中，您可以选择：
  - 环境变量引用（例如 `keyRef: { source: "env", provider: "default", id: "OPENAI_API_KEY" }`）
  - 已配置的提供商引用（`file` 或 `exec`），包含提供商别名和 ID
- 交互式引用模式会在保存之前运行快速的预检验证。
  - 环境变量引用：验证变量名称 + 当前新手引导环境中的非空值。
  - 提供商引用：验证提供商配置并解析请求的 id。
  - 如果预检失败，新手引导会显示错误并允许您重试。
- 在非交互模式下，`--secret-input-mode ref` 仅支持基于环境变量的方式。
  - 在新手引导进程环境中设置提供商的环境变量。
  - 内联键标志（例如 `--openai-api-key`）要求设置该环境变量；否则新手引导将快速失败。
  - 对于自定义提供商，非交互式 `ref` 模式将 `models.providers.<id>.apiKey` 存储为 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`。
  - 在该自定义提供商情况下，`--custom-api-key` 要求设置 `CUSTOM_API_KEY`；否则新手引导将快速失败。
- Gateway(网关) 身份验证凭据在交互式设置中支持明文和 SecretRef 选择：
  - 令牌模式：**生成/存储明文令牌**（默认）或 **使用 SecretRef**。
  - 密码模式：明文或 SecretRef。
- 非交互式令牌 SecretRef 路径：`--gateway-token-ref-env <ENV_VAR>`。
- 现有的明文设置继续不受影响地工作。

<Note>
Headless 和服务器提示：在有浏览器的机器上完成 OAuth，然后将该代理的 `auth-profiles.json`（例如
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`，或匹配的
`$OPENCLAW_STATE_DIR/...` 路径）复制到网关主机。`credentials/oauth.json`
仅作为旧版导入源。
</Note>

## 输出和内部细节

`~/.openclaw/openclaw.json` 中的典型字段：

- `agents.defaults.workspace`
- `agents.defaults.model` / `models.providers` （如果选择了 Minimax）
- `tools.profile` （本地新手引导未设置时默认为 `"coding"`；保留现有的显式值）
- `gateway.*` （模式、绑定、认证、tailscale）
- `session.dmScope` （本地新手引导未设置时默认将其设为 `per-channel-peer`；保留现有的显式值）
- `channels.telegram.botToken`， `channels.discord.token`， `channels.matrix.*`， `channels.signal.*`， `channels.imessage.*`
- 频道允许列表（Slack、Discord、Matrix、Microsoft Teams），当您在提示期间选择加入时（名称在可能时解析为 ID）
- `skills.install.nodeManager`
  - `setup --node-manager` 标志接受 `npm`、`pnpm` 或 `bun`。
  - 手动配置仍可在稍后设置 `skills.install.nodeManager: "yarn"`。
- `wizard.lastRunAt`
- `wizard.lastRunVersion`
- `wizard.lastRunCommit`
- `wizard.lastRunCommand`
- `wizard.lastRunMode`

`openclaw agents add` 写入 `agents.list[]` 和可选的 `bindings`。

WhatsApp 凭据位于 `~/.openclaw/credentials/whatsapp/<accountId>/` 之下。
会话存储在 `~/.openclaw/agents/<agentId>/sessions/` 之下。

<Note>某些渠道作为插件提供。在设置期间选择时，向导会提示在渠道配置之前安装插件（npm 或本地路径）。</Note>

Gateway(网关) 向导 RPC：

- `wizard.start`
- `wizard.next`
- `wizard.cancel`
- `wizard.status`

客户端（macOS 应用和控制 UI）可以渲染步骤，而无需重新实现新手引导逻辑。

Signal 设置行为：

- 下载相应的发布资源
- 将其存储在 `~/.openclaw/tools/signal-cli/<version>/` 下
- 在配置中写入 `channels.signal.cliPath`
- JVM 构建需要 Java 21
- 如果有可用的本机构建，则使用本机构建
- Windows 使用 WSL2 并在 WSL 内部遵循 Linux signal-cli 流程

## 相关文档

- 新手引导中心：[新手引导 (CLI)](/zh/start/wizard)
- 自动化和脚本：[CLI 自动化](/zh/start/wizard-cli-automation)
- 命令参考：[`openclaw onboard`](/zh/cli/onboard)
