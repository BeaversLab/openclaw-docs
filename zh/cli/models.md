---
summary: "`openclaw models` 的 CLI 参考（status/list/set/scan、别名、备用、认证）"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "models"
---

# `openclaw models`

模型发现、扫描和配置（默认模型、备用、认证配置文件）。

相关：

- 提供商 + 模型：[Models](/zh/en/providers/models)
- 提供商认证设置：[Getting started](/zh/en/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示已解析的默认/备用模型以及认证概览。
当提供商使用快照可用时，OAuth/token 状态部分包含
提供商使用情况标头。
添加 `--probe` 以对每个配置的提供商配置文件运行实时认证探测。
探测是真实的请求（可能会消耗 token 并触发速率限制）。
使用 `--agent <id>` 来检查已配置代理的模型/认证状态。如果省略，
命令将使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则使用
配置的默认代理。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- 模型引用通过在 **第一个** `/` 处拆分来解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会将输入视为别名或 **默认提供商** 的模型（仅当模型 ID 中没有 `/` 时才有效）。
- `models status` 可能会在认证输出中针对非机密占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`qwen-oauth`、`ollama-local`）显示 `marker(<value>)`，而不是将其作为机密进行掩码处理。

### `models status`

选项：

- `--json`
- `--plain`
- `--check`（退出代码 1=已过期/缺失，2=即将过期）
- `--probe`（对配置的认证配置文件进行实时探测）
- `--probe-provider <name>`（探测一个提供商）
- `--probe-profile <id>`（重复或逗号分隔的配置文件 ID）
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>`（已配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`）

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

备注：

- `setup-token` 会提示输入 setup-token 值（在任意机器上使用 `claude setup-token` 生成）。
- `paste-token` 接受在其他地方或通过自动化生成的令牌字符串。
- Anthropic 政策说明：对 setup-token 的支持属于技术兼容性。Anthropic 过去曾阻止部分订阅在 Claude Code 之外的使用，因此在广泛使用前请核实当前的条款。
