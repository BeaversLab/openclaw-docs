---
summary: "CLI 参考文档 `openclaw onboard`（交互式新手引导）"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `openclaw onboard`

用于本地或远程 Gateway(网关) 设置的交互式新手引导。

## 相关指南

- CLI 新手引导中心：[新手引导 (CLI)](/en/start/wizard)
- 新手引导概述：[新手引导概述](/en/start/onboarding-overview)
- CLI 新手引导参考：[CLI 设置参考](/en/start/wizard-cli-reference)
- CLI 自动化：[CLI 自动化](/en/start/wizard-cli-automation)
- macOS 新手引导：[新手引导 (macOS 应用)](/en/start/onboarding)

## 示例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

对于纯文本专用网络 `ws://` 目标（仅限受信任网络），请在新手引导流程环境中设置
`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。

非交互式自定义提供程序：

```bash
openclaw onboard --non-interactive \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai
```

在非交互模式下，`--custom-api-key` 是可选的。如果省略，新手引导将检查 `CUSTOM_API_KEY`。

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

使用 `--secret-input-mode ref`，新手引导将写入由环境变量支持的引用，而不是纯文本密钥值。
对于由身份验证配置文件支持的提供商，这将写入 `keyRef` 条目；对于自定义提供商，这将 `models.providers.<id>.apiKey` 作为环境变量引用写入（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非交互式 `ref` 模式约定：

- 在新手引导流程环境中设置提供商环境变量（例如 `OPENAI_API_KEY`）。
- 除非设置了相应的环境变量，否则不要传递内联密钥标志（例如 `--openai-api-key`）。
- 如果传递了内联密钥标志但未设置所需的环境变量，新手引导将立即失败并提供指导。

非交互模式下的 Gateway(网关) 令牌选项：

- `--gateway-auth token --gateway-token <token>` 存储明文令牌。
- `--gateway-auth token --gateway-token-ref-env <name>` 将 `gateway.auth.token` 存储为环境变量 SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 需要在新手引导流程环境中有一个非空的环境变量。
- 使用 `--install-daemon` 时，当令牌认证需要令牌时，SecretRef 托管的网关令牌会被验证，但不会作为解析后的明文保留在监督服务环境元数据中。
- 使用 `--install-daemon` 时，如果令牌模式需要令牌且配置的令牌 SecretRef 未解析，新手引导将以失败关闭并提供修复指导。
- 使用 `--install-daemon` 时，如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置且未设置 `gateway.auth.mode`，新手引导将阻止安装，直到显式设置模式。
- 本地新手引导会将 `gateway.mode="local"` 写入配置。如果后续配置文件缺少 `gateway.mode`，请将其视为配置损坏或不完整的手动编辑，而不是有效的本地模式快捷方式。
- `--allow-unconfigured` 是一个独立的网关运行时应急手段。这并不意味着新手引导可以省略 `gateway.mode`。

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

- 除非您传递 `--skip-health`，否则新手引导在成功退出之前会等待本地网关可达。
- `--install-daemon` 首先启动托管网关安装路径。如果没有它，您必须已经有一个本地网关正在运行，例如 `openclaw gateway run`。
- 如果您只想在自动化中进行配置/工作区/引导写入，请使用 `--skip-health`。
- 在原生 Windows 上，`--install-daemon` 首先尝试计划任务，如果任务创建被拒绝，则回退到每用户启动文件夹登录项。

参考模式的交互式新手引导行为：

- 出现提示时选择 **使用密钥引用**。
- 然后选择以下任一项：
  - 环境变量
  - 配置的密钥提供商 (`file` 或 `exec`)
- 新手引导会在保存引用之前执行快速预检验证。
  - 如果验证失败，新手引导会显示错误并允许您重试。

非交互式 Z.AI 端点选择：

注意：`--auth-choice zai-api-key` 现在会自动为您的密钥检测最佳的 Z.AI 端点（优先使用带有 `zai/glm-5` 的通用 API）。
如果您特别想要 GLM 编码计划端点，请选择 `zai-coding-global` 或 `zai-coding-cn`。

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

流程说明：

- `quickstart`：最少提示，自动生成网关令牌。
- `manual`：端口/绑定/身份验证的完整提示（`advanced` 的别名）。
- 当身份验证选择暗示了首选提供商时，新手引导会预先过滤默认模型和允许列表选择器，仅显示该提供商的选项。对于 Volcengine 和 BytePlus，这也会匹配编码计划变体（`volcengine-plan/*`、`byteplus-plan/*`）。
- 如果首选提供商过滤后尚未产生任何已加载的模型，新手引导将回退到未过滤的目录，而不是让选择器保持为空。
- 在网络搜索步骤中，某些提供商可以触发特定于提供商的后续提示：
  - **Grok** 可以提供可选的 `x_search` 设置，使用相同的 `XAI_API_KEY` 和一个 `x_search` 模型选择。
  - **Kimi** 可以询问 Moonshot API 区域（`api.moonshot.ai` vs `api.moonshot.cn`）以及默认的 Kimi 网络搜索模型。
- 本地新手引导私信范围行为：[CLI 设置参考](/en/start/wizard-cli-reference#outputs-and-internals)。
- 最快的首次聊天：`openclaw dashboard`（控制 UI，无需渠道设置）。
- 自定义提供商：连接任何 OpenAI 或 Anthropic 兼容的端点，包括未列出的托管提供商。使用 Unknown 自动检测。

## 常见的后续命令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>`--json` 并不意味着非交互模式。请对脚本使用 `--non-interactive`。</Note>
