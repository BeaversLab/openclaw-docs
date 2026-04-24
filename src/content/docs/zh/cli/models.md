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

- 提供商 + 模型：[模型](/zh/providers/models)
- 模型选择概念 + `/models` 斜杠命令：[模型概念](/zh/concepts/models)
- 提供商身份验证设置：[入门指南](/zh/start/getting-started)

## 常用命令

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` 显示已解析的默认值/回退机制以及身份验证概览。
当提供商使用快照可用时，OAuth/API-key 状态部分包括
提供商使用窗口和配额快照。
当前使用窗口提供商：Anthropic、GitHub Copilot、Gemini CLI、OpenAI
Codex、MiniMax、Xiaomi 和 z.ai。使用身份验证在可用时来自特定于提供商的钩子；
否则，OpenClaw 回退到从身份验证配置文件、env 或 config 中匹配 OAuth/API-key
凭据。
在 `--json` 输出中，`auth.providers` 是感知 env/config/store 的提供商
概览，而 `auth.oauth` 仅是 auth-store 配置文件运行状况。
添加 `--probe` 以对每个配置的提供商配置文件运行实时身份验证探测。
探测是真实请求（可能会消耗令牌并触发速率限制）。
使用 `--agent <id>` 以检查配置的代理的模型/身份验证状态。如果省略，
该命令使用 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`（如果已设置），否则使用
配置的默认代理。
探测行可以来自身份验证配置文件、env 凭据或 `models.json`。

注意：

- `models set <model-or-alias>` 接受 `provider/model` 或别名。
- `models list --all` 包含捆绑的提供商拥有的静态目录行，即使您尚未通过该提供商的身份验证。在配置匹配的身份验证之前，这些行仍然显示为不可用。
- `models list --provider <id>` 按提供商 ID 过滤，例如 `moonshot` 或 `openai-codex`。它不接受交互式提供商选择器中的显示标签，例如 `Moonshot AI`。
- 模型引用通过在 **第一个** `/` 处分割来解析。如果模型 ID 包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果省略提供商，OpenClaw 会首先将输入作为别名进行解析，然后作为该确切模型 ID 的唯一配置提供商匹配，只有在那时才会回退到配置的默认提供商，并发出弃用警告。如果该提供商不再公开配置的默认模型，OpenClaw 将回退到第一个配置的提供商/模型，而不是显示一个过时的已移除提供商的默认设置。
- 对于非机密占位符（例如 `OPENAI_API_KEY`、`secretref-managed`、`minimax-oauth`、`oauth:chutes`、`ollama-local`），`models status` 可能会在身份验证输出中显示 `marker(<value>)`，而不是将其作为机密信息进行掩码处理。

### `models status`

选项：

- `--json`
- `--plain`
- `--check` (退出代码 1=已过期/缺失，2=即将过期)
- `--probe` (对已配置的身份验证配置文件进行实时探测)
- `--probe-provider <name>` (探测单个提供商)
- `--probe-profile <id>` (重复或逗号分隔的配置文件 ID)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (已配置的代理 ID；覆盖 `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

探测状态分类：

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

预期的探测详情/原因代码情况：

- `excluded_by_auth_order`：存在存储的配置文件，但显式的 `auth.order.<provider>` 省略了它，因此探测报告排除该配置文件，而不是尝试它。
- `missing_credential`、`invalid_expires`、`expired`、`unresolved_ref`：配置文件存在但不符合条件/无法解析。
- `no_model`：提供商身份验证存在，但 OpenClaw 无法为该提供商解析可探测的模型候选。

## 别名 + 回退

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## 身份验证配置文件

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` 是交互式身份验证助手。它可以根据您选择的提供商，启动提供商身份验证流程（OAuth/API 密钥）或引导您手动粘贴令牌。

`models auth login` 运行提供商插件的身份验证流程（OAuth/API 密钥）。使用 `openclaw plugins list` 查看已安装的提供商。

示例：

```bash
openclaw models auth login --provider openai-codex --set-default
```

注意：

- `setup-token` 和 `paste-token` 仍然是针对公开令牌身份验证方法的提供商的通用令牌命令。
- `setup-token` 需要交互式 TTY 并运行提供商的令牌身份验证方法（当公开该方法时，默认使用该提供商的 `setup-token` 方法）。
- `paste-token` 接受从其他地方生成或来自自动化程序的令牌字符串。
- `paste-token` 需要 `--provider`，提示输入令牌值，并将其写入默认配置文件 ID `<provider>:manual`，除非您传递 `--profile-id`。
- `paste-token --expires-in <duration>` 根据相对持续时间（例如 `365d` 或 `12h`）存储绝对令牌过期时间。
- Anthropic 说明：Anthropic 员工告知我们，OpenClaw 风格的 Claude CLI 使用再次被允许，因此除非 Anthropic 发布新政策，OpenClaw 将 Claude CLI 复用和 `claude -p` 使用视为对此集成的认可。
- Anthropic `setup-token` / `paste-token` 仍然作为受支持的 OpenClaw 令牌路径可用，但在可用时，OpenClaw 现在更倾向于 Claude CLI 复用和 `claude -p`。
