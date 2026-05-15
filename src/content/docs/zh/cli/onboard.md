---
summary: "CLI参考，用于 `openclaw onboard`（交互式新手引导）"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "新手引导"
---

# `openclaw onboard`

针对本地或远程 Gateway(网关) 设置的完整新手引导。当您希望 OpenClaw 在一个流程中引导您完成模型身份验证、工作区、网关、渠道、技能和健康检查时，请使用此选项。

## 相关指南

<CardGroup cols={2}>
  <Card title="CLI 新手引导中心" href="/zh/start/wizard" icon="rocket">
    交互式 CLI 流程的演练。
  </Card>
  <Card title="新手引导概述" href="/zh/start/onboarding-overview" icon="map">
    OpenClaw 新手引导如何协同工作。
  </Card>
  <Card title="CLI 设置参考" href="/zh/start/wizard-cli-reference" icon="book">
    输出、内部结构和每步行为。
  </Card>
  <Card title="CLI 自动化" href="/zh/start/wizard-cli-automation" icon="terminal">
    非交互式标志和脚本化设置。
  </Card>
  <Card title="macOS 应用新手引导" href="/zh/start/onboarding" icon="apple">
    macOS 菜单栏应用的新手引导流程。
  </Card>
</CardGroup>

## 示例

```bash
openclaw onboard
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

`--flow import` 使用插件拥有的迁移提供商（如 Hermes）。它仅针对全新的 OpenClaw 设置运行；如果存在现有的配置、凭据、会话或工作区内存/标识文件，请在导入之前重置或选择新的设置。

`--modern` 启动 Crestodian 对话式新手引导预览。如果没有
`--modern`，`openclaw onboard` 将保留经典的新手引导流程。

对于纯文本专用网络 `ws://` 目标（仅限受信任的网络），请在
新手引导过程环境中设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。
此客户端传输紧急方式没有
`openclaw.json` 等效项。

非交互式自定义提供商：

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai \
  --custom-image-input
```

在非交互模式下，`--custom-api-key` 是可选的。如果省略，新手引导将检查 `CUSTOM_API_KEY`。
OpenClaw 会自动将常见的视觉模型 ID 标记为具备图像处理能力。对于未知的自定义视觉 ID，请传递 `--custom-image-input`，或传递 `--custom-text-input` 以强制使用仅文本元数据。

LM Studio 在非交互模式下也支持特定于提供商的密钥标志：

```bash
openclaw onboard --non-interactive \
  --auth-choice lmstudio \
  --custom-base-url "http://localhost:1234/v1" \
  --custom-model-id "qwen/qwen3.5-9b" \
  --lmstudio-api-key "$LM_API_TOKEN" \
  --accept-risk
```

非交互式 Ollama：

```bash
openclaw onboard --non-interactive \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b" \
  --accept-risk
```

`--custom-base-url` 默认为 `http://127.0.0.1:11434`。`--custom-model-id` 是可选的；如果省略，新手引导将使用 Ollama 建议的默认值。云模型 ID（例如 `kimi-k2.5:cloud`）也可以在此处使用。

将提供商密钥存储为引用而不是纯文本：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref` 时，新手引导会写入环境变量支持的引用，而不是明文键值。
对于基于身份验证配置文件的提供商，这会写入 `keyRef` 条目；对于自定义提供商，这会将 `models.providers.<id>.apiKey` 作为环境变量引用写入（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非交互式 `ref` 模式约定：

- 在新手引导流程环境中设置提供商环境变量（例如 `OPENAI_API_KEY`）。
- 除非该环境变量也已设置，否则不要传递内联键标志（例如 `--openai-api-key`）。
- 如果传递了内联密钥标志但缺少所需的环境变量，新手引导将快速失败并提供指导。

非交互模式下的 Gateway(网关) 令牌选项：

- `--gateway-auth token --gateway-token <token>` 存储明文令牌。
- `--gateway-auth token --gateway-token-ref-env <name>` 将 `gateway.auth.token` 存储为环境变量 SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 要求在新手引导流程环境中有一个非空的环境变量。
- 使用 `--install-daemon` 时，当令牌身份验证需要令牌时，SecretRef 管理的网关令牌会经过验证，但不会作为解析后的明文持久化到监督服务环境元数据中。
- 使用 `--install-daemon` 时，如果令牌模式需要令牌但配置的令牌 SecretRef 未解析，新手引导将失败并关闭，同时提供修复指导。
- 使用 `--install-daemon` 时，如果配置了 `gateway.auth.token` 和 `gateway.auth.password` 但未设置 `gateway.auth.mode`，则在明确设置模式之前，新手引导会阻止安装。
- 本地新手引导会将 `gateway.mode="local"` 写入配置。如果后续的配置文件缺少 `gateway.mode`，请将其视为配置损坏或不完整的手动编辑，而不是有效的本地模式快捷方式。
- 当所选的设置路径需要时，本地新手引导会安装所选的可下载插件。
- 远程新手引导仅写入远程 Gateway(网关) 的连接信息，不会安装本地插件包。
- `--allow-unconfigured` 是一个单独的网关运行时应急方案。这并不意味着新手引导可以省略 `gateway.mode`。

示例：

```bash
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice skip \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN \
  --accept-risk
