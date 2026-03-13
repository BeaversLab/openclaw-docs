---
summary: "`openclaw onboard`（交互式入门向导）的 CLI 参考"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `openclaw onboard`

交互式入门向导（本地或远程 Gateway 设置）。

## 相关指南

- CLI 入门中心：[入门向导 (CLI)](/zh/en/start/wizard)
- 入门概述：[入门概述](/zh/en/start/onboarding-overview)
- CLI 入门参考：[CLI 入门参考](/zh/en/start/wizard-cli-reference)
- CLI 自动化：[CLI 自动化](/zh/en/start/wizard-cli-automation)
- macOS 入门：[入门 (macOS 应用)](/zh/en/start/onboarding)

## 示例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

对于纯文本专用网络 `ws://` 目标（仅限受信任网络），请在入门流程环境中设置
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

`--custom-api-key` 在非交互模式下是可选的。如果省略，入门将检查 `CUSTOM_API_KEY`。

将提供程序密钥存储为引用而不是纯文本：

```bash
openclaw onboard --non-interactive \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --accept-risk
```

使用 `--secret-input-mode ref`，入门将写入环境支持的引用，而不是纯文本密钥值。
对于基于 auth-profile 的提供程序，这会写入 `keyRef` 条目；对于自定义提供程序，这会将 `models.providers.<id>.apiKey` 写入为环境引用（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。

非交互式 `ref` 模式约定：

- 在入门流程环境中设置提供程序环境变量（例如 `OPENAI_API_KEY`）。
- 除非也设置了该环境变量，否则不要传递内联密钥标志（例如 `--openai-api-key`）。
- 如果传递内联密钥标志但未设置所需的环境变量，入门将快速失败并提供指导。

非交互模式下的 Gateway 令牌选项：

- `--gateway-auth token --gateway-token <token>` 存储纯文本令牌。
- `--gateway-auth token --gateway-token-ref-env <name>` 将 `gateway.auth.token` 存储为环境 SecretRef。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- `--gateway-token-ref-env` 要求入门流程环境中有一个非空环境变量。
- 使用 `--install-daemon` 时，当令牌身份验证需要令牌时，SecretRef 管理的网关令牌将得到验证，但不会作为解析后的纯文本保留在监督服务环境元数据中。
- 使用 `--install-daemon` 时，如果令牌模式需要令牌且已配置的令牌 SecretRef 未解析，入职（onboarding）将以失败关闭（fail closed）并提供修复指导。
- 使用 `--install-daemon` 时，如果同时配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未设置 `gateway.auth.mode`，入职将阻止安装，直到明确设置模式。

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

使用引用模式的交互式入职行为：

- 出现提示时，选择 **Use secret reference**（使用密钥引用）。
- 然后选择以下任一项：
  - 环境变量
  - 已配置的密钥提供程序（`file` 或 `exec`）
- 入职在保存引用之前会执行快速预检验证。
  - 如果验证失败，入职会显示错误并允许您重试。

非交互式 Z.AI 端点选择：

注意：`--auth-choice zai-api-key` 现在会自动检测最适合您的密钥的 Z.AI 端点（首选带有 `zai/glm-5` 的通用 API）。如果您特别想要 GLM Coding Plan 端点，请选择 `zai-coding-global` 或 `zai-coding-cn`。

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

- `quickstart`：最少的提示，自动生成网关令牌。
- `manual`：针对端口/绑定/身份验证的完整提示（`advanced` 的别名）。
- 本地入职 DM 范围行为：[CLI Onboarding Reference](/zh/en/start/wizard-cli-reference#outputs-and-internals)。
- 最快首次对话：`openclaw dashboard`（控制 UI，无需频道设置）。
- 自定义提供程序：连接任何兼容 OpenAI 或 Anthropic 的端点，
  包括未列出的托管提供程序。使用 Unknown 进行自动检测。

## 常见后续命令

```bash
openclaw configure
openclaw agents add <name>
```

<Note>
`--json` 并不意味着非交互模式。脚本请使用 `--non-interactive`。
</Note>

import zh from '/components/footer/zh.mdx';

<zh />
