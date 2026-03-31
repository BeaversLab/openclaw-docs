---
summary: "CLI 参考，用于 `openclaw models`（状态/列表/设置/扫描、别名、回退、身份验证）"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "models"
---

# `openclaw models`

模型发现、扫描和配置（默认模型、备用、认证配置文件）。

相关：

- 提供商 + 模型：[模型](/en/providers/models)
- 提供商身份验证设置：[入门指南](/en/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示已解析的默认/回退设置以及身份验证概览。
当提供商使用快照可用时，OAuth/令牌状态部分包含
提供商使用标头。
添加 `--probe` 以对每个配置的提供商配置文件运行实时身份验证探测。
探测是真实的请求（可能会消耗令牌并触发速率限制）。
使用 `--agent <id>` 检查已配置代理的模型/身份验证状态。如果省略，
命令将使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则使用
配置的默认代理。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- 模型引用通过在 **第一个** `/` 处分割进行解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会将输入视为 **默认提供商** 的别名或模型（仅当模型 ID 中没有 `/` 时才有效）。
- `models status` 可能会在身份验证输出中针对非机密占位符显示 `marker(<value>)`（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），而不是将其作为机密进行掩码处理。

### `models status`

选项：

- `--json`
- `--plain`
- `--check`（退出代码 1=已过期/缺失，2=即将过期）
- `--probe`（对配置的身份验证配置文件进行实时探测）
- `--probe-provider <name>`（探测一个提供商）
- `--probe-profile <id>`（重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

## 别名 + 备用

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 认证配置文件

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token
openclaw models auth paste-token
```

`models auth login` 运行提供商插件的认证流程（OAuth/API 密钥）。使用
`openclaw plugins list` 查看已安装的提供商。

示例：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
openclaw models auth login --provider openai-codex --set-default
```

注意事项：

- `login --provider anthropic --method cli --set-default` 重用本地 Claude
  CLI 登录并将主 Anthropic 默认模型路径重写为 `claude-cli/...`。
- `setup-token` 提示输入设置令牌值（在任何机器上使用 `claude setup-token` 生成）。
- `paste-token` 接受在其他地方生成或来自自动化的令牌字符串。
- Anthropic 政策说明：设置令牌支持属于技术兼容性。Anthropic 过去曾阻止 Claude Code 外部的某些订阅使用，因此在广泛使用前请验证当前条款。