```

非交互式本地网关运行状况：

- 除非传递 `--skip-health`，否则新手引导在成功退出之前会等待本地网关可达。
- `--install-daemon` 首先启动托管网关安装路径。如果没有它，您必须已经有一个本地网关在运行，例如 `openclaw gateway run`。
- 如果您只想在自动化中进行配置/工作区/引导写入，请使用 `--skip-health`。
- 如果您自己管理工作区文件，请传递 `--skip-bootstrap` 来设置 `agents.defaults.skipBootstrap: true` 并跳过创建 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，Windows`--install-daemon` 首先尝试计划任务，如果任务创建被拒绝，则回退到每用户启动文件夹登录项。

带有引用模式的交互式新手引导行为：

- 收到提示时，选择 **Use secret reference**。
- 然后选择以下任一项：
  - 环境变量
  - 配置的密钥提供商 (`file` 或 `exec`)
- 新手引导在保存引用之前会执行快速的预检验证。
  - 如果验证失败，新手引导会显示错误并允许您重试。

### 非交互式 Z.AI 端点选择

<Note>`--auth-choice zai-api-key`API 会为您的密钥自动检测最佳的 Z.AI 端点（优先使用带有 `zai/glm-5.1`GLM 的通用 API）。如果您特别想要 GLM Coding Plan 端点，请选择 `zai-coding-global` 或 `zai-coding-cn`。</Note>

```bash
# Promptless endpoint selection
openclaw onboard --non-interactive \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# Other Z.AI endpoint choices:
# --auth-choice zai-coding-cn
# --auth-choice zai-global
# --auth-choice zai-cn
```

非交互式 Mistral 示例：

```bash
openclaw onboard --non-interactive \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

## 流程说明

<AccordionGroup>
  <Accordion title="流程类型">
    - `quickstart`：最少的提示，自动生成网关令牌。
    - `manual`：针对端口、绑定和身份验证的完整提示（`advanced` 的别名）。
    - `import`：运行检测到的迁移提供商，预览计划，然后在确认后应用。

  </Accordion>
  <Accordion title="提供商预筛选">
    当身份验证选择暗示了首选提供商时，新手引导会将默认模型和允许列表选择器预筛选为该提供商。对于 Volcengine 和 BytePlus，这还会匹配 coding-plan 变体（`volcengine-plan/*`、`byteplus-plan/*`）。

    如果首选提供商筛选器尚未产生已加载的模型，新手引导将回退到未筛选的目录，而不是让选择器留空。

  </Accordion>
  <Accordion title="网络搜索后续提示">
    某些网络搜索提供商会触发特定于提供商的后续提示：

    - **Grok** 可以提供可选的 `x_search` 设置，使用相同的 `XAI_API_KEY` 和一个 `x_search`MoonshotAPI 模型选择。
    - **Kimi** 可以询问 Moonshot API 区域（`api.moonshot.ai` 与 `api.moonshot.cn`）以及默认的 Kimi 网络搜索模型。

  </Accordion>
  <Accordion title="Other behaviors"CLI>
    - 本地新手引导私信范围行为：[CLI 设置参考](/zh/start/wizard-cli-reference#outputs-and-internals)。
    - 最快的首次聊天：`openclaw dashboard`OpenAIAnthropic（控制 UI，无渠道设置）。
    - 自定义提供商：连接任何 OpenAI 或 Anthropic 兼容的端点，包括未列出的托管提供商。使用 Unknown 进行自动检测。
    - 如果检测到 Hermes 状态，新手引导会提供迁移流程。使用 [Migrate](/zh/cli/migrate) 进行试运行计划、覆盖模式、报告和精确映射。

  </Accordion>
</AccordionGroup>

## 常见的后续命令

```bash
openclaw channels add
openclaw configure
openclaw agents add <name>
```

当您只需要基础配置/工作区时，请改用 `openclaw setup`。稍后使用 `openclaw configure` 进行针对性更改，使用 `openclaw channels add` 进行仅渠道设置。

<Note>`--json` 并不意味着非交互模式。请将 `--non-interactive` 用于脚本。</Note>
