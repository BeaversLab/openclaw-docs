---
summary: "`openclaw models` 的 CLI 参考（status/list/set/scan、别名、回退、auth）"
read_when:
  - 您想要更改默认模型或查看提供商 auth 状态
  - 您想要扫描可用的模型/提供商并调试 auth 配置文件
title: "models"
---

# `openclaw models`

模型发现、扫描和配置（默认模型、回退、auth 配置文件）。

相关：

- 提供商 + 模型：[模型](/zh/providers/models)
- 提供商 auth 设置：[入门指南](/zh/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示解析后的默认/回退以及 auth 概述。
当提供商使用快照可用时，OAuth/token 状态部分包括
提供商使用标头。
添加 `--probe` 以对每个配置的提供商配置文件运行实时 auth 探测。
探测是真实的请求（可能会消耗 token 并触发速率限制）。
使用 `--agent <id>` 检查配置的代理的模型/auth 状态。如果省略，
命令使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则使用
配置的默认代理。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- 模型引用通过在 **第一个** `/` 处分割来解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（示例：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会将输入视为 **默认提供商** 的别名或模型（仅在模型 ID 中没有 `/` 时有效）。
- `models status` 可能会在 auth 输出中针对非机密占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`qwen-oauth`、`ollama-local`）显示 `marker(<value>)`，而不是将其作为机密信息进行遮蔽。

### `models status`

选项：

- `--json`
- `--plain`
- `--check`（退出代码 1=已过期/缺失，2=即将过期）
- `--probe`（实时探测已配置的身份验证配置文件）
- `--probe-provider <name>`（探测一个提供商）
- `--probe-profile <id>`（重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（已配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

## 别名 + 回退

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 身份验证配置文件

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```

`models auth login` 运行提供商插件的身份验证流程（OAuth/API 密钥）。使用
`openclaw plugins list` 查看已安装的提供商。

注意：

- `setup-token` 会提示输入设置令牌的值（在任意机器上使用 `claude setup-token` 生成）。
- `paste-token` 接受在其他地方生成或来自自动化的令牌字符串。
- Anthropic 策略说明：对设置令牌的支持属于技术兼容性。过去 Anthropic 曾阻止在 Claude Code 之外的某些订阅使用，因此在广泛使用前请核实当前条款。

import en from "/components/footer/en.mdx";

<en />
